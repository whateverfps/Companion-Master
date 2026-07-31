import { createDrawingTarget } from './drawing-navigation.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const normalized = value => text(value).toLowerCase().replace(/[^a-z0-9-]+/g, ' ').replace(/\s+/g, ' ').trim();
const unique = values => [...new Set(values.filter(Boolean))];

const DISCIPLINES = Object.freeze([
  ['Fire Protection', /\b(?:fire protection|sprinkler)\b/i],
  ['Telecommunications', /\b(?:telecommunications?|telecom|structured cabling)\b/i],
  ['Mechanical', /\b(?:mechanical|hvac)\b/i],
  ['Electrical', /\b(?:electrical|power|lighting)\b/i],
  ['Plumbing', /\bplumbing\b/i], ['Architectural', /\barchitectural\b/i],
  ['Security', /\bsecurity\b/i], ['Interiors', /\binteriors?\b/i], ['General', /\bgeneral\b/i]
]);

export function normalizePlanQuery(query = '') { return normalized(query); }

function capture(query, rule) { return text((query.match(rule) || [])[1]); }

export function planQueryConstraints(query = '') {
  const raw = text(query);
  const discipline = DISCIPLINES.find(([, rule]) => rule.test(raw))?.[0] || '';
  const room = capture(raw, /\b(?:room|rm\.?|telecom room)\s*#?([a-z0-9-]{2,12})\b/i).toUpperCase();
  const building = capture(raw, /\b(?:building|bldg\.?|bldg)\s*#?([a-z0-9-]{1,12})\b/i).toUpperCase();
  const floor = capture(raw, /\b((?:basement|ground|first|second|third|fourth|fifth|\d+(?:st|nd|rd|th))\s*(?:floor|level)|basement)\b/i);
  const requestedSheet = capture(raw, /\b((?:\d{1,4})?[a-z]{1,3}[-.]?\d{3,4}[a-z]?)\b/i).toUpperCase();
  const requestedTag = capture(raw, /\b((?:ahu|rtu|vav|fcu|cu|ef|sf|hp|panel|xfmr|ups|rack|pp|facp|faap|tgb|tmgb|ts|cuh|uh)[- ]?\d{1,4}[a-z]?)\b/i).toUpperCase();
  const requestedSpecification = capture(raw, /\b(?:section|spec(?:ification)?)\s*((?:\d{2}\s?){2}\d{2}|\d{6})\b/i);
  const requestedRfi = capture(raw, /\b(RFI[- ]?\d+)\b/i).toUpperCase();
  const requestedSubmittal = capture(raw, /\b(SUB(?:MITTAL)?[- ]?\d+)\b/i).toUpperCase();
  const requestedInspection = capture(raw, /\b(INS[- ]?\d+)\b/i).toUpperCase();
  const typeIntent = /\brack\s+elevation/i.test(raw) ? 'open rack elevation'
    : /\bschedule/i.test(raw) ? 'open schedule'
      : /\bdetail/i.test(raw) ? 'open detail'
        : /\briser/i.test(raw) ? 'open riser'
          : requestedSheet ? 'open sheet'
            : room ? 'find room'
              : requestedTag ? 'find equipment'
                : /\binspect|inspection/i.test(raw) ? 'prepare inspection'
                  : floor ? 'show floor plans'
                    : discipline ? 'show discipline plans'
                      : building ? 'show building plans' : 'summarize supported work';
  return { normalizedQuery: normalized(raw), queryType: typeIntent, building, floor, room, discipline, requestedSheet, requestedTag, requestedSpecification, requestedRfi, requestedSubmittal, requestedInspection };
}

function searchableSheet(sheet, observations) {
  return normalized([
    sheet.sheetNumber, sheet.sheetTitle, sheet.discipline, ...list(sheet.sheetTypes),
    ...list(sheet.textItems).map(item => item.text), ...observations.map(item => item.value)
  ].join(' '));
}

function typeRank(sheet, constraints) {
  const types = new Set(list(sheet.sheetTypes));
  if (constraints.requestedSheet && sheet.sheetNumber === constraints.requestedSheet) return 0;
  if (constraints.queryType === 'open schedule' && types.has('Schedule')) return 0;
  if (constraints.queryType === 'open detail' && types.has('Detail')) return 0;
  if (constraints.queryType === 'open riser' && types.has('Riser')) return 0;
  if (constraints.queryType === 'open rack elevation' && /rack/i.test(sheet.sheetTitle) && types.has('Elevation')) return 0;
  if (types.has('Enlarged Plan')) return 2;
  if (types.has('Plan')) return /\b(first|second|third|level|floor|basement|overall)\b/i.test(sheet.sheetTitle) ? 3 : 4;
  if (types.has('Schedule')) return 5;
  if (types.has('Detail')) return 6;
  if (types.has('Diagram')) return 7;
  if (types.has('Riser')) return 8;
  if (types.has('Cut Sheet')) return 9;
  if (types.has('Reference')) return 10;
  return 11;
}

function matchesConstraints(sheet, observations, constraints, freeQuery = '') {
  const haystack = searchableSheet(sheet, observations);
  const exactObservation = value => observations.some(item => normalized(item.value) === normalized(value));
  if (constraints.requestedSheet && normalized(sheet.sheetNumber) !== normalized(constraints.requestedSheet)) return false;
  if (constraints.discipline && sheet.discipline !== constraints.discipline) return false;
  if (constraints.room && !exactObservation(constraints.room) && !haystack.includes(normalized(`room ${constraints.room}`))) return false;
  if (constraints.requestedTag && !exactObservation(constraints.requestedTag)) return false;
  if (constraints.building && !haystack.includes(normalized(`building ${constraints.building}`)) && !haystack.includes(normalized(`bldg ${constraints.building}`))) return false;
  if (constraints.floor && !haystack.includes(normalized(constraints.floor))) return false;
  if (constraints.queryType === 'open schedule' && !list(sheet.sheetTypes).includes('Schedule') && !/schedule/i.test(sheet.sheetTitle)) return false;
  if (constraints.queryType === 'open detail' && !list(sheet.sheetTypes).includes('Detail')) return false;
  if (constraints.queryType === 'open riser' && !list(sheet.sheetTypes).includes('Riser')) return false;
  if (constraints.queryType === 'open rack elevation' && !/rack/i.test(haystack)) return false;
  if (freeQuery && !haystack.includes(normalized(freeQuery))) return false;
  return true;
}

export function searchDrawingSheets({ query = '', discipline = 'all', analysis, sheets, observations } = {}) {
  const sourceSheets = list(sheets || analysis?.sheets);
  const sourceObservations = list(observations || analysis?.observations);
  const needle = normalized(query);
  const results = sourceSheets.flatMap(sheet => {
    if (discipline !== 'all' && sheet.discipline !== discipline) return [];
    const sheetObservations = sourceObservations.filter(item => item.sheetId === sheet.sheetId);
    const haystack = searchableSheet(sheet, sheetObservations);
    if (needle && !haystack.includes(needle)) return [];
    const observation = needle ? sheetObservations.find(item => normalized(item.value) === needle || normalized(item.value).includes(needle)) : null;
    const exactSheet = needle && normalized(sheet.sheetNumber) === needle;
    const startsSheet = needle && normalized(sheet.sheetNumber).startsWith(needle);
    const rank = exactSheet ? 0 : startsSheet ? 1 : normalized(sheet.sheetTitle).includes(needle) ? 2 : observation ? 3 : 4;
    return [{ sheetId: sheet.sheetId, documentId: sheet.documentId, pageNumber: sheet.pageNumber, observationId: observation?.observationId || '', region: observation?.region || null, rank, sheet }];
  });
  return results.sort((a, b) => a.rank - b.rank || a.sheet.pageNumber - b.sheet.pageNumber || a.sheetId.localeCompare(b.sheetId));
}

export function buildPlanQuery({ query = '', projectId = '', analyses = [] } = {}) {
  const constraints = planQueryConstraints(query);
  const candidates = [];
  for (const analysis of list(analyses).filter(item => !projectId || item.projectId === projectId)) {
    for (const sheet of list(analysis.sheets)) {
      const observations = list(analysis.observations).filter(item => item.sheetId === sheet.sheetId);
      if (!matchesConstraints(sheet, observations, constraints)) continue;
      const exactObservation = observations.find(item => (constraints.room && normalized(item.value) === normalized(constraints.room)) || (constraints.requestedTag && normalized(item.value) === normalized(constraints.requestedTag))) || null;
      candidates.push({ analysis, sheet, observations, exactObservation, rank: typeRank(sheet, constraints) });
    }
  }
  candidates.sort((a, b) => a.rank - b.rank || a.sheet.pageNumber - b.sheet.pageNumber || a.sheet.sheetId.localeCompare(b.sheet.sheetId));
  const first = candidates[0] || null;
  const viewerTarget = first ? createDrawingTarget({ projectId: first.analysis.projectId, documentId: first.analysis.documentId, drawingSetId: first.analysis.drawingSetId, sheetId: first.sheet.sheetId, pageNumber: first.sheet.pageNumber, sheetNumber: first.sheet.sheetNumber, observationId: first.exactObservation?.observationId, region: first.exactObservation?.region, origin: 'plan-query' }) : null;
  const actions = candidates.map(({ analysis, sheet, exactObservation }) => ({
    action: exactObservation ? 'show-location' : 'open-sheet',
    label: exactObservation ? `Show ${exactObservation.value} on ${sheet.sheetNumber || `page ${sheet.pageNumber}`}` : `Open Sheet ${sheet.sheetNumber || `Page ${sheet.pageNumber}`}`,
    target: createDrawingTarget({ projectId: analysis.projectId, documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, sheetId: sheet.sheetId, pageNumber: sheet.pageNumber, sheetNumber: sheet.sheetNumber, observationId: exactObservation?.observationId, region: exactObservation?.region, origin: 'plan-query' })
  }));
  const supportedWorkItems = candidates.map(({ sheet, exactObservation }) => ({ sheetId: sheet.sheetId, basis: exactObservation ? 'Plan text' : sheet.sheetTypes.includes('Schedule') ? 'Schedule entry' : 'Drawing index', observationId: exactObservation?.observationId || '', statement: exactObservation ? `${sheet.discipline} sheet containing exact ${exactObservation.kind.replace(/-text$/, '')} ${exactObservation.value}.` : `${sheet.discipline} ${sheet.sheetTypes.join(' / ').toLowerCase()} sheet ${sheet.sheetNumber || `page ${sheet.pageNumber}`}.` }));
  return {
    ...constraints, projectId: text(projectId), matchingSheetIds: candidates.map(item => item.sheet.sheetId),
    matchingObservationIds: unique(candidates.map(item => item.exactObservation?.observationId)), exactReferences: [],
    supportedWorkItems, limitations: [
      'Graphical association has not been verified.',
      'This result does not establish room boundaries, symbol meaning, routing, quantities, clashes, or code compliance.'
    ], viewerTarget, actions
  };
}

export function planQuerySectionScope(planResult, sections = [], analyses = []) {
  if (!planResult?.viewerTarget) return { documentIds: [], pageNumbers: [], sheetIds: [], sectionIds: [] };
  const pageBySheet = new Map(list(analyses).flatMap(analysis => list(analysis.sheets).map(sheet => [sheet.sheetId, sheet.pageNumber])));
  const pages = unique(list(planResult.matchingSheetIds).map(sheetId => pageBySheet.get(sheetId)).filter(Boolean));
  const matchingSections = list(sections).filter(section => section.documentId === planResult.viewerTarget.documentId && (!pages.length || pages.some(page => Number(section.pageStart || section.metadata?.pageRange?.start || 0) <= page && Number(section.pageEnd || section.metadata?.pageRange?.end || section.pageStart || 0) >= page)));
  return { documentIds: [planResult.viewerTarget.documentId], pageNumbers: pages, sheetIds: list(planResult.matchingSheetIds), sectionIds: matchingSections.map(section => section.id) };
}

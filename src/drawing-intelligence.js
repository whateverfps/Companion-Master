import { normalizeRegion } from './pdf-source.js';

export const DRAWING_ANALYSIS_VERSION = 2;
export const VERIFICATION_STATES = Object.freeze(['Unreviewed', 'Confirmed', 'Corrected', 'Rejected', 'Uncertain']);
const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const normalize = value => text(value).replace(/\s+/g, ' ');

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(36);
}

export const drawingSetIdFor = documentId => `drawing-set-${hash(text(documentId))}`;
export const sheetIdFor = (documentId, pageNumber) => `sheet-${hash(`${text(documentId)}:${Number(pageNumber)}`)}`;

const SHEET_NUMBER = /\b(?:\d{1,4})?[A-Z]{1,3}[-.]?\d{3,4}[A-Z]?\b/gi;
const REJECTED_NUMBER_CONTEXT = /\b(?:VA\s*FORM|FORM\s*(?:NO|NUMBER)|PROJECT\s*(?:NO|NUMBER)|PAGE|SHEET\s+OF|REV(?:ISION)?|DATE|ISSUED?|RELEASE|REVIT|AUTODESK|LICENSE|LICENCE|REGISTRATION|CERTIFICATE|CONSULTANT|PHASE|GRID|FILE\s*(?:NAME|PATH))\b/i;
const REJECTED_TITLE_CONTEXT = /\b(?:VA\s*FORM|PROJECT\s*(?:NO|NUMBER)|ISSUED?\s+FOR|REV(?:ISION)?|REVISIONS|RELEASE|REVIT|AUTODESK|LICENSE|LICENCE|REGISTRATION|CERTIFICATE|CONSULTANT|DRAWN\s+BY|CHECKED\s+BY|DATE|PAGE\s+\d+|SHEET\s+OF|FILE\s*(?:NAME|PATH))\b/i;
const TITLE_FIELD_ONLY = /^(?:SHEET\s*(?:NO|NUMBER|TITLE)|DRAWING\s*(?:NO|NUMBER|TITLE)|TITLE|PROJECT|LOCATION|BUILDING|DISCIPLINE|SCALE|DATE|REV(?:ISION)?)\s*:?-?$/i;
const ROOM_NUMBER = /\b(?:ROOM\s*)?(\d{2,5}[A-Z]?)\b/i;
const EQUIPMENT_TAG = /\b(?:AHU|RTU|VAV|FCU|CU|EF|SF|HP|P|PANEL|XFMR|UPS|RACK|PP|FACP|FAAP|TGB|TMGB|TS|CUH|UH)[- ]?\d{1,4}[A-Z]?\b/i;
const CALLOUT = /\b(\d{1,3}[A-Z]?)\s*\/\s*([A-Z]{1,4}[-.]?\d{2,4}[A-Z]?)\b/i;

export function normalizeDrawingTextItems(items = []) {
  return list(items).map((item, index) => ({
    text: normalize(item?.text), region: normalizeRegion(item?.region), order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index
  })).filter(item => item.text);
}

function lines(items) {
  const rows = [];
  for (const item of normalizeDrawingTextItems(items).sort((a, b) => a.region.y - b.region.y || a.region.x - b.region.x || a.order - b.order)) {
    let row = rows.find(candidate => Math.abs(candidate.y - item.region.y) <= .006);
    if (!row) { row = { y: item.region.y, items: [] }; rows.push(row); }
    row.items.push(item);
  }
  return rows.map(row => {
    row.items.sort((a, b) => a.region.x - b.region.x || a.order - b.order);
    const x = Math.min(...row.items.map(item => item.region.x));
    const y = Math.min(...row.items.map(item => item.region.y));
    const right = Math.max(...row.items.map(item => item.region.x + item.region.width));
    const bottom = Math.max(...row.items.map(item => item.region.y + item.region.height));
    return { text: normalize(row.items.map(item => item.text).join(' ')), region: normalizeRegion({ x, y, width: right - x, height: bottom - y }) };
  });
}

function candidateZone(region) {
  if (region.x >= .58 && region.y >= .55) return 'lower-right';
  if (region.y >= .78) return 'lower-band';
  if (region.x >= .72) return 'right-band';
  return '';
}

export function extractTitleBlockCandidates(items = []) {
  return lines(items).map(line => ({ ...line, zone: candidateZone(line.region) })).filter(line => line.zone);
}

export function validSheetNumberCandidate(value, context = '') {
  const candidate = normalize(value).toUpperCase();
  if (!candidate || REJECTED_NUMBER_CONTEXT.test(context)) return false;
  if (/^R\d{1,2}$/i.test(candidate) || /^\d+$/.test(candidate) || /^\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}$/.test(candidate)) return false;
  return new RegExp(`^(?:${SHEET_NUMBER.source})$`, 'i').test(candidate);
}

export function extractSheetNumberCandidates(items = [], { titleBlockOnly = false } = {}) {
  const source = titleBlockOnly ? extractTitleBlockCandidates(items) : lines(items);
  const output = [];
  for (const candidate of source) {
    for (const match of candidate.text.matchAll(new RegExp(SHEET_NUMBER.source, 'gi'))) {
      const value = match[0].toUpperCase();
      if (!validSheetNumberCandidate(value, candidate.text)) continue;
      const zoneScore = candidate.zone === 'lower-right' ? 30 : candidate.zone === 'lower-band' ? 20 : candidate.zone === 'right-band' ? 10 : 0;
      const labelScore = /\b(?:SHEET|DRAWING)\s*(?:NO|NUMBER)?\b/i.test(candidate.text) ? 25 : 0;
      output.push({ value, ...candidate, score: 50 + zoneScore + labelScore });
    }
  }
  return output.sort((a, b) => b.score - a.score || b.region.y - a.region.y || a.value.localeCompare(b.value));
}

function validTitleCandidate(candidate) {
  const value = normalize(candidate?.text);
  if (value.length < 5 || value.length > 140 || TITLE_FIELD_ONLY.test(value) || REJECTED_TITLE_CONTEXT.test(value)) return false;
  if (/^(?:\d+|[A-Z]?\d{1,4}[-./]\d{1,4}|[A-Z]:\\|\/)/i.test(value)) return false;
  const stripped = value.replace(new RegExp(SHEET_NUMBER.source, 'gi'), '').replace(/[^A-Z]+/gi, '');
  return stripped.length >= 4;
}

function cleanSheetTitle(value) {
  return normalize(value).replace(new RegExp(SHEET_NUMBER.source, 'gi'), ' ').replace(/^\s*(?:SHEET|DRAWING)\s+TITLE\s*[:.-]?\s*/i, '').replace(/\s+/g, ' ').trim();
}

export function classifyDiscipline(sheetNumber = '', title = '') {
  const number = normalize(sheetNumber).toUpperCase();
  const heading = normalize(title).toUpperCase();
  const prefix = (number.match(/^(?:\d+)?([A-Z]{1,3})[-.]?\d/) || [])[1] || '';
  const rules = [
    ['Fire Protection', ['FP']], ['Plumbing', ['P']], ['Mechanical', ['M']], ['Electrical', ['E']],
    ['Telecommunications', ['T', 'TC']], ['Security', ['SEC']], ['Architectural', ['A']],
    ['Interiors', ['I']], ['General', ['G']]
  ];
  for (const [discipline, prefixes] of rules) if (prefixes.includes(prefix)) return { discipline, evidence: `Sheet-number prefix ${prefix}` };
  const titleRules = [
    ['Fire Protection', /FIRE PROTECTION|SPRINKLER/], ['Plumbing', /PLUMBING/], ['Mechanical', /MECHANICAL|HVAC/],
    ['Electrical', /ELECTRICAL|LIGHTING|POWER/], ['Telecommunications', /TELECOMMUNICATIONS?|STRUCTURED CABLING/],
    ['Security', /SECURITY|ACCESS CONTROL/], ['Architectural', /ARCHITECTURAL/], ['Interiors', /INTERIOR/],
    ['General', /GENERAL|COVER SHEET/], ['Reference', /REFERENCE|EXISTING PHOTO/]
  ];
  for (const [discipline, rule] of titleRules) if (rule.test(heading)) return { discipline, evidence: `Explicit sheet title: ${title}` };
  return { discipline: 'Unknown', evidence: '' };
}

export function classifySheetTypes(title = '') {
  const value = normalize(title).toUpperCase();
  const rules = [
    ['Cover', /COVER/], ['Index', /DRAWING INDEX|SHEET INDEX/], ['Notes', /\bNOTES?\b/],
    ['Enlarged Plan', /ENLARGED.*PLAN/], ['Plan', /\bPLAN\b/], ['Detail', /\bDETAILS?\b/],
    ['Schedule', /\bSCHEDULES?\b/], ['Riser', /\bRISER\b/], ['Diagram', /\bDIAGRAM|ONE[- ]LINE\b/],
    ['Elevation', /\bELEVATIONS?\b/], ['Inventory', /\bINVENTORY\b/], ['Cut Sheet', /\bCUT SHEET\b/],
    ['Reference', /\bREFERENCE|PHOTOS?\b/]
  ];
  const types = rules.filter(([, rule]) => rule.test(value)).map(([type]) => type);
  return types.length ? [...new Set(types)] : ['Unknown'];
}

function selectSheetMetadata(items) {
  const candidates = extractTitleBlockCandidates(items);
  const numberCandidates = extractSheetNumberCandidates(items, { titleBlockOnly: true });
  const uniqueNumbers = [...new Set(numberCandidates.map(item => item.value))];
  const sheetNumber = uniqueNumbers.length === 1 ? uniqueNumbers[0] : '';
  const titles = candidates.filter(validTitleCandidate).filter(item => !numberCandidates.some(number => number.value === item.text.toUpperCase()));
  const uniqueTitles = [...new Map(titles.map(item => [item.text.toUpperCase(), item])).values()];
  const rankedTitles = uniqueTitles.sort((a, b) => {
    const score = item => (/\b(?:PLAN|DETAIL|SCHEDULE|RISER|DIAGRAM|ELEVATION|INDEX|NOTES?|INVENTORY|CUT SHEET)\b/i.test(item.text) ? 30 : 0) + (item.zone === 'lower-right' ? 20 : 0);
    return score(b) - score(a) || b.region.y - a.region.y || b.text.length - a.text.length;
  });
  const sheetTitle = cleanSheetTitle(rankedTitles[0]?.text || '');
  const titleBlockRegion = numberCandidates[0]?.region || titles[0]?.region || null;
  const candidateText = candidates.map(item => item.text).join(' | ');
  const issueDate = (candidateText.match(/\b(?:ISSUE DATE|DATE)\s*[:.-]?\s*(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}|\d{4}-\d{2}-\d{2})\b/i) || [])[1] || '';
  const revision = (candidateText.match(/\b(?:REVISION|REV)\s*[:.#-]?\s*([A-Z0-9]{1,6})\b/i) || [])[1] || '';
  return { sheetNumber, sheetTitle, titleBlockRegion, numberCandidates, titleCandidates: rankedTitles, issueDate, revision, conflicts: uniqueNumbers.length > 1 ? uniqueNumbers : [] };
}

function observation({ documentId, sheetId, pageNumber, kind, value, region, confidence = .7, extractionMethod = 'positioned-pdf-text' }) {
  const originalValue = normalize(value);
  return {
    observationId: `observation-${hash(`${documentId}:${pageNumber}:${kind}:${originalValue}:${JSON.stringify(normalizeRegion(region))}`)}`,
    documentId, sheetId, pageNumber, kind, value: originalValue, originalValue,
    region: normalizeRegion(region), extractionMethod, confidence,
    verification: { status: 'Unreviewed', correctedValue: '', verifiedAt: '' },
    graphicalAssociationVerified: false
  };
}

export function extractTextObservations({ documentId, sheetId, pageNumber, textItems = [] } = {}) {
  const output = [];
  for (const item of normalizeDrawingTextItems(textItems)) {
    const room = item.text.match(ROOM_NUMBER);
    if (room && (/\bROOM\b/i.test(item.text) || /^\d{2,5}[A-Z]?$/.test(item.text))) {
      output.push(observation({ documentId, sheetId, pageNumber, kind: 'room-number-text', value: room[1], region: item.region, confidence: /\bROOM\b/i.test(item.text) ? .85 : .65 }));
      const roomName = item.text.replace(new RegExp(`\\bROOM\\s*${room[1]}\\b`, 'i'), '').trim();
      if (roomName && /[A-Z]/i.test(roomName)) output.push(observation({ documentId, sheetId, pageNumber, kind: 'room-name-text', value: roomName, region: item.region, confidence: .75 }));
    }
    const equipment = item.text.match(EQUIPMENT_TAG);
    if (equipment) output.push(observation({ documentId, sheetId, pageNumber, kind: 'equipment-tag-text', value: equipment[0], region: item.region, confidence: .75 }));
    const callout = item.text.match(CALLOUT);
    if (callout) output.push(observation({ documentId, sheetId, pageNumber, kind: 'callout-text', value: `${callout[1]}/${callout[2]}`, region: item.region, confidence: .9 }));
  }
  return output.filter((item, index) => output.findIndex(candidate => candidate.observationId === item.observationId) === index)
    .sort((a, b) => a.pageNumber - b.pageNumber || a.region.y - b.region.y || a.region.x - b.region.x || a.observationId.localeCompare(b.observationId));
}

export function parseExactDrawingReference(value) {
  const match = normalize(value).match(CALLOUT);
  return match ? { detailNumber: match[1], sheetNumber: match[2].toUpperCase(), source: match[0] } : null;
}

export function applyObservationVerification(machineObservation, { status, correctedValue = '', verifiedAt = '' } = {}) {
  if (!VERIFICATION_STATES.includes(status)) throw new Error('Unsupported drawing verification state.');
  if (status === 'Corrected' && !text(correctedValue)) throw new Error('Corrected observations require a corrected value.');
  return { ...structuredClone(machineObservation), verification: { status, correctedValue: status === 'Corrected' ? text(correctedValue) : '', verifiedAt: text(verifiedAt) } };
}

export function extractDrawingIndexEntries(sheets = []) {
  const entries = [];
  for (const sheet of list(sheets).filter(item => lines(item.textItems).some(line => /\b(?:DRAWING|SHEET)\s+INDEX\b/i.test(line.text)))) {
    for (const line of lines(sheet.textItems)) {
      const match = line.text.match(/^((?:\d{1,4})?[A-Z]{1,3}[-.]?\d{3,4}[A-Z]?)\s+(.{3,})$/i);
      if (!match) continue;
      if (!validSheetNumberCandidate(match[1], '') || !validTitleCandidate({ text: match[2] })) continue;
      const classified = classifyDiscipline(match[1], match[2]);
      entries.push({ sheetNumber: match[1].toUpperCase(), sheetTitle: normalize(match[2]), discipline: classified.discipline, sourcePage: sheet.pageNumber, sourceRegion: line.region });
    }
  }
  return entries.sort((a, b) => a.sheetNumber.localeCompare(b.sheetNumber) || a.sourcePage - b.sourcePage);
}

export function reconcileDrawingIndex(indexEntries = [], sheets = []) {
  const warnings = [];
  const byNumber = new Map();
  for (const sheet of list(sheets).filter(item => item.sheetNumber)) {
    if (!byNumber.has(sheet.sheetNumber)) byNumber.set(sheet.sheetNumber, []);
    byNumber.get(sheet.sheetNumber).push(sheet);
  }
  for (const [number, matches] of byNumber) if (matches.length > 1) warnings.push({ type: 'duplicate-sheet-number', sheetNumber: number, sheetIds: matches.map(item => item.sheetId).sort() });
  for (const entry of list(indexEntries)) {
    const matches = byNumber.get(entry.sheetNumber) || [];
    if (!matches.length) warnings.push({ type: 'expected-sheet-missing', sheetNumber: entry.sheetNumber });
    else if (matches.length === 1 && entry.sheetTitle && matches[0].sheetTitle && normalize(entry.sheetTitle).toLowerCase() !== normalize(matches[0].sheetTitle).toLowerCase()) warnings.push({ type: 'title-mismatch', sheetNumber: entry.sheetNumber, indexTitle: entry.sheetTitle, titleBlockTitle: matches[0].sheetTitle });
  }
  const indexed = new Set(list(indexEntries).map(item => item.sheetNumber));
  for (const sheet of list(sheets).filter(item => item.sheetNumber && !indexed.has(item.sheetNumber))) warnings.push({ type: 'sheet-absent-from-index', sheetNumber: sheet.sheetNumber, sheetId: sheet.sheetId });
  const uniquelyMappedPages = list(indexEntries).map((entry, index) => ({ index, entry, matches: byNumber.get(entry.sheetNumber) || [] })).filter(item => item.matches.length === 1);
  for (let index = 1; index < uniquelyMappedPages.length; index += 1) {
    if (uniquelyMappedPages[index].matches[0].pageNumber < uniquelyMappedPages[index - 1].matches[0].pageNumber) warnings.push({ type: 'order-mismatch', sheetNumber: uniquelyMappedPages[index].entry.sheetNumber, sourceIndex: uniquelyMappedPages[index].index, pageNumber: uniquelyMappedPages[index].matches[0].pageNumber });
  }
  return warnings.sort((a, b) => a.type.localeCompare(b.type) || text(a.sheetNumber).localeCompare(text(b.sheetNumber)));
}

export function buildDrawingAnalysis({ documentId, projectId, pages = [], analyzedAt = '' } = {}) {
  if (!text(documentId) || !text(projectId)) throw new Error('Drawing analysis requires exact document and project identifiers.');
  let sheets = list(pages).map(page => {
    const sheetId = sheetIdFor(documentId, page.pageNumber);
    const metadata = selectSheetMetadata(page.textItems);
    const discipline = classifyDiscipline(metadata.sheetNumber, metadata.sheetTitle);
    return {
      sheetId, documentId, pageNumber: Number(page.pageNumber), sheetNumber: metadata.sheetNumber,
      sheetTitle: metadata.sheetTitle, discipline: discipline.discipline, disciplineEvidence: discipline.evidence,
      sheetTypes: classifySheetTypes(metadata.sheetTitle), issueDate: metadata.issueDate, revision: metadata.revision,
      pageWidth: Number(page.width) || 0, pageHeight: Number(page.height) || 0, rotation: Number(page.rotation) || 0,
      titleBlockRegion: metadata.titleBlockRegion, analysisStatus: metadata.conflicts.length ? 'Completed with warnings' : 'Ready for review',
      confidence: metadata.sheetNumber ? (metadata.sheetTitle ? .9 : .75) : .35,
      extractionMethod: 'positioned-pdf-text', textItems: normalizeDrawingTextItems(page.textItems),
      sheetNumberCandidates: metadata.numberCandidates.map(item => ({ value: item.value, region: item.region, score: item.score, zone: item.zone })),
      sheetTitleCandidates: metadata.titleCandidates.map(item => ({ value: item.text, region: item.region, zone: item.zone })),
      titleBlockSheetNumber: metadata.sheetNumber, titleBlockSheetTitle: metadata.sheetTitle,
      warnings: metadata.conflicts.length ? [`Conflicting sheet-number candidates: ${metadata.conflicts.join(', ')}`] : []
    };
  }).sort((a, b) => a.pageNumber - b.pageNumber);
  const indexEntries = extractDrawingIndexEntries(sheets);
  const indexByNumber = new Map();
  for (const entry of indexEntries) {
    if (!indexByNumber.has(entry.sheetNumber)) indexByNumber.set(entry.sheetNumber, []);
    indexByNumber.get(entry.sheetNumber).push(entry);
  }
  sheets = sheets.map(sheet => {
    const candidateNumbers = [...new Set(sheet.sheetNumberCandidates.map(item => item.value))];
    const reconciled = candidateNumbers.flatMap(number => indexByNumber.get(number) || []);
    const uniqueReconciled = [...new Map(reconciled.map(entry => [entry.sheetNumber, entry])).values()];
    const indexEntry = uniqueReconciled.length === 1 && (indexByNumber.get(uniqueReconciled[0].sheetNumber) || []).length === 1 ? uniqueReconciled[0] : null;
    const sheetNumber = indexEntry?.sheetNumber || (candidateNumbers.length === 1 ? candidateNumbers[0] : '');
    const sheetTitle = indexEntry?.sheetTitle || sheet.titleBlockSheetTitle || '';
    const titleConflict = Boolean(indexEntry?.sheetTitle && sheet.titleBlockSheetTitle && normalize(indexEntry.sheetTitle).toLowerCase() !== normalize(sheet.titleBlockSheetTitle).toLowerCase());
    const discipline = classifyDiscipline(sheetNumber, sheetTitle);
    const addedWarnings = [
      ...(uniqueReconciled.length > 1 ? [`Ambiguous drawing-index mapping: ${uniqueReconciled.map(entry => entry.sheetNumber).join(', ')}`] : []),
      ...(titleConflict ? [`Drawing-index title "${indexEntry.sheetTitle}" conflicts with title-block title "${sheet.titleBlockSheetTitle}".`] : [])
    ];
    return { ...sheet, sheetNumber, sheetTitle, discipline: discipline.discipline, disciplineEvidence: discipline.evidence, sheetTypes: classifySheetTypes(sheetTitle), indexEntry: indexEntry ? { ...indexEntry } : null, identityStatus: indexEntry && !titleConflict ? 'Verified' : addedWarnings.length || !sheetNumber ? 'Ambiguous' : 'Supported', analysisStatus: addedWarnings.length ? 'Completed with warnings' : sheet.analysisStatus, warnings: [...sheet.warnings, ...addedWarnings] };
  });
  const observations = sheets.flatMap(sheet => extractTextObservations({ documentId, sheetId: sheet.sheetId, pageNumber: sheet.pageNumber, textItems: sheet.textItems }));
  const references = observations.filter(item => item.kind === 'callout-text').map(item => ({ referenceId: `reference-${hash(item.observationId)}`, observationId: item.observationId, sourceSheetId: item.sheetId, ...parseExactDrawingReference(item.value) }));
  const reconciliation = reconcileDrawingIndex(indexEntries, sheets);
  const warnings = [...sheets.flatMap(sheet => sheet.warnings.map(message => ({ type: 'sheet-warning', sheetId: sheet.sheetId, message }))), ...reconciliation];
  return {
    drawingSetId: drawingSetIdFor(documentId), documentId, projectId,
    analysisVersion: DRAWING_ANALYSIS_VERSION, analyzedAt: text(analyzedAt),
    status: warnings.length ? 'Completed with warnings' : 'Ready for review',
    stages: ['Reading source', 'Inspecting pages', 'Detecting title blocks', 'Building sheet index', 'Classifying sheets', 'Recording text observations', 'Reconciling index', warnings.length ? 'Completed with warnings' : 'Ready for review'],
    sheets, indexEntries, observations, references, warnings,
    limitations: ['Text observations do not establish room boundaries, symbol ownership, graphical connectivity, or installed quantities.']
  };
}

export function upgradeDrawingAnalysis(analysis = {}) {
  if (Number(analysis.analysisVersion) >= DRAWING_ANALYSIS_VERSION) return structuredClone(analysis);
  const verificationByObservation = new Map(list(analysis.observations).map(item => [item.observationId, item.verification]));
  const upgraded = buildDrawingAnalysis({
    documentId: analysis.documentId, projectId: analysis.projectId, analyzedAt: analysis.analyzedAt,
    pages: list(analysis.sheets).map(sheet => ({ pageNumber: sheet.pageNumber, width: sheet.pageWidth, height: sheet.pageHeight, rotation: sheet.rotation, textItems: sheet.textItems }))
  });
  upgraded.observations = upgraded.observations.map(item => verificationByObservation.has(item.observationId) ? { ...item, verification: structuredClone(verificationByObservation.get(item.observationId)) } : item);
  return upgraded;
}

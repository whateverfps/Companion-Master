import { normalizeRegion } from './pdf-source.js';

export const DRAWING_ANALYSIS_VERSION = 3;
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
const NUMBER_LIKE_TOKEN = /\b(?:\d{1,4})?[A-Z]{1,4}[-.]?\d{1,8}[A-Z]?\b/gi;
const NARRATIVE_TITLE = /\b(?:SHALL|MUST|PROVIDE|INSTALL|CONTRACTOR|REQUIREMENTS?|COORDINATE|VERIFY|REFER TO|IN ACCORDANCE|WORK INCLUDES?)\b/i;
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

export function extractSheetNumberCandidateDiagnostics(items = [], { titleBlockOnly = false } = {}) {
  const source = titleBlockOnly ? extractTitleBlockCandidates(items) : lines(items);
  const accepted = extractSheetNumberCandidates(items, { titleBlockOnly });
  const acceptedKeys = new Set(accepted.map(item => `${item.value}:${item.region.x}:${item.region.y}`));
  const rejected = [];
  for (const candidate of source) {
    for (const match of candidate.text.matchAll(new RegExp(NUMBER_LIKE_TOKEN.source, 'gi'))) {
      const value = match[0].toUpperCase();
      const key = `${value}:${candidate.region.x}:${candidate.region.y}`;
      if (acceptedKeys.has(key)) continue;
      const reason = REJECTED_NUMBER_CONTEXT.test(candidate.text) ? 'metadata-context'
        : /^R\d{1,2}$/i.test(value) ? 'revit-release'
          : /^\d+$/.test(value) ? 'generic-number'
            : 'unsupported-sheet-format';
      rejected.push({ value, text: candidate.text, region: candidate.region, zone: candidate.zone || '', reason });
    }
  }
  return { accepted, rejected: rejected.sort((a, b) => a.region.y - b.region.y || a.region.x - b.region.x || a.value.localeCompare(b.value)) };
}

function titleRejectionReason(candidate) {
  const value = normalize(candidate?.text);
  if (value.length < 5) return 'too-short';
  if (value.length > 110 || value.split(/\s+/).length > 14) return 'narrative-length';
  if (TITLE_FIELD_ONLY.test(value)) return 'field-label';
  if (REJECTED_TITLE_CONTEXT.test(value)) return 'metadata-context';
  if (NARRATIVE_TITLE.test(value) || /[.!?;:]$/.test(value)) return 'narrative-sentence';
  if (/^(?:\d+|[A-Z]?\d{1,4}[-./]\d{1,4}|[A-Z]:\\|\/)/i.test(value)) return 'path-or-number';
  const stripped = value.replace(new RegExp(SHEET_NUMBER.source, 'gi'), '').replace(/[^A-Z]+/gi, '');
  return stripped.length >= 4 ? '' : 'insufficient-title-text';
}

function validTitleCandidate(candidate) { return !titleRejectionReason(candidate); }

function cleanSheetTitle(value) {
  return normalize(value).replace(new RegExp(SHEET_NUMBER.source, 'gi'), ' ').replace(/^\s*(?:SHEET|DRAWING)\s+TITLE\s*[:.-]?\s*/i, '').replace(/\s+/g, ' ').trim();
}

export function classifyDiscipline(sheetNumber = '', title = '', indexDiscipline = '') {
  if (normalize(indexDiscipline) && normalize(indexDiscipline) !== 'Unknown') return { discipline: normalize(indexDiscipline), evidence: `Reconciled drawing-index discipline: ${normalize(indexDiscipline)}`, method: 'drawing-index' };
  const number = normalize(sheetNumber).toUpperCase();
  const heading = normalize(title).toUpperCase();
  const prefix = (number.match(/^(?:\d+)?([A-Z]{1,3})[-.]?\d/) || [])[1] || '';
  const rules = [
    ['Fire Protection', ['FP']], ['Plumbing', ['P']], ['Mechanical', ['M']], ['Electrical', ['E']],
    ['Telecommunications', ['T', 'TC']], ['Security', ['SEC']], ['Architectural', ['A']],
    ['Interiors', ['I']], ['Hazardous Materials', ['H']], ['General', ['G']], ['Reference', ['R']]
  ];
  for (const [discipline, prefixes] of rules) if (prefixes.includes(prefix)) return { discipline, evidence: `Validated sheet-number prefix ${prefix}`, method: 'sheet-number-prefix' };
  const titleRules = [
    ['Fire Protection', /FIRE PROTECTION|SPRINKLER/], ['Plumbing', /PLUMBING/], ['Mechanical', /MECHANICAL|HVAC/],
    ['Electrical', /ELECTRICAL|LIGHTING|POWER/], ['Telecommunications', /TELECOMMUNICATIONS?|STRUCTURED CABLING/],
    ['Security', /SECURITY|ACCESS CONTROL/], ['Architectural', /ARCHITECTURAL/], ['Interiors', /INTERIOR/],
    ['General', /GENERAL|COVER SHEET/], ['Reference', /REFERENCE|EXISTING PHOTO/]
  ];
  for (const [discipline, rule] of titleRules) if (rule.test(heading)) return { discipline, evidence: `Validated title-block title: ${title}`, method: 'title-block-title' };
  return { discipline: 'Unknown', evidence: 'No exact drawing-index, sheet-number prefix, or validated title evidence.', method: 'unavailable' };
}

export function classifySheetTypes(title = '') {
  const value = normalize(title).toUpperCase();
  const rules = [
    ['Cover', /\bCOVER(?: SHEET)?\b/], ['Drawing Index', /DRAWING INDEX|SHEET INDEX/], ['Notes', /\bNOTES?\b/],
    ['Enlarged Plan', /ENLARGED.*PLAN/], ['Plan', /\bPLAN\b/], ['Detail', /\bDETAILS?\b/],
    ['Schedule', /\bSCHEDULES?\b/], ['Controls', /\bCONTROLS?\b/], ['Riser', /\bRISER\b/], ['Diagram', /\bDIAGRAM|ONE[- ]LINE\b/],
    ['Rack Elevation', /\bRACK\b.*\bELEVATIONS?\b/], ['Elevation', /\bELEVATIONS?\b/], ['Inventory', /\bINVENTORY\b/], ['Cut Sheet', /\bCUT SHEET\b/],
    ['Photo Reference', /\bPHOTO(?:GRAPH)?S?\b.*\bREFERENCES?\b|\bREFERENCES?\b.*\bPHOTO(?:GRAPH)?S?\b/], ['Reference', /\bREFERENCE\b/]
  ];
  const types = rules.filter(([, rule]) => rule.test(value)).map(([type]) => type);
  return types.length ? [...new Set(types)] : ['Unknown'];
}

export function primarySheetType(types = []) {
  const order = ['Cover', 'Drawing Index', 'Enlarged Plan', 'Plan', 'Schedule', 'Rack Elevation', 'Detail', 'Controls', 'Diagram', 'Riser', 'Inventory', 'Cut Sheet', 'Photo Reference', 'Notes', 'Elevation', 'Reference', 'Unknown'];
  return order.find(type => list(types).includes(type)) || 'Unknown';
}

function selectSheetMetadata(items, { repeatedTitles = new Set() } = {}) {
  const candidates = extractTitleBlockCandidates(items);
  const titleBlockDiagnostics = extractSheetNumberCandidateDiagnostics(items, { titleBlockOnly: true });
  const positionedDiagnostics = extractSheetNumberCandidateDiagnostics(items);
  const numberCandidates = titleBlockDiagnostics.accepted.length ? titleBlockDiagnostics.accepted : positionedDiagnostics.accepted;
  const uniqueNumbers = [...new Set(numberCandidates.map(item => item.value))];
  const sheetNumber = uniqueNumbers.length === 1 ? uniqueNumbers[0] : '';
  const rejectedTitles = [];
  const titles = [];
  for (const candidate of candidates) {
    const value = cleanSheetTitle(candidate.text);
    const reason = titleRejectionReason({ ...candidate, text: value }) || (repeatedTitles.has(value.toUpperCase()) ? 'repeated-project-title' : '');
    if (reason || numberCandidates.some(number => number.value === value.toUpperCase())) rejectedTitles.push({ value, region: candidate.region, zone: candidate.zone, reason: reason || 'sheet-number-only' });
    else titles.push({ ...candidate, value });
  }
  const uniqueTitles = [...new Map(titles.map(item => [item.value.toUpperCase(), item])).values()];
  const scoreTitle = item => (/\b(?:PLAN|DETAIL|SCHEDULE|RISER|DIAGRAM|ELEVATION|INDEX|NOTES?|INVENTORY|CUT SHEET|COVER|CONTROLS?)\b/i.test(item.value) ? 35 : 0) + (item.zone === 'lower-right' ? 25 : item.zone === 'lower-band' ? 15 : 5) + Math.max(0, 12 - item.value.split(/\s+/).length);
  const rankedTitles = uniqueTitles.map(item => ({ ...item, score: scoreTitle(item) })).sort((a, b) => b.score - a.score || b.region.y - a.region.y || a.value.localeCompare(b.value));
  const titleResolved = rankedTitles.length === 1 || (rankedTitles[0]?.score - rankedTitles[1]?.score >= 15);
  const sheetTitle = titleResolved ? rankedTitles[0]?.value || '' : '';
  const titleBlockRegion = numberCandidates[0]?.region || titles[0]?.region || null;
  const candidateText = candidates.map(item => item.text).join(' | ');
  const issueDate = (candidateText.match(/\b(?:ISSUE DATE|DATE)\s*[:.-]?\s*(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}|\d{4}-\d{2}-\d{2})\b/i) || [])[1] || '';
  const revision = (candidateText.match(/\b(?:REVISION|REV)\s*[:.#-]?\s*([A-Z0-9]{1,6})\b/i) || [])[1] || '';
  return {
    sheetNumber, sheetTitle, titleBlockRegion, numberCandidates, titleCandidates: rankedTitles, rejectedNumberCandidates: [...titleBlockDiagnostics.rejected, ...positionedDiagnostics.rejected], rejectedTitleCandidates: rejectedTitles,
    sheetNumberMethod: sheetNumber ? (titleBlockDiagnostics.accepted.length ? 'title-block' : 'positioned-text') : 'unavailable', sheetTitleMethod: sheetTitle ? 'title-block' : 'unavailable',
    issueDate, revision, conflicts: uniqueNumbers.length > 1 ? uniqueNumbers : [], titleConflicts: !titleResolved ? rankedTitles.map(item => item.value) : []
  };
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
    let current = null;
    for (const line of lines(sheet.textItems)) {
      const match = line.text.match(/^((?:\d{1,4})?[A-Z]{1,3}[-.]?\d{3,4}[A-Z]?)\s+(.{3,})$/i);
      if (match && validSheetNumberCandidate(match[1], '')) {
        const candidateTitle = cleanSheetTitle(match[2]);
        if (!validTitleCandidate({ text: candidateTitle })) { current = null; continue; }
        const classified = classifyDiscipline(match[1], candidateTitle);
        current = { sheetNumber: match[1].toUpperCase(), sheetTitle: candidateTitle, discipline: classified.discipline, sourcePage: sheet.pageNumber, sourceRegion: line.region, inventoryOrder: entries.length, extractionMethod: 'positioned-index-row' };
        entries.push(current);
        continue;
      }
      if (current && line.region.y > current.sourceRegion.y && line.region.y - current.sourceRegion.y <= .045 && line.region.x >= current.sourceRegion.x + .04 && validTitleCandidate(line)) {
        current.sheetTitle = normalize(`${current.sheetTitle} ${line.text}`);
        current.sourceRegion = normalizeRegion({ x: current.sourceRegion.x, y: current.sourceRegion.y, width: Math.max(current.sourceRegion.width, line.region.x + line.region.width - current.sourceRegion.x), height: line.region.y + line.region.height - current.sourceRegion.y });
        current.extractionMethod = 'positioned-index-row-multiline';
      } else if (line.text && !/\b(?:DRAWING|SHEET)\s+INDEX\b/i.test(line.text)) current = null;
    }
  }
  return entries.map((entry, index) => ({ ...entry, inventoryOrder: index }));
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

function mapDrawingIndexToSheets(indexEntries, sheets) {
  const uniqueEntries = list(indexEntries).filter((entry, index, source) => source.filter(item => item.sheetNumber === entry.sheetNumber).length === 1);
  const result = new Map();
  const byNumber = new Map(uniqueEntries.map(entry => [entry.sheetNumber, entry]));
  for (const sheet of sheets) {
    const numbers = [...new Set(list(sheet.sheetNumberCandidates).map(item => item.value))];
    const matches = numbers.map(number => byNumber.get(number)).filter(Boolean);
    if (numbers.length === 1 && matches.length === 1) result.set(sheet.sheetId, { entry: matches[0], method: 'index-title-block-reconciliation' });
  }
  const exactOrderSafe = uniqueEntries.length === sheets.length && sheets.every((sheet, index) => {
    const candidates = [...new Set(list(sheet.sheetNumberCandidates).map(item => item.value))];
    return !candidates.length || candidates.includes(uniqueEntries[index]?.sheetNumber);
  });
  if (exactOrderSafe) sheets.forEach((sheet, index) => { if (!result.has(sheet.sheetId)) result.set(sheet.sheetId, { entry: uniqueEntries[index], method: 'index-inventory-order' }); });
  if (!exactOrderSafe) {
    const indexPosition = new Map(uniqueEntries.map((entry, index) => [entry.sheetNumber, index]));
    const anchors = sheets.flatMap((sheet, pageIndex) => {
      const numbers = [...new Set(list(sheet.sheetNumberCandidates).map(item => item.value))].filter(number => indexPosition.has(number));
      return numbers.length === 1 ? [{ pageIndex, index: indexPosition.get(numbers[0]) }] : [];
    });
    const offsets = [...new Set(anchors.map(anchor => anchor.pageIndex - anchor.index))];
    if (anchors.length >= 2 && offsets.length === 1) {
      const offset = offsets[0];
      uniqueEntries.forEach((entry, index) => {
        const sheet = sheets[index + offset];
        if (sheet && !result.has(sheet.sheetId) && !sheet.sheetNumberCandidates.length) result.set(sheet.sheetId, { entry, method: 'index-anchored-order' });
      });
    }
  }
  return result;
}

export function buildDrawingAnalysis({ documentId, projectId, pages = [], analyzedAt = '' } = {}) {
  if (!text(documentId) || !text(projectId)) throw new Error('Drawing analysis requires exact document and project identifiers.');
  const titleFrequency = new Map();
  for (const page of list(pages)) for (const candidate of extractTitleBlockCandidates(page.textItems)) {
    const value = cleanSheetTitle(candidate.text).toUpperCase();
    if (validTitleCandidate({ ...candidate, text: value })) titleFrequency.set(value, (titleFrequency.get(value) || 0) + 1);
  }
  const repeatedTitles = new Set([...titleFrequency].filter(([, count]) => count >= Math.max(3, Math.ceil(list(pages).length * .4))).map(([value]) => value));
  let sheets = list(pages).map(page => {
    const sheetId = sheetIdFor(documentId, page.pageNumber);
    const metadata = selectSheetMetadata(page.textItems, { repeatedTitles });
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
      rejectedSheetNumberCandidates: metadata.rejectedNumberCandidates, sheetNumberResolutionMethod: metadata.sheetNumberMethod,
      sheetTitleCandidates: metadata.titleCandidates.map(item => ({ value: item.value, region: item.region, zone: item.zone, score: item.score })), rejectedSheetTitleCandidates: metadata.rejectedTitleCandidates, sheetTitleResolutionMethod: metadata.sheetTitleMethod,
      titleBlockSheetNumber: metadata.sheetNumber, titleBlockSheetTitle: metadata.sheetTitle,
      warnings: [...(metadata.conflicts.length ? [`Conflicting sheet-number candidates: ${metadata.conflicts.join(', ')}`] : []), ...(metadata.titleConflicts.length ? [`Ambiguous sheet-title candidates: ${metadata.titleConflicts.join(' | ')}`] : [])]
    };
  }).sort((a, b) => a.pageNumber - b.pageNumber);
  const indexEntries = extractDrawingIndexEntries(sheets);
  const indexByNumber = new Map();
  for (const entry of indexEntries) {
    if (!indexByNumber.has(entry.sheetNumber)) indexByNumber.set(entry.sheetNumber, []);
    indexByNumber.get(entry.sheetNumber).push(entry);
  }
  const indexMappings = mapDrawingIndexToSheets(indexEntries, sheets);
  sheets = sheets.map(sheet => {
    const candidateNumbers = [...new Set(sheet.sheetNumberCandidates.map(item => item.value))];
    const reconciled = candidateNumbers.flatMap(number => indexByNumber.get(number) || []);
    const uniqueReconciled = [...new Map(reconciled.map(entry => [entry.sheetNumber, entry])).values()];
    const mapped = indexMappings.get(sheet.sheetId);
    const indexEntry = mapped?.entry || (uniqueReconciled.length === 1 && (indexByNumber.get(uniqueReconciled[0].sheetNumber) || []).length === 1 ? uniqueReconciled[0] : null);
    const sheetNumber = indexEntry?.sheetNumber || (candidateNumbers.length === 1 ? candidateNumbers[0] : '');
    const sheetTitle = indexEntry?.sheetTitle || sheet.titleBlockSheetTitle || '';
    const titleConflict = Boolean(indexEntry?.sheetTitle && sheet.titleBlockSheetTitle && normalize(indexEntry.sheetTitle).toLowerCase() !== normalize(sheet.titleBlockSheetTitle).toLowerCase());
    const discipline = classifyDiscipline(sheetNumber, sheetTitle, indexEntry?.discipline);
    const sheetTypes = classifySheetTypes(sheetTitle);
    const addedWarnings = [
      ...(uniqueReconciled.length > 1 ? [`Ambiguous drawing-index mapping: ${uniqueReconciled.map(entry => entry.sheetNumber).join(', ')}`] : []),
      ...(titleConflict ? [`Drawing-index title "${indexEntry.sheetTitle}" conflicts with title-block title "${sheet.titleBlockSheetTitle}".`] : [])
    ];
    const numberMethod = indexEntry ? mapped?.method || 'index-title-block-reconciliation' : sheet.sheetNumberResolutionMethod;
    return {
      ...sheet, sheetNumber, sheetTitle, discipline: discipline.discipline, disciplineEvidence: discipline.evidence, disciplineMethod: discipline.method,
      sheetTypes, primarySheetType: primarySheetType(sheetTypes), indexEntry: indexEntry ? { ...indexEntry } : null,
      titleConflict: titleConflict ? { indexTitle: indexEntry.sheetTitle, titleBlockTitle: sheet.titleBlockSheetTitle } : null,
      sheetNumberResolutionMethod: numberMethod, sheetTitleResolutionMethod: indexEntry ? 'drawing-index' : sheet.sheetTitleResolutionMethod,
      identityStatus: indexEntry && !titleConflict ? 'Verified' : addedWarnings.length || !sheetNumber ? 'Ambiguous' : 'Supported', analysisStatus: addedWarnings.length ? 'Completed with warnings' : sheet.analysisStatus,
      confidence: indexEntry && !titleConflict ? .98 : sheetNumber && sheetTitle ? .85 : sheetNumber || sheetTitle ? .65 : .25,
      warnings: [...sheet.warnings, ...addedWarnings]
    };
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

export function reanalyzeDrawingAnalysis(analysis = {}) {
  const reviewed = list(analysis.observations).filter(item => item.verification?.status && item.verification.status !== 'Unreviewed');
  const verificationByObservation = new Map(reviewed.map(item => [item.observationId, item.verification]));
  const upgraded = buildDrawingAnalysis({
    documentId: analysis.documentId, projectId: analysis.projectId, analyzedAt: analysis.analyzedAt,
    pages: list(analysis.sheets).map(sheet => ({ pageNumber: sheet.pageNumber, width: sheet.pageWidth, height: sheet.pageHeight, rotation: sheet.rotation, textItems: sheet.textItems }))
  });
  upgraded.observations = upgraded.observations.map(item => verificationByObservation.has(item.observationId) ? { ...item, verification: structuredClone(verificationByObservation.get(item.observationId)) } : item);
  const resolved = new Set(upgraded.observations.map(item => item.observationId));
  upgraded.unmappedVerificationOverlays = reviewed.filter(item => !resolved.has(item.observationId)).map(item => ({ observationId: item.observationId, pageNumber: item.pageNumber, kind: item.kind, originalValue: item.originalValue, verification: structuredClone(item.verification) }));
  if (upgraded.unmappedVerificationOverlays.length) {
    upgraded.warnings.push({ type: 'verification-overlay-unmapped', count: upgraded.unmappedVerificationOverlays.length, message: `${upgraded.unmappedVerificationOverlays.length} reviewed observation overlay(s) could not be safely remapped.` });
    upgraded.status = 'Completed with warnings';
  }
  return upgraded;
}

export function upgradeDrawingAnalysis(analysis = {}) {
  return Number(analysis.analysisVersion) >= DRAWING_ANALYSIS_VERSION ? structuredClone(analysis) : reanalyzeDrawingAnalysis(analysis);
}

export const observationKindLabel = kind => ({
  'room-number-text': 'Room number', 'room-name-text': 'Room name', 'equipment-tag-text': 'Equipment tag', 'callout-text': 'Drawing reference', 'positioned-pdf-text': 'Drawing text'
}[text(kind)] || 'Drawing text');

export function groupDrawingObservations(observations = []) {
  const groups = { rooms: [], equipment: [], references: [], schedulesAndDetails: [], notes: [], other: [] };
  const roomMap = new Map();
  for (const item of list(observations)) {
    if (item.kind === 'room-number-text') {
      if (!roomMap.has(item.value)) roomMap.set(item.value, []);
      roomMap.get(item.value).push(item);
    } else if (item.kind === 'equipment-tag-text') groups.equipment.push(item);
    else if (item.kind === 'callout-text') groups.references.push(item);
    else if (/schedule|detail/i.test(item.kind) || /schedule|detail/i.test(item.value)) groups.schedulesAndDetails.push(item);
    else if (/note/i.test(item.kind)) groups.notes.push(item);
    else groups.other.push(item);
  }
  groups.rooms = [...roomMap].map(([roomNumber, items]) => ({ roomNumber, count: items.length, observationIds: items.map(item => item.observationId).sort(), verificationStates: [...new Set(items.map(item => item.verification?.status || 'Unreviewed'))].sort() })).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  return groups;
}

export function drawingWarningPresentation(warnings = []) {
  const actionableTypes = new Set(['title-mismatch', 'duplicate-sheet-number', 'expected-sheet-missing', 'verification-overlay-unmapped', 'sheet-warning']);
  const mapWarning = warning => ({
    ...warning,
    message: warning.message || ({
      'title-mismatch': 'Drawing index and title block disagree.',
      'duplicate-sheet-number': 'A sheet number appears more than once.',
      'expected-sheet-missing': 'A sheet listed in the drawing index could not be verified.',
      'sheet-absent-from-index': 'A detected sheet is not listed in the drawing index.',
      'order-mismatch': 'Drawing index order and PDF page order disagree.'
    }[warning.type] || 'Some sheet metadata requires review.')
  });
  return { userFacing: list(warnings).filter(item => actionableTypes.has(item.type)).map(mapWarning), technical: list(warnings).filter(item => !actionableTypes.has(item.type)).map(mapWarning) };
}

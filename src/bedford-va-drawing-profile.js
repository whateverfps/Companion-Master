const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const clean = value => text(value).replace(/\s+/g, ' ');

export const BEDFORD_VA_PROFILE_ID = 'bedford-va-triple-c';
export const BEDFORD_VA_PROFILE_VERSION = 1;
export const BEDFORD_TITLE_BLOCK_REGION = Object.freeze({ x: .48, y: .55, width: .52, height: .45 });
export const normalizeBedfordSheetNumber = value => clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, '');
export const normalizeBedfordTitle = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const DISCIPLINES = Object.freeze({ GENERAL: 'General', HAZARDOUS: 'Hazardous Materials', ARCHITECTURAL: 'Architectural', INTERIORS: 'Interiors', 'FIRE PROTECTION': 'Fire Protection', PLUMBING: 'Plumbing', MECHANICAL: 'Mechanical', ELECTRICAL: 'Electrical', TELECOMMUNICATION: 'Telecommunications', TELECOMMUNICATIONS: 'Telecommunications', REFERENCE: 'Reference' });
const FIELD_NAMES = Object.freeze({ 'PROJECT NUMBER': 'projectNumber', 'BUILDING NUMBER': 'buildingNumber', 'DRAWING NUMBER': 'drawingNumber', 'DRAWING TITLE': 'drawingTitle', 'ISSUE DATE': 'issueDate' });
const SHEET = /^(?:\d{1,4})?[A-Z]{1,3}[-.]?\d{3,4}[A-Z]?$/i;

function normalizedItems(items = []) {
  return list(items).map((item, order) => ({ text: clean(item?.text), region: item?.region || {}, order: Number(item?.order ?? order) })).filter(item => item.text);
}

function inRegion(item, region = BEDFORD_TITLE_BLOCK_REGION) {
  return Number(item?.region?.x) >= region.x && Number(item?.region?.y) >= region.y && Number(item?.region?.x) <= region.x + region.width && Number(item?.region?.y) <= region.y + region.height;
}

export function parseBedfordTitleBlock(items = []) {
  const source = normalizedItems(items).filter(item => inRegion(item));
  const fields = {};
  const evidence = [];
  for (const label of source) {
    const name = FIELD_NAMES[label.text.replace(/:$/, '').toUpperCase()];
    if (!name) continue;
    const candidate = source.filter(item => item !== label && !FIELD_NAMES[item.text.replace(/:$/, '').toUpperCase()])
      .filter(item => item.region.y >= label.region.y - .004 && item.region.y <= label.region.y + .065)
      .sort((a, b) => Math.abs(a.region.x - label.region.x) - Math.abs(b.region.x - label.region.x) || a.region.y - b.region.y)[0];
    if (!candidate) continue;
    const value = clean(candidate.text);
    const valid = name === 'drawingNumber' ? SHEET.test(value) : name === 'buildingNumber' ? /^\d{1,5}[A-Z]?$/.test(value) : Boolean(value);
    evidence.push({ field: name, labelRegion: label.region, valueRegion: candidate.region, value, valid });
    if (valid && !fields[name]) fields[name] = value;
  }
  return { ...fields, detected: Boolean(fields.drawingNumber || fields.projectNumber || fields.buildingNumber), sourceRegion: BEDFORD_TITLE_BLOCK_REGION, evidence };
}

export function detectBedfordVaProfile(pages = []) {
  const values = list(pages).flatMap(page => normalizedItems(page.textItems).map(item => item.text));
  const joined = values.join(' | ');
  const titleBlocks = list(pages).map(page => parseBedfordTitleBlock(page.textItems));
  const evidence = {
    projectNumber: /\b518-22-700\b/i.test(joined) || titleBlocks.some(block => block.projectNumber === '518-22-700'),
    bedford: /\bBEDFORD\b/i.test(joined),
    vaForm: /\bVA\s*FORM\s*08-6231\b/i.test(joined),
    tripleC: /\bTRIPLE\s*C\b/i.test(joined),
    indexLayout: /\bDRAWING INDEX\b/i.test(joined) && /\bSHEET (?:NUMBER|NO)\b/i.test(joined) && /\bSHEET (?:NAME|TITLE)\b/i.test(joined),
    labeledTitleBlock: titleBlocks.some(block => block.drawingNumber && block.buildingNumber)
  };
  const score = (evidence.projectNumber ? 3 : 0) + (evidence.bedford ? 2 : 0) + (evidence.vaForm ? 2 : 0) + (evidence.tripleC ? 2 : 0) + (evidence.indexLayout ? 1 : 0) + (evidence.labeledTitleBlock ? 1 : 0);
  return { selected: score >= 3, profileId: score >= 3 ? BEDFORD_VA_PROFILE_ID : '', score, evidence };
}

export function findBedfordDrawingIndexPage(pages = []) {
  return list(pages).find(page => {
    const block = parseBedfordTitleBlock(page.textItems);
    const joined = normalizedItems(page.textItems).map(item => item.text).join(' | ');
    return normalizeBedfordTitle(block.drawingTitle) === 'drawing index' && /G[-.]?001$/i.test(block.drawingNumber || '') && /\bSHEET (?:NUMBER|NO)\b/i.test(joined) && /\bSHEET (?:NAME|TITLE)\b/i.test(joined);
  }) || null;
}

export function parseBedfordDrawingIndex(page = null) {
  if (!page) return [];
  const items = normalizedItems(page.textItems).sort((a, b) => a.region.y - b.region.y || a.region.x - b.region.x);
  const rows = [];
  let discipline = 'Unknown';
  for (const item of items) {
    const heading = DISCIPLINES[item.text.toUpperCase()];
    if (heading) { discipline = heading; continue; }
    if (!SHEET.test(item.text) || Number(item.region.x) >= .45) continue;
    const row = items.filter(other => other !== item && Math.abs(other.region.y - item.region.y) <= .003 && other.region.x > item.region.x + item.region.width * .5).sort((a, b) => a.region.x - b.region.x);
    const status = row.find(other => /^(?:YES|NO|N\/A|INCLUDED|ISSUED)$/i.test(other.text));
    const title = clean(row.filter(other => other !== status && !DISCIPLINES[other.text.toUpperCase()] && !FIELD_NAMES[other.text.replace(/:$/, '').toUpperCase()]).map(other => other.text).join(' '));
    if (!title || /^(?:SHEET (?:NAME|TITLE))$/i.test(title)) continue;
    rows.push({ buildingNumber: normalizeBedfordSheetNumber(item.text).match(/^(\d+)/)?.[1] || '', discipline, sheetNumber: item.text.toUpperCase(), normalizedSheetNumber: normalizeBedfordSheetNumber(item.text), sheetTitle: title, normalizedTitle: normalizeBedfordTitle(title), expectedOrder: rows.length, inventoryOrder: rows.length, includedStatus: status?.text || '', sourcePage: page.pageNumber, sourceRegion: { x: item.region.x, y: item.region.y, width: Math.max(...row.map(other => other.region.x + other.region.width), item.region.x + item.region.width) - item.region.x, height: Math.max(item.region.height || 0, ...row.map(other => other.region.height || 0)) }, extractionMethod: 'bedford-va-index-profile' });
  }
  return rows;
}

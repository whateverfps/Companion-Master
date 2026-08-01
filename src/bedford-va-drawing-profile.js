const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const clean = value => text(value).replace(/\s+/g, ' ');

export const BEDFORD_VA_PROFILE_ID = 'bedford-va-triple-c';
export const BEDFORD_VA_PROFILE_VERSION = 2;
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

function indexParserDiagnostics(tableItems, strictSheetItems, rows) {
  const emitted = new Set(rows.map(row => row.normalizedSheetNumber));
  const strict = new Map(strictSheetItems.map(item => [normalizeBedfordSheetNumber(item.text), item]));
  const discovered = new Map();
  const remember = (normalizedSheetNumber, parts, reason) => {
    if (!normalizedSheetNumber || emitted.has(normalizedSheetNumber)) return;
    const existing = discovered.get(normalizedSheetNumber);
    const candidate = {
      sheetNumber: normalizedSheetNumber,
      exclusionRule: reason,
      fragmentCount: parts.length,
      reconstructedFragmentCandidate: parts.map(part => part.text).join(''),
      originalPdfJsTextItems: parts.map(part => ({ text: part.text, order: part.order, x: Number(part.region.x), y: Number(part.region.y), width: Number(part.region.width || 0) }))
    };
    if (!existing || candidate.fragmentCount < existing.fragmentCount) discovered.set(normalizedSheetNumber, candidate);
  };

  for (let start = 0; start < tableItems.length; start += 1) {
    for (let count = 1; count <= 8; count += 1) {
      const parts = tableItems.slice(start, start + count);
      if (parts.length !== count) continue;
      const normalized = normalizeBedfordSheetNumber(parts.map(part => part.text).join(''));
      if (!SHEET.test(normalized)) continue;
      const baselineFailure = parts.some(part => Math.abs(Number(part.region.y) - Number(parts[0].region.y)) > .006);
      const ordered = parts.slice().sort((a, b) => Number(a.region.x) - Number(b.region.x));
      const gapFailure = ordered.some((part, index) => index && Number(part.region.x) - (Number(ordered[index - 1].region.x) + Number(ordered[index - 1].region.width || 0)) > .025);
      const strictCandidate = strict.get(normalized);
      const reason = strictCandidate
        ? 'title reconstruction failure'
        : count > 3
          ? 'more than 3 fragments'
          : baselineFailure
            ? 'baseline > .006'
            : gapFailure
              ? 'gap > .025'
              : 'SHEET regex failure';
      remember(normalized, parts, reason);
    }
  }

  const sameBaseline = tableItems.slice().sort((a, b) => Number(a.region.y) - Number(b.region.y) || Number(a.region.x) - Number(b.region.x));
  for (let left = 0; left < sameBaseline.length; left += 1) {
    for (let right = left + 1; right < Math.min(sameBaseline.length, left + 10); right += 1) {
      const parts = [sameBaseline[left], sameBaseline[right]];
      if (Math.abs(Number(parts[0].region.y) - Number(parts[1].region.y)) > .006) continue;
      const normalized = normalizeBedfordSheetNumber(parts.map(part => part.text).join(''));
      if (SHEET.test(normalized) && Number(parts[1].order) !== Number(parts[0].order) + 1) remember(normalized, parts, 'non-consecutive');
    }
  }

  for (const item of strictSheetItems) {
    const normalized = normalizeBedfordSheetNumber(item.text);
    if (!emitted.has(normalized)) remember(normalized, [item], 'title reconstruction failure');
  }

  const duplicateKeys = rows.map(row => row.normalizedSheetNumber).filter((key, index, source) => source.indexOf(key) !== index);
  for (const key of duplicateKeys) {
    const item = strict.get(key);
    remember(key, item ? [item] : [], 'duplicate elimination');
  }

  const missingRows = [...discovered.values()].sort((a, b) => a.sheetNumber.localeCompare(b.sheetNumber, undefined, { numeric: true }));
  if (missingRows.length && globalThis.console) {
    console.groupCollapsed?.(`Bedford drawing index parser: ${missingRows.length} sheet-like row(s) not emitted`);
    console.info?.('Bedford drawing index parser comparison', { functionName: 'parseBedfordDrawingIndex', sheetLikeTextDiscovered: new Set([...emitted, ...discovered.keys()]).size, canonicalRowsEmitted: rows.length, missingCanonicalRows: missingRows.length, emittedSheetNumbers: [...emitted] });
    console.table?.(missingRows.map(item => ({ sheetNumber: item.sheetNumber, rule: item.exclusionRule, fragments: item.fragmentCount, candidate: item.reconstructedFragmentCandidate })));
    missingRows.forEach(item => console.info?.('Bedford drawing index row exclusion', item));
    console.groupEnd?.();
  }
  return missingRows;
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
  const tableItems = items.filter(item => Number(item.region.y) < BEDFORD_TITLE_BLOCK_REGION.y);
  const sheetItems = [];
  for (let index = 0; index < tableItems.length; index += 1) {
    const item = tableItems[index];
    const direct = normalizeBedfordSheetNumber(item.text);
    if (SHEET.test(item.text) || SHEET.test(direct)) sheetItems.push({ ...item, text: SHEET.test(item.text) ? item.text : direct, sourceOrders: [item.order] });
    for (let count = 2; count <= 3; count += 1) {
      const parts = tableItems.slice(index, index + count);
      if (parts.length !== count || parts.some(part => Math.abs(Number(part.region.y) - Number(item.region.y)) > .006)) continue;
      const ordered = parts.slice().sort((a, b) => a.region.x - b.region.x);
      if (ordered.some((part, partIndex) => partIndex && Number(part.region.x) - (Number(ordered[partIndex - 1].region.x) + Number(ordered[partIndex - 1].region.width || 0)) > .025)) continue;
      const combined = normalizeBedfordSheetNumber(ordered.map(part => part.text).join(''));
      if (!SHEET.test(combined)) continue;
      const left = Math.min(...ordered.map(part => Number(part.region.x)));
      const right = Math.max(...ordered.map(part => Number(part.region.x) + Number(part.region.width || 0)));
      sheetItems.push({ text: combined, order: Math.min(...ordered.map(part => part.order)), sourceOrders: ordered.map(part => part.order), region: { x: left, y: Math.min(...ordered.map(part => Number(part.region.y))), width: right - left, height: Math.max(...ordered.map(part => Number(part.region.height || 0))) } });
    }
  }
  const uniqueSheetItems = sheetItems.filter((item, index, source) => source.findIndex(other => normalizeBedfordSheetNumber(other.text) === normalizeBedfordSheetNumber(item.text) && Math.abs(Number(other.region.x) - Number(item.region.x)) < .006 && Math.abs(Number(other.region.y) - Number(item.region.y)) < .006) === index);
  const columnStarts = [];
  for (const item of uniqueSheetItems.slice().sort((a, b) => a.region.x - b.region.x)) {
    if (!columnStarts.some(value => Math.abs(value - item.region.x) <= .04)) columnStarts.push(Number(item.region.x));
  }
  const rows = [];
  for (const item of uniqueSheetItems.sort((a, b) => a.order - b.order || a.region.y - b.region.y || a.region.x - b.region.x)) {
    const columnIndex = columnStarts.findIndex(value => Math.abs(value - item.region.x) <= .04);
    const columnLeft = columnStarts[columnIndex] ?? Number(item.region.x);
    const columnRight = columnStarts[columnIndex + 1] === undefined ? 1 : columnStarts[columnIndex + 1] - .01;
    const nextRow = uniqueSheetItems.filter(other => other !== item && Math.abs(other.region.x - columnLeft) <= .04 && other.region.y > item.region.y + .001).sort((a, b) => a.region.y - b.region.y)[0];
    const rowBottom = Math.min(Number(item.region.y) + .018, nextRow ? Number(nextRow.region.y) - .001 : Number(item.region.y) + .018);
    const row = tableItems.filter(other => other !== item && !item.sourceOrders?.includes(other.order) && other.region.x > item.region.x + item.region.width * .5 && other.region.x < columnRight && other.region.y >= item.region.y - .003 && other.region.y <= rowBottom).sort((a, b) => a.region.y - b.region.y || a.region.x - b.region.x);
    const headingItem = tableItems.filter(other => DISCIPLINES[other.text.toUpperCase()] && other.region.x >= columnLeft - .04 && other.region.x < columnRight && other.region.y <= item.region.y).sort((a, b) => b.region.y - a.region.y)[0];
    const discipline = DISCIPLINES[headingItem?.text.toUpperCase()] || 'Unknown';
    const status = row.find(other => /^(?:YES|NO|N\/A|INCLUDED|ISSUED)$/i.test(other.text));
    const title = clean(row.filter(other => other !== status && !DISCIPLINES[other.text.toUpperCase()] && !FIELD_NAMES[other.text.replace(/:$/, '').toUpperCase()]).map(other => other.text).join(' '));
    if (!title || /^(?:SHEET (?:NAME|TITLE))$/i.test(title)) continue;
    rows.push({ buildingNumber: normalizeBedfordSheetNumber(item.text).match(/^(\d+)/)?.[1] || '', discipline, sheetNumber: item.text.toUpperCase(), normalizedSheetNumber: normalizeBedfordSheetNumber(item.text), sheetTitle: title, normalizedTitle: normalizeBedfordTitle(title), expectedOrder: rows.length, inventoryOrder: rows.length, includedStatus: status?.text || '', sourcePage: page.pageNumber, sourceRegion: { x: item.region.x, y: item.region.y, width: Math.max(...row.map(other => other.region.x + other.region.width), item.region.x + item.region.width) - item.region.x, height: Math.max(item.region.height || 0, ...row.map(other => other.region.height || 0)) }, extractionMethod: 'bedford-va-index-profile' });
  }
  const canonicalRows = rows.filter((row, index, source) => source.findIndex(other => other.normalizedSheetNumber === row.normalizedSheetNumber) === index).map((row, index) => ({ ...row, expectedOrder: index, inventoryOrder: index }));
  indexParserDiagnostics(tableItems, uniqueSheetItems, canonicalRows);
  return canonicalRows;
}

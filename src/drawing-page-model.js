const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];

export const normalizeDrawingPageSheetNumber = value => text(value).toUpperCase().replace(/[^A-Z0-9]+/g, '');

function pageNumber(record) {
  const value = Number(record?.pdfPageNumber || record?.pageNumber || record?.pdfPage);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function usableSheetNumber(value) {
  const candidate = text(value);
  return candidate && !/^FX\d+$/i.test(candidate) ? candidate : '';
}

function first(...values) { return values.map(text).find(Boolean) || ''; }

export function buildDrawingPageModel({ documentId = '', drawingSetId = '', projectId = '', pageCount = 0, registryRecords = [], partialSheets = [], storedPageMetadata = [] } = {}) {
  const count = Math.max(0, Math.trunc(Number(pageCount) || 0));
  const byPage = records => new Map(list(records).filter(item => pageNumber(item)).map(item => [pageNumber(item), item]));
  const registry = byPage(registryRecords);
  const partial = byPage(partialSheets);
  const stored = byPage(storedPageMetadata);
  return Array.from({ length: count }, (_, index) => {
    const pdfPageNumber = index + 1;
    const authoritative = registry.get(pdfPageNumber) || {};
    const analyzed = partial.get(pdfPageNumber) || {};
    const retained = stored.get(pdfPageNumber) || {};
    const sheetNumber = usableSheetNumber(first(authoritative.sheetNumber, analyzed.sheetNumber, retained.sheetNumber));
    const normalizedSheetNumber = normalizeDrawingPageSheetNumber(sheetNumber);
    const sheetTitle = first(authoritative.sheetTitle, analyzed.sheetTitle, retained.sheetTitle);
    const discipline = first(authoritative.discipline, analyzed.discipline, retained.discipline) || 'Unknown';
    const drawingType = first(authoritative.primarySheetType, authoritative.drawingType, list(authoritative.sheetTypes)[0], analyzed.primarySheetType, analyzed.drawingType, list(analyzed.sheetTypes)[0], retained.primarySheetType, retained.drawingType, list(retained.sheetTypes)[0]) || 'Unknown';
    const building = first(authoritative.buildingNumber, authoritative.building, analyzed.building, retained.building);
    const authoritativeIdentity = Boolean(usableSheetNumber(authoritative.sheetNumber));
    const partialIdentity = Boolean(sheetNumber || sheetTitle || discipline !== 'Unknown' || drawingType !== 'Unknown');
    const identityStatus = authoritativeIdentity ? 'authoritative' : partialIdentity ? 'partial' : 'fallback';
    return {
      documentId: text(documentId), drawingSetId: text(drawingSetId), projectId: text(projectId), pdfPageNumber, pdfPageIndex: index,
      drawingId: first(authoritative.drawingId, analyzed.drawingId, retained.drawingId),
      sheetId: first(authoritative.sheetId, analyzed.sheetId, retained.sheetId),
      sheetNumber, normalizedSheetNumber, sheetTitle, discipline, drawingType, building, identityStatus,
      searchableText: [sheetNumber, sheetTitle, discipline, drawingType, building && `Building ${building}`, `Page ${pdfPageNumber}`, ...list(analyzed.textItems).map(item => text(item?.text)), ...list(retained.tags)].filter(Boolean).join(' '),
      authoritativeRecord: authoritativeIdentity ? authoritative : null,
      partialRecord: Object.keys(analyzed).length ? analyzed : null,
      storedRecord: Object.keys(retained).length ? retained : null
    };
  });
}

export function drawingPageModelFacets(pages = []) {
  return {
    disciplines: [...new Set(list(pages).map(item => item.discipline || 'Unknown'))].sort(),
    drawingTypes: [...new Set(list(pages).map(item => item.drawingType || 'Unknown'))].sort()
  };
}

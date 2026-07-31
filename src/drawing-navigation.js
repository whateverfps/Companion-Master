import { normalizeRegion } from './pdf-source.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const safe = value => [...text(value)].map(character => /^[a-zA-Z0-9_-]$/.test(character) ? character : `_${character.codePointAt(0).toString(16)}_`).join('') || 'unavailable';

export function drawingAnchorId(kind, identifier) {
  return `mc-drawing-${safe(kind).toLowerCase()}-${safe(identifier)}`;
}

export function createDrawingTarget({ projectId, documentId, drawingSetId, sheetId, pageNumber, sheetNumber, observationId, region, origin = 'drawings' } = {}) {
  if (!text(documentId)) return null;
  const page = Number.isInteger(Number(pageNumber)) && Number(pageNumber) > 0 ? Number(pageNumber) : null;
  return {
    projectId: text(projectId), documentId: text(documentId), drawingSetId: text(drawingSetId),
    sheetId: text(sheetId), pageNumber: page, sheetNumber: text(sheetNumber),
    observationId: text(observationId), region: region ? normalizeRegion(region) : null, origin: text(origin)
  };
}

export function resolveDrawingTarget(target, { documents = [], analyses = [] } = {}) {
  if (!target?.documentId) return { status: 'none', document: null, analysis: null, sheet: null, observation: null };
  const document = documents.find(item => text(item?.id) === target.documentId) || null;
  if (!document) return { status: 'missing-document', document: null, analysis: null, sheet: null, observation: null };
  const analysis = analyses.find(item => text(item?.documentId) === target.documentId && (!target.drawingSetId || text(item.drawingSetId) === target.drawingSetId)) || null;
  if (!analysis) return { status: 'missing-analysis', document, analysis: null, sheet: null, observation: null };
  const sheet = target.sheetId
    ? analysis.sheets.find(item => text(item.sheetId) === target.sheetId) || null
    : target.pageNumber
      ? analysis.sheets.find(item => Number(item.pageNumber) === target.pageNumber) || null
      : null;
  if ((target.sheetId || target.pageNumber) && !sheet) return { status: 'missing-page', document, analysis, sheet: null, observation: null };
  const observation = target.observationId
    ? analysis.observations.find(item => text(item.observationId) === target.observationId && (!sheet || item.sheetId === sheet.sheetId)) || null
    : null;
  if (target.observationId && !observation) return { status: 'missing-observation', document, analysis, sheet, observation: null };
  return { status: observation || target.region ? 'region' : sheet ? 'sheet' : 'document', document, analysis, sheet, observation };
}

export function drawingScrollOptions(reducedMotion = false) {
  return { behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' };
}

export function drawingReturnTarget(target, destination) {
  if (!target?.documentId || !['mission-control', 'professional-workspace', 'source'].includes(destination)) return null;
  return { ...target, destination };
}

export function drawingMatchingSetTarget(sheetIds = [], currentSheetId = '', offset = 0, analysis = null) {
  const ordered = [...new Set((Array.isArray(sheetIds) ? sheetIds : []).map(text).filter(Boolean))];
  const current = ordered.indexOf(text(currentSheetId));
  const nextId = ordered[current + Number(offset)];
  const sheet = analysis?.sheets?.find(item => text(item.sheetId) === nextId);
  return sheet ? createDrawingTarget({ projectId: analysis.projectId, documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, sheetId: sheet.sheetId, pageNumber: sheet.pageNumber, sheetNumber: sheet.sheetNumber }) : null;
}

export function reconcileDrawingSelection(sheetIds = [], currentSheetId = '') {
  const ordered = [...new Set((Array.isArray(sheetIds) ? sheetIds : []).map(text).filter(Boolean))];
  if (!ordered.length) return { sheetId: '', index: -1, preserved: false };
  const index = ordered.indexOf(text(currentSheetId));
  return index >= 0 ? { sheetId: ordered[index], index, preserved: true } : { sheetId: ordered[0], index: 0, preserved: false };
}

export function drawingResultKeyTarget(key, { sheetIds = [], activeIndex = -1 } = {}) {
  const count = Array.isArray(sheetIds) ? sheetIds.length : 0;
  if (!count) return { index: -1, activate: false, clear: key === 'Escape' };
  if (key === 'ArrowDown') return { index: Math.min(count - 1, activeIndex < 0 ? 0 : activeIndex + 1), activate: false, clear: false };
  if (key === 'ArrowUp') return { index: Math.max(0, activeIndex < 0 ? count - 1 : activeIndex - 1), activate: false, clear: false };
  if (key === 'Enter') return { index: activeIndex < 0 ? 0 : activeIndex, activate: true, clear: false };
  return { index: activeIndex, activate: false, clear: key === 'Escape' };
}

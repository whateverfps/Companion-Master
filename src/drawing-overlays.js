import { validNormalizedRegion } from './drawing-object-model.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];

export const DRAWING_OVERLAY_TYPES = Object.freeze(['rooms', 'confirmed', 'candidates', 'equipment', 'keyedNotes', 'callouts', 'scheduleLinks', 'warnings', 'selected']);

export function createDrawingOverlay(record = {}) {
  if (!text(record.projectId) || !text(record.documentId) || !text(record.pageId) || !validNormalizedRegion(record.region)) return null;
  const type = DRAWING_OVERLAY_TYPES.includes(record.type) ? record.type : 'candidates';
  return {
    overlayId: text(record.overlayId || record.id), projectId: text(record.projectId), documentId: text(record.documentId), pageId: text(record.pageId),
    type, region: { ...record.region }, geometry: record.geometry || null, label: text(record.label) || 'Drawing evidence', sourceObservationId: text(record.sourceObservationId),
    confidence: Math.max(0, Math.min(1, Number(record.confidence) || 0)), verificationState: text(record.verificationState).toLowerCase() || 'candidate',
    visible: record.visible !== false, selectable: record.selectable !== false, styleToken: text(record.styleToken) || type, metadata: record.metadata ? structuredClone(record.metadata) : {}
  };
}

export function transformOverlayRegion(region, rotation = 0) {
  const angle = ((Number(rotation) % 360) + 360) % 360;
  if (angle === 90) return { x: 1 - region.y - region.height, y: region.x, width: region.height, height: region.width };
  if (angle === 180) return { x: 1 - region.x - region.width, y: 1 - region.y - region.height, width: region.width, height: region.height };
  if (angle === 270) return { x: region.y, y: 1 - region.x - region.width, width: region.height, height: region.width };
  return { ...region };
}

export function visibleDrawingOverlays(records = [], { projectId, documentId, pageId, visibility = {}, rotation = 0 } = {}) {
  return list(records).map(createDrawingOverlay).filter(Boolean).filter(record => record.projectId === text(projectId) && record.documentId === text(documentId) && record.pageId === text(pageId)
    && record.visible && visibility[record.type] !== false).map(record => ({ ...record, displayRegion: transformOverlayRegion(record.region, rotation) }));
}

export function overlayStyle(record) {
  const region = record?.displayRegion || record?.region;
  if (!validNormalizedRegion(region)) return null;
  return { left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${Math.max(region.width * 100, .8)}%`, height: `${Math.max(region.height * 100, .8)}%` };
}

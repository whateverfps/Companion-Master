import { normalizeSpecificationNumber } from './specification-index.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const RULES = Object.freeze({ signage: '10 14 00', 'resilient-base': '09 65 13', 'resilient-tile': '09 65 19', 'paint-finish': '09 91 00', 'wall-protection': '10 26 00', 'door-protection': '10 26 00', 'fire-extinguisher-cabinet': '10 44 13' });

function linkId(record) { return `drawing-spec-link:${[record.drawingPageId, record.objectId || 'page', normalizeSpecificationNumber(record.sectionNumber)].join(':')}`; }

export function createDrawingSpecificationLinkService({ index, storage = globalThis.localStorage, storageKey = 'mission-companion:drawing-spec-links:v1', now = () => new Date().toISOString() } = {}) {
  const read = () => { try { return list(JSON.parse(storage?.getItem?.(storageKey) || '[]')); } catch { return []; } };
  const write = records => storage?.setItem?.(storageKey, JSON.stringify(records));
  const upsert = input => {
    const section = index?.get?.(input.specificationDocumentId, input.sectionNumber);
    if (!section || section.projectId !== text(input.projectId)) return null;
    const timestamp = now();
    const records = read();
    const existing = records.find(item => item.linkId === (text(input.linkId) || linkId(input)));
    const record = { linkId: text(input.linkId) || linkId(input), projectId: text(input.projectId), drawingDocumentId: text(input.drawingDocumentId), drawingPageId: text(input.drawingPageId), objectId: text(input.objectId) || null,
      specificationDocumentId: section.documentId, sectionNumber: section.sectionNumber, sectionTitle: section.sectionTitle, articleReference: input.articleReference || null,
      evidenceSource: text(input.evidenceSource), evidenceText: text(input.evidenceText), confidence: Math.max(0, Math.min(1, Number(input.confidence) || 0)),
      status: ['confirmed', 'suggested', 'rejected'].includes(input.status) ? input.status : 'suggested', origin: ['explicit', 'parser', 'rule', 'manual'].includes(input.origin) ? input.origin : 'rule',
      note: text(input.note), createdAt: text(input.createdAt || existing?.createdAt) || timestamp, updatedAt: timestamp,
      history: [...list(existing?.history), ...(existing && (existing.status !== input.status || existing.note !== text(input.note)) ? [{ oldStatus: existing.status, newStatus: input.status, oldNote: existing.note || '', newNote: text(input.note), source: text(input.origin || 'rule'), time: timestamp }] : [])] };
    const position = records.findIndex(item => item.linkId === record.linkId);
    if (position >= 0 && records[position].origin === 'manual' && record.origin !== 'manual') return structuredClone(records[position]);
    if (position >= 0 && records[position].status === 'rejected' && record.origin !== 'manual') return structuredClone(records[position]);
    if (position >= 0) records[position] = record; else records.push(record);
    write(records); return structuredClone(record);
  };
  return {
    link: upsert,
    suggestForObject(object, { specificationDocumentId } = {}) {
      const explicit = text(object?.evidenceText).match(/\b(\d{2})\s?(\d{2})\s?(\d{2})\b/g) || [];
      const proposals = explicit.map(number => ({ sectionNumber: number, origin: 'explicit', status: 'confirmed', confidence: .95, evidenceSource: 'drawing-explicit-reference' }));
      const rule = RULES[text(object?.subtype || object?.type).toLowerCase()];
      if (rule) proposals.push({ sectionNumber: rule, origin: 'rule', status: 'suggested', confidence: .55, evidenceSource: 'verified-object-project-vocabulary' });
      return proposals.map(proposal => upsert({ ...proposal, projectId: object.projectId, drawingDocumentId: object.documentId, drawingPageId: object.pageId, objectId: object.objectId, specificationDocumentId, evidenceText: object.evidenceText })).filter(Boolean);
    },
    confirm(linkIdValue, note = '') { const current = read().find(item => item.linkId === linkIdValue); return current ? upsert({ ...current, status: 'confirmed', origin: 'manual', note }) : null; },
    reject(linkIdValue, note = '') { const current = read().find(item => item.linkId === linkIdValue); return current ? upsert({ ...current, status: 'rejected', origin: 'manual', note }) : null; },
    remove(linkIdValue) { const records = read(); const current = records.find(item => item.linkId === linkIdValue); if (!current || current.origin !== 'manual') return false; write(records.filter(item => item.linkId !== linkIdValue)); return true; },
    forPage(pageId, objectId = undefined) { return read().filter(item => item.drawingPageId === text(pageId) && (objectId === undefined || item.objectId === (text(objectId) || null))).map(item => structuredClone(item)); },
    history(linkIdValue) { return structuredClone(read().find(item => item.linkId === text(linkIdValue))?.history || []); },
    openTarget(link) { const section = index?.get?.(link?.specificationDocumentId, link?.sectionNumber); return section ? { kind: 'source', destination: 'knowledge', projectId: link.projectId, documentId: section.documentId, sectionId: section.specificationSectionId, pageNumber: link.articleReference?.pageNumber || section.startPdfPage, sectionNumber: section.sectionNumber } : null; }
  };
}

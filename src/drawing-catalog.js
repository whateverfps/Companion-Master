const STORAGE_KEY = 'mc-drawing-page-catalog-v1';
const FIELDS = Object.freeze(['sheetNumber', 'sheetTitle', 'discipline', 'drawingType']);
const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const pageNumber = record => Math.trunc(Number(record?.pdfPageNumber || record?.pageNumber || record?.pdfPage) || 0);
const recordKey = (documentId, pdfPageNumber) => `${text(documentId)}:${Number(pdfPageNumber) || 0}`;
const pageIdFor = (documentId, pdfPageNumber) => `drawing-page:${encodeURIComponent(text(documentId))}:${Number(pdfPageNumber) || 0}`;
const protectedState = state => ['manual', 'authoritative'].includes(state);
const usableSheetNumber = value => {
  const candidate = text(value);
  return candidate && !/^FX\d+$/i.test(candidate) ? candidate : '';
};
const normalizeSheetNumber = value => usableSheetNumber(value).toUpperCase().replace(/[^A-Z0-9]+/g, '');
const valuesOf = record => ({ sheetNumber: usableSheetNumber(record?.sheetNumber), sheetTitle: text(record?.sheetTitle || record?.title), discipline: text(record?.discipline) || 'Unknown', drawingType: text(record?.drawingType || record?.primarySheetType || record?.sheetTypes?.[0]) || 'Unknown' });
const differs = (left, right) => FIELDS.some(field => text(left?.[field]) !== text(right?.[field]));

function read(storage) {
  try { return JSON.parse(storage?.getItem(STORAGE_KEY) || '{}') || {}; }
  catch { return {}; }
}

function normalizedRecord(record = {}, ownership = {}) {
  const pdfPageNumber = pageNumber(record);
  const documentId = text(ownership.documentId || record.documentId);
  const values = valuesOf(record);
  return {
    pageId: text(record.pageId) || pageIdFor(documentId, pdfPageNumber), documentId, drawingSetId: text(ownership.drawingSetId || record.drawingSetId), projectId: text(ownership.projectId || record.projectId),
    pdfPageNumber, pdfPageIndex: Math.max(0, pdfPageNumber - 1), ...values, normalizedSheetNumber: normalizeSheetNumber(values.sheetNumber),
    identityState: ['authoritative', 'parser', 'manual', 'fallback'].includes(record.identityState) ? record.identityState : 'fallback',
    parserValues: record.parserValues ? valuesOf(record.parserValues) : null, defaults: record.defaults ? valuesOf(record.defaults) : null,
    createdAt: text(record.createdAt), updatedAt: text(record.updatedAt), auditTrail: list(record.auditTrail).map(item => structuredClone(item))
  };
}

function audit(oldRecord, newRecord, time, source) {
  const changes = {};
  for (const field of FIELDS) if (text(oldRecord?.[field]) !== text(newRecord?.[field])) changes[field] = { oldValue: oldRecord?.[field] ?? '', newValue: newRecord?.[field] ?? '' };
  if (text(oldRecord?.identityState) !== text(newRecord?.identityState)) changes.identityState = { oldValue: oldRecord?.identityState || '', newValue: newRecord?.identityState || '' };
  if (JSON.stringify(oldRecord?.parserValues || null) !== JSON.stringify(newRecord?.parserValues || null)) changes.parserValues = { oldValue: oldRecord?.parserValues || null, newValue: newRecord?.parserValues || null };
  if (!Object.keys(changes).length && oldRecord) return list(oldRecord.auditTrail);
  return [...list(oldRecord?.auditTrail), { time, source: text(source) || 'unknown', changes }];
}

export function createDrawingCatalog({ storage = globalThis.localStorage, onDifference = () => {}, now = () => new Date().toISOString() } = {}) {
  let records = read(storage);
  const persist = () => { try { storage?.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {} };
  const save = (next, source) => {
    const key = recordKey(next.documentId, next.pdfPageNumber);
    const old = records[key] ? normalizedRecord(records[key]) : null;
    const time = now();
    const record = normalizedRecord({ ...next, createdAt: old?.createdAt || next.createdAt || time, updatedAt: time, auditTrail: audit(old, next, time, source) });
    records[key] = record;
    persist();
    return structuredClone(record);
  };
  const recordFor = (documentId, pdfPageNumber) => records[recordKey(documentId, pdfPageNumber)] ? normalizedRecord(records[recordKey(documentId, pdfPageNumber)]) : null;
  return {
    recordsForDocument(documentId) {
      return Object.values(records).filter(item => item.documentId === text(documentId)).sort((a, b) => a.pdfPageNumber - b.pdfPageNumber).map(item => structuredClone(normalizedRecord(item)));
    },
    reconcile({ documentId, drawingSetId = '', projectId = '', pageCount = 0, parserRecords = [], storedMetadata = [] } = {}) {
      const parserByPage = new Map(list(parserRecords).filter(item => pageNumber(item)).map(item => [pageNumber(item), item]));
      const storedByPage = new Map(list(storedMetadata).filter(item => pageNumber(item)).map(item => [pageNumber(item), item]));
      const output = [];
      for (let page = 1; page <= Math.max(0, Math.trunc(Number(pageCount) || 0)); page += 1) {
        const existing = recordFor(documentId, page);
        const parsed = parserByPage.get(page) || {};
        const stored = storedByPage.get(page) || {};
        const parserValues = valuesOf({ sheetNumber: usableSheetNumber(parsed.sheetNumber) || usableSheetNumber(stored.sheetNumber), sheetTitle: text(parsed.sheetTitle || parsed.title) || text(stored.sheetTitle || stored.title), discipline: text(parsed.discipline) || text(stored.discipline), drawingType: text(parsed.drawingType || parsed.primarySheetType || parsed.sheetTypes?.[0]) || text(stored.drawingType || stored.primarySheetType || stored.sheetTypes?.[0]) });
        const parserHasMetadata = Boolean(parserValues.sheetNumber || parserValues.sheetTitle || parserValues.discipline !== 'Unknown' || parserValues.drawingType !== 'Unknown');
        if (existing && protectedState(existing.identityState)) {
          if (parserHasMetadata && differs(existing, parserValues)) onDifference({ documentId: text(documentId), pageId: existing.pageId, pdfPageNumber: page, fields: this.compare(documentId, page, parserValues) });
          const parserChanged = differs(existing.parserValues || {}, parserValues);
          output.push(parserChanged ? save({ ...existing, parserValues }, 'parser-observation') : existing);
          continue;
        }
        const values = parserHasMetadata ? parserValues : valuesOf({});
        const next = normalizedRecord({ ...(existing || {}), ...values, documentId, drawingSetId, projectId, pdfPageNumber: page, identityState: parserHasMetadata ? 'parser' : 'fallback', parserValues: parserHasMetadata ? parserValues : null, defaults: existing?.defaults || values }, { documentId, drawingSetId, projectId });
        output.push(!existing || differs(existing, next) || existing.identityState !== next.identityState ? save(next, parserHasMetadata ? 'parser' : 'fallback') : existing);
      }
      persist();
      return output;
    },
    applyToCatalog(documentId, pdfPageNumber, values = {}, ownership = {}, source = 'manual') {
      const existing = recordFor(documentId, pdfPageNumber) || normalizedRecord({ documentId, pdfPageNumber }, ownership);
      const supplied = valuesOf(values);
      const merged = Object.fromEntries(FIELDS.map(field => [field, Object.hasOwn(values, field) || field === 'sheetTitle' && Object.hasOwn(values, 'title') ? supplied[field] : existing[field]]));
      return save({ ...existing, ...merged, identityState: source === 'authoritative' ? 'authoritative' : 'manual', ...ownership }, source);
    },
    setManual(documentId, pdfPageNumber, values = {}, ownership = {}) { return this.applyToCatalog(documentId, pdfPageNumber, values, ownership, 'manual'); },
    setAuthoritative(documentId, pdfPageNumber, values = {}, ownership = {}) { return this.applyToCatalog(documentId, pdfPageNumber, values, ownership, 'authoritative'); },
    resetToParser(documentId, pdfPageNumber) {
      const existing = recordFor(documentId, pdfPageNumber);
      return existing?.parserValues ? save({ ...existing, ...existing.parserValues, identityState: 'parser' }, 'reset-to-parser') : null;
    },
    restoreDefaults(documentId, pdfPageNumber) {
      const existing = recordFor(documentId, pdfPageNumber);
      if (!existing?.defaults) return null;
      const hasMetadata = Boolean(existing.defaults.sheetNumber || existing.defaults.sheetTitle || existing.defaults.discipline !== 'Unknown' || existing.defaults.drawingType !== 'Unknown');
      return save({ ...existing, ...existing.defaults, identityState: hasMetadata ? 'parser' : 'fallback' }, 'restore-defaults');
    },
    compare(documentId, pdfPageNumber, parserOverride = null) {
      const existing = recordFor(documentId, pdfPageNumber);
      if (!existing) return [];
      const parser = parserOverride ? valuesOf(parserOverride) : existing.parserValues || valuesOf({});
      return FIELDS.map(field => ({ field, parserValue: parser[field], catalogValue: existing[field], chosenValue: existing[field], reason: protectedState(existing.identityState) ? `${existing.identityState}-catalog-precedence` : parser[field] ? 'parser-enrichment' : 'catalog-fallback' }));
    }
  };
}

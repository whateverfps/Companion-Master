const text = value => value === null || value === undefined ? '' : String(value).trim();
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = value => Math.max(0, Math.min(1, finite(value)));
const PDF_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

let pdfJsPromise = null;

export async function loadPdfJs(importer = specifier => import(specifier)) {
  if (!pdfJsPromise) {
    pdfJsPromise = importer(PDF_JS_URL).then(pdfjs => {
      if (pdfjs?.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      return pdfjs;
    }).catch(error => {
      pdfJsPromise = null;
      throw error;
    });
  }
  return pdfJsPromise;
}

export function normalizeRegion(region = {}) {
  const x = clamp(region.x);
  const y = clamp(region.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(1 - x, clamp(region.width))),
    height: Math.max(0, Math.min(1 - y, clamp(region.height)))
  };
}

export function normalizePageMetadata({ pageNumber, width, height, rotation } = {}) {
  const normalizedRotation = ((Math.round(finite(rotation)) % 360) + 360) % 360;
  return {
    pageNumber: Math.max(1, Math.trunc(finite(pageNumber, 1))),
    width: Math.max(0, finite(width)),
    height: Math.max(0, finite(height)),
    rotation: [0, 90, 180, 270].includes(normalizedRotation) ? normalizedRotation : 0
  };
}

export function positionedTextItem(item = {}, page = {}) {
  const metadata = normalizePageMetadata(page);
  const transform = Array.isArray(item.transform) ? item.transform : [];
  const width = Math.max(0, finite(item.width));
  const height = Math.max(0, finite(item.height, Math.abs(finite(transform[3]))));
  const sourceX = finite(transform[4]);
  const sourceY = finite(transform[5]);
  return {
    text: String(item.str ?? ''),
    region: normalizeRegion({
      x: metadata.width ? sourceX / metadata.width : 0,
      y: metadata.height ? (metadata.height - sourceY - height) / metadata.height : 0,
      width: metadata.width ? width / metadata.width : 0,
      height: metadata.height ? height / metadata.height : 0
    })
  };
}

export function createPdfSourceRecord({ documentId, projectId, sourceBlob, contentHash = '', storedAt = '' } = {}) {
  if (!text(documentId) || !text(projectId)) throw new Error('PDF source requires exact document and project identifiers.');
  if (!(sourceBlob instanceof Blob) || sourceBlob.type !== 'application/pdf') throw new Error('PDF source must be an application/pdf Blob.');
  return {
    documentId: text(documentId), projectId: text(projectId), mimeType: 'application/pdf',
    byteLength: sourceBlob.size, contentHash: text(contentHash), sourceBlob,
    storedAt: text(storedAt)
  };
}

export function validatePdfSourceOwnership(record, { documentId, projectId } = {}) {
  if (!record) return { available: false, reason: 'Original PDF unavailable' };
  if (text(record.documentId) !== text(documentId) || text(record.projectId) !== text(projectId)) {
    return { available: false, reason: 'Stored PDF does not belong to the selected document and project.' };
  }
  if (!(record.sourceBlob instanceof Blob) || record.mimeType !== 'application/pdf') {
    return { available: false, reason: 'Stored PDF source is invalid.' };
  }
  return { available: true, reason: '' };
}

export async function inspectStorageCapacity(byteLength, storage = globalThis.navigator?.storage) {
  if (!storage?.estimate) return { available: null, sufficient: null, required: finite(byteLength), quota: null, usage: null };
  try {
    const estimate = await storage.estimate();
    const quota = estimate.quota === null || estimate.quota === undefined ? null : finite(estimate.quota, null);
    const usage = estimate.usage === null || estimate.usage === undefined ? null : finite(estimate.usage, null);
    const available = quota === null || usage === null ? null : Math.max(0, quota - usage);
    return { available, sufficient: available === null ? null : available >= finite(byteLength), required: finite(byteLength), quota, usage };
  } catch (error) {
    return { available: null, sufficient: null, required: finite(byteLength), quota: null, usage: null, error: error?.message || String(error) };
  }
}

export async function openPdfBlob(blob, options = {}) {
  if (!(blob instanceof Blob) || blob.type !== 'application/pdf') throw new Error('A valid PDF Blob is required.');
  const pdfjs = options.pdfjs || await loadPdfJs(options.importer);
  const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
  try { Object.defineProperty(pdf, '__mcPdfjsOps', { value: pdfjs.OPS || {}, enumerable: false }); } catch {}
  return pdf;
}

function primitiveBounds(values = [], metadata = {}) {
  const numbers = values.flat(Infinity).map(Number).filter(Number.isFinite);
  if (numbers.length < 2 || !metadata.width || !metadata.height) return normalizeRegion({});
  const xs = numbers.filter((_, index) => index % 2 === 0);
  const ys = numbers.filter((_, index) => index % 2 === 1);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  return normalizeRegion({ x: left / metadata.width, y: (metadata.height - bottom) / metadata.height, width: (right - left) / metadata.width, height: (bottom - top) / metadata.height });
}

export async function readPdfPageGraphics(pdf, pageNumber, { signal = null, maxOperations = 12000, ops = null } = {}) {
  if (!pdf?.getPage) return { supported: false, status: 'missing-source', pageNumber, primitives: [], warnings: ['PDF source is unavailable.'] };
  if (signal?.aborted) return { supported: false, status: 'cancelled', pageNumber, primitives: [], warnings: [] };
  const page = await pdf.getPage(Math.trunc(finite(pageNumber)));
  if (!page.getOperatorList) return { supported: false, status: 'unsupported', pageNumber, primitives: [], warnings: ['PDF graphics operators are unavailable.'] };
  const viewport = page.getViewport({ scale: 1, rotation: 0 });
  const metadata = normalizePageMetadata({ pageNumber, width: viewport.width, height: viewport.height, rotation: page.rotate || 0 });
  const operationNames = new Map(Object.entries(ops || pdf.__mcPdfjsOps || {}).map(([name, value]) => [value, name]));
  const operatorList = await page.getOperatorList();
  const count = Math.min(operatorList.fnArray?.length || 0, Math.max(1, Math.trunc(finite(maxOperations, 12000))));
  const primitives = [];
  for (let index = 0; index < count; index += 1) {
    if (signal?.aborted) return { supported: true, status: 'cancelled', pageNumber, primitives: [], warnings: [] };
    const raw = operatorList.fnArray[index];
    const name = typeof raw === 'string' ? raw : operationNames.get(raw) || '';
    const args = operatorList.argsArray?.[index] || [];
    if (name === 'constructPath') {
      const coordinates = Array.isArray(args[1]) ? args[1] : args;
      const bounds = args.length >= 6 && args.slice(2, 6).every(Number.isFinite)
        ? normalizeRegion({ x: args[2] / metadata.width, y: (metadata.height - args[5]) / metadata.height, width: (args[4] - args[2]) / metadata.width, height: (args[5] - args[3]) / metadata.height })
        : primitiveBounds(coordinates, metadata);
      primitives.push({ primitiveId: `primitive-${pageNumber}-${index}`, kind: 'path', bounds, points: coordinates.slice(0, 256).reduce((output, value, pointIndex) => { if (pointIndex % 2 === 0 && Number.isFinite(Number(value)) && Number.isFinite(Number(coordinates[pointIndex + 1]))) output.push({ x: Number(value) / metadata.width, y: (metadata.height - Number(coordinates[pointIndex + 1])) / metadata.height }); return output; }, []), stroke: false, fill: false, lineWidth: 0, sourceOperation: index });
    } else if (/paintImageXObject|paintInlineImageXObject/.test(name)) primitives.push({ primitiveId: `primitive-${pageNumber}-${index}`, kind: 'image-boundary', bounds: normalizeRegion({}), points: [], stroke: false, fill: true, lineWidth: 0, sourceOperation: index });
    else if (/stroke|fill/i.test(name) && primitives.length) {
      const current = primitives[primitives.length - 1];
      if (current.kind === 'path') { current.stroke ||= /stroke/i.test(name); current.fill ||= /fill/i.test(name); }
    }
  }
  const truncated = (operatorList.fnArray?.length || 0) > count;
  page.cleanup?.();
  return { supported: true, status: truncated ? 'bounded' : 'ready', ...metadata, primitives, operationCount: count, warnings: truncated ? ['Graphics analysis was bounded to the configured operation limit.'] : [] };
}

export async function readPdfPage(pdf, pageNumber) {
  if (!pdf?.getPage) throw new Error('PDF source is unavailable.');
  const number = Math.trunc(finite(pageNumber));
  if (number < 1 || number > finite(pdf.numPages)) throw new Error('Requested PDF page is unavailable.');
  const page = await pdf.getPage(number);
  const viewport = page.getViewport({ scale: 1, rotation: 0 });
  const content = await page.getTextContent();
  const annotations = page.getAnnotations ? await page.getAnnotations() : [];
  const metadata = normalizePageMetadata({ pageNumber: number, width: viewport.width, height: viewport.height, rotation: page.rotate || viewport.rotation });
  return {
    ...metadata,
    textItems: (content.items || []).map(item => positionedTextItem(item, metadata)).filter(item => item.text.trim()),
    annotations: Array.isArray(annotations) ? annotations : []
  };
}

export async function renderPdfPage(pdf, pageNumber, canvas, { scale = 1, rotation = null } = {}) {
  if (!canvas?.getContext) throw new Error('A canvas rendering target is required.');
  const page = await pdf.getPage(Math.trunc(finite(pageNumber)));
  const viewport = page.getViewport({ scale: Math.max(.1, Math.min(6, finite(scale, 1))), rotation: rotation === null ? page.rotate || 0 : finite(rotation) });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
  return {
    task,
    viewport,
    promise: task.promise,
    cancel() { try { task.cancel(); } catch {} },
    releasePage() { page.cleanup?.(); },
    release() { canvas.width = 0; canvas.height = 0; page.cleanup?.(); }
  };
}

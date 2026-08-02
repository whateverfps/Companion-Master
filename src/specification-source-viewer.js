import { isSpecificationDocument } from './document-routing.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const pageNumber = value => Math.max(0, Math.trunc(Number(value) || 0));

export function createSpecificationSourceViewer({ openPdf, renderPage, now = () => new Date().toISOString(), onDiagnostic = () => {} } = {}) {
  if (typeof openPdf !== 'function' || typeof renderPage !== 'function') throw new Error('Specification source viewer requires PDF open and render functions.');
  let proxy = null;
  let render = null;
  let canvas = null;
  let target = null;
  let cleanupTimestamp = '';
  let generation = 0;

  const diagnostics = () => ({
    specificationPdfProxyActive: Boolean(proxy),
    specificationSourcePage: target?.pageNumber || null,
    sourceViewRenderTaskActive: Boolean(render),
    sourceViewCanvasPixels: canvas ? { width: Number(canvas.width) || 0, height: Number(canvas.height) || 0 } : { width: 0, height: 0 },
    sourceViewCacheEntryCount: 0,
    sourceViewCleanupTimestamp: cleanupTimestamp,
    retainedSpecificationPageRecordsInMemory: target ? 1 : 0
  });

  async function close(reason = 'closed') {
    generation += 1;
    try { render?.cancel?.(); } catch {}
    try { render?.release?.(); } catch {}
    render = null;
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    canvas = null;
    try { await proxy?.cleanup?.(); } catch {}
    try { await proxy?.destroy?.(); } catch {}
    proxy = null;
    target = null;
    cleanupTimestamp = now();
    const state = { ...diagnostics(), reason };
    onDiagnostic(state);
    return state;
  }

  async function open({ document, sourceBlob, pageNumber: requestedPage, sectionNumber = '', sectionTitle = '', articleReference = '', returnTarget = null, canvas: targetCanvas } = {}) {
    const exactPage = pageNumber(requestedPage);
    if (!isSpecificationDocument(document)) return { ok: false, status: 'invalid-document-role', diagnostics: diagnostics() };
    if (!exactPage || !sourceBlob || !targetCanvas?.getContext) return { ok: false, status: 'exact-source-page-required', diagnostics: diagnostics() };
    await close('replaced');
    const requestGeneration = generation;
    const openedProxy = await openPdf(sourceBlob);
    if (generation !== requestGeneration) { try { await openedProxy?.destroy?.(); } catch {} return { ok: false, status: 'superseded', diagnostics: diagnostics() }; }
    proxy = openedProxy;
    if (exactPage > Number(proxy?.numPages || 0)) { await close('page-unavailable'); return { ok: false, status: 'page-unavailable', diagnostics: diagnostics() }; }
    canvas = targetCanvas;
    target = { documentId: text(document.id), pageNumber: exactPage, sectionNumber: text(sectionNumber), sectionTitle: text(sectionTitle), articleReference: text(articleReference), returnTarget: returnTarget ? structuredClone(returnTarget) : null };
    const pageRender = await renderPage(proxy, exactPage, canvas, { scale: 1.25 });
    if (generation !== requestGeneration) { try { pageRender?.cancel?.(); pageRender?.release?.(); } catch {} return { ok: false, status: 'superseded', diagnostics: diagnostics() }; }
    render = pageRender;
    try {
      await render.promise;
      if (generation !== requestGeneration) return { ok: false, status: 'superseded', diagnostics: diagnostics() };
      render?.releasePage?.();
      render = null;
      const state = diagnostics(); onDiagnostic(state);
      return { ok: true, status: 'rendered', target: structuredClone(target), diagnostics: state };
    } catch (error) {
      if (generation === requestGeneration) await close('render-failed');
      return { ok: false, status: 'render-failed', error: error?.message || String(error), diagnostics: diagnostics() };
    }
  }

  return { open, close, diagnostics, target: () => target ? structuredClone(target) : null };
}

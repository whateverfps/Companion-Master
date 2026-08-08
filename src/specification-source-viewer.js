import { isSpecificationDocument } from './document-routing.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const pageNumber = value => Math.max(0, Math.trunc(Number(value) || 0));

const pdfCache = new Map();
const renderCache = new Map();

const cacheKey = ({ documentId = '', fingerprint = '' } = {}) => `${text(documentId)}::${text(fingerprint)}`;
const renderKey = ({ documentId = '', fingerprint = '', pageNumber: requestedPage = 0, scale = 1.25, rotation = 0 } = {}) => `${cacheKey({ documentId, fingerprint })}::${pageNumber(requestedPage)}::${Number(scale) || 0}::${Number(rotation) || 0}`;

function cloneCanvas(canvas) {
  if (!canvas?.width || !canvas?.height) return null;
  if (typeof globalThis.document?.createElement === 'function') {
    const snapshot = globalThis.document.createElement('canvas');
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext?.('2d')?.drawImage?.(canvas, 0, 0);
    return snapshot;
  }
  return { width: canvas.width, height: canvas.height };
}

export function createSpecificationSourceViewer({ openPdf, renderPage, now = () => new Date().toISOString(), onDiagnostic = () => {} } = {}) {
  if (typeof openPdf !== 'function' || typeof renderPage !== 'function') throw new Error('Specification source viewer requires PDF open and render functions.');
  let proxy = null;
  let render = null;
  let canvas = null;
  let target = null;
  let cleanupTimestamp = '';
  let generation = 0;
  let activeRequestKey = '';
  let viewerInstanceId = Math.random().toString(36).substring(2, 11);

  console.log('=== SPECIFICATION VIEWER LIFECYCLE ===');
  console.log('STEP 1: Viewer constructor called');
  console.log('  viewerInstanceId:', viewerInstanceId);

  const diagnostics = () => ({
    specificationPdfProxyActive: Boolean(proxy),
    specificationSourcePage: target?.pageNumber || null,
    sourceViewRenderTaskActive: Boolean(render),
    sourceViewCanvasPixels: canvas ? { width: Number(canvas.width) || 0, height: Number(canvas.height) || 0 } : { width: 0, height: 0 },
    sourceViewCacheEntryCount: 0,
    sourceViewCleanupTimestamp: cleanupTimestamp,
    retainedSpecificationPageRecordsInMemory: target ? 1 : 0,
    viewerInstanceId
  });

  async function close(reason = 'closed') {
    console.log('=== SPECIFICATION VIEWER CLOSE ===');
    console.log('  viewerInstanceId:', viewerInstanceId);
    console.log('  reason:', reason);
    console.log('  generation:', generation);
    console.log('  proxy:', Boolean(proxy));
    console.log('  render:', Boolean(render));
    console.log('  canvas:', Boolean(canvas));
    console.log('  target:', target ? JSON.stringify({ documentId: target.documentId, pageNumber: target.pageNumber }) : null);
    
    generation += 1;
    activeRequestKey = '';
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
    console.log('  Viewer destroyed');
    console.log('=== END CLOSE ===');
    return state;
  }

  async function replaceCurrentRequest() {
    console.log('=== SPECIFICATION VIEWER REPLACE REQUEST ===');
    console.log('  viewerInstanceId:', viewerInstanceId);
    console.log('  generation:', generation, '→', generation + 1);
    console.log('  previous target:', target ? JSON.stringify({ documentId: target.documentId, pageNumber: target.pageNumber }) : null);
    
    generation += 1;
    activeRequestKey = '';
    try { render?.cancel?.(); } catch {}
    try { render?.release?.(); } catch {}
    render = null;
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    canvas = null;
    target = null;
    
    console.log('  Request replaced');
    console.log('=== END REPLACE ===');
  }

  async function open({ document, sourceBlob, pageNumber: requestedPage, sectionNumber = '', sectionTitle = '', articleReference = '', returnTarget = null, canvas: targetCanvas } = {}) {
    console.log('=== SPECIFICATION VIEWER OPEN ===');
    console.log('  viewerInstanceId:', viewerInstanceId);
    console.log('  document.id:', document?.id);
    console.log('  requestedPage:', requestedPage);
    console.log('  sectionNumber:', sectionNumber);
    console.log('  targetCanvas:', Boolean(targetCanvas));
    console.log('  sourceBlob:', Boolean(sourceBlob));
    console.log('  sourceBlob.size:', sourceBlob?.size);
    console.log('  sourceBlob.type:', sourceBlob?.type);
    
    const exactPage = pageNumber(requestedPage);
    if (!isSpecificationDocument(document)) {
      console.log('  ERROR: Invalid document role');
      console.log('=== END OPEN ===');
      return { ok: false, status: 'invalid-document-role', diagnostics: diagnostics() };
    }
    if (!exactPage || !sourceBlob || !targetCanvas?.getContext) {
      console.log('  ERROR: Missing required parameters');
      console.log('    exactPage:', exactPage);
      console.log('    sourceBlob:', Boolean(sourceBlob));
      console.log('    targetCanvas:', Boolean(targetCanvas));
      console.log('    targetCanvas.getContext:', Boolean(targetCanvas?.getContext));
      console.log('=== END OPEN ===');
      return { ok: false, status: 'exact-source-page-required', diagnostics: diagnostics() };
    }
    
    console.log('STEP 2: Blob received');
    console.log('  Blob size:', sourceBlob.size);
    console.log('  Blob type:', sourceBlob.type);
    
    await replaceCurrentRequest();
    const requestGeneration = generation;
    const fingerprint = text(document.contentHash || document.version || document.revision || sourceBlob?.lastModified || sourceBlob?.size || '');
    const pdfKey = cacheKey({ documentId: document.id, fingerprint });
    let cachedProxy = pdfCache.get(pdfKey) || null;
    if (!cachedProxy) {
      console.log('STEP 3: Loading PDF.js document');
      console.log('  Loading from blob...');
      cachedProxy = await openPdf(sourceBlob);
      console.log('  PDF loaded');
      console.log('  Total pages:', cachedProxy?.numPages);
      pdfCache.set(pdfKey, cachedProxy);
    } else {
      console.log('STEP 3: Using cached PDF.js document');
      console.log('  Total pages:', cachedProxy?.numPages);
    }
    
    if (generation !== requestGeneration) { 
      console.log('  ERROR: Superseded by another request');
      console.log('=== END OPEN ===');
      return { ok: false, status: 'superseded', diagnostics: diagnostics() }; 
    }
    
    proxy = cachedProxy;
    console.log('STEP 4: Viewer initialized');
    console.log('  proxy:', Boolean(proxy));
    console.log('  proxy.numPages:', proxy?.numPages);
    
    if (exactPage > Number(proxy?.numPages || 0)) { 
      console.log('  ERROR: Page exceeds total pages');
      console.log('  requested:', exactPage);
      console.log('  total:', proxy?.numPages);
      await close('page-unavailable'); 
      console.log('=== END OPEN ===');
      return { ok: false, status: 'page-unavailable', diagnostics: diagnostics() }; 
    }
    
    canvas = targetCanvas;
    target = { documentId: text(document.id), pageNumber: exactPage, sectionNumber: text(sectionNumber), sectionTitle: text(sectionTitle), articleReference: text(articleReference), returnTarget: returnTarget ? structuredClone(returnTarget) : null };
    
    console.log('STEP 5: Requested page');
    console.log('  pageNumber:', exactPage);
    console.log('  target:', JSON.stringify({ documentId: target.documentId, pageNumber: target.pageNumber }));
    
    activeRequestKey = renderKey({ documentId: document.id, fingerprint, pageNumber: exactPage, scale: 1.25, rotation: 0 });
    const cachedRender = renderCache.get(activeRequestKey) || null;
    if (cachedRender?.snapshot) {
      console.log('STEP 6: Using cached render');
      canvas.width = cachedRender.width;
      canvas.height = cachedRender.height;
      canvas.getContext('2d')?.drawImage?.(cachedRender.snapshot, 0, 0);
      const state = diagnostics();
      onDiagnostic({ ...state, operation: 'render-cache-hit', durationMs: 0, cacheKey: activeRequestKey });
      console.log('STEP 7: Current page after render');
      console.log('  pageNumber:', exactPage);
      console.log('  canvas.width:', canvas.width);
      console.log('  canvas.height:', canvas.height);
      console.log('=== END OPEN ===');
      return { ok: true, status: 'rendered', target: structuredClone(target), diagnostics: state, cacheHit: true };
    }
    
    console.log('STEP 6: Rendering page');
    console.log('  Calling renderPage()...');
    const pageRender = await renderPage(proxy, exactPage, canvas, { scale: 1.25 });
    console.log('  renderPage() returned');
    console.log('  render:', Boolean(pageRender));
    
    if (generation !== requestGeneration) { 
      console.log('  ERROR: Superseded during render');
      try { pageRender?.cancel?.(); pageRender?.release?.(); } catch {} 
      console.log('=== END OPEN ===');
      return { ok: false, status: 'superseded', diagnostics: diagnostics() }; 
    }
    
    render = pageRender;
    try {
      console.log('STEP 7: Waiting for render promise');
      await render.promise;
      console.log('  Render promise resolved');
      
      if (generation !== requestGeneration) {
        console.log('  ERROR: Superseded after render');
        console.log('=== END OPEN ===');
        return { ok: false, status: 'superseded', diagnostics: diagnostics() };
      }
      
      render?.releasePage?.();
      renderCache.set(activeRequestKey, { width: canvas.width, height: canvas.height, snapshot: cloneCanvas(canvas), sourceDocumentId: target.documentId, pageNumber: exactPage });
      render = null;
      
      console.log('STEP 8: Render complete');
      console.log('  canvas.width:', canvas.width);
      console.log('  canvas.height:', canvas.height);
      console.log('  pageNumber:', exactPage);
      
      // Log viewer state 500ms later
      setTimeout(() => {
        console.log('=== SPECIFICATION VIEWER STATE CHECK (500ms) ===');
        console.log('  viewerInstanceId:', viewerInstanceId);
        console.log('  generation:', generation);
        console.log('  requestGeneration:', requestGeneration);
        console.log('  proxy:', Boolean(proxy));
        console.log('  canvas:', Boolean(canvas));
        console.log('  target:', target ? JSON.stringify({ documentId: target.documentId, pageNumber: target.pageNumber }) : null);
        console.log('  canvas.width:', canvas?.width);
        console.log('  canvas.height:', canvas?.height);
        console.log('  canvas.parentElement:', canvas?.parentElement?.tagName);
        console.log('  canvas.hidden:', canvas?.hidden);
        console.log('  canvas.style.display:', canvas?.style?.display);
        console.log('=== END STATE CHECK ===');
      }, 500);
      
      const state = diagnostics(); 
      onDiagnostic(state);
      console.log('STEP 9: Viewer visible?');
      console.log('  canvas.parentElement:', canvas?.parentElement?.tagName);
      console.log('  canvas.hidden:', canvas?.hidden);
      console.log('=== END OPEN ===');
      return { ok: true, status: 'rendered', target: structuredClone(target), diagnostics: state };
    } catch (error) {
      console.log('  ERROR: Render failed');
      console.log('  error:', error);
      if (generation === requestGeneration) await close('render-failed');
      console.log('=== END OPEN ===');
      return { ok: false, status: 'render-failed', error: error?.message || String(error), diagnostics: diagnostics() };
    }
  }

  return { open, close, diagnostics, target: () => target ? structuredClone(target) : null };
}

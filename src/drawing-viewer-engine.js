const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || minimum));
const key = (documentId, pageNumber) => `${String(documentId || '')}:${Number(pageNumber) || 0}`;

export function createDrawingViewerEngine({ viewportStore = new Map(), minZoom = .35, maxZoom = 3 } = {}) {
  let documentId = '';
  let pageCount = 0;
  let selectedPage = 0;
  let renderGeneration = 0;
  let activeRender = null;

  const api = {
    openDocument(nextDocumentId, nextPageCount, requestedPage = 1) {
      const changed = documentId !== String(nextDocumentId || '');
      if (changed) api.cancelRender();
      documentId = String(nextDocumentId || '');
      pageCount = Math.max(0, Math.trunc(Number(nextPageCount) || 0));
      selectedPage = pageCount ? clamp(Math.trunc(Number(requestedPage) || 1), 1, pageCount) : 0;
      return api.snapshot();
    },
    getPageCount: () => pageCount,
    selectPage(pageNumber) {
      if (!pageCount) return 0;
      selectedPage = clamp(Math.trunc(Number(pageNumber) || selectedPage || 1), 1, pageCount);
      return selectedPage;
    },
    nextPage: () => api.selectPage(selectedPage + 1),
    previousPage: () => api.selectPage(selectedPage - 1),
    beginRender(pageNumber = selectedPage) {
      api.selectPage(pageNumber);
      api.cancelRender();
      renderGeneration += 1;
      return { generation: renderGeneration, documentId, pageNumber: selectedPage };
    },
    attachRender(token, task) {
      if (token?.generation !== renderGeneration) { task?.cancel?.(); return false; }
      activeRender = task || null;
      return true;
    },
    async renderSelectedPage(startRender) {
      const token = api.beginRender(selectedPage);
      const task = await startRender(selectedPage, token);
      if (!api.attachRender(token, task)) return { committed: false, cancelled: true, token, task };
      try {
        await task.promise;
      } catch (error) {
        if (!api.canCommit(token)) return { committed: false, cancelled: true, token, task };
        throw error;
      }
      return { committed: api.canCommit(token), cancelled: !api.canCommit(token), token, task };
    },
    canCommit(token, canvasConnected = true) {
      return Boolean(canvasConnected) && token?.generation === renderGeneration && token?.documentId === documentId && token?.pageNumber === selectedPage;
    },
    cancelRender() {
      activeRender?.cancel?.();
      activeRender?.release?.();
      activeRender = null;
    },
    getViewport(pageNumber = selectedPage) {
      return structuredClone(viewportStore.get(key(documentId, pageNumber)) || { mode: 'fit-page', zoom: null, rotation: 0, scrollLeft: 0, scrollTop: 0 });
    },
    restoreViewport(pageNumber, viewport = {}) {
      const restored = { mode: 'fit-page', zoom: null, rotation: 0, scrollLeft: 0, scrollTop: 0, ...structuredClone(viewport) };
      viewportStore.set(key(documentId, pageNumber), restored);
      return structuredClone(restored);
    },
    setZoom(zoom, pageNumber = selectedPage) {
      const viewport = api.getViewport(pageNumber);
      return api.restoreViewport(pageNumber, { ...viewport, mode: 'custom', zoom: clamp(zoom, minZoom, maxZoom) });
    },
    zoomAtPoint({ deltaY = 0, pointerX = 0, pointerY = 0, pageNumber = selectedPage, sensitivity = .002 } = {}) {
      const viewport = api.getViewport(pageNumber);
      const currentZoom = clamp(viewport.zoom || 1, minZoom, maxZoom);
      const zoom = clamp(currentZoom * Math.exp(-(Number(deltaY) || 0) * sensitivity), minZoom, maxZoom);
      const drawingX = ((Number(viewport.scrollLeft) || 0) + Number(pointerX || 0)) / currentZoom;
      const drawingY = ((Number(viewport.scrollTop) || 0) + Number(pointerY || 0)) / currentZoom;
      return api.restoreViewport(pageNumber, { ...viewport, mode: 'custom', zoom, scrollLeft: Math.max(0, drawingX * zoom - Number(pointerX || 0)), scrollTop: Math.max(0, drawingY * zoom - Number(pointerY || 0)) });
    },
    fitPage: (pageNumber = selectedPage) => api.restoreViewport(pageNumber, { ...api.getViewport(pageNumber), mode: 'fit-page', zoom: null, scrollLeft: 0, scrollTop: 0 }),
    fitWidth: (pageNumber = selectedPage) => api.restoreViewport(pageNumber, { ...api.getViewport(pageNumber), mode: 'fit-width', zoom: null, scrollLeft: 0, scrollTop: 0 }),
    rotate(pageNumber = selectedPage) { const viewport = api.getViewport(pageNumber); return api.restoreViewport(pageNumber, { ...viewport, rotation: ((Number(viewport.rotation) || 0) + 90) % 360 }); },
    resetView: (pageNumber = selectedPage) => api.restoreViewport(pageNumber, { mode: 'fit-page', zoom: null, rotation: 0, scrollLeft: 0, scrollTop: 0 }),
    snapshot: () => ({ documentId, pageCount, selectedPage, renderGeneration })
  };
  return api;
}

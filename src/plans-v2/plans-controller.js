import { createPlansStore } from './plans-store.js';
import { createPlansPdfViewer } from './pdf-viewer.js';
import { createPlansSheetInspector } from './sheet-inspector.js';
import { renderPlansView, renderPlansSheetCard } from './plans-view.js';

const clone = value => {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value ?? null)); }
};

const sheetIdentity = sheet => `${String(sheet?.sheetId || '')}:${String(sheet?.pageNumber || '')}`;

export function createPlansController({
  root,
  specificationIndex,
  requirementsResolver,
  buildPanelModel,
  panelMarkup,
  initialAnalysis = null,
  initialSheetId = '',
  sourceResolver = async () => null,
  onViewSource = () => {},
  createPdfViewer = createPlansPdfViewer,
  createInspector = createPlansSheetInspector,
  renderView = renderPlansView
} = {}) {
  const store = createPlansStore({
    projectId: initialAnalysis?.projectId || '',
    drawingSetId: initialAnalysis?.drawingSetId || '',
    sheets: []
  });
  const view = renderView(root, { title: 'Plans', sheets: [] });
  const statusNode = () => view.querySelector('[data-plans-status]');
  const sheetListNode = () => view.querySelector('[data-plans-sheet-list]');
  const stageNode = () => view.querySelector('[data-plans-stage]');
  const inspectorNode = () => view.querySelector('[data-plans-inspector]');
  const layoutNode = () => view.querySelector('.mc-drawing-layout');
  const headerNode = () => view.querySelector('[data-plans-sheet-header]');
  const sheetNumberNode = () => view.querySelector('[data-plans-sheet-number]');
  const sheetTitleNode = () => view.querySelector('[data-plans-sheet-title]');
  const sheetSubtitleNode = () => view.querySelector('[data-plans-sheet-subtitle]');
  const sheetDisciplineNode = () => view.querySelector('[data-plans-sheet-discipline]');
  const sheetTypeNode = () => view.querySelector('[data-plans-sheet-type]');
  const sheetPositionNode = () => view.querySelector('[data-plans-sheet-position]');
  const sheetIdentityNode = () => view.querySelector('[data-plans-sheet-identity]');
  const toolbarStatusNode = () => view.querySelector('[data-plans-toolbar-status]');
  const drawingSetNode = () => view.querySelector('[data-plans-drawing-set]');
  const sheetSummaryNode = () => view.querySelector('[data-plans-sheet-summary]');
  let pdfViewer = createPdfViewer({ root: stageNode(), sourceLoader: sourceResolver });
  let inspector = createInspector({ root: inspectorNode(), requirementsResolver, specificationIndex, buildPanelModel, panelMarkup, onViewSource });
  let activeGeneration = 0;
  let currentAnalysis = initialAnalysis || null;
  let currentSource = null;
  let currentZoom = 1;
  let initialized = false;
  let destroyed = false;

  const setStatus = (text, state = 'loading') => {
    const node = statusNode();
    if (!node) return;
    node.dataset.state = state;
    node.textContent = text;
  };

  const normalizeSheet = sheet => {
    if (!sheet) return null;
    const analysisSheet = currentAnalysis?.sheets?.find(item => item.sheetId === sheet.sheetId || Number(item.pageNumber) === Number(sheet.pageNumber) || item.pageId === sheet.pageId) || null;
    return {
      projectId: sheet.projectId || analysisSheet?.projectId || currentAnalysis?.projectId || store.getState().projectId || '',
      drawingSetId: sheet.drawingSetId || analysisSheet?.drawingSetId || currentAnalysis?.drawingSetId || store.getState().drawingSetId || '',
      documentId: sheet.documentId || analysisSheet?.documentId || currentAnalysis?.documentId || '',
      drawingId: sheet.drawingId || analysisSheet?.drawingId || '',
      sheetId: sheet.sheetId || '',
      sheetNumber: sheet.sheetNumber || analysisSheet?.sheetNumber || '',
      sheetTitle: sheet.sheetTitle || analysisSheet?.sheetTitle || '',
      discipline: sheet.discipline || analysisSheet?.discipline || '',
      drawingType: sheet.drawingType || sheet.primarySheetType || analysisSheet?.drawingType || analysisSheet?.primarySheetType || '',
      pageId: sheet.pageId || analysisSheet?.pageId || `page-${sheet.pageNumber || ''}`,
      pageNumber: Number(sheet.pageNumber) || 0,
      pdfPage: Number(sheet.pdfPage || sheet.pageNumber || analysisSheet?.pdfPage || analysisSheet?.pageNumber) || 0,
      sourceBlob: sheet.sourceBlob || currentAnalysis?.sourceBlob || null,
      specificationLinks: Array.isArray(sheet.specificationLinks) ? clone(sheet.specificationLinks) : [],
      unresolvedEvidence: Array.isArray(sheet.unresolvedEvidence) ? clone(sheet.unresolvedEvidence) : [],
      rotation: Number(sheet.rotation) || 0
    };
  };

  const renderSheetList = sheets => {
    const list = sheetListNode();
    if (!list) return;
    if (!sheets.length) {
      list.innerHTML = '<li class="mc-plans-v2-empty"><strong>No drawings available</strong></li>';
      return;
    }
    list.innerHTML = sheets.map(sheet => renderPlansSheetCard(sheet, { active: false })).join('');
  };

  const updateHeader = snapshot => {
    const title = view.querySelector('#plansV2Title');
    if (title) title.textContent = 'Plans';
    const sheetNumber = snapshot.sheetNumber || '';
    if (sheetNumberNode()) sheetNumberNode().textContent = sheetNumber;
    if (sheetTitleNode()) sheetTitleNode().textContent = snapshot.sheetTitle || '';
    if (sheetSubtitleNode()) sheetSubtitleNode().textContent = snapshot.sheetTitle ? `Sheet ${sheetNumber}` : 'Waiting for metadata';
    if (sheetDisciplineNode()) sheetDisciplineNode().textContent = snapshot.discipline || '';
    if (sheetTypeNode()) sheetTypeNode().textContent = snapshot.drawingType || snapshot.primarySheetType || '';
    if (sheetPositionNode()) sheetPositionNode().textContent = snapshot.pdfPage || snapshot.pageNumber ? `PDF page ${snapshot.pdfPage || snapshot.pageNumber || ''}` : '';
    if (sheetIdentityNode()) sheetIdentityNode().textContent = snapshot.sheetId ? `Sheet ${snapshot.sheetId}` : 'Pending';
    if (drawingSetNode()) drawingSetNode().textContent = snapshot.drawingSetId || currentAnalysis?.drawingSetId || '';
    if (sheetSummaryNode()) sheetSummaryNode().textContent = `${snapshot.sheetNumber || ''}${snapshot.sheetTitle ? ` · ${snapshot.sheetTitle}` : ''}`;
    if (toolbarStatusNode()) toolbarStatusNode().textContent = snapshot.sheetNumber ? `Sheet ${snapshot.sheetNumber} · ${snapshot.pdfPage || snapshot.pageNumber || ''}` : `PDF page ${snapshot.pdfPage || snapshot.pageNumber || ''}`;
  };

  const updateSelection = snapshot => {
    for (const button of view.querySelectorAll('[data-plans-sheet]')) {
      const active = button.dataset.plansSheet === snapshot.sheetId;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  };

  async function selectSheet(sheet) {
    if (!sheet || destroyed) return { committed: false };
    const snapshot = clone(sheet);
    const generation = ++activeGeneration;
    store.setCurrentSheet(snapshot);
    updateHeader(snapshot);
    updateSelection(snapshot);
    inspector.renderLoading({ sheet: snapshot });
    const renderOutcome = await pdfViewer.setSheet(snapshot);
    if (!renderOutcome?.committed || generation !== activeGeneration) return renderOutcome || { committed: false, cancelled: true };
    currentSource = renderOutcome.source || currentSource;
    currentZoom = 1;
    const requirementInput = {
      projectId: snapshot.projectId || currentAnalysis?.projectId || '',
      pageEntityId: `drawing-page:${snapshot.pageId || ''}`,
      selectedObjectId: '',
      selectedObjectEntityId: '',
      selectedRoomEntityId: '',
      viewportContext: null,
      tradeChannel: null,
      drawingSpecLinks: snapshot.specificationLinks || [],
      projectWideRequirements: []
    };
    const requirements = await requirementsResolver.resolveLatest(requirementInput);
    if (!requirements?.committed || generation !== activeGeneration) return { committed: false, cancelled: true };
    const panelModel = inspector.renderHydrated({
      sheet: snapshot,
      requirements: requirements.result || {},
      specificationLinks: snapshot.specificationLinks || [],
      unresolvedEvidence: snapshot.unresolvedEvidence || []
    });
    store.setRequirements('complete', requirements.result || {});
    return { committed: true, panelModel, source: currentSource };
  }

  const refreshButtonBindings = () => {
    view.addEventListener('click', event => {
      const button = event.target.closest('[data-plans-sheet]');
      if (button) {
        const sheet = store.getState().sheets.find(item => item.sheetId === button.dataset.plansSheet);
        void selectSheet(sheet);
        return;
      }
      const action = event.target.closest('[data-plans-action]');
      if (!action) return;
      const state = store.getState();
      const sheets = state.sheets;
      const currentIndex = sheets.findIndex(item => item.sheetId === state.currentSheet?.sheetId);
      switch (action.dataset.plansAction) {
        case 'previous':
          if (currentIndex > 0) void selectSheet(sheets[currentIndex - 1]);
          break;
        case 'next':
          if (currentIndex >= 0 && currentIndex < sheets.length - 1) void selectSheet(sheets[currentIndex + 1]);
          break;
        case 'fit-page':
          pdfViewer.fitPage();
          break;
        case 'fit-width':
          pdfViewer.fitWidth();
          break;
        case 'zoom-out':
          currentZoom = pdfViewer.zoom(Math.max(.35, currentZoom - .1));
          break;
        case 'zoom-in':
          currentZoom = pdfViewer.zoom(Math.min(2, currentZoom + .1));
          break;
        case 'rotate':
          pdfViewer.rotate();
          break;
        case 'reset-view':
          currentZoom = pdfViewer.zoom(1);
          pdfViewer.pan(0, 0);
          break;
        case 'toggle-finder':
        case 'toggle-expand':
          layoutNode()?.classList.toggle(action.dataset.plansAction === 'toggle-finder' ? 'finder-hidden' : 'drawing-expanded');
          break;
      }
    });
  };

  refreshButtonBindings();

  async function initialize({ project = null, analysis = null, drawingSet = null, sheets = [] } = {}) {
    if (destroyed) throw new Error('Plans controller has been destroyed.');
    try {
      setStatus('Loading drawing set…', 'loading');
      currentAnalysis = analysis || currentAnalysis || null;
      const normalizedSheets = Array.isArray(sheets) ? sheets.map(normalizeSheet).filter(sheet => sheet?.sheetId && sheet.documentId && Number(sheet.pageNumber) > 0) : [];
      if (project?.id || analysis?.projectId || drawingSet?.drawingSetId) {
        store.setState({
          projectId: project?.id || analysis?.projectId || drawingSet?.projectId || store.getState().projectId,
          drawingSetId: drawingSet?.drawingSetId || analysis?.drawingSetId || store.getState().drawingSetId
        });
      }
      store.setSheets(normalizedSheets);
      renderSheetList(normalizedSheets);
      if (!normalizedSheets.length) {
        setStatus('No drawings available', 'empty');
        inspector.renderLoading({ sheet: null });
        initialized = true;
        return { committed: false, empty: true };
      }
      const currentSheetId = initialSheetId || drawingSet?.currentSheetId || '';
      const selectedSheet = normalizedSheets.find(item => item.sheetId === currentSheetId) || normalizedSheets[0];
      setStatus('ready view', 'ready');
      const result = await selectSheet(selectedSheet);
      initialized = true;
      return { committed: Boolean(result?.committed), sheetId: selectedSheet.sheetId };
    } catch (error) {
      setStatus(`Failed to load drawings: ${error?.message || String(error)}`, 'failed');
      inspector.renderLoading({ sheet: null });
      initialized = true;
      return { committed: false, error };
    }
  }

  return {
    root: view,
    store,
    pdfViewer,
    inspector,
    initialize,
    selectSheet,
    get initialized() { return initialized; },
    destroy() {
      destroyed = true;
      pdfViewer.destroy();
    }
  };
}

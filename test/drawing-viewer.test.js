import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateDrawingFit, createDrawingRenderIdentity, createPdfPageViewerAnalysis, defaultDrawingViewport, drawingRenderDecision, drawingRenderRequestIsCurrent, drawingWheelZoom, sameDrawingRenderIdentity, drawingWorkspaceLayout, restoreDrawingViewport, saveDrawingViewport } from '../src/drawing-navigation.js';
import { searchDrawingSheets } from '../src/plan-query.js';

test('true Fit Page waits for size and accounts for rotation', () => {
  assert.equal(calculateDrawingFit({ containerWidth: 0, containerHeight: 500, pageWidth: 1000, pageHeight: 700 }).ready, false);
  const normal = calculateDrawingFit({ containerWidth: 1000, containerHeight: 800, pageWidth: 1000, pageHeight: 500, padding: 20 });
  assert.equal(normal.ready, true);
  assert.equal(normal.scale, .96);
  const rotated = calculateDrawingFit({ containerWidth: 1000, containerHeight: 800, pageWidth: 1000, pageHeight: 500, rotation: 90, padding: 20 });
  assert.ok(rotated.scale < normal.scale);
});

test('per-sheet viewport restores custom zoom, scroll, selection, and overlays', () => {
  let viewports = {};
  viewports = saveDrawingViewport(viewports, 'set', 'sheet', { mode: 'custom', zoom: 1.4, scrollLeft: 22, scrollTop: 44, selectedObservationId: 'o1', overlays: { candidates: false } });
  const restored = restoreDrawingViewport(viewports, 'set', 'sheet');
  assert.equal(restored.zoom, 1.4);
  assert.equal(restored.scrollTop, 44);
  assert.equal(restored.overlays.candidates, false);
  assert.equal(restoreDrawingViewport(viewports, 'set', 'new').mode, 'fit-page');
  assert.equal(defaultDrawingViewport().zoom, null);
});

test('trackpad pinch and modified wheel zoom within the existing scale bounds', () => {
  const zoomIn = drawingWheelZoom({ ctrlKey: true, deltaY: -80, zoom: 1 });
  const zoomOut = drawingWheelZoom({ metaKey: true, deltaY: 80, zoom: 1 });
  assert.equal(zoomIn.recognized, true);
  assert.ok(zoomIn.zoom > 1);
  assert.ok(zoomOut.zoom < 1);
  assert.equal(drawingWheelZoom({ ctrlKey: true, deltaY: -100000, zoom: 1 }).zoom, 3);
  assert.equal(drawingWheelZoom({ ctrlKey: true, deltaY: 100000, zoom: 1 }).zoom, .35);
});

test('drawing gesture zoom keeps the same drawing point under the cursor', () => {
  const input = { ctrlKey: true, deltaY: -60, zoom: 1.2, scrollLeft: 240, scrollTop: 180, pointerX: 320, pointerY: 210 };
  const next = drawingWheelZoom(input);
  assert.ok(Math.abs((input.scrollLeft + input.pointerX) / input.zoom - (next.scrollLeft + input.pointerX) / next.zoom) < 1e-9);
  assert.ok(Math.abs((input.scrollTop + input.pointerY) / input.zoom - (next.scrollTop + input.pointerY) / next.zoom) < 1e-9);
});

test('ordinary wheel scrolling is not intercepted by drawing zoom', () => {
  const result = drawingWheelZoom({ deltaY: 80, zoom: 1.4, scrollLeft: 22, scrollTop: 44 });
  assert.deepEqual(result, { recognized: false, preventDefault: false, zoom: 1.4, scrollLeft: 22, scrollTop: 44 });
});

test('drawing stage gesture handling reuses the existing zoom controls and viewport map', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /stage\.onwheel = event =>/);
  assert.match(app, /if \(!next\.recognized\) return;\s*event\.preventDefault\(\)/);
  assert.match(app, /captureDrawingViewport\(\{ mode: 'custom', zoom: next\.zoom, scrollLeft: next\.scrollLeft, scrollTop: next\.scrollTop \}\)/);
  assert.match(app, /button\.dataset\.drawingZoom/);
  assert.equal((app.match(/const drawingViewportBySet = new Map\(\);/g) || []).length, 1);
});

test('drawing workspace expands and restores both rails without viewport mutation', () => {
  assert.deepEqual(drawingWorkspaceLayout({}, 'expand'), { finderHidden: true, evidenceHidden: true, expanded: true });
  assert.deepEqual(drawingWorkspaceLayout({ finderHidden: true, evidenceHidden: true, expanded: true }, 'restore'), { finderHidden: false, evidenceHidden: false, expanded: false });
});

test('render identity repaints only for actual drawing inputs', () => {
  const identity = createDrawingRenderIdentity({ documentId: 'd1', drawingSetId: 'set', pageNumber: 2, scale: 1.234567, rotation: 0, sourceAvailable: true });
  const canvas = { isConnected: true, dataset: { drawingDocument: 'd1', drawingSet: 'set', drawingPage: '2' } };
  assert.equal(identity.scale, 1.2346);
  assert.equal(sameDrawingRenderIdentity(identity, { ...identity }), true);
  assert.deepEqual(drawingRenderDecision({ previousIdentity: identity, nextIdentity: { ...identity }, canvas }), { repaint: false, reason: 'unchanged-render-inputs' });
  for (const change of [{ pageNumber: 3 }, { scale: 1.4 }, { rotation: 90 }, { documentId: 'd2' }, { drawingSetId: 'set2' }]) {
    assert.equal(drawingRenderDecision({ previousIdentity: identity, nextIdentity: { ...identity, ...change }, canvas }).repaint, true);
  }
});

test('observation, verification, overlays, and rail state are outside render identity', () => {
  const base = createDrawingRenderIdentity({ documentId: 'd1', drawingSetId: 'set', pageNumber: 1, scale: .8, rotation: 0 });
  const canvas = { isConnected: true, dataset: { drawingDocument: 'd1', drawingSet: 'set', drawingPage: '1' } };
  const UI_ONLY = ['observation', 'verification', 'overlays', 'sidebar', 'chief-target'];
  for (const reason of UI_ONLY) assert.equal(drawingRenderDecision({ previousIdentity: base, nextIdentity: { ...base }, canvas }).reason, 'unchanged-render-inputs', reason);
  assert.equal(drawingRenderDecision({ previousIdentity: base, nextIdentity: { ...base }, canvas, fittedScaleChanged: true }).reason, 'fitted-scale-changed');
  assert.equal(drawingRenderDecision({ previousIdentity: base, nextIdentity: { ...base }, canvas: { ...canvas, isConnected: false } }).reason, 'canvas-unavailable');
});

test('main and Professional drawing views share state and switching does not reset it', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.equal((app.match(/let drawingTarget = null;/g) || []).length, 1);
  assert.equal((app.match(/const drawingViewportBySet = new Map\(\);/g) || []).length, 1);
  assert.equal((app.match(/let drawingMatchingSheetIds = \[\];/g) || []).length, 1);
  assert.match(app, /renderDrawingWorkspace\('mission-control'\)/);
  assert.match(app, /renderDrawingWorkspace\('professional'\)/);
  const routeStart = app.indexOf('function show(name)');
  const route = app.slice(routeStart, routeStart + 5000);
  assert.match(route, /if \(name === 'drawings'\) void renderDrawingWorkspace\('professional'\)/);
  assert.doesNotMatch(route, /drawingTarget\s*=\s*null|drawingViewportBySet\.clear|drawingMatchingSheetIds\s*=\s*\[\]/);
});

test('retained PDF fallback enumerates pages without fabricating drawing identities', () => {
  const fallback = createPdfPageViewerAnalysis({ documentId: 'pdf-1', projectId: 'general', pageCount: 70, selectedPage: 2, pageWidth: 1000, pageHeight: 700 });
  assert.equal(fallback.viewerFallback, true);
  assert.equal(fallback.sheets.length, 70);
  assert.equal(fallback.sheets[0].sheetTitle, '');
  assert.equal(fallback.sheets[1].pageWidth, 1000);
  assert.equal(fallback.sheets.every(sheet => sheet.sheetNumber === '' && sheet.drawingId === ''), true);
  assert.deepEqual(fallback.drawingRegistry, []);
});

test('retained PDF fallback merges authoritative and partial page metadata without hiding unknown pages', () => {
  const fallback = createPdfPageViewerAnalysis({
    documentId: 'pdf-1', projectId: 'general', pageCount: 4, selectedPage: 1,
    metadataAnalysis: {
      drawingSetId: 'set-1',
      drawingRegistry: [{ drawingId: 'drawing-a', sheetId: 'sheet-a', pageNumber: 2, sheetNumber: '61A-001', sheetTitle: 'ARCHITECTURAL SYMBOLS & GENERAL NOTES', discipline: 'Architectural', primarySheetType: 'General Notes' }],
      sheets: [
        { sheetId: 'partial-2', pageNumber: 2, sheetNumber: '61 A001', sheetTitle: 'Partial title', discipline: 'Unknown', sheetTypes: ['Unknown'] },
        { sheetId: 'partial-3', pageNumber: 3, sheetNumber: '61M-101', sheetTitle: 'MECHANICAL PLAN - FIRST LEVEL - OVERALL', discipline: 'Mechanical', primarySheetType: 'Plan', sheetTypes: ['Plan'] },
        { sheetId: 'false-4', pageNumber: 4, sheetNumber: 'FX500', sheetTitle: '', discipline: 'Unknown', sheetTypes: ['Unknown'] }
      ], observations: []
    }
  });
  assert.equal(fallback.sheets.length, 4);
  assert.equal(fallback.sheets[1].sheetNumber, '61A-001');
  assert.equal(fallback.sheets[1].sheetTitle, 'ARCHITECTURAL SYMBOLS & GENERAL NOTES');
  assert.equal(fallback.sheets[1].discipline, 'Architectural');
  assert.equal(fallback.sheets[1].primarySheetType, 'General Notes');
  assert.equal(fallback.sheets[2].sheetNumber, '61M-101');
  assert.equal(fallback.sheets[3].sheetNumber, '');
  assert.equal(fallback.sheets[0].metadataAvailable, false);
});

test('mixed fallback metadata supports discipline, type, sheet, and page search', () => {
  const analysis = createPdfPageViewerAnalysis({ documentId: 'pdf-1', projectId: 'general', pageCount: 3, metadataAnalysis: {
    sheets: [{ sheetId: 'm101', pageNumber: 2, sheetNumber: '61M-101', sheetTitle: 'Mechanical Plan', discipline: 'Mechanical', primarySheetType: 'Plan', sheetTypes: ['Plan'] }]
  } });
  assert.deepEqual(searchDrawingSheets({ analysis, discipline: 'Mechanical' }).map(item => item.pageNumber), [2]);
  assert.deepEqual(searchDrawingSheets({ analysis, sheetType: 'Plan' }).map(item => item.pageNumber), [2]);
  assert.deepEqual(searchDrawingSheets({ analysis, query: '61M-101' }).map(item => item.pageNumber), [2]);
  assert.deepEqual(searchDrawingSheets({ analysis, query: 'Page 3' }).map(item => item.pageNumber), [3]);
  assert.equal(new Set(analysis.sheets.map(sheet => sheet.discipline)).has('Unknown'), true);
  assert.equal(new Set(analysis.sheets.flatMap(sheet => sheet.sheetTypes)).has('Unknown'), true);
});

test('rapid page selections allow only the newest PDF render to commit', () => {
  assert.equal(drawingRenderRequestIsCurrent({ requestId: 1, activeRequestId: 3, requestedPage: 1, activePage: 10 }), false);
  assert.equal(drawingRenderRequestIsCurrent({ requestId: 2, activeRequestId: 3, requestedPage: 2, activePage: 10 }), false);
  assert.equal(drawingRenderRequestIsCurrent({ requestId: 3, activeRequestId: 3, requestedPage: 10, activePage: 10 }), true);
});

test('drawing workspace uses retained PDF pages when analysis is missing or stale', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /const announcementText = sheet \? drawingAnnouncementText/);
  assert.match(app, /createRetainedPdfViewerAnalysis\(selected, source/);
  assert.match(app, /activeDrawingViewerAnalysis/);
  assert.match(app, /analysis\?\.viewerFallback \? analysis\.sheets\.map/);
  assert.match(app, /metadataAnalysis: persistedAnalysis|persistedAnalysis\)/);
  assert.match(app, /if \(!sheet\) return/);
  assert.match(app, /drawingViewerEngine\.renderSelectedPage/);
  assert.match(app, /const analysis = activeDrawingViewerAnalysis\?\.documentId === drawingTarget\?\.documentId \? activeDrawingViewerAnalysis : persistedAnalysis/);
  assert.match(app, /Manual PDF page viewing remains available/);
  assert.doesNotMatch(app, /<strong>No drawing selected\.<\/strong>/);
  assert.doesNotMatch(app, /sheetNumber:\s*['"](?:UNRESOLVED|UNKNOWN)/);
});

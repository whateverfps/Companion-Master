import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDrawingFit, createDrawingRenderIdentity, defaultDrawingViewport, drawingRenderDecision, sameDrawingRenderIdentity, drawingWorkspaceLayout, restoreDrawingViewport, saveDrawingViewport } from '../src/drawing-navigation.js';

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

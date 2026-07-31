import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDrawingFit, defaultDrawingViewport, drawingWorkspaceLayout, restoreDrawingViewport, saveDrawingViewport } from '../src/drawing-navigation.js';

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

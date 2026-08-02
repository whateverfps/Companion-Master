import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawingOverlay, overlayStyle, transformOverlayRegion, visibleDrawingOverlays } from '../src/drawing-overlays.js';

const overlay = { overlayId: 'o1', projectId: 'p', documentId: 'd', pageId: 'page-1', type: 'rooms', region: { x: .1, y: .2, width: .3, height: .1 }, label: 'Room 127B' };
test('overlay contract requires page ownership and normalized geometry', () => {
  assert.ok(createDrawingOverlay(overlay));
  assert.equal(createDrawingOverlay({ ...overlay, pageId: '' }), null);
  assert.equal(visibleDrawingOverlays([overlay], { projectId: 'p', documentId: 'd', pageId: 'page-2' }).length, 0);
});
test('visibility and rotation alignment are independent of PDF rendering', () => {
  assert.equal(visibleDrawingOverlays([overlay], { projectId: 'p', documentId: 'd', pageId: 'page-1', visibility: { rooms: false } }).length, 0);
  const rotated = transformOverlayRegion(overlay.region, 90);
  assert.ok(Math.abs(rotated.x - .7) < Number.EPSILON * 2);
  assert.deepEqual({ y: rotated.y, width: rotated.width, height: rotated.height }, { y: .1, width: .1, height: .3 });
  assert.equal(overlayStyle({ region: overlay.region }).left, '10%');
});

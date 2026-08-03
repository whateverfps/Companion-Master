import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDrawingSafeMode } from '../src/drawing-safe-mode.js';
import { readFileSync } from 'node:fs';

test('drawing safe mode is enabled on GitHub Pages, disabled on localhost, and can be forced by query', () => {
  assert.equal(resolveDrawingSafeMode({ location: { hostname: 'whateverfps.github.io', href: 'https://whateverfps.github.io/Mission-Companion-Master/' } }), true);
  assert.equal(resolveDrawingSafeMode({ location: { hostname: 'localhost', href: 'http://localhost:8000/' } }), false);
  assert.equal(resolveDrawingSafeMode({ location: { hostname: 'localhost', href: 'http://localhost:8000/?drawingSafeMode=1' } }), true);
});

test('safe mode bypasses enhancement work and resize-observer rerenders in the drawing viewer', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /import \{ drawingSafeMode \} from '\.\/drawing-safe-mode\.js';/);
  assert.match(app, /if \(drawingSafeMode\) return;/);
  assert.match(app, /if \(!deferEnhancements && !drawingSafeMode\)/);
  assert.match(app, /scheduleDeferredDrawingWorkspaceRefresh\(shell, requestToken\)/);
  assert.match(app, /if \(drawingSafeMode && \(/);
});

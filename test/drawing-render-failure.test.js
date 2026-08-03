import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('drawing page paint receives shell explicitly and does not depend on Electron shell APIs', () => {
  assert.match(app, /async function paintDrawingPage\(source, sheet, observation, overlayRecords = \[\], \{ preserveSidebarScroll = false, shell = 'professional', requestToken = 0 \} = \{\}\)/);
  assert.match(app, /await paintDrawingPage\(source, sheet, observation \|\| null, \[\], \{ preserveSidebarScroll: !scrollActiveCard, shell, requestToken \}\)/);
  assert.match(app, /await paintDrawingPage\(source, sheet, effectiveObservation .* shell, requestToken: workspaceRenderRequest \}\)/s);
  assert.match(app, /void paintDrawingPage\(source, sheet, observation, overlayRecords, \{ preserveSidebarScroll: true, shell, requestToken \}\)/);
  assert.doesNotMatch(app, /from ['"]electron['"]/);
});

test('drawing page failure is handled once and does not recurse into workspace rendering', () => {
  assert.ok(app.includes("const renderFailureKey = () => [source.documentId, sheet.pageNumber, drawingRenderGeneration, requestToken || 0].join(':');"));
  assert.ok(app.includes("if (drawingPageRenderFailureKeys.has(failureKey)) return;"));
  assert.ok(app.includes("stage.querySelector('.mc-drawing-render-error')?.remove();"));
  assert.ok(app.includes("canvas.insertAdjacentHTML('afterend', `<div class=\"mc-drawing-render-error\" role=\"status\"><strong>Drawing page could not be updated.</strong><p>${esc(error.message)}</p><small>The previously rendered sheet remains available when possible.</small></div>`);"));
  assert.ok(app.includes("clearCurrentLoading();\n    if (requestToken && requestToken !== drawingPagePaintRequest) return;\n    if (drawingTarget?.documentId !== source.documentId || drawingTarget?.pageNumber !== sheet.pageNumber) return;\n    const failureKey = renderFailureKey();\n    if (drawingPageRenderFailureKeys.has(failureKey)) return;\n    drawingPageRenderFailureKeys.add(failureKey);"));
  const toastIndex = app.indexOf('Drawing page could not be updated.');
  const failureBlockStart = app.lastIndexOf('  } catch (error) {', toastIndex);
  const failureBlockEnd = app.indexOf('\nfunction drawingSearchResultMarkup', toastIndex);
  const failureBlock = failureBlockEnd > failureBlockStart ? app.slice(failureBlockStart, failureBlockEnd) : app.slice(failureBlockStart);
  assert.doesNotMatch(failureBlock, /renderDrawingWorkspace\(/);
  assert.doesNotMatch(failureBlock, /renderDrawingWorkspaceWithProviders\(/);
  assert.doesNotMatch(failureBlock, /paintDrawingPage\(/);
});

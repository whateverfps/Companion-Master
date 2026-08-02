import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSpecificationSourceViewer } from '../src/specification-source-viewer.js';

const specification = { id: 'spec', projectId: 'bedford', documentType: 'specifications', pageCount: 2363 };
const canvas = () => ({ width: 0, height: 0, getContext: () => ({}) });

function harness() {
  const events = [];
  const proxies = [];
  const rendered = [];
  const viewer = createSpecificationSourceViewer({
    openPdf: async () => {
      const proxy = { numPages: 2363, cleaned: 0, destroyed: 0, cleanup() { this.cleaned += 1; }, destroy() { this.destroyed += 1; } };
      proxies.push(proxy); return proxy;
    },
    renderPage: async (_proxy, page, target) => {
      rendered.push(page); target.width = 1200; target.height = 1600;
      return { promise: Promise.resolve(), cancelled: false, cancel() { this.cancelled = true; }, release() { target.width = 0; target.height = 0; }, releasePage() {} };
    },
    now: () => '2026-08-01T12:00:00.000Z',
    onDiagnostic: event => events.push(event)
  });
  return { viewer, proxies, rendered, events };
}

test('ordinary section lookup keeps the specification PDF dormant', () => {
  const { viewer, proxies } = harness();
  assert.deepEqual(viewer.diagnostics(), { specificationPdfProxyActive: false, specificationSourcePage: null, sourceViewRenderTaskActive: false, sourceViewCanvasPixels: { width: 0, height: 0 }, sourceViewCacheEntryCount: 0, sourceViewCleanupTimestamp: '', retainedSpecificationPageRecordsInMemory: 0 });
  assert.equal(proxies.length, 0);
});

test('View Source Page opens one exact specification page without a page model', async () => {
  const { viewer, rendered } = harness();
  const result = await viewer.open({ document: specification, sourceBlob: new Blob(['pdf'], { type: 'application/pdf' }), pageNumber: 417, sectionNumber: '23 31 00', sectionTitle: 'HVAC Ducts and Casings', canvas: canvas() });
  assert.equal(result.ok, true);
  assert.deepEqual(rendered, [417]);
  assert.equal(result.diagnostics.retainedSpecificationPageRecordsInMemory, 1);
  assert.equal(result.diagnostics.sourceViewCacheEntryCount, 0);
});

test('a second page replaces and destroys the first isolated proxy', async () => {
  const { viewer, proxies, rendered } = harness();
  await viewer.open({ document: specification, sourceBlob: new Blob(['one'], { type: 'application/pdf' }), pageNumber: 10, canvas: canvas() });
  await viewer.open({ document: specification, sourceBlob: new Blob(['two'], { type: 'application/pdf' }), pageNumber: 11, canvas: canvas() });
  assert.deepEqual(rendered, [10, 11]);
  assert.equal(proxies[0].destroyed, 1);
  assert.equal(proxies[0].cleaned, 1);
  assert.equal(viewer.diagnostics().specificationSourcePage, 11);
});

test('return or workspace switching releases canvas, page, render, and proxy resources', async () => {
  const { viewer, proxies } = harness();
  const targetCanvas = canvas();
  await viewer.open({ document: specification, sourceBlob: new Blob(['pdf'], { type: 'application/pdf' }), pageNumber: 100, canvas: targetCanvas });
  const result = await viewer.close('workspace-changed');
  assert.equal(proxies[0].destroyed, 1);
  assert.equal(targetCanvas.width, 0);
  assert.equal(targetCanvas.height, 0);
  assert.equal(result.specificationPdfProxyActive, false);
  assert.equal(result.retainedSpecificationPageRecordsInMemory, 0);
  assert.equal(result.sourceViewCleanupTimestamp, '2026-08-01T12:00:00.000Z');
});

test('drawing documents and inexact requests cannot enter specification evidence', async () => {
  const { viewer, proxies } = harness();
  assert.equal((await viewer.open({ document: { ...specification, documentType: 'drawing-set' }, sourceBlob: new Blob(['pdf'], { type: 'application/pdf' }), pageNumber: 1, canvas: canvas() })).status, 'invalid-document-role');
  assert.equal((await viewer.open({ document: specification, sourceBlob: new Blob(['pdf'], { type: 'application/pdf' }), pageNumber: 0, canvas: canvas() })).status, 'exact-source-page-required');
  assert.equal(proxies.length, 0);
});

test('production source keeps specification and drawing PDF ownership isolated', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const sourceViewer = readFileSync(new URL('../src/specification-source-viewer.js', import.meta.url), 'utf8');
  assert.match(app, /createSpecificationSourceViewer\(\{ openPdf: openPdfBlob, renderPage: renderPdfPage/);
  assert.match(app, /data-specification-view-source-page/);
  assert.match(app, /specificationDrawingReturnTarget[\s\S]*drawingViewerEngine\.restoreViewport/);
  assert.match(sourceViewer, /retainedSpecificationPageRecordsInMemory: target \? 1 : 0/);
  assert.doesNotMatch(sourceViewer, /buildDrawingPageModel|createDrawingCatalog|drawingRenderCache/);
});

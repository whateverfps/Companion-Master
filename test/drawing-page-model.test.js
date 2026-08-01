import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDrawingPageModel, drawingPageModelFacets } from '../src/drawing-page-model.js';

test('page model produces one ordered record per retained PDF page', () => {
  const pages = buildDrawingPageModel({ documentId: 'doc', drawingSetId: 'set', projectId: 'general', pageCount: 70 });
  assert.equal(pages.length, 70);
  assert.equal(pages[0].pdfPageNumber, 1);
  assert.equal(pages[69].pdfPageIndex, 69);
  assert.equal(pages.every(page => page.identityStatus === 'fallback'), true);
});

test('authoritative metadata wins while partial and stored metadata fill gaps', () => {
  const pages = buildDrawingPageModel({ documentId: 'doc', drawingSetId: 'set', projectId: 'general', pageCount: 3,
    registryRecords: [{ pageNumber: 1, drawingId: 'drawing-1', sheetNumber: '61A-001', sheetTitle: 'Architectural Notes' }],
    partialSheets: [{ pageNumber: 1, sheetNumber: 'wrong', discipline: 'Architectural', primarySheetType: 'General Notes' }, { pageNumber: 2, sheetNumber: '61M-101', sheetTitle: 'Mechanical Plan', discipline: 'Mechanical', sheetTypes: ['Plan'] }],
    storedPageMetadata: [{ pageNumber: 1, building: '61' }, { pageNumber: 2, building: '61' }] });
  assert.equal(pages[0].sheetNumber, '61A-001');
  assert.equal(pages[0].discipline, 'Architectural');
  assert.equal(pages[0].building, '61');
  assert.equal(pages[0].identityStatus, 'authoritative');
  assert.equal(pages[1].identityStatus, 'partial');
  assert.equal(pages[2].identityStatus, 'fallback');
  assert.match(pages[1].searchableText, /61M-101.*Mechanical Plan.*Mechanical.*Plan/);
});

test('fallback never creates false authoritative identities and facets include Unknown', () => {
  const pages = buildDrawingPageModel({ pageCount: 2, partialSheets: [{ pageNumber: 1, sheetNumber: 'FX500', discipline: 'Mechanical' }] });
  assert.equal(pages[0].sheetNumber, '');
  assert.equal(pages[0].identityStatus, 'partial');
  assert.equal(pages[1].identityStatus, 'fallback');
  assert.deepEqual(drawingPageModelFacets(pages), { disciplines: ['Mechanical', 'Unknown'], drawingTypes: ['Unknown'] });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpecificationIndex } from '../src/specification-index.js';
import { createDrawingSpecificationLinkService } from '../src/drawing-spec-links.js';

const memory = () => { const map = new Map(); return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }; };
test('links only use indexed project sections and manual decisions survive enrichment', () => {
  const storage = memory(); const index = createSpecificationIndex({ storage, storageKey: 'index' });
  index.index({ document: { id: 'spec', projectId: 'p' }, tocRows: [{ id: 's', sectionNumber: '10 14 00', sectionTitle: 'Signage', pageStart: 55 }] });
  const links = createDrawingSpecificationLinkService({ index, storage, storageKey: 'links', now: () => '2026-08-01T00:00:00.000Z' });
  const [suggestion] = links.suggestForObject({ objectId: 'o', projectId: 'p', documentId: 'drawing', pageId: 'page', subtype: 'signage', evidenceText: 'SIGN TYPE A' }, { specificationDocumentId: 'spec' });
  assert.equal(suggestion.status, 'suggested');
  links.reject(suggestion.linkId, 'Not applicable');
  assert.equal(links.suggestForObject({ objectId: 'o', projectId: 'p', documentId: 'drawing', pageId: 'page', subtype: 'signage' }, { specificationDocumentId: 'spec' })[0].status, 'rejected');
  assert.equal(links.history(suggestion.linkId).at(-1).newStatus, 'rejected');
  assert.deepEqual(links.openTarget(suggestion), { kind: 'source', destination: 'knowledge', projectId: 'p', documentId: 'spec', sectionId: 's', pageNumber: 55, sectionNumber: '10 14 00' });
  assert.equal(links.link({ projectId: 'p', drawingDocumentId: 'd', drawingPageId: 'p', specificationDocumentId: 'spec', sectionNumber: '99 99 99' }), null);
});
test('explicit printed section reference is confirmed', () => {
  const storage = memory(); const index = createSpecificationIndex({ storage, storageKey: 'index' });
  index.index({ document: { id: 'spec', projectId: 'p' }, tocRows: [{ sectionNumber: '09 91 00', sectionTitle: 'Painting', pageStart: 12 }] });
  const service = createDrawingSpecificationLinkService({ index, storage, storageKey: 'links' });
  const [link] = service.suggestForObject({ objectId: 'paint', projectId: 'p', documentId: 'd', pageId: 'page', evidenceText: 'REFER TO SECTION 09 91 00' }, { specificationDocumentId: 'spec' });
  assert.equal(link.status, 'confirmed');
  assert.equal(link.origin, 'explicit');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpecificationIndex } from '../src/specification-index.js';
import { createProjectSpecificationVocabulary } from '../src/project-specification-vocabulary.js';
import { createDrawingSpecificationLinkService } from '../src/drawing-spec-links.js';
import { createDrawingRequirementsResolver } from '../src/drawing-requirements-resolver.js';
import { createProjectRelationshipEngine } from '../src/project-relationship-engine.js';

const memory = () => { const map = new Map(); return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }; };
const sections = [
  ['09 65 13', 'Resilient Base and Accessories'], ['09 65 19', 'Resilient Tile Flooring'], ['09 91 00', 'Painting'],
  ['10 14 00', 'Signage'], ['10 26 00', 'Wall and Door Protection'], ['10 44 13', 'Fire Extinguisher Cabinets']
];
function fixture() {
  const index = createSpecificationIndex({ storage: memory() });
  index.index({ document: { id: 'bedford-spec', projectId: 'bedford' }, tocRows: sections.map(([sectionNumber, sectionTitle], index) => ({ id: `s-${index}`, sectionNumber, sectionTitle, pageStart: 400 + index * 10, pageEnd: 409 + index * 10,
    verificationState: 'indexed', articles: [{ id: `a-${index}`, heading: index === 2 ? '3.2 INSTALLATION' : '1.4 SUBMITTALS', page: 402 + index * 10 }] })) });
  return { index, vocabulary: createProjectSpecificationVocabulary({ specificationIndex: index }) };
}

test('real indexed Bedford sections resolve by normalized number with exact boundaries and articles', () => {
  const { index } = fixture();
  for (const [number, title] of sections) {
    const section = index.get('bedford-spec', number.replace(/\D/g, ''));
    assert.equal(section.sectionTitle, title); assert.equal(section.normalizedSectionNumber, number.replace(/\D/g, ''));
    assert.ok(section.startPdfPage); assert.ok(section.endPdfPage >= section.startPdfPage); assert.ok(section.articles.length); assert.equal(section.verificationState, 'indexed');
  }
});

test('61IN101 page evidence creates deduplicated page-wide suggestions only for supported terms', () => {
  const { vocabulary } = fixture();
  const matches = vocabulary.matchPage({ projectId: 'bedford', specificationDocumentId: 'bedford-spec', pageId: '61in101', evidence: ['Interior Finish Plan, Signage & Schedules', 'P-1', 'P-1', 'FIRE EXTINGUISHER CABINET DETAIL', '518-22-700', '61IN101'] });
  assert.deepEqual(matches.map(item => item.sectionNumber), ['10 14 00', '09 91 00', '10 44 13']);
  assert.ok(matches.every(item => item.applicabilityScope === 'page-wide' && item.status === 'suggested'));
});

test('object vocabulary produces only object-specific indexed candidates', () => {
  const { vocabulary } = fixture();
  const cases = [['Finish P-1','09 91 00'], ['Sign Type S-3','10 14 00'], ['RB resilient base','09 65 13'], ['LVT resilient tile','09 65 19'], ['corner guard wall protection','10 26 00'], ['FEC-2 fire extinguisher cabinet','10 44 13']];
  for (const [evidence, expected] of cases) {
    const matches = vocabulary.matchObject({ projectId: 'bedford', specificationDocumentId: 'bedford-spec', pageId: 'page', objectId: evidence, evidence: [evidence] });
    assert.deepEqual(matches.map(item => item.sectionNumber), [expected]); assert.equal(matches[0].applicabilityScope, 'object-specific'); assert.equal(matches[0].status, 'suggested');
  }
});

test('unsupported evidence and unindexed or cross-project sections never qualify', () => {
  const { vocabulary } = fixture();
  assert.deepEqual(vocabulary.matchPage({ projectId: 'bedford', specificationDocumentId: 'bedford-spec', evidence: ['consultant address 700 Main Street'] }), []);
  assert.deepEqual(vocabulary.matchPage({ projectId: 'other', specificationDocumentId: 'bedford-spec', evidence: ['signage schedule'] }), []);
  assert.deepEqual(vocabulary.matchPage({ projectId: 'bedford', specificationDocumentId: 'missing', evidence: ['signage schedule'] }), []);
});

test('an explicit indexed section reference is confirmed while vocabulary remains suggested', () => {
  const { vocabulary } = fixture();
  assert.equal(vocabulary.matchPage({ projectId: 'bedford', specificationDocumentId: 'bedford-spec', evidence: ['REFER TO SECTION 10 14 00'] })[0].status, 'confirmed');
  assert.equal(vocabulary.matchPage({ projectId: 'bedford', specificationDocumentId: 'bedford-spec', evidence: ['SIGNAGE SCHEDULE'] })[0].status, 'suggested');
});

test('vocabulary links flow into scoped requirements while rejection and manual confirmation persist', () => {
  const { index, vocabulary } = fixture(); const storage = memory();
  const links = createDrawingSpecificationLinkService({ index, storage, storageKey: 'links' });
  const resolver = createDrawingRequirementsResolver({ specificationIndex: index, relationshipEngine: createProjectRelationshipEngine({ storage: memory() }) });
  const pageMatch = vocabulary.matchPage({ projectId: 'bedford', specificationDocumentId: 'bedford-spec', pageId: 'page', evidence: ['SIGNAGE SCHEDULE'] })[0];
  const pageLink = links.link({ ...pageMatch, drawingDocumentId: 'drawing', drawingPageId: 'page' });
  const pageResult = resolver.resolve({ projectId: 'bedford', pageEntityId: 'page-entity', drawingSpecLinks: links.forPage('page', null), tradeChannel: { key: 'all-trades', divisions: [] } });
  assert.equal(pageResult.suggestedSpecifications[0].applicabilityScope, 'page-wide');
  links.reject(pageLink.linkId, 'Not applicable here');
  links.link({ ...pageMatch, drawingDocumentId: 'drawing', drawingPageId: 'page' });
  assert.equal(links.forPage('page', null)[0].status, 'rejected');
  const objectMatch = vocabulary.matchObject({ projectId: 'bedford', specificationDocumentId: 'bedford-spec', pageId: 'page', objectId: 'finish', evidence: ['Finish P-1'] })[0];
  const objectLink = links.link({ ...objectMatch, drawingDocumentId: 'drawing', drawingPageId: 'page', objectId: 'finish' });
  links.confirm(objectLink.linkId, 'Verified finish schedule');
  links.link({ ...objectMatch, drawingDocumentId: 'drawing', drawingPageId: 'page', objectId: 'finish' });
  const objectResult = resolver.resolve({ projectId: 'bedford', pageEntityId: 'page-entity', selectedObjectId: 'finish', drawingSpecLinks: links.forPage('page', 'finish'), tradeChannel: { key: 'all-trades', divisions: [] } });
  assert.equal(objectResult.confirmedSpecifications[0].sectionNumber, '09 91 00'); assert.equal(objectResult.confirmedSpecifications[0].applicabilityScope, 'object-specific');
});

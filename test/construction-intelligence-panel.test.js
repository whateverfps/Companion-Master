import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConstructionIntelligencePanelModel } from '../src/construction-intelligence-panel.js';

const sheet = { pageId: 'page-1', pageNumber: 12, sheetNumber: '61IN101', discipline: 'Interiors', identityStatus: 'authoritative', building: '61' };

test('page context contains only drawing facts and deduplicated object counts', () => {
  const model = buildConstructionIntelligencePanelModel({ document: { title: 'Building 61' }, sheet, trade: { label: 'Interiors' }, pageObjects: [
    { objectId: 'a', type: 'finish', verificationState: 'confirmed' },
    { objectId: 'b', type: 'finish', verificationState: 'candidate' },
    { objectId: 'c', type: 'room', verificationState: 'rejected' }
  ] });
  assert.equal(model.mode, 'page');
  assert.deepEqual(model.page.objectCounts, { finish: 2 });
  assert.equal('relationships' in model, false);
  assert.deepEqual(model.specifications, { confirmed: [], suggested: [] });
});

test('selected object replaces page context and deduplicates specifications', () => {
  const requirement = { requirementId: 'r1', specificationDocumentId: 'spec', sectionNumber: '09 91 00', sectionTitle: 'Painting', status: 'confirmed', evidenceText: 'Finish schedule P-1.', startPdfPage: 410 };
  const model = buildConstructionIntelligencePanelModel({ sheet, selectedObject: { objectId: 'permanent-1', label: 'Finish P-1', type: 'finish', trade: 'Interiors', confidence: .97, verificationState: 'confirmed' }, requirements: { confirmedSpecifications: [requirement], suggestedSpecifications: [], fieldRequirements: {} }, specificationLinks: [{ ...requirement, linkId: 'link-1' }], relationshipGroups: {}, objectHistory: [] });
  assert.equal(model.mode, 'object');
  assert.equal(model.object.objectId, 'permanent-1');
  assert.equal(model.specifications.confirmed.length, 1);
  assert.equal(model.specifications.confirmed[0].canShowSource, true);
  assert.equal('page' in model, false);
});

test('empty operational categories disappear and rejected relationships stay hidden', () => {
  const model = buildConstructionIntelligencePanelModel({ sheet, selectedObject: { objectId: 'fec-2', label: 'Fire Extinguisher FEC-2', type: 'fire-extinguisher-cabinet', verificationState: 'confirmed' }, requirements: {}, relationshipGroups: { issues: [{ entity: { entityId: 'issue-1', label: 'Rejected issue' }, relationship: { relationshipId: 'rel-1', verificationState: 'rejected' } }] } });
  assert.deepEqual(model.pmis.issues, []);
  assert.deepEqual(model.documents.photos, []);
  assert.deepEqual(model.schedule, []);
  assert.deepEqual(model.procurement, []);
});

test('object change creates a new isolated panel model without mutating viewport input', () => {
  const viewport = { pageId: 'page-1', zoom: 2, bounds: { x: .1, y: .2, width: .4, height: .4 } };
  const first = buildConstructionIntelligencePanelModel({ sheet, viewportContext: viewport, selectedObject: { objectId: 'p1', label: 'Finish P-1', type: 'finish', verificationState: 'confirmed' } });
  const second = buildConstructionIntelligencePanelModel({ sheet, viewportContext: viewport, selectedObject: { objectId: 'fec', label: 'FEC-2', type: 'fire-extinguisher-cabinet', verificationState: 'confirmed' } });
  assert.equal(first.object.objectId, 'p1');
  assert.equal(second.object.objectId, 'fec');
  assert.deepEqual(viewport, { pageId: 'page-1', zoom: 2, bounds: { x: .1, y: .2, width: .4, height: .4 } });
});

test('page context exposes page-wide specifications and section-scoped articles without duplicates', () => {
  const requirement = { requirementId: 'page-paint', drawingSpecLinkId: 'link', specificationDocumentId: 'spec', sectionNumber: '09 91 00', sectionTitle: 'Painting', status: 'suggested', applicabilityScope: 'page-wide', evidenceText: 'Finish legend P-1 and P-2.', startPdfPage: 410 };
  const model = buildConstructionIntelligencePanelModel({ sheet, requirements: { confirmedSpecifications: [], suggestedSpecifications: [requirement], fieldRequirements: { installation: [{ ...requirement, article: { id: 'install', heading: '3.2 INSTALLATION' } }] }, projectWideRequirements: [] }, specificationLinks: [{ ...requirement, linkId: 'link' }] });
  assert.equal(model.specifications.suggested.length, 1); assert.equal(model.specifications.suggested[0].applicabilityScope, 'page-wide');
  assert.deepEqual(model.fieldRequirements.map(item => item.article.heading), ['3.2 INSTALLATION']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyObservationVerification, buildDrawingAnalysis, classifyDiscipline, classifySheetTypes,
  drawingSetIdFor, extractSheetNumberCandidates, extractTextObservations, parseExactDrawingReference, reconcileDrawingIndex, sheetIdFor, validSheetNumberCandidate
} from '../src/drawing-intelligence.js';
import { createDrawingTarget, drawingAnchorId, drawingReturnTarget, drawingScrollOptions, resolveDrawingTarget } from '../src/drawing-navigation.js';
import { createSourceTarget, resolveSourceTarget } from '../src/source-navigation.js';

const item = (text, x, y, width = .15) => ({ text, region: { x, y, width, height: .02 } });
const pages = [
  { pageNumber: 1, width: 1000, height: 700, rotation: 0, textItems: [item('DRAWING INDEX', .1, .1), item('M-101 MECHANICAL FLOOR PLAN', .1, .2, .4), item('T-101 TELECOMMUNICATIONS PLAN', .1, .23, .4), item('G-001', .8, .9), item('COVER SHEET AND DRAWING INDEX', .6, .86, .35)] },
  { pageNumber: 2, width: 1000, height: 700, rotation: 0, textItems: [item('M-101', .82, .9), item('MECHANICAL FLOOR PLAN', .62, .86, .3), item('ISSUE DATE: 07/31/2026', .62, .82, .2), item('REV: 2', .82, .82), item('ROOM 137 TELECOM', .3, .4), item('VAV-12', .35, .42), item('3/T-501', .4, .45)] }
];

test('stable identities use exact document and page identifiers', () => {
  assert.equal(drawingSetIdFor('d1'), drawingSetIdFor('d1'));
  assert.equal(sheetIdFor('d1', 1), sheetIdFor('d1', 1));
  assert.notEqual(sheetIdFor('d1', 1), sheetIdFor('d1', 2));
});

test('classifies disciplines and exact visible sheet types', () => {
  assert.equal(classifyDiscipline('M-101', '').discipline, 'Mechanical');
  assert.equal(classifyDiscipline('', 'Telecommunications Plan').discipline, 'Telecommunications');
  assert.deepEqual(classifySheetTypes('MECHANICAL DETAILS AND SCHEDULES'), ['Detail', 'Schedule']);
  assert.deepEqual(classifySheetTypes('Unclassified content'), ['Unknown']);
});

test('sheet identity accepts generalized drawing numbers and rejects metadata candidates', () => {
  for (const value of ['61G-001', '61M-101', '61M-701', '61E-401', '61T-402', 'M-101', 'A101', 'FP101']) assert.equal(validSheetNumberCandidate(value), true, value);
  for (const [value, context] of [['R23', 'R23'], ['08-6231', 'VA FORM 08-6231'], ['61M-101', 'PROJECT NUMBER 61M-101'], ['20260731', 'REVISION DATE 20260731'], ['123456', 'REGISTRATION 123456'], ['100', 'PAGE 100'], ['22', 'PHASE 22']]) assert.equal(validSheetNumberCandidate(value, context), false, `${value} ${context}`);
  const candidates = extractSheetNumberCandidates([item('VA FORM 08-6231', .7, .8), item('R23', .8, .82), item('61M-101', .82, .9)] , { titleBlockOnly: true });
  assert.deepEqual(candidates.map(candidate => candidate.value), ['61M-101']);
});

test('builds title-block sheets, index entries, room tags, equipment tags, and callouts', () => {
  const analysis = buildDrawingAnalysis({ documentId: 'd1', projectId: 'p1', pages, analyzedAt: '2026-01-01' });
  assert.equal(analysis.sheets.length, 2);
  assert.equal(analysis.sheets[1].sheetNumber, 'M-101');
  assert.equal(analysis.sheets[1].discipline, 'Mechanical');
  assert.equal(analysis.sheets[1].issueDate, '07/31/2026');
  assert.equal(analysis.sheets[1].revision, '2');
  assert.ok(analysis.indexEntries.some(entry => entry.sheetNumber === 'M-101'));
  assert.ok(analysis.observations.some(observation => observation.kind === 'room-number-text' && observation.value === '137'));
  assert.ok(analysis.observations.some(observation => observation.kind === 'room-name-text' && observation.value === 'TELECOM'));
  assert.ok(analysis.observations.some(observation => observation.kind === 'equipment-tag-text' && observation.value === 'VAV-12'));
  assert.deepEqual(parseExactDrawingReference('3/T-501'), { detailNumber: '3', sheetNumber: 'T-501', source: '3/T-501' });
  assert.ok(analysis.references.some(reference => reference.sheetNumber === 'T-501'));
  assert.ok(analysis.limitations[0].includes('do not establish room boundaries'));
});

test('reports duplicate numbers, title mismatches, and missing index sheets', () => {
  const warnings = reconcileDrawingIndex(
    [{ sheetNumber: 'M-101', sheetTitle: 'MECHANICAL PLAN' }, { sheetNumber: 'E-101', sheetTitle: 'ELECTRICAL PLAN' }],
    [{ sheetId: 's1', sheetNumber: 'M-101', sheetTitle: 'MECHANICAL LEVEL PLAN' }, { sheetId: 's2', sheetNumber: 'M-101', sheetTitle: 'MECHANICAL LEVEL PLAN' }]
  );
  assert.ok(warnings.some(item => item.type === 'duplicate-sheet-number'));
  assert.ok(warnings.some(item => item.type === 'expected-sheet-missing' && item.sheetNumber === 'E-101'));
});

test('machine observations remain immutable when verification overlays change', () => {
  const [machine] = extractTextObservations({ documentId: 'd1', sheetId: 's1', pageNumber: 1, textItems: [item('ROOM 137', .2, .2)] });
  const corrected = applyObservationVerification(machine, { status: 'Corrected', correctedValue: '137A', verifiedAt: '2026-01-02' });
  assert.equal(machine.value, '137');
  assert.equal(machine.verification.status, 'Unreviewed');
  assert.equal(corrected.originalValue, '137');
  assert.equal(corrected.verification.correctedValue, '137A');
  assert.throws(() => applyObservationVerification(machine, { status: 'Corrected' }), /corrected value/);
});

test('drawing navigation resolves exact documents, sheets, pages, observations, and regions only', () => {
  const analysis = buildDrawingAnalysis({ documentId: 'd1', projectId: 'p1', pages, analyzedAt: '2026-01-01' });
  const observation = analysis.observations[0];
  const target = createDrawingTarget({ projectId: 'p1', documentId: 'd1', drawingSetId: analysis.drawingSetId, sheetId: observation.sheetId, pageNumber: observation.pageNumber, observationId: observation.observationId, region: observation.region });
  assert.equal(resolveDrawingTarget(target, { documents: [{ id: 'd1' }], analyses: [analysis] }).status, 'region');
  assert.equal(resolveDrawingTarget({ ...target, observationId: 'missing' }, { documents: [{ id: 'd1' }], analyses: [analysis] }).status, 'missing-observation');
  assert.equal(resolveDrawingTarget({ ...target, sheetId: 'missing', observationId: '' }, { documents: [{ id: 'd1' }], analyses: [analysis] }).status, 'missing-page');
  assert.equal(resolveDrawingTarget({ ...target, documentId: 'missing' }, { documents: [{ id: 'd1' }], analyses: [analysis] }).status, 'missing-document');
  assert.match(drawingAnchorId('sheet', 'unsafe/id'), /^mc-drawing-sheet-/);
  assert.equal(drawingScrollOptions(true).behavior, 'auto');
  assert.equal(drawingReturnTarget(target, 'source').destination, 'source');
});

test('application exposes bounded Mission Control viewing and Professional inspection without graphical claims', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(app, /data-control-view="plans">Open Plans/);
  assert.match(app, /data-view="drawings">Drawing Set Inspector/);
  assert.match(app, /Original drawing unavailable — reattach PDF to view sheet/);
  assert.match(app, /Graphical association has not been verified/);
  assert.match(app, /updateDrawingSearchResults/);
  assert.doesNotMatch(app, /drawingFilter = event\.target\.value;\s*void renderDrawingWorkspace/);
  assert.match(app, /Construction Work Package/);
  assert.match(app, /render one selected full-resolution page|renderPdfPage\(activeDrawingPdf/);
  assert.match(css, /\.mc-drawing-workspace/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('source navigation resolves exact drawing pages and observations without approximate fallback', () => {
  const analysis = buildDrawingAnalysis({ documentId: 'd1', projectId: 'p1', pages, analyzedAt: '2026-01-01' });
  const observation = analysis.observations.find(item => item.kind === 'room-number-text');
  const target = createSourceTarget({ projectId: 'p1', documentId: 'd1', pageNumber: observation.pageNumber, sheetId: observation.sheetId, observationId: observation.observationId, region: observation.region, destination: 'sources' });
  const records = { documents: [{ id: 'd1', projectId: 'p1' }], projects: [{ id: 'p1' }], analyses: [analysis], sourceFiles: [{ documentId: 'd1' }] };
  assert.equal(resolveSourceTarget(target, records).status, 'drawing-region');
  assert.equal(resolveSourceTarget({ ...target, observationId: 'missing' }, records).status, 'missing-observation');
  assert.equal(resolveSourceTarget(target, { ...records, sourceFiles: [] }).status, 'missing-source');
  assert.equal(resolveSourceTarget({ ...target, pageNumber: 99, sheetId: '', observationId: '' }, records).status, 'missing-page');
});

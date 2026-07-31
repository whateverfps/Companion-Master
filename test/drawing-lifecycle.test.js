import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDrawingOrphans, drawingRecoveryActions, drawingUpgradeKey, reduceStaleDrawingTarget, validateDrawingOwnership } from '../src/drawing-lifecycle.js';

const document = { id: 'd1', projectId: 'p1', sourceAvailability: 'available' };
const sourceFile = { documentId: 'd1', projectId: 'p1' };
const analysis = { drawingSetId: 'set1', documentId: 'd1', projectId: 'p1', analysisVersion: 2, sheets: [{ sheetId: 'sheet1', pageNumber: 1 }], observations: [{ observationId: 'obs1', sheetId: 'sheet1' }] };

test('valid ownership is global and independent of the active project', () => {
  const result = validateDrawingOwnership({ analysis, documents: [document], sourceFiles: [sourceFile], activeProjectId: 'general', requireSource: true });
  assert.equal(result.ok, true);
  assert.equal(result.owningProjectId, 'p1');
  assert.equal(result.activeProjectId, 'general');
});

test('missing and ambiguous documents are structured unavailable outcomes', () => {
  assert.equal(validateDrawingOwnership({ analysis }).errorCode, 'drawing-document-missing');
  assert.equal(validateDrawingOwnership({ analysis, documents: [document, { ...document }] }).errorCode, 'drawing-document-ambiguous');
});

test('project and source ownership mismatches are rejected', () => {
  assert.equal(validateDrawingOwnership({ analysis: { ...analysis, projectId: 'other' }, documents: [document] }).errorCode, 'drawing-project-mismatch');
  assert.equal(validateDrawingOwnership({ analysis, documents: [document], sourceFiles: [{ ...sourceFile, projectId: 'other' }] }).errorCode, 'drawing-source-project-mismatch');
  assert.equal(validateDrawingOwnership({ analysis, documents: [document], requireSource: true }).errorCode, 'drawing-source-missing');
});

test('analysis and source orphans are classified without mutation or deletion', () => {
  const diagnostics = classifyDrawingOrphans({ documents: [document], analyses: [{ ...analysis, documentId: 'missing' }], sourceFiles: [{ documentId: 'orphan', projectId: 'p1' }] });
  assert.deepEqual(diagnostics.map(item => item.errorCode).sort(), ['drawing-document-missing', 'drawing-source-orphan']);
});

test('stale target reduction preserves the highest valid exact level', () => {
  const target = { projectId: 'p1', documentId: 'd1', drawingSetId: 'set1', sheetId: 'sheet1', pageNumber: 1, observationId: 'missing', region: { x: .1, y: .1, width: .1, height: .1 } };
  const observation = reduceStaleDrawingTarget(target, { document, analysis });
  assert.equal(observation.status, 'drawing-observation-stale');
  assert.equal(observation.target.sheetId, 'sheet1');
  assert.equal(observation.target.observationId, '');
  const sheet = reduceStaleDrawingTarget({ ...target, sheetId: 'missing', pageNumber: 99 }, { document, analysis });
  assert.equal(sheet.status, 'drawing-sheet-stale');
  assert.equal(sheet.target.documentId, 'd1');
  assert.equal(sheet.target.sheetId, '');
  assert.equal(reduceStaleDrawingTarget(target, { document: null, analysis }).target, null);
});

test('recovery actions and upgrade keys are deterministic', () => {
  assert.equal(drawingUpgradeKey(analysis, 3), 'set1:d1:3');
  const labels = drawingRecoveryActions({ errorCode: 'drawing-document-missing', analysis, owningProjectId: 'p1', activeProjectId: 'general' }).map(item => item.label);
  assert.ok(labels.includes('Open Owning Project'));
  assert.ok(labels.includes('Remove Stale Analysis'));
  assert.ok(labels.includes('View Details'));
});

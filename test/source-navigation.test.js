import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerAnchorId,
  createSourceTarget,
  resolveSourceTarget,
  sourceAnchorId,
  sourceNavigationActions,
  sourceNavigationDestination,
  sourceScrollOptions
} from '../src/source-navigation.js';

const project = { id: 'project-1' };
const library = { id: 'library-1', enabled: true };
const document = { id: 'document-1', libraryId: library.id };
const section = { id: 'section-1', documentId: document.id, heading: 'Duplicate' };
const context = {
  projects: [project],
  libraries: [library],
  documents: [document],
  sections: [section]
};
const target = createSourceTarget({
  projectId: project.id,
  libraryId: library.id,
  documentId: document.id,
  sectionId: section.id,
  originatingMessageId: 'answer-1'
});

test('resolves an exact section ID within the exact document', () => {
  const result = resolveSourceTarget(target, context);
  assert.equal(result.status, 'section');
  assert.equal(result.section, section);
});

test('selects the exact document', () => {
  assert.equal(resolveSourceTarget(target, context).document, document);
});

test('generates a Knowledge Object destination', () => {
  assert.equal(sourceNavigationDestination(target, 'knowledge').destination, 'knowledge');
});

test('generates a Source Inspector destination', () => {
  assert.equal(sourceNavigationDestination(target, 'sources').destination, 'sources');
});

test('reports a missing section without losing the exact document', () => {
  const result = resolveSourceTarget({ ...target, sectionId: 'removed' }, context);
  assert.equal(result.status, 'missing-section');
  assert.equal(result.document, document);
});

test('reports a missing document and does not select another document', () => {
  const result = resolveSourceTarget({ ...target, documentId: 'removed' }, context);
  assert.equal(result.status, 'missing-document');
  assert.equal(result.document, null);
});

test('retains evidence origin for return navigation', () => {
  assert.equal(target.originatingWorkspace, 'evidence');
  assert.equal(target.originatingMessageId, 'answer-1');
});

test('creates a deterministic originating-answer anchor', () => {
  assert.equal(answerAnchorId('answer-1'), answerAnchorId('answer-1'));
  assert.notEqual(answerAnchorId('answer-1'), answerAnchorId('answer-2'));
});

test('a target can be cleared without retained state', () => {
  let currentTarget = target;
  currentTarget = null;
  assert.equal(resolveSourceTarget(currentTarget, context).status, 'none');
});

test('duplicate headings do not affect exact ID navigation', () => {
  const duplicate = { id: 'section-2', documentId: document.id, heading: 'Duplicate' };
  const result = resolveSourceTarget(target, {
    ...context,
    sections: [duplicate, section]
  });
  assert.equal(result.section.id, 'section-1');
});

test('normalizes unsafe identifiers into safe deterministic anchors', () => {
  const anchor = sourceAnchorId('section', 'a" b/c][#é');
  assert.match(anchor, /^[a-zA-Z][a-zA-Z0-9_-]*$/);
  assert.equal(anchor, sourceAnchorId('section', 'a" b/c][#é'));
});

test('uses non-smooth scrolling when reduced motion is requested', () => {
  assert.equal(sourceScrollOptions(true).behavior, 'auto');
  assert.equal(sourceScrollOptions(false).behavior, 'smooth');
});

test('hides navigation actions when required IDs are absent', () => {
  assert.deepEqual(sourceNavigationActions({ documentId: document.id }), {
    viewInDocument: false,
    openSourceInspector: false
  });
});

test('preserves only valid matching project and library context', () => {
  const valid = resolveSourceTarget(target, context);
  assert.equal(valid.validProjectId, project.id);
  assert.equal(valid.validLibraryId, library.id);

  const invalid = resolveSourceTarget({
    ...target,
    projectId: 'unrelated-project',
    libraryId: 'unrelated-library'
  }, context);
  assert.equal(invalid.validProjectId, '');
  assert.equal(invalid.validLibraryId, '');
});

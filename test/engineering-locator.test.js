import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChiefLocationPresentation, resolveEngineeringLocation } from '../src/engineering-locator.js';

test('resolves an exact room query into a drawing target with observation metadata', () => {
  const result = resolveEngineeringLocation('Show room 101', {
    analyses: [{
      documentId: 'doc-1',
      drawingSetId: 'set-1',
      projectId: 'project-1',
      sheets: [{ sheetId: 'sheet-1', pageNumber: 2, sheetNumber: 'A101' }],
      observations: [{ observationId: 'obs-room-101', sheetId: 'sheet-1', kind: 'room-number-text', value: '101', region: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } }]
    }],
    documents: [{ id: 'doc-1', title: 'Floor Plan' }],
    returnTarget: 'work-package'
  });

  assert.equal(result.status, 'resolved');
  assert.equal(result.kind, 'room');
  assert.equal(result.target?.documentId, 'doc-1');
  assert.equal(result.target?.sheetId, 'sheet-1');
  assert.equal(result.target?.observationId, 'obs-room-101');
  assert.equal(result.target?.returnTarget, 'work-package');
  assert.deepEqual(result.target?.region, { x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
});

test('resolves equipment and sheet identifiers without changing the underlying drawing metadata', () => {
  const result = resolveEngineeringLocation('Open sheet A102 and show AHU-01', {
    analyses: [{
      documentId: 'doc-2',
      drawingSetId: 'set-2',
      projectId: 'project-2',
      sheets: [{ sheetId: 'sheet-2', pageNumber: 4, sheetNumber: 'A102', sheetTitle: 'Mechanical Plan' }],
      observations: [{ observationId: 'obs-eq-1', sheetId: 'sheet-2', kind: 'equipment-tag-text', value: 'AHU-01', region: { x: 0.6, y: 0.2, width: 0.1, height: 0.1 } }]
    }],
    documents: [{ id: 'doc-2', title: 'Mechanical' }]
  });

  assert.equal(result.status, 'resolved');
  assert.equal(result.kind, 'equipment');
  assert.equal(result.target?.sheetId, 'sheet-2');
  assert.equal(result.target?.observationId, 'obs-eq-1');
  assert.equal(result.label, 'AHU-01');
});

test('resolves a named room by matching room-name observations', () => {
  const result = resolveEngineeringLocation('Show the pharmacy', {
    analyses: [{
      documentId: 'doc-3',
      drawingSetId: 'set-3',
      projectId: 'project-3',
      sheets: [{ sheetId: 'sheet-3', pageNumber: 5, sheetNumber: 'A103' }],
      observations: [{ observationId: 'obs-room-name', sheetId: 'sheet-3', kind: 'room-name-text', value: 'Pharmacy', region: { x: 0.2, y: 0.3, width: 0.2, height: 0.2 } }]
    }]
  });

  assert.equal(result.status, 'resolved');
  assert.equal(result.kind, 'named-room');
  assert.equal(result.label, 'Pharmacy');
});

test('resolves specification sections by section number and preserves source metadata', () => {
  const result = resolveEngineeringLocation('Open section 23 09 00', {
    sections: [{
      id: 'sec-230900',
      documentId: 'doc-spec',
      number: '23 09 00',
      title: 'Instrumentation and Control',
      metadata: { provenance: 'spec-index' }
    }],
    documents: [{ id: 'doc-spec', title: 'CSI Specifications' }]
  });

  assert.equal(result.status, 'resolved');
  assert.equal(result.kind, 'spec-section');
  assert.equal(result.target?.documentId, 'doc-spec');
  assert.equal(result.target?.sectionId, 'sec-230900');
  assert.equal(result.target?.destination, 'knowledge');
});

test('returns an ambiguous result when multiple exact matches exist', () => {
  const result = resolveEngineeringLocation('Show room 101', {
    analyses: [{
      documentId: 'doc-4',
      drawingSetId: 'set-4',
      projectId: 'project-4',
      sheets: [{ sheetId: 'sheet-4', pageNumber: 6, sheetNumber: 'A104' }, { sheetId: 'sheet-5', pageNumber: 7, sheetNumber: 'A105' }],
      observations: [
        { observationId: 'obs-room-101-a', sheetId: 'sheet-4', kind: 'room-number-text', value: '101', region: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 } },
        { observationId: 'obs-room-101-b', sheetId: 'sheet-5', kind: 'room-number-text', value: '101', region: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 } }
      ]
    }]
  });

  assert.equal(result.status, 'ambiguous');
  assert.equal(result.kind, 'room');
  assert.equal(result.candidates.length, 2);
});

test('builds a Chief location presentation for an exact room match', () => {
  const presentation = buildChiefLocationPresentation({ id: 'message-7', role: 'assistant', content: 'Show me room 127B' }, {
    analyses: [{
      documentId: 'doc-7',
      drawingSetId: 'set-7',
      projectId: 'project-7',
      sheets: [{ sheetId: 'sheet-7', sheetNumber: 'E401', sheetTitle: 'Mechanical Plan', pageNumber: 4, discipline: 'Mechanical', primarySheetType: 'Plan' }],
      observations: [{ observationId: 'obs-127b', sheetId: 'sheet-7', kind: 'room-number-text', value: '127B', region: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 } }]
    }],
    documents: [{ id: 'doc-7', title: 'Mechanical Plans' }],
    sections: []
  });

  assert.ok(presentation);
  assert.equal(presentation.status, 'resolved');
  assert.equal(presentation.mode, 'drawing');
  assert.equal(presentation.actionLabel, 'Open in Drawings');
  assert.match(presentation.summary, /127B/);
});

test('builds a Chief location presentation for specification matches', () => {
  const presentation = buildChiefLocationPresentation({ id: 'message-8', role: 'assistant', content: 'Show specification 11 23 33' }, {
    analyses: [],
    documents: [{ id: 'doc-spec', title: 'Specifications' }],
    sections: [{ id: 'sec-112333', documentId: 'doc-spec', number: '11 23 33', title: 'Facility Fueling' }]
  });

  assert.ok(presentation);
  assert.equal(presentation.status, 'resolved');
  assert.equal(presentation.mode, 'specification');
  assert.equal(presentation.actionLabel, 'Open Specification');
});

test('builds an ambiguous Chief location presentation without guessing', () => {
  const presentation = buildChiefLocationPresentation({ id: 'message-9', role: 'assistant', content: 'Show room 101' }, {
    analyses: [{
      documentId: 'doc-8',
      drawingSetId: 'set-8',
      projectId: 'project-8',
      sheets: [{ sheetId: 'sheet-8', sheetNumber: 'A101' }, { sheetId: 'sheet-9', sheetNumber: 'A102' }],
      observations: [
        { observationId: 'obs-a', sheetId: 'sheet-8', kind: 'room-number-text', value: '101' },
        { observationId: 'obs-b', sheetId: 'sheet-9', kind: 'room-number-text', value: '101' }
      ]
    }],
    documents: [{ id: 'doc-8', title: 'Plans' }],
    sections: []
  });

  assert.equal(presentation.status, 'ambiguous');
  assert.equal(presentation.candidates.length, 2);
  assert.equal(presentation.actionLabel, 'Choose a matching location');
});

test('returns no match when nothing can be resolved from the query', () => {
  const result = resolveEngineeringLocation('Find the hidden thing', {
    analyses: [],
    sections: []
  });

  assert.equal(result.status, 'none');
  assert.equal(result.kind, 'none');
});

import { createDrawingTarget } from './drawing-navigation.js';
import { createActionTarget, normalizeActionTargetPayload } from './source-navigation.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const normalize = value => text(value).toLowerCase();
const list = value => Array.isArray(value) ? value : [];

function normalizeSectionNumber(value) {
  return text(value).replace(/[^0-9A-Za-z]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function inferRoomCandidates(analyses = []) {
  const candidates = [];
  for (const analysis of list(analyses)) {
    for (const observation of list(analysis.observations)) {
      if (observation.kind === 'room-number-text' || observation.kind === 'room-name-text') {
        candidates.push({
          analysis,
          observation,
          kind: observation.kind === 'room-number-text' ? 'room' : 'named-room',
          label: text(observation.value)
        });
      }
    }
  }
  return candidates;
}

function inferEquipmentCandidates(analyses = []) {
  const candidates = [];
  for (const analysis of list(analyses)) {
    for (const observation of list(analysis.observations)) {
      if (observation.kind === 'equipment-tag-text') {
        candidates.push({
          analysis,
          observation,
          kind: 'equipment',
          label: text(observation.value)
        });
      }
    }
  }
  return candidates;
}

function inferSheetCandidates(analyses = []) {
  const candidates = [];
  for (const analysis of list(analyses)) {
    for (const sheet of list(analysis.sheets)) {
      candidates.push({ analysis, sheet, kind: 'sheet', label: text(sheet.sheetNumber) || text(sheet.sheetTitle) || `Sheet ${text(sheet.pageNumber)}` });
    }
  }
  return candidates;
}

function inferSpecCandidates(sections = []) {
  return list(sections).map(section => ({
    section,
    kind: 'spec-section',
    label: text(section.number) || text(section.title) || text(section.id)
  }));
}

export function buildChiefLocationPresentation(question = '', options = {}) {
  const normalizedQuestion = typeof question === 'string' ? question : question?.content || '';
  const resolvedOptions = typeof question === 'string' ? options : (options || {});
  const { analyses = [], documents = [], sections = [], returnTarget = '' } = resolvedOptions;
  const result = resolveEngineeringLocation(normalizedQuestion, { analyses, documents, sections, returnTarget });
  if (result.status === 'resolved') {
    const summary = result.kind === 'spec-section'
      ? `Resolved ${result.label} as a specification section.`
      : `Located ${result.label} in the project drawings.`;
    return {
      status: 'resolved',
      mode: result.kind === 'spec-section' ? 'specification' : 'drawing',
      title: 'Location resolved',
      summary,
      detail: result.kind === 'spec-section'
        ? 'Open the exact specification section in the project library.'
        : 'Open the exact drawing target and review the matched location.',
      actionLabel: result.kind === 'spec-section' ? 'Open Specification' : 'Open in Drawings',
      actionTarget: result.target,
      candidates: result.candidates,
      target: result.target
    };
  }
  if (result.status === 'ambiguous') {
    return {
      status: 'ambiguous',
      mode: 'ambiguous',
      title: 'Multiple locations match',
      summary: `Multiple possible locations match ${result.label || 'your request'}.`,
      detail: 'Choose the exact match you want to open from the options below.',
      actionLabel: 'Choose a matching location',
      actionTarget: null,
      candidates: result.candidates,
      target: null
    };
  }
  return {
    status: 'none',
    mode: 'none',
    title: 'No location matched',
    summary: 'No exact location could be resolved from that question.',
    detail: 'Try a room number, room name, equipment tag, sheet, or specification section.',
    actionLabel: 'Try a room, sheet, or section',
    actionTarget: null,
    candidates: [],
    target: null
  };
}

export function resolveEngineeringLocation(query = '', {
  analyses = [],
  documents = [],
  sections = [],
  returnTarget = ''
} = {}) {
  const rawQuery = text(query);
  const normalizedQuery = normalize(rawQuery);

  if (!rawQuery) return { status: 'none', kind: 'none', target: null, label: '', candidates: [] };

  const roomQuery = rawQuery.match(/\broom\s+([a-z0-9-]+)\b/i);
  const namedRoomQuery = rawQuery.match(/\b(?:show|open|find|go to|where is)\s+(?:the\s+)?([a-z][a-z0-9\s&/-]{1,40})\b/i);
  const equipmentQuery = rawQuery.match(/(?:show|display|locate|find|identify|where is)\s+(?:the\s+)?([a-z0-9._/-]+)\b/i)?.[1];
  const sheetQuery = rawQuery.match(/\bsheet\s+([a-z0-9.-]+)\b/i);
  const specQuery = rawQuery.match(/\b(?:section|specification|spec)\s+([0-9a-z]+(?:\s+[0-9a-z]+){0,3})\b/i);

  const roomCandidates = inferRoomCandidates(analyses).filter(candidate => {
    const token = roomQuery ? normalize(roomQuery[1]) : '';
    return !roomQuery || normalize(candidate.label) === token || normalize(candidate.label).includes(token);
  });

  if (roomQuery && roomCandidates.length) {
    const exactMatches = roomCandidates.filter(candidate => normalize(candidate.label) === normalize(roomQuery[1]));
    const resolved = exactMatches.length ? exactMatches[0] : roomCandidates[0];
    const candidates = exactMatches.length ? exactMatches : roomCandidates;
    return buildDrawingResolution({
      query: rawQuery,
      resolved,
      candidates,
      kind: resolved.kind,
      label: resolved.label,
      returnTarget,
      documents,
      analyses
    });
  }

  if (namedRoomQuery) {
    const roomName = namedRoomQuery[1].trim();
    const exactMatches = inferRoomCandidates(analyses).filter(candidate => candidate.kind === 'named-room' && normalize(candidate.label) === normalize(roomName));
    if (exactMatches.length) {
      return buildDrawingResolution({
        query: rawQuery,
        resolved: exactMatches[0],
        candidates: exactMatches,
        kind: 'named-room',
        label: exactMatches[0].label,
        returnTarget,
        documents,
        analyses
      });
    }
  }

  if (equipmentQuery) {
    const token = normalize(equipmentQuery);
    const exactMatches = inferEquipmentCandidates(analyses).filter(candidate => normalize(candidate.label) === token);
    if (exactMatches.length) {
      const resolved = exactMatches[0];
      return buildDrawingResolution({
        query: rawQuery,
        resolved,
        candidates: exactMatches,
        kind: 'equipment',
        label: resolved.label,
        returnTarget,
        documents,
        analyses
      });
    }
  }

  if (sheetQuery) {
    const exactMatches = inferSheetCandidates(analyses).filter(candidate => normalize(candidate.label) === normalize(sheetQuery[1]));
    if (exactMatches.length) {
      const resolved = exactMatches[0];
      return buildDrawingResolution({
        query: rawQuery,
        resolved,
        candidates: exactMatches,
        kind: 'sheet',
        label: resolved.label,
        returnTarget,
        documents,
        analyses
      });
    }
  }

  if (specQuery) {
    const token = normalizeSectionNumber(specQuery[1]);
    const exactMatches = inferSpecCandidates(sections).filter(candidate => normalizeSectionNumber(candidate.section?.number || candidate.section?.title || '') === token);
    if (exactMatches.length) {
      const resolved = exactMatches[0];
      return buildSpecResolution({ resolved, candidates: exactMatches, returnTarget });
    }
  }

  if (normalizedQuery.includes('room') && !roomQuery) {
    return { status: 'none', kind: 'none', target: null, label: '', candidates: [] };
  }

  if (roomCandidates.length) {
    return { status: 'ambiguous', kind: 'room', target: null, label: roomQuery ? roomQuery[1] : '', candidates: roomCandidates.map(item => ({ label: item.label, kind: item.kind })) };
  }

  if (inferEquipmentCandidates(analyses).length) {
    return { status: 'ambiguous', kind: 'equipment', target: null, label: '', candidates: inferEquipmentCandidates(analyses).map(item => ({ label: item.label, kind: item.kind })) };
  }

  return { status: 'none', kind: 'none', target: null, label: '', candidates: [] };
}

function buildDrawingResolution({ resolved, candidates, kind, label, returnTarget, documents, analyses }) {
  const analysis = resolved.analysis;
  const observation = resolved.observation;
  const sheet = (analysis?.sheets || []).find(item => text(item.sheetId) === text(observation?.sheetId)) || null;
  const document = documents.find(item => text(item.id) === text(analysis?.documentId)) || null;
  const target = createDrawingTarget({
    projectId: analysis?.projectId,
    documentId: analysis?.documentId,
    drawingSetId: analysis?.drawingSetId,
    sheetId: observation?.sheetId || sheet?.sheetId || '',
    pageNumber: sheet?.pageNumber || null,
    sheetNumber: sheet?.sheetNumber || '',
    observationId: observation?.observationId || '',
    region: observation?.region || null,
    origin: 'engineering-locator',
    returnTarget: text(returnTarget)
  });

  return {
    status: candidates.length > 1 ? 'ambiguous' : 'resolved',
    kind,
    label,
    target,
    document,
    sheet,
    observation,
    candidates: candidates.map(item => ({ label: item.label, kind: item.kind }))
  };
}

function buildSpecResolution({ resolved, candidates, returnTarget }) {
  const section = resolved.section;
  const sourceTarget = createActionTarget({
    projectId: '',
    libraryId: '',
    documentId: section?.documentId || '',
    sectionId: section?.id || '',
    destination: 'knowledge',
    origin: 'engineering-locator',
    returnTarget: text(returnTarget)
  });

  return {
    status: candidates.length > 1 ? 'ambiguous' : 'resolved',
    kind: 'spec-section',
    label: text(section?.number || section?.title || section?.id),
    target: sourceTarget,
    section,
    candidates: candidates.map(item => ({ label: item.label, kind: item.kind }))
  };
}

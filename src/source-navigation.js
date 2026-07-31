import { textValue } from './data-model.js';
import { normalizeRegion } from './pdf-source.js';

const safeId = value => textValue(value).trim();

export function sourceAnchorId(scope, identifier) {
  const prefix = safeId(scope)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'source';
  const encoded = [...safeId(identifier)]
    .map(character => {
      if (/^[a-zA-Z0-9_-]$/.test(character)) return character;
      return `_${character.codePointAt(0).toString(16)}_`;
    })
    .join('') || 'unavailable';

  return `mc-${prefix}-${encoded}`;
}

export function createSourceTarget({
  projectId,
  libraryId,
  documentId,
  sectionId,
  evidenceId,
  evidenceIndex,
  originatingWorkspace = 'evidence',
  originatingMessageId,
  destination,
  pageNumber,
  sheetId,
  sheetNumber,
  region,
  observationId
} = {}) {
  const targetDocumentId = safeId(documentId);
  const targetSectionId = safeId(sectionId);

  if (!targetDocumentId) return null;

  return {
    projectId: safeId(projectId),
    libraryId: safeId(libraryId),
    documentId: targetDocumentId,
    sectionId: targetSectionId,
    evidenceId: safeId(evidenceId),
    evidenceIndex: Number.isInteger(Number(evidenceIndex))
      ? Number(evidenceIndex)
      : null,
    originatingWorkspace: safeId(originatingWorkspace),
    originatingMessageId: safeId(originatingMessageId),
    destination: safeId(destination),
    pageNumber: Number.isInteger(Number(pageNumber)) && Number(pageNumber) > 0 ? Number(pageNumber) : null,
    sheetId: safeId(sheetId),
    sheetNumber: safeId(sheetNumber),
    region: region ? normalizeRegion(region) : null,
    observationId: safeId(observationId)
  };
}

export function resolveSourceTarget(target, {
  projects = [],
  libraries = [],
  documents = [],
  sections = [],
  analyses = [],
  sourceFiles = []
} = {}) {
  if (!target?.documentId) {
    return { status: 'none', target: null, document: null, section: null };
  }

  const document = documents.find(item =>
    safeId(item?.id) === target.documentId
  );

  if (!document) {
    return { status: 'missing-document', target, document: null, section: null };
  }

  const project = target.projectId
    ? projects.find(item => safeId(item?.id) === target.projectId) || null
    : null;
  const documentLibraryId = safeId(document.libraryId);
  const library = target.libraryId
    ? libraries.find(item =>
        safeId(item?.id) === target.libraryId &&
        safeId(item?.id) === documentLibraryId
      ) || null
    : null;
  const section = target.sectionId
    ? sections.find(item =>
        safeId(item?.id) === target.sectionId &&
        safeId(item?.documentId) === target.documentId
      ) || null
    : null;
  const sourceFile = sourceFiles.find(item => safeId(item?.documentId) === target.documentId) || null;
  const analysis = analyses.find(item => safeId(item?.documentId) === target.documentId) || null;
  const sheet = target.sheetId
    ? analysis?.sheets?.find(item => safeId(item?.sheetId) === target.sheetId) || null
    : target.pageNumber
      ? analysis?.sheets?.find(item => Number(item?.pageNumber) === target.pageNumber) || null
      : null;
  const observation = target.observationId
    ? analysis?.observations?.find(item => safeId(item?.observationId) === target.observationId && (!sheet || item.sheetId === sheet.sheetId)) || null
    : null;

  let status = section ? 'section' : 'missing-section';
  if (target.sheetId || target.pageNumber) {
    status = !sourceFile ? 'missing-source' : !sheet ? 'missing-page' : target.observationId && !observation ? 'missing-observation' : observation || target.region ? 'drawing-region' : 'drawing-sheet';
  }

  return {
    status,
    target,
    document,
    section,
    project,
    library, sourceFile, analysis, sheet, observation,
    validProjectId: project ? target.projectId : '',
    validLibraryId: library ? target.libraryId : ''
  };
}

export function sourceNavigationActions(value = {}) {
  const documentId = safeId(value.documentId);
  const sectionId = safeId(value.sectionId);

  const result = {
    viewInDocument: Boolean(documentId && sectionId),
    openSourceInspector: Boolean(documentId && sectionId)
  };
  if (documentId && (safeId(value.sheetId) || Number(value.pageNumber) > 0)) result.openDrawing = true;
  return result;
}

export function sourceNavigationDestination(target, destination) {
  if (!target?.documentId || !['knowledge', 'sources'].includes(destination)) {
    return null;
  }

  return { ...target, destination };
}

export function sourceScrollOptions(reducedMotion = false) {
  return {
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'center'
  };
}

export function answerAnchorId(messageId) {
  return sourceAnchorId('answer', messageId);
}

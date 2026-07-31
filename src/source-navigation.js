import { textValue } from './data-model.js';

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
  destination
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
    destination: safeId(destination)
  };
}

export function resolveSourceTarget(target, {
  projects = [],
  libraries = [],
  documents = [],
  sections = []
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

  return {
    status: section ? 'section' : 'missing-section',
    target,
    document,
    section,
    project,
    library,
    validProjectId: project ? target.projectId : '',
    validLibraryId: library ? target.libraryId : ''
  };
}

export function sourceNavigationActions(value = {}) {
  const documentId = safeId(value.documentId);
  const sectionId = safeId(value.sectionId);

  return {
    viewInDocument: Boolean(documentId && sectionId),
    openSourceInspector: Boolean(documentId && sectionId)
  };
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

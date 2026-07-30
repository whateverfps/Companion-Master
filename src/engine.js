import { parseFiles } from './parsers.js';
import {
  retrieve,
  buildContext,
  scoreAnswer,
  verifyCitations
} from './retrieval.js';
import {
  logger,
  moduleStatus
} from './diagnostics.js';
import { analyzeCorpus } from './core/reasoning.js';

const STATE_KEY = 'mc-master-state-v2';
const DOC_DB = 'mc-master-documents-v2';
const APP_VERSION = '2.8.1';

const defaults = {
  settings: {
    openaiUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4.1-mini',
    openaiKey: '',
    timeout: 180000,
    mode: 'offline',
    topK: 10
  },
  projects: [
    {
      id: 'general',
      name: 'General'
    }
  ],
  activeProject: 'general',
  libraries: [
    {
      id: 'general-library',
      projectId: 'general',
      name: 'General Library',
      description: 'Default project knowledge library',
      enabled: true,
      createdAt: new Date().toISOString()
    }
  ],
  activeLibrary: 'general-library',
  chat: [],
  evaluations: []
};

let state = loadState();

moduleStatus('State Manager', 'ready', {
  summary: 'State loaded'
});

logger.info('Application state loaded', {
  projects: state.projects.length,
  activeProject: state.activeProject
});

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');

    const loaded = {
      ...structuredClone(defaults),
      ...stored,
      settings: {
        ...structuredClone(defaults.settings),
        ...(stored.settings || {})
      }
    };

    loaded.projects = Array.isArray(loaded.projects)
      ? loaded.projects
      : structuredClone(defaults.projects);

    loaded.libraries = Array.isArray(loaded.libraries)
      ? loaded.libraries
      : structuredClone(defaults.libraries);

    loaded.chat = Array.isArray(loaded.chat)
      ? loaded.chat
      : [];

    loaded.evaluations = Array.isArray(loaded.evaluations)
      ? loaded.evaluations
      : [];

    for (const project of loaded.projects) {
      const hasLibrary = loaded.libraries.some(
        library => library.projectId === project.id
      );

      if (!hasLibrary) {
        loaded.libraries.push({
          id: uid(),
          projectId: project.id,
          name: `${project.name} Library`,
          description: 'Project knowledge library',
          enabled: true,
          createdAt: new Date().toISOString()
        });
      }
    }

    const activeLibraryIsValid = loaded.libraries.some(
      library =>
        library.id === loaded.activeLibrary &&
        library.projectId === loaded.activeProject
    );

    if (!activeLibraryIsValid) {
      loaded.activeLibrary =
        loaded.libraries.find(
          library => library.projectId === loaded.activeProject
        )?.id || null;
    }

    return loaded;
  } catch (error) {
    logger.warning('Stored state could not be loaded', {
      message: error.message
    });

    return structuredClone(defaults);
  }
}

function save() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function uid() {
  return crypto.randomUUID();
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DOC_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', {
          keyPath: 'id'
        });
      }

      if (!db.objectStoreNames.contains('sections')) {
        const sections = db.createObjectStore('sections', {
          keyPath: 'id'
        });

        sections.createIndex('projectId', 'projectId');
        sections.createIndex('documentId', 'documentId');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx(store, mode, operation) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    const output = operation(objectStore);

    transaction.oncomplete = () => {
      db.close();
      resolve(output);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Database transaction aborted.'));
    };
  });
}

async function all(store, index = null, key = null) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readonly');

    const source = index
      ? transaction.objectStore(store).index(index)
      : transaction.objectStore(store);

    const request = key === null
      ? source.getAll()
      : source.getAll(key);

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function putMany(store, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);

    for (const item of items) {
      objectStore.put(item);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Database transaction aborted.'));
    };
  });
}

async function delByIndex(store, index, key) {
  const rows = await all(store, index, key);

  if (!rows.length) {
    return;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);

    for (const row of rows) {
      objectStore.delete(row.id);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export const engine = {
  state() {
    return structuredClone(state);
  },

  async healthCheck() {
    const db = await openDB();
    db.close();
    return true;
  },

  async testConnection() {
    const settings = state.settings;

    if (!settings.openaiKey) {
      throw new Error('Enter an OpenAI API key first.');
    }

    logger.info('OpenAI connection test started', {
      model: settings.openaiModel
    });

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(settings.timeout, 30000)
    );

    try {
      const response = await fetch(
        `${settings.openaiUrl.replace(/\/$/, '')}/models`,
        {
          headers: {
            Authorization: `Bearer ${settings.openaiKey}`
          },
          signal: controller.signal
        }
      );

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          responseBody?.error?.message ||
          `Connection failed (${response.status})`
        );
      }

      logger.info('OpenAI connection test passed');

      return {
        ok: true
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async resetApplication() {
    logger.warning('Application reset requested');

    localStorage.removeItem(STATE_KEY);

    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DOC_DB);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });

    return true;
  },

  saveSettings(patch) {
    state.settings = {
      ...state.settings,
      ...patch
    };

    save();

    logger.info('Settings updated', {
      keys: Object.keys(patch).filter(key => key !== 'openaiKey')
    });
  },

  setProject(id) {
    const projectExists = state.projects.some(project => project.id === id);

    if (!projectExists) {
      throw new Error('Project not found.');
    }

    state.activeProject = id;

    state.activeLibrary =
      state.libraries.find(
        library =>
          library.projectId === id &&
          library.enabled
      )?.id ||
      state.libraries.find(
        library => library.projectId === id
      )?.id ||
      null;

    save();

    logger.info('Active project changed', {
      id
    });
  },

  addProject(name) {
    const cleanedName = String(name || '').trim();

    if (!cleanedName) {
      throw new Error('Enter a project name.');
    }

    const project = {
      id: uid(),
      name: cleanedName
    };

    const library = {
      id: uid(),
      projectId: project.id,
      name: `${project.name} Library`,
      description: 'Project knowledge library',
      enabled: true,
      createdAt: new Date().toISOString()
    };

    state.projects.push(project);
    state.libraries.push(library);
    state.activeProject = project.id;
    state.activeLibrary = library.id;

    save();

    logger.info('Project created', {
      id: project.id,
      name: project.name
    });

    return structuredClone(project);
  },

  async deleteProject(id) {
    if (id === 'general') {
      throw new Error('General cannot be deleted.');
    }

    await delByIndex('sections', 'projectId', id);

    const documents = await all('documents');

    for (const document of documents.filter(
      item => item.projectId === id
    )) {
      await tx(
        'documents',
        'readwrite',
        store => store.delete(document.id)
      );
    }

    state.projects = state.projects.filter(
      project => project.id !== id
    );

    state.libraries = state.libraries.filter(
      library => library.projectId !== id
    );

    state.activeProject = 'general';

    state.activeLibrary =
      state.libraries.find(
        library => library.projectId === 'general'
      )?.id || null;

    save();
  },

  libraries() {
    return structuredClone(
      state.libraries.filter(
        library => library.projectId === state.activeProject
      )
    );
  },

  setLibrary(id) {
    const libraryExists = state.libraries.some(
      library =>
        library.id === id &&
        library.projectId === state.activeProject
    );

    if (!libraryExists) {
      throw new Error('Library not found.');
    }

    state.activeLibrary = id;
    save();
  },

  addLibrary(name, description = '') {
    const cleanedName = String(name || '').trim();

    if (!cleanedName) {
      throw new Error('Enter a library name.');
    }

    const library = {
      id: uid(),
      projectId: state.activeProject,
      name: cleanedName,
      description: String(description || '').trim(),
      enabled: true,
      createdAt: new Date().toISOString()
    };

    state.libraries.push(library);
    state.activeLibrary = library.id;

    save();

    logger.info('Knowledge library created', {
      name: library.name
    });

    return structuredClone(library);
  },

  updateLibrary(id, patch) {
    const library = state.libraries.find(
      item =>
        item.id === id &&
        item.projectId === state.activeProject
    );

    if (!library) {
      throw new Error('Library not found.');
    }

    Object.assign(library, patch, {
      updatedAt: new Date().toISOString()
    });

    if (!library.enabled && state.activeLibrary === id) {
      state.activeLibrary =
        state.libraries.find(
          item =>
            item.projectId === state.activeProject &&
            item.enabled &&
            item.id !== id
        )?.id || id;
    }

    save();

    return structuredClone(library);
  },

  async deleteLibrary(id) {
    const projectLibraries = state.libraries.filter(
      library => library.projectId === state.activeProject
    );

    if (projectLibraries.length <= 1) {
      throw new Error('Each project must keep at least one library.');
    }

    const documents = (await all('documents')).filter(
      document => document.libraryId === id
    );

    for (const document of documents) {
      await this.removeDocument(document.id);
    }

    state.libraries = state.libraries.filter(
      library => library.id !== id
    );

    if (state.activeLibrary === id) {
      state.activeLibrary =
        state.libraries.find(
          library => library.projectId === state.activeProject
        )?.id || null;
    }

    save();
  },

  async documents(libraryId = null) {
    return (await all('documents')).filter(
      document =>
        document.projectId === state.activeProject &&
        (!libraryId || document.libraryId === libraryId)
    );
  },

  async sections() {
    return all(
      'sections',
      'projectId',
      state.activeProject
    );
  },

  async ingest(
    files,
    onProgress,
    libraryId = state.activeLibrary
  ) {
    if (!libraryId) {
      throw new Error(
        'Create or select a knowledge library first.'
      );
    }

    const existing = await this.documents();
    const incoming = [...files];

    const accepted = incoming.filter(
      file =>
        !existing.some(
          document =>
            document.name === file.name &&
            document.size === file.size
        )
    );

    const skipped = incoming
      .filter(file => !accepted.includes(file))
      .map(file => ({
        name: file.name,
        reason: 'Duplicate name and file size'
      }));

    logger.info('Document ingestion started', {
      files: accepted.map(file => file.name),
      libraryId,
      skipped: skipped.length
    });

    try {
      const parsed = await parseFiles(
        accepted,
        state.activeProject,
        onProgress,
        libraryId
      );

      await putMany('documents', parsed.documents);
      await putMany('sections', parsed.sections);

      logger.info('Document ingestion completed', {
        documents: parsed.documents.length,
        sections: parsed.sections.length,
        skipped: skipped.length
      });

      return {
        ...parsed,
        skipped
      };
    } catch (error) {
      logger.error('Document ingestion failed', {
        message: error.message
      });

      throw error;
    }
  },

  async removeDocument(id) {
    await delByIndex(
      'sections',
      'documentId',
      id
    );

    await tx(
      'documents',
      'readwrite',
      store => store.delete(id)
    );

    logger.info('Document removed', {
      id
    });
  },

  async search(query) {
    const sections = await this.sections();

    const hits = retrieve(
      query,
      sections,
      state.settings.topK
    );

    logger.info('Retrieval completed', {
      query,
      sectionsSearched: sections.length,
      hits: hits.length
    });

    return hits;
  },

  async extractRequirements(query = '', options = {}) {
    const sections = await this.sections();
    const result = extractRequirementsFromSections(sections, query, {
      limit: options.limit || 100,
      includeAdvisory: options.includeAdvisory !== false,
      includeNegative: options.includeNegative !== false
    });

    logger.info('Requirement extraction completed', {
      query,
      sectionsSearched: sections.length,
      requirements: result.requirements.length,
      mandatory: result.summary.mandatory,
      prohibited: result.summary.prohibited
    });

    return structuredClone(result);
  },

  async extractDefinitions(query = '', options = {}) {
    const sections = await this.sections();
    const result = extractDefinitionsFromSections(sections, query, {
      limit: options.limit || 100
    });

    logger.info('Definition extraction completed', {
      query,
      sectionsSearched: sections.length,
      definitions: result.definitions.length
    });

    return structuredClone(result);
  },

  async compareSources(query, options = {}) {
    const cleanedQuery = String(query || '').trim();

    if (!cleanedQuery) {
      throw new Error('Enter a topic or question to compare.');
    }

    const sections = await this.sections();
    const hits = retrieve(
      cleanedQuery,
      sections,
      Math.max(Number(options.topK || state.settings.topK || 10), 10)
    );

    const comparison = compareRetrievedSources(cleanedQuery, hits, {
      maximumSources: options.maximumSources || 8
    });

    logger.info('Source comparison completed', {
      query: cleanedQuery,
      hits: hits.length,
      agreements: comparison.agreements.length,
      differences: comparison.differences.length,
      conflicts: comparison.conflicts.length
    });

    return structuredClone(comparison);
  },

  async analyzeKnowledge(query, options = {}) {
    const cleanedQuery = String(query || '').trim();

    if (!cleanedQuery) {
      throw new Error('Enter a topic or question to analyze.');
    }

    const sections = await this.sections();
    const hits = retrieve(
      cleanedQuery,
      sections,
      options.topK || state.settings.topK
    );

    const requirements = extractRequirementsFromSections(hits, cleanedQuery, {
      limit: options.requirementLimit || 50,
      includeAdvisory: true,
      includeNegative: true
    });

    const definitions = extractDefinitionsFromSections(hits, cleanedQuery, {
      limit: options.definitionLimit || 50
    });

    const comparison = compareRetrievedSources(cleanedQuery, hits, {
      maximumSources: options.maximumSources || 8
    });

    return structuredClone({
      query: cleanedQuery,
      generatedAt: new Date().toISOString(),
      retrieval: {
        hits,
        meta: hits.meta || {}
      },
      requirements,
      definitions,
      comparison
    });
  },

  async ask(prompt, mode = state.settings.mode) {
    const cleanedPrompt = String(prompt || '').trim();

    if (!cleanedPrompt) {
      throw new Error('Enter a question.');
    }

    logger.info('Analysis started', {
      mode,
      promptLength: cleanedPrompt.length
    });

    const hits = await this.search(cleanedPrompt);

    let answer;

    if (mode === 'offline') {
      answer = callOffline(cleanedPrompt, hits);
    } else {
      let structuredAnalysis = '';

      try {
        const analysis = analyzeCorpus(cleanedPrompt, hits, {
          preset: 'answer',
          includeContext: false
        });

        structuredAnalysis = buildStructuredAnalysisBlock(analysis, hits);
      } catch (error) {
        logger.warning('Structured analysis unavailable', {
          message: error?.message || String(error)
        });
      }

      const evidenceContext = buildContext(hits);
      const context = structuredAnalysis
        ? `${evidenceContext}\n\n${structuredAnalysis}`
        : evidenceContext;

      answer = await callAI(
        cleanedPrompt,
        context,
        mode
      );
    }

    const citationVerification = verifyCitations(
      answer.content,
      hits
    );

    const message = {
      id: uid(),
      role: 'assistant',
      content: answer.content,
      citations: answer.citations,
      hits,
      retrievalMeta: hits.meta || {},
      citationVerification,
      createdAt: new Date().toISOString(),
      mode
    };

    state.chat.push({
      id: uid(),
      role: 'user',
      content: cleanedPrompt,
      createdAt: new Date().toISOString()
    });

    state.chat.push(message);
    save();

    logger.info('Analysis completed', {
      mode,
      hits: hits.length,
      citations: message.citations.length,
      citationCoverage: citationVerification.coverage,
      conflicts: hits.meta?.conflicts?.length || 0
    });

    return structuredClone(message);
  },

  clearChat() {
    state.chat = [];
    save();
  },

  addEvaluation(evaluation) {
    state.evaluations.push({
      id: uid(),
      ...evaluation
    });

    save();
  },

  removeEvaluation(id) {
    state.evaluations = state.evaluations.filter(
      evaluation => evaluation.id !== id
    );

    save();
  },

  async runEvaluation(evaluation) {
    const hits = await this.search(evaluation.question);
    let answer;

    if (state.settings.openaiKey) {
      answer = await callAI(
        evaluation.question,
        buildContext(hits),
        'source'
      );
    } else {
      answer = callOffline(
        evaluation.question,
        hits
      );
    }

    return scoreAnswer(
      answer.content,
      evaluation,
      hits
    );
  },

  async exportProject() {
    return {
      manifest: {
        version: APP_VERSION,
        project: state.projects.find(
          project => project.id === state.activeProject
        ),
        exportedAt: new Date().toISOString()
      },
      libraries: this.libraries(),
      documents: await this.documents(),
      sections: await this.sections(),
      evaluations: structuredClone(state.evaluations)
    };
  },

  async importProject(data) {
    if (
      !data?.manifest ||
      !Array.isArray(data.documents) ||
      !Array.isArray(data.sections)
    ) {
      throw new Error(
        'Invalid Mission Companion project file.'
      );
    }

    const importedProject = this.addProject(
      `${data.manifest.project?.name || 'Imported'} (Imported)`
    );

    const importedLibraries = Array.isArray(data.libraries)
      ? data.libraries
      : [];

    const libraryIdMap = new Map();

    if (importedLibraries.length) {
      const defaultLibrary = state.libraries.find(
        library =>
          library.projectId === importedProject.id
      );

      for (const sourceLibrary of importedLibraries) {
        const newLibraryId =
          sourceLibrary === importedLibraries[0] &&
          defaultLibrary
            ? defaultLibrary.id
            : uid();

        libraryIdMap.set(
          sourceLibrary.id,
          newLibraryId
        );

        if (
          !state.libraries.some(
            library => library.id === newLibraryId
          )
        ) {
          state.libraries.push({
            ...sourceLibrary,
            id: newLibraryId,
            projectId: importedProject.id,
            createdAt:
              sourceLibrary.createdAt ||
              new Date().toISOString()
          });
        } else if (defaultLibrary) {
          defaultLibrary.name =
            sourceLibrary.name ||
            defaultLibrary.name;

          defaultLibrary.description =
            sourceLibrary.description ||
            defaultLibrary.description;
        }
      }
    }

    const fallbackLibraryId =
      state.libraries.find(
        library =>
          library.projectId === importedProject.id
      )?.id || null;

    const documentIdMap = new Map();

    const importedDocuments = data.documents.map(document => {
      const newId = uid();

      documentIdMap.set(
        document.id,
        newId
      );

      return {
        ...document,
        id: newId,
        projectId: importedProject.id,
        libraryId:
          libraryIdMap.get(document.libraryId) ||
          fallbackLibraryId
      };
    });

    await putMany(
      'documents',
      importedDocuments
    );

    const importedSections = data.sections.map(section => ({
      ...section,
      id: uid(),
      projectId: importedProject.id,
      libraryId:
        libraryIdMap.get(section.libraryId) ||
        fallbackLibraryId,
      documentId:
        documentIdMap.get(section.documentId) ||
        section.documentId
    }));

    await putMany(
      'sections',
      importedSections
    );

    state.evaluations.push(
      ...(Array.isArray(data.evaluations)
        ? data.evaluations.map(evaluation => ({
            ...evaluation,
            id: uid()
          }))
        : [])
    );

    save();

    logger.info('Project imported', {
      projectId: importedProject.id,
      documents: importedDocuments.length,
      sections: importedSections.length
    });

    return structuredClone(importedProject);
  }
};

function compactText(value, maximumLength) {
  return truncateText(
    String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim(),
    maximumLength
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactStringList(values) {
  return safeArray(values)
    .filter(value => value !== null && value !== undefined)
    .slice(0, 5)
    .map(value => compactText(value, 160))
    .filter(Boolean);
}

function buildStructuredAnalysisBlock(analysis, hits) {
  const records = value => safeArray(value)
    .filter(record => record && typeof record === 'object' && !Array.isArray(record));

  const validSources = new Set(
    safeArray(hits)
      .map(hit => Number(hit?.sourceNumber))
      .filter(sourceNumber => Number.isInteger(sourceNumber) && sourceNumber > 0)
  );

  const sourceNumber = record => {
    const value = Number(record?.sourceNumber);
    return Number.isInteger(value) && value > 0 && validSources.has(value)
      ? value
      : null;
  };

  const sourceBacked = (value, limit, project) => records(value)
    .filter(record => sourceNumber(record) !== null)
    .slice(0, limit)
    .map(record => project(record, sourceNumber(record)));

  const payload = {
    sourceBacked: {
      requirements: sourceBacked(
        analysis?.requirements?.requirements,
        12,
        (record, source) => ({
          statement: compactText(record.statement, 300),
          type: compactText(record.type, 60),
          responsibleParty: compactText(record.responsibleParty, 160),
          timing: compactText(record.timing, 200),
          deliverables: compactStringList(record.deliverables),
          exceptions: compactStringList(record.exceptions),
          sourceNumber: source
        })
      ),
      acceptance: sourceBacked(
        analysis?.acceptance?.criteria,
        8,
        (record, source) => ({
          statement: compactText(record.statement, 300),
          sourceNumber: source
        })
      ),
      exceptions: sourceBacked(
        analysis?.exceptions?.exceptions,
        8,
        (record, source) => ({
          statement: compactText(record.statement, 300),
          sourceNumber: source
        })
      )
    },
    aggregates: {
      responsibilities: records(analysis?.responsibilities?.responsibilities)
        .slice(0, 8)
        .map(record => ({
          party: compactText(record.party, 160),
          requirementCount: Number.isFinite(Number(record.requirementCount))
            ? Number(record.requirementCount)
            : null
        })),
      deliverables: records(analysis?.deliverables?.deliverables)
        .slice(0, 8)
        .map(record => ({
          name: compactText(record.name, 200),
          type: compactText(record.type, 60),
          responsibleParties: compactStringList(record.responsibleParties)
        }))
    }
  };

  const header = [
    'STRUCTURED ANALYSIS',
    'This block is derived from the retrieved evidence.',
    'It is supplemental and is not an independent source.',
    'Any source-backed claim must cite the corresponding original [S#] source.',
    'Aggregate analysis summarizes the source-backed records and must not be treated as direct evidence.',
    'The evidence context remains authoritative.'
  ].join('\n');

  const removalOrder = [
    payload.aggregates.deliverables,
    payload.aggregates.responsibilities,
    payload.sourceBacked.exceptions,
    payload.sourceBacked.acceptance,
    payload.sourceBacked.requirements
  ];

  let block = `${header}\n${JSON.stringify(payload)}`;

  for (const category of removalOrder) {
    while (block.length > 16000 && category.length) {
      category.pop();
      block = `${header}\nSTRUCTURED ANALYSIS TRUNCATED\n${JSON.stringify(payload)}`;
    }
  }

  return block;
}

function callOffline(prompt, hits) {
  if (!hits.length) {
    return {
      content: [
        '## Offline evidence report',
        '',
        `**Question:** ${prompt}`,
        '',
        'No relevant project evidence was retrieved.',
        '',
        '### Evidence gaps',
        '',
        'The indexed knowledge base does not currently contain enough matching material to answer this question.'
      ].join('\n'),
      citations: []
    };
  }

  const intent = detectOfflineAnalysisIntent(prompt);

  if (intent === 'requirements') {
    return buildOfflineRequirementReport(prompt, hits);
  }

  if (intent === 'definitions') {
    return buildOfflineDefinitionReport(prompt, hits);
  }

  if (intent === 'comparison') {
    return buildOfflineComparisonReport(prompt, hits);
  }

  return buildOfflineEvidenceReport(prompt, hits);
}

function buildOfflineEvidenceReport(prompt, hits) {
  const evidenceBlocks = hits
    .slice(0, Math.min(hits.length, 6))
    .map(hit => formatOfflineSource(hit, prompt));

  const citations = hits
    .slice(0, Math.min(hits.length, 6))
    .map(hit => hit.sourceNumber);

  const conflicts = hits.meta?.conflicts || [];
  const conflictBlock = conflicts.length
    ? [
        '',
        '### Potential source conflicts',
        '',
        ...conflicts.map(
          conflict =>
            `- [S${conflict.sourceA}] may conflict with [S${conflict.sourceB}]: ${conflict.reason}.`
        )
      ]
    : [
        '',
        '### Potential source conflicts',
        '',
        'No opposing requirement language was detected among the retrieved sources.'
      ];

  const confidence = calculateOfflineConfidence(hits);
  const content = [
    '## Offline evidence report',
    '',
    `**Question:** ${prompt}`,
    '',
    `**Evidence confidence:** ${confidence.label} (${confidence.score}%)`,
    '',
    'This report was assembled locally from indexed project evidence. No AI model was used to create a synthesized conclusion.',
    '',
    '### Most relevant evidence',
    '',
    ...evidenceBlocks,
    ...conflictBlock,
    '',
    '### Evidence gaps',
    '',
    'Offline mode presents the strongest matching source language but does not infer facts that are not expressly contained in the retrieved sections.'
  ].join('\n');

  return {
    content,
    citations: [...new Set(citations)]
  };
}

const REQUIREMENT_PATTERNS = [
  { type: 'prohibited', strength: 100, pattern: /\bshall not\b/i },
  { type: 'prohibited', strength: 100, pattern: /\bmust not\b/i },
  { type: 'prohibited', strength: 100, pattern: /\bmay not\b/i },
  { type: 'prohibited', strength: 100, pattern: /\bis prohibited\b/i },
  { type: 'mandatory', strength: 100, pattern: /\bshall\b/i },
  { type: 'mandatory', strength: 100, pattern: /\bmust\b/i },
  { type: 'mandatory', strength: 95, pattern: /\bis required to\b/i },
  { type: 'mandatory', strength: 90, pattern: /\bis responsible for\b/i },
  { type: 'permitted', strength: 70, pattern: /\bmay\b/i },
  { type: 'advisory', strength: 45, pattern: /\bshould\b/i },
  { type: 'informational', strength: 30, pattern: /\bwill\b/i }
];

const DEFINITION_PATTERNS = [
  { pattern: /^(.{2,120}?)\s+(?:shall mean|means|is defined as|refers to)\s+(.+)$/i, termGroup: 1, definitionGroup: 2 },
  { pattern: /^(.{2,120}?):\s+(.+)$/i, termGroup: 1, definitionGroup: 2 },
  { pattern: /^(.{2,120}?)\s+[—–-]\s+(.+)$/i, termGroup: 1, definitionGroup: 2 }
];

function detectOfflineAnalysisIntent(prompt) {
  const value = String(prompt || '').toLowerCase();

  if (/\b(compare|comparison|difference|conflict|contradiction|consistent|agreement|precedence)\b/i.test(value)) {
    return 'comparison';
  }

  if (/\b(define|definition|definitions|meaning|what does .* mean|what is meant by)\b/i.test(value)) {
    return 'definitions';
  }

  if (/\b(requirement|requirements|shall|must|required|responsible|prohibited|obligation|duties)\b/i.test(value)) {
    return 'requirements';
  }

  return 'evidence';
}

function normalizeAnalysisText(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitAnalysisSentences(value) {
  return normalizeAnalysisText(value)
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 12);
}

function matchesAnalysisQuery(text, query) {
  const queryTerms = tokenizeOffline(query);

  if (!queryTerms.length) {
    return true;
  }

  const lower = String(text || '').toLowerCase();
  return queryTerms.some(term => lower.includes(term));
}

function classifyRequirement(sentence) {
  for (const rule of REQUIREMENT_PATTERNS) {
    if (rule.pattern.test(sentence)) {
      return {
        type: rule.type,
        strength: rule.strength
      };
    }
  }

  return null;
}

function extractResponsibleParty(sentence) {
  const patterns = [
    /^\s*(?:the\s+)?([A-Z][A-Za-z0-9 /&()_-]{1,80}?)\s+(?:shall|must|will|should|may)\b/,
    /\b(?:the\s+)?([A-Za-z][A-Za-z0-9 /&()_-]{1,80}?)\s+is responsible for\b/i
  ];

  for (const pattern of patterns) {
    const match = String(sentence || '').match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function requirementKey(requirement) {
  return `${requirement.type}|${String(requirement.text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
}

function extractRequirementsFromSections(sections, query = '', options = {}) {
  const limit = Math.max(1, Number(options.limit || 100));
  const includeAdvisory = options.includeAdvisory !== false;
  const includeNegative = options.includeNegative !== false;
  const requirements = [];
  const seen = new Set();

  for (const section of Array.isArray(sections) ? sections : []) {
    for (const sentence of splitAnalysisSentences(section.text)) {
      const classification = classifyRequirement(sentence);

      if (!classification) {
        continue;
      }

      if (!includeAdvisory && ['advisory', 'informational'].includes(classification.type)) {
        continue;
      }

      if (!includeNegative && classification.type === 'prohibited') {
        continue;
      }

      if (!matchesAnalysisQuery(`${section.heading || ''} ${sentence}`, query)) {
        continue;
      }

      const requirement = {
        id: `${section.id || section.documentId || 'section'}:${requirements.length + 1}`,
        type: classification.type,
        strength: classification.strength,
        text: truncateText(sentence, 700),
        responsibleParty: extractResponsibleParty(sentence),
        documentId: section.documentId || null,
        documentName: section.documentName || 'Unknown document',
        heading: section.heading || 'Unheaded section',
        path: Array.isArray(section.path) ? section.path : [],
        location: section.location || 'Location not specified',
        sourceNumber: section.sourceNumber || null
      };

      const key = requirementKey(requirement);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      requirements.push(requirement);

      if (requirements.length >= limit) {
        break;
      }
    }

    if (requirements.length >= limit) {
      break;
    }
  }

  requirements.sort((a, b) => b.strength - a.strength || a.documentName.localeCompare(b.documentName));

  const summary = {
    total: requirements.length,
    mandatory: requirements.filter(item => item.type === 'mandatory').length,
    prohibited: requirements.filter(item => item.type === 'prohibited').length,
    permitted: requirements.filter(item => item.type === 'permitted').length,
    advisory: requirements.filter(item => item.type === 'advisory').length,
    informational: requirements.filter(item => item.type === 'informational').length,
    responsibleParties: [...new Set(requirements.map(item => item.responsibleParty).filter(Boolean))]
  };

  return {
    query: String(query || '').trim(),
    generatedAt: new Date().toISOString(),
    summary,
    requirements
  };
}

function cleanDefinitionTerm(value) {
  return String(value || '')
    .replace(/^[\s•*#\d.)-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDefinitionsFromSections(sections, query = '', options = {}) {
  const limit = Math.max(1, Number(options.limit || 100));
  const definitions = [];
  const seen = new Set();

  for (const section of Array.isArray(sections) ? sections : []) {
    for (const sentence of splitAnalysisSentences(section.text)) {
      let parsed = null;

      for (const rule of DEFINITION_PATTERNS) {
        const match = sentence.match(rule.pattern);
        if (!match) {
          continue;
        }

        const term = cleanDefinitionTerm(match[rule.termGroup]);
        const definition = String(match[rule.definitionGroup] || '').trim();

        if (term.length < 2 || term.length > 120 || definition.length < 10) {
          continue;
        }

        if (rule.pattern === DEFINITION_PATTERNS[1].pattern && !/definition|definitions|glossary/i.test(`${section.heading || ''} ${(section.path || []).join(' ')}`)) {
          continue;
        }

        parsed = { term, definition };
        break;
      }

      if (!parsed) {
        continue;
      }

      if (!matchesAnalysisQuery(`${parsed.term} ${parsed.definition} ${section.heading || ''}`, query)) {
        continue;
      }

      const key = parsed.term.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      definitions.push({
        id: `${section.id || section.documentId || 'section'}:${definitions.length + 1}`,
        term: parsed.term,
        definition: truncateText(parsed.definition, 800),
        documentId: section.documentId || null,
        documentName: section.documentName || 'Unknown document',
        heading: section.heading || 'Unheaded section',
        path: Array.isArray(section.path) ? section.path : [],
        location: section.location || 'Location not specified',
        sourceNumber: section.sourceNumber || null
      });

      if (definitions.length >= limit) {
        break;
      }
    }

    if (definitions.length >= limit) {
      break;
    }
  }

  definitions.sort((a, b) => a.term.localeCompare(b.term));

  return {
    query: String(query || '').trim(),
    generatedAt: new Date().toISOString(),
    summary: {
      total: definitions.length,
      documents: new Set(definitions.map(item => item.documentId).filter(Boolean)).size
    },
    definitions
  };
}

function analysisTerms(value) {
  return new Set(tokenizeOffline(value).map(term => term.replace(/(ing|ed|es|s)$/i, '')));
}

function analysisSimilarity(first, second) {
  const a = analysisTerms(first);
  const b = analysisTerms(second);

  if (!a.size || !b.size) {
    return 0;
  }

  const intersection = [...a].filter(term => b.has(term)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / Math.max(1, union);
}

function compareRetrievedSources(query, hits, options = {}) {
  const maximumSources = Math.max(2, Number(options.maximumSources || 8));
  const sources = (Array.isArray(hits) ? hits : [])
    .slice(0, maximumSources)
    .map(hit => ({
      sourceNumber: hit.sourceNumber,
      documentId: hit.documentId || null,
      documentName: hit.documentName || 'Unknown document',
      heading: hit.heading || 'Unheaded section',
      location: hit.location || 'Location not specified',
      path: Array.isArray(hit.path) ? hit.path : [],
      score: Number(hit.score || 0),
      excerpts: selectEvidenceSentences(hit.text, query, hit.matchedTerms || [], 3),
      requirements: extractRequirementsFromSections([hit], query, { limit: 12 }).requirements,
      definitions: extractDefinitionsFromSections([hit], query, { limit: 12 }).definitions
    }));

  const agreements = [];
  const differences = [];

  for (let i = 0; i < sources.length; i += 1) {
    for (let j = i + 1; j < sources.length; j += 1) {
      const first = sources[i];
      const second = sources[j];
      const firstText = first.excerpts.join(' ');
      const secondText = second.excerpts.join(' ');
      const similarity = analysisSimilarity(firstText, secondText);

      if (similarity >= 0.28) {
        agreements.push({
          sourceA: first.sourceNumber,
          sourceB: second.sourceNumber,
          similarity: Math.round(similarity * 100),
          reason: 'The sources use materially overlapping language or address the same obligation.'
        });
      } else if (similarity >= 0.08) {
        differences.push({
          sourceA: first.sourceNumber,
          sourceB: second.sourceNumber,
          similarity: Math.round(similarity * 100),
          reason: 'The sources address related subject matter but emphasize different details, duties, or conditions.'
        });
      }
    }
  }

  const conflicts = (hits?.meta?.conflicts || []).map(conflict => ({ ...conflict }));

  return {
    query,
    generatedAt: new Date().toISOString(),
    summary: {
      sources: sources.length,
      documents: new Set(sources.map(source => source.documentId).filter(Boolean)).size,
      agreements: agreements.length,
      differences: differences.length,
      conflicts: conflicts.length
    },
    sources,
    agreements,
    differences,
    conflicts
  };
}

function buildOfflineRequirementReport(prompt, hits) {
  const result = extractRequirementsFromSections(hits, prompt, {
    limit: 30,
    includeAdvisory: true,
    includeNegative: true
  });
  const confidence = calculateOfflineConfidence(hits);
  const citations = result.requirements.map(item => item.sourceNumber).filter(Boolean);

  const requirementLines = result.requirements.length
    ? result.requirements.map(item => {
        const party = item.responsibleParty ? ` — **Responsible party:** ${item.responsibleParty}` : '';
        const citation = item.sourceNumber ? ` [S${item.sourceNumber}]` : '';
        return `- **${item.type.toUpperCase()}** (${item.strength}%): ${item.text}${party}${citation}`;
      })
    : ['No explicit requirement language was found in the retrieved sources.'];

  return {
    content: [
      '## Offline requirement report',
      '',
      `**Question:** ${prompt}`,
      '',
      `**Evidence confidence:** ${confidence.label} (${confidence.score}%)`,
      '',
      `**Extracted:** ${result.summary.total} requirements — ${result.summary.mandatory} mandatory, ${result.summary.prohibited} prohibited, ${result.summary.permitted} permitted, ${result.summary.advisory} advisory.`,
      '',
      '### Extracted requirements',
      '',
      ...requirementLines,
      '',
      '### Evidence gaps',
      '',
      'This is deterministic language extraction. Each item should be reviewed in its full section context before it is treated as a controlling obligation.'
    ].join('\n'),
    citations: [...new Set(citations)]
  };
}

function buildOfflineDefinitionReport(prompt, hits) {
  const result = extractDefinitionsFromSections(hits, prompt, { limit: 30 });
  const confidence = calculateOfflineConfidence(hits);
  const citations = result.definitions.map(item => item.sourceNumber).filter(Boolean);

  const definitionLines = result.definitions.length
    ? result.definitions.map(item => {
        const citation = item.sourceNumber ? ` [S${item.sourceNumber}]` : '';
        return `- **${item.term}:** ${item.definition}${citation}`;
      })
    : ['No explicit definitions were found in the retrieved sources.'];

  return {
    content: [
      '## Offline definition report',
      '',
      `**Question:** ${prompt}`,
      '',
      `**Evidence confidence:** ${confidence.label} (${confidence.score}%)`,
      '',
      '### Extracted definitions',
      '',
      ...definitionLines,
      '',
      '### Evidence gaps',
      '',
      'Only explicit definitional language was extracted. Implied meanings were not created.'
    ].join('\n'),
    citations: [...new Set(citations)]
  };
}

function buildOfflineComparisonReport(prompt, hits) {
  const comparison = compareRetrievedSources(prompt, hits, { maximumSources: 8 });
  const citations = comparison.sources.map(source => source.sourceNumber).filter(Boolean);

  const sourceLines = comparison.sources.map(source => {
    const excerpts = source.excerpts.length
      ? source.excerpts.map(excerpt => `  - ${excerpt} [S${source.sourceNumber}]`).join('\n')
      : `  - No readable excerpt was available. [S${source.sourceNumber}]`;
    return `- **[S${source.sourceNumber}] ${source.documentName} — ${source.heading}**\n${excerpts}`;
  });

  const agreementLines = comparison.agreements.length
    ? comparison.agreements.map(item => `- [S${item.sourceA}] and [S${item.sourceB}]: ${item.reason} (${item.similarity}% textual similarity).`)
    : ['No strong cross-source agreement was detected.'];

  const differenceLines = comparison.differences.length
    ? comparison.differences.map(item => `- [S${item.sourceA}] and [S${item.sourceB}]: ${item.reason}`)
    : ['No material differences were detected by the comparison rules.'];

  const conflictLines = comparison.conflicts.length
    ? comparison.conflicts.map(item => `- [S${item.sourceA}] may conflict with [S${item.sourceB}]: ${item.reason}.`)
    : ['No opposing requirement language was detected among the retrieved sources.'];

  return {
    content: [
      '## Offline source comparison',
      '',
      `**Topic:** ${prompt}`,
      '',
      '### Compared sources',
      '',
      ...sourceLines,
      '',
      '### Agreements',
      '',
      ...agreementLines,
      '',
      '### Differences',
      '',
      ...differenceLines,
      '',
      '### Potential conflicts',
      '',
      ...conflictLines,
      '',
      '### Evidence gaps',
      '',
      'Similarity and conflict indicators are screening tools. Review the complete cited sections, referenced clauses, and order-of-precedence provisions before relying on a final interpretation.'
    ].join('\n'),
    citations: [...new Set(citations)]
  };
}

function formatOfflineSource(hit, prompt) {
  const heading = hit.heading || 'Unheaded section';
  const documentName = hit.documentName || 'Unknown document';
  const location = hit.location || 'Location not specified';
  const path = Array.isArray(hit.path)
    ? hit.path.join(' › ')
    : '';

  const sentences = selectEvidenceSentences(
    hit.text,
    prompt,
    hit.matchedTerms || [],
    3
  );

  const citedEvidence = sentences.length
    ? sentences.map(
        sentence =>
          `> ${sentence} [S${hit.sourceNumber}]`
      )
    : [
        `> No readable excerpt was available for this indexed section. [S${hit.sourceNumber}]`
      ];

  return [
    `#### [S${hit.sourceNumber}] ${heading}`,
    '',
    `**Document:** ${documentName}`,
    '',
    `**Location:** ${location}${path ? ` · ${path}` : ''}`,
    '',
    ...citedEvidence,
    ''
  ].join('\n');
}

function selectEvidenceSentences(
  text,
  prompt,
  matchedTerms,
  limit = 3
) {
  const cleanedText = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleanedText) {
    return [];
  }

  const candidates = cleanedText
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 25)
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreOfflineSentence(
        sentence,
        prompt,
        matchedTerms
      )
    }));

  if (!candidates.length) {
    return [
      truncateText(
        cleanedText,
        500
      )
    ];
  }

  const selected = candidates
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.index - b.index
    )
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map(item => truncateText(item.sentence, 500));

  return selected;
}

function scoreOfflineSentence(
  sentence,
  prompt,
  matchedTerms
) {
  const lowerSentence = sentence.toLowerCase();

  const queryTerms = [
    ...tokenizeOffline(prompt),
    ...matchedTerms.flatMap(tokenizeOffline)
  ];

  let score = 0;

  for (const term of new Set(queryTerms)) {
    if (lowerSentence.includes(term)) {
      score += term.length >= 7
        ? 5
        : 3;
    }
  }

  if (
    /\b(shall|must|required|responsible|prohibited|may not|will)\b/i.test(
      sentence
    )
  ) {
    score += 5;
  }

  if (
    /\b(exception|except|unless|however|notwithstanding)\b/i.test(
      sentence
    )
  ) {
    score += 4;
  }

  if (
    /\b(means|defined|definition|refers to)\b/i.test(
      sentence
    )
  ) {
    score += 4;
  }

  if (sentence.length >= 60 && sentence.length <= 350) {
    score += 2;
  }

  return score;
}

function tokenizeOffline(value) {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'that',
    'this',
    'what',
    'when',
    'where',
    'which',
    'who',
    'why',
    'how',
    'does',
    'are',
    'was',
    'were',
    'has',
    'have',
    'will',
    'would',
    'should',
    'could'
  ]);

  return (
    String(value || '')
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9._/-]*/g) || []
  ).filter(
    term =>
      term.length > 2 &&
      !stopWords.has(term)
  );
}

function truncateText(text, maximumLength) {
  const value = String(text || '').trim();

  if (value.length <= maximumLength) {
    return value;
  }

  return `${value.slice(0, maximumLength - 1).trim()}…`;
}

function calculateOfflineConfidence(hits) {
  if (!hits.length) {
    return {
      score: 0,
      label: 'Insufficient'
    };
  }

  const averageCoverage =
    hits.reduce(
      (total, hit) =>
        total +
        Number(hit.components?.coverage || 0),
      0
    ) / hits.length;

  const distinctDocuments = new Set(
    hits.map(hit => hit.documentId)
  ).size;

  const sourceDiversity = Math.min(
    20,
    distinctDocuments * 5
  );

  const topScore = Number(
    hits[0]?.score || 0
  );

  const retrievalStrength = Math.min(
    35,
    topScore / 2
  );

  const conflictPenalty =
    (hits.meta?.conflicts?.length || 0) * 8;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        averageCoverage * 0.45 +
        sourceDiversity +
        retrievalStrength -
        conflictPenalty
      )
    )
  );

  const label =
    score >= 80
      ? 'Strong'
      : score >= 60
        ? 'Moderate'
        : score >= 35
          ? 'Limited'
          : 'Insufficient';

  return {
    score,
    label
  };
}

async function callAI(prompt, context, mode) {
  const settings = state.settings;

  if (!settings.openaiKey) {
    throw new Error(
      'This answer mode requires an OpenAI API key. Select Offline Evidence mode or enter a key in Settings.'
    );
  }

  const rules = {
    source:
      'Answer only from the supplied evidence. If the evidence does not support an answer, say exactly that. Do not use outside knowledge. Cite every material claim with [S#].',

    assisted:
      'Use supplied evidence as the controlling source. Clearly label any general professional knowledge as "General SME context" and never present it as project-specific. Cite project claims with [S#].',

    general:
      'Answer as a general professional assistant. Use supplied evidence when relevant and cite it with [S#].'
  };

  const system = [
    'You are Mission Companion, a rigorous subject-matter analysis system.',
    rules[mode] || rules.source,
    'Check for conflicts, exceptions, definitions, and cross-references.',
    'Prefer precise, defensible conclusions over confident guesses.',
    'End with a short Evidence Gaps section when anything important is uncertain.'
  ].join(' ');

  const body = {
    model: settings.openaiModel,
    messages: [
      {
        role: 'system',
        content: system
      },
      {
        role: 'user',
        content: [
          'QUESTION:',
          prompt,
          '',
          'EVIDENCE:',
          context || '(No evidence retrieved.)'
        ].join('\n')
      }
    ],
    temperature: 0.1
  };

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    settings.timeout
  );

  try {
    const response = await fetch(
      `${settings.openaiUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.openaiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );

    const responseBody = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        responseBody?.error?.message ||
        `OpenAI request failed (${response.status})`
      );
    }

    const content =
      responseBody?.choices?.[0]?.message?.content ||
      'No response returned.';

    const citations = [
      ...content.matchAll(/\[S(\d+)\]/g)
    ].map(match => Number(match[1]));

    return {
      content,
      citations: [...new Set(citations)]
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'The OpenAI request timed out.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

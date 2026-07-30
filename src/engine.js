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

const STATE_KEY = 'mc-master-state-v2';
const DOC_DB = 'mc-master-documents-v2';
const APP_VERSION = '2.8.0';

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

    const answer = mode === 'offline'
      ? callOffline(cleanedPrompt, hits)
      : await callAI(
          cleanedPrompt,
          buildContext(hits),
          mode
        );

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

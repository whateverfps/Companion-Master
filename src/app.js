import { engine } from './engine.js';
import { logger, setLifecycle, registerModule, captureError, verifyButtons, runHealthChecks, diagnosticSnapshot, installGlobalHandlers } from './diagnostics.js';

installGlobalHandlers();
setLifecycle('loading-ui');

const app = document.querySelector('#app');
const safeText = value => value == null ? '' : String(value);
const preferredText = (...values) => safeText(
  values.find(value =>
    value != null && safeText(value).trim() !== ''
  )
);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));
const fmt = n => new Intl.NumberFormat().format(n || 0);

let view = 'chat';
let selectedDoc = null;
let busy = false;
let importQueue = [];

app.innerHTML = `
<div class="shell">
  <aside class="rail">
    <div class="brand">
      <div class="mark">M</div>
      <div>
        <strong>Mission Companion</strong>
        <span>SME Workspace · Master 2.0</span>
      </div>
    </div>

    <nav>
      <button data-view="chat" class="active">Command Desk</button>
      <button data-view="knowledge">Knowledge Base</button>
      <button data-view="sources">Source Inspector</button>
      <button data-view="evaluate">SME Evaluations</button>
      <button data-view="settings">Settings</button>
      <button data-view="diagnostics">Diagnostics</button>
    </nav>

    <div class="project-block">
      <label>ACTIVE PROJECT</label>
      <select id="projectSelect"></select>
      <button id="newProject" class="subtle">＋ New project</button>
    </div>

    <div class="rail-foot">
      <span class="dot" id="healthDot"></span>
      <span id="healthText">Starting…</span>
    </div>
  </aside>

  <main>
    <header class="topbar">
      <div>
        <div class="eyebrow">MISSION COMPANION</div>
        <h1 id="pageTitle">Command Desk</h1>
        <p id="pageSub">Ask project-specific questions and receive source-grounded answers.</p>
      </div>

      <div class="mode-wrap">
        <label>ANSWER MODE</label>
        <select id="mode">
          <option value="offline">Offline evidence</option>
          <option value="source">Source-only AI</option>
          <option value="assisted">SME-assisted AI</option>
          <option value="general">General assistant AI</option>
        </select>
      </div>
    </header>

    <section id="chat" class="view active">
      <div class="kpis">
        <article>
          <span>DOCUMENTS</span>
          <strong id="kDocs">0</strong>
        </article>
        <article>
          <span>INDEXED SECTIONS</span>
          <strong id="kSections">0</strong>
        </article>
        <article>
          <span>ANSWER STANDARD</span>
          <strong id="kMode">Offline evidence</strong>
        </article>
        <article>
          <span>AI</span>
          <strong id="kAI">Not configured</strong>
        </article>
      </div>

      <div class="chat-layout">
        <section class="panel conversation">
          <div class="panel-head">
            <div>
              <span>PROJECT ANALYSIS</span>
              <h2>Ask Mission Companion</h2>
            </div>
            <button id="clearChat" class="subtle">New conversation</button>
          </div>

          <div id="messages" class="messages"></div>

          <div class="composer">
            <textarea id="prompt" placeholder="Ask a question about the selected project knowledge…"></textarea>
            <button id="send">Analyze</button>
          </div>

          <div class="hint">Enter sends · Shift+Enter adds a line</div>
        </section>

        <aside class="panel evidence">
          <div class="panel-head">
            <div>
              <span>RETRIEVAL</span>
              <h2>Evidence used</h2>
            </div>
          </div>

          <div id="evidenceList" class="evidence-list">
            <div class="empty">Sources used in the latest answer appear here.</div>
          </div>
        </aside>
      </div>
    </section>

    <section id="knowledge" class="view">
      <div class="knowledge-grid">
        <aside class="panel library-panel">
          <div class="panel-head">
            <div>
              <span>KNOWLEDGE ORGANIZATION</span>
              <h2>Libraries</h2>
            </div>
            <button id="newLibrary" class="subtle">＋ New</button>
          </div>
          <div id="libraries" class="library-list"></div>
        </aside>

        <section class="panel knowledge-main">
          <div class="panel-head">
            <div>
              <span>INGESTION PIPELINE</span>
              <h2 id="activeLibraryTitle">Knowledge library</h2>
            </div>
            <div>
              <input
                id="fileInput"
                type="file"
                multiple
                hidden
                accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json,.html,.xml,.log"
              >
              <button id="upload">＋ Add documents</button>
            </div>
          </div>

          <div class="pipeline">
            <span>Upload</span>
            <b>→</b>
            <span>Extract</span>
            <b>→</b>
            <span>Detect sections</span>
            <b>→</b>
            <span>Index</span>
            <b>→</b>
            <span>Verify</span>
          </div>

          <div id="ingestStatus"></div>

          <div class="knowledge-toolbar">
            <input id="documentFilter" placeholder="Filter documents…">
            <select id="categoryFilter">
              <option value="">All categories</option>
              <option>Specifications</option>
              <option>Drawings</option>
              <option>SOPs</option>
              <option>Reports</option>
              <option>Photos</option>
              <option>General</option>
            </select>
          </div>

          <div id="documents" class="document-list"></div>
        </section>

        <aside class="panel metadata-panel">
          <div class="panel-head">
            <div>
              <span>DOCUMENT CONTROL</span>
              <h2>Metadata</h2>
            </div>
          </div>

          <div id="documentMetadata" class="document-metadata">
            <div class="empty">Select a document to review its health and metadata.</div>
          </div>

          <div class="queue-head">
            <span>IMPORT ACTIVITY</span>
            <strong>Queue</strong>
          </div>

          <div id="importQueue" class="import-queue">
            <div class="empty">No imports in this session.</div>
          </div>
        </aside>
      </div>
    </section>

    <section id="sources" class="view">
      <div class="split source-split">
        <section class="panel">
          <div class="panel-head">
            <div>
              <span>DOCUMENT STRUCTURE</span>
              <h2>Source inspector</h2>
            </div>
          </div>
          <div id="sourceDocs" class="source-docs"></div>
        </section>

        <section class="panel">
          <div id="sourceDetail" class="source-detail">
            <div class="empty">Choose a document to inspect its indexed sections.</div>
          </div>
        </section>
      </div>
    </section>

    <section id="evaluate" class="view">
      <div class="split">
        <section class="panel">
          <div class="panel-head">
            <div>
              <span>ACCURACY BENCHMARK</span>
              <h2>SME evaluation cases</h2>
            </div>
            <button id="addEval">＋ Add case</button>
          </div>

          <p class="intro">
            Create known-answer questions. Each run scores required facts,
            prohibited assumptions, source retrieval, and citation use.
          </p>

          <div id="evalList"></div>
        </section>

        <aside class="panel">
          <h3>Evaluation standard</h3>
          <p><strong>Required facts</strong> are phrases the answer must contain.</p>
          <p><strong>Expected source</strong> is a document or section the retrieval should find.</p>
          <p><strong>Prohibited assumptions</strong> are statements that must not appear.</p>
          <div id="evalResult"></div>
        </aside>
      </div>
    </section>

    <section id="settings" class="view">
      <section class="panel settings">
        <div class="panel-head">
          <div>
            <span>APPLICATION SETTINGS</span>
            <h2>Settings</h2>
          </div>
        </div>

        <div class="settings-tabs">
          <button class="active" data-settings-tab="ai">AI</button>
          <button data-settings-tab="knowledge">Knowledge</button>
          <button data-settings-tab="developer">Developer</button>
          <button data-settings-tab="about">About</button>
        </div>

        <div class="settings-pane active" data-settings-pane="ai">
          <label>
            OpenAI API URL
            <input id="apiUrl">
          </label>

          <label>
            Model
            <input id="model">
          </label>

          <label>
            API key
            <input id="apiKey" type="password" autocomplete="off">
          </label>

          <label>
            Request timeout (seconds)
            <input id="timeout" type="number" min="30" max="600">
          </label>

          <button id="testConnection" class="subtle">Test connection</button>
        </div>

        <div class="settings-pane" data-settings-pane="knowledge">
          <label>
            Retrieved sections per question
            <input id="topK" type="number" min="3" max="20">
          </label>

          <div class="settings-actions">
            <button id="exportProject" class="subtle">Export project</button>

            <label class="button subtle">
              Import project
              <input id="importProject" type="file" accept=".json" hidden>
            </label>
          </div>
        </div>

        <div class="settings-pane" data-settings-pane="developer">
          <p class="notice">
            Reset removes all projects, settings, indexed documents,
            and browser history for this application.
          </p>

          <button id="openDiagnostics" class="subtle">Open diagnostics</button>
          <button id="resetApplication" class="danger">Reset application data</button>
        </div>

        <div class="settings-pane" data-settings-pane="about">
          <h3>Mission Companion Master</h3>
          <p>Version <strong>2.8.0 — Build 8, Commit 1</strong></p>
          <p class="notice">
            Evidence-first SME workspace with local document retrieval,
            deterministic offline evidence reports, citation verification,
            conflict detection, and optional AI-assisted analysis.
          </p>
        </div>

        <div class="settings-actions">
          <button id="saveSettings">Save settings</button>
        </div>

        <p class="notice">
          The API key is stored only in this browser.
          A public static website cannot safely share one central key.
        </p>
      </section>
    </section>

    <section id="diagnostics" class="view">
      <div class="diagnostic-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <span>SYSTEM HEALTH</span>
              <h2>Diagnostics</h2>
            </div>

            <div>
              <button id="runDiagnostics">Run checks</button>
              <button id="exportDiagnostics" class="subtle">Export</button>
            </div>
          </div>

          <div id="healthSummary" class="health-summary"></div>
          <div id="healthChecks" class="health-checks"></div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <span>DEVELOPER CONSOLE</span>
              <h2>Application log</h2>
            </div>
            <button id="clearLogs" class="subtle">Clear log</button>
          </div>

          <div id="diagnosticLog" class="diagnostic-log"></div>
        </section>

        <section class="panel roadmap-panel">
          <div class="panel-head">
            <div>
              <span>MASTER ROADMAP</span>
              <h2>Build sequence</h2>
            </div>
          </div>

          <ol class="roadmap">
            <li class="done">
              <strong>Build 1</strong>
              <span>Stabilization and diagnostics</span>
            </li>
            <li class="done">
              <strong>Build 2</strong>
              <span>Libraries, ingestion management, metadata, and document health</span>
            </li>
            <li class="done">
              <strong>Build 3</strong>
              <span>Source Inspector and extraction verification</span>
            </li>
            <li class="done">
              <strong>Build 4</strong>
              <span>Retrieval and reranking</span>
            </li>
            <li>
              <strong>Build 5</strong>
              <span>Evidence-controlled answer engine</span>
            </li>
            <li>
              <strong>Build 6</strong>
              <span>Citation accuracy</span>
            </li>
            <li>
              <strong>Build 7</strong>
              <span>SME evaluation suite</span>
            </li>
            <li>
              <strong>Build 8–10</strong>
              <span>Knowledge packs, security, and production release</span>
            </li>
          </ol>
        </section>
      </div>
    </section>
  </main>
</div>

<div id="modal" class="modal" hidden>
  <div class="modal-card">
    <button id="closeModal" class="modal-x">×</button>
    <div id="modalBody"></div>
  </div>
</div>
`;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const titles = {
  diagnostics: [
    'Diagnostics',
    'Inspect application health, startup checks, logs, and roadmap.'
  ],
  chat: [
    'Command Desk',
    'Ask project-specific questions and receive source-grounded answers.'
  ],
  knowledge: [
    'Knowledge Base',
    'Build a structured, section-aware project library.'
  ],
  sources: [
    'Source Inspector',
    'Review exactly what Mission Companion indexed.'
  ],
  evaluate: [
    'SME Evaluations',
    'Measure accuracy against known questions and required evidence.'
  ],
  settings: [
    'Settings',
    'Configure the model and move project libraries between browsers.'
  ]
};

function show(name) {
  view = name;

  $$('.view').forEach(element => {
    element.classList.toggle('active', element.id === name);
  });

  $$('nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
  });

  $('#pageTitle').textContent = titles[name][0];
  $('#pageSub').textContent = titles[name][1];

  if (name === 'knowledge') {
    renderKnowledgeWorkspace();
  }

  if (name === 'sources') {
    renderSources();
  }

  if (name === 'evaluate') {
    renderEvals();
  }

  if (name === 'diagnostics') {
    renderDiagnostics();
  }
}

$$('nav button').forEach(button => {
  button.onclick = () => show(button.dataset.view);
  button.dataset.bound = 'true';
});

registerModule('Navigation', 'ready', {
  summary: `${$$('nav button').length} views registered`
});

function state() {
  return engine.state();
}

function modeLabel(mode) {
  return {
    offline: 'Offline evidence',
    source: 'Source-only AI',
    assisted: 'SME-assisted AI',
    general: 'General assistant AI'
  }[mode] || 'Offline evidence';
}

async function refresh() {
  const currentState = state();
  const selectedMode = currentState.settings.mode || 'offline';

  $('#mode').value = selectedMode;
  $('#kMode').textContent = modeLabel(selectedMode);

  $('#kAI').textContent = selectedMode === 'offline'
    ? 'Not required'
    : currentState.settings.openaiKey
      ? 'Configured'
      : 'Not configured';

  $('#projectSelect').innerHTML = currentState.projects
    .map(project => `
      <option
        value="${project.id}"
        ${project.id === currentState.activeProject ? 'selected' : ''}
      >
        ${esc(project.name)}
      </option>
    `)
    .join('');

  const documents = await engine.documents();
  const sections = await engine.sections();

  $('#kDocs').textContent = fmt(documents.length);
  $('#kSections').textContent = fmt(sections.length);

  renderMessages();
  await renderKnowledgeWorkspace(documents);
}

$('#mode').onchange = () => {
  engine.saveSettings({
    mode: $('#mode').value
  });

  refresh();
};

$('#projectSelect').onchange = async () => {
  engine.setProject($('#projectSelect').value);
  selectedDoc = null;
  await refresh();
};

$('#newProject').onclick = () => openModal(
  `
    <h2>Create project</h2>
    <label>
      Project name
      <input id="projectName" autofocus>
    </label>
    <button id="createProject">Create</button>
  `,
  () => {
    $('#createProject').onclick = () => {
      const name = $('#projectName').value.trim();

      if (name) {
        engine.addProject(name);
        closeModal();
        refresh();
      }
    };
  }
);

function renderMessages() {
  const chat = state().chat;

  $('#messages').innerHTML = chat.length
    ? chat.map(message => `
        <article class="message ${message.role}">
          <div class="avatar">${message.role === 'user' ? 'YOU' : 'MC'}</div>
          <div>
            <div class="message-meta">
              ${message.role === 'user' ? 'You' : 'Mission Companion'}
              ${message.mode ? ` · ${modeLabel(message.mode)}` : ''}
            </div>
            <div class="message-text">
              ${esc(message.content).replace(/\n/g, '<br>')}
            </div>
          </div>
        </article>
      `).join('')
    : `
      <div class="welcome">
        <div class="seal">M</div>
        <h3>Build an evidence-backed SME</h3>
        <p>
          Add project documents and ask a question. Offline Evidence mode
          retrieves and presents cited source language without requiring an
          API key. AI modes can provide additional synthesis when configured.
        </p>
      </div>
    `;

  $('#messages').scrollTop = $('#messages').scrollHeight;
}

$('#clearChat').onclick = () => {
  engine.clearChat();
  refresh();
};

async function ask() {
  const prompt = $('#prompt').value.trim();

  if (!prompt || busy) {
    return;
  }

  busy = true;
  $('#send').disabled = true;
  $('#send').textContent = 'Analyzing…';

  try {
    const message = await engine.ask(
      prompt,
      $('#mode').value
    );

    $('#prompt').value = '';

    renderMessages();

    renderEvidence(
      message.hits,
      message.citations,
      message.citationVerification,
      message.retrievalMeta
    );
  } catch (error) {
    captureError(error, {
      module: 'Conversation',
      action: 'ask'
    });

    alert(error.message);
  } finally {
    busy = false;
    $('#send').disabled = false;
    $('#send').textContent = 'Analyze';
  }
}

$('#send').onclick = ask;

$('#prompt').onkeydown = event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    ask();
  }
};

function renderEvidence(
  hits = [],
  used = [],
  verification = null,
  meta = {}
) {
  const summary = hits.length
    ? `
      <div class="retrieval-summary">
        <span>${hits.length} sources</span>
        <span>${meta?.totalCandidates || hits.length} candidates</span>
        <span>citation coverage ${verification?.coverage ?? '—'}%</span>
        <span class="${verification?.passed ? 'good-text' : 'warn-text'}">
          ${verification?.passed ? 'citations verified' : 'review citations'}
        </span>
      </div>

      ${(meta?.conflicts || []).length
        ? `
          <div class="conflict-alert">
            <strong>Potential source conflict</strong>
            ${meta.conflicts.map(conflict => `
              <span>
                [S${conflict.sourceA}] ↔ [S${conflict.sourceB}]
                · ${esc(conflict.reason)}
              </span>
            `).join('')}
          </div>
        `
        : ''}
    `
    : '';

  $('#evidenceList').innerHTML = summary + (
    hits.length
      ? hits.map(hit => `
          <article class="evidence-item ${used.includes(hit.sourceNumber) ? 'used' : ''}">
            <div>
              <strong>[S${hit.sourceNumber}] ${esc(hit.heading)}</strong>
              <span>
                ${esc(hit.documentName)}
                · ${esc(hit.location)}
                · score ${hit.score.toFixed(1)}
              </span>
            </div>

            <div class="match-tags">
              ${(hit.matchedTerms || [])
                .slice(0, 6)
                .map(term => `<em>${esc(term)}</em>`)
                .join('')}
            </div>

            <p>
              ${esc(hit.text.slice(0, 320))}
              ${hit.text.length > 320 ? '…' : ''}
            </p>
          </article>
        `).join('')
      : '<div class="empty">No project evidence was retrieved.</div>'
  );
}

$('#upload').onclick = () => $('#fileInput').click();

$('#fileInput').onchange = async () => {
  const files = [...$('#fileInput').files];

  if (!files.length) {
    return;
  }

  const libraryId = state().activeLibrary;

  importQueue = files.map((file, index) => ({
    id: `q-${Date.now()}-${index}`,
    file,
    name: file.name,
    size: file.size,
    libraryId,
    status: 'waiting',
    detail: 'Waiting to process'
  }));

  renderImportQueue();

  $('#ingestStatus').innerHTML = '<div class="progress">Preparing files…</div>';

  try {
    const result = await engine.ingest(
      files,
      progress => {
        importQueue = importQueue.map((queueItem, index) => {
          if (index < progress.current - 1) {
            return {
              ...queueItem,
              status: 'complete',
              detail: 'Indexed'
            };
          }

          if (index === progress.current - 1) {
            return {
              ...queueItem,
              status: 'processing',
              detail: 'Extracting and indexing'
            };
          }

          return queueItem;
        });

        renderImportQueue();

        $('#ingestStatus').innerHTML = `
          <div class="progress">
            Processing ${esc(progress.name)}
            (${progress.current}/${progress.total})…
          </div>
        `;
      },
      libraryId
    );

    importQueue = importQueue.map(queueItem => {
      const failed = result.documents.find(document =>
        document.name === queueItem.name &&
        document.size === queueItem.size &&
        document.status === 'error'
      );

      const skipped = result.skipped?.find(document =>
        document.name === queueItem.name &&
        document.size === queueItem.size
      );

      if (failed) {
        return {
          ...queueItem,
          status: 'error',
          detail: failed.error
        };
      }

      if (skipped) {
        return {
          ...queueItem,
          status: 'skipped',
          detail: duplicateDetail(skipped),
          duplicate: skipped.duplicate
        };
      }

      return {
        ...queueItem,
        status: 'complete',
        detail: 'Indexed and verified'
      };
    });

    renderImportQueue();

    $('#ingestStatus').innerHTML = `
      <div class="success">
        Indexed ${result.sections.length} sections from
        ${result.documents.filter(document => document.status === 'verified').length}
        document(s).
        ${result.skipped?.length
          ? ` Skipped ${result.skipped.length} duplicate(s).`
          : ''}
      </div>
    `;
  } catch (error) {
    importQueue = importQueue.map(queueItem =>
      queueItem.status === 'complete'
        ? queueItem
        : {
            ...queueItem,
            status: 'error',
            detail: error.message
          }
    );

    renderImportQueue();

    $('#ingestStatus').innerHTML = `
      <div class="error">${esc(error.message)}</div>
    `;
  } finally {
    $('#fileInput').value = '';
    await refresh();
  }
};

$('#documentFilter').oninput = () => renderKnowledgeWorkspace();
$('#categoryFilter').onchange = () => renderKnowledgeWorkspace();

$('#newLibrary').onclick = () => openModal(
  `
    <h2>Create knowledge library</h2>
    <label>
      Library name
      <input id="libraryName" autofocus>
    </label>
    <label>
      Description
      <textarea id="libraryDescription"></textarea>
    </label>
    <button id="createLibrary">Create library</button>
  `,
  () => {
    $('#createLibrary').onclick = async () => {
      const name = $('#libraryName').value.trim();

      if (!name) {
        return;
      }

      engine.addLibrary(
        name,
        $('#libraryDescription').value
      );

      closeModal();
      await refresh();
    };
  }
);

function duplicateDetail(skipped) {
  const duplicate = skipped?.duplicate;

  if (!duplicate) {
    return skipped?.reason || 'Duplicate document';
  }

  return `${skipped.reason} Project: ${duplicate.projectName}; Library: ${duplicate.libraryName}; Document ID: ${duplicate.documentId}; Status: ${duplicate.status}.`;
}

async function retryImport(queueId, duplicateAction) {
  const queueItem = importQueue.find(item => item.id === queueId);

  if (!queueItem?.file) {
    return;
  }

  importQueue = importQueue.map(item => item.id === queueId
    ? {
        ...item,
        status: 'processing',
        detail: duplicateAction === 'replace'
          ? 'Replacing existing document'
          : 'Re-importing document'
      }
    : item
  );
  renderImportQueue();

  try {
    const result = await engine.ingest(
      [queueItem.file],
      progress => {
        importQueue = importQueue.map(item => item.id === queueId
          ? {
              ...item,
              detail: `Extracting and indexing (${progress.current}/${progress.total})`
            }
          : item
        );
        renderImportQueue();
      },
      queueItem.libraryId,
      {
        duplicateAction,
        duplicateDocumentId: queueItem.duplicate?.documentId
      }
    );
    const document = result.documents.find(item =>
      item.name === queueItem.name && item.size === queueItem.size
    );

    if (!document || document.status !== 'verified' || document.sectionCount <= 0) {
      throw new Error(document?.error || 'No usable indexed document was created.');
    }

    importQueue = importQueue.map(item => item.id === queueId
      ? {
          ...item,
          status: 'complete',
          detail: `Indexed and verified (${document.sectionCount} sections)`,
          duplicate: null
        }
      : item
    );
    $('#ingestStatus').innerHTML = `
      <div class="success">
        Indexed ${result.sections.length} sections from 1 document.
      </div>
    `;
  } catch (error) {
    importQueue = importQueue.map(item => item.id === queueId
      ? {
          ...item,
          status: 'error',
          detail: error.message
        }
      : item
    );
    $('#ingestStatus').innerHTML = `
      <div class="error">${esc(error.message)}</div>
    `;
  } finally {
    renderImportQueue();
    await refresh();
  }
}

function renderImportQueue() {
  $('#importQueue').innerHTML = importQueue.length
    ? importQueue.map(queueItem => `
        <article class="queue-item ${queueItem.status}">
          <span class="queue-state">
            ${queueItem.status === 'complete'
              ? '✓'
              : queueItem.status === 'error'
                ? '×'
                : queueItem.status === 'processing'
                  ? '↻'
                  : queueItem.status === 'skipped'
                    ? '—'
                    : '…'}
          </span>

          <div>
            <strong>${esc(queueItem.name)}</strong>
            <small>${esc(queueItem.detail)}</small>
            ${queueItem.status === 'skipped'
              ? `
                <div class="queue-actions">
                  <button data-queue-id="${esc(queueItem.id)}" data-import-action="reimport">Re-import anyway</button>
                  <button data-queue-id="${esc(queueItem.id)}" data-import-action="replace">Replace existing document</button>
                  <button class="subtle" data-queue-id="${esc(queueItem.id)}" data-import-action="dismiss">Dismiss</button>
                </div>
              `
              : queueItem.status === 'error'
                ? `
                  <div class="queue-actions">
                    <button data-queue-id="${esc(queueItem.id)}" data-import-action="reimport">Retry</button>
                    <button class="subtle" data-queue-id="${esc(queueItem.id)}" data-import-action="dismiss">Dismiss</button>
                  </div>
                `
                : ''}
          </div>
        </article>
      `).join('')
    : '<div class="empty">No imports in this session.</div>';

  $('#importQueue').querySelectorAll('[data-import-action]').forEach(button => {
    button.onclick = () => {
      const queueId = button.dataset.queueId;
      const action = button.dataset.importAction;

      if (action === 'dismiss') {
        importQueue = importQueue.filter(item => item.id !== queueId);
        renderImportQueue();
        return;
      }

      retryImport(queueId, action);
    };
  });
}

async function renderKnowledgeWorkspace(prefetched = null) {
  const currentState = state();
  const libraries = engine.libraries();
  const allDocuments = prefetched || await engine.documents();

  const activeLibrary =
    libraries.find(library => library.id === currentState.activeLibrary) ||
    libraries[0];

  if (
    activeLibrary &&
    activeLibrary.id !== currentState.activeLibrary
  ) {
    engine.setLibrary(activeLibrary.id);
  }

  $('#libraries').innerHTML = libraries.length
    ? libraries.map(library => {
        const count = allDocuments.filter(document =>
          document.libraryId === library.id
        ).length;

        return `
          <article
            class="library-card
              ${library.id === activeLibrary?.id ? 'active' : ''}
              ${library.enabled ? '' : 'disabled'}"
            data-library="${library.id}"
          >
            <button
              class="library-select"
              data-library-select="${library.id}"
            >
              <strong>${esc(library.name)}</strong>
              <span>
                ${count} document${count === 1 ? '' : 's'}
                · ${library.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </button>

            <div class="library-actions">
              <button
                class="subtle"
                data-library-edit="${library.id}"
              >
                Edit
              </button>

              <button
                class="subtle"
                data-library-toggle="${library.id}"
              >
                ${library.enabled ? 'Disable' : 'Enable'}
              </button>

              <button
                class="danger"
                data-library-delete="${library.id}"
              >
                ×
              </button>
            </div>
          </article>
        `;
      }).join('')
    : '<div class="empty">No libraries.</div>';

  $('#activeLibraryTitle').textContent =
    activeLibrary?.name ||
    'Knowledge library';

  let documents = activeLibrary
    ? allDocuments.filter(document =>
        document.libraryId === activeLibrary.id
      )
    : [];

  const query = $('#documentFilter').value
    .trim()
    .toLowerCase();

  const category = $('#categoryFilter').value;

  if (query) {
    documents = documents.filter(document =>
      `
        ${document.name}
        ${document.title || ''}
        ${(document.tags || []).join(' ')}
      `
        .toLowerCase()
        .includes(query)
    );
  }

  if (category) {
    documents = documents.filter(document =>
      document.category === category
    );
  }

  renderDocuments(documents);
  renderImportQueue();

  $$('[data-library-select]').forEach(button => {
    button.onclick = async () => {
      engine.setLibrary(button.dataset.librarySelect);
      selectedDoc = null;
      await refresh();
    };
  });

  $$('[data-library-toggle]').forEach(button => {
    button.onclick = async () => {
      const library = libraries.find(item =>
        item.id === button.dataset.libraryToggle
      );

      engine.updateLibrary(library.id, {
        enabled: !library.enabled
      });

      await refresh();
    };
  });

  $$('[data-library-edit]').forEach(button => {
    button.onclick = () => {
      const library = libraries.find(item =>
        item.id === button.dataset.libraryEdit
      );

      openModal(
        `
          <h2>Edit library</h2>
          <label>
            Name
            <input
              id="editLibraryName"
              value="${esc(library.name)}"
            >
          </label>
          <label>
            Description
            <textarea id="editLibraryDescription">${esc(library.description || '')}</textarea>
          </label>
          <button id="saveLibrary">Save</button>
        `,
        () => {
          $('#saveLibrary').onclick = async () => {
            engine.updateLibrary(library.id, {
              name:
                $('#editLibraryName').value.trim() ||
                library.name,
              description:
                $('#editLibraryDescription').value.trim()
            });

            closeModal();
            await refresh();
          };
        }
      );
    };
  });

  $$('[data-library-delete]').forEach(button => {
    button.onclick = async () => {
      if (
        confirm(
          'Delete this library and every document indexed inside it?'
        )
      ) {
        try {
          await engine.deleteLibrary(
            button.dataset.libraryDelete
          );

          await refresh();
        } catch (error) {
          alert(error.message);
        }
      }
    };
  });
}

function renderDocuments(documents) {
  $('#documents').innerHTML = documents.length
    ? documents.map(document => `
        <article
          class="doc
            ${document.status}
            ${document.id === selectedDoc ? 'selected' : ''}"
          data-document-row="${document.id}"
        >
          <div class="file-icon">
            ${(
              document.extension ||
              document.name.split('.').pop() ||
              'DOC'
            )
              .toUpperCase()
              .slice(0, 4)}
          </div>

          <div class="doc-main">
            <strong>${esc(document.title || document.name)}</strong>
            <span>
              ${esc(document.category || 'General')}
              · ${fmt(document.sectionCount)} sections
              · ${formatBytes(document.size)}
            </span>
            <small class="health ${esc(document.health || 'warning')}">
              ${esc(document.health || document.status)}
              —
              ${esc(
                document.healthDetail ||
                document.error ||
                'No health details'
              )}
            </small>
          </div>

          <button
            class="subtle"
            data-inspect="${document.id}"
          >
            Inspect
          </button>

          <button
            class="danger"
            data-remove="${document.id}"
          >
            Remove
          </button>
        </article>
      `).join('')
    : `
      <div class="empty">
        No documents in this library match the current filter.
      </div>
    `;

  $$('[data-document-row]').forEach(row => {
    row.onclick = event => {
      if (event.target.closest('button')) {
        return;
      }

      selectedDoc = row.dataset.documentRow;

      renderDocumentMetadata(
        documents.find(document =>
          document.id === selectedDoc
        )
      );

      renderDocuments(documents);
    };
  });

  $$('[data-remove]').forEach(button => {
    button.onclick = async () => {
      if (
        confirm(
          'Remove this document and all indexed sections?'
        )
      ) {
        await engine.removeDocument(
          button.dataset.remove
        );

        if (selectedDoc === button.dataset.remove) {
          selectedDoc = null;
        }

        refresh();
      }
    };
  });

  $$('[data-inspect]').forEach(button => {
    button.onclick = () => {
      selectedDoc = button.dataset.inspect;
      show('sources');
    };
  });

  renderDocumentMetadata(
    documents.find(document =>
      document.id === selectedDoc
    )
  );
}

function renderDocumentMetadata(document) {
  $('#documentMetadata').innerHTML = document
    ? `
      <div class="metadata-health ${esc(document.health || 'warning')}">
        <span>
          ${document.health === 'healthy'
            ? '✓'
            : document.health === 'error'
              ? '×'
              : '!'}
        </span>

        <div>
          <strong>
            ${esc((document.health || 'warning').toUpperCase())}
          </strong>
          <small>
            ${esc(document.healthDetail || 'No details')}
          </small>
        </div>
      </div>

      <dl>
        <dt>Title</dt>
        <dd>${esc(document.title || document.name)}</dd>

        <dt>Filename</dt>
        <dd>${esc(document.name)}</dd>

        <dt>Category</dt>
        <dd>${esc(document.category || 'General')}</dd>

        <dt>Type</dt>
        <dd>
          ${esc(
            document.extension?.toUpperCase() ||
            document.type ||
            'Unknown'
          )}
        </dd>

        <dt>Size</dt>
        <dd>${formatBytes(document.size)}</dd>

        <dt>Sections</dt>
        <dd>${fmt(document.sectionCount)}</dd>

        <dt>Characters</dt>
        <dd>${fmt(document.characterCount)}</dd>

        <dt>Indexed</dt>
        <dd>${new Date(document.indexedAt).toLocaleString()}</dd>
      </dl>
    `
    : `
      <div class="empty">
        Select a document to review its health and metadata.
      </div>
    `;
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1048576).toFixed(1)} MB`;
}

async function renderSources() {
  const documents = await engine.documents();
  const sections = await engine.sections();

  $('#sourceDocs').innerHTML = `
    <div class="source-filter">
      <input
        id="sourceDocumentFilter"
        placeholder="Filter source documents…"
      >
    </div>
    <div id="sourceDocumentList"></div>
  `;

  const drawDocuments = () => {
    const query = (
      $('#sourceDocumentFilter')?.value ||
      ''
    )
      .trim()
      .toLowerCase();

    const shown = documents.filter(document =>
      `
        ${document.name}
        ${document.title || ''}
        ${document.category || ''}
      `
        .toLowerCase()
        .includes(query)
    );

    $('#sourceDocumentList').innerHTML = shown.length
      ? shown.map(document => `
          <button
            class="source-doc
              ${document.id === selectedDoc ? 'active' : ''}"
            data-doc="${document.id}"
          >
            <span>
              <strong>
                ${esc(document.title || document.name)}
              </strong>
              <small>
                ${esc(document.category || 'General')}
                · ${esc((document.health || 'warning').toUpperCase())}
              </small>
            </span>
            <b>${fmt(document.sectionCount)}</b>
          </button>
        `).join('')
      : '<div class="empty">No matching documents.</div>';

    $$('[data-doc]').forEach(button => {
      button.onclick = () => {
        selectedDoc = button.dataset.doc;
        renderSources();
      };
    });
  };

  $('#sourceDocumentFilter').oninput = drawDocuments;
  drawDocuments();

  const selected =
    documents.find(document =>
      document.id === selectedDoc
    ) ||
    documents[0];

  if (!selected) {
    $('#sourceDetail').innerHTML =
      '<div class="empty">No indexed documents.</div>';

    return;
  }

  selectedDoc = selected.id;

  const documentLabel = preferredText(
    selected.title,
    selected.name,
    'Untitled document'
  );

  const selectedSections = sections
    .filter(section =>
      section.documentId === selected.id
    )
    .sort((a, b) =>
      a.order - b.order
    );

  const sectionText = section => preferredText(
    section?.text,
    section?.content,
    section?.metadata?.text,
    section?.metadata?.content
  );

  const sectionHeading = (section, index) => preferredText(
    section?.heading,
    section?.label,
    section?.title,
    section?.metadata?.heading,
    section?.metadata?.title,
    `Section ${Math.max(0, index) + 1}`
  );

  const sectionLocation = section => preferredText(
    section?.location,
    section?.sectionLabel,
    section?.metadata?.location,
    section?.metadata?.sectionLabel
  );

  const sectionSourceLabel = (section, index) => preferredText(
    section?.sourceLabel,
    section?.source,
    section?.metadata?.sourceLabel,
    section?.metadata?.source,
    section?.heading,
    section?.label,
    section?.title,
    `Section ${Math.max(0, index) + 1}`
  );

  const totalWords = selectedSections.reduce(
    (total, section) =>
      total +
      (
        section.wordCount ??
        (sectionText(section).trim()
          ? sectionText(section).trim().split(/\s+/).length
          : 0)
      ),
    0
  );

  const emptySections = selectedSections.filter(section =>
    !sectionText(section).trim()
  ).length;

  const shortSections = selectedSections.filter(section =>
    (section.characters || 0) < 120
  ).length;

  const duplicateHeadings = Object.entries(
    selectedSections.reduce(
      (map, section, index) => {
        const heading = sectionHeading(section, index);
        map[heading] =
          (map[heading] || 0) + 1;

        return map;
      },
      {}
    )
  ).filter(([, count]) =>
    count > 1
  ).length;

  const report = {
    document: selected.name,
    health: selected.health || 'warning',
    sections: selectedSections.length,
    characters: selected.characterCount || 0,
    words: totalWords,
    emptySections,
    shortSections,
    duplicateHeadings,
    generatedAt: new Date().toISOString()
  };

  $('#sourceDetail').innerHTML = `
    <div class="source-title">
      <span>EXTRACTION VERIFICATION</span>
      <h2>${esc(documentLabel)}</h2>
      <p>
        ${esc(selected.name)}
        · ${esc(selected.category || 'General')}
      </p>
    </div>

    <div class="inspection-kpis">
      <article>
        <span>SECTIONS</span>
        <strong>${fmt(selectedSections.length)}</strong>
      </article>

      <article>
        <span>WORDS</span>
        <strong>${fmt(totalWords)}</strong>
      </article>

      <article>
        <span>CHARACTERS</span>
        <strong>${fmt(selected.characterCount)}</strong>
      </article>

      <article>
        <span>HEALTH</span>
        <strong class="health ${esc(selected.health || 'warning')}">
          ${esc((selected.health || 'warning').toUpperCase())}
        </strong>
      </article>
    </div>

    <div class="inspection-toolbar">
      <input
        id="sectionFilter"
        placeholder="Search headings or extracted text…"
      >

      <select id="sectionLevel">
        <option value="">All levels</option>
        ${[1, 2, 3, 4, 5, 6]
          .map(level =>
            `<option value="${level}">Level ${level}</option>`
          )
          .join('')}
      </select>

      <button id="expandSections" class="subtle">Expand all</button>
      <button id="collapseSections" class="subtle">Collapse all</button>
      <button id="exportExtraction" class="subtle">Export report</button>
    </div>

    <div class="extraction-report
      ${emptySections || shortSections ? 'attention' : 'healthy'}"
    >
      <strong>
        ${emptySections
          ? 'Extraction needs attention'
          : shortSections
            ? 'Review short sections'
            : 'Extraction verified'}
      </strong>

      <span>
        ${emptySections} empty
        · ${shortSections} short
        · ${duplicateHeadings} duplicate heading${duplicateHeadings === 1 ? '' : 's'}
      </span>
    </div>

    <div id="sectionResults"></div>
  `;

  const drawSections = () => {
    const query = (
      $('#sectionFilter').value ||
      ''
    )
      .trim()
      .toLowerCase();

    const level = $('#sectionLevel').value;

    const shown = selectedSections.filter((section, index) =>
      (
        !query ||
        `${sectionHeading(section, index)} ${sectionText(section)}`
          .toLowerCase()
          .includes(query)
      ) &&
      (
        !level ||
        String(section.level || 1) === level
      )
    );

    $('#sectionResults').innerHTML = shown.length
      ? shown.map(section => {
          const sectionIndex = selectedSections.indexOf(section);
          const heading = sectionHeading(section, sectionIndex);
          const location = sectionLocation(section);
          const text = sectionText(section);

          return `
          <details
            class="source-section"
            ${sectionIndex === 0 && !query ? 'open' : ''}
          >
            <summary>
              <b>${section.order + 1}</b>

              <span style="--level:${Math.max(0, (section.level || 1) - 1)}">
                <strong>${esc(heading)}</strong>
                <small>
                  ${esc(
                    (Array.isArray(section.path)
                      ? section.path.map(safeText).join(' › ')
                      : safeText(section.path)) ||
                    location
                  )}
                  · ${fmt(section.characters)} chars
                  · ${fmt(section.wordCount || 0)} words
                </small>
              </span>

              <em>L${section.level || 1}</em>
            </summary>

            <div class="section-actions">
              <button
                class="subtle"
                data-copy-section="${section.id}"
              >
                Copy text
              </button>

              <button
                class="subtle"
                data-copy-citation="${section.id}"
              >
                Copy source label
              </button>
            </div>

            <pre>${esc(text)}</pre>
          </details>
        `;
        }).join('')
      : '<div class="empty">No sections match this filter.</div>';

    $$('[data-copy-section]').forEach(button => {
      button.onclick = () => {
        const section = selectedSections.find(item =>
          item.id === button.dataset.copySection
        );

        navigator.clipboard.writeText(
          sectionText(section)
        );
      };
    });

    $$('[data-copy-citation]').forEach(button => {
      button.onclick = () => {
        const section = selectedSections.find(item =>
          item.id === button.dataset.copyCitation
        );

        const sectionIndex = selectedSections.indexOf(section);
        const sourceLabel = sectionSourceLabel(section, sectionIndex);
        const location = sectionLocation(section);

        navigator.clipboard.writeText([
          `${documentLabel} — ${sourceLabel}`,
          location ? `(${location})` : ''
        ].filter(Boolean).join(' '));
      };
    });
  };

  $('#sectionFilter').oninput = drawSections;
  $('#sectionLevel').onchange = drawSections;

  $('#expandSections').onclick = () => {
    $$('#sectionResults details').forEach(details => {
      details.open = true;
    });
  };

  $('#collapseSections').onclick = () => {
    $$('#sectionResults details').forEach(details => {
      details.open = false;
    });
  };

  $('#exportExtraction').onclick = () => {
    download(
      `${documentLabel.replace(/[^a-z0-9]+/gi, '-') || 'document'}-extraction-report.json`,
      JSON.stringify(
        {
          ...report,
          sections: selectedSections.map(
            ({
              id,
              projectId,
              libraryId,
              documentId,
              ...section
            }) => section
          )
        },
        null,
        2
      ),
      'application/json'
    );
  };

  drawSections();
}

function renderEvals() {
  const evaluations = state().evaluations;

  $('#evalList').innerHTML = evaluations.length
    ? evaluations.map(evaluation => `
        <article class="eval">
          <div>
            <strong>${esc(evaluation.question)}</strong>
            <span>
              Expected source:
              ${esc(evaluation.expectedSource || 'Any supporting source')}
            </span>
          </div>

          <button data-run="${evaluation.id}">Run</button>

          <button
            class="danger"
            data-del-eval="${evaluation.id}"
          >
            ×
          </button>
        </article>
      `).join('')
    : '<div class="empty">No evaluation cases yet.</div>';

  $$('[data-del-eval]').forEach(button => {
    button.onclick = () => {
      engine.removeEvaluation(
        button.dataset.delEval
      );

      renderEvals();
    };
  });

  $$('[data-run]').forEach(button => {
    button.onclick = async () => {
      const evaluation = state().evaluations.find(item =>
        item.id === button.dataset.run
      );

      button.disabled = true;
      button.textContent = 'Running…';

      try {
        const result = await engine.runEvaluation(
          evaluation
        );

        $('#evalResult').innerHTML = `
          <div class="score
            ${result.score >= 80
              ? 'good'
              : result.score >= 60
                ? 'warn'
                : 'bad'}"
          >
            ${result.score}
            <small>/100</small>
          </div>

          <h3>Result</h3>

          <p>
            ${result.citations} citation(s)
            · source match ${result.sourceMatch ? 'yes' : 'no'}
          </p>

          <h4>Missing facts</h4>

          <p>
            ${result.missingFacts.map(esc).join('<br>') || 'None'}
          </p>

          <h4>Prohibited statements found</h4>

          <p>
            ${result.prohibitedHits.map(esc).join('<br>') || 'None'}
          </p>

          <details>
            <summary>Answer</summary>
            <pre>${esc(result.answer)}</pre>
          </details>
        `;
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
        button.textContent = 'Run';
      }
    };
  });
}

$('#addEval').onclick = () => openModal(
  `
    <h2>Add SME evaluation</h2>

    <label>
      Question
      <textarea id="eQuestion"></textarea>
    </label>

    <label>
      Expected source or section
      <input id="eSource">
    </label>

    <label>
      Required facts — one per line
      <textarea id="eFacts"></textarea>
    </label>

    <label>
      Prohibited assumptions — one per line
      <textarea id="eProhibited"></textarea>
    </label>

    <button id="saveEval">Save case</button>
  `,
  () => {
    $('#saveEval').onclick = () => {
      const question = $('#eQuestion').value.trim();

      if (!question) {
        return;
      }

      engine.addEvaluation({
        question,
        expectedSource: $('#eSource').value.trim(),
        requiredFacts: $('#eFacts').value.trim(),
        prohibited: $('#eProhibited').value.trim()
      });

      closeModal();
      renderEvals();
    };
  }
);

function loadSettings() {
  const settings = state().settings;

  $('#apiUrl').value = settings.openaiUrl;
  $('#model').value = settings.openaiModel;
  $('#apiKey').value = settings.openaiKey;
  $('#timeout').value = settings.timeout / 1000;
  $('#topK').value = settings.topK;
}

$('#saveSettings').onclick = () => {
  engine.saveSettings({
    openaiUrl: $('#apiUrl').value.trim(),
    openaiModel: $('#model').value.trim(),
    openaiKey: $('#apiKey').value.trim(),
    timeout: Number($('#timeout').value) * 1000,
    topK: Number($('#topK').value)
  });

  alert('Settings saved in this browser.');
  refresh();
};

$('#exportProject').onclick = async () => {
  const data = await engine.exportProject();

  download(
    `${data.manifest.project.name.replace(/[^a-z0-9]+/gi, '-')}-mission-companion.json`,
    JSON.stringify(data, null, 2),
    'application/json'
  );
};

$('#importProject').onchange = async () => {
  try {
    const file = $('#importProject').files[0];

    if (!file) {
      return;
    }

    await engine.importProject(
      JSON.parse(await file.text())
    );

    await refresh();
    alert('Project imported.');
  } catch (error) {
    alert(error.message);
  } finally {
    $('#importProject').value = '';
  }
};

function download(name, data, type) {
  const anchor = document.createElement('a');

  anchor.href = URL.createObjectURL(
    new Blob([data], {
      type
    })
  );

  anchor.download = name;
  anchor.click();

  setTimeout(() => {
    URL.revokeObjectURL(anchor.href);
  }, 1000);
}

function openModal(html, ready) {
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
  ready?.();
}

function closeModal() {
  $('#modal').hidden = true;
}

$('#closeModal').onclick = closeModal;

$('#modal').onclick = event => {
  if (event.target === $('#modal')) {
    closeModal();
  }
};

$$('[data-settings-tab]').forEach(button => {
  button.onclick = () => {
    $$('[data-settings-tab]').forEach(tab => {
      tab.classList.toggle(
        'active',
        tab === button
      );
    });

    $$('[data-settings-pane]').forEach(pane => {
      pane.classList.toggle(
        'active',
        pane.dataset.settingsPane === button.dataset.settingsTab
      );
    });
  };

  button.dataset.bound = 'true';
});

$('#testConnection').onclick = async () => {
  const button = $('#testConnection');

  button.disabled = true;
  button.textContent = 'Testing…';

  try {
    engine.saveSettings({
      openaiUrl: $('#apiUrl').value.trim(),
      openaiModel: $('#model').value.trim(),
      openaiKey: $('#apiKey').value.trim()
    });

    await engine.testConnection();

    alert('OpenAI connection succeeded.');

    registerModule('AI Engine', 'ready', {
      summary: 'Connection test passed'
    });
  } catch (error) {
    captureError(error, {
      module: 'AI Engine',
      action: 'connection-test'
    });

    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Test connection';
  }
};

$('#openDiagnostics').onclick = () => show('diagnostics');

$('#resetApplication').onclick = async () => {
  if (
    !confirm(
      'This permanently removes all Mission Companion projects, documents, settings, and history stored in this browser. Continue?'
    )
  ) {
    return;
  }

  await engine.resetApplication();
  location.reload();
};

$('#runDiagnostics').onclick = () => renderDiagnostics();

$('#clearLogs').onclick = () => {
  logger.clear();
  renderDiagnostics();
};

$('#exportDiagnostics').onclick = () => {
  download(
    `mission-companion-diagnostics-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(
      diagnosticSnapshot(),
      null,
      2
    ),
    'application/json'
  );
};

window.addEventListener(
  'mc:open-diagnostics',
  () => show('diagnostics')
);

window.addEventListener(
  'mc:diagnostics',
  () => {
    if (view === 'diagnostics') {
      renderDiagnosticLog();
    }
  }
);

async function renderDiagnostics() {
  const data = await runHealthChecks(engine);

  const healthy = data.checks.filter(check =>
    check.status === 'healthy' ||
    check.status === 'configured'
  ).length;

  const failures = data.checks.filter(check =>
    check.status === 'failed'
  ).length;

  $('#healthSummary').innerHTML = `
    <article>
      <span>STATUS</span>
      <strong class="${failures ? 'bad-text' : 'good-text'}">
        ${failures ? 'Attention required' : 'Operational'}
      </strong>
    </article>

    <article>
      <span>CHECKS PASSED</span>
      <strong>${healthy}/${data.checks.length}</strong>
    </article>

    <article>
      <span>LIFECYCLE</span>
      <strong>${esc(data.lifecycle)}</strong>
    </article>

    <article>
      <span>VERSION</span>
      <strong>2.8.0</strong>
    </article>
  `;

  $('#healthChecks').innerHTML = data.checks
    .map(check => `
      <article class="health-row ${check.status}">
        <span class="health-icon">
          ${check.status === 'healthy' || check.status === 'configured'
            ? '✓'
            : check.status === 'failed'
              ? '×'
              : '!'}
        </span>

        <div>
          <strong>${esc(check.name)}</strong>
          <small>${esc(check.detail)}</small>
        </div>
      </article>
    `)
    .join('');

  renderDiagnosticLog();
}

function renderDiagnosticLog() {
  const rows = logger.list().slice().reverse();

  $('#diagnosticLog').innerHTML = rows.length
    ? rows.map(row => `
        <article class="log-row ${row.level}">
          <time>
            ${new Date(row.time).toLocaleTimeString()}
          </time>

          <strong>
            ${esc(row.level.toUpperCase())}
          </strong>

          <span>
            ${esc(row.message)}
          </span>

          ${Object.keys(row.details || {}).length
            ? `
              <details>
                <summary>Details</summary>
                <pre>${esc(JSON.stringify(row.details, null, 2))}</pre>
              </details>
            `
            : ''}
        </article>
      `).join('')
    : '<div class="empty">No diagnostic events recorded.</div>';
}

function verifyStartup() {
  const result = verifyButtons([
    '[data-view="chat"]',
    '[data-view="knowledge"]',
    '[data-view="sources"]',
    '[data-view="evaluate"]',
    '[data-view="settings"]',
    '[data-view="diagnostics"]',
    '#send',
    '#upload',
    '#saveSettings',
    '#runDiagnostics'
  ]);

  registerModule(
    'Button Verification',
    result.missing.length || result.unattached.length
      ? 'warning'
      : 'ready',
    {
      summary: `${result.attached}/${result.total} attached`,
      ...result
    }
  );

  registerModule('UI', 'ready', {
    summary: 'Application shell rendered'
  });

  registerModule('Storage', 'ready', {
    summary: 'Browser storage initialized'
  });

  $('#healthText').textContent = result.missing.length
    ? 'Startup warning'
    : 'System ready';

  $('#healthDot').classList.toggle(
    'warning',
    Boolean(result.missing.length)
  );
}

loadSettings();

refresh()
  .then(() => {
    verifyStartup();

    setLifecycle('ready', {
      startupMs:
        Date.now() -
        (
          window.__MC_BOOT_TIME__ ||
          Date.now()
        )
    });

    logger.info('Mission Companion ready', {
      version: '2.8.0'
    });
  })
  .catch(error => {
    setLifecycle('error');

    captureError(error, {
      module: 'Startup'
    });
  });

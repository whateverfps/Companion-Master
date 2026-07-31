import { engine } from './engine.js';
import { logger, setLifecycle, registerModule, captureError, verifyButtons, runHealthChecks, diagnosticSnapshot, installGlobalHandlers } from './diagnostics.js';
import {
  firstText,
  sectionHeadingValue,
  sectionLocationValue,
  sectionNumberKey,
  sectionSourceLabelValue,
  sectionTextValue,
  textValue
} from './data-model.js';

installGlobalHandlers();
setLifecycle('loading-ui');

const app = document.querySelector('#app');
const safeText = textValue;
const preferredText = firstText;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));
const fmt = n => new Intl.NumberFormat().format(n || 0);
const chiefAssets = {
  idle: './src/assets/chief/chief-idle.png',
  busy: './src/assets/chief/chief-concept.png',
  success: './src/assets/chief/chief-smile.png',
  error: './src/assets/chief/chief-idle.png'
};
const chiefStateCopy = {
  idle: {
    label: 'Idle',
    detail: 'Ready to assist'
  },
  busy: {
    label: 'Thinking',
    detail: 'Searching project knowledge…'
  },
  success: {
    label: 'Complete',
    detail: 'Evidence prepared'
  },
  error: {
    label: 'Attention',
    detail: 'Action required'
  }
};

let view = 'chat';
let selectedDoc = null;
let selectedKnowledgeSection = 'all';
let knowledgeCatalogContext = null;
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
      <button data-view="project">Project Workspace</button>
      <button data-view="chat" class="active">Command Desk</button>
      <button data-view="knowledge">Knowledge Workspace</button>
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

    <section id="project" class="view">
      <header id="projectWorkspaceHeader" class="mc-project-header"></header>

      <section aria-labelledby="projectHealthTitle">
        <div class="mc-project-section-heading">
          <div>
            <span>KNOWLEDGE READINESS</span>
            <h2 id="projectHealthTitle">Knowledge Health</h2>
          </div>
        </div>
        <div id="projectHealth" class="mc-project-health"></div>
      </section>

      <section
        class="panel mc-project-section"
        aria-labelledby="projectLibrariesTitle"
      >
        <div class="mc-project-section-heading">
          <div>
            <span>PROJECT STRUCTURE</span>
            <h2 id="projectLibrariesTitle">Library Overview</h2>
          </div>
        </div>
        <div id="projectLibraries" class="mc-project-libraries"></div>
      </section>

      <div class="mc-project-workspace-grid">
        <section
          class="panel mc-project-section mc-project-readiness"
          aria-labelledby="projectReadinessTitle"
        >
          <div class="mc-project-section-heading">
            <div>
              <span>DOCUMENT STATUS</span>
              <h2 id="projectReadinessTitle">Document Readiness</h2>
            </div>
            <div
              id="projectReadinessFilters"
              class="mc-project-filters"
              aria-label="Filter documents by readiness"
            ></div>
          </div>
          <div id="projectReadinessTable"></div>
        </section>

        <aside class="mc-project-side">
          <section
            class="panel mc-project-section"
            aria-labelledby="projectAttentionTitle"
          >
            <div class="mc-project-section-heading">
              <div>
                <span>OBSERVED CONDITIONS</span>
                <h2 id="projectAttentionTitle">Attention Items</h2>
              </div>
            </div>
            <div id="projectAttention"></div>
          </section>

          <section
            class="panel mc-project-section"
            aria-labelledby="projectActionsTitle"
          >
            <div class="mc-project-section-heading">
              <div>
                <span>INTERFACE GUIDANCE</span>
                <h2 id="projectActionsTitle">Suggested Next Actions</h2>
              </div>
            </div>
            <div id="projectActions" class="mc-project-actions"></div>
          </section>
        </aside>
      </div>
    </section>

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
              <h2>Ask Chief</h2>
            </div>
            <div class="mc-chief-panel-actions">
              <div
                id="chiefStatus"
                class="mc-chief-status"
                data-chief-state="idle"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <img
                  id="chiefStatusImage"
                  src="./src/assets/chief/chief-idle.png"
                  alt=""
                  aria-hidden="true"
                >
                <span class="mc-chief-status-copy">
                  <strong id="chiefStatusLabel">Idle</strong>
                  <small id="chiefStatusDetail">Ready to assist</small>
                </span>
              </div>
              <button id="clearChat" class="subtle">New conversation</button>
            </div>
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
            <div class="empty">
              Evidence will appear here after Chief answers a question using
              your project documents.
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section id="knowledge" class="view">
      <header class="mc-knowledge-heading">
        <div>
          <span>PROJECT KNOWLEDGE</span>
          <h2>Knowledge Workspace</h2>
        </div>
        <p>Browse libraries, inspect documents, and review indexed structure.</p>
      </header>

      <div
        id="knowledgeCatalogSummary"
        class="mc-library-summary"
        aria-label="Knowledge catalog summary"
      ></div>

      <div class="knowledge-grid">
        <aside class="panel library-panel">
          <div class="panel-head">
            <div>
              <span>KNOWLEDGE ORGANIZATION</span>
              <h2>Knowledge Catalog</h2>
            </div>
            <button id="newLibrary" class="subtle">＋ New</button>
          </div>

          <nav
            id="knowledgeCatalog"
            class="mc-library-catalog"
            aria-label="Knowledge catalog sections"
          ></nav>

          <section
            class="mc-library-types"
            aria-labelledby="knowledgeTypesTitle"
          >
            <div class="mc-library-subhead">
              <span>LIBRARY COVERAGE</span>
              <h3 id="knowledgeTypesTitle">Knowledge Types</h3>
            </div>
            <div id="knowledgeTypeCoverage"></div>
          </section>

          <div class="mc-library-subhead mc-library-subhead-libraries">
            <span>UPLOAD DESTINATIONS</span>
            <h3>Libraries</h3>
          </div>
          <div id="libraries" class="library-list"></div>
        </aside>

        <section class="panel knowledge-main">
          <div class="panel-head">
            <div>
              <span id="activeLibraryTitle">ACTIVE UPLOAD LIBRARY</span>
              <h2 id="knowledgeBrowserTitle">All Knowledge</h2>
              <small id="knowledgeBrowserCount"></small>
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
            <label class="mc-knowledge-search">
              <span>Knowledge Search</span>
              <input
                id="documentFilter"
                type="search"
                placeholder="Search documents and metadata…"
              >
            </label>
            <button
              id="clearKnowledgeFilters"
              type="button"
              class="subtle"
            >
              All Knowledge
            </button>
          </div>

          <div
            id="documents"
            class="document-list"
            aria-live="polite"
          ></div>
        </section>

        <aside class="panel metadata-panel">
          <div class="panel-head">
            <div>
              <span id="documentDetailsEyebrow">CATALOG COVERAGE</span>
              <h2 id="documentDetailsTitle">Document Details</h2>
            </div>
          </div>

          <div id="documentMetadata" class="document-metadata">
            <div class="empty">
              Select a document to review its metadata and indexed structure.
            </div>
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

function setChiefState(name = 'idle') {
  const stateName = chiefStateCopy[name] ? name : 'idle';
  const copy = chiefStateCopy[stateName];
  const status = $('#chiefStatus');

  status.dataset.chiefState = stateName;
  $('#chiefStatusImage').src = chiefAssets[stateName];
  $('#chiefStatusLabel').textContent = copy.label;
  $('#chiefStatusDetail').textContent = copy.detail;
}

const titles = {
  project: [
    'Project Workspace',
    'Review active-project knowledge readiness and operational status.'
  ],
  diagnostics: [
    'Diagnostics',
    'Inspect application health, startup checks, logs, and roadmap.'
  ],
  chat: [
    'Command Desk',
    'Ask project-specific questions and receive source-grounded answers.'
  ],
  knowledge: [
    'Knowledge Workspace',
    'Browse project documents, metadata, and indexed structure.'
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

  if (name === 'project') {
    renderProjectWorkspace();
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

  renderMessages(documents, sections);
  renderProjectWorkspace(documents, sections);
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
  selectedKnowledgeSection = 'all';
  knowledgeCatalogContext = null;
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

function promptSuggestions(documents = [], sections = []) {
  const indexingIncomplete = documents.some(document =>
    document.status !== 'verified' ||
    Number(document.sectionCount || 0) <= 0
  );

  if (!documents.length) {
    return [
      { label: 'Add project documents', view: 'knowledge' },
      { label: 'Open the Knowledge Workspace', view: 'knowledge' },
      { label: 'Configure this project', view: 'settings' }
    ];
  }

  if (!sections.length || indexingIncomplete) {
    return [
      { label: 'Inspect document extraction', view: 'sources' },
      { label: 'Review the Knowledge Workspace', view: 'knowledge' },
      { label: 'Check diagnostics', view: 'diagnostics' }
    ];
  }

  return [
    { label: 'Summarize the key requirements in this project' },
    { label: 'Identify open risks or conflicts in the indexed documents' },
    { label: 'Compare related requirements across sources' },
    { label: 'Show the strongest evidence for a project question' }
  ];
}

function renderPromptSuggestions(documents, sections) {
  const suggestions = promptSuggestions(documents, sections);
  const heading = suggestions.every(suggestion => !suggestion.view)
    ? 'Ask a source-grounded question'
    : 'Recommended next steps';

  return `
    <div class="mc-prompt-suggestions">
      <p class="mc-prompt-heading">${heading}</p>
      <div class="mc-prompt-list">
        ${suggestions.map(suggestion => `
          <button
            type="button"
            class="mc-prompt-button"
            ${suggestion.view
              ? `data-prompt-view="${suggestion.view}"`
              : `data-prompt-question="${esc(suggestion.label)}"`}
          >
            ${esc(suggestion.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function formatInlineMessage(value) {
  return String(value || '')
    .split(/(`[^`\n]+`)/g)
    .map(part => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return `<code>${esc(part.slice(1, -1))}</code>`;
      }

      return esc(part)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[S(\d+)\]/g, '<span class="mc-citation-ref">[S$1]</span>');
    })
    .join('');
}

function formatMessageContent(content) {
  const lines = String(content || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const code = [];
      index += 1;

      while (index < lines.length && !lines[index].trimStart().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }

      index += index < lines.length ? 1 : 0;
      blocks.push(`
        <pre class="mc-message-code"><code${language
          ? ` data-language="${esc(language)}"`
          : ''}>${esc(code.join('\n'))}</code></pre>
      `);
      continue;
    }

    if (
      line.includes('|') &&
      index + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])
    ) {
      const tableLines = [line];
      index += 2;

      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const cells = tableLines.map(row =>
        row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
      );

      blocks.push(`
        <div class="mc-message-table-wrap">
          <table>
            <thead>
              <tr>${cells[0].map(cell => `<th>${formatInlineMessage(cell)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${cells.slice(1).map(row => `
                <tr>${row.map(cell => `<td>${formatInlineMessage(cell)}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];

      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }

      blocks.push(`<blockquote>${formatInlineMessage(quote.join('\n')).replace(/\n/g, '<br>')}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const matcher = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const items = [];

      while (index < lines.length && matcher.test(lines[index])) {
        items.push(lines[index].replace(matcher, ''));
        index += 1;
      }

      const tag = ordered ? 'ol' : 'ul';
      blocks.push(`<${tag}>${items.map(item => `<li>${formatInlineMessage(item)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (/^\s*#{1,4}\s+/.test(line)) {
      const match = line.match(/^\s*(#{1,4})\s+(.+)$/);
      const level = Math.min(match[1].length + 2, 6);
      blocks.push(`<h${level}>${formatInlineMessage(match[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const paragraph = [line];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trimStart().startsWith('```') &&
      !/^\s*(>|[-*]\s+|\d+\.\s+|#{1,4}\s+)/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push(`<p>${formatInlineMessage(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
  }

  return blocks.join('');
}

function renderAssistantCitations(message, messageIndex) {
  const hits = Array.isArray(message.hits) ? message.hits : [];

  if (!hits.length) {
    return '';
  }

  return `
    <details class="mc-message-citations" id="mc-citations-${messageIndex}" open>
      <summary>
        <span>Evidence sources</span>
        <span class="mc-message-source-count">${hits.length}</span>
      </summary>
      <div class="mc-message-citation-list">
        ${hits.map(hit => `
          <div>
            <strong>[S${hit.sourceNumber}] ${esc(hit.heading)}</strong>
            <span>${esc(hit.documentName)} · ${esc(hit.location)}</span>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

function renderAssistantToolbar(message, messageIndex) {
  const hasCitations = Array.isArray(message.hits) && message.hits.length > 0;
  const canCopy = Boolean(navigator.clipboard?.writeText);

  return `
    <div class="mc-message-toolbar" role="toolbar" aria-label="Response actions">
      <button
        type="button"
        data-copy-message="${esc(message.id)}"
        ${canCopy ? '' : 'disabled'}
      >
        Copy
      </button>
      <button
        type="button"
        disabled
        title="Regenerate is not available in the current conversation workflow"
      >
        Regenerate
      </button>
      <button
        type="button"
        data-collapse-citations="mc-citations-${messageIndex}"
        aria-expanded="true"
        ${hasCitations ? '' : 'disabled'}
      >
        Collapse citations
      </button>
    </div>
  `;
}

function isMessagesNearBottom() {
  const messages = $('#messages');
  return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 120;
}

function revealLatestMessage(smooth = false) {
  const messages = $('#messages');
  const reduceMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  )?.matches;

  messages.scrollTo({
    top: messages.scrollHeight,
    behavior: smooth && !reduceMotion ? 'smooth' : 'auto'
  });
}

function renderMessages(
  documents = [],
  sections = [],
  { revealLatest = true, smooth = false } = {}
) {
  const chat = state().chat;
  const previousScrollTop = $('#messages').scrollTop;

  $('#messages').innerHTML = chat.length
    ? chat.map((message, messageIndex) => `
        <article class="message ${message.role}">
          ${message.role === 'user'
            ? '<div class="avatar">YOU</div>'
            : `
              <div class="mc-chief-message-avatar">
                <img
                  src="${chiefAssets.idle}"
                  alt=""
                  aria-hidden="true"
                >
              </div>
            `}
          <div>
            <div class="message-meta">
              ${message.role === 'user' ? 'You' : 'Chief · Mission Companion'}
              ${message.mode ? ` · ${modeLabel(message.mode)}` : ''}
            </div>
            <div class="message-text ${message.role === 'assistant' ? 'mc-message-card' : ''}">
              <div class="mc-message-content">
                ${message.role === 'assistant'
                  ? formatMessageContent(message.content)
                  : esc(message.content).replace(/\n/g, '<br>')}
              </div>
              ${message.role === 'assistant'
                ? `
                  ${renderAssistantCitations(message, messageIndex)}
                  ${renderAssistantToolbar(message, messageIndex)}
                `
                : ''}
            </div>
          </div>
        </article>
      `).join('')
    : `
      <div class="welcome mc-chief-welcome">
        <div class="mc-chief-welcome-portrait">
          <img
            src="${chiefAssets.idle}"
            alt="Chief, the Mission Companion assistant"
          >
        </div>
        <div class="mc-chief-welcome-copy">
        <span>CHIEF · ENGINEERING ADVISOR</span>
        <h3>Chief is ready.</h3>
        <p>
          Ask a question about your project documents.
        </p>
        <ol class="mc-chief-onboarding" aria-label="Getting started">
          <li class="mc-chief-onboarding-step">
            <span>Step 1</span>
            <strong>Add project documents</strong>
          </li>
          <li class="mc-chief-onboarding-step">
            <span>Step 2</span>
            <strong>Inspect extraction</strong>
          </li>
          <li class="mc-chief-onboarding-step">
            <span>Step 3</span>
            <strong>Ask evidence-based questions</strong>
          </li>
        </ol>
        ${renderPromptSuggestions(documents, sections)}
        </div>
      </div>
    `;

  if (revealLatest) {
    revealLatestMessage(smooth);
  } else {
    $('#messages').scrollTop = previousScrollTop;
  }
}

function renderPreparingAnswer(revealLatest) {
  $('#messages').insertAdjacentHTML('beforeend', `
    <article
      class="message assistant mc-message-pending"
      data-pending-answer
      aria-live="polite"
    >
      <div class="mc-chief-message-avatar">
        <img
          src="${chiefAssets.busy}"
          alt=""
          aria-hidden="true"
        >
      </div>
      <div>
        <div class="message-meta">Chief · Mission Companion</div>
        <div class="message-text mc-message-card">
          <div class="mc-message-preparing">
            <span aria-hidden="true"></span>
            <strong>Chief is preparing an answer…</strong>
          </div>
        </div>
      </div>
    </article>
  `);

  if (revealLatest) {
    revealLatestMessage(true);
  }
}

$('#messages').onclick = event => {
  const suggestion = event.target.closest('.mc-prompt-button');

  if (suggestion) {
    if (suggestion.dataset.promptView) {
      show(suggestion.dataset.promptView);
      return;
    }

    if (suggestion.dataset.promptQuestion) {
      $('#prompt').value = suggestion.dataset.promptQuestion;
      resizeComposer();
      $('#prompt').focus();
    }

    return;
  }

  const copyButton = event.target.closest('[data-copy-message]');

  if (copyButton) {
    const message = state().chat.find(item =>
      item.id === copyButton.dataset.copyMessage
    );

    if (message) {
      void copyText(message.content).then(copied => {
        if (!copied) {
          return;
        }

        copyButton.textContent = 'Copied';

        setTimeout(() => {
          if (copyButton.isConnected) {
            copyButton.textContent = 'Copy';
          }
        }, 1400);
      });
    }

    return;
  }

  const collapseButton = event.target.closest('[data-collapse-citations]');

  if (collapseButton) {
    const citations = document.getElementById(
      collapseButton.dataset.collapseCitations
    );

    if (citations) {
      citations.open = !citations.open;
      collapseButton.setAttribute('aria-expanded', String(citations.open));
      collapseButton.textContent = citations.open
        ? 'Collapse citations'
        : 'Expand citations';
    }
  }
};

$('#messages').addEventListener('toggle', event => {
  const citations = event.target;

  if (!citations.classList?.contains('mc-message-citations')) {
    return;
  }

  const collapseButton = $$('[data-collapse-citations]').find(button =>
    button.dataset.collapseCitations === citations.id
  );

  if (collapseButton) {
    collapseButton.setAttribute('aria-expanded', String(citations.open));
    collapseButton.textContent = citations.open
      ? 'Collapse citations'
      : 'Expand citations';
  }
}, true);

$('#clearChat').onclick = () => {
  engine.clearChat();
  setChiefState('idle');
  refresh();
};

async function ask() {
  const prompt = $('#prompt').value.trim();

  if (!prompt || busy) {
    return;
  }

  busy = true;
  const revealResponse = isMessagesNearBottom();
  setChiefState('busy');
  $('#send').disabled = true;
  $('#send').textContent = 'Analyzing…';
  $('#prompt').disabled = true;
  renderPreparingAnswer(revealResponse);

  try {
    const message = await engine.ask(
      prompt,
      $('#mode').value
    );

    $('#prompt').value = '';
    resizeComposer();

    renderMessages([], [], {
      revealLatest: revealResponse,
      smooth: revealResponse
    });

    renderEvidence(
      message.hits,
      message.citations,
      message.citationVerification,
      message.retrievalMeta
    );

    setChiefState('success');
  } catch (error) {
    setChiefState('error');
    $('[data-pending-answer]')?.remove();

    captureError(error, {
      module: 'Conversation',
      action: 'ask'
    });

    alert(error.message);
  } finally {
    busy = false;
    $('#send').disabled = false;
    $('#send').textContent = 'Analyze';
    $('#prompt').disabled = false;
  }
}

$('#send').onclick = ask;

$('#prompt').onkeydown = event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    ask();
  }
};

function resizeComposer() {
  const prompt = $('#prompt');

  prompt.style.height = 'auto';
  prompt.style.height = `${Math.min(prompt.scrollHeight, 200)}px`;
}

$('#prompt').oninput = resizeComposer;
resizeComposer();

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
$('#clearKnowledgeFilters').onclick = () => {
  selectedKnowledgeSection = 'all';
  selectedDoc = null;
  renderKnowledgeWorkspace();
};

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

function knowledgeTypeGroup(document) {
  const extension = safeText(document.extension).toLowerCase();
  const type = safeText(document.type).toLowerCase();

  if (extension === 'pdf' || type.includes('pdf')) {
    return 'PDF';
  }

  if (
    ['doc', 'docx', 'odt', 'rtf'].includes(extension) ||
    type.includes('word') ||
    type.includes('document')
  ) {
    return 'Word';
  }

  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(extension) ||
    type.includes('sheet') ||
    type.includes('excel') ||
    type.includes('csv')
  ) {
    return 'Excel';
  }

  if (
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'tif', 'tiff', 'bmp'].includes(extension) ||
    type.startsWith('image/')
  ) {
    return 'Images';
  }

  if (
    ['html', 'htm', 'xml'].includes(extension) ||
    type.includes('html') ||
    type.includes('xml')
  ) {
    return 'Web/HTML';
  }

  if (
    ['txt', 'md', 'log', 'json'].includes(extension) ||
    type.startsWith('text/') ||
    type.includes('json')
  ) {
    return 'Text';
  }

  return 'Other';
}

function fallbackCatalogSection(document) {
  return {
    PDF: 'PDF Documents',
    Word: 'Word Documents',
    Excel: 'Spreadsheets',
    Images: 'Photos and Media',
    Text: 'Text Documents',
    'Web/HTML': 'Web Documents',
    Other: 'Uncategorized'
  }[knowledgeTypeGroup(document)];
}

function documentCatalogSection(document) {
  const metadataCategory = preferredText(
    document.metadata?.category,
    document.metadata?.documentCategory,
    document.metadata?.knowledgeSection
  ).trim();
  const documentCategory = safeText(document.category).trim();

  if (metadataCategory) {
    return metadataCategory;
  }

  if (documentCategory) {
    return documentCategory;
  }

  const tags = [
    ...(Array.isArray(document.tags) ? document.tags : []),
    ...(Array.isArray(document.metadata?.tags)
      ? document.metadata.tags
      : [])
  ]
    .map(tag => safeText(tag).trim())
    .filter(Boolean);

  if (tags.length) {
    return tags[0];
  }

  return fallbackCatalogSection(document);
}

function knowledgeCatalogData(documents, sections, libraries) {
  const sectionCounts = new Map();

  sections.forEach(section => {
    sectionCounts.set(
      section.documentId,
      (sectionCounts.get(section.documentId) || 0) + 1
    );
  });

  const buildEntry = (name, matchingDocuments) => {
    const indexed = matchingDocuments.filter(document =>
      documentStatus(document).className === 'indexed'
    );
    const pending = matchingDocuments.filter(document =>
      documentStatus(document).className === 'pending'
    );
    const unavailable = matchingDocuments.filter(document =>
      documentStatus(document).className === 'unavailable'
    );
    const unknown = matchingDocuments.filter(document =>
      documentStatus(document).className === 'unknown'
    );
    const exposedSections = matchingDocuments.reduce(
      (total, document) =>
        total + Number(sectionCounts.get(document.id) || 0),
      0
    );
    const indexedWithoutSections = indexed.filter(document =>
      Number(sectionCounts.get(document.id) || 0) <= 0
    );

    let attention = '';

    if (!matchingDocuments.length) {
      attention = 'No content loaded';
    } else if (unavailable.length) {
      attention = 'Document unavailable';
    } else if (pending.length || indexedWithoutSections.length) {
      attention = 'Indexing incomplete';
    } else if (unknown.length || name === 'Uncategorized') {
      attention = 'Metadata incomplete';
    }

    return {
      attention,
      documents: matchingDocuments,
      exposedSections,
      indexed,
      indexedWithoutSections,
      libraries: libraries.filter(library =>
        matchingDocuments.some(document =>
          document.libraryId === library.id
        )
      ),
      name,
      pending,
      unavailable,
      unknown
    };
  };

  const grouped = new Map();

  documents.forEach(document => {
    const name = documentCatalogSection(document);

    if (!grouped.has(name)) {
      grouped.set(name, []);
    }

    grouped.get(name).push(document);
  });

  const entries = [...grouped.entries()]
    .map(([name, matchingDocuments]) =>
      buildEntry(name, matchingDocuments)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const all = buildEntry('All Knowledge', documents);
  const types = ['PDF', 'Word', 'Excel', 'Images', 'Text', 'Web/HTML', 'Other']
    .map(name => {
      const matchingDocuments = documents.filter(document =>
        knowledgeTypeGroup(document) === name
      );

      return {
        documents: matchingDocuments,
        indexed: matchingDocuments.filter(document =>
          documentStatus(document).className === 'indexed'
        ).length,
        name,
        percentage: documents.length
          ? Math.round((matchingDocuments.length / documents.length) * 100)
          : 0
      };
    })
    .filter(type => type.documents.length > 0);

  return {
    all,
    entries,
    sectionCounts,
    types
  };
}

async function renderKnowledgeWorkspace(prefetched = null) {
  const currentState = state();
  const libraries = engine.libraries();
  const allDocuments = prefetched || await engine.documents();
  const allSections = await engine.sections();
  const catalog = knowledgeCatalogData(
    allDocuments,
    allSections,
    libraries
  );

  const activeLibrary =
    libraries.find(library => library.id === currentState.activeLibrary) ||
    libraries[0];

  if (
    activeLibrary &&
    activeLibrary.id !== currentState.activeLibrary
  ) {
    engine.setLibrary(activeLibrary.id);
  }

  if (
    selectedKnowledgeSection !== 'all' &&
    !catalog.entries.some(entry =>
      entry.name === selectedKnowledgeSection
    )
  ) {
    selectedKnowledgeSection = 'all';
    selectedDoc = null;
  }

  const selectedEntry = selectedKnowledgeSection === 'all'
    ? catalog.all
    : catalog.entries.find(entry =>
        entry.name === selectedKnowledgeSection
      ) || catalog.all;

  knowledgeCatalogContext = {
    catalog,
    libraries,
    selectedEntry
  };

  const summaryItems = [
    ['Total documents', allDocuments.length],
    ['Categories represented', catalog.entries.length],
    ['Indexed documents', catalog.all.indexed.length],
    ['Indexed sections', allSections.length],
    ['File types represented', catalog.types.length],
    ['Libraries enabled', libraries.filter(library => library.enabled).length]
  ];

  $('#knowledgeCatalogSummary').innerHTML = summaryItems.map(item => `
    <article>
      <span>${esc(item[0])}</span>
      <strong>${fmt(item[1])}</strong>
    </article>
  `).join('');

  const catalogEntries = [catalog.all, ...catalog.entries];

  $('#knowledgeCatalog').innerHTML = catalogEntries.length
    ? `
      <ul>
        ${catalogEntries.map((entry, index) => {
          const selected = index === 0
            ? selectedKnowledgeSection === 'all'
            : entry.name === selectedKnowledgeSection;

          return `
            <li>
              <button
                type="button"
                class="mc-library-section ${selected ? 'active' : ''}"
                data-catalog-section="${index === 0 ? 'all' : esc(entry.name)}"
                aria-pressed="${selected}"
              >
                <span class="mc-library-section-heading">
                  <strong>${esc(entry.name)}</strong>
                  <span>${fmt(entry.documents.length)}</span>
                </span>
                <span class="mc-library-section-counts">
                  ${fmt(entry.indexed.length)} indexed
                  · ${fmt(entry.pending.length)} pending
                  · ${fmt(entry.unavailable.length)} unavailable
                </span>
                <span class="mc-library-section-sections">
                  ${fmt(entry.exposedSections)} sections
                </span>
                ${entry.attention
                  ? `
                    <span class="mc-library-attention">
                      ${esc(entry.attention)}
                    </span>
                  `
                  : ''}
              </button>
            </li>
          `;
        }).join('')}
      </ul>
    `
    : `
      <div class="mc-library-empty">
        <strong>No knowledge loaded</strong>
        <span>Add documents to begin building the catalog.</span>
      </div>
    `;

  $('#knowledgeTypeCoverage').innerHTML = catalog.types.length
    ? `
      <ul>
        ${catalog.types.map(type => `
          <li>
            <span class="mc-library-type-name">${esc(type.name)}</span>
            <strong>${fmt(type.documents.length)}</strong>
            <span>${fmt(type.percentage)}%</span>
            <small>${fmt(type.indexed)} indexed</small>
          </li>
        `).join('')}
      </ul>
      <p>
        Distribution reflects file types, not project completion or content
        quality.
      </p>
    `
    : `
      <div class="mc-library-empty">
        No file-type coverage is available.
      </div>
    `;

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
    activeLibrary
      ? `ACTIVE UPLOAD LIBRARY · ${activeLibrary.name}`
      : 'ACTIVE UPLOAD LIBRARY UNAVAILABLE';

  let documents = [...selectedEntry.documents];

  const query = $('#documentFilter').value
    .trim()
    .toLowerCase();

  if (query) {
    documents = documents.filter(document =>
      `
        ${document.name}
        ${document.title || ''}
        ${document.category || ''}
        ${document.extension || ''}
        ${document.type || ''}
        ${Array.isArray(document.tags)
          ? document.tags.join(' ')
          : document.tags || ''}
        ${document.metadata
          ? JSON.stringify(document.metadata)
          : ''}
      `
        .toLowerCase()
        .includes(query)
    );
  }

  if (
    selectedDoc &&
    !documents.some(document => document.id === selectedDoc)
  ) {
    selectedDoc = null;
  }

  $('#knowledgeBrowserTitle').textContent = selectedEntry.name;
  $('#knowledgeBrowserCount').textContent = query
    ? `${fmt(documents.length)} of ${fmt(selectedEntry.documents.length)} matching documents`
    : `${fmt(selectedEntry.documents.length)} document${selectedEntry.documents.length === 1 ? '' : 's'}`;
  $('#clearKnowledgeFilters').disabled =
    selectedKnowledgeSection === 'all';

  renderDocuments(
    documents,
    allSections,
    libraries,
    selectedEntry
  );
  renderImportQueue();

  $$('[data-catalog-section]').forEach(button => {
    button.onclick = () => {
      selectedKnowledgeSection = button.dataset.catalogSection;
      selectedDoc = null;
      renderKnowledgeWorkspace();
    };
  });

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

function documentStatus(document) {
  const status = safeText(document.status).toLowerCase();

  if (['verified', 'indexed', 'complete', 'ready'].includes(status)) {
    return {
      className: 'indexed',
      label: 'Indexed'
    };
  }

  if (['waiting', 'processing', 'pending'].includes(status)) {
    return {
      className: 'pending',
      label: 'Pending'
    };
  }

  if (['error', 'failed', 'unavailable'].includes(status)) {
    return {
      className: 'unavailable',
      label: 'Unavailable'
    };
  }

  return {
    className: 'unknown',
    label: status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : 'Status unavailable'
  };
}

function documentType(document) {
  return preferredText(
    document.extension?.toUpperCase(),
    document.type,
    'Type unavailable'
  );
}

function documentPageCount(document) {
  const value = preferredText(
    document.pageCount,
    document.pages,
    document.metadata?.pageCount,
    document.metadata?.pages
  );
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? count : null;
}

function documentModifiedAt(document) {
  const value =
    document.lastModified ??
    document.modifiedAt ??
    document.updatedAt ??
    document.metadata?.lastModified;
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString()
    : '';
}

function projectKnowledgeSnapshot(
  currentState,
  libraries,
  documents,
  sections
) {
  const sectionCounts = new Map();

  sections.forEach(section => {
    sectionCounts.set(
      section.documentId,
      (sectionCounts.get(section.documentId) || 0) + 1
    );
  });

  const indexed = documents.filter(document =>
    documentStatus(document).className === 'indexed'
  );
  const pending = documents.filter(document =>
    documentStatus(document).className === 'pending'
  );
  const unavailable = documents.filter(document =>
    documentStatus(document).className === 'unavailable'
  );
  const unknown = documents.filter(document =>
    documentStatus(document).className === 'unknown'
  );
  const indexedWithoutSections = indexed.filter(document =>
    Number(document.sectionCount || 0) <= 0 ||
    Number(sectionCounts.get(document.id) || 0) <= 0
  );
  const disabledLibrariesWithDocuments = libraries.filter(library =>
    !library.enabled &&
    documents.some(document => document.libraryId === library.id)
  );
  const activeLibrary = libraries.find(
    library => library.id === currentState.activeLibrary
  ) || null;

  let readiness = 'Knowledge indexed';

  if (!currentState.activeProject) {
    readiness = 'No active project';
  } else if (!libraries.length) {
    readiness = 'No libraries';
  } else if (!documents.length) {
    readiness = 'No documents';
  } else if (
    unavailable.length ||
    unknown.length ||
    disabledLibrariesWithDocuments.length
  ) {
    readiness = 'Attention needed';
  } else if (pending.length || indexedWithoutSections.length) {
    readiness = 'Indexing incomplete';
  }

  return {
    activeLibrary,
    disabledLibrariesWithDocuments,
    enabledLibraries: libraries.filter(library => library.enabled),
    indexed,
    indexedWithoutSections,
    pending,
    readiness,
    sectionCounts,
    unavailable,
    unknown
  };
}

function projectKnowledgeUpdatedAt(project, libraries, documents) {
  const timestamps = [
    project?.updatedAt,
    ...libraries.map(library => library.updatedAt),
    ...documents.map(document => document.indexedAt)
  ]
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()));

  if (!timestamps.length) {
    return '';
  }

  return new Date(
    Math.max(...timestamps.map(date => date.getTime()))
  ).toLocaleString();
}

function projectAttentionItems(snapshot, libraries, documents) {
  const items = [];

  if (!libraries.length) {
    items.push({
      text: 'No knowledge libraries are available for the active project.',
      view: 'knowledge',
      action: 'Open Knowledge Workspace'
    });
  }

  if (!documents.length) {
    items.push({
      text: 'No documents are loaded for the active project.',
      view: 'knowledge',
      action: 'Add project documents'
    });
  }

  snapshot.disabledLibrariesWithDocuments.forEach(library => {
    const count = documents.filter(document =>
      document.libraryId === library.id
    ).length;

    items.push({
      text: `${library.name} is disabled and contains ${count} document${count === 1 ? '' : 's'}.`,
      view: 'knowledge',
      libraryId: library.id,
      action: 'Review library'
    });
  });

  if (snapshot.pending.length) {
    items.push({
      text: `${snapshot.pending.length} document${snapshot.pending.length === 1 ? ' is' : 's are'} pending indexing.`,
      view: 'knowledge',
      action: 'Review indexing status'
    });
  }

  if (snapshot.unavailable.length) {
    items.push({
      text: `${snapshot.unavailable.length} document${snapshot.unavailable.length === 1 ? ' is' : 's are'} marked unavailable or failed by production state.`,
      view: 'sources',
      action: 'Inspect documents'
    });
  }

  if (snapshot.indexedWithoutSections.length) {
    items.push({
      text: `${snapshot.indexedWithoutSections.length} indexed document${snapshot.indexedWithoutSections.length === 1 ? ' exposes' : 's expose'} zero available sections.`,
      view: 'sources',
      action: 'Inspect extraction'
    });
  }

  if (snapshot.unknown.length) {
    items.push({
      text: `${snapshot.unknown.length} document${snapshot.unknown.length === 1 ? ' has' : 's have'} no recognized indexing status.`,
      view: 'knowledge',
      action: 'Review metadata'
    });
  }

  return items;
}

function projectNextActions(snapshot, libraries, documents) {
  const actions = [];

  if (!libraries.length || !documents.length) {
    actions.push({
      label: 'Add project documents',
      detail: 'Open the Knowledge Workspace to add source material.',
      view: 'knowledge'
    });
  }

  if (snapshot.pending.length || snapshot.indexedWithoutSections.length) {
    actions.push({
      label: 'Review indexing status',
      detail: 'Inspect document readiness and available sections.',
      view: 'knowledge'
    });
    actions.push({
      label: 'Open diagnostics',
      detail: 'Review the application’s existing operational checks.',
      view: 'diagnostics'
    });
  }

  if (snapshot.unavailable.length || snapshot.unknown.length) {
    actions.push({
      label: 'Inspect document extraction',
      detail: 'Open the existing Source Inspector for document details.',
      view: 'sources'
    });
    actions.push({
      label: 'Open diagnostics',
      detail: 'Review the application’s existing operational checks.',
      view: 'diagnostics'
    });
  }

  if (snapshot.disabledLibrariesWithDocuments.length) {
    actions.push({
      label: 'Review library availability',
      detail: 'Inspect enabled and disabled production libraries.',
      view: 'knowledge'
    });
  }

  if (
    documents.length &&
    !snapshot.pending.length &&
    !snapshot.unavailable.length &&
    !snapshot.unknown.length &&
    !snapshot.indexedWithoutSections.length
  ) {
    actions.push({
      label: 'Explore the Knowledge Workspace',
      detail: 'Browse indexed documents and their available sections.',
      view: 'knowledge'
    });
    actions.push({
      label: 'Ask an evidence-based project question',
      detail: 'Continue to the Command Desk without submitting automatically.',
      view: 'chat'
    });
  }

  return actions
    .filter((action, index, all) =>
      all.findIndex(item => item.label === action.label) === index
    )
    .slice(0, 3);
}

async function renderProjectWorkspace(
  prefetchedDocuments = null,
  prefetchedSections = null
) {
  const currentState = state();
  const project = currentState.projects.find(item =>
    item.id === currentState.activeProject
  );
  const libraries = engine.libraries();
  const documents = prefetchedDocuments || await engine.documents();
  const sections = prefetchedSections || await engine.sections();
  const snapshot = projectKnowledgeSnapshot(
    currentState,
    libraries,
    documents,
    sections
  );
  const lastUpdated = projectKnowledgeUpdatedAt(
    project,
    libraries,
    documents
  );
  const coverage = documents.length
    ? Math.round((snapshot.indexed.length / documents.length) * 100)
    : null;

  $('#projectWorkspaceHeader').innerHTML = project
    ? `
      <div class="mc-project-header-copy">
        <span>ACTIVE PROJECT</span>
        <h2>${esc(project.name)}</h2>
        <p>
          ${project.description
            ? esc(project.description)
            : 'Project description unavailable.'}
        </p>
      </div>
      <dl class="mc-project-header-facts">
        <div>
          <dt>Active library</dt>
          <dd>
            ${snapshot.activeLibrary
              ? esc(snapshot.activeLibrary.name)
              : 'Unavailable'}
          </dd>
        </div>
        <div>
          <dt>Documents</dt>
          <dd>${fmt(documents.length)}</dd>
        </div>
        <div>
          <dt>Indexed sections</dt>
          <dd>${fmt(sections.length)}</dd>
        </div>
        <div>
          <dt>Knowledge last updated</dt>
          <dd>${lastUpdated ? esc(lastUpdated) : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Readiness state</dt>
          <dd>${esc(snapshot.readiness)}</dd>
        </div>
      </dl>
    `
    : `
      <div class="mc-project-empty">
        <h2>No active project</h2>
        <p>Select or create a project to review knowledge readiness.</p>
      </div>
    `;

  const healthCards = [
    ['Total documents', documents.length, 'Loaded for the active project'],
    ['Indexed documents', snapshot.indexed.length, 'Production status is indexed'],
    ['Pending documents', snapshot.pending.length, 'Production status is pending'],
    ['Unavailable documents', snapshot.unavailable.length, 'Unavailable or failed status'],
    ['Indexed sections', sections.length, 'Available production sections'],
    ['Enabled libraries', snapshot.enabledLibraries.length, `${libraries.length} total libraries`],
    [
      'Index coverage',
      coverage === null ? '—' : `${coverage}%`,
      documents.length
        ? `${snapshot.indexed.length}/${documents.length} loaded documents`
        : 'No loaded documents'
    ]
  ];

  $('#projectHealth').innerHTML = healthCards.map(card => `
    <article class="mc-project-health-card">
      <span>${esc(card[0])}</span>
      <strong>${esc(card[1])}</strong>
      <small>${esc(card[2])}</small>
    </article>
  `).join('');

  $('#projectLibraries').innerHTML = libraries.length
    ? libraries.map(library => {
        const libraryDocuments = documents.filter(document =>
          document.libraryId === library.id
        );
        const indexed = libraryDocuments.filter(document =>
          documentStatus(document).className === 'indexed'
        ).length;
        const pending = libraryDocuments.filter(document =>
          documentStatus(document).className === 'pending'
        ).length;
        const unavailable = libraryDocuments.filter(document =>
          documentStatus(document).className === 'unavailable'
        ).length;

        return `
          <article class="mc-project-library">
            <div class="mc-project-library-heading">
              <div>
                <h3>${esc(library.name)}</h3>
                <span>${library.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <button
                type="button"
                data-project-library="${esc(library.id)}"
              >
                Open workspace
              </button>
            </div>
            <dl>
              <div><dt>Documents</dt><dd>${fmt(libraryDocuments.length)}</dd></div>
              <div><dt>Indexed</dt><dd>${fmt(indexed)}</dd></div>
              <div><dt>Pending</dt><dd>${fmt(pending)}</dd></div>
              <div><dt>Unavailable</dt><dd>${fmt(unavailable)}</dd></div>
            </dl>
          </article>
        `;
      }).join('')
    : `
      <div class="mc-project-empty">
        <strong>No libraries</strong>
        <p>No knowledge libraries are available for this project.</p>
      </div>
    `;

  $('#projectReadinessFilters').innerHTML = [
    ['all', 'All'],
    ['indexed', 'Indexed'],
    ['pending', 'Pending'],
    ['unavailable', 'Unavailable']
  ].map(([filter, label], index) => `
    <button
      type="button"
      data-project-filter="${filter}"
      class="${index === 0 ? 'active' : ''}"
      aria-pressed="${index === 0}"
    >
      ${label}
    </button>
  `).join('');

  $('#projectReadinessTable').innerHTML = documents.length
    ? `
      <div class="mc-project-table-wrap">
        <table class="mc-project-table">
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Type</th>
              <th scope="col">Library</th>
              <th scope="col">Status</th>
              <th scope="col">Sections</th>
              <th scope="col">Modified</th>
            </tr>
          </thead>
          <tbody>
            ${documents.map(document => {
              const status = documentStatus(document);
              const library = libraries.find(item =>
                item.id === document.libraryId
              );
              const modifiedAt = documentModifiedAt(document);

              return `
                <tr data-project-readiness="${status.className}">
                  <th scope="row">${esc(document.title || document.name)}</th>
                  <td>${esc(documentType(document))}</td>
                  <td>${library ? esc(library.name) : 'Unavailable'}</td>
                  <td>
                    <span class="mc-project-status ${status.className}">
                      ${esc(status.label)}
                    </span>
                  </td>
                  <td>${fmt(document.sectionCount)}</td>
                  <td>${modifiedAt ? esc(modifiedAt) : 'Unavailable'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div id="projectReadinessEmpty" class="mc-project-empty" hidden>
        No documents match this readiness filter.
      </div>
    `
    : `
      <div class="mc-project-empty">
        <strong>No documents</strong>
        <p>Add project documents to begin evaluating knowledge readiness.</p>
      </div>
    `;

  const attentionItems = projectAttentionItems(
    snapshot,
    libraries,
    documents
  );

  $('#projectAttention').innerHTML = attentionItems.length
    ? `
      <ul class="mc-project-attention-list">
        ${attentionItems.map((item, index) => `
          <li>
            <p>${esc(item.text)}</p>
            <button
              type="button"
              data-project-attention="${index}"
            >
              ${esc(item.action)}
            </button>
          </li>
        `).join('')}
      </ul>
      <p class="mc-project-scope-note">
        These items reflect application state, not a substantive review of
        project content.
      </p>
    `
    : `
      <div class="mc-project-clear">
        <strong>No immediate knowledge-readiness issues were detected.</strong>
        <p>
          This reflects system state, not a substantive review of project
          content.
        </p>
      </div>
    `;

  const nextActions = projectNextActions(
    snapshot,
    libraries,
    documents
  );

  $('#projectActions').innerHTML = nextActions.length
    ? nextActions.map((action, index) => `
      <button type="button" data-project-action="${index}">
        <strong>${esc(action.label)}</strong>
        <span>${esc(action.detail)}</span>
      </button>
    `).join('')
    : `
      <div class="mc-project-empty">
        No interface guidance is available for the current state.
      </div>
    `;

  $$('[data-project-library]').forEach(button => {
    button.onclick = () => {
      engine.setLibrary(button.dataset.projectLibrary);
      selectedDoc = null;
      show('knowledge');
    };
  });

  $$('[data-project-filter]').forEach(button => {
    button.onclick = () => {
      const filter = button.dataset.projectFilter;
      let visibleRows = 0;

      $$('[data-project-filter]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      $$('[data-project-readiness]').forEach(row => {
        const visible =
          filter === 'all' ||
          row.dataset.projectReadiness === filter;

        row.hidden = !visible;
        visibleRows += visible ? 1 : 0;
      });

      if ($('#projectReadinessEmpty')) {
        $('#projectReadinessEmpty').hidden = visibleRows > 0;
      }
    };
  });

  $$('[data-project-attention]').forEach(button => {
    button.onclick = () => {
      const item = attentionItems[Number(button.dataset.projectAttention)];

      if (item.libraryId) {
        engine.setLibrary(item.libraryId);
        selectedDoc = null;
      }

      show(item.view);
    };
  });

  $$('[data-project-action]').forEach(button => {
    button.onclick = () => {
      const action = nextActions[Number(button.dataset.projectAction)];
      show(action.view);
    };
  });
}

function renderDocuments(
  documents,
  allSections = [],
  libraries = [],
  selectedEntry = null
) {
  const query = $('#documentFilter').value.trim();

  $('#documents').innerHTML = documents.length
    ? documents.map(document => {
        const status = documentStatus(document);
        const pageCount = documentPageCount(document);
        const modifiedAt = documentModifiedAt(document);
        const catalogSection = documentCatalogSection(document);
        const library = libraries.find(item =>
          item.id === document.libraryId
        );
        const extractedSections = allSections.filter(section =>
          section.documentId === document.id
        ).length;

        return `
        <article
          class="doc mc-knowledge-document
            ${document.id === selectedDoc ? 'selected' : ''}"
          data-document-row="${document.id}"
        >
          <button
            type="button"
            class="mc-knowledge-document-select"
            data-document-select="${document.id}"
            aria-pressed="${document.id === selectedDoc}"
          >
            <span class="file-icon">
              ${(
                document.extension ||
                document.name.split('.').pop() ||
                'DOC'
              )
                .toUpperCase()
                .slice(0, 4)}
            </span>

            <span class="doc-main">
              <span class="mc-knowledge-document-title">
                ${esc(document.title || document.name)}
              </span>
              <span class="mc-knowledge-document-chips">
                <span>${esc(documentType(document))}</span>
                <span>${esc(catalogSection)}</span>
                ${library
                  ? `<span>${esc(library.name)}</span>`
                  : ''}
                ${pageCount
                  ? `<span>${fmt(pageCount)} page${pageCount === 1 ? '' : 's'}</span>`
                  : ''}
                <span>${fmt(extractedSections)} sections</span>
                ${Number(document.size) > 0
                  ? `<span>${formatBytes(document.size)}</span>`
                  : ''}
              </span>
              ${modifiedAt
                ? `<small>Last modified ${esc(modifiedAt)}</small>`
                : ''}
            </span>

            <span class="mc-knowledge-status ${status.className}">
              ${esc(status.label)}
            </span>
          </button>

          <div class="mc-knowledge-document-actions">
            <button
              type="button"
              class="subtle"
              data-inspect="${document.id}"
            >
              Inspect source
            </button>

            <button
              type="button"
              class="danger"
              data-remove="${document.id}"
            >
              Remove
            </button>
          </div>
        </article>
      `;
      }).join('')
    : `
      <div class="mc-library-browser-empty">
        <strong>
          ${query
            ? 'No matching documents'
            : selectedEntry?.name === 'Uncategorized'
              ? 'No uncategorized documents'
              : selectedEntry?.name === 'All Knowledge'
                ? 'No documents loaded'
                : 'This catalog section is empty'}
        </strong>
        <span>
          ${query
            ? 'No documents in the selected section match the local search.'
            : selectedEntry?.name === 'All Knowledge'
              ? 'Use Add documents to begin building project knowledge.'
              : 'Choose All Knowledge or another catalog section.'}
        </span>
      </div>
    `;

  $$('[data-document-select]').forEach(button => {
    button.onclick = () => {
      selectedDoc = button.dataset.documentSelect;

      renderDocumentMetadata(
        documents.find(document =>
          document.id === selectedDoc
        ),
        allSections
      );

      renderDocuments(
        documents,
        allSections,
        libraries,
        selectedEntry
      );
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
    ),
    allSections
  );
}

function renderCatalogCoverage() {
  const context = knowledgeCatalogContext;

  $('#documentDetailsEyebrow').textContent = 'CATALOG COVERAGE';
  $('#documentDetailsTitle').textContent = 'Section Coverage';

  if (!context?.selectedEntry) {
    $('#documentMetadata').innerHTML = `
      <div class="mc-library-browser-empty">
        <strong>Catalog coverage unavailable</strong>
        <span>No current catalog section is available.</span>
      </div>
    `;
    return;
  }

  const entry = context.selectedEntry;
  const typeRows = ['PDF', 'Word', 'Excel', 'Images', 'Text', 'Web/HTML', 'Other']
    .map(name => ({
      count: entry.documents.filter(document =>
        knowledgeTypeGroup(document) === name
      ).length,
      name
    }))
    .filter(type => type.count > 0);
  const missingCategory = entry.documents.filter(document =>
    !safeText(document.category).trim() &&
    !preferredText(
      document.metadata?.category,
      document.metadata?.documentCategory,
      document.metadata?.knowledgeSection
    ).trim() &&
    !(Array.isArray(document.tags) && document.tags.length) &&
    !(Array.isArray(document.metadata?.tags) && document.metadata.tags.length)
  ).length;
  const enabledEmptyLibraries = context.libraries.filter(library =>
    library.enabled &&
    !context.catalog.all.documents.some(document =>
      document.libraryId === library.id
    )
  );
  const disabledWithDocuments = context.libraries.filter(library =>
    !library.enabled &&
    entry.documents.some(document =>
      document.libraryId === library.id
    )
  );
  const attention = [
    entry.pending.length
      ? `${entry.pending.length} pending document${entry.pending.length === 1 ? '' : 's'}`
      : '',
    entry.unavailable.length
      ? `${entry.unavailable.length} unavailable document${entry.unavailable.length === 1 ? '' : 's'}`
      : '',
    entry.unknown.length
      ? `${entry.unknown.length} unrecognized document status${entry.unknown.length === 1 ? '' : 'es'}`
      : '',
    entry.indexedWithoutSections.length
      ? `${entry.indexedWithoutSections.length} indexed document${entry.indexedWithoutSections.length === 1 ? '' : 's'} with zero exposed sections`
      : '',
    entry.documents.length && entry.exposedSections === 0
      ? 'No indexed sections are exposed for this catalog section'
      : '',
    missingCategory
      ? `${missingCategory} document${missingCategory === 1 ? '' : 's'} without category metadata`
      : '',
    ...enabledEmptyLibraries.map(library =>
      `${library.name} is enabled with no documents`
    ),
    ...disabledWithDocuments.map(library =>
      `${library.name} is disabled and contributes documents`
    )
  ].filter(Boolean);

  $('#documentMetadata').innerHTML = `
    <header class="mc-library-coverage-header">
      <span>SELECTED CATALOG SECTION</span>
      <h3>${esc(entry.name)}</h3>
      <p>
        ${fmt(entry.documents.length)} document${entry.documents.length === 1 ? '' : 's'}
        across ${fmt(entry.libraries.length)} contributing
        ${entry.libraries.length === 1 ? 'library' : 'libraries'}.
      </p>
    </header>

    <section class="mc-library-coverage-metrics">
      <article><span>Documents</span><strong>${fmt(entry.documents.length)}</strong></article>
      <article><span>Indexed</span><strong>${fmt(entry.indexed.length)}</strong></article>
      <article><span>Pending</span><strong>${fmt(entry.pending.length)}</strong></article>
      <article><span>Unavailable</span><strong>${fmt(entry.unavailable.length)}</strong></article>
      <article><span>Sections</span><strong>${fmt(entry.exposedSections)}</strong></article>
    </section>

    <section class="mc-library-coverage-section">
      <h4>File-type breakdown</h4>
      ${typeRows.length
        ? `
          <ul class="mc-library-coverage-types">
            ${typeRows.map(type => `
              <li>
                <span>${esc(type.name)}</span>
                <strong>${fmt(type.count)}</strong>
              </li>
            `).join('')}
          </ul>
        `
        : `
          <div class="mc-library-empty">
            File-type coverage unavailable.
          </div>
        `}
    </section>

    <section class="mc-library-coverage-section">
      <h4>Contributing libraries</h4>
      ${entry.libraries.length
        ? `
          <ul class="mc-library-contributors">
            ${entry.libraries.map(library => `
              <li>
                <span>${esc(library.name)}</span>
                <strong>${library.enabled ? 'Enabled' : 'Disabled'}</strong>
              </li>
            `).join('')}
          </ul>
        `
        : `
          <div class="mc-library-empty">No contributing libraries.</div>
        `}
    </section>

    <section class="mc-library-coverage-section">
      <h4>Attention</h4>
      ${attention.length
        ? `
          <ul class="mc-library-coverage-attention">
            ${attention.map(item => `<li>${esc(item)}</li>`).join('')}
          </ul>
        `
        : `
          <p class="mc-library-clear">
            No immediate catalog-tracking items were detected.
          </p>
        `}
    </section>
  `;
}

function renderDocumentMetadata(document, allSections = []) {
  if (!document) {
    renderCatalogCoverage();
    return;
  }

  const sections = allSections
    .filter(section => section.documentId === document.id)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const status = documentStatus(document);
  const pageCount = documentPageCount(document);
  const modifiedAt = documentModifiedAt(document);
  const summary = preferredText(
    document.summary,
    document.metadata?.summary,
    document.description,
    document.metadata?.description
  );
  const tags = Array.isArray(document.tags)
    ? [...document.tags]
    : [];
  const metadataTags = Array.isArray(document.metadata?.tags)
    ? document.metadata.tags
    : [];
  const allTags = [...new Set(
    [...tags, ...metadataTags]
      .map(tag => safeText(tag).trim())
      .filter(Boolean)
  )];
  const library = engine.libraries().find(
    item => item.id === document.libraryId
  );
  const allDocuments =
    knowledgeCatalogContext?.catalog?.all?.documents || [];
  const normalizedTags = new Set(
    allTags.map(tag => tag.toLowerCase())
  );
  const category = safeText(document.category).trim();
  const relationships = allDocuments
    .filter(candidate => candidate.id !== document.id)
    .map(candidate => {
      const reasons = [];
      const candidateTags = [
        ...(Array.isArray(candidate.tags) ? candidate.tags : []),
        ...(Array.isArray(candidate.metadata?.tags)
          ? candidate.metadata.tags
          : [])
      ].map(tag => safeText(tag).trim()).filter(Boolean);
      const sharedTags = candidateTags.filter(tag =>
        normalizedTags.has(tag.toLowerCase())
      );

      if (
        document.libraryId &&
        candidate.libraryId === document.libraryId
      ) {
        reasons.push('Same library');
      }

      if (
        category &&
        safeText(candidate.category).trim() === category
      ) {
        reasons.push('Same category');
      }

      if (sharedTags.length) {
        reasons.push(`Shared ${sharedTags.length === 1 ? 'tag' : 'tags'}: ${sharedTags.join(', ')}`);
      }

      return {
        document: candidate,
        reasons
      };
    })
    .filter(relationship => relationship.reasons.length);
  const optionalCount = (...values) => {
    const value = values.find(item =>
      item !== null &&
      item !== undefined &&
      item !== '' &&
      Number.isFinite(Number(item)) && Number(item) >= 0
    );

    return value === undefined ? null : Number(value);
  };
  const tableCount = optionalCount(
    document.tableCount,
    document.metadata?.tableCount,
    Array.isArray(document.tables) ? document.tables.length : undefined
  );
  const imageCount = optionalCount(
    document.imageCount,
    document.metadata?.imageCount,
    Array.isArray(document.images) ? document.images.length : undefined
  );
  const attachmentCount = optionalCount(
    document.attachmentCount,
    document.metadata?.attachmentCount,
    Array.isArray(document.attachments)
      ? document.attachments.length
      : undefined
  );
  const createdAt = preferredText(
    document.createdAt,
    document.metadata?.createdAt
  );
  const updatedAt = preferredText(
    document.updatedAt,
    document.metadata?.updatedAt
  );
  const indexedAt = preferredText(document.indexedAt);
  const formatTimestamp = value => {
    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleString()
      : 'Unavailable';
  };
  const metadataIncomplete = !(
    document.id &&
    document.name &&
    documentType(document) !== 'Type unavailable' &&
    category &&
    library
  );
  const healthIndicators = [
    {
      className: status.className,
      label: status.label
    },
    ...(metadataIncomplete
      ? [{
          className: 'attention',
          label: 'Metadata incomplete'
        }]
      : []),
    ...(!sections.length
      ? [{
          className: 'attention',
          label: 'Sections unavailable'
        }]
      : [])
  ];
  const availability = status.className === 'unavailable'
    ? 'Document unavailable'
    : !library
      ? 'Source library unavailable'
      : !library.enabled
        ? 'Source library disabled'
        : 'Available in Knowledge Workspace';

  $('#documentDetailsEyebrow').textContent = 'KNOWLEDGE OBJECT';
  $('#documentDetailsTitle').textContent = 'Knowledge Object';
  $('#documentMetadata').innerHTML = `
    <div class="mc-object-inspector">
    <header class="mc-object-header">
      <div class="mc-object-header-actions">
        <span>READ-ONLY KNOWLEDGE OBJECT</span>
        <button
          type="button"
          id="backToCatalogCoverage"
          class="subtle"
        >
          Back to Catalog
        </button>
      </div>
      <h3>${esc(document.title || document.name)}</h3>
      <div class="mc-object-health" aria-label="Knowledge health">
        ${healthIndicators.map(indicator => `
          <span class="${esc(indicator.className)}">
            ${esc(indicator.label)}
          </span>
        `).join('')}
      </div>
    </header>

    <section class="mc-object-section" aria-labelledby="objectIdentityTitle">
      <h4 id="objectIdentityTitle">Identity</h4>
      <dl class="mc-object-facts">
        <div><dt>Title</dt><dd>${esc(document.title || document.name)}</dd></div>
        <div><dt>Original filename</dt><dd>${esc(document.name)}</dd></div>
        <div><dt>Document type</dt><dd>${esc(documentType(document))}</dd></div>
        <div><dt>Category</dt><dd>${category ? esc(category) : 'Unavailable'}</dd></div>
        <div><dt>Library</dt><dd>${library ? esc(library.name) : 'Unavailable'}</dd></div>
        <div><dt>Unique identifier</dt><dd>${document.id ? esc(document.id) : 'Unavailable'}</dd></div>
      </dl>
    </section>

    <section class="mc-object-section" aria-labelledby="objectClassificationTitle">
      <h4 id="objectClassificationTitle">Classification</h4>
      <div class="mc-object-chips">
        <span>${esc(documentCatalogSection(document))}</span>
        <span>${esc(knowledgeTypeGroup(document))}</span>
        <span>${esc(status.label)}</span>
        ${allTags.map(tag => `<span>${esc(tag)}</span>`).join('')}
      </div>
      <dl class="mc-object-facts mc-object-facts-compact">
        <div><dt>Knowledge section</dt><dd>${esc(documentCatalogSection(document))}</dd></div>
        <div><dt>File type</dt><dd>${esc(documentType(document))}</dd></div>
        <div><dt>Tags</dt><dd>${allTags.length ? esc(allTags.join(', ')) : 'Unavailable'}</dd></div>
      </dl>
    </section>

    <section class="mc-object-section" aria-labelledby="objectSourceTitle">
      <h4 id="objectSourceTitle">Source</h4>
      <dl class="mc-object-facts mc-object-facts-compact">
        <div><dt>Source library</dt><dd>${library ? esc(library.name) : 'Unavailable'}</dd></div>
        <div><dt>Filename</dt><dd>${esc(document.name)}</dd></div>
        <div><dt>MIME/type</dt><dd>${document.type ? esc(document.type) : 'Unavailable'}</dd></div>
        <div><dt>File size</dt><dd>${Number(document.size) > 0 ? formatBytes(document.size) : 'Unavailable'}</dd></div>
        ${document.path
          ? `<div><dt>Source path</dt><dd>${esc(document.path)}</dd></div>`
          : ''}
      </dl>
    </section>

    <section class="mc-object-section" aria-labelledby="objectIndexTitle">
      <h4 id="objectIndexTitle">Index Status</h4>
      <dl class="mc-object-facts mc-object-facts-compact">
        <div><dt>Status</dt><dd>${esc(status.label)}</dd></div>
        <div><dt>Exposed sections</dt><dd>${fmt(sections.length)}</dd></div>
        <div><dt>Recorded section count</dt><dd>${fmt(document.sectionCount)}</dd></div>
        <div><dt>Characters</dt><dd>${Number(document.characterCount) > 0 ? fmt(document.characterCount) : 'Unavailable'}</dd></div>
        <div><dt>Hierarchy version</dt><dd>${esc(document.hierarchyVersion ?? 'Unavailable')}</dd></div>
        ${document.healthDetail
          ? `<div class="mc-object-fact-wide"><dt>Production detail</dt><dd>${esc(document.healthDetail)}</dd></div>`
          : ''}
      </dl>
    </section>

    <section class="mc-object-section" aria-labelledby="objectSummaryTitle">
      <h4 id="objectSummaryTitle">Content Summary</h4>
      ${summary
        ? `<p>${esc(summary)}</p>`
        : `
          <div class="mc-object-empty">
            No content summary is available in production state.
          </div>
        `}
    </section>

    <section class="mc-object-section mc-object-section-wide" aria-labelledby="objectStructureTitle">
      <h4 id="objectStructureTitle">Structure</h4>
      <div class="mc-object-structure">
        <article><span>Pages</span><strong>${pageCount === null ? 'Unavailable' : fmt(pageCount)}</strong></article>
        <article><span>Sections</span><strong>${fmt(sections.length)}</strong></article>
        <article><span>Tables</span><strong>${tableCount === null ? 'Unavailable' : fmt(tableCount)}</strong></article>
        <article><span>Images</span><strong>${imageCount === null ? 'Unavailable' : fmt(imageCount)}</strong></article>
        <article><span>Attachments</span><strong>${attachmentCount === null ? 'Unavailable' : fmt(attachmentCount)}</strong></article>
      </div>
      ${sections.length
        ? `
          <ol class="mc-object-outline">
            ${sections.map((section, index) => `
              <li>
                <strong>${esc(sectionHeadingValue(section, index))}</strong>
                ${sectionLocationValue(section)
                  ? `<span>${esc(sectionLocationValue(section))}</span>`
                  : ''}
              </li>
            `).join('')}
          </ol>
        `
        : `
          <div class="mc-object-empty">
            No indexed sections are currently available.
          </div>
        `}
    </section>

    <section class="mc-object-section mc-object-section-wide" aria-labelledby="objectRelationshipsTitle">
      <h4 id="objectRelationshipsTitle">Relationships</h4>
      ${relationships.length
        ? `
          <ul class="mc-object-relationships">
            ${relationships.map(relationship => `
              <li>
                <button
                  type="button"
                  data-related-object="${esc(relationship.document.id)}"
                >
                  <strong>${esc(relationship.document.title || relationship.document.name)}</strong>
                  <span>${esc(relationship.reasons.join(' · '))}</span>
                </button>
              </li>
            `).join('')}
          </ul>
        `
        : `
          <div class="mc-object-empty">
            No related knowledge objects are currently available.
          </div>
        `}
    </section>

    <section class="mc-object-section" aria-labelledby="objectTimelineTitle">
      <h4 id="objectTimelineTitle">Timeline</h4>
      <dl class="mc-object-timeline">
        <div><dt>Created</dt><dd>${esc(formatTimestamp(createdAt))}</dd></div>
        <div><dt>Modified</dt><dd>${modifiedAt ? esc(modifiedAt) : 'Unavailable'}</dd></div>
        <div><dt>Indexed</dt><dd>${esc(formatTimestamp(indexedAt))}</dd></div>
        <div><dt>Updated</dt><dd>${esc(formatTimestamp(updatedAt))}</dd></div>
      </dl>
    </section>

    <section class="mc-object-section" aria-labelledby="objectAvailabilityTitle">
      <h4 id="objectAvailabilityTitle">Availability</h4>
      <div class="mc-object-availability ${esc(status.className)}">
        <strong>${esc(availability)}</strong>
        <span>
          ${document.error
            ? esc(document.error)
            : library
              ? `Library is ${library.enabled ? 'enabled' : 'disabled'}.`
              : 'No matching production library is available.'}
        </span>
      </div>
    </section>
    </div>
  `;

  $('#backToCatalogCoverage').onclick = () => {
    selectedDoc = null;
    renderKnowledgeWorkspace();
  };

  $$('[data-related-object]').forEach(button => {
    button.onclick = () => {
      selectedKnowledgeSection = 'all';
      selectedDoc = button.dataset.relatedObject;
      renderKnowledgeWorkspace();
    };
  });
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

  const sectionText = sectionTextValue;
  const sectionHeading = sectionHeadingValue;
  const sectionLocation = sectionLocationValue;
  const sectionSourceLabel = sectionSourceLabelValue;

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
      <button id="exportExtraction" class="subtle">Export selected branch</button>
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

  let activeSectionId = null;
  let treeToggleHandler = null;
  const sectionsById = new Map(selectedSections.map(section => [section.id, section]));
  const sectionIndexById = new Map(selectedSections.map((section, index) => [section.id, index]));
  const sectionsByNumber = new Map(selectedSections
    .filter(section => section.sectionNumber)
    .map(section => [sectionNumberKey(section.sectionNumber), section]));
  const sectionSearchText = new Map(selectedSections.map((section, index) => [
    section.id,
    `${sectionHeading(section, index)} ${sectionText(section)} ${Array.isArray(section.metadata?.keywords) ? section.metadata.keywords.join(' ') : safeText(section.metadata?.keywords)}`.toLowerCase()
  ]));
  const childrenByParent = new Map();
  for (const section of selectedSections) {
    const parentId = sectionsById.has(section.parentId) ? section.parentId : null;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(section);
  }

  const branchSections = sectionId => {
    if (!sectionId || !sectionsById.has(sectionId)) return selectedSections;
    const output = [];
    const queue = [sectionsById.get(sectionId)];
    while (queue.length) {
      const section = queue.shift();
      output.push(section);
      queue.push(...(childrenByParent.get(section.id) || []));
    }
    return output;
  };

  const drawSections = () => {
    const query = (
      $('#sectionFilter').value ||
      ''
    )
      .trim()
      .toLowerCase();

    const level = $('#sectionLevel').value;

    const matches = selectedSections.filter((section, index) =>
      (
        !query ||
        safeText(sectionSearchText.get(section.id)).includes(query)
      ) &&
      (
        !level ||
        String(section.level || 1) === level
      )
    );

    const visibleIds = new Set(matches.map(section => section.id));
    if (query || level) {
      for (const section of matches) {
        let parent = sectionsById.get(section.parentId);
        while (parent) {
          visibleIds.add(parent.id);
          parent = sectionsById.get(parent.parentId);
        }
      }
    }

    const roots = (childrenByParent.get(null) || []).filter(section =>
      (!query && !level) || visibleIds.has(section.id)
    );

    const renderNode = section => {
          const sectionIndex = sectionIndexById.get(section.id);
          const heading = sectionHeading(section, sectionIndex);
          const location = sectionLocation(section);
          const text = sectionText(section);
          const children = (childrenByParent.get(section.id) || []).filter(child =>
            (!query && !level) || visibleIds.has(child.id)
          );
          const references = (section.crossReferences || []).map(reference => {
            const target = sectionsByNumber.get(sectionNumberKey(reference));
            return target
              ? `<button class="cross-reference" data-jump-section="${esc(target.id)}">${esc(reference)}</button>`
              : `<span>${esc(reference)}</span>`;
          }).join(' ');

          return `
          <details
            class="source-section ${section.id === activeSectionId ? 'active' : ''}"
            data-section-node="${esc(section.id)}"
            ${query || section.id === activeSectionId ? 'open' : ''}
          >
            <summary data-activate-section="${esc(section.id)}">
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
                data-jump-section="${esc(section.id)}"
              >
                Jump to section
              </button>

              <button
                class="subtle"
                data-select-branch="${esc(section.id)}"
              >
                Select branch
              </button>

              <button
                class="subtle"
                data-copy-section="${esc(section.id)}"
              >
                Copy text
              </button>

              <button
                class="subtle"
                data-copy-citation="${esc(section.id)}"
              >
                Copy source label
              </button>
            </div>

            <pre>${esc(text)}</pre>
            ${references ? `<div class="section-references"><b>References:</b> ${references}</div>` : ''}
            ${children.length ? `<div class="source-tree-children" data-tree-children="${esc(section.id)}"></div>` : ''}
          </details>
        `;
    };

    $('#sectionResults').innerHTML = roots.length
      ? roots.map(renderNode).join('')
      : '<div class="empty">No sections match this filter.</div>';

    const populateChildren = details => {
      const container = details.querySelector(':scope > [data-tree-children]');
      if (!container || container.dataset.loaded) return;
      const children = childrenByParent.get(details.dataset.sectionNode) || [];
      const shownChildren = children.filter(child => (!query && !level) || visibleIds.has(child.id));
      container.innerHTML = shownChildren.map(renderNode).join('');
      container.dataset.loaded = 'true';
      if (query || level) {
        container.querySelectorAll(':scope > details[open]').forEach(populateChildren);
      }
    };

    const activate = sectionId => {
      activeSectionId = sectionId;
      $$('[data-section-node]').forEach(node =>
        node.classList.toggle('active', node.dataset.sectionNode === sectionId)
      );
    };

    const tree = $('#sectionResults');
    if (treeToggleHandler) tree.removeEventListener('toggle', treeToggleHandler, true);
    treeToggleHandler = event => {
      const details = event.target.closest('[data-section-node]');
      if (details?.open) populateChildren(details);
    };
    tree.addEventListener('toggle', treeToggleHandler, true);
    tree.querySelectorAll(':scope > details[open]').forEach(populateChildren);
    tree.onclick = event => {
      const action = event.target.closest('button, summary');
      if (!action) return;
      if (action.dataset.activateSection) activate(action.dataset.activateSection);
      if (action.dataset.selectBranch) {
        event.preventDefault();
        activate(action.dataset.selectBranch);
      }
      if (action.dataset.jumpSection) {
        const targetId = action.dataset.jumpSection;
        const target = sectionsById.get(targetId);
        activeSectionId = targetId;
        $('#sectionFilter').value = sectionHeading(target, sectionIndexById.get(target.id));
        drawSections();
        document.querySelector(`[data-section-node="${CSS.escape(targetId)}"]`)?.scrollIntoView({ block: 'center' });
      }
      if (action.dataset.copySection) {
        void copyText(sectionText(sectionsById.get(action.dataset.copySection)));
      }
      if (action.dataset.copyCitation) {
        const section = sectionsById.get(action.dataset.copyCitation);
        const sectionIndex = sectionIndexById.get(section.id);
        const sourceLabel = sectionSourceLabel(section, sectionIndex);
        const location = sectionLocation(section);
        void copyText([
          `${documentLabel} — ${sourceLabel}`,
          location ? `(${location})` : ''
        ].filter(Boolean).join(' '));
      }
    };
  };

  let filterTimer;
  $('#sectionFilter').oninput = () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(drawSections, 120);
  };
  $('#sectionLevel').onchange = drawSections;

  $('#expandSections').onclick = () => {
    const expand = () => {
      const closed = [...$('#sectionResults').querySelectorAll('details:not([open])')];
      closed.forEach(details => { details.open = true; });
      if (closed.length) requestAnimationFrame(expand);
    };
    expand();
  };

  $('#collapseSections').onclick = () => {
    $$('#sectionResults details').forEach(details => {
      details.open = false;
    });
  };

  $('#exportExtraction').onclick = () => {
    const exportedSections = branchSections(activeSectionId);
    download(
      `${documentLabel.replace(/[^a-z0-9]+/gi, '-') || 'document'}-extraction-report.json`,
      JSON.stringify(
        {
          ...report,
          selectedRoot: activeSectionId,
          sections: exportedSections.map(
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

async function copyText(value) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard access is unavailable in this environment.');
    }
    await navigator.clipboard.writeText(textValue(value));
    return true;
  } catch (error) {
    captureError(error, {
      action: 'clipboard-copy'
    });
    return false;
  }
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
    '[data-view="project"]',
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

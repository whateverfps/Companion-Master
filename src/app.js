import { engine } from './engine.js';
import { conversationPreview } from './conversations.js';
import { logger, setLifecycle, registerModule, captureError, verifyButtons, runHealthChecks, diagnosticSnapshot, installGlobalHandlers } from './diagnostics.js';
import {
  completeImportQueueItem,
  createImportQueueItem,
  failImportQueueItem
} from './import-queue.js';
import {
  aggregateExtractionVerification,
  verifyExtraction
} from './extraction-verification.js';
import {
  createRetrievalSession
} from './retrieval-session.js';
import {
  actionTargetToSourceTarget,
  answerAnchorId,
  createActionTarget,
  createSourceTarget,
  normalizeActionTargetPayload,
  prepareActionNavigationState,
  resolveRfiNavigationTarget,
  resolveSourceTarget,
  resolveSpecificationNavigationTarget,
  resolveSubmittalNavigationTarget,
  sourceAnchorId,
  sourceNavigationActions,
  sourceNavigationDestination,
  sourceScrollOptions
} from './source-navigation.js';
import {
  buildKnowledgeRelationships,
  buildRelationshipGraph,
  relationshipContext,
  relationshipNavigationTarget
} from './knowledge-relationships.js';
import {
  buildDocumentLineage,
  lineageForDocument,
  lineageNavigationTarget
} from './document-lineage.js';
import {
  buildRevisionMetrics,
  compareRevisions,
  revisionMatchRuleLabel,
  revisionNavigationTarget,
  revisionPairStatus
} from './revision-comparison.js';
import {
  clearInspectionSession,
  createEngineeringContext,
  engineeringContextMetrics,
  engineeringNavigationTarget,
  getInspectionSession,
  startInspectionSession,
  updateInspectionNotes
} from './engineering-context.js';
import {
  clearWorkflowSession,
  createWorkflow,
  getWorkflowSession,
  startWorkflowSession,
  updateWorkflowNotes,
  workflowMetrics,
  workflowNavigationTarget,
  WORKFLOW_TYPES
} from './workflow-engine.js';
import {
  CONTEXT_ACTIVATION_SOURCES,
  contextActivationMetrics,
  createContextActivation,
  createContextClearedEvent
} from './context-activation.js';
import {
  contextBusMetrics,
  createContextBusSnapshot
} from './context-bus.js';
import {
  INSPECTION_RESULTS,
  INSPECTION_STATUSES,
  inspectionContextSeed
} from './inspection-records.js';
import {
  createDemonstrationProjectFixture,
  DEMO_INITIAL_DOCUMENT_ID,
  DEMO_INITIAL_SECTION_ID,
  DEMO_PROJECT_ID,
  DEMO_QUESTIONS,
  validateDemonstrationProject
} from './demo-project.js';
import {
  buildMissionControlModel,
  missionControlResponseModeLabel,
  normalizeStartupExperience,
  resolvePreviousProject,
  separateMissionControlProjects
} from './mission-control.js';
import {
  firstText,
  sectionHeadingValue,
  sectionLocationValue,
  sectionNumberKey,
  sectionSourceLabelValue,
  sectionTextValue,
  textValue
} from './data-model.js';
import { openPdfBlob, readPdfPageGraphics, renderPdfPage } from './pdf-source.js';
import { extractLegendCandidates, matchLegendOccurrences } from './drawing-legends.js';
import { applyObservationVerification, drawingAnalysisRequiresUpgrade, drawingWarningPresentation, DRAWING_ANALYSIS_VERSION, groupDrawingObservations, observationKindLabel, reanalyzeDrawingAnalysis, upgradeDrawingAnalysis } from './drawing-intelligence.js';
import { calculateDrawingFit, createDrawingRenderIdentity, createDrawingTarget, createPdfPageViewerAnalysis, defaultDrawingViewport, drawingAnnouncementText, drawingFocusTarget, drawingMatchingSetTarget, drawingRenderDecision, drawingResultKeyTarget, drawingReturnAction, drawingWheelZoom, drawingWorkspaceLayout, reconcileDrawingMatchingSheetIds, reconcileDrawingSelection, resolveDrawingTarget } from './drawing-navigation.js';
import { buildPlanQuery, buildPlanQueryScope, createChiefConstructionContext, drawingSearchSummary, planQuerySectionScope, searchDrawingSheets, validateChiefConstructionContext } from './plan-query.js';
import { buildConstructionWorkPackage, currentWorkActivationTarget, inspectionPrefillFromWorkPackage } from './work-package.js';
import { drawingUpgradeKey, loadAuthoritativeDrawingRegistry, reduceStaleDrawingTarget } from './drawing-lifecycle.js';
import { buildChiefDrawingEvidence } from './chief-drawing-evidence.js';
import { buildChiefLocationPresentation, classifyEngineeringNavigationIntent, navigateExactDrawingCommand } from './engineering-locator.js';
import { inspectDrawingRegistryRuntime } from './drawing-registry-diagnostics.js';
import { createDrawingViewerEngine } from './drawing-viewer-engine.js';
import { createDrawingContextService } from './drawing-context.js';
import { createDrawingWorkspace } from './drawing-workspace.js';
import { createDrawingCatalog } from './drawing-catalog.js';

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
const missionPmisDashboardUrl = 'https://whateverfps.github.io/Mission-PMIS/';
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
let experience = 'mission-control';
let lastProfessionalView = '';
let missionControlView = 'home';
let missionControlAttachments = [];
let chiefHistoryVisible = false;
let previousUserProjectId = null;
let selectedDoc = null;
let selectedKnowledgeSection = 'all';
let knowledgeCatalogContext = null;
let busy = false;
let importQueue = [];
let activeRetrievalSession = null;
let selectedEvidenceId = null;
let sourceNavigationTarget = null;
let answerNavigationTarget = null;
let sourceNavigationNotice = '';
let relationshipTarget = null;
let lineageTarget = null;
let revisionTarget = null;
let revisionFilter = 'all';
let selectedRevisionMatch = 0;
let engineeringTarget = null;
let workflowTarget = null;
let activeContextActivation = null;
let contextClearedEvent = null;
let contextBusSnapshot = createContextBusSnapshot();
let demoGuideDismissed = false;
let selectedInspectionId = null;
let modalCloseGuard = null;
let drawingTarget = null;
let drawingFilter = '';
let drawingDiscipline = 'all';
let drawingType = 'all';
let drawingSearchActiveIndex = -1;
let drawingZoom = null;
let drawingRotation = 0;
const drawingViewportBySet = new Map();
const drawingViewerEngine = createDrawingViewerEngine({ viewportStore: drawingViewportBySet });
const drawingCatalog = createDrawingCatalog({ onDifference: difference => logger.warning('Drawing catalog parser difference', difference) });
const drawingContextService = createDrawingContextService();
const drawingWorkspace = createDrawingWorkspace({ viewerEngine: drawingViewerEngine, contextService: drawingContextService });
let drawingViewportDocumentId = '';
let activeDrawingPdf = null;
let activeDrawingDocumentId = '';
let activeDrawingSourceRecord = null;
let activeDrawingRenderIdentity = null;
let drawingWorkspaceRenderRequest = 0;
let drawingPageSelectionRequest = 0;
let drawingRenderGeneration = 0;
let portableDrawingCanvas = null;
let activeDrawingViewerAnalysis = null;
let activeDrawingResizeObserver = null;
let activeDrawingResizeStage = null;
let activePlanQuery = null;
let activeWorkPackage = null;
let activeWorkPackageMessageId = '';
let chiefConstructionContext = null;
let drawingMatchingSheetIds = [];
let selectedWorkPackageItem = '';
let pendingDrawingContext = null;
let drawingSearchRevision = 0;
const drawingUpgradeWork = new Map();
const drawingUpgradeFailures = new Set();
let drawingLifecycleUnavailable = [];
let drawingWorkspacePanels = drawingWorkspaceLayout();
let drawingWorkspaceBeforeExpand = null;
let activeChiefLocationPresentation = null;

app.innerHTML = `
<a id="skipLink" class="mc-skip-link" href="#missionControlMain">Skip to workspace</a>
<section id="missionControlShell" class="mc-control-shell" aria-labelledby="missionControlTitle">
  <header class="mc-control-global-header">
    <div class="mc-control-identity">
      <span class="mc-control-mark" aria-hidden="true">M</span>
      <div><strong>MISSION COMPANION</strong><span>Mission Control</span></div>
    </div>
    <button id="openProfessionalWorkspace" class="mc-control-experience-switch">Open Professional Workspace</button>
  </header>
  <nav class="mc-control-nav" aria-label="Mission Control navigation">
    <button data-control-view="dashboard">Dashboard</button>
    <button data-control-home aria-current="page">Chief</button>
    <button data-control-view="plans">Drawings</button>
    <button data-control-experience="professional-workspace">Professional Workspace</button>
    <span style="position:absolute;left:-9999px;clip:rect(0 0 0 0);"><button data-control-view="plans">Open Plans</button></span>
  </nav>
  <main id="missionControlMain" tabindex="-1">
    <div id="missionControlContent" aria-live="polite"></div>
  </main>
</section>
<div id="professionalWorkspaceShell" class="shell" hidden>
  <aside class="rail">
    <div class="brand">
      <div class="mark">M</div>
      <div>
        <strong>MISSION COMPANION</strong>
        <span>Professional Workspace</span>
      </div>
    </div>

    <nav aria-label="Primary navigation">
      <button type="button" class="mc-workspace-tools-toggle" aria-expanded="false" aria-controls="professionalWorkspaceTools" data-workspace-tools-toggle>Workspace Tools</button>
      <div id="professionalWorkspaceTools" class="mc-workspace-tools-panel" hidden>
        <div class="mc-workspace-tools-group">
          <h3>Project content</h3>
          <div class="mc-workspace-tools-list">
            <button type="button" data-view="project">Project Workspace</button>
            <button type="button" data-view="chat">Command Desk</button>
            <button type="button" data-view="knowledge">Knowledge Workspace</button>
            <button type="button" data-view="inspections">Inspection Records</button>
            <button type="button" data-view="sources">Source Inspector</button>
            <button type="button" data-view="evidence">Evidence Explorer</button>
          </div>
        </div>
        <div class="mc-workspace-tools-group">
          <h3>Drawing / Engineering</h3>
          <div class="mc-workspace-tools-list">
            <button type="button" data-view="drawings">Drawing Set Inspector</button>
            <button type="button" data-view="engineering">Engineering Workspace</button>
            <button type="button" data-view="workflow">Workflow Workspace</button>
            <button type="button" data-view="relationships">Relationship Explorer</button>
            <button type="button" data-view="versions">Version Explorer</button>
            <button type="button" data-view="evaluate">Knowledge Validation</button>
          </div>
        </div>
        <div class="mc-workspace-tools-group">
          <h3>Administration</h3>
          <div class="mc-workspace-tools-list">
            <button type="button" data-view="settings">Settings</button>
            <button type="button" data-view="diagnostics">Diagnostics</button>
          </div>
        </div>
      </div>
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

  <main id="workspaceMain" tabindex="-1">
    <header class="topbar">
      <div>
        <div class="eyebrow">MISSION COMPANION</div>
        <h1 id="pageTitle" tabindex="-1">Command Desk</h1>
        <p id="pageSub">Ask project-specific questions and receive source-grounded answers.</p>
      </div>

      <div class="mode-wrap">
        <button id="returnMissionControl" class="subtle mc-control-return">Return to Chief</button>
        <label>ANSWER MODE</label>
        <select id="mode">
          <option value="offline">Offline evidence</option>
          <option value="source">Source-only AI</option>
          <option value="assisted">Expert-assisted AI</option>
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
            <div class="empty">No imports in this session. Use Add documents to begin an import.</div>
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
            <div class="empty"><strong>No source selected.</strong><br>Choose a document from the list to inspect its extraction checks and indexed sections.</div>
          </div>
        </section>
      </div>
    </section>

    <section id="drawings" class="view">
      <div id="drawingInspector" class="mc-drawing-workspace"></div>
    </section>

    <section id="evidence" class="view">
      <header id="evidenceSessionHeader" class="mc-evidence-header"></header>
      <div id="evidencePipeline" class="mc-evidence-pipeline"></div>
      <div class="mc-evidence-workspace">
        <section class="panel mc-evidence-list-panel" aria-labelledby="evidenceListTitle">
          <div class="mc-evidence-panel-heading">
            <div>
              <span>ENGINE ORDER</span>
              <h2 id="evidenceListTitle">Ranked Evidence</h2>
            </div>
          </div>
          <div id="evidenceExplorerList" class="mc-evidence-list"></div>
        </section>
        <aside class="panel mc-evidence-detail-panel" aria-labelledby="evidenceDetailTitle">
          <div class="mc-evidence-panel-heading">
            <div>
              <span>STORED SECTION</span>
              <h2 id="evidenceDetailTitle">Evidence Details</h2>
            </div>
          </div>
          <div id="evidenceExplorerDetail"></div>
        </aside>
      </div>
    </section>

    <section id="relationships" class="view">
      <header id="relationshipHeader" class="mc-relationship-header"></header>
      <div class="mc-relationship-workspace">
        <section class="panel mc-relationship-context-panel" aria-labelledby="relationshipContextTitle">
          <div class="mc-relationship-heading">
            <span>EXACT PRODUCTION LINKS</span>
            <h2 id="relationshipContextTitle">Relationship Context</h2>
          </div>
          <div id="relationshipContext"></div>
        </section>
        <section class="panel mc-relationship-graph-panel" aria-labelledby="relationshipGraphTitle">
          <div class="mc-relationship-heading">
            <span>DETERMINISTIC LAYOUT</span>
            <h2 id="relationshipGraphTitle">Relationship Graph</h2>
          </div>
          <div id="relationshipGraph"></div>
        </section>
        <aside class="panel mc-relationship-detail-panel" aria-labelledby="relationshipDetailTitle">
          <div class="mc-relationship-heading">
            <span>LINKED KNOWLEDGE</span>
            <h2 id="relationshipDetailTitle">Relationships</h2>
          </div>
          <div id="relationshipDetail"></div>
        </aside>
      </div>
    </section>

    <section id="versions" class="view">
      <header id="lineageHeader" class="mc-lineage-header"></header>
      <div class="mc-lineage-workspace">
        <section class="panel mc-lineage-current" aria-labelledby="lineageCurrentTitle">
          <div class="mc-lineage-heading"><span>DOCUMENT FAMILY</span><h2 id="lineageCurrentTitle">Current Version</h2></div>
          <div id="lineageCurrent"></div>
        </section>
        <section class="panel mc-lineage-history" aria-labelledby="lineageHistoryTitle">
          <div class="mc-lineage-heading"><span>EXPLICIT HISTORY</span><h2 id="lineageHistoryTitle">Version Chain</h2></div>
          <div id="lineageHistory"></div>
        </section>
        <aside class="panel mc-lineage-changes" aria-labelledby="lineageChangesTitle">
          <div class="mc-lineage-heading"><span>FIELD COMPARISON</span><h2 id="lineageChangesTitle">Changes and Warnings</h2></div>
          <div id="lineageChanges"></div>
        </aside>
      </div>
    </section>

    <section id="engineering" class="view">
      <header id="engineeringHeader" class="mc-engineering-header"></header>
      <div class="mc-engineering-workspace">
        <section class="panel mc-engineering-context-panel" aria-labelledby="engineeringContextTitle"><div class="mc-engineering-heading"><span>ACTIVE CONTEXT</span><h2 id="engineeringContextTitle">Engineering Context</h2></div><div id="engineeringContext"></div></section>
        <section class="panel mc-engineering-knowledge-panel" aria-labelledby="engineeringKnowledgeTitle"><div class="mc-engineering-heading"><span>PROJECT KNOWLEDGE</span><h2 id="engineeringKnowledgeTitle">Related Knowledge</h2></div><div id="engineeringKnowledge"></div></section>
        <aside class="panel mc-engineering-session-panel" aria-labelledby="engineeringSessionTitle"><div class="mc-engineering-heading"><span>TEMPORARY · UNSAVED</span><h2 id="engineeringSessionTitle">Inspection Session</h2></div><div id="engineeringSession"></div></aside>
      </div>
    </section>

    <section id="workflow" class="view">
      <header id="workflowHeader" class="mc-workflow-header"></header>
      <div class="mc-workflow-workspace">
        <section class="panel mc-workflow-overview" aria-labelledby="workflowOverviewTitle"><div class="mc-workflow-heading"><span>CURRENT WORKFLOW</span><h2 id="workflowOverviewTitle">Workflow</h2></div><div id="workflowOverview"></div></section>
        <section class="panel mc-workflow-resources" aria-labelledby="workflowResourcesTitle"><div class="mc-workflow-heading"><span>AVAILABLE SOURCES</span><h2 id="workflowResourcesTitle">Workflow Resources</h2></div><div id="workflowResources"></div></section>
        <aside class="panel mc-workflow-session" aria-labelledby="workflowSessionTitle"><div class="mc-workflow-heading"><span>TEMPORARY · UNSAVED</span><h2 id="workflowSessionTitle">Workflow Session</h2></div><div id="workflowSession"></div></aside>
      </div>
    </section>

    <section id="inspections" class="view">
      <header class="mc-inspection-header">
        <div><span>PROJECT OPERATIONS</span><h2>Inspection Records</h2><p>Persistent, source-linked construction inspection records for the active project.</p></div>
        <button id="createInspectionRecord">Create Inspection Record</button>
      </header>
      <div class="mc-inspection-toolbar">
        <label><span>Search</span><input id="inspectionSearch" type="search" placeholder="Search number, title, location, or trade"></label>
        <label><span>Status</span><select id="inspectionStatusFilter"><option value="">All active statuses</option>${INSPECTION_STATUSES.map(status => `<option>${status}</option>`).join('')}</select></label>
        <label><span>Location</span><input id="inspectionLocationFilter" type="search" placeholder="Building, area, or room"></label>
        <label><span>Sort</span><select id="inspectionSort"><option value="number">Inspection number</option><option value="date">Inspection date</option></select></label>
        <label class="mc-inspection-archive-toggle"><input id="inspectionShowArchived" type="checkbox"> Show archived</label>
      </div>
      <div class="mc-inspection-workspace">
        <section class="panel" aria-labelledby="inspectionListTitle"><div class="mc-inspection-heading"><span>ACTIVE PROJECT</span><h2 id="inspectionListTitle">Inspection Register</h2></div><div id="inspectionList"></div></section>
        <aside class="panel" aria-labelledby="inspectionDetailTitle"><div class="mc-inspection-heading"><span>RECORD DETAIL</span><h2 id="inspectionDetailTitle">Inspection Detail</h2></div><div id="inspectionDetail"></div></aside>
      </div>
    </section>

    <section id="revisions" class="view">
      <header id="revisionHeader" class="mc-revision-header"></header>
      <div id="revisionSummary" class="mc-revision-summary"></div>
      <nav id="revisionFilters" class="mc-revision-filters" aria-label="Revision change filters"></nav>
      <div class="mc-revision-workspace">
        <section class="panel mc-revision-list-panel" aria-labelledby="revisionListTitle">
          <div class="mc-revision-heading"><span>DETERMINISTIC MATCHES</span><h2 id="revisionListTitle">Section Changes</h2></div>
          <div id="revisionList"></div>
        </section>
        <section class="panel mc-revision-detail-panel" aria-labelledby="revisionDetailTitle">
          <div class="mc-revision-heading"><span>STORED SECTION DATA</span><h2 id="revisionDetailTitle">Side-by-Side Review</h2></div>
          <div id="revisionDetail"></div>
        </section>
        <aside class="panel mc-revision-warning-panel" aria-labelledby="revisionWarningsTitle">
          <div class="mc-revision-heading"><span>INTEGRITY</span><h2 id="revisionWarningsTitle">Comparison Warnings</h2></div>
          <div id="revisionWarnings"></div>
        </aside>
      </div>
    </section>

    <section id="evaluate" class="view">
      <header class="mc-validation-header">
        <div>
          <span>KNOWLEDGE BASE READINESS</span>
          <h2>Knowledge Validation</h2>
          <p>
            Deterministic checks of loaded knowledge, indexing state,
            metadata, and coverage.
          </p>
        </div>
      </header>

      <div id="validationHealth" class="mc-validation-health"></div>

      <div class="mc-validation-grid">
        <section
          class="panel mc-validation-panel"
          aria-labelledby="validationChecksTitle"
        >
          <div class="mc-validation-heading">
            <div>
              <span>DETERMINISTIC REVIEW</span>
              <h2 id="validationChecksTitle">Validation Checks</h2>
            </div>
          </div>
          <div id="validationChecks"></div>
        </section>

        <section
          class="panel mc-validation-panel"
          aria-labelledby="validationAttentionTitle"
        >
          <div class="mc-validation-heading">
            <div>
              <span>OBSERVED CONDITIONS</span>
              <h2 id="validationAttentionTitle">Attention Items</h2>
            </div>
          </div>
          <div id="validationAttention"></div>
        </section>

        <section
          class="panel mc-validation-panel mc-validation-coverage-panel"
          aria-labelledby="validationCoverageTitle"
        >
          <div class="mc-validation-heading">
            <div>
              <span>PRODUCTION COUNTS</span>
              <h2 id="validationCoverageTitle">Coverage</h2>
            </div>
          </div>
          <div id="validationCoverage" class="mc-validation-coverage"></div>
        </section>

        <section
          class="panel mc-validation-panel"
          aria-labelledby="validationActionsTitle"
        >
          <div class="mc-validation-heading">
            <div>
              <span>INTERFACE GUIDANCE</span>
              <h2 id="validationActionsTitle">Recommended Actions</h2>
            </div>
          </div>
          <div id="validationActions" class="mc-validation-actions"></div>
        </section>
      </div>

      <details class="panel mc-validation-advanced">
        <summary>
          <span>
            <strong>Advanced AI Evaluation</strong>
            <small>Used for controlled benchmark testing of Chief.</small>
          </span>
        </summary>

        <div class="mc-validation-advanced-body">
          <section>
            <div class="mc-validation-heading">
              <div>
                <span>CONTROLLED BENCHMARKS</span>
                <h2>Advanced AI Evaluation Cases</h2>
              </div>
              <button id="addEval">＋ Add case</button>
            </div>
            <div id="evalList"></div>
          </section>

          <aside>
            <h3>Evaluation standard</h3>
            <p><strong>Required facts</strong> are phrases the answer must contain.</p>
            <p><strong>Expected source</strong> is a document or section the retrieval should find.</p>
            <p><strong>Prohibited assumptions</strong> are statements that must not appear.</p>
            <div id="evalResult"></div>
          </aside>
        </div>
      </details>
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
          <button data-settings-tab="experience">Experience</button>
          <button class="active" data-settings-tab="ai">AI</button>
          <button data-settings-tab="knowledge">Knowledge</button>
          <button data-settings-tab="developer">Developer</button>
          <button data-settings-tab="about">About</button>
        </div>

        <div class="settings-pane" data-settings-pane="experience">
          <fieldset class="mc-control-startup-setting">
            <legend>Startup Experience</legend>
            <label><input type="radio" name="startupExperience" value="mission-control"> Mission Control</label>
            <label><input type="radio" name="startupExperience" value="professional-workspace"> Professional Workspace</label>
            <p>You can switch experiences at any time without resetting your current project or work.</p>
          </fieldset>
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
            Evidence-first engineering workspace with local document retrieval,
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
              <span>Knowledge validation and advanced AI evaluation</span>
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

<aside id="demoGuide" class="mc-demo-guide" aria-labelledby="demoGuideTitle" hidden></aside>

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
  const images = $$('.mc-chief-status-image');

  status.dataset.chiefState = stateName;
  images.forEach(image => {
    image.src = chiefAssets[stateName];
    image.alt = 'Chief, the Mission Companion engineer';
  });
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
  drawings: [
    'Drawing Set Inspector',
    'Review authoritative PDF sheets, deterministic observations, and analysis warnings.'
  ],
  evidence: [
    'Evidence Explorer',
    'Inspect the retrieval results and citations behind the latest answer.'
  ],
  relationships: [
    'Relationship Explorer',
    'Inspect explicit hierarchy, references, and document relationships.'
  ],
  versions: [
    'Version Explorer',
    'Inspect explicit document lineage, duplicates, and deterministic revision changes.'
  ],
  revisions: [
    'Revision Review',
    'Inspect objective structural and stored-content changes between explicitly linked revisions.'
  ],
  engineering: [
    'Engineering Workspace',
    'Assemble exact project knowledge for an inspection or construction activity.'
  ],
  workflow: [
    'Workflow Workspace',
    'Orchestrate exact construction knowledge through deterministic workflow templates.'
  ],
  inspections: [
    'Inspection Records',
    'Create and manage persistent, source-linked project inspection records.'
  ],
  evaluate: [
    'Knowledge Validation',
    'Validate knowledge-base readiness, metadata, indexing, and coverage.'
  ],
  settings: [
    'Settings',
    'Configure the model and move project libraries between browsers.'
  ]
};

function show(name) {
  if (name !== 'drawings') releaseDrawingSource();
  view = name;
  if (experience === 'professional-workspace') lastProfessionalView = name;

  $$('.view').forEach(element => {
    element.classList.toggle('active', element.id === name);
  });

  $$('.rail nav button[data-view]').forEach(button => {
    const active = button.dataset.view === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  $('#pageTitle').textContent = titles[name][0];
  $('#pageSub').textContent = titles[name][1];
  void renderContextBusBanner(name);

  if (name === 'knowledge') {
    if (selectedDoc) void activateSelectedWorkspaceDocument(CONTEXT_ACTIVATION_SOURCES.knowledgeObjectDocument);
    renderKnowledgeWorkspace();
  }

  if (name === 'project') {
    renderProjectWorkspace();
  }

  if (name === 'sources') {
    if (selectedDoc) void activateSelectedWorkspaceDocument(
      sourceNavigationTarget?.documentId === selectedDoc && sourceNavigationTarget?.sectionId
        ? CONTEXT_ACTIVATION_SOURCES.sourceInspectorSection
        : CONTEXT_ACTIVATION_SOURCES.sourceInspectorDocument,
      selectedDoc,
      sourceNavigationTarget?.documentId === selectedDoc ? sourceNavigationTarget?.sectionId || '' : ''
    );
    renderSources();
  }
  if (name === 'drawings') void renderDrawingWorkspace('professional');

  if (name === 'evidence') {
    renderEvidenceExplorer();
  }

  if (name === 'relationships') {
    if (relationshipTarget?.documentId || selectedDoc) void activateSelectedWorkspaceDocument(
      relationshipTarget?.sectionId ? CONTEXT_ACTIVATION_SOURCES.relationshipSection : CONTEXT_ACTIVATION_SOURCES.relationshipDocument,
      relationshipTarget?.documentId || selectedDoc,
      relationshipTarget?.sectionId || '',
      relationshipTarget?.relationshipId || ''
    );
    renderRelationshipExplorer();
  }

  if (name === 'versions') {
    if (lineageTarget?.documentId || selectedDoc) void activateSelectedWorkspaceDocument(CONTEXT_ACTIVATION_SOURCES.versionDocument, lineageTarget?.documentId || selectedDoc);
    renderVersionExplorer();
  }

  if (name === 'revisions') {
    renderRevisionReview();
  }
  if (name === 'engineering') {
    renderEngineeringWorkspace();
  }
  if (name === 'workflow') {
    renderWorkflowWorkspace();
  }
  if (name === 'inspections') {
    renderInspectionRecords();
  }

  if (name === 'evaluate') {
    renderEvals();
  }

  if (name === 'diagnostics') {
    renderDiagnostics();
  }
}

$$('.rail nav button[data-view]').forEach(button => {
  button.onclick = () => {
    if (button.dataset.view === 'engineering' && activeContextActivation) {
      void openEngineeringWorkspace({ source: CONTEXT_ACTIVATION_SOURCES.engineeringWorkspace });
      return;
    }
    const panel = $('#professionalWorkspaceTools');
    if (panel) {
      panel.hidden = true;
      $('[data-workspace-tools-toggle]')?.setAttribute('aria-expanded', 'false');
    }
    show(button.dataset.view);
  };
  button.dataset.bound = 'true';
});

$('[data-workspace-tools-toggle]')?.addEventListener('click', () => {
  const panel = $('#professionalWorkspaceTools');
  const trigger = $('[data-workspace-tools-toggle]');
  if (!panel || !trigger) return;
  const expanded = panel.hidden;
  panel.hidden = !expanded;
  trigger.setAttribute('aria-expanded', String(expanded));
});

registerModule('Navigation', 'ready', {
  summary: `${$$('.rail nav button[data-view]').length} views registered`
});

function state() {
  return engine.state();
}

async function switchExperience(nextExperience, { destination = '', focus = true, force = false } = {}) {
  const next = normalizeStartupExperience(nextExperience);
  if (!force && !$('#modal').hidden) {
    alert('Finish or cancel the open form before switching experiences.');
    return false;
  }
  experience = next;
  const missionControl = next === 'mission-control';
  $('#missionControlShell').hidden = !missionControl;
  $('#professionalWorkspaceShell').hidden = missionControl;
  $('#missionControlShell').classList.toggle('mc-shell-inactive', !missionControl);
  $('#professionalWorkspaceShell').classList.toggle('mc-shell-inactive', missionControl);
  $('#missionControlShell').setAttribute('aria-hidden', String(!missionControl));
  $('#professionalWorkspaceShell').setAttribute('aria-hidden', String(missionControl));
  $('#missionControlShell').inert = !missionControl;
  $('#professionalWorkspaceShell').inert = missionControl;
  $('#skipLink').href = missionControl ? '#missionControlMain' : '#workspaceMain';
  if (missionControl) {
    await renderMissionControl();
    if (focus) $('#missionControlTitle')?.focus();
  } else {
    lastProfessionalView = destination || view;
    if (destination) show(destination);
    if (focus) $('#pageTitle')?.focus();
  }
  return true;
}

async function applyActionTargetState(target = {}, navigationTarget = null) {
  const actionTarget = resolveSharedActionTarget(target);
  if (!actionTarget) return;

  if (actionTarget.kind === 'source') {
    selectedDoc = actionTarget.documentId || selectedDoc;
    selectedKnowledgeSection = 'all';
    sourceNavigationTarget = actionTarget.sectionId
      ? createSourceTarget({
          projectId: actionTarget.projectId || state().activeProject || '',
          documentId: actionTarget.documentId || '',
          sectionId: actionTarget.sectionId || '',
          originatingWorkspace: actionTarget.origin || 'assistant',
          originatingMessageId: actionTarget.messageId || '',
          destination: actionTarget.destination || 'knowledge'
        })
      : null;
    sourceNavigationNotice = actionTarget.sectionId && navigationTarget?.reason === 'missing-section' ? 'Specification section unavailable' : '';
    return;
  }

  if (actionTarget.kind === 'rfi') {
    selectedDoc = actionTarget.documentId || selectedDoc;
    selectedKnowledgeSection = 'all';
    sourceNavigationTarget = createSourceTarget({
      projectId: actionTarget.projectId || state().activeProject || '',
      documentId: actionTarget.documentId || '',
      sectionId: actionTarget.sectionId || '',
      originatingWorkspace: actionTarget.origin || 'assistant',
      originatingMessageId: actionTarget.messageId || '',
      destination: actionTarget.destination || 'rfi'
    });
    sourceNavigationNotice = actionTarget.sectionId && navigationTarget?.reason === 'missing-section' ? 'RFI section unavailable' : '';
    return;
  }

  if (actionTarget.kind === 'submittal') {
    selectedDoc = actionTarget.documentId || selectedDoc;
    selectedKnowledgeSection = 'all';
    sourceNavigationTarget = createSourceTarget({
      projectId: actionTarget.projectId || state().activeProject || '',
      documentId: actionTarget.documentId || '',
      sectionId: actionTarget.sectionId || '',
      originatingWorkspace: actionTarget.origin || 'assistant',
      originatingMessageId: actionTarget.messageId || '',
      destination: actionTarget.destination || 'submittal'
    });
    sourceNavigationNotice = actionTarget.sectionId && navigationTarget?.reason === 'missing-section' ? 'Submittal section unavailable' : '';
    return;
  }

  if (actionTarget.kind === 'drawing') {
    selectedDoc = actionTarget.documentId || selectedDoc;
    drawingTarget = createDrawingTarget({
      projectId: actionTarget.projectId || state().activeProject || '',
      documentId: actionTarget.documentId || '',
      drawingSetId: actionTarget.drawingSetId || '',
      drawingId: actionTarget.drawingId || '',
      sheetId: actionTarget.sheetId || '',
      pageNumber: actionTarget.pageNumber || null,
      observationId: actionTarget.observationId || '',
      region: actionTarget.region || null,
      origin: actionTarget.origin || 'assistant',
      returnTarget: actionTarget.returnTarget || ''
    });
    selectedWorkPackageItem = drawingTarget?.observationId || drawingTarget?.sheetId || '';
    return;
  }

  if (actionTarget.kind === 'inspection') {
    selectedInspectionId = actionTarget.inspectionId || '';
  }
}

async function openProfessionalDestination(target = {}) {
  const actionTarget = resolveSharedActionTarget(target);
  const navigationTarget = prepareActionNavigationState(actionTarget || target, {
    activeProjectId: state().activeProject,
    projects: state().projects,
    documents: await engine.documents(),
    sections: await engine.sections()
  });
  if (navigationTarget.shouldSwitchProject) {
    await selectProjectThroughProductionPath(navigationTarget.projectId);
  }
  if (actionTarget) {
    await applyActionTargetState(actionTarget, navigationTarget);
  } else {
    if (target.inspectionId) selectedInspectionId = target.inspectionId;
    if (target.documentId) selectedDoc = target.documentId;
  }
  const destination = target.view || navigationTarget.destination || 'project';
  await switchExperience('professional-workspace', { destination });
}

function missionControlActionLabel(priority) {
  return priority.kind === 'in-progress' ? 'Continue inspection'
    : priority.kind === 'recent-revision' ? 'Review revision'
      : priority.kind === 'informational' ? 'Review document'
        : 'Review inspection';
}

function resolveSharedActionTarget(rawTarget = {}) {
  return normalizeActionTargetPayload(rawTarget, state().activeProject || '');
}

function missionControlEmpty(title, detail, action = '') {
  return `<div class="mc-control-empty"><strong>${esc(title)}</strong><p>${esc(detail)}</p>${action}</div>`;
}

function renderMyProjects() {
  const currentState = state();
  const { userProjects } = separateMissionControlProjects(currentState.projects, DEMO_PROJECT_ID);
  $('#missionControlContent').innerHTML = `
    <section class="mc-control-projects" aria-labelledby="missionControlTitle">
      <header class="mc-control-projects-header"><div><span>MISSION COMPANION</span><h1 id="missionControlTitle" tabindex="-1">My Projects</h1><p>Open existing work, create a project, or import a project package.</p></div><div><button data-control-action="create-project">Create New Project</button><button class="subtle" data-control-action="import-project">Import Project</button></div></header>
      <section class="mc-control-project-group" aria-labelledby="mcUserProjectsTitle"><header><span>YOUR WORK</span><h2 id="mcUserProjectsTitle">User Projects</h2></header>
        ${userProjects.length ? `<div class="mc-control-project-list">${userProjects.map(project => `<article class="mc-control-project-tile ${project.id === currentState.activeProject ? 'active' : ''}"><div><span>${project.id === currentState.activeProject ? 'CURRENT PROJECT' : 'PROJECT'}</span><h3>${esc(project.name)}</h3><p>${esc(project.description || 'Project details are available after opening.')}</p></div><button data-control-project-id="${esc(project.id)}">${project.id === currentState.activeProject ? 'Open Project' : 'Open'}</button></article>`).join('')}</div>` : missionControlEmpty('No user projects yet', 'Create a project or import an existing Mission Companion project package.', '<button data-control-action="create-project">Create your first project</button>')}
      </section>
    </section>`;
}

function missionControlProject() {
  const current = state();
  if (!current.activeProject || current.activeProject === 'general') return null;
  return current.projects.find(project => project.id === current.activeProject) || null;
}

function chiefDrawingEvidenceMarkup(message, projectDocuments = [], analyses = []) {
  const evidence = buildChiefDrawingEvidence(message, { documents: projectDocuments, analyses });
  if (!evidence) return '';
  const detail = [evidence.sheetNumber, evidence.sheetTitle].filter(Boolean).join(' · ');
  const sheetMeta = [evidence.discipline, evidence.sheetType].filter(Boolean).join(' · ');
  return `<section class="mc-chief-drawing-evidence" aria-label="Drawing evidence preview">
    <header>
      <span>DRAWING EVIDENCE</span>
      <strong>${esc(evidence.title || 'Drawing evidence')}</strong>
    </header>
    <div class="mc-chief-drawing-evidence-body">
      <div>
        <strong>${esc(detail || 'Exact drawing evidence')}</strong>
        <p>${esc(evidence.reason)}</p>
      </div>
      <dl>
        ${evidence.pageNumber ? `<div><dt>Page</dt><dd>${esc(evidence.pageNumber)}</dd></div>` : ''}
        ${evidence.sheetNumber ? `<div><dt>Sheet</dt><dd>${esc(evidence.sheetNumber)}</dd></div>` : ''}
        ${sheetMeta ? `<div><dt>Details</dt><dd>${esc(sheetMeta)}</dd></div>` : ''}
      </dl>
    </div>
    <button type="button" class="subtle" data-action-target='${esc(JSON.stringify(createActionTarget({ kind: 'drawing', projectId: state().activeProject || '', documentId: evidence.documentId, drawingSetId: evidence.drawingSetId, sheetId: evidence.sheetId, sheetNumber: evidence.sheetNumber, pageNumber: evidence.pageNumber, observationId: evidence.observationId, region: evidence.region, origin: 'chief-preview', messageId: message.id, returnTarget: 'chief-answer' })))}'>Open exact drawing</button>
  </section>`;
}

function chiefLocationPresentationMarkup(presentation = null) {
  if (!presentation) return '';
  const actions = presentation.actionTarget ? `<button type="button" class="subtle" data-action-target='${esc(JSON.stringify(presentation.actionTarget))}'>${esc(presentation.actionLabel)}</button>` : '';
  const candidates = presentation.candidates?.length ? `<ul>${presentation.candidates.slice(0, 4).map(item => `<li>${esc(item.label || item.kind || 'Location')}</li>`).join('')}</ul>` : '';
  return `<section class="mc-chief-location-card" aria-label="Chief location result">
    <header>
      <span>LOCATION</span>
      <strong>${esc(presentation.title || 'Location result')}</strong>
    </header>
    <div class="mc-chief-location-card-body">
      <p>${esc(presentation.summary || '')}</p>
      ${presentation.detail ? `<p>${esc(presentation.detail)}</p>` : ''}
      ${candidates}
    </div>
    ${actions}
  </section>`;
}

function missionControlMessageActions(message, drawingSourceIds = new Set()) {
  if (message.role !== 'assistant' || !Array.isArray(message.hits) || !message.hits.length) return '';
  if (message.workPackageReferences) return '';
  const exact = message.hits.filter(hit => hit?.documentId);
  if (!exact.length) return '';
  const first = exact[0];
  const label = first.sectionNumber || first.heading || first.documentName || first.source || 'source';
  const drawingHit = exact.find(hit => drawingSourceIds.has(hit.documentId) && Number(hit.pageStart || hit.pageNumber || hit.page) > 0);
  const sourceTarget = createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: first.documentId, sectionId: first.id || first.sectionId || '', destination: first.id || first.sectionId ? 'knowledge' : 'sources', origin: 'chat' });
  const drawingTarget = drawingHit ? createActionTarget({ kind: 'drawing', projectId: state().activeProject || '', documentId: drawingHit.documentId, pageNumber: Number(drawingHit.pageStart || drawingHit.pageNumber || drawingHit.page), origin: 'chat' }) : null;
  const evidenceTarget = createActionTarget({ kind: 'evidence', projectId: state().activeProject || '', documentId: first.documentId, messageId: message.id, origin: 'chat' });
  return `<div class="mc-control-message-actions"><button data-action-target='${esc(JSON.stringify(sourceTarget))}' data-control-source-document="${esc(first.documentId)}" data-control-source-section="${esc(first.id || first.sectionId || '')}">Open ${esc(label)}</button>${drawingTarget ? `<button data-action-target='${esc(JSON.stringify(drawingTarget))}' data-control-drawing-document="${esc(drawingHit.documentId)}" data-control-drawing-page="${Number(drawingHit.pageStart || drawingHit.pageNumber || drawingHit.page)}">Open drawing page ${Number(drawingHit.pageStart || drawingHit.pageNumber || drawingHit.page)}</button>` : ''}<button data-action-target='${esc(JSON.stringify(evidenceTarget))}' data-control-evidence-message="${esc(message.id)}">Review ${fmt(exact.length)} Supporting Reference${exact.length === 1 ? '' : 's'}</button></div>`;
}

function renderChiefEvidence() {
  const evidence = activeRetrievalSession?.evidence || [];
  if (!evidence.length) return '';
  const primary = evidence.find(item => item.id === selectedEvidenceId) || evidence[0];
  return `
    <section class="mc-chief-evidence" aria-labelledby="mcChiefEvidenceTitle">
      <div class="mc-chief-evidence-header">
        <div>
          <span>COMMAND DESK ANALYSIS</span>
          <h3 id="mcChiefEvidenceTitle">Evidence and results</h3>
        </div>
        <strong>${fmt(evidence.length)} result${evidence.length === 1 ? '' : 's'}</strong>
      </div>
      <div class="mc-chief-evidence-list">
        ${evidence.map(item => `<article class="mc-chief-evidence-item ${item.id === primary?.id ? 'active' : ''}">
          <strong>${esc(item.title || item.documentName || item.source || 'Evidence')}</strong>
          <p>${esc(item.summary || item.content || 'Stored source details are available for review.')}</p>
        </article>`).join('')}
      </div>
    </section>
  `;
}

async function renderChiefWorkspace({ historyVisible = false } = {}) {
  const existingInlineCanvas = $('#missionControlContent #mcDrawingCanvas');
  if (existingInlineCanvas) {
    captureDrawingViewport();
    portableDrawingCanvas = existingInlineCanvas;
  }
  const conversation = engine.activeConversation();
  const project = missionControlProject();
  const messages = conversation?.messages || [];
  const historyItems = engine.conversations();
  const projectDocuments = project ? await engine.documents() : [];
  const attachmentNames = new Map(projectDocuments.map(document => [document.id, document.name || document.title || document.id]));
  const drawingSourceIds = new Set((await Promise.all(projectDocuments.filter(isPdfDocument).map(async document => [document.id, Boolean(await engine.sourceFile(document.id))]))).filter(([, available]) => available).map(([id]) => id));
  const drawingAnalyses = await currentDrawingAnalyses();
  if (!activeWorkPackage) {
    let packageMessageIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) if (messages[index].role === 'assistant' && messages[index].workPackageReferences) { packageMessageIndex = index; break; }
    const promptMessage = packageMessageIndex > 0 ? [...messages.slice(0, packageMessageIndex)].reverse().find(message => message.role === 'user') : null;
    if (promptMessage && project) {
      const reconstructed = await buildActiveConstructionPackage(promptMessage.content);
      if (reconstructed) {
        const expected = new Set(messages[packageMessageIndex].workPackageReferences.matchingSheetIds || []);
        if (reconstructed.planResult.matchingSheetIds.every(id => expected.has(id)) && expected.size === reconstructed.planResult.matchingSheetIds.length) {
          activePlanQuery = reconstructed.planResult; activeWorkPackage = reconstructed.workPackage; activeWorkPackageMessageId = messages[packageMessageIndex].id; drawingMatchingSheetIds = [...reconstructed.planResult.matchingSheetIds];
          chiefConstructionContext = createChiefConstructionContext({ conversationId: conversation.conversationId, projectId: project.id, planResult: activePlanQuery, drawingTarget: activePlanQuery.viewerTarget, workPackageReferences: messages[packageMessageIndex].workPackageReferences, updatedFrom: 'conversation-reconstruction' });
        }
      }
    }
  }
  $('#missionControlContent').innerHTML = `
    <section class="mc-chief-workspace" aria-labelledby="missionControlTitle">
      <header class="mc-chief-workspace-header">
        <div class="mc-chief-workspace-intro">
          <div class="mc-chief-workspace-portrait">
            <img class="mc-chief-status-image" data-chief-image src="${chiefAssets.idle}" alt="Chief, the Mission Companion engineer" />
          </div>
          <div class="mc-chief-workspace-copy">
            <span>CHIEF · ENGINEERING ADVISOR</span>
            <h1 id="missionControlTitle" tabindex="-1">${project ? `Ask Chief about ${esc(project.name)}` : 'Mission Companion'}</h1>
            <p>${project ? `Use the active project context and the latest construction evidence in one persistent workspace.` : 'Create or import a project to begin working with Chief in a single continuous workspace.'}</p>
          </div>
        </div>
        <div class="mc-chief-workspace-questions" aria-label="Suggested construction questions">
          <span>Suggested questions</span>
          <div class="mc-chief-question-list">
            <button type="button" class="mc-chief-question-chip" data-control-prompt="Where is the planned work?">Where is the planned work?</button>
            <button type="button" class="mc-chief-question-chip" data-control-prompt="What drawings apply to this room?">What drawings apply to this room?</button>
            <button type="button" class="mc-chief-question-chip" data-control-prompt="What specifications govern this work?">What specifications govern this work?</button>
            <button type="button" class="mc-chief-question-chip" data-control-prompt="Are there related RFIs or submittals?">Are there related RFIs or submittals?</button>
          </div>
        </div>
      </header>
      <div class="mc-chief-workspace-grid">
        <section class="mc-chief-conversation-panel" aria-label="Chief conversation workspace">
          <div class="mc-chief-conversation-toolbar">
            <div id="chiefStatus" class="mc-chief-status" data-chief-state="idle" role="status" aria-live="polite" aria-atomic="true">
              <img class="mc-chief-status-image" data-chief-image src="${chiefAssets.idle}" alt="Chief, the Mission Companion engineer">
              <span class="mc-chief-status-copy">
                <strong id="chiefStatusLabel">Idle</strong>
                <small id="chiefStatusDetail">Ready to assist</small>
              </span>
            </div>
            <div class="mc-chief-toolbar-actions">
              <button type="button" data-control-action="new-conversation">New Conversation</button>
              <button type="button" class="subtle" data-control-action="show-history">Conversation History</button>
            </div>
          </div>
          <div class="mc-control-messages" role="log" aria-live="polite" aria-label="Chief conversation messages">
            ${chiefLocationPresentationMarkup(activeChiefLocationPresentation)}
            ${messages.length ? (await Promise.all(messages.map(async message => `<article class="mc-control-message ${message.role}" id="mc-message-${esc(message.id)}"><header><strong>${message.role === 'assistant' ? 'Chief' : 'You'}</strong>${message.role === 'assistant' ? `<span>${esc(missionControlResponseModeLabel(message.mode))}</span>` : ''}</header>${constructionWorkPackageMarkup(message)}${message.role === 'assistant' ? chiefDrawingEvidenceMarkup(message, projectDocuments, drawingAnalyses) : ''}<div class="mc-control-message-content">${esc(message.content).replace(/\n/g, '<br>')}</div>${missionControlMessageActions(message, drawingSourceIds)}</article>`))).join('') : `<div class="mc-control-chat-empty"><strong>Start a conversation</strong><p>Ask about the active project or attach supported documents. Answers remain linked to exact source records.</p></div>`}
          </div>
          ${historyVisible ? `<section class="mc-chief-history" aria-labelledby="mcChiefHistoryTitle"><div class="mc-chief-history-header"><div><span>CONVERSATION HISTORY</span><h2 id="mcChiefHistoryTitle">Recent threads</h2></div></div><div class="mc-chief-history-list">${historyItems.length ? historyItems.map(item => `<button type="button" class="mc-chief-history-item" data-conversation-id="${esc(item.conversationId)}"><strong>${esc(item.title || 'Conversation')}</strong><span>${esc(item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Not updated')}</span></button>`).join('') : '<p class="mc-chief-history-empty">No history yet.</p>'}</div></section>` : ''}
          <form id="missionControlComposer" class="mc-control-composer">
            <div class="mc-control-attachments" aria-live="polite">${(conversation?.attachmentDocumentIds || []).map(id => `<span data-attached-document="${esc(id)}">${esc(attachmentNames.get(id) || 'Attached document unavailable')} <button type="button" data-remove-attachment="${esc(id)}" aria-label="Remove attached document">×</button></span>`).join('')}${missionControlAttachments.map(item => `<span class="${esc(item.status)}">${esc(item.name)} · ${esc(item.status)}${item.error ? ` — ${esc(item.error)}` : ''}</span>`).join('')}</div>
            <label for="missionControlPrompt">Your question</label>
            <textarea id="missionControlPrompt" rows="3" placeholder="Ask Chief about your project…"></textarea>
            <div class="mc-chief-composer-actions">
              <div class="mc-chief-composer-tools">
                <label class="mc-control-attach"><input id="missionControlFiles" type="file" multiple accept=".pdf,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.html,.htm,.xml,.log">Attach documents</label>
                <label class="mc-control-mode">Response mode <select id="missionControlMode"><option value="offline">Source-only evidence</option><option value="source">Source-only AI</option><option value="assisted">Expert-assisted AI</option><option value="general">General assistant AI</option></select></label>
              </div>
              <button id="missionControlSend" type="submit">Ask Chief</button>
            </div>
          </form>
        </section>
        <aside class="mc-chief-side-panel" aria-label="Chief project context">
          ${project ? `<section class="mc-chief-context-card"><div><span>ACTIVE PROJECT</span><h2>${esc(project.name)}</h2><p>${esc(project.description || 'Project details and analysis stay available here while you work.')}</p></div><div class="mc-chief-context-actions"><button type="button" data-control-view="plans">Open Drawings</button><button type="button" data-control-view="library">Project Library</button></div></section>` : `<section class="mc-chief-context-card mc-chief-context-card-empty"><div><span>MISSION COMPANION</span><h2>Start with a project</h2><p>Select or create a project to begin construction analysis.</p></div><div class="mc-chief-context-actions"><button type="button" data-control-action="create-project">Create Project</button><button type="button" class="subtle" data-control-action="import-project">Import Project</button></div></section>`}
          ${activeWorkPackage ? `<section class="mc-chief-analysis-card"><div><span>COMMAND DESK ANALYSIS</span><h3>Construction work package</h3><p>${esc(activeWorkPackage.summary || 'A work package is available for review.')}</p></div></section>` : ''}
          ${renderChiefEvidence()}
        </aside>
      </div>
    </section>`;
  $('#missionControlMode').value = state().settings.mode;
  if ($('#chiefStatusImage')) setChiefState($('#chiefStatus')?.dataset.chiefState || 'idle');
  if ($('#missionInlineDrawingViewer') && activeWorkPackage?.presentation?.primaryDrawing) await renderDrawingWorkspace('mission-control');
}

async function renderMissionControlChat() {
  return renderChiefWorkspace({ historyVisible: chiefHistoryVisible });
}

function renderConversationHistory() {
  const projects = new Map(state().projects.map(project => [project.id, project.name]));
  const conversations = engine.conversations();
  $('#missionControlContent').innerHTML = `<section class="mc-control-history" aria-labelledby="missionControlTitle"><header><div><span>CONVERSATION HISTORY</span><h1 id="missionControlTitle" tabindex="-1">Your conversations</h1><p>Open a previous thread or begin a new one. History remains in this browser.</p></div><button data-control-action="new-conversation">New Conversation</button></header>${conversations.length ? `<ol>${conversations.map(conversation => `<li><article><button class="mc-control-history-open" data-conversation-id="${esc(conversation.conversationId)}"><strong>${esc(conversation.title)}</strong><span>${esc(projects.get(conversation.projectId) || 'No project associated')}</span><small>${esc(conversationPreview(conversation))}</small><time datetime="${esc(conversation.updatedAt)}">${conversation.updatedAt ? esc(new Date(conversation.updatedAt).toLocaleString()) : 'Not yet updated'}</time></button><button class="subtle" data-rename-conversation="${esc(conversation.conversationId)}">Rename</button></article></li>`).join('')}</ol>` : missionControlEmpty('No conversation history', 'Start a conversation and it will appear here.')}</section>`;
}

async function renderMissionControlLibrary() {
  const project = missionControlProject();
  const documents = project ? await engine.documents() : [];
  $('#missionControlContent').innerHTML = `<section class="mc-control-library" aria-labelledby="missionControlTitle"><header><div><span>PROJECT LIBRARY</span><h1 id="missionControlTitle" tabindex="-1">Project Library</h1><p>${project ? `Recent source documents for ${esc(project.name)}.` : 'Select a project to browse source documents.'}</p></div><label class="mc-control-attach"><input id="missionControlLibraryFiles" type="file" multiple accept=".pdf,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.html,.htm,.xml,.log">Import documents</label></header>${documents.length ? `<ol>${documents.slice().sort((a,b) => String(b.importedAt || '').localeCompare(String(a.importedAt || ''))).map(document => `<li><button data-control-source-document="${esc(document.id)}"><strong>${esc(document.title || document.name || document.id)}</strong><span>${esc(document.type || document.extension || 'Document')} · ${fmt(document.sectionCount)} sections</span></button></li>`).join('')}</ol>` : missionControlEmpty(project ? 'No documents yet' : 'No project open', project ? 'Import a supported document to populate this project.' : 'Open a project from My Projects first.')}</section>`;
}

async function renderMissionControlInspections() {
  const project = missionControlProject();
  const records = project ? await engine.inspectionRecords({ includeArchived: false }) : [];
  $('#missionControlContent').innerHTML = `<section class="mc-control-library mc-control-inspections" aria-labelledby="missionControlTitle"><header><div><span>INSPECTIONS</span><h1 id="missionControlTitle" tabindex="-1">Inspection Records</h1><p>${project ? `Recorded field work for ${esc(project.name)}.` : 'Select a project to create or review inspections.'}</p></div>${project ? '<button data-control-action="create-inspection">Create Inspection Record</button>' : '<button data-control-view="projects">Open My Projects</button>'}</header>${records.length ? `<ol>${records.map(record => `<li><button data-control-inspection-id="${esc(record.inspectionId)}"><strong>${esc(record.inspectionNumber)} · ${esc(record.title)}</strong><span>${esc(record.status)} · ${esc(record.result)}${record.followUpRequired ? ' · Follow-up required' : ''}</span></button></li>`).join('')}</ol>` : missionControlEmpty(project ? 'No inspections yet' : 'No project open', project ? 'Create the first Inspection Record for this project.' : 'Open a project from My Projects first.')}</section>`;
}

function isPdfDocument(document) {
  return String(document?.mimeType || '').toLowerCase() === 'application/pdf' || String(document?.extension || document?.type || '').toLowerCase().replace(/^\./, '') === 'pdf' || /\.pdf$/i.test(document?.name || '');
}

function drawingStatusCopy(document, source, analysis) {
  if (!source) return { label: 'Original PDF unavailable', detail: 'Reattach the exact original PDF to view its sheets. Extracted text remains available.' };
  if (!analysis) return { label: 'Analysis unavailable', detail: 'The authoritative PDF is stored, but deterministic sheet analysis is unavailable.' };
  return { label: analysis.status || 'Ready for review', detail: `${analysis.sheets.length} sheet${analysis.sheets.length === 1 ? '' : 's'} organized as construction evidence.` };
}

async function currentDrawingAnalyses() {
  const workspaceProjectId = state().activeProject;
  const analyses = await engine.drawingAnalyses();
  const outcomes = await Promise.all(analyses.map(async analysis => {
    if (!drawingAnalysisRequiresUpgrade(analysis)) {
      const ownership = await engine.drawingLifecycle(analysis.documentId, analysis.drawingSetId);
      return ownership.ok ? { ok: true, analysis } : ownership;
    }
    const key = drawingUpgradeKey(analysis, DRAWING_ANALYSIS_VERSION);
    if (drawingUpgradeFailures.has(key)) return { ok: false, status: 'unavailable', errorCode: 'drawing-upgrade-failed', analysis, owningProjectId: analysis.projectId, activeProjectId: workspaceProjectId, warning: 'Analysis upgrade is waiting for a lifecycle issue to be corrected.', recoverable: true, actions: [] };
    if (!drawingUpgradeWork.has(key)) drawingUpgradeWork.set(key, (async () => {
      const ownership = await engine.drawingLifecycle(analysis.documentId, analysis.drawingSetId);
      if (!ownership.ok) return ownership;
      const upgraded = upgradeDrawingAnalysis(analysis);
      const saved = await engine.saveDrawingAnalysis(upgraded);
      return saved.ok ? { ...saved, analysis: upgraded } : saved;
    })().catch(error => ({ ok: false, status: 'failed', errorCode: 'drawing-upgrade-failed', analysis, owningProjectId: analysis.projectId, activeProjectId: workspaceProjectId, warning: error.message || 'Drawing analysis upgrade failed.', recoverable: true, actions: [] })).finally(() => drawingUpgradeWork.delete(key)));
    const result = await drawingUpgradeWork.get(key);
    if (!result.ok) drawingUpgradeFailures.add(key);
    return result;
  }));
  drawingLifecycleUnavailable = outcomes.filter(item => !item.ok);
  return outcomes.filter(item => item.ok && item.analysis).map(item => item.analysis);
}

let latestDrawingRegistryInspection = null;

async function currentGlobalDrawingRegistryAnalyses(query = '') {
  const currentState = state();
  const [activeAnalyses, activeDocuments] = await Promise.all([engine.drawingAnalyses(), engine.documents()]);
  const rebuildResults = [];
  const shouldUpgradeForCommand = analysis => analysis.projectId === currentState.activeProject && drawingAnalysisRequiresUpgrade(analysis);
  const refreshed = await loadAuthoritativeDrawingRegistry({
    loadAnalyses: () => engine.drawingRegistryAnalyses(),
    requiresUpgrade: shouldUpgradeForCommand,
    validateOwnership: analysis => engine.drawingLifecycle(analysis.documentId, analysis.drawingSetId),
    rebuild: analysis => upgradeDrawingAnalysis(analysis),
    save: analysis => engine.saveDrawingAnalysis(analysis),
    reloadSaved: async analysis => (await engine.drawingLifecycle(analysis.documentId, analysis.drawingSetId)).analysis,
    upgradeWork: drawingUpgradeWork
  });
  refreshed.results.forEach((result, index) => {
    const analysis = refreshed.initial.filter(shouldUpgradeForCommand)[index];
    if (!analysis) return;
    const key = drawingUpgradeKey(analysis, DRAWING_ANALYSIS_VERSION);
    if (result?.ok) drawingUpgradeFailures.delete(key);
    else drawingUpgradeFailures.add(key);
    const beforeNumbers = new Set((analysis.drawingRegistry || []).map(item => item.normalizedSheetNumber).filter(Boolean));
    const afterNumbers = (result.analysis?.drawingRegistry || []).map(item => item.normalizedSheetNumber).filter(Boolean);
    rebuildResults.push({ drawingSetId: analysis.drawingSetId, documentId: analysis.documentId, projectId: analysis.projectId, ok: Boolean(result.ok), status: result.status || '', errorCode: result.errorCode || '', profileRevisionBefore: analysis.profile?.profileVersion || 0, profileRevisionAfter: result.analysis?.profile?.profileVersion || 0, savedRegistryCount: result.analysis?.drawingRegistry?.length || 0, recoveredRows: afterNumbers.filter(item => !beforeNumbers.has(item)) });
  });
  const available = refreshed.analyses.filter(analysis => !drawingAnalysisRequiresUpgrade(analysis));
  const intent = classifyEngineeringNavigationIntent(query);
  const activeExactMatch = intent.kind === 'exact-drawing-navigation' && available.some(analysis => analysis.projectId === currentState.activeProject && (analysis.drawingRegistry || []).some(item => item.normalizedSheetNumber === intent.value));
  const commandAnalyses = activeExactMatch ? available.filter(analysis => analysis.projectId === currentState.activeProject) : available;
  try {
    latestDrawingRegistryInspection = inspectDrawingRegistryRuntime({ activeProject: currentState.projects.find(project => project.id === currentState.activeProject) || { id: currentState.activeProject, name: currentState.activeProject }, documents: activeDocuments, analyses: commandAnalyses, persistedAnalyses: refreshed.analyses, activeAnalyses, query, rebuild: { attempted: rebuildResults.length > 0, results: rebuildResults } });
  } catch (error) {
    latestDrawingRegistryInspection = { activeProjectId: currentState.activeProject, query, diagnosticError: error.message || 'Runtime registry inspection could not be constructed.', globalAnalysisCount: refreshed.analyses.length, availableAnalysisCount: available.length };
  }
  return commandAnalyses;
}

async function buildActiveConstructionPackage(query, evidence = []) {
  const projectId = state().activeProject;
  if (!projectId || projectId === 'general') return null;
  const [analyses, documents, sections, inspections] = await Promise.all([
    currentDrawingAnalyses(), engine.documents(), engine.sections(), engine.inspectionRecords({ includeArchived: true })
  ]);
  const conversationId = engine.activeConversation()?.conversationId || '';
  chiefConstructionContext = validateChiefConstructionContext(chiefConstructionContext, { conversationId, projectId, analyses });
  const planResult = buildPlanQuery({ query, projectId, analyses, context: chiefConstructionContext });
  if (!planResult.matchingSheetIds.length) return null;
  const relationshipModel = buildKnowledgeRelationships({ documents, sections });
  const relationships = [...relationshipModel.membership, ...relationshipModel.hierarchy, ...relationshipModel.explicitReferences, ...relationshipModel.reverseReferences, ...relationshipModel.documentReferences];
  const revisions = buildRevisionMetrics({ documents, sections }).comparisons.map(comparison => ({ revisionId: `${comparison.earlierDocument.id}->${comparison.laterDocument.id}`, documentIds: [comparison.earlierDocument.id, comparison.laterDocument.id], status: comparison.status || '' }));
  const workPackage = buildConstructionWorkPackage({ planResult, documents, sections, inspections, relationships, revisions, evidence, workflow: getWorkflowSession()?.workflow });
  return { planResult, workPackage, analyses, sections };
}

function workPackageGroup(title, items, formatter) {
  if (!items?.length) return '';
  return `<section><h4>${esc(title)}</h4><ol>${items.map(item => `<li>${formatter(item)}${item.reason ? `<small>${esc(item.reason)}</small>` : ''}</li>`).join('')}</ol></section>`;
}

function constructionWorkPackageMarkup(message) {
  const workPackage = activeWorkPackage;
  if (!workPackage || message.role !== 'assistant' || !message.workPackageReferences || message.id !== activeWorkPackageMessageId) return '';
  const sourceOnly = ['offline', 'source'].includes(message.mode);
  const sheetActions = workPackage.responseActions.filter(action => action?.target?.sheetId);
  const currentWorkTarget = currentWorkActivationTarget(workPackage);
  const beforeWork = workPackage.submittals.filter(item => /approved/i.test(item.status || ''));
  const afterWork = workPackage.inspections.filter(item => item.status === 'Follow-Up Required' || item.followUpRequired);
  const primary = workPackage.presentation?.primaryDrawing;
  return `<section class="mc-work-package" aria-labelledby="mcWorkPackage-${esc(message.id)}">
    <header><div><span>CONSTRUCTION WORK PACKAGE</span><h3 id="mcWorkPackage-${esc(message.id)}">${esc([workPackage.discipline, workPackage.room ? `Room ${workPackage.room}` : '', workPackage.building ? `Building ${workPackage.building}` : ''].filter(Boolean).join(' · ') || 'Supported project work')}</h3></div><strong>${sourceOnly ? 'Evidence only' : 'Evidence with separate expert guidance'}</strong></header>
    <section class="mc-work-package-overview"><h4>Work and location</h4><dl><div><dt>Work</dt><dd>${esc(workPackage.workSummary[0]?.statement || 'Exact construction evidence selected')}</dd></div><div><dt>Location</dt><dd>${esc([workPackage.building ? `Building ${workPackage.building}` : '', workPackage.floor, workPackage.room ? `Room ${workPackage.room}` : ''].filter(Boolean).join(' · ') || 'Not resolved')}</dd></div><div><dt>Trade / system</dt><dd>${esc(workPackage.discipline || 'Not resolved')}</dd></div></dl></section>
    ${primary ? `<section class="mc-work-package-primary"><h4>Primary plan</h4><button data-work-package-sheet="${esc(primary.sheetId)}">${esc(sheetActions.find(action => action.target.sheetId === primary.sheetId)?.label || 'Show primary plan')}</button></section>` : ''}
    ${workPackageGroup('Work shown or referenced', workPackage.presentation?.exactPlanEvidence || workPackage.workSummary, item => `<strong>${esc(item.statement)}</strong><span>${esc(item.basis)}${item.quality ? ` · ${esc(item.quality)}` : ''}</span>`)}
    ${workPackageGroup('Related plans', workPackage.presentation?.relatedPlans || [], item => `<button data-work-package-sheet="${esc(item.sheetId)}">${esc(sheetActions.find(action => action.target.sheetId === item.sheetId)?.label || 'Open exact sheet')}</button>`)}
    ${workPackageGroup('Schedules and details', workPackage.presentation?.schedulesDetails || [], item => `<button data-work-package-sheet="${esc(item.sheetId)}">${esc(sheetActions.find(action => action.target.sheetId === item.sheetId)?.label || 'Open exact supporting sheet')}</button>`)}
    ${workPackage.discipline === 'Mechanical' ? `<section class="mc-work-package-mechanical"><h4>Mechanical Work</h4><dl><div><dt>Plans</dt><dd>${fmt(workPackage.drawings.length)}</dd></div><div><dt>Schedules</dt><dd>${fmt(workPackage.schedules.length)}</dd></div><div><dt>Details</dt><dd>${fmt(workPackage.details.length)}</dd></div><div><dt>Observed identifiers</dt><dd>${fmt(activePlanQuery?.matchingObservationIds?.length || 0)}</dd></div></dl><small>Potential coordination is shown only when exact project relationships support it. No routing, quantity, placement, connectivity, room boundary, or clash is asserted.</small></section>` : ''}
    ${workPackageGroup('Supporting requirements', workPackage.specifications, item => `<button data-action-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, sectionId: item.sectionId || '', destination: item.sectionId ? 'knowledge' : 'sources', origin: 'work-package' })))}' data-work-package-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, sectionId: item.sectionId || '', destination: item.sectionId ? 'knowledge' : 'sources', origin: 'work-package' })))}' data-control-source-document="${esc(item.documentId)}" data-control-source-section="${esc(item.sectionId || '')}">Open ${esc(item.title || item.id)}</button>`)}
    ${workPackageGroup('RFIs', workPackage.rfis, item => `<button data-action-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, destination: 'sources', origin: 'work-package' })))}' data-work-package-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, destination: 'sources', origin: 'work-package' })))}' data-control-source-document="${esc(item.documentId)}">Review ${esc(item.title || item.id)}</button><span>${esc(item.status || '')}</span>`)}
    ${workPackageGroup('Submittals', workPackage.submittals, item => `<button data-action-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, destination: 'sources', origin: 'work-package' })))}' data-work-package-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, destination: 'sources', origin: 'work-package' })))}' data-control-source-document="${esc(item.documentId)}">Review ${esc(item.title || item.id)}</button><span>${esc(item.status || '')}</span>`)}
    ${workPackageGroup('Current inspections', workPackage.inspections, item => `<button data-action-target='${esc(JSON.stringify(createActionTarget({ kind: 'inspection', projectId: state().activeProject || '', documentId: item.documentId || '', inspectionId: item.id, origin: 'work-package' })))}' data-work-package-target='${esc(JSON.stringify(createActionTarget({ kind: 'inspection', projectId: state().activeProject || '', documentId: item.documentId || '', inspectionId: item.id, origin: 'work-package' })))}' data-control-inspection-id="${esc(item.id)}">Open ${esc(item.inspectionNumber || item.id)} · ${esc(item.title || '')}</button><span>${esc(item.status)} · ${esc(item.result)}</span>`)}
    ${workPackageGroup('Open issues', workPackage.deficiencies, item => `<button data-action-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, destination: 'sources', origin: 'work-package' })))}' data-work-package-target='${esc(JSON.stringify(createActionTarget({ kind: 'source', projectId: state().activeProject || '', documentId: item.documentId, destination: 'sources', origin: 'work-package' })))}' data-control-source-document="${esc(item.documentId)}">Open ${esc(item.title || item.id)}</button><span>${esc(item.status || '')}</span>`)}
    ${!sourceOnly ? `<section class="mc-work-package-interpretation"><h4>Expert interpretation</h4><p>Review the exact evidence and unresolved candidates before using this package for inspection or coordination decisions.</p></section>${workPackageGroup('Current risks', workPackage.risks, item => `<strong>${esc(item.label)}</strong>`)}` : ''}
    ${!sourceOnly && (beforeWork.length || afterWork.length) ? `<section class="mc-construction-timeline"><h4>Construction Timeline</h4><div>${beforeWork.length ? `<article><span>Before this work</span><ul>${beforeWork.map(item => `<li>Approved submittal: ${esc(item.title || item.id)}</li>`).join('')}</ul></article>` : ''}${afterWork.length ? `<article><span>After this work</span><ul>${afterWork.map(item => `<li>Inspection follow-up: ${esc(item.inspectionNumber || item.id)}</li>`).join('')}</ul></article>` : ''}</div></section>` : ''}
    ${!sourceOnly ? `<section><h4>Inspection preparation</h4><p>${esc(workPackage.inspectionPreparation.nextInspectionStatement)}</p></section>` : ''}
    <section class="mc-work-package-limitations"><h4>Limitations</h4><ul>${workPackage.limitations.map(item => `<li>${esc(item)}</li>`).join('')}</ul></section>
    <div class="mc-work-package-actions">${sheetActions.slice(0, 8).map(action => `<button data-action-target='${esc(JSON.stringify(createActionTarget({ kind: 'drawing', projectId: action.target?.projectId || workPackage.projectId || '', documentId: action.target?.documentId || '', drawingSetId: action.target?.drawingSetId || '', drawingId: action.target?.drawingId || '', sheetId: action.target?.sheetId || '', observationId: action.target?.observationId || '', pageNumber: action.target?.pageNumber || null, region: action.target?.region || null, origin: 'work-package' })))}' data-work-package-target='${esc(JSON.stringify(action.target || {}))}'>${esc(action.label)}</button>`).join('')}${!sourceOnly && currentWorkTarget.available ? '<button data-work-package-current>Add to Current Work</button>' : ''}${!sourceOnly && workPackage.projectId ? '<button data-work-package-inspection>Create Inspection</button>' : ''}</div>
    ${primary ? `<section class="mc-inline-plan ${sourceOnly ? 'source-only' : 'expert-assisted'}"><header><div><span>SUPPORTING DRAWING</span><strong>Exact plan evidence</strong></div><button data-inline-full-drawing>Open Full Drawing Workspace</button></header><div id="missionInlineDrawingViewer" class="mc-drawing-workspace" aria-label="Synchronized construction drawing"></div></section>` : ''}
  </section>`;
}

function groupedRoomEvidenceMarkup(roomObservations, sheet) {
  const groups = new Map();
  for (const observation of roomObservations) {
    if (!groups.has(observation.value)) groups.set(observation.value, []);
    groups.get(observation.value).push(observation);
  }
  return [...groups].map(([room, items]) => `<article><strong>Room ${esc(room)}</strong><span>${esc(sheet.discipline)} · ${esc(sheet.sheetNumber || `Page ${sheet.pageNumber}`)}</span><small>${fmt(items.length)} exact text observation${items.length === 1 ? '' : 's'} · ${esc(items[0].verification.status)}</small></article>`).join('');
}

function releaseDrawingSource() {
  drawingViewerEngine.cancelRender();
  activeDrawingPdf?.cleanup?.();
  activeDrawingPdf?.destroy?.();
  activeDrawingPdf = null;
  activeDrawingDocumentId = '';
  activeDrawingSourceRecord = null;
  activeDrawingResizeObserver?.disconnect();
  activeDrawingResizeObserver = null;
  activeDrawingResizeStage = null;
  activeDrawingRenderIdentity = null;
  portableDrawingCanvas = null;
  activeDrawingViewerAnalysis = null;
  drawingViewerEngine.openDocument('', 0);
}

async function createRetainedPdfViewerAnalysis(documentRecord, source, requestedPage = 1, metadataAnalysis = null) {
  if (!source?.sourceBlob || !documentRecord?.id) return null;
  if (!activeDrawingPdf || activeDrawingDocumentId !== source.documentId) {
    activeDrawingPdf?.cleanup?.();
    activeDrawingPdf?.destroy?.();
    activeDrawingPdf = await openPdfBlob(source.sourceBlob);
    activeDrawingDocumentId = source.documentId;
    activeDrawingSourceRecord = source;
    drawingRenderGeneration += 1;
  }
  const pageCount = Math.max(0, Number(activeDrawingPdf.numPages) || 0);
  if (!pageCount) return null;
  const pageNumber = Math.max(1, Math.min(pageCount, Math.trunc(Number(requestedPage) || 1)));
  drawingViewerEngine.openDocument(documentRecord.id, pageCount, pageNumber);
  const page = await activeDrawingPdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1, rotation: 0 });
  const catalogRecords = drawingCatalog.reconcile({ documentId: documentRecord.id, projectId: documentRecord.projectId || state().activeProject, drawingSetId: metadataAnalysis?.drawingSetId || '', pageCount, parserRecords: [...(metadataAnalysis?.sheets || []), ...(metadataAnalysis?.drawingRegistry || [])], storedMetadata: metadataAnalysis?.pageMetadata || [] });
  const analysis = createPdfPageViewerAnalysis({ documentId: documentRecord.id, projectId: documentRecord.projectId || state().activeProject, pageCount, selectedPage: pageNumber, pageWidth: viewport.width, pageHeight: viewport.height, rotation: page.rotate || viewport.rotation || 0, metadataAnalysis, catalogRecords });
  page.cleanup?.();
  return analysis;
}

function captureDrawingViewport(overrides = {}) {
  if (!drawingTarget?.documentId || !drawingTarget?.pageNumber) return;
  const current = { ...defaultDrawingViewport(), ...drawingViewerEngine.getViewport(drawingTarget.pageNumber) };
  const stage = $('#mcDrawingStage');
  drawingViewerEngine.restoreViewport(drawingTarget.pageNumber, { ...current, zoom: drawingZoom, rotation: drawingRotation, scrollLeft: stage?.scrollLeft || current.scrollLeft || 0, scrollTop: stage?.scrollTop || current.scrollTop || 0, selectedObservationId: drawingTarget.observationId || current.selectedObservationId, highlightedRegion: drawingTarget.region || current.highlightedRegion, ...overrides, overlays: { ...current.overlays, ...(overrides.overlays || {}) } });
}

function updateDrawingOverlays(stage, sheet, observation, overlayRecords = []) {
  stage.querySelectorAll('.mc-drawing-highlight,.mc-drawing-object-overlay').forEach(item => item.remove());
  if (observation?.region && drawingRotation % 360 === 0 && sheet.rotation % 360 === 0) {
    const overlay = document.createElement('div');
    overlay.className = 'mc-drawing-highlight';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', `Highlighted ${observationKindLabel(observation.kind)}: ${observation.value}`);
    Object.assign(overlay.style, { left: `${observation.region.x * 100}%`, top: `${observation.region.y * 100}%`, width: `${observation.region.width * 100}%`, height: `${observation.region.height * 100}%` });
    stage.append(overlay);
  }
  for (const record of overlayRecords.filter(item => item.region)) {
    const overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = `mc-drawing-object-overlay ${record.status === 'Confirmed' ? 'confirmed' : 'candidate'}`;
    overlay.dataset.overlayLayer = record.layer;
    overlay.dataset.overlayId = record.id;
    overlay.setAttribute('aria-label', `${record.status === 'Confirmed' ? 'Confirmed' : 'Candidate'} ${record.label}`);
    overlay.title = record.label;
    Object.assign(overlay.style, { left: `${record.region.x * 100}%`, top: `${record.region.y * 100}%`, width: `${Math.max(record.region.width * 100, .8)}%`, height: `${Math.max(record.region.height * 100, .8)}%` });
    stage.append(overlay);
  }
}

async function paintDrawingPage(source, sheet, observation, overlayRecords = []) {
  const canvas = $('#mcDrawingCanvas');
  const stage = $('#mcDrawingStage');
  if (!canvas || !stage || !source || !sheet) return;
  try {
    drawingViewportDocumentId = source.documentId;
    if (!activeDrawingPdf || activeDrawingDocumentId !== source.documentId) {
      activeDrawingPdf?.cleanup?.();
      activeDrawingPdf?.destroy?.();
      activeDrawingPdf = await openPdfBlob(source.sourceBlob);
      activeDrawingDocumentId = source.documentId;
      drawingRenderGeneration += 1;
    }
    drawingViewerEngine.openDocument(source.documentId, activeDrawingPdf.numPages, sheet.pageNumber);
    const restored = { ...defaultDrawingViewport(), ...drawingViewerEngine.getViewport(sheet.pageNumber) };
    drawingZoom = restored.zoom;
    drawingRotation = restored.rotation;
    if (!Number.isFinite(drawingZoom) || restored.mode === 'fit-page' || restored.mode === 'fit-width') {
      let fit = calculateDrawingFit({ containerWidth: stage.clientWidth, containerHeight: stage.clientHeight, pageWidth: sheet.pageWidth, pageHeight: sheet.pageHeight, rotation: (sheet.rotation + drawingRotation) % 360, padding: 18, mode: restored.mode });
      for (let attempt = 0; !fit.ready && attempt < 12; attempt += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        fit = calculateDrawingFit({ containerWidth: stage.clientWidth, containerHeight: stage.clientHeight, pageWidth: sheet.pageWidth, pageHeight: sheet.pageHeight, rotation: (sheet.rotation + drawingRotation) % 360, padding: 18, mode: restored.mode });
      }
      if (!fit.ready) throw new Error('Drawing viewer is waiting for a measurable layout.');
      drawingZoom = fit.scale;
    }
    const boundedScale = Math.max(.35, Math.min(3, drawingZoom));
    const nextIdentity = createDrawingRenderIdentity({ documentId: source.documentId, drawingSetId: drawingTarget?.drawingSetId, pageNumber: sheet.pageNumber, scale: boundedScale, rotation: (sheet.rotation + drawingRotation) % 360, sourceAvailable: true, generation: drawingRenderGeneration });
    const decision = drawingRenderDecision({ previousIdentity: activeDrawingRenderIdentity, nextIdentity, canvas });
    if (decision.repaint) {
      const renderCanvas = document.createElement('canvas');
      const renderOutcome = await drawingViewerEngine.renderSelectedPage(pageNumber => renderPdfPage(activeDrawingPdf, pageNumber, renderCanvas, { scale: boundedScale, rotation: nextIdentity.rotation }));
      if (!renderOutcome.committed || !canvas.isConnected || drawingTarget?.pageNumber !== sheet.pageNumber) {
        renderOutcome.task?.release?.();
        return;
      }
      canvas.width = renderCanvas.width;
      canvas.height = renderCanvas.height;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(renderCanvas, 0, 0);
      canvas.dataset.drawingDocument = source.documentId;
      canvas.dataset.drawingSet = drawingTarget?.drawingSetId || '';
      canvas.dataset.drawingPage = String(sheet.pageNumber);
      canvas.dataset.renderReason = decision.reason;
      activeDrawingRenderIdentity = nextIdentity;
    }
    stage.scrollLeft = restored.scrollLeft || 0;
    stage.scrollTop = restored.scrollTop || 0;
    drawingViewerEngine.restoreViewport(sheet.pageNumber, { ...restored, zoom: drawingZoom, rotation: drawingRotation, selectedObservationId: observation?.observationId || restored.selectedObservationId, highlightedRegion: observation?.region || restored.highlightedRegion });
    stage.onscroll = () => captureDrawingViewport();
    stage.onwheel = event => {
      const bounds = stage.getBoundingClientRect();
      const next = drawingWheelZoom({
        deltaY: event.deltaY,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        zoom: drawingZoom,
        scrollLeft: stage.scrollLeft,
        scrollTop: stage.scrollTop,
        pointerX: event.clientX - bounds.left,
        pointerY: event.clientY - bounds.top
      });
      if (!next.recognized) return;
      event.preventDefault();
      drawingZoom = next.zoom;
      captureDrawingViewport({ mode: 'custom', zoom: next.zoom, scrollLeft: next.scrollLeft, scrollTop: next.scrollTop });
      void paintDrawingPage(source, sheet, observation, overlayRecords);
    };
    updateDrawingOverlays(stage, sheet, observation, overlayRecords);
    if (globalThis.ResizeObserver && activeDrawingResizeStage !== stage) {
      activeDrawingResizeObserver?.disconnect();
      activeDrawingResizeObserver = new ResizeObserver(() => {
        const current = { ...defaultDrawingViewport(), ...drawingViewerEngine.getViewport(sheet.pageNumber) };
        if (current.mode === 'fit-page' || current.mode === 'fit-width') void paintDrawingPage(source, sheet, observation, overlayRecords);
      });
      activeDrawingResizeObserver.observe(stage);
      activeDrawingResizeStage = stage;
    }
  } catch (error) {
    if (drawingTarget?.pageNumber !== sheet.pageNumber) return;
    canvas.insertAdjacentHTML('afterend', `<div class="mc-drawing-render-error" role="status"><strong>Drawing page could not be updated.</strong><p>${esc(error.message)}</p><small>The previously rendered sheet remains available when possible.</small></div>`);
  }
}

function drawingSearchResultMarkup(result, selectedSheetId, index) {
  if (result.sheet.viewerFallback) return `<li><button data-drawing-page-id="${esc(result.sheet.pageId)}" data-drawing-sheet="${esc(result.sheetId)}" data-drawing-result-index="${index}" class="${result.sheetId === selectedSheetId ? 'active' : ''} ${index === drawingSearchActiveIndex ? 'keyboard-active' : ''}" ${index === drawingSearchActiveIndex ? 'aria-current="true"' : ''}><strong>${esc(result.sheet.sheetNumber || `Page ${result.pageNumber}`)}</strong><span>${esc(result.sheet.sheetTitle || 'Retained PDF page')}</span><small><i data-discipline="${esc(result.sheet.discipline || 'Unknown')}"></i>${esc(result.sheet.discipline || 'Unknown')} · ${esc(result.primarySheetType || 'Unknown')} · PDF page ${result.pageNumber}</small><small>${esc(result.sheet.identityStatus || (result.sheet.metadataAvailable ? 'Parser' : 'Fallback'))}</small>${result.matchedReason ? `<em>${esc(result.matchedReason)}</em>` : ''}</button></li>`;
  const warnings = result.sheet.warnings?.length ? `${result.sheet.warnings.length} identity warning${result.sheet.warnings.length === 1 ? '' : 's'}` : 'Identity supported';
  return `<li><button data-drawing-sheet="${esc(result.sheetId)}" data-drawing-search-observation="${esc(result.observationId)}" data-drawing-result-index="${index}" class="${result.sheetId === selectedSheetId ? 'active' : ''} ${index === drawingSearchActiveIndex ? 'keyboard-active' : ''}" ${index === drawingSearchActiveIndex ? 'aria-current="true"' : ''}><strong>${esc(result.sheet.sheetNumber || 'Identity requires review')}</strong><span>${esc(result.sheet.sheetTitle || 'Title requires review')}</span><small><i data-discipline="${esc(result.sheet.discipline)}"></i>${esc(result.sheet.discipline)} · ${esc(result.primarySheetType)} · ${result.sheet.building ? `Building ${esc(result.sheet.building)} · ` : ''}Page ${result.pageNumber}</small><small>${Math.round((result.sheet.confidence || 0) * 100)}% identity confidence · ${esc(warnings)}</small>${result.matchedReason ? `<em>${esc(result.matchedReason)}</em>` : ''}</button></li>`;
}

async function updateDrawingSearchResults() {
  const revision = ++drawingSearchRevision;
  const persistedAnalysis = drawingTarget?.documentId ? await engine.drawingAnalysis(drawingTarget.documentId) : null;
  const analysis = activeDrawingViewerAnalysis?.documentId === drawingTarget?.documentId ? activeDrawingViewerAnalysis : persistedAnalysis;
  const resultsHost = $('#mcDrawingResults');
  const status = $('#mcDrawingResultStatus');
  if (revision !== drawingSearchRevision || !analysis || !resultsHost || !status) return;
  const results = searchDrawingSheets({ query: drawingFilter, discipline: drawingDiscipline, sheetType: drawingType, analysis });
  drawingMatchingSheetIds = results.map(item => item.sheetId);
  const selection = reconcileDrawingSelection(drawingMatchingSheetIds, drawingTarget?.sheetId);
  drawingSearchActiveIndex = selection.index;
  status.textContent = drawingSearchSummary(drawingFilter, results.length);
  resultsHost.innerHTML = results.length ? results.map((result, index) => drawingSearchResultMarkup(result, drawingTarget?.sheetId, index)).join('') : '<li class="mc-drawing-no-results"><strong>No drawing evidence found.</strong><span>Try a sheet number, room, trade, equipment tag, or clear the active filters.</span></li>';
  $('[data-drawing-clear-search]')?.toggleAttribute('hidden', !drawingFilter);
  resultsHost.querySelector('.keyboard-active')?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

function observationButtons(items, sheet) {
  return items.slice(0, 30).map(item => `<li><button data-drawing-observation="${esc(item.observationId)}"><strong>${esc(observationKindLabel(item.kind))}</strong><span>${esc(item.value)}</span><small>${esc(sheet.sheetNumber || `Page ${sheet.pageNumber}`)} · ${esc(item.verification.status)}</small><em>Show on Plan</em></button></li>`).join('');
}

function sheetAnalysisMarkup({ shell, analysis, sheet, observation, groups, warnings }) {
  if (!sheet) return '<p>Select a supported sheet to review its construction evidence.</p>';
  const related = (analysis?.sheets || []).filter(item => item.sheetId !== sheet.sheetId && item.discipline === sheet.discipline).slice(0, 8);
  return `<h3>Construction Evidence</h3>
    <p class="mc-drawing-limitation">Graphical association has not been verified. These findings are exact drawing text and metadata evidence.</p>
    ${groups.rooms.length ? `<section><h4>Rooms</h4><ol>${groups.rooms.map(group => `<li><button data-drawing-observation="${esc(group.observationIds[0])}"><strong>Room ${esc(group.roomNumber)}</strong><span>Appears ${fmt(group.count)} time${group.count === 1 ? '' : 's'} on this sheet</span><small>${esc(group.verificationStates.join(', '))}</small><em>Show locations</em></button></li>`).join('')}</ol></section>` : '<section class="mc-drawing-quiet"><h4>Rooms</h4><p>No exact room labels were classified on this sheet.</p></section>'}
    ${groups.equipment.length ? `<section><h4>Equipment and tags</h4><ol>${observationButtons(groups.equipment, sheet)}</ol></section>` : ''}
    ${groups.schedulesAndDetails.filter(item => /schedule/i.test(item.value)).length ? `<section><h4>Schedules</h4><ol>${observationButtons(groups.schedulesAndDetails.filter(item => /schedule/i.test(item.value)), sheet)}</ol></section>` : ''}
    ${groups.schedulesAndDetails.filter(item => /detail/i.test(item.value)).length ? `<section><h4>Details</h4><ol>${observationButtons(groups.schedulesAndDetails.filter(item => /detail/i.test(item.value)), sheet)}</ol></section>` : ''}
    ${groups.references.length ? `<section><h4>Callouts</h4><ol>${observationButtons(groups.references, sheet)}</ol></section>` : ''}
    ${related.length ? `<section><h4>Related sheets</h4><ol>${related.map(item => `<li><button data-drawing-sheet="${esc(item.sheetId)}"><strong>${esc(item.sheetNumber || 'Number unavailable')}</strong><span>${esc(item.sheetTitle || 'Title unavailable')}</span><small>${esc(item.primarySheetType || item.sheetTypes?.[0] || 'Unknown')}</small></button></li>`).join('')}</ol></section>` : ''}
    ${warnings.userFacing.length ? `<section class="mc-drawing-warning-list"><h4>Needs attention</h4><ul>${warnings.userFacing.slice(0, 12).map(item => `<li><span aria-hidden="true">!</span>${esc(item.message)}</li>`).join('')}</ul></section>` : ''}
    ${observation ? `<section class="mc-drawing-selected-observation"><h4>Selected observation</h4><strong>${esc(observationKindLabel(observation.kind))}: ${esc(observation.value)}</strong><span>${esc(observation.verification.status)}</span>${shell === 'professional' ? `<div aria-label="Verify selected observation"><button class="subtle" data-drawing-verify="Confirmed" data-observation-id="${esc(observation.observationId)}">Confirm ${esc(observationKindLabel(observation.kind))}</button><button class="subtle" data-drawing-verify="Corrected" data-observation-id="${esc(observation.observationId)}">Correct observed value</button><button class="subtle" data-drawing-verify="Uncertain" data-observation-id="${esc(observation.observationId)}">Mark uncertain</button><button class="subtle" data-drawing-verify="Rejected" data-observation-id="${esc(observation.observationId)}">Reject observation</button></div>` : ''}</section>` : ''}
    <details class="mc-drawing-analysis-details"><summary>Analysis details</summary><dl><div><dt>Identity method</dt><dd>${esc(sheet.sheetNumberResolutionMethod || 'Unavailable')}</dd></div><div><dt>Title method</dt><dd>${esc(sheet.sheetTitleResolutionMethod || 'Unavailable')}</dd></div><div><dt>Discipline reason</dt><dd>${esc(sheet.disciplineEvidence || 'Unavailable')}</dd></div><div><dt>Evidence confidence</dt><dd>${Math.round(sheet.confidence * 100)}%</dd></div></dl>${sheet.rejectedSheetNumberCandidates?.length ? `<h5>Identity candidates requiring review</h5><ul>${sheet.rejectedSheetNumberCandidates.slice(0, 20).map(item => `<li>${esc(item.value)} — ${esc(item.reason)}</li>`).join('')}</ul>` : ''}${warnings.technical.length ? `<h5>Technical warnings</h5><ul>${warnings.technical.slice(0, 20).map(item => `<li>${esc(item.message)}</li>`).join('')}</ul>` : ''}${shell === 'professional' ? '<button data-drawing-analyze-page>Analyze Page Objects</button>' : ''}</details>`;
}

function drawingContextMarkup(context) {
  const records = (items, empty = 'No linked data.') => items?.length
    ? `<ul>${items.map(item => `<li>${esc(item.label || item.title || item.name || item.id || 'Linked record')}</li>`).join('')}</ul>`
    : `<p>${esc(empty)}</p>`;
  const page = context?.page || {};
  const issues = [...(context?.issues || []), ...(context?.risks || []), ...(context?.questions || [])];
  return `<div class="mc-drawing-page-context" aria-label="Selected drawing page context">
    <section><h3>Summary</h3><dl><div><dt>Sheet</dt><dd>${esc(page.sheetNumber || `Page ${page.pdfPageNumber || ''}`)}</dd></div><div><dt>Discipline</dt><dd>${esc(page.discipline || 'Unknown')}</dd></div><div><dt>Drawing type</dt><dd>${esc(page.drawingType || 'Unknown')}</dd></div></dl></section>
    <section><h3>Specifications</h3>${records(context?.specifications, 'No linked specifications.')}</section>
    <section><h3>Related Drawings</h3>${records(context?.relatedDrawings, 'No related drawings.')}</section>
    <section><h3>Inspection Items</h3>${records(context?.inspectionItems)}</section>
    <section><h3>Equipment</h3>${records(context?.equipment)}</section>
    <section><h3>Rooms</h3>${records(context?.rooms)}</section>
    <section><h3>Photos</h3>${records(context?.photos)}</section>
    <section><h3>Documents</h3>${records(context?.documents)}</section>
    <section><h3>Issues</h3>${records(issues)}</section>
    <section><h3>History</h3>${records(context?.history)}</section>
  </div>`;
}

function drawingRecoveryMarkup(record = {}) {
  const projectName = state().projects.find(item => item.id === record.owningProjectId)?.name || record.owningProjectId || 'Unavailable';
  const activeName = state().projects.find(item => item.id === state().activeProject)?.name || state().activeProject || 'Unavailable';
  const availableActions = [
    ...(record.actions || []),
    record.owningProjectId && record.owningProjectId !== state().activeProject ? { id: 'open-owning-project', label: 'Open Owning Project' } : null,
    { id: 'return-to-drawing-sets', label: 'Return to Drawing Sets' },
    record.document && !record.sourceFile ? { id: 'reattach-original-pdf', label: 'Reattach Original PDF' } : null,
    record.analysis ? { id: 'retry-analysis-upgrade', label: 'Retry Analysis Upgrade' } : null,
    record.analysis && ['drawing-document-missing', 'drawing-analysis-orphan', 'drawing-project-mismatch'].includes(record.errorCode) ? { id: 'remove-stale-analysis', label: 'Remove Stale Analysis' } : null,
    { id: 'view-technical-details', label: 'View Details' }
  ].filter(Boolean);
  const actions = [...new Map(availableActions.map(item => [item.id, item])).values()];
  return `<article class="mc-drawing-recovery" data-recovery-code="${esc(record.errorCode || 'drawing-analysis-invalid')}"><span>DRAWING LIFECYCLE</span><h3>Drawing source unavailable</h3><p>${esc(record.warning || 'Mission Companion found drawing information, but its exact source could not be resolved.')}</p><dl><div><dt>Expected project</dt><dd>${esc(projectName)}</dd></div><div><dt>Active project</dt><dd>${esc(activeName)}</dd></div></dl><div>${actions.map(item => `<button ${item.id === 'view-technical-details' ? 'class="subtle"' : ''} data-drawing-recovery-action="${esc(item.id)}" data-drawing-set-id="${esc(record.analysis?.drawingSetId || record.diagnostics?.drawingSetId || '')}" data-drawing-document-id="${esc(record.analysis?.documentId || record.document?.id || '')}" data-owning-project-id="${esc(record.owningProjectId || '')}">${esc(item.label)}</button>`).join('')}</div><details><summary>Technical details</summary><dl><div><dt>Error code</dt><dd>${esc(record.errorCode || 'drawing-analysis-invalid')}</dd></div><div><dt>Document ID</dt><dd>${esc(record.analysis?.documentId || record.document?.id || 'Unavailable')}</dd></div><div><dt>Drawing-set ID</dt><dd>${esc(record.analysis?.drawingSetId || 'Unavailable')}</dd></div><div><dt>Expected project ID</dt><dd>${esc(record.owningProjectId || 'Unavailable')}</dd></div><div><dt>Active project ID</dt><dd>${esc(state().activeProject)}</dd></div><div><dt>Source file</dt><dd>${record.sourceFile ? 'Available' : 'Unavailable'}</dd></div><div><dt>Analysis</dt><dd>${record.analysis ? 'Available' : 'Unavailable'}</dd></div><div><dt>Analysis version</dt><dd>${esc(record.analysis?.analysisVersion ?? 'Unavailable')}</dd></div><div><dt>Target sheet</dt><dd>${esc(drawingTarget?.sheetId || 'None')}</dd></div><div><dt>Target observation</dt><dd>${esc(drawingTarget?.observationId || 'None')}</dd></div></dl></details></article>`;
}

async function renderDrawingWorkspace(shell = 'professional') {
  const workspaceRenderRequest = ++drawingWorkspaceRenderRequest;
  const host = shell === 'mission-control' ? ($('#missionInlineDrawingViewer') || $('#missionDrawingViewer')) : $('#drawingInspector');
  if (!host) return;
  const preservedCanvas = host.querySelector('#mcDrawingCanvas') || portableDrawingCanvas;
  const preservedStage = host.querySelector('#mcDrawingStage');
  const preservedViewport = { scrollLeft: preservedStage?.scrollLeft || 0, scrollTop: preservedStage?.scrollTop || 0 };
  let targetLifecycleUnavailable = null;
  let activeReturnTarget = null;
  if (drawingTarget?.documentId) {
    const exact = await engine.drawingLifecycle(drawingTarget.documentId, drawingTarget.drawingSetId);
    if (exact.document && exact.owningProjectId && exact.owningProjectId !== state().activeProject && state().projects.some(item => item.id === exact.owningProjectId)) {
      await selectProjectThroughProductionPath(exact.owningProjectId);
      if ($('#projectSelect')) $('#projectSelect').value = exact.owningProjectId;
    }
    if (!exact.document) { targetLifecycleUnavailable = { ...exact, errorCode: 'drawing-target-stale', warning: 'The selected drawing document is no longer available.' }; drawingTarget = null; }
  }
  const documents = (await engine.documents()).filter(isPdfDocument);
  const retainedAnalyses = await engine.drawingAnalyses();
  const analyses = await currentDrawingAnalyses();
  const orphanDiagnostics = await engine.drawingLifecycleDiagnostics();
  const lifecycleRecords = [...drawingLifecycleUnavailable, ...orphanDiagnostics];
  drawingLifecycleUnavailable = [...new Map(lifecycleRecords.map(item => [`${item.errorCode}:${item.analysis?.drawingSetId || item.sourceFile?.documentId || item.document?.id || ''}`, item])).values()];
  if (targetLifecycleUnavailable) drawingLifecycleUnavailable = [targetLifecycleUnavailable, ...drawingLifecycleUnavailable];
  const analysesByDocument = new Map(analyses.map(item => [item.documentId, item]));
  const retainedAnalysesByDocument = new Map(retainedAnalyses.map(item => [item.documentId, item]));
  if (!documents.length) {
    releaseDrawingSource();
    host.innerHTML = drawingLifecycleUnavailable.length ? `<section class="mc-drawing-recovery-list"><h2>Drawing Sets</h2>${drawingLifecycleUnavailable.map(drawingRecoveryMarkup).join('')}</section>` : `<div class="mc-drawing-empty"><strong>No drawing set is available for this project.</strong><p>Import a drawing package or return to Chief to continue the project review.</p><div class="mc-drawing-empty-actions"><button type="button" data-drawing-empty-action="import">Import Drawing</button><button type="button" class="subtle" data-drawing-empty-action="chief">Return to Chief</button></div></div>`;
    return;
  }
  const requestedDocument = drawingTarget?.documentId;
  const selected = documents.find(item => item.id === requestedDocument) || documents.find(item => analysesByDocument.has(item.id) || retainedAnalysesByDocument.has(item.id)) || documents[0];
  const persistedAnalysis = retainedAnalysesByDocument.get(selected.id) || analysesByDocument.get(selected.id) || null;
  let analysis = analysesByDocument.get(selected.id) || null;
  const source = activeDrawingSourceRecord?.documentId === selected.id && activeDrawingSourceRecord.projectId === state().activeProject
    ? activeDrawingSourceRecord
    : await engine.sourceFile(selected.id);
  activeDrawingSourceRecord = source;
  if (source) {
    const catalogAnalysis = await createRetainedPdfViewerAnalysis(selected, source, drawingTarget?.pageNumber || 1, persistedAnalysis || analysis);
    if (catalogAnalysis) analysis = { ...catalogAnalysis, viewerFallback: !analysis || Boolean(analysis.viewerFallback) };
  }
  if (workspaceRenderRequest !== drawingWorkspaceRenderRequest) return;
  activeDrawingViewerAnalysis = analysis || null;
  if (analysis?.viewerFallback && drawingTarget?.documentId === selected.id) {
    const page = Math.max(1, Math.min(analysis.sheets.length, Number(drawingTarget.pageNumber) || 1));
    drawingTarget = createDrawingTarget({ ...drawingTarget, projectId: analysis.projectId, documentId: selected.id, drawingSetId: analysis.drawingSetId, sheetId: analysis.sheets[page - 1]?.sheetId, pageNumber: page });
  }
  if (drawingTarget) {
    const reduced = reduceStaleDrawingTarget(drawingTarget, { document: selected, analysis });
    if (reduced.target) drawingTarget = reduced.target;
    else if (reduced.status === 'drawing-target-stale') drawingTarget = null;
  }
  const viewerAnalyses = analysis && !analyses.includes(analysis) ? [analysis, ...analyses] : analyses;
  const resolvedAfterReduction = drawingTarget && analysis ? resolveDrawingTarget(drawingTarget, { documents, analyses: viewerAnalyses }) : null;
  const sheet = resolvedAfterReduction?.sheet || analysis?.sheets?.find(item => item.sheetId === drawingTarget?.sheetId) || analysis?.sheets?.[0] || null;
  const observation = resolvedAfterReduction?.observation || null;
  const planObject = resolvedAfterReduction?.planObject || null;
  const highlightedRegion = resolvedAfterReduction?.region || observation?.region || drawingTarget?.region || null;
  const currentMatchingSheetIds = drawingTarget?.matchingSheetIds && drawingTarget.matchingSheetIds.length ? drawingTarget.matchingSheetIds : drawingMatchingSheetIds;
  const matchingSet = analysis ? reconcileDrawingMatchingSheetIds({ target: { ...drawingTarget, matchingSheetIds: currentMatchingSheetIds, sheetId: sheet?.sheetId || drawingTarget?.sheetId }, analysis, previousMatchingSheetIds: drawingMatchingSheetIds }) : { matchingSheetIds: [], activeSheetId: sheet?.sheetId || '', activeIndex: -1 };
  drawingMatchingSheetIds = analysis?.viewerFallback ? analysis.sheets.map(item => item.sheetId) : matchingSet.matchingSheetIds;
  if (sheet) drawingTarget = createDrawingTarget({ projectId: analysis.projectId, documentId: selected.id, drawingSetId: analysis.drawingSetId, pageId: sheet.pageId, drawingId: sheet.drawingId, sheetId: sheet.sheetId, pageNumber: sheet.pageNumber, observationId: observation?.observationId || '', planObjectId: planObject?.occurrenceId || '', region: highlightedRegion, origin: drawingTarget?.origin || '', matchingSheetIds: drawingMatchingSheetIds, returnTarget: drawingTarget?.returnTarget || '' });
  const resolvedTarget = drawingTarget && analysis ? resolveDrawingTarget(drawingTarget, { documents, analyses: viewerAnalyses }) : null;
  const effectiveObservation = resolvedTarget?.observation || observation || null;
  const effectivePlanObject = resolvedTarget?.planObject || planObject || null;
  const effectiveRegion = resolvedTarget?.region || highlightedRegion || null;
  const status = drawingStatusCopy(selected, source, persistedAnalysis);
  const disciplines = [...new Set((analysis?.sheets || []).map(item => item.discipline).filter(Boolean))].sort();
  const sheetTypes = [...new Set((analysis?.sheets || []).flatMap(item => item.sheetTypes || []).filter(Boolean))].sort();
  const searchResults = analysis ? searchDrawingSheets({ query: drawingFilter, discipline: drawingDiscipline, sheetType: drawingType, analysis }) : [];
  const shownSheets = searchResults.map(item => item.sheet);
  const navigationSheetIds = drawingMatchingSheetIds.length ? drawingMatchingSheetIds : searchResults.map(item => item.sheetId);
  const navigationIndex = navigationSheetIds.indexOf(sheet?.sheetId);
  const observations = sheet ? (analysis?.observations || []).filter(item => item.sheetId === sheet.sheetId) : [];
  const exactRooms = observations.filter(item => item.kind === 'room-number-text');
  const observationGroups = groupDrawingObservations(observations);
  const warningGroups = drawingWarningPresentation([...(sheet?.warnings || []).map(message => ({ type: 'sheet-warning', message })), ...(analysis?.warnings || [])]);
  const selectedResult = searchResults.find(result => result.sheetId === sheet?.sheetId);
  const selectionExplanation = analysis?.viewerFallback ? (sheet?.metadataAvailable ? 'Showing the retained PDF page with available drawing metadata.' : 'Showing the retained PDF page without drawing-analysis metadata.') : selectedResult?.matchedReason || (drawingTarget?.origin === 'plan-query' ? 'Chief selected this as the highest-ranked exact plan evidence.' : drawingTarget?.observationId ? 'Opened from an exact drawing observation.' : 'Selected from this drawing set.');
  const sheetLegends = (analysis?.legends || []).filter(item => item.sheetId === sheet?.sheetId);
  const sheetSchedules = (analysis?.schedules || []).filter(item => item.sheetId === sheet?.sheetId);
  const sheetKeyedNotes = (analysis?.keyedNoteOccurrences || []).filter(item => item.sheetId === sheet?.sheetId);
  const sheetOccurrences = (analysis?.candidateOccurrences || []).filter(item => item.sheetId === sheet?.sheetId);
  drawingWorkspace.setPages((analysis?.sheets || []).map(item => ({ ...item, documentId: item.documentId || selected.id, drawingSetId: item.drawingSetId || analysis?.drawingSetId, projectId: item.projectId || analysis?.projectId, pdfPageNumber: item.pdfPageNumber || item.pageNumber })));
  const pageContext = drawingWorkspace.getContext(sheet ? { ...sheet, documentId: sheet.documentId || selected.id, drawingSetId: sheet.drawingSetId || analysis?.drawingSetId, projectId: sheet.projectId || analysis?.projectId, pdfPageNumber: sheet.pdfPageNumber || sheet.pageNumber } : drawingTarget?.pageNumber || 1);
  if (sheet) drawingViewerEngine.openDocument(selected.id, Math.max(sheet.pageNumber, ...(analysis?.sheets || []).map(item => Number(item.pageNumber) || 0)), sheet.pageNumber);
  const viewport = sheet ? { ...defaultDrawingViewport(), ...drawingViewerEngine.getViewport(sheet.pageNumber) } : defaultDrawingViewport();
  const returnAction = drawingReturnAction(drawingTarget?.returnTarget || '');
  const returnLabel = shell === 'professional' && returnAction?.kind === 'mission-control' ? 'Return to Chief' : returnAction?.label;
  const focusTarget = drawingFocusTarget({ sheet, observation: effectiveObservation, planObject: effectivePlanObject, region: effectiveRegion });
  const announcementText = sheet ? drawingAnnouncementText({ sheet, observation: effectiveObservation, planObject: effectivePlanObject, region: effectiveRegion }) : 'No drawing selected';
  const overlayRecords = [
    ...observations.map(item => ({ id: item.observationId, layer: item.kind.startsWith('room') ? 'rooms' : item.kind === 'equipment-tag-text' ? 'equipment' : 'callouts', label: `${observationKindLabel(item.kind)} ${item.value}`, region: item.region, status: item.verification?.status || 'Unreviewed' })),
    ...sheetKeyedNotes.map(item => ({ id: item.keyedNoteOccurrenceId, layer: 'keyedNotes', label: `Keyed note ${item.identifier}`, region: item.region, status: item.verification?.status || 'Unreviewed' })),
    ...sheetOccurrences.map(item => ({ id: item.occurrenceId, layer: item.verification?.status === 'Confirmed' ? 'confirmed' : 'candidates', label: 'Plan object occurrence', region: item.region, status: item.verification?.status || 'Unreviewed' }))
  ].filter(item => viewport.overlays?.[item.layer] !== false);
  host.innerHTML = `
    <header class="mc-drawing-header" id="mc-drawing-header"><div><span>${shell === 'mission-control' ? 'CONSTRUCTION INTELLIGENCE · PLANS' : 'PROFESSIONAL WORKSPACE · DRAWING EVIDENCE'}</span><h2 title="${esc(selected.title || selected.name || 'Drawing set')}">${esc(selected.title || selected.name || 'Drawing set')}</h2><p><strong>${esc(status.label)}</strong> — ${esc(status.detail)}</p></div><div>${shell === 'professional' && persistedAnalysis ? '<button class="subtle" data-drawing-reanalyze>Reanalyze Drawing Set</button>' : ''}${returnAction ? `<button class="subtle" data-drawing-return="${esc(returnAction.kind)}">${esc(returnLabel)}</button>` : ''}</div></header>
    <div class="mc-drawing-layout ${drawingWorkspacePanels.finderHidden ? 'finder-hidden' : ''} ${drawingWorkspacePanels.evidenceHidden ? 'evidence-hidden' : ''} ${drawingWorkspacePanels.expanded ? 'drawing-expanded' : ''}">
      <aside class="mc-drawing-index" aria-label="Find construction drawing evidence"><label>Drawing set<select id="mcDrawingDocument">${documents.map(item => `<option value="${esc(item.id)}" ${item.id === selected.id ? 'selected' : ''}>${esc(item.title || item.name || item.id)}</option>`).join('')}</select></label>${analysis ? `<label>Find a sheet, room, trade, or tag<input id="mcDrawingSearch" value="${esc(drawingFilter)}" autocomplete="off" aria-controls="mcDrawingResults" aria-describedby="mcDrawingResultStatus"></label><button class="subtle" data-drawing-clear-search ${drawingFilter ? '' : 'hidden'}>Clear search</button><div class="mc-drawing-filters"><label>Discipline<select id="mcDrawingDiscipline"><option value="all">All disciplines</option>${disciplines.map(item => `<option ${item === drawingDiscipline ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select></label><label>Drawing type<select id="mcDrawingType"><option value="all">All types</option>${sheetTypes.map(item => `<option ${item === drawingType ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select></label></div><p id="mcDrawingResultStatus" role="status" aria-live="polite">${esc(drawingSearchSummary(drawingFilter, shownSheets.length))}</p><ol id="mcDrawingResults" aria-label="Drawing search results">${searchResults.map((result, index) => drawingSearchResultMarkup(result, sheet?.sheetId, index)).join('') || '<li class="mc-drawing-no-results"><strong>No drawing evidence found.</strong><span>Try a sheet number, room, trade, equipment tag, or clear the active filters.</span></li>'}</ol>` : ''}</aside>
      <main class="mc-drawing-viewer"><details class="mc-construction-orientation"><summary>Work and selection context</summary><div><strong>${esc(activeWorkPackage?.workSummary?.[0]?.label || sheet?.sheetTitle || 'Select construction evidence')}</strong><span>${sheet?.building ? `Building ${esc(sheet.building)} · ` : ''}${esc(activeWorkPackage?.discipline || sheet?.discipline || 'Unknown')} · ${esc(selectionExplanation)}</span></div></details>
        ${!source ? `<div class="mc-drawing-unavailable"><strong>Original drawing unavailable — reattach PDF to view sheet.</strong><p>Reattach the exact source PDF to inspect the drawing. Indexed project text remains available.</p><label class="mc-drawing-reattach"><input id="mcDrawingReattach" type="file" accept="application/pdf,.pdf">Reattach Original PDF</label></div>` : !sheet ? `<div class="mc-drawing-unavailable"><strong>Drawing page unavailable.</strong><p>The retained PDF does not expose a viewable page.</p></div>` : `<header id="${focusTarget === 'mc-drawing-selected-evidence' ? 'mc-drawing-selected-evidence' : 'mc-drawing-sheet-title'}" class="mc-drawing-sheet-title" tabindex="-1" aria-live="polite" aria-label="${esc(announcementText)}"><div><span>${esc(sheet.sheetNumber || `Page ${sheet.pageNumber}`)}</span><h3>${esc(sheet.sheetTitle || `Page ${sheet.pageNumber}`)}</h3><p>${esc(selectionExplanation)}</p></div><dl><div><dt>Discipline</dt><dd>${esc(sheet.discipline)}</dd></div><div><dt>Type</dt><dd>${esc(sheet.primarySheetType || sheet.sheetTypes[0] || 'Unknown')}</dd></div><div><dt>Position</dt><dd>${analysis.viewerFallback ? 'Page' : 'Sheet'} ${sheet.pageNumber} of ${analysis.sheets.length}</dd></div><div><dt>Identity</dt><dd>${esc(sheet.identityStatus)}</dd></div></dl></header><div class="mc-drawing-toolbar"><div role="group" aria-label="Drawing navigation"><button data-drawing-previous ${navigationIndex <= 0 ? 'disabled' : ''}>Previous</button><button data-drawing-next ${navigationIndex < 0 || navigationIndex >= navigationSheetIds.length - 1 ? 'disabled' : ''}>Next</button><button data-drawing-layout="toggle-finder">${drawingWorkspacePanels.finderHidden ? 'Show' : 'Hide'} Sheet Finder</button></div><div role="group" aria-label="Drawing view controls"><button data-drawing-fit="page">Fit Page</button><button data-drawing-fit="width">Fit Width</button><button data-drawing-zoom="out">Zoom Out</button><button data-drawing-zoom="in">Zoom In</button><button data-drawing-rotate>Rotate</button><button data-drawing-reset-view>Reset View</button><button data-drawing-layout="${drawingWorkspacePanels.expanded ? 'restore' : 'expand'}">${drawingWorkspacePanels.expanded ? 'Restore Workspace' : 'Expand Drawing'}</button></div><div role="group" aria-label="Construction context actions">${analysis.viewerFallback ? '' : '<button data-drawing-ask>Ask Chief</button><button data-drawing-current-work>Add to Current Work</button><button data-drawing-inspection>Create Inspection</button>'}<button data-drawing-edit-metadata>Edit Page Metadata</button><button class="subtle" data-drawing-source>Open Source Details</button><button data-drawing-layout="toggle-evidence">${drawingWorkspacePanels.evidenceHidden ? 'Show' : 'Hide'} Construction Evidence</button></div><output aria-label="Current drawing view">${Number.isFinite(drawingZoom) ? Math.round(drawingZoom * 100) : 'Fit'}% · ${drawingRotation}°</output></div>${analysis.viewerFallback && !analysis.metadataAvailable ? '' : `<fieldset class="mc-drawing-overlay-controls"><legend>Drawing overlays</legend>${Object.entries({ rooms: 'Room Labels', confirmed: 'Confirmed Objects', candidates: 'Candidate Objects', equipment: 'Equipment Tags', keyedNotes: 'Keyed Notes', callouts: 'Callouts', scheduleLinks: 'Schedule Links', warnings: 'Warnings' }).map(([key,label]) => `<label><input type="checkbox" data-drawing-overlay="${key}" ${viewport.overlays?.[key] === false ? '' : 'checked'}>${label}</label>`).join('')}</fieldset>`}<div id="mcDrawingStage" class="mc-drawing-stage"><canvas id="mcDrawingCanvas" aria-label="${esc(sheet.sheetNumber || `PDF page ${sheet.pageNumber}`)} ${esc(sheet.sheetTitle || 'drawing')}"></canvas></div>${drawingRotation || sheet.rotation ? '<p class="mc-drawing-note">Location highlights are available in the authoritative unrotated view.</p>' : ''}`}
      </main>
      <aside class="mc-drawing-evidence" aria-label="Construction Evidence">${drawingContextMarkup(pageContext)}${analysis.viewerFallback && !analysis.metadataAvailable ? '<h3>Construction Evidence</h3><p>Drawing analysis is unavailable. Manual PDF page viewing remains available.</p>' : `${sheetAnalysisMarkup({ shell, analysis, sheet, observation, groups: observationGroups, warnings: warningGroups })}${sheetLegends.length ? `<section><h4>Legend entries</h4><p>${fmt(sheetLegends.reduce((sum,item)=>sum+item.entries.length,0))} structured candidate entries. Legend graphics remain authoritative.</p></section>` : ''}${sheetSchedules.length ? `<section><h4>Schedules</h4><p>${fmt(sheetSchedules.reduce((sum,item)=>sum+item.rows.length,0))} structured candidate rows with source regions.</p></section>` : ''}${sheetKeyedNotes.length ? `<section><h4>Keyed notes</h4><p>${fmt(sheetKeyedNotes.length)} exact keyed-note link${sheetKeyedNotes.length === 1 ? '' : 's'}.</p></section>` : ''}${sheetOccurrences.length ? `<section><h4>Plan objects</h4><p>${fmt(sheetOccurrences.length)} candidate occurrence${sheetOccurrences.length === 1 ? '' : 's'}; confirmation is required before a definitive finding.</p><ol>${sheetOccurrences.slice(0,30).map(item => `<li><button data-drawing-occurrence="${esc(item.occurrenceId)}"><strong>${item.verification?.status === 'Confirmed' ? 'Confirmed plan object' : 'Candidate occurrence'}</strong><span>${esc(item.verification?.status || 'Unreviewed')}</span><em>Show on Plan</em></button>${shell === 'professional' ? `<div><button data-drawing-verify-occurrence="Confirmed" data-occurrence-id="${esc(item.occurrenceId)}">Confirm</button><button data-drawing-verify-occurrence="Uncertain" data-occurrence-id="${esc(item.occurrenceId)}">Uncertain</button><button data-drawing-verify-occurrence="Rejected" data-occurrence-id="${esc(item.occurrenceId)}">Reject</button></div>` : ''}</li>`).join('')}</ol></section>` : ''}`}</aside>
    </div>${drawingLifecycleUnavailable.length ? `<section class="mc-drawing-recovery-list" aria-label="Unavailable drawing lifecycle records"><h2>Drawing records requiring attention</h2>${drawingLifecycleUnavailable.map(drawingRecoveryMarkup).join('')}</section>` : ''}`;
  const placeholderCanvas = host.querySelector('#mcDrawingCanvas');
  const preserveCanvas = Boolean(preservedCanvas && placeholderCanvas && preservedCanvas.dataset.drawingDocument === selected.id);
  if (preserveCanvas) placeholderCanvas.replaceWith(preservedCanvas);
  if (preserveCanvas) portableDrawingCanvas = null;
  const nextStage = host.querySelector('#mcDrawingStage');
  if (nextStage && preserveCanvas) { nextStage.scrollLeft = preservedViewport.scrollLeft; nextStage.scrollTop = preservedViewport.scrollTop; }
  if (source && sheet) await paintDrawingPage(source, sheet, effectiveObservation || (effectiveRegion ? { observationId: drawingTarget?.observationId || '', region: effectiveRegion, kind: 'positioned-pdf-text', value: 'Selected region', verification: { status: 'Unreviewed' } } : null), overlayRecords);
  if (focusTarget && host.querySelector(`#${focusTarget}`)) {
    const focusTargetElement = host.querySelector(`#${focusTarget}`) || host.querySelector('.mc-drawing-sheet-title');
    if (focusTargetElement && !host.querySelector('.mc-drawing-sheet-title')?.matches(':focus')) {
      focusTargetElement.focus({ preventScroll: true });
    }
  }
}

async function renderMissionControlDashboard() {
  $('#missionControlContent').innerHTML = `
    <section class="mc-dashboard-shell" aria-labelledby="missionControlTitle">
      <header class="mc-dashboard-toolbar">
        <div>
          <span class="mc-dashboard-eyebrow">MISSION PMIS</span>
          <h1 id="missionControlTitle" tabindex="-1">Dashboard</h1>
        </div>
        <div class="mc-dashboard-actions">
          <button type="button" data-control-action="refresh-dashboard">Refresh Dashboard</button>
          <button type="button" data-control-action="open-dashboard-window">Open in New Window</button>
        </div>
      </header>
      <section class="mc-dashboard-surface" aria-label="Mission PMIS Dashboard">
        <div id="missionDashboardStatus" class="mc-dashboard-status" role="status" aria-live="polite">Loading Mission PMIS…</div>
        <iframe id="missionPmisDashboardFrame" class="mc-dashboard-frame" title="Mission PMIS Dashboard" src="${missionPmisDashboardUrl}" sandbox="allow-forms allow-popups allow-scripts allow-same-origin"></iframe>
      </section>
    </section>`;
  const frame = $('#missionPmisDashboardFrame');
  const status = $('#missionDashboardStatus');
  if (!frame || !status) return;
  let settled = false;
  const markReady = () => {
    if (settled) return;
    settled = true;
    status.classList.add('ready');
    status.textContent = 'Mission PMIS ready';
    frame.hidden = false;
  };
  const markUnavailable = () => {
    if (settled) return;
    settled = true;
    status.classList.remove('ready');
    status.classList.add('error');
    status.textContent = 'Mission PMIS is currently unavailable. Open in New Window to continue in the hosted app.';
    frame.hidden = true;
  };
  frame.addEventListener('load', () => markReady(), { once: true });
  frame.addEventListener('error', () => markUnavailable(), { once: true });
  window.setTimeout(() => {
    if (!settled) markUnavailable();
  }, 9000);
  frame.hidden = true;
}

async function renderMissionControlPlans() {
  $('#missionControlContent').innerHTML = '<section class="mc-drawing-control" aria-labelledby="missionControlTitle"><h1 id="missionControlTitle" tabindex="-1">Plans</h1><div id="missionDrawingViewer" class="mc-drawing-workspace"></div></section>';
  await renderDrawingWorkspace('mission-control');
}

async function renderMissionControl(prefetchedDocuments = null, prefetchedSections = null) {
  if (missionControlView === 'projects') {
    renderMyProjects();
    return;
  }
  if (missionControlView === 'chat' || missionControlView === 'history') {
    await renderChiefWorkspace({ historyVisible: missionControlView === 'history' });
    return;
  }
  if (missionControlView === 'library') { await renderMissionControlLibrary(); return; }
  if (missionControlView === 'inspections') { await renderMissionControlInspections(); return; }
  if (missionControlView === 'plans') { await renderMissionControlPlans(); return; }
  if (missionControlView === 'dashboard') { await renderMissionControlDashboard(); return; }
  await renderChiefWorkspace();
}

$('#openProfessionalWorkspace').onclick = () => switchExperience('professional-workspace', { destination: view });
$('[data-control-experience]')?.addEventListener('click', () => {
  void switchExperience('professional-workspace', { destination: view });
});
$('#returnMissionControl').onclick = () => switchExperience('mission-control');

function showMissionControlView(name = 'home') {
  if (!['plans', 'dashboard', 'home', 'history'].includes(name)) releaseDrawingSource();
  missionControlView = ['projects', 'chat', 'history', 'library', 'inspections', 'plans', 'dashboard', 'home'].includes(name) ? name : 'home';
  const homeButton = $('[data-control-home]');
  homeButton?.toggleAttribute('aria-current', missionControlView === 'home');
  $$('.mc-control-nav button[data-control-view]').forEach(button => {
    const active = button.dataset.controlView === missionControlView;
    button.toggleAttribute('aria-current', active);
  });
  return renderMissionControl().then(() => $('#missionControlTitle')?.focus());
}
$('[data-control-home]').onclick = () => showMissionControlView('home');
$$('[data-control-view]').forEach(button => button.onclick = () => showMissionControlView(button.dataset.controlView));
$('#missionControlContent').onclick = async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.actionTarget) {
    const actionTarget = resolveSharedActionTarget(button.dataset.actionTarget);
    if (!actionTarget) return;
    if (actionTarget.kind === 'drawing') {
      chiefConstructionContext = createChiefConstructionContext({ conversationId: engine.activeConversation()?.conversationId, projectId: actionTarget.projectId, planResult: activePlanQuery || {}, drawingTarget: createDrawingTarget({ projectId: actionTarget.projectId, documentId: actionTarget.documentId, drawingSetId: actionTarget.drawingSetId, drawingId: actionTarget.drawingId, sheetId: actionTarget.sheetId, pageNumber: actionTarget.pageNumber, observationId: actionTarget.observationId, region: actionTarget.region, origin: actionTarget.origin || 'assistant' }), workPackageReferences: { matchingSheetIds: drawingMatchingSheetIds, matchingObservationIds: activePlanQuery?.matchingObservationIds || [] }, updatedFrom: actionTarget.origin || 'shared-action' });
      await openProfessionalDestination({ view: 'drawings', documentId: actionTarget.documentId, projectId: actionTarget.projectId, sheetId: actionTarget.sheetId, pageNumber: actionTarget.pageNumber, observationId: actionTarget.observationId, region: actionTarget.region, origin: actionTarget.origin || 'assistant' });
      return;
    }
    if (actionTarget.kind === 'source') {
      await openProfessionalDestination({ view: actionTarget.destination || (actionTarget.sectionId ? 'knowledge' : 'sources'), documentId: actionTarget.documentId, projectId: actionTarget.projectId, sectionId: actionTarget.sectionId, messageId: actionTarget.messageId, origin: actionTarget.origin || 'assistant' });
      return;
    }
    if (actionTarget.kind === 'inspection') {
      selectedInspectionId = actionTarget.inspectionId || '';
      await openProfessionalDestination({ view: 'inspections', inspectionId: actionTarget.inspectionId || '' });
      return;
    }
    if (actionTarget.kind === 'evidence') {
      const message = engine.activeConversation()?.messages.find(item => item.id === actionTarget.messageId);
      if (message?.hits?.length) {
        const current = state();
        const documents = await engine.documents();
        const sections = await engine.sections();
        activeRetrievalSession = createRetrievalSession({ question: '', timestamp: message.createdAt, project: current.projects.find(item => item.id === current.activeProject), library: engine.libraries().find(item => item.id === current.activeLibrary), mode: message.mode, messageId: message.id, hits: message.hits, citations: message.citations || [], citationVerification: message.citationVerification, retrievalMeta: message.retrievalMeta, documents, libraries: engine.libraries(), sections });
        await openProfessionalDestination({ view: 'evidence' });
      }
      return;
    }
    if (actionTarget.kind === 'view') {
      await openProfessionalDestination({ view: actionTarget.destination || 'project' });
      return;
    }
  }
  if (button.dataset.workPackageSheet && activeWorkPackage) {
    const target = activeWorkPackage.viewerTargets.find(item => item.sheetId === button.dataset.workPackageSheet);
    if (target) { drawingTarget = createDrawingTarget(target); selectedWorkPackageItem = target.observationId || target.sheetId; if (missionControlView === 'chat') { await renderMissionControlChat(); $('#missionInlineDrawingViewer .mc-drawing-sheet-title')?.focus(); } else await showMissionControlView('plans'); }
    return;
  }
  if (button.hasAttribute('data-inline-full-drawing')) {
    await showMissionControlView('plans');
    $('#missionDrawingViewer .mc-drawing-sheet-title')?.focus();
    return;
  }
  if (button.dataset.drawingEmptyAction === 'chief') {
    await showMissionControlView('home');
    return;
  }
  if (button.dataset.drawingEmptyAction === 'import') {
    await openProfessionalDestination({ view: 'project' });
    return;
  }
  if (button.hasAttribute('data-work-package-current') && activeWorkPackage) {
    const target = currentWorkActivationTarget(activeWorkPackage);
    if (!target.available) { alert(target.reason); return; }
    const result = await activateEngineeringContext({ ...target.request, source: CONTEXT_ACTIVATION_SOURCES.constructionWorkPackage });
    if (!result.available) alert(result.reasons.join(' '));
    else await showMissionControlView('home');
    return;
  }
  if (button.hasAttribute('data-work-package-inspection') && activeWorkPackage) {
    await openProfessionalDestination({ view: 'inspections' });
    await openInspectionForm(null, inspectionPrefillFromWorkPackage(activeWorkPackage));
    return;
  }
  if (button.dataset.controlView) return showMissionControlView(button.dataset.controlView);
  if (button.dataset.controlAction === 'show-history') {
    chiefHistoryVisible = !chiefHistoryVisible;
    await renderChiefWorkspace({ historyVisible: chiefHistoryVisible });
    return;
  }
  if (button.dataset.controlAction === 'refresh-dashboard') {
    await showMissionControlView('dashboard');
    return;
  }
  if (button.dataset.controlAction === 'open-dashboard-window') {
    window.open(missionPmisDashboardUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (button.dataset.controlTarget) {
    const target = JSON.parse(button.dataset.controlTarget);
    if (target.view === 'chat') return showMissionControlView('chat');
    if (target.view === 'knowledge') return showMissionControlView('library');
    if (target.view === 'plans') return showMissionControlView('plans');
    return openProfessionalDestination(target);
  }
  if (button.dataset.controlDestination) return openProfessionalDestination({ view: button.dataset.controlDestination });
  if (button.dataset.controlProjectId) {
    await selectProjectThroughProductionPath(button.dataset.controlProjectId);
    missionControlView = 'home';
    await switchExperience('mission-control');
    return;
  }
  if (button.dataset.controlInspectionId) {
    selectedInspectionId = button.dataset.controlInspectionId;
    await openProfessionalDestination({ view: 'inspections', inspectionId: selectedInspectionId });
    return;
  }
  if (button.dataset.controlPrompt) {
    await showMissionControlView('home');
    $('#missionControlPrompt').value = button.dataset.controlPrompt;
    $('#missionControlPrompt').focus();
    return;
  }
  if (button.dataset.conversationId) {
    const conversation = engine.activateConversation(button.dataset.conversationId);
    if (conversation.projectId && conversation.projectId !== state().activeProject && state().projects.some(project => project.id === conversation.projectId)) {
      await selectProjectThroughProductionPath(conversation.projectId);
    }
    activeRetrievalSession = null;
    missionControlAttachments = [];
    chiefConstructionContext = null; activePlanQuery = null; activeWorkPackage = null; activeWorkPackageMessageId = ''; activeChiefLocationPresentation = null;
    await showMissionControlView('chat');
    $('#missionControlTitle')?.focus();
    return;
  }
  if (button.dataset.renameConversation) {
    const current = engine.conversations().find(item => item.conversationId === button.dataset.renameConversation);
    const title = prompt('Conversation name', current?.title || '');
    if (title !== null) { engine.renameConversation(button.dataset.renameConversation, title); renderConversationHistory(); }
    return;
  }
  if (button.dataset.removeAttachment) {
    engine.removeConversationAttachment(button.dataset.removeAttachment);
    await renderMissionControlChat();
    return;
  }
  if (button.dataset.controlSourceDocument) {
    selectedDoc = button.dataset.controlSourceDocument;
    sourceNavigationTarget = button.dataset.controlSourceSection ? createSourceTarget({ projectId: state().activeProject, documentId: selectedDoc, sectionId: button.dataset.controlSourceSection, originatingWorkspace: 'chat' }) : null;
    await openProfessionalDestination({ view: button.dataset.controlSourceSection ? 'knowledge' : 'sources', documentId: selectedDoc });
    return;
  }
  if (button.dataset.controlDrawingDocument) {
    drawingTarget = createDrawingTarget({ projectId: state().activeProject, documentId: button.dataset.controlDrawingDocument, pageNumber: Number(button.dataset.controlDrawingPage) });
    await showMissionControlView('plans');
    return;
  }
  if (button.dataset.controlEvidenceMessage) {
    const message = engine.activeConversation()?.messages.find(item => item.id === button.dataset.controlEvidenceMessage);
    if (message?.hits?.length) {
      const current = state();
      const documents = await engine.documents();
      const sections = await engine.sections();
      activeRetrievalSession = createRetrievalSession({ question: '', timestamp: message.createdAt, project: current.projects.find(item => item.id === current.activeProject), library: engine.libraries().find(item => item.id === current.activeLibrary), mode: message.mode, messageId: message.id, hits: message.hits, citations: message.citations || [], citationVerification: message.citationVerification, retrievalMeta: message.retrievalMeta, documents, libraries: engine.libraries(), sections });
      await openProfessionalDestination({ view: 'evidence' });
    }
    return;
  }
  const action = button.dataset.controlAction;
  if (action === 'new-conversation') {
    engine.createConversation({ projectId: missionControlProject()?.id || '' });
    activeRetrievalSession = null;
    chiefHistoryVisible = false;
    missionControlAttachments = [];
    activePlanQuery = null; activeWorkPackage = null; activeWorkPackageMessageId = ''; chiefConstructionContext = null; drawingMatchingSheetIds = []; selectedWorkPackageItem = ''; activeChiefLocationPresentation = null;
    await showMissionControlView('home');
    $('#missionControlPrompt')?.focus();
    return;
  }
  if (action === 'create-inspection') {
    await openProfessionalDestination({ view: 'inspections' });
    await openInspectionForm();
  } else if (action === 'demo-guide') {
    demoGuideDismissed = false;
    renderDemonstrationControls();
  } else if (action === 'load-demo') {
    $('#loadDemoProject').click();
  } else if (action === 'create-project') {
    $('#newProject').click();
  } else if (action === 'my-projects') {
    await showMissionControlView('projects');
  } else if (action === 'import-project') {
    $('#importProject').click();
  } else if (action === 'return-projects') {
    await returnFromDemonstrationProject();
  } else if (action === 'reset-demo') {
    $('#resetDemoProject').click();
  } else if (action?.startsWith('browse-')) {
    await openProfessionalDestination({ view: 'knowledge' });
    const query = ({ 'browse-drawings': 'Drawings', 'browse-specifications': 'Specifications', 'browse-rfis': 'RFIs', 'browse-submittals': 'Submittals' })[action];
    $('#documentFilter').value = query;
    renderKnowledgeWorkspace();
  }
};

$('#missionControlContent').addEventListener('submit', async event => {
  if (event.target.id !== 'missionControlComposer') return;
  event.preventDefault();
  const promptValue = $('#missionControlPrompt').value.trim();
  if (!promptValue || busy) return;
  const button = $('#missionControlSend');
  busy = true; button.disabled = true; button.textContent = 'Thinking…';
  setChiefState('busy');
  try {
    const current = state();
    const conversation = engine.activeConversation();
    const navigationIntent = classifyEngineeringNavigationIntent(promptValue);
    const [analyses, documents, sections] = await Promise.all([navigationIntent.kind === 'exact-drawing-navigation' ? currentGlobalDrawingRegistryAnalyses(promptValue) : currentDrawingAnalyses(), engine.documents(), engine.sections()]);
    const locationPresentation = buildChiefLocationPresentation(promptValue, { analyses, documents, sections, returnTarget: 'chief-answer', projectId: current.activeProject });
    activeChiefLocationPresentation = locationPresentation && locationPresentation.status !== 'none' ? locationPresentation : null;
    const resolvedLocationTarget = locationPresentation.status === 'resolved' && locationPresentation.target?.kind === 'drawing'
      ? createDrawingTarget({ projectId: locationPresentation.target.projectId, documentId: locationPresentation.target.documentId, drawingSetId: locationPresentation.target.drawingSetId, drawingId: locationPresentation.target.drawingId, sheetId: locationPresentation.target.sheetId, pageNumber: locationPresentation.target.pageNumber, observationId: locationPresentation.target.observationId, region: locationPresentation.target.region, origin: 'engineering-locator', returnTarget: 'chief-answer' })
      : null;
    if (navigationIntent.exact) {
      logger.info('Drawing registry runtime inspection', latestDrawingRegistryInspection || { activeProjectId: current.activeProject, query: promptValue, commandIntent: navigationIntent, diagnosticStatus: navigationIntent.kind === 'exact-drawing-navigation' ? 'registry-inspection-unavailable' : 'not-a-drawing-command' });
      latestDrawingRegistryInspection = null;
      if (!engine.activeConversation()) engine.createConversation({ projectId: resolvedLocationTarget?.projectId || current.activeProject });
      engine.appendConversationMessage({ role: 'user', content: promptValue });
      engine.appendConversationMessage({ role: 'assistant', content: locationPresentation.status === 'resolved' ? `Located ${locationPresentation.summary.replace(/^Located\s+/i, '')}` : locationPresentation.status === 'ambiguous' ? locationPresentation.summary : `No exact registered ${navigationIntent.kind === 'exact-drawing-navigation' ? 'drawing' : 'specification'} matched that command.`, navigationTarget: locationPresentation.target || null });
      if (resolvedLocationTarget) {
        if (resolvedLocationTarget.projectId && resolvedLocationTarget.projectId !== current.activeProject) await selectProjectThroughProductionPath(resolvedLocationTarget.projectId);
        const targetAnalysis = analyses.find(item => item.drawingSetId === resolvedLocationTarget.drawingSetId || item.documentId === resolvedLocationTarget.documentId);
        drawingWorkspace.setPages(targetAnalysis?.sheets || []);
        const workspaceResolution = drawingWorkspace.open(resolvedLocationTarget, drawingTarget?.pageNumber);
        drawingTarget = createDrawingTarget({ ...resolvedLocationTarget, pageNumber: workspaceResolution.pageNumber || resolvedLocationTarget.pageNumber });
        pendingDrawingContext = resolvedLocationTarget;
        drawingMatchingSheetIds = [resolvedLocationTarget.sheetId];
        setChiefState('success');
        await showMissionControlView('plans');
      } else if (locationPresentation.status === 'resolved' && locationPresentation.mode === 'specification') {
        setChiefState('success');
        await openProfessionalDestination({ ...locationPresentation.target, view: 'knowledge' });
      } else {
        setChiefState(locationPresentation.status === 'ambiguous' ? 'success' : 'error');
        await renderChiefWorkspace({ historyVisible: chiefHistoryVisible });
      }
      return;
    }
    if (resolvedLocationTarget) pendingDrawingContext = resolvedLocationTarget;
    const construction = await buildActiveConstructionPackage(promptValue);
    const drawingScope = construction ? buildPlanQueryScope(construction.planResult, construction.sections, construction.analyses) : null;
    const exactDrawingContext = construction?.planResult.viewerTarget || pendingDrawingContext || resolvedLocationTarget;
    let pendingScope = null;
    if (!construction && exactDrawingContext) {
      const sections = await engine.sections();
      const analyses = await currentDrawingAnalyses();
      pendingScope = buildPlanQueryScope({ viewerTarget: exactDrawingContext, matchingSheetIds: [exactDrawingContext.sheetId] }, sections, analyses);
    }
    const message = await engine.ask(promptValue, $('#missionControlMode')?.value || current.settings.mode, exactDrawingContext ? {
      ...(drawingScope || pendingScope),
      routingDocumentIds: construction?.planResult?.routingProfile?.documentIds || [],
      drawingContext: exactDrawingContext,
      workPackageReferences: { matchingSheetIds: construction?.planResult.matchingSheetIds || [exactDrawingContext.sheetId], matchingObservationIds: construction?.planResult.matchingObservationIds || [exactDrawingContext.observationId].filter(Boolean) }
    } : { documentIds: conversation?.attachmentDocumentIds || [] });
    const project = current.projects.find(item => item.id === current.activeProject);
    const libraries = engine.libraries();
    activeRetrievalSession = createRetrievalSession({ question: promptValue, timestamp: message.createdAt, project, library: libraries.find(item => item.id === current.activeLibrary), mode: message.mode, messageId: message.id, hits: message.hits, citations: message.citations, citationVerification: message.citationVerification, retrievalMeta: message.retrievalMeta, documents, libraries, sections });
    if (construction) {
      const completed = await buildActiveConstructionPackage(promptValue, activeRetrievalSession.evidence);
      activePlanQuery = completed.planResult;
      activeWorkPackage = completed.workPackage;
      activeWorkPackageMessageId = message.id;
      drawingMatchingSheetIds = [...activePlanQuery.matchingSheetIds];
      drawingTarget = activePlanQuery.viewerTarget;
      chiefConstructionContext = createChiefConstructionContext({ conversationId: conversation?.conversationId, projectId: current.activeProject, planResult: activePlanQuery, drawingTarget, workPackageReferences: message.workPackageReferences, updatedFrom: 'chief-response' });
    }
    pendingDrawingContext = null;
    setChiefState('success');
    await renderChiefWorkspace({ historyVisible: chiefHistoryVisible });
    $('.mc-control-messages')?.scrollTo({ top: $('.mc-control-messages').scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  } catch (error) { setChiefState('error'); alert(error.message); }
  finally { busy = false; if ($('#missionControlSend')) { $('#missionControlSend').disabled = false; $('#missionControlSend').textContent = 'Ask Chief'; } }
});

async function ingestMissionControlFiles(files) {
  if (!files.length) return;
  if (!missionControlProject()) { alert('Open a project before attaching documents.'); return; }
  const unsupported = files.filter(file => /\.(png|jpe?g|gif|webp|heic)$/i.test(file.name));
  if (unsupported.length) { alert('Image review is not supported yet. Attach PDF, DOCX, spreadsheet, text, or supported structured-text files.'); return; }
  missionControlAttachments = files.map(file => ({ name: file.name, status: 'processing' }));
  await renderMissionControlChat();
  try {
    const result = await engine.ingest(files, () => {}, state().activeLibrary);
    for (const document of result.documents.filter(item => item.status === 'verified')) engine.addConversationAttachment(document.id);
    missionControlAttachments = result.documents.filter(item => item.status !== 'verified').map(item => ({ name: item.name, status: 'failed', error: item.error || 'Import failed' }));
  } catch (error) { missionControlAttachments = files.map(file => ({ name: file.name, status: 'failed', error: error.message })); }
  await renderMissionControlChat();
}

$('#missionControlContent').addEventListener('change', event => {
  if (event.target.id === 'missionControlFiles') void ingestMissionControlFiles([...event.target.files]);
  if (event.target.id === 'missionControlLibraryFiles') void ingestMissionControlFiles([...event.target.files]).then(() => renderMissionControlLibrary());
});

app.addEventListener('input', event => {
  if (event.target.id !== 'mcDrawingSearch') return;
  drawingFilter = event.target.value;
  void updateDrawingSearchResults();
});

app.addEventListener('keydown', event => {
  if (event.target.id !== 'mcDrawingSearch' || !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Enter', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  const buttons = $$('#mcDrawingResults button');
  const action = drawingResultKeyTarget(event.key, { sheetIds: drawingMatchingSheetIds, activeIndex: drawingSearchActiveIndex });
  if (action.clear) {
    if (drawingFilter) { drawingFilter = ''; event.target.value = ''; void updateDrawingSearchResults(); }
    else event.target.blur();
    return;
  }
  drawingSearchActiveIndex = action.index;
  buttons.forEach((button, index) => { button.classList.toggle('keyboard-active', index === action.index); button.toggleAttribute('aria-current', index === action.index); });
  buttons[action.index]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  if (action.activate) buttons[action.index]?.click();
});

app.addEventListener('change', async event => {
  const shell = experience === 'mission-control' ? 'mission-control' : 'professional';
  if (event.target.id === 'mcDrawingDocument') {
    drawingTarget = createDrawingTarget({ projectId: state().activeProject, documentId: event.target.value });
    drawingFilter = ''; drawingDiscipline = 'all'; drawingType = 'all'; drawingSearchActiveIndex = -1; drawingZoom = null; drawingRotation = 0;
    await renderDrawingWorkspace(shell);
  }
  if (event.target.id === 'mcDrawingDiscipline') {
    drawingDiscipline = event.target.value;
    await updateDrawingSearchResults();
  }
  if (event.target.id === 'mcDrawingType') {
    drawingType = event.target.value;
    await updateDrawingSearchResults();
  }
  if (event.target.dataset.drawingOverlay) {
    const layer = event.target.dataset.drawingOverlay;
    const current = { ...defaultDrawingViewport(), ...drawingViewerEngine.getViewport(drawingTarget?.pageNumber) };
    captureDrawingViewport({ overlays: { ...current.overlays, [layer]: event.target.checked } });
    $$(`[data-overlay-layer="${layer}"]`).forEach(item => { item.hidden = !event.target.checked; });
  }
  if (event.target.id === 'mcDrawingReattach' && event.target.files?.[0]) {
    const documentId = drawingTarget?.documentId || (await engine.documents()).find(isPdfDocument)?.id;
    try {
      const result = await engine.reattachPdfSource(documentId, event.target.files[0]);
      if (!result.ok) { drawingLifecycleUnavailable = [result]; await renderDrawingWorkspace(shell); return; }
      releaseDrawingSource();
      drawingTarget = createDrawingTarget({ projectId: state().activeProject, documentId, drawingSetId: result.drawingSetId, pageNumber: 1 });
      await renderDrawingWorkspace(shell);
    } catch (error) { alert(error.message); }
  }
});

app.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || !button.closest('.mc-drawing-workspace')) return;
  const shell = experience === 'mission-control' ? 'mission-control' : 'professional';
  const pageSelectionRequest = button.dataset.drawingSheet || button.hasAttribute('data-drawing-previous') || button.hasAttribute('data-drawing-next') ? ++drawingPageSelectionRequest : 0;
  const persistedAnalysis = drawingTarget?.documentId ? await engine.drawingAnalysis(drawingTarget.documentId) : null;
  if (pageSelectionRequest && pageSelectionRequest !== drawingPageSelectionRequest) return;
  const analysis = activeDrawingViewerAnalysis?.documentId === drawingTarget?.documentId ? activeDrawingViewerAnalysis : persistedAnalysis;
  if (button.dataset.drawingRecoveryAction) {
    const recoveryAction = button.dataset.drawingRecoveryAction;
    if (recoveryAction === 'open-owning-project' && button.dataset.owningProjectId && state().projects.some(item => item.id === button.dataset.owningProjectId)) {
      engine.setProject(button.dataset.owningProjectId);
      drawingTarget = button.dataset.drawingDocumentId ? createDrawingTarget({ projectId: button.dataset.owningProjectId, documentId: button.dataset.drawingDocumentId, drawingSetId: button.dataset.drawingSetId }) : null;
      await renderDrawingWorkspace(shell); return;
    }
    if (recoveryAction === 'return-to-drawing-sets') { drawingTarget = null; drawingFilter = ''; drawingDiscipline = 'all'; drawingType = 'all'; await renderDrawingWorkspace(shell); return; }
    if (recoveryAction === 'retry-analysis-upgrade') {
      drawingUpgradeFailures.delete(drawingUpgradeKey({ drawingSetId: button.dataset.drawingSetId, documentId: button.dataset.drawingDocumentId }, DRAWING_ANALYSIS_VERSION));
      await renderDrawingWorkspace(shell); return;
    }
    if (recoveryAction === 'remove-stale-analysis') {
      if (!confirm('Remove this stale drawing analysis? The source document and other project records will not be deleted.')) return;
      await engine.removeDrawingAnalysis(button.dataset.drawingSetId); drawingTarget = null; await renderDrawingWorkspace(shell); return;
    }
    if (recoveryAction === 'reattach-original-pdf') {
      const picker = document.createElement('input'); picker.type = 'file'; picker.accept = 'application/pdf,.pdf';
      picker.onchange = async () => { const result = await engine.reattachPdfSource(button.dataset.drawingDocumentId, picker.files?.[0]); if (!result.ok) alert(result.warning); else { drawingUpgradeFailures.clear(); drawingTarget = createDrawingTarget({ projectId: result.projectId, documentId: result.documentId, drawingSetId: result.drawingSetId, pageNumber: 1 }); await renderDrawingWorkspace(shell); } };
      picker.click(); return;
    }
    if (recoveryAction === 'reimport-drawing') { $('#files')?.click(); return; }
    if (recoveryAction === 'view-technical-details') { const details = button.closest('.mc-drawing-recovery')?.querySelector('details'); if (details) details.open = true; return; }
  }
  if (button.hasAttribute('data-drawing-return')) {
    await showMissionControlView('home');
    return;
  }
  if (button.hasAttribute('data-drawing-edit-metadata') && analysis && drawingTarget?.pageNumber) {
    const sheet = analysis.sheets.find(item => item.pageNumber === drawingTarget.pageNumber);
    if (!sheet) return;
    const action = prompt('Catalog action: Apply, Reset to Parser, Compare, or Restore Defaults', 'Apply')?.trim().toLowerCase();
    if (!action) return;
    if (action.startsWith('compare')) {
      const rows = drawingCatalog.compare(analysis.documentId, sheet.pageNumber);
      alert(rows.map(item => `${item.field}\nParser: ${item.parserValue}\nCatalog: ${item.catalogValue}\nChosen: ${item.chosenValue}\nReason: ${item.reason}`).join('\n\n') || 'No catalog comparison is available.');
      return;
    }
    if (action.startsWith('reset')) { drawingCatalog.resetToParser(analysis.documentId, sheet.pageNumber); await renderDrawingWorkspace(shell); return; }
    if (action.startsWith('restore')) { drawingCatalog.restoreDefaults(analysis.documentId, sheet.pageNumber); await renderDrawingWorkspace(shell); return; }
    if (!action.startsWith('apply')) return;
    const sheetNumber = prompt('Sheet number', sheet.sheetNumber || '')?.trim();
    if (sheetNumber === undefined) return;
    const sheetTitle = prompt('Sheet title', sheet.sheetTitle || '')?.trim();
    if (sheetTitle === undefined) return;
    const discipline = prompt('Discipline', sheet.discipline || 'Unknown')?.trim();
    if (discipline === undefined) return;
    const drawingType = prompt('Drawing type', sheet.primarySheetType || sheet.sheetTypes?.[0] || 'Unknown')?.trim();
    if (drawingType === undefined) return;
    drawingCatalog.applyToCatalog(analysis.documentId, sheet.pageNumber, { sheetNumber, sheetTitle, discipline, drawingType }, { projectId: analysis.projectId, drawingSetId: analysis.drawingSetId }, 'manual');
    await renderDrawingWorkspace(shell); return;
  }
  if (button.dataset.drawingSheet && analysis) {
    captureDrawingViewport();
    const sheet = analysis.sheets.find(item => button.dataset.drawingPageId && item.pageId === button.dataset.drawingPageId) || analysis.sheets.find(item => item.sheetId === button.dataset.drawingSheet);
    if (!sheet) return;
    const observation = button.dataset.drawingSearchObservation ? analysis.observations.find(item => item.observationId === button.dataset.drawingSearchObservation) : null;
    drawingViewerEngine.selectPage(sheet.pageNumber);
    drawingTarget = createDrawingTarget({ projectId: analysis.projectId, documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, pageId: sheet.pageId, drawingId: sheet.drawingId || '', sheetId: sheet.sheetId, pageNumber: sheet.pageNumber, observationId: observation?.observationId, region: observation?.region });
    await renderDrawingWorkspace(shell); return;
  }
  if (button.hasAttribute('data-drawing-reanalyze') && analysis && shell === 'professional') {
    if (!confirm('Reanalyze this drawing set from its retained positioned text? Source PDF bytes and exact page identities will be preserved.')) return;
    const rebuilt = reanalyzeDrawingAnalysis(analysis);
    const saved = await engine.saveDrawingAnalysis(rebuilt);
    if (!saved.ok) { drawingLifecycleUnavailable = [saved]; await renderDrawingWorkspace(shell); return; }
    drawingTarget = createDrawingTarget({ ...drawingTarget, projectId: rebuilt.projectId, documentId: rebuilt.documentId, drawingSetId: rebuilt.drawingSetId });
    await renderDrawingWorkspace(shell); return;
  }
  if (button.dataset.drawingObservation && analysis) {
    captureDrawingViewport();
    const observation = analysis.observations.find(item => item.observationId === button.dataset.drawingObservation);
    const sheet = analysis.sheets.find(item => item.sheetId === observation?.sheetId);
    if (observation && sheet) drawingTarget = createDrawingTarget({ projectId: analysis.projectId, documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, drawingId: sheet.drawingId, sheetId: sheet.sheetId, pageNumber: sheet.pageNumber, observationId: observation.observationId, region: observation.region });
    await renderDrawingWorkspace(shell); return;
  }
  if (button.dataset.drawingVerify && analysis) {
    const selectedObservation = analysis.observations.find(item => item.observationId === button.dataset.observationId);
    let correctedValue = '';
    if (button.dataset.drawingVerify === 'Corrected') {
      correctedValue = prompt('Corrected observed value', selectedObservation?.verification?.correctedValue || selectedObservation?.originalValue || '')?.trim() || '';
      if (!correctedValue) return;
    }
    const observations = analysis.observations.map(item => item.observationId === button.dataset.observationId ? applyObservationVerification(item, { status: button.dataset.drawingVerify, correctedValue, verifiedAt: new Date().toISOString() }) : item);
    const saved = await engine.saveDrawingAnalysis({ ...analysis, observations });
    if (!saved.ok) { drawingLifecycleUnavailable = [saved]; await renderDrawingWorkspace(shell); return; }
    await renderDrawingWorkspace(shell); return;
  }
  if (button.dataset.drawingOccurrence && analysis) {
    const occurrence = (analysis.candidateOccurrences || []).find(item => item.occurrenceId === button.dataset.drawingOccurrence);
    if (occurrence) {
      const occurrenceSheet = analysis.sheets.find(item => item.sheetId === occurrence.sheetId);
      drawingTarget = createDrawingTarget({ projectId: analysis.projectId, documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, drawingId: occurrenceSheet?.drawingId, sheetId: occurrence.sheetId, pageNumber: occurrence.pageNumber, region: occurrence.region });
      await renderDrawingWorkspace(shell);
    }
    return;
  }
  if (button.dataset.drawingVerifyOccurrence && analysis && shell === 'professional') {
    const state = button.dataset.drawingVerifyOccurrence;
    const candidateOccurrences = (analysis.candidateOccurrences || []).map(item => item.occurrenceId === button.dataset.occurrenceId ? { ...item, verification: { status: state, correctedValue: '', verifiedAt: new Date().toISOString() } } : item);
    const saved = await engine.saveDrawingAnalysis({ ...analysis, candidateOccurrences });
    if (!saved.ok) drawingLifecycleUnavailable = [saved];
    await renderDrawingWorkspace(shell); return;
  }
  if (button.hasAttribute('data-drawing-analyze-page') && analysis && shell === 'professional') {
    const sheet = analysis.sheets.find(item => item.sheetId === drawingTarget?.sheetId);
    const source = await engine.sourceFile(analysis.documentId);
    if (!sheet || !source) { alert('The authoritative PDF is unavailable for selected-page analysis.'); return; }
    if (!activeDrawingPdf || activeDrawingDocumentId !== source.documentId) { releaseDrawingSource(); activeDrawingPdf = await openPdfBlob(source.sourceBlob); activeDrawingDocumentId = source.documentId; activeDrawingSourceRecord = source; }
    const graphics = await readPdfPageGraphics(activeDrawingPdf, sheet.pageNumber, { maxOperations: 12000 });
    if (!graphics.supported || graphics.status === 'cancelled') { alert(graphics.warnings?.[0] || 'This page does not expose supported deterministic graphics.'); return; }
    let legends = analysis.legends || [];
    let candidateOccurrences = analysis.candidateOccurrences || [];
    if (sheet.sheetTypes.includes('Symbols and Abbreviations') || sheet.sheetTypes.includes('General Notes')) {
      const replacements = extractLegendCandidates({ documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, sheet: { ...sheet, drawingSetId: analysis.drawingSetId }, primitives: graphics.primitives });
      legends = [...legends.filter(item => item.sheetId !== sheet.sheetId), ...replacements];
    } else {
      const target = { ...sheet, drawingSetId: analysis.drawingSetId };
      const replacements = legends.flatMap(legend => matchLegendOccurrences({ legend, targetSheet: target, primitives: graphics.primitives }));
      candidateOccurrences = [...candidateOccurrences.filter(item => item.sheetId !== sheet.sheetId), ...replacements];
    }
    const saved = await engine.saveDrawingAnalysis({ ...analysis, legends, candidateOccurrences, graphicsDiagnostics: { ...(analysis.graphicsDiagnostics || {}), [sheet.sheetId]: { status: graphics.status, operationCount: graphics.operationCount, primitiveCount: graphics.primitives.length, warnings: graphics.warnings } } });
    if (!saved.ok) { drawingLifecycleUnavailable = [saved]; await renderDrawingWorkspace(shell); return; }
    await renderDrawingWorkspace(shell); return;
  }
  const currentIndex = analysis?.sheets.findIndex(item => item.sheetId === drawingTarget?.sheetId) ?? -1;
  if ((button.hasAttribute('data-drawing-previous') || button.hasAttribute('data-drawing-next')) && analysis) {
    captureDrawingViewport();
    const offset = button.hasAttribute('data-drawing-next') ? 1 : -1;
    const matchingTarget = drawingMatchingSheetIds.length ? drawingMatchingSetTarget(drawingMatchingSheetIds, drawingTarget?.sheetId, offset, analysis) : null;
    const next = analysis.sheets[currentIndex + offset];
    if (matchingTarget) { drawingViewerEngine.selectPage(matchingTarget.pageNumber); drawingTarget = matchingTarget; }
    else if (next) { drawingViewerEngine.selectPage(next.pageNumber); drawingTarget = createDrawingTarget({ projectId: analysis.projectId, documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, drawingId: next.drawingId, sheetId: next.sheetId, pageNumber: next.pageNumber }); }
    await renderDrawingWorkspace(shell); return;
  }
  if (button.dataset.drawingZoom) {
    drawingZoom = Math.max(.35, Math.min(3, drawingZoom + (button.dataset.drawingZoom === 'in' ? .2 : -.2)));
    captureDrawingViewport({ mode: 'custom', zoom: drawingZoom });
    await renderDrawingWorkspace(shell); return;
  }
  if (button.dataset.drawingFit && analysis) {
    drawingZoom = null;
    captureDrawingViewport({ mode: button.dataset.drawingFit === 'width' ? 'fit-width' : 'fit-page', zoom: null, scrollLeft: 0, scrollTop: 0 });
    await renderDrawingWorkspace(shell); return;
  }
  if (button.hasAttribute('data-drawing-rotate')) { drawingRotation = (drawingRotation + 90) % 360; captureDrawingViewport({ rotation: drawingRotation, mode: 'custom' }); await renderDrawingWorkspace(shell); return; }
  if (button.hasAttribute('data-drawing-reset-view')) { drawingZoom = null; drawingRotation = 0; captureDrawingViewport({ ...defaultDrawingViewport() }); await renderDrawingWorkspace(shell); return; }
  if (button.dataset.drawingLayout) {
    if (button.dataset.drawingLayout === 'expand') drawingWorkspaceBeforeExpand = { ...drawingWorkspacePanels };
    drawingWorkspacePanels = button.dataset.drawingLayout === 'restore' && drawingWorkspaceBeforeExpand
      ? { ...drawingWorkspaceBeforeExpand, expanded: false }
      : drawingWorkspaceLayout(drawingWorkspacePanels, button.dataset.drawingLayout);
    if (button.dataset.drawingLayout === 'restore') drawingWorkspaceBeforeExpand = null;
    const layout = button.closest('.mc-drawing-layout');
    layout?.classList.toggle('finder-hidden', drawingWorkspacePanels.finderHidden);
    layout?.classList.toggle('evidence-hidden', drawingWorkspacePanels.evidenceHidden);
    layout?.classList.toggle('drawing-expanded', drawingWorkspacePanels.expanded);
    button.textContent = button.dataset.drawingLayout === 'expand' ? 'Restore Workspace' : button.dataset.drawingLayout === 'restore' ? 'Expand Drawing' : button.dataset.drawingLayout === 'toggle-finder' ? `${drawingWorkspacePanels.finderHidden ? 'Show' : 'Hide'} Sheet Finder` : `${drawingWorkspacePanels.evidenceHidden ? 'Show' : 'Hide'} Construction Evidence`;
    button.dataset.drawingLayout = button.dataset.drawingLayout === 'expand' ? 'restore' : button.dataset.drawingLayout === 'restore' ? 'expand' : button.dataset.drawingLayout;
    return;
  }
  if (button.hasAttribute('data-drawing-clear-search')) { drawingFilter = ''; const input = $('#mcDrawingSearch'); if (input) { input.value = ''; input.focus(); } await updateDrawingSearchResults(); return; }
  if (button.hasAttribute('data-drawing-source')) { selectedDoc = drawingTarget?.documentId; sourceNavigationTarget = createSourceTarget({ projectId: state().activeProject, documentId: selectedDoc, pageNumber: drawingTarget?.pageNumber, sheetId: drawingTarget?.sheetId, region: drawingTarget?.region, observationId: drawingTarget?.observationId, originatingWorkspace: 'drawings' }); await openProfessionalDestination({ view: 'sources', documentId: selectedDoc }); return; }
  if (button.hasAttribute('data-drawing-current-work')) { const result = await activateSelectedWorkspaceDocument(CONTEXT_ACTIVATION_SOURCES.constructionWorkPackage, drawingTarget?.documentId); if (!result?.available) alert(result?.reasons?.join(' ') || 'This drawing cannot establish exact Current Work.'); else if (shell === 'professional') show('engineering'); else await showMissionControlView('home'); return; }
  if (button.hasAttribute('data-drawing-inspection')) { const sheet = analysis?.sheets.find(item => item.sheetId === drawingTarget?.sheetId); selectedDoc = drawingTarget?.documentId || selectedDoc; await openInspectionForm(null, { projectId: state().activeProject, discipline: sheet?.discipline || '', sourceDocumentIds: [drawingTarget?.documentId].filter(Boolean), relatedDrawingIds: [drawingTarget?.documentId].filter(Boolean), sourceSectionIds: [], evidenceReferences: [] }); return; }
  if (button.hasAttribute('data-drawing-ask')) { const sheet = analysis?.sheets.find(item => item.sheetId === drawingTarget?.sheetId); pendingDrawingContext = createDrawingTarget({ ...drawingTarget, projectId: state().activeProject, documentId: analysis?.documentId, drawingSetId: analysis?.drawingSetId, sheetNumber: sheet?.sheetNumber, origin: 'ask-about-sheet' }); await showMissionControlView('home'); $('#missionControlPrompt').value = `What exact indexed information is available for sheet ${sheet?.sheetNumber || `page ${drawingTarget?.pageNumber}`}?`; $('#missionControlPrompt').focus(); }
});

const activationTimestamp = () => new Date().toISOString();

function activationOrigin(source) {
  if (source.includes('Evidence')) return 'evidence';
  if (source.includes('Relationship')) return 'relationships';
  if (source.includes('Version')) return 'versions';
  if (source.includes('Revision')) return 'revisions';
  if (source.includes('Source Inspector')) return 'sources';
  if (source.includes('Workflow')) return 'workflow';
  if (source.includes('Command Desk')) return 'chat';
  if (source.includes('Inspection Record')) return 'inspections';
  if (source.includes('Construction Work Package')) return 'engineering';
  return 'knowledge';
}

async function contextActivationRecords() {
  const currentState = state();
  const documents = await engine.documents();
  const sections = await engine.sections();
  const relationships = buildKnowledgeRelationships({ documents, sections });
  const lineage = buildDocumentLineage({ documents, sections });
  const revisions = buildRevisionMetrics({ documents, sections }).comparisons.map(comparison => ({
    revisionId: `${comparison.earlierDocument.id}->${comparison.laterDocument.id}`,
    comparison
  }));
  return {
    currentState,
    documents,
    sections,
    records: {
      projects: currentState.projects,
      libraries: currentState.libraries,
      documents,
      sections,
      evidence: activeRetrievalSession?.evidence || [],
      relationships: [
        ...relationships.membership,
        ...relationships.hierarchy,
        ...relationships.explicitReferences,
        ...relationships.reverseReferences,
        ...relationships.documentReferences,
        ...relationships.sameDivision,
        ...relationships.sameLibrary
      ],
      lineages: lineage.chains.map(chain => ({ lineageId: chain.lineageId })),
      revisions
    }
  };
}

async function activateSelectedWorkspaceDocument(source, documentId = selectedDoc, sectionId = '', relationshipId = '') {
  const documents = await engine.documents();
  const document = documents.find(item => item.id === documentId);
  if (!document) return null;
  return activateEngineeringContext({
    projectId: state().activeProject,
    libraryId: document.libraryId,
    documentId: document.id,
    sectionId,
    relationshipId,
    lineageId: source === CONTEXT_ACTIVATION_SOURCES.versionDocument ? document.lineageId : '',
    source
  });
}

async function activateEngineeringContext(request) {
  const snapshot = await contextActivationRecords();
  const result = createContextActivation({
    ...request,
    activatedAt: request.activatedAt || activationTimestamp()
  }, snapshot.records);
  if (!result.available) {
    if (Object.values(CONTEXT_ACTIVATION_SOURCES).includes(request.source)) clearActiveContext(request.source, request.projectId || state().activeProject);
    return result;
  }
  const previousKey = activeContextActivation
    ? `${activeContextActivation.projectId}:${activeContextActivation.documentId}:${activeContextActivation.sectionId}`
    : '';
  const next = result.activation;
  const nextKey = `${next.projectId}:${next.documentId}:${next.sectionId}`;
  const context = createEngineeringContext({
    ...next,
    projects: snapshot.currentState.projects,
    documents: snapshot.documents,
    sections: snapshot.sections,
    retrievalSession: activeRetrievalSession
  });
  if (!context) {
    clearActiveContext(request.source, request.projectId);
    return { ...result, available: false, activation: null, transition: 'cleared', reasons: ['Validated activation could not seed Engineering Context.'] };
  }
  if (previousKey && previousKey !== nextKey) clearWorkflowWorkspace();
  activeContextActivation = next;
  contextClearedEvent = null;
  engineeringTarget = { ...next, origin: activationOrigin(next.source) };
  startInspectionSession(context, { source: next.source });
  publishContextSynchronization(context, snapshot.documents, snapshot.sections);
  return result;
}

function clearActiveContext(source, projectId = state().activeProject) {
  activeContextActivation = null;
  contextClearedEvent = createContextClearedEvent({ projectId, source, activatedAt: activationTimestamp() });
  engineeringTarget = null;
  clearInspectionSession();
  clearWorkflowWorkspace();
  contextBusSnapshot = createContextBusSnapshot();
  void renderContextBusBanner(view);
}

function publishContextSynchronization(context, documents, sections) {
  const revisionIds = buildRevisionMetrics({ documents, sections }).comparisons
    .filter(comparison => comparison.comparable && [comparison.earlierDocument.id, comparison.laterDocument.id].some(id => context.versionIds.includes(id)))
    .map(comparison => `${comparison.earlierDocument.id}->${comparison.laterDocument.id}`);
  contextBusSnapshot = createContextBusSnapshot({ engineeringContext: context, activation: activeContextActivation, documents, revisionIds });
  const reference = contextBusSnapshot.context;
  if (!reference) return;
  selectedDoc = reference.documentId;
  if (reference.evidenceId) selectedEvidenceId = reference.evidenceId;
  sourceNavigationTarget = createSourceTarget({
    projectId: reference.projectId, libraryId: reference.libraryId,
    documentId: reference.documentId, sectionId: reference.sectionId,
    evidenceId: reference.evidenceId, originatingWorkspace: activationOrigin(reference.activationSource),
    originatingMessageId: activeRetrievalSession?.messageId || '', destination: 'sources'
  });
  relationshipTarget = {
    ...relationshipNavigationTarget({ documentId: reference.documentId, sectionId: reference.sectionId }),
    projectId: reference.projectId, libraryId: reference.libraryId,
    originatingWorkspace: activationOrigin(reference.activationSource)
  };
  lineageTarget = { ...lineageNavigationTarget(reference.documentId), originatingWorkspace: activationOrigin(reference.activationSource) };
  if (reference.revisionIds.length) {
    const [earlierDocumentId, laterDocumentId] = reference.revisionIds[0].split('->');
    revisionTarget = revisionNavigationTarget(earlierDocumentId, laterDocumentId, { originatingWorkspace: activationOrigin(reference.activationSource) });
  } else revisionTarget = null;
  if (contextBusSnapshot.workflow.status === 'selected') {
    workflowTarget = workflowNavigationTarget({ workflowType: contextBusSnapshot.workflow.workflowType, origin: activationOrigin(reference.activationSource) });
  } else {
    workflowTarget = null;
    clearWorkflowSession();
  }
  void renderContextBusBanner(view);
}

async function renderContextBusBanner(workspace) {
  const synchronizedViews = new Set(['chat','engineering','workflow','sources','drawings','relationships','versions','revisions','evidence','evaluate']);
  if (!synchronizedViews.has(workspace)) return;
  const container = document.getElementById(workspace);
  container?.querySelector('[data-context-bus-banner]')?.remove();
  if (!container) return;
  const reference = contextBusSnapshot.context;
  if (!reference) {
    container.insertAdjacentHTML('afterbegin', '<div class="mc-context-bus-banner unavailable" data-context-bus-banner role="status"><strong>No construction context selected</strong><span>Ask Chief a construction question or open an exact drawing, specification, or project record to synchronize this workspace.</span></div>');
    return;
  }
  const documents = await engine.documents();
  const sections = await engine.sections();
  if (contextBusSnapshot.context !== reference || !container.isConnected) return;
  const project = state().projects.find(item => item.id === reference.projectId);
  const library = engine.libraries().find(item => item.id === reference.libraryId);
  const documentRecord = documents.find(item => item.id === reference.documentId);
  const section = sections.find(item => item.id === reference.sectionId && item.documentId === reference.documentId);
  const workflow = contextBusSnapshot.workflow.status === 'ambiguous' ? 'Select Workflow' : contextBusSnapshot.workflow.workflowType || 'Unavailable';
  container.querySelector('[data-context-bus-banner]')?.remove();
  container.insertAdjacentHTML('afterbegin', `<div class="mc-context-bus-banner synchronized" data-context-bus-banner role="status" aria-label="Synchronized Engineering Context"><dl><div><dt>Project</dt><dd>${esc(project?.name || reference.projectId)}</dd></div><div><dt>Library</dt><dd>${esc(library?.name || reference.libraryId || 'Unavailable')}</dd></div><div><dt>Document</dt><dd>${esc(documentRecord?.title || documentRecord?.name || reference.documentId)}</dd></div><div><dt>Section</dt><dd>${esc(section ? sectionHeadingValue(section) || reference.sectionId : reference.sectionId || 'Unavailable')}</dd></div><div><dt>Activation Source</dt><dd>${esc(reference.activationSource)}</dd></div><div><dt>Current Workflow</dt><dd>${esc(workflow)}</dd></div></dl></div>`);
}

function reducedMotionPreferred() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function revealNavigationTarget(element) {
  if (!element) return;

  requestAnimationFrame(() => {
    element.scrollIntoView(sourceScrollOptions(reducedMotionPreferred()));
    element.focus({ preventScroll: true });
  });
}

function showTransientNavigationNotice(message) {
  sourceNavigationNotice = message;
  const messages = $('#messages');

  if (!messages || !message) return;

  messages.querySelector('[data-source-navigation-notice]')?.remove();
  messages.insertAdjacentHTML('afterbegin', `
    <div class="mc-source-target-notice" data-source-navigation-notice role="status">
      ${esc(message)}
    </div>
  `);
}

function returnToEvidenceExplorer() {
  const originatingMessageId = sourceNavigationTarget?.originatingMessageId ||
    relationshipTarget?.originatingMessageId;
  if (
    activeRetrievalSession &&
    originatingMessageId === activeRetrievalSession.messageId
  ) {
    selectedEvidenceId = sourceNavigationTarget?.evidenceId ||
      relationshipTarget?.evidenceId ||
      selectedEvidenceId;
    show('evidence');
    return;
  }

  show('chat');
  showTransientNavigationNotice(
    'The retrieval session is no longer available. Ask Chief a new question to inspect evidence.'
  );
}

function openRelationshipExplorerFromEvidence(evidence) {
  if (!evidence?.documentId || !activeRetrievalSession) return;
  relationshipTarget = {
    ...relationshipNavigationTarget({
      documentId: evidence.documentId,
      sectionId: evidence.sectionId,
      origin: 'evidence'
    }),
    projectId: activeRetrievalSession.project.id,
    libraryId: evidence.libraryId || activeRetrievalSession.library.id,
    evidenceId: evidence.id,
    originatingMessageId: activeRetrievalSession.messageId
  };
  selectedDoc = evidence.documentId;
  show('relationships');
}

function openRelationshipSource(destination) {
  if (!relationshipTarget?.documentId) return;
  sourceNavigationTarget = createSourceTarget({
    projectId: relationshipTarget.projectId || state().activeProject,
    libraryId: relationshipTarget.libraryId,
    documentId: relationshipTarget.documentId,
    sectionId: relationshipTarget.sectionId,
    evidenceId: relationshipTarget.evidenceId,
    originatingWorkspace: 'relationships',
    originatingMessageId: relationshipTarget.originatingMessageId,
    destination
  });
  selectedDoc = relationshipTarget.documentId;
  if (destination === 'knowledge') selectedKnowledgeSection = 'all';
  show(destination);
}

function returnToRelationshipExplorer() {
  if (!relationshipTarget?.documentId) {
    show('relationships');
    return;
  }
  selectedDoc = relationshipTarget.documentId;
  show('relationships');
}

function openVersionExplorer(documentId, originatingMessageId = '') {
  const target = lineageNavigationTarget(documentId);
  if (!target) return;
  lineageTarget = {
    ...target,
    originatingMessageId,
    originatingWorkspace: originatingMessageId ? 'chat' : view
  };
  selectedDoc = documentId;
  show('versions');
}

function openRevisionReview(earlierDocumentId, laterDocumentId) {
  const target = revisionNavigationTarget(earlierDocumentId, laterDocumentId, {
    originatingWorkspace: view
  });
  if (!target) return;
  revisionTarget = target;
  revisionFilter = 'all';
  selectedRevisionMatch = 0;
  selectedInspectionId = null;
  void engine.documents().then(documents => {
    const later = documents.find(document => document.id === laterDocumentId);
    if (!later) return;
    return activateEngineeringContext({
      projectId: state().activeProject,
      libraryId: later.libraryId,
      documentId: later.id,
      lineageId: later.lineageId,
      revisionId: `${earlierDocumentId}->${laterDocumentId}`,
      source: CONTEXT_ACTIVATION_SOURCES.revisionPair
    });
  });
  show('revisions');
}

async function openEngineeringWorkspace({ documentId, sectionId = '', evidenceId = '', libraryId = '', origin = view, source = '' } = {}) {
  const seed = documentId ? { projectId: state().activeProject, documentId, sectionId, evidenceId, libraryId } : activeContextActivation;
  if (!seed?.documentId) {
    show('engineering');
    return;
  }
  const activationSource = source || ({
    chat: CONTEXT_ACTIVATION_SOURCES.commandDesk,
    evidence: CONTEXT_ACTIVATION_SOURCES.evidence,
    relationships: CONTEXT_ACTIVATION_SOURCES.relationshipDocument,
    versions: CONTEXT_ACTIVATION_SOURCES.versionDocument,
    revisions: CONTEXT_ACTIVATION_SOURCES.revisionSection,
    sources: CONTEXT_ACTIVATION_SOURCES.sourceInspectorDocument,
    knowledge: CONTEXT_ACTIVATION_SOURCES.knowledgeObjectDocument,
    workflow: CONTEXT_ACTIVATION_SOURCES.workflowOpen
  }[origin] || CONTEXT_ACTIVATION_SOURCES.engineeringWorkspace);
  await activateEngineeringContext({ ...seed, source: activationSource });
  show('engineering');
}

function clearEngineeringWorkspace() {
  engineeringTarget = null;
  clearInspectionSession();
  clearWorkflowWorkspace();
}

function clearWorkflowWorkspace() {
  workflowTarget = null;
  clearWorkflowSession();
}

async function openWorkflowWorkspace(workflowType = 'Inspection Preparation', origin = view) {
  if (!getInspectionSession()?.context) return;
  const replacing = Boolean(workflowTarget && workflowTarget.workflowType !== workflowType);
  const target = workflowNavigationTarget({ workflowType, origin });
  if (!target) return;
  workflowTarget = target;
  clearWorkflowSession();
  if (activeContextActivation) {
    await activateEngineeringContext({
      ...activeContextActivation,
      source: replacing ? CONTEXT_ACTIVATION_SOURCES.workflowReplace : CONTEXT_ACTIVATION_SOURCES.workflowOpen
    });
  }
  show('workflow');
}

async function seedWorkflowFromDocument(documentId, sectionId = '', origin = view) {
  const currentState = state();
  const documents = await engine.documents();
  const sections = await engine.sections();
  const document = documents.find(item => item.id === documentId);
  if (!document) return;
  const context = createEngineeringContext({
    projectId: currentState.activeProject,
    documentId,
    sectionId,
    libraryId: document.libraryId,
    projects: currentState.projects,
    documents,
    sections,
    retrievalSession: activeRetrievalSession
  });
  if (!context) return;
  engineeringTarget = engineeringNavigationTarget({ projectId: context.projectId, documentId, sectionId, libraryId: context.libraryId, origin });
  startInspectionSession(context, { origin });
  openWorkflowWorkspace('Inspection Preparation', origin);
}

function returnToRevisionReview() {
  if (revisionTarget) show('revisions');
  else show('versions');
}

function returnToOriginatingAnswer() {
  const messageId = sourceNavigationTarget?.originatingMessageId ||
    activeRetrievalSession?.messageId;
  const messageExists = state().chat.some(message =>
    message.role === 'assistant' && message.id === messageId
  );

  if (!messageId || !messageExists) {
    show('chat');
    showTransientNavigationNotice('The originating answer is no longer available.');
    return;
  }

  answerNavigationTarget = messageId;
  show('chat');
  const answer = document.getElementById(answerAnchorId(messageId));
  answer?.classList.add('mc-section-highlight-answer');
  revealNavigationTarget(answer);
}

async function openEvidenceSource(evidence, destination) {
  if (!activeRetrievalSession || !evidence) return;

  const actions = sourceNavigationActions(evidence);
  const actionSupported = destination === 'knowledge'
    ? actions.viewInDocument
    : actions.openSourceInspector;

  if (!actionSupported) return;

  const proposedTarget = createSourceTarget({
    projectId: activeRetrievalSession.project.id,
    libraryId: evidence.libraryId || activeRetrievalSession.library.id,
    documentId: evidence.documentId,
    sectionId: evidence.sectionId,
    evidenceId: evidence.id,
    evidenceIndex: evidence.order,
    originatingWorkspace: 'evidence',
    originatingMessageId: activeRetrievalSession.messageId,
    destination
  });
  const projects = state().projects;
  const projectIsValid = proposedTarget.projectId && projects.some(project =>
    project.id === proposedTarget.projectId
  );

  if (proposedTarget.projectId && !projectIsValid) {
    sourceNavigationNotice = 'The source project is no longer available.';
    renderEvidenceExplorer();
    return;
  }

  if (projectIsValid && state().activeProject !== proposedTarget.projectId) {
    engine.setProject(proposedTarget.projectId);
    $('#projectSelect').value = proposedTarget.projectId;
    selectedKnowledgeSection = 'all';
    knowledgeCatalogContext = null;
  }

  const documents = await engine.documents();
  const sections = await engine.sections();
  const libraries = engine.libraries();
  const resolution = resolveSourceTarget(proposedTarget, {
    projects: state().projects,
    libraries,
    documents,
    sections
  });

  if (resolution.status === 'missing-document') {
    sourceNavigationNotice = 'The source document is no longer available.';
    renderEvidenceExplorer();
    return;
  }

  if (resolution.status === 'none') return;

  sourceNavigationTarget = sourceNavigationDestination(
    proposedTarget,
    destination
  );
  sourceNavigationNotice = resolution.status === 'missing-section'
    ? 'Source section unavailable'
    : '';
  selectedDoc = resolution.document.id;

  if (resolution.library?.enabled && state().activeLibrary !== resolution.library.id) {
    engine.setLibrary(resolution.library.id);
  }

  if (destination === 'knowledge') {
    selectedKnowledgeSection = 'all';
  }

  show(destination);
}

function modeLabel(mode) {
  return {
    offline: 'Offline evidence',
    source: 'Source-only AI',
    assisted: 'Expert-assisted AI',
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

  const projectGroups = separateMissionControlProjects(currentState.projects, DEMO_PROJECT_ID);
  const projectOptions = projects => projects.map(project => `
      <option
        value="${project.id}"
        ${project.id === currentState.activeProject ? 'selected' : ''}
      >
        ${esc(project.name)}
      </option>
    `).join('');
  $('#projectSelect').innerHTML = `
    <optgroup label="My Projects">${projectOptions(projectGroups.userProjects)}</optgroup>
  `;

  const documents = await engine.documents();
  const sections = await engine.sections();

  $('#kDocs').textContent = fmt(documents.length);
  $('#kSections').textContent = fmt(sections.length);

  renderMessages(documents, sections);
  renderProjectWorkspace(documents, sections);
  await renderKnowledgeWorkspace(documents);
  renderDemonstrationControls();
  if (experience === 'mission-control') await renderMissionControl(documents, sections);
}

function renderDemonstrationControls() {
  const guide = $('#demoGuide');
  if (guide) guide.hidden = true;
}

async function selectProjectThroughProductionPath(projectId) {
  const currentProjectId = state().activeProject;
  if (projectId === DEMO_PROJECT_ID && currentProjectId && currentProjectId !== DEMO_PROJECT_ID) {
    previousUserProjectId = currentProjectId;
  } else if (projectId !== DEMO_PROJECT_ID) {
    previousUserProjectId = projectId;
  }
  engine.setProject(projectId);
  selectedDoc = null;
  selectedKnowledgeSection = 'all';
  knowledgeCatalogContext = null;
  sourceNavigationTarget = null;
  answerNavigationTarget = null;
  sourceNavigationNotice = '';
  relationshipTarget = null;
  lineageTarget = null;
  revisionTarget = null;
  revisionFilter = 'all';
  selectedRevisionMatch = 0;
  drawingTarget = null;
  drawingFilter = '';
  drawingDiscipline = 'all';
  drawingType = 'all'; drawingSearchActiveIndex = -1;
  drawingZoom = null;
  drawingRotation = 0;
  activePlanQuery = null; activeWorkPackage = null; activeWorkPackageMessageId = ''; chiefConstructionContext = null; drawingMatchingSheetIds = []; selectedWorkPackageItem = ''; pendingDrawingContext = null;
  releaseDrawingSource();
  clearActiveContext(CONTEXT_ACTIVATION_SOURCES.projectSwitch, projectId);
  await refresh();
}

function clearDemonstrationTransientState() {
  activeRetrievalSession = null;
  selectedEvidenceId = null;
  selectedInspectionId = null;
  selectedDoc = null;
  selectedKnowledgeSection = 'all';
  knowledgeCatalogContext = null;
  sourceNavigationTarget = null;
  answerNavigationTarget = null;
  sourceNavigationNotice = '';
  relationshipTarget = null;
  lineageTarget = null;
  revisionTarget = null;
  revisionFilter = 'all';
  selectedRevisionMatch = 0;
  drawingTarget = null;
  drawingFilter = '';
  drawingDiscipline = 'all';
  drawingType = 'all'; drawingSearchActiveIndex = -1;
  drawingZoom = null;
  drawingRotation = 0;
  activePlanQuery = null; activeWorkPackage = null; activeWorkPackageMessageId = ''; chiefConstructionContext = null; drawingMatchingSheetIds = []; selectedWorkPackageItem = ''; pendingDrawingContext = null; activeChiefLocationPresentation = null;
  releaseDrawingSource();
  engineeringTarget = null;
  workflowTarget = null;
  clearActiveContext(CONTEXT_ACTIVATION_SOURCES.projectSwitch, DEMO_PROJECT_ID);
}

async function returnFromDemonstrationProject() {
  clearDemonstrationTransientState();
  demoGuideDismissed = true;
  engine.setProject('general');
  engine.createConversation();
  missionControlAttachments = [];
  chiefHistoryVisible = false;
  missionControlView = 'home';
  await refresh();
  await switchExperience('mission-control');
  $('#missionControlPrompt')?.focus();
}

async function openDemonstrationProject({ reset = false } = {}) {
  const existing = state().projects.some(project => project.id === DEMO_PROJECT_ID);
  if (reset && existing) await engine.deleteProject(DEMO_PROJECT_ID);
  if (!existing || reset) {
    const fixture = createDemonstrationProjectFixture();
    const validation = validateDemonstrationProject(fixture);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    await engine.importProject(fixture, { preserveIdentifiers: true });
  }
  await selectProjectThroughProductionPath(DEMO_PROJECT_ID);
  missionControlView = 'home';
  selectedDoc = DEMO_INITIAL_DOCUMENT_ID;
  demoGuideDismissed = false;
  const demoDocument = (await engine.documents()).find(document => document.id === DEMO_INITIAL_DOCUMENT_ID);
  await activateEngineeringContext({
    projectId: DEMO_PROJECT_ID,
    libraryId: demoDocument?.libraryId || '',
    documentId: DEMO_INITIAL_DOCUMENT_ID,
    sectionId: DEMO_INITIAL_SECTION_ID,
    source: CONTEXT_ACTIVATION_SOURCES.knowledgeCatalog
  });
  await refresh();
  await switchExperience('mission-control');
  renderDemonstrationControls();
}

$('#mode').onchange = () => {
  engine.saveSettings({
    mode: $('#mode').value
  });

  refresh();
};

$('#projectSelect').onchange = async () => {
  await selectProjectThroughProductionPath($('#projectSelect').value);
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
        const project = engine.addProject(name);
        previousUserProjectId = project.id;
        missionControlView = 'home';
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
  const canExploreEvidence = hasCitations &&
    activeRetrievalSession?.messageId === message.id;
  const canCopy = Boolean(navigator.clipboard?.writeText);
  const activeEngineeringContext = getInspectionSession()?.context;
  const canOpenWorkflow = canExploreEvidence && activeEngineeringContext?.documentIds?.includes(message.hits[0]?.documentId);

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
      ${canExploreEvidence
        ? `
          <button type="button" data-view-evidence="${esc(message.id)}">
            View Evidence
          </button>
          <button type="button" data-explore-relationships="${esc(message.id)}">
            Explore Relationships
          </button>
          ${message.hits[0]?.documentId
            ? `<button type="button" data-open-source-shortcut="${esc(message.hits[0].documentId)}">Open Source</button>`
            : ''}
          ${message.hits[0]?.documentId
            ? `<button type="button" data-open-version-explorer="${esc(message.hits[0].documentId)}">Explore Versions</button>`
            : ''}
          ${canOpenWorkflow
            ? `<button type="button" data-open-workflow="${esc(message.id)}">Open Workflow</button>`
            : ''}
        `
        : ''}
    </div>
  `;
}

function renderEvidenceVersionNotice(message, lineageModel) {
  const hits = Array.isArray(message.hits) ? message.hits : [];
  const previousEvidence = hits.map(hit => ({
    hit,
    lineage: lineageForDocument(lineageModel, hit.documentId)
  })).filter(item =>
    ['superseded', 'duplicate'].includes(item.lineage.record?.status)
  );

  if (!previousEvidence.length) return '';
  const first = previousEvidence[0];
  const currentId = first.lineage.current?.documentId || '';
  return `
    <div class="mc-lineage-evidence-warning" role="note">
      <div>
        <strong>Evidence from previous revision</strong>
        <span>${fmt(previousEvidence.length)} retrieved source${previousEvidence.length === 1 ? '' : 's'} came from a superseded or duplicate record.</span>
      </div>
      <div>
        <button type="button" data-open-version-explorer="${esc(first.hit.documentId)}">Review Version</button>
        ${currentId
          ? `<button type="button" class="subtle" data-open-current-version="${esc(currentId)}">Open Current Version</button>`
          : ''}
      </div>
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
  const lineageModel = buildDocumentLineage({ documents, sections });
  const previousScrollTop = $('#messages').scrollTop;

  $('#messages').innerHTML = chat.length
      ? chat.map((message, messageIndex) => `
        <article
          class="message ${message.role} ${message.id === answerNavigationTarget ? 'mc-section-highlight-answer' : ''}"
          ${message.role === 'assistant'
            ? `id="${answerAnchorId(message.id)}" tabindex="-1"`
            : ''}
        >
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
                  ${renderEvidenceVersionNotice(message, lineageModel)}
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
    return;
  }

  const evidenceButton = event.target.closest('[data-view-evidence]');

  if (
    evidenceButton &&
    activeRetrievalSession?.messageId === evidenceButton.dataset.viewEvidence
  ) {
    selectedEvidenceId = activeRetrievalSession.evidence[0]?.id || null;
    const evidence = activeRetrievalSession.evidence[0];
    if (evidence?.documentId) void activateEngineeringContext({
      projectId: activeRetrievalSession.project.id,
      libraryId: evidence.libraryId || activeRetrievalSession.library.id,
      documentId: evidence.documentId,
      sectionId: evidence.sectionId,
      evidenceId: evidence.id,
      source: CONTEXT_ACTIVATION_SOURCES.commandDesk
    });
    show('evidence');
  }

  const relationshipButton = event.target.closest('[data-explore-relationships]');

  if (
    relationshipButton &&
    activeRetrievalSession?.messageId === relationshipButton.dataset.exploreRelationships
  ) {
    openRelationshipExplorerFromEvidence(activeRetrievalSession.evidence[0]);
  }

  const versionButton = event.target.closest('[data-open-version-explorer]');
  if (versionButton) {
    openVersionExplorer(versionButton.dataset.openVersionExplorer, activeRetrievalSession?.messageId || '');
    return;
  }

  const engineeringButton = event.target.closest('[data-open-engineering]');
  if (engineeringButton && activeRetrievalSession) {
    const evidence = activeRetrievalSession.evidence[0];
    openEngineeringWorkspace({
      documentId: engineeringButton.dataset.openEngineering,
      sectionId: evidence?.sectionId || '',
      evidenceId: evidence?.id || '',
      libraryId: evidence?.libraryId || '',
      origin: 'chat'
    });
    return;
  }

  const sourceShortcut = event.target.closest('[data-open-source-shortcut]');
  if (sourceShortcut && activeRetrievalSession) {
    selectedDoc = sourceShortcut.dataset.openSourceShortcut;
    show('sources');
    return;
  }

  const workflowButton = event.target.closest('[data-open-workflow]');
  if (workflowButton && activeRetrievalSession?.messageId === workflowButton.dataset.openWorkflow) {
    if (contextBusSnapshot.workflow.status === 'ambiguous') show('workflow');
    else openWorkflowWorkspace(contextBusSnapshot.workflow.workflowType || 'Inspection Preparation', 'chat');
    return;
  }

  const currentVersionButton = event.target.closest('[data-open-current-version]');
  if (currentVersionButton) {
    selectedDoc = currentVersionButton.dataset.openCurrentVersion;
    selectedKnowledgeSection = 'all';
    show('knowledge');
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
  engine.createConversation({ projectId: state().activeProject });
  activeRetrievalSession = null;
  selectedEvidenceId = null;
  sourceNavigationTarget = null;
  answerNavigationTarget = null;
  sourceNavigationNotice = '';
  relationshipTarget = null;
  lineageTarget = null;
  revisionTarget = null;
  revisionFilter = 'all';
  selectedRevisionMatch = 0;
  clearActiveContext(CONTEXT_ACTIVATION_SOURCES.newConversation);
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
    const navigationIntent = classifyEngineeringNavigationIntent(prompt);
    if (navigationIntent.kind === 'exact-drawing-navigation') {
      const [analyses, documents, sections] = await Promise.all([currentGlobalDrawingRegistryAnalyses(prompt), engine.documents(), engine.sections()]);
      const navigation = await navigateExactDrawingCommand(prompt, { analyses, documents, sections, returnTarget: 'chief-answer', projectId: state().activeProject }, async target => {
        const exactTarget = createDrawingTarget({ ...target, origin: 'engineering-locator', returnTarget: 'chief-answer' });
        if (exactTarget.projectId && exactTarget.projectId !== state().activeProject) await selectProjectThroughProductionPath(exactTarget.projectId);
        const targetAnalysis = analyses.find(item => item.drawingSetId === exactTarget.drawingSetId || item.documentId === exactTarget.documentId);
        drawingWorkspace.setPages(targetAnalysis?.sheets || []);
        const workspaceResolution = drawingWorkspace.open(exactTarget, drawingTarget?.pageNumber);
        drawingTarget = createDrawingTarget({ ...exactTarget, pageNumber: workspaceResolution.pageNumber || exactTarget.pageNumber });
        pendingDrawingContext = exactTarget;
        drawingMatchingSheetIds = [exactTarget.sheetId];
        await showMissionControlView('plans');
      });
      logger.info('Drawing registry runtime inspection', latestDrawingRegistryInspection || { activeProjectId: state().activeProject, query: prompt, commandIntent: navigationIntent, diagnosticStatus: 'registry-inspection-unavailable' });
      latestDrawingRegistryInspection = null;
      if (navigation.handled) {
        $('#prompt').value = '';
        resizeComposer();
        setChiefState('success');
        return;
      }
    }
    const retrievalContext = state();
    const project = retrievalContext.projects.find(item =>
      item.id === retrievalContext.activeProject
    );
    const libraries = engine.libraries();
    const library = libraries.find(item =>
      item.id === retrievalContext.activeLibrary
    );
    const message = await engine.ask(
      prompt,
      $('#mode').value
    );
    const documents = await engine.documents();
    const sections = await engine.sections();

    activeRetrievalSession = createRetrievalSession({
      question: prompt,
      timestamp: message.createdAt,
      project,
      library,
      mode: message.mode,
      messageId: message.id,
      hits: message.hits,
      citations: message.citations,
      citationVerification: message.citationVerification,
      retrievalMeta: message.retrievalMeta,
      documents,
      libraries,
      sections
    });
    selectedEvidenceId = activeRetrievalSession.evidence[0]?.id || null;
    const primaryEvidence = activeRetrievalSession.evidence[0];
    if (primaryEvidence?.documentId) {
      await activateEngineeringContext({
        projectId: activeRetrievalSession.project.id,
        libraryId: primaryEvidence.libraryId || activeRetrievalSession.library.id,
        documentId: primaryEvidence.documentId,
        sectionId: primaryEvidence.sectionId,
        evidenceId: primaryEvidence.id,
        source: CONTEXT_ACTIVATION_SOURCES.commandDesk
      });
    } else {
      clearActiveContext(CONTEXT_ACTIVATION_SOURCES.commandDesk, activeRetrievalSession.project.id);
    }

    $('#prompt').value = '';
    resizeComposer();

    renderMessages(documents, sections, {
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

function renderEvidenceExplorer() {
  const session = activeRetrievalSession;

  if (!session) {
    $('#evidenceSessionHeader').innerHTML = `
      <div>
        <span>RETRIEVAL TRANSPARENCY</span>
        <h2>No active retrieval session</h2>
        <p>
          Ask Chief a question to inspect the retrieval results for the
          latest successful answer. Retrieval sessions are not persisted.
        </p>
      </div>
    `;
    $('#evidencePipeline').innerHTML = '';
    $('#evidenceExplorerList').innerHTML = `
      <div class="mc-evidence-empty"><strong>No ranked evidence.</strong><span>Ask an evidence-backed question in Command Desk to populate this list.</span></div>
    `;
    $('#evidenceExplorerDetail').innerHTML = `
      <div class="mc-evidence-empty"><strong>No evidence selected.</strong><span>Select a ranked evidence item to inspect its stored source text.</span></div>
    `;
    return;
  }

  const timestamp = new Date(session.timestamp);
  const timestampLabel = Number.isNaN(timestamp.getTime())
    ? session.timestamp
    : timestamp.toLocaleString();
  const verification = session.citationVerification;
  const missingCitations = verification.uncited.length;

  $('#evidenceSessionHeader').innerHTML = `
    <div>
      <span>ACTIVE RETRIEVAL SESSION</span>
      <h2>${esc(session.coverageClassification)}</h2>
      <p>
        Evidence availability only. This classification does not establish
        answer correctness.
      </p>
    </div>
    <dl class="mc-evidence-session-facts">
      <div><dt>Question</dt><dd>${esc(session.question)}</dd></div>
      <div><dt>Retrieved</dt><dd>${esc(timestampLabel)}</dd></div>
      <div><dt>Project</dt><dd>${esc(session.project.name)}</dd></div>
      <div><dt>Library context</dt><dd>${esc(session.library.name)}</dd></div>
      <div><dt>Mode</dt><dd>${esc(modeLabel(session.mode))}</dd></div>
      <div><dt>Retrieval version</dt><dd>${session.retrievalMeta.retrievalVersion ? esc(session.retrievalMeta.retrievalVersion) : 'Unavailable'}</dd></div>
      <div><dt>Citations returned</dt><dd>${session.citationsReturned.length ? session.citationsReturned.map(item => `[S${fmt(item)}]`).join(', ') : 'None'}</dd></div>
    </dl>
    <section class="mc-evidence-citation-health" aria-label="Citation verification">
      <div>
        <span>CITATION COVERAGE</span>
        <strong>${verification.coverage === null ? 'Unavailable' : `${fmt(verification.coverage)}%`}</strong>
      </div>
      <div>
        <span>CITED EVIDENCE</span>
        <strong>${fmt(session.evidenceUsed)}</strong>
      </div>
      <div>
        <span>UNCITED CLAIMS</span>
        <strong>${fmt(missingCitations)}</strong>
      </div>
      <div>
        <span>INVALID CITATIONS</span>
        <strong>${fmt(verification.invalid.length)}</strong>
      </div>
    </section>
    ${missingCitations || verification.invalid.length
      ? `
        <details class="mc-evidence-citation-details">
          <summary>Review citation verification details</summary>
          ${missingCitations
            ? `
              <h3>Material claims without citations</h3>
              <ul>${verification.uncited.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
            `
            : ''}
          ${verification.invalid.length
            ? `
              <h3>Invalid citation references</h3>
              <p>${verification.invalid.map(item => `[S${fmt(item)}]`).join(', ')}</p>
            `
            : ''}
        </details>
      `
      : ''}
  `;

  const pipeline = [
    ['Question', 1, 'Submitted prompt'],
    [
      'Candidate Documents',
      session.candidateDocumentsRepresented,
      'Represented in returned hits'
    ],
    [
      'Candidate Sections',
      session.candidateSections,
      session.retrievalMeta.hierarchyFirst
        ? 'Hierarchy-filtered search scope'
        : 'Search scope'
    ],
    ['Matched Sections', session.matchedSections, 'Positive-scoring candidates'],
    ['Evidence Used', session.evidenceUsed, 'Cited in the answer'],
    ['Final Response', 1, 'Answer returned']
  ];

  $('#evidencePipeline').innerHTML = pipeline.map(([label, count, note], index) => `
    <article>
      <span>${esc(label)}</span>
      <strong>${fmt(count)}</strong>
      <small>${esc(note)}</small>
      ${index < pipeline.length - 1 ? '<b aria-hidden="true">↓</b>' : ''}
    </article>
  `).join('');

  if (
    selectedEvidenceId &&
    !session.evidence.some(item => item.id === selectedEvidenceId)
  ) {
    selectedEvidenceId = null;
  }

  if (!selectedEvidenceId) {
    selectedEvidenceId = session.evidence[0]?.id || null;
  }

  $('#evidenceExplorerList').innerHTML = session.evidence.length
    ? session.evidence.map(item => {
      const actions = sourceNavigationActions(item);
      return `
      <article class="mc-evidence-navigation-item">
        <button
          type="button"
          class="mc-evidence-item ${item.id === selectedEvidenceId ? 'active' : ''}"
          data-evidence-id="${esc(item.id)}"
          ${item.id === selectedEvidenceId ? 'aria-current="true"' : ''}
        >
          <span class="mc-evidence-rank">${fmt(item.order + 1)}</span>
          <span class="mc-evidence-item-copy">
            <strong>[${esc(item.citationReference)}] ${esc(item.heading)}</strong>
            <small>${esc(item.documentName)} · ${esc(item.libraryName)}</small>
            <em>${esc(item.retrievalStatus)}</em>
            <p>${item.excerpt ? esc(item.excerpt) : 'No stored section text is available.'}</p>
          </span>
          <span class="mc-evidence-score">
            ${item.retrievalScore === null ? 'Score unavailable' : `Score ${item.retrievalScore.toFixed(1)}`}
          </span>
        </button>
        ${actions.viewInDocument || actions.openSourceInspector
          ? `
            <div class="mc-evidence-navigation-actions">
              ${actions.viewInDocument
                ? `<button type="button" data-evidence-source="knowledge" data-source-evidence-id="${esc(item.id)}">View in Document</button>`
                : ''}
              ${actions.openSourceInspector
                ? `<button type="button" class="subtle" data-evidence-source="sources" data-source-evidence-id="${esc(item.id)}">Open in Source Inspector</button>`
                : ''}
            </div>
          `
          : ''}
      </article>
    `;
    }).join('')
    : `
      <div class="mc-evidence-empty">
        No supporting evidence was retrieved for the latest question.
      </div>
    `;

  const selected = session.evidence.find(item =>
    item.id === selectedEvidenceId
  );
  const selectedActions = sourceNavigationActions(selected || {});

  $('#evidenceExplorerDetail').innerHTML = selected
    ? `
      <article class="mc-evidence-detail">
        <header>
          <span>${esc(selected.retrievalStatus)}</span>
          <h3>[${esc(selected.citationReference)}] ${esc(selected.heading)}</h3>
          <p>${esc(selected.documentName)} · ${esc(selected.libraryName)}</p>
        </header>
        <dl>
          <div><dt>Section number</dt><dd>${selected.sectionNumber ? esc(selected.sectionNumber) : 'Unavailable'}</dd></div>
          <div><dt>Section title</dt><dd>${selected.sectionTitle ? esc(selected.sectionTitle) : 'Unavailable'}</dd></div>
          <div><dt>Parent heading</dt><dd>${selected.parentHeading ? esc(selected.parentHeading) : 'Unavailable'}</dd></div>
          <div><dt>Hierarchy level</dt><dd>${selected.hierarchyLevel === null ? 'Unavailable' : fmt(selected.hierarchyLevel)}</dd></div>
          <div><dt>Hierarchy path</dt><dd>${selected.hierarchyPath.length ? esc(selected.hierarchyPath.join(' › ')) : 'Unavailable'}</dd></div>
          <div><dt>Location</dt><dd>${selected.location ? esc(selected.location) : 'Unavailable'}</dd></div>
          <div><dt>Document type</dt><dd>${selected.documentMetadata.type ? esc(selected.documentMetadata.type) : 'Unavailable'}</dd></div>
          <div><dt>Document status</dt><dd>${selected.documentMetadata.status ? esc(selected.documentMetadata.status) : 'Unavailable'}</dd></div>
          <div><dt>Retrieval score</dt><dd>${selected.retrievalScore === null ? 'Unavailable' : selected.retrievalScore.toFixed(1)}</dd></div>
          <div><dt>Matched terms</dt><dd>${selected.matchedTerms.length ? esc(selected.matchedTerms.join(', ')) : 'Unavailable'}</dd></div>
          <div><dt>Matched phrases</dt><dd>${selected.matchedPhrases.length ? esc(selected.matchedPhrases.join(', ')) : 'Unavailable'}</dd></div>
          <div><dt>Matched intents</dt><dd>${selected.matchedIntents.length ? esc(selected.matchedIntents.join(', ')) : 'Unavailable'}</dd></div>
          <div><dt>Matched references</dt><dd>${selected.matchedReferences.length ? esc(selected.matchedReferences.join(', ')) : 'Unavailable'}</dd></div>
          <div><dt>Score components</dt><dd>${Object.keys(selected.retrievalComponents).length ? esc(Object.entries(selected.retrievalComponents).map(([name, value]) => `${name}: ${value}`).join(' · ')) : 'Unavailable'}</dd></div>
        </dl>
        <section>
          <h4>Complete stored section text</h4>
          ${selected.fullText
            ? `<pre>${esc(selected.fullText)}</pre>`
            : '<div class="mc-evidence-empty">No stored section text is available.</div>'}
        </section>
        <div class="mc-evidence-detail-actions">
          ${selectedActions.viewInDocument
            ? '<button type="button" data-evidence-navigation="knowledge">View in Document</button>'
            : ''}
          ${selectedActions.openSourceInspector
            ? '<button type="button" data-evidence-navigation="sources" class="subtle">Open in Source Inspector</button>'
            : ''}
          ${selected?.documentId
            ? '<button type="button" data-evidence-relationships class="subtle">Explore Relationships</button>'
            : ''}
          ${selected?.documentId
            ? '<button type="button" data-evidence-engineering class="subtle">Open Engineering Workspace</button>'
            : ''}
          ${session.messageId && state().chat.some(message => message.id === session.messageId)
            ? '<button type="button" data-evidence-back-answer class="subtle">Back to Answer</button>'
            : ''}
        </div>
        ${sourceNavigationNotice
          ? `<div class="mc-source-target-unavailable" role="status">${esc(sourceNavigationNotice)}</div>`
          : ''}
      </article>
    `
    : '<div class="mc-evidence-empty">Select an evidence item to inspect its stored section.</div>';

  $$('[data-evidence-id]').forEach(button => {
    button.onclick = async () => {
      selectedEvidenceId = button.dataset.evidenceId;
      const evidence = session.evidence.find(item => item.id === selectedEvidenceId);
      if (evidence?.documentId) await activateEngineeringContext({
        projectId: session.project.id,
        libraryId: evidence.libraryId || session.library.id,
        documentId: evidence.documentId,
        sectionId: evidence.sectionId,
        evidenceId: evidence.id,
        source: CONTEXT_ACTIVATION_SOURCES.evidence
      });
      renderEvidenceExplorer();
    };
  });

  $$('[data-evidence-navigation]').forEach(button => {
    button.onclick = () => void openEvidenceSource(
      selected,
      button.dataset.evidenceNavigation
    );
  });

  $$('[data-evidence-source]').forEach(button => {
    button.onclick = () => {
      const evidence = session.evidence.find(item =>
        item.id === button.dataset.sourceEvidenceId
      );
      selectedEvidenceId = evidence?.id || selectedEvidenceId;
      void openEvidenceSource(evidence, button.dataset.evidenceSource);
    };
  });

  $('[data-evidence-back-answer]')?.addEventListener(
    'click',
    returnToOriginatingAnswer
  );
  $('[data-evidence-relationships]')?.addEventListener('click', () =>
    openRelationshipExplorerFromEvidence(selected)
  );
  $('[data-evidence-engineering]')?.addEventListener('click', () =>
    openEngineeringWorkspace({ documentId: selected.documentId, sectionId: selected.sectionId, evidenceId: selected.id, libraryId: selected.libraryId, origin: 'evidence' })
  );
}

async function renderRelationshipExplorer() {
  const documents = await engine.documents();
  const sections = await engine.sections();
  const model = buildKnowledgeRelationships({ documents, sections });
  const requestedDocumentId = relationshipTarget?.documentId || selectedDoc;
  const requestedDocument = requestedDocumentId
    ? documents.find(item => item.id === requestedDocumentId) || null
    : null;
  const selectedDocument = requestedDocumentId
    ? requestedDocument
    : documents[0] || null;

  if (!selectedDocument) {
    if (!requestedDocumentId) relationshipTarget = null;
    $('#relationshipHeader').innerHTML = `
      <div><span>CONNECTED KNOWLEDGE</span><h2>No relationship context</h2></div>
      <p>${requestedDocumentId ? 'The selected relationship document is no longer available.' : 'Add and index project documents to inspect explicit relationships.'}</p>
    `;
    $('#relationshipContext').innerHTML = `<div class="mc-relationship-empty">${requestedDocumentId ? 'The exact selected document could not be resolved.' : 'No documents are available.'}</div>`;
    $('#relationshipGraph').innerHTML = '<div class="mc-relationship-empty">A graph appears after an exact document or section establishes Engineering Context.</div>';
    $('#relationshipDetail').innerHTML = '<div class="mc-relationship-empty">Open a Knowledge Object or select evidence to inspect its explicit relationships.</div>';
    return;
  }

  if (!relationshipTarget || relationshipTarget.documentId !== selectedDocument.id) {
    relationshipTarget = {
      ...relationshipNavigationTarget({ documentId: selectedDocument.id }),
      projectId: state().activeProject,
      libraryId: selectedDocument.libraryId,
      originatingMessageId: activeRetrievalSession?.messageId || '',
      evidenceId: selectedEvidenceId || ''
    };
  }

  const context = relationshipContext(model, relationshipTarget);
  if (relationshipTarget.sectionId && !context.section) {
    relationshipTarget = { ...relationshipTarget, sectionId: '' };
  }
  const activeContext = relationshipContext(model, relationshipTarget);
  const graph = buildRelationshipGraph(model, relationshipTarget);
  const documentName = selectedDocument.title || selectedDocument.name;
  const sectionName = activeContext.section
    ? sectionHeadingValue(activeContext.section, sections.indexOf(activeContext.section))
    : 'Document context';
  const libraries = engine.libraries();
  const library = libraries.find(item => item.id === selectedDocument.libraryId);
  const documentById = id => documents.find(item => item.id === id);
  const sectionById = id => sections.find(item => item.id === id);
  const relatedDocumentId = (edge, currentId) => edge.from === currentId ? edge.to : edge.from;
  const selectedDocumentId = selectedDocument.id;
  const references = activeContext.section
    ? activeContext.references
    : model.explicitReferences.filter(edge => edge.sourceDocumentId === selectedDocumentId);
  const referencedBy = activeContext.section
    ? activeContext.referencedBy
    : model.reverseReferences.filter(edge => edge.sourceDocumentId === selectedDocumentId);
  const validation = model.validation;
  const warningItems = [
    ...validation.brokenReferences.map(item => `Broken exact reference ID from section ${item.sectionId}: ${item.referenceId}`),
    ...validation.unresolvedReferences.map(item => `Unresolved section-number reference from ${item.sectionId}: ${item.referenceNumber}`),
    ...validation.ambiguousReferences.map(item => `Ambiguous ${item.kind} reference from ${item.sectionId}: ${item.reference}`),
    ...validation.orphanedHierarchy.map(item => `Orphaned parent link from ${item.sectionId}: ${item.parentId}`),
    ...validation.duplicateReferences.map(item => `Duplicate reference entry on ${item.sectionId}: ${item.reference}`),
    ...validation.duplicateHierarchyEdges.map(item => `Duplicate hierarchy edge: ${item.edge}`),
    ...validation.circularParentChains.map(items => `Circular parent chain: ${items.join(' → ')}`),
    ...validation.circularReferences.map(items => `Circular explicit references: ${items.join(' → ')}`)
  ];
  const relationList = (title, type, edges, labelFor) => `
    <section class="mc-relationship-group">
      <h3>${esc(title)} <span>${fmt(edges.length)}</span></h3>
      ${edges.length
        ? `<ul>${edges.map(edge => {
            const item = labelFor(edge);
            return `<li>
              <button type="button" data-relationship-document="${esc(item.documentId || '')}" data-relationship-section="${esc(item.sectionId || '')}">
                <strong>${esc(item.label)}</strong>
                <small>${esc(type)}${item.detail ? ` · ${esc(item.detail)}` : ''}</small>
              </button>
            </li>`;
          }).join('')}</ul>`
        : '<p>No explicit relationships in this category.</p>'}
    </section>
  `;

  $('#relationshipHeader').innerHTML = `
    <div>
      <span>CONNECTED KNOWLEDGE · READ ONLY</span>
      <h2>${esc(documentName)}</h2>
      <p>${esc(sectionName)} · ${library ? esc(library.name) : 'Library unavailable'}</p>
    </div>
    <nav class="mc-relationship-return" aria-label="Relationship navigation">
      ${activeRetrievalSession && relationshipTarget.originatingMessageId === activeRetrievalSession.messageId
        ? '<button type="button" data-relationship-return-evidence>Back to Evidence Explorer</button>'
        : ''}
      ${relationshipTarget.originatingWorkspace === 'revisions' && revisionTarget
        ? '<button type="button" data-relationship-return-revisions>Back to Revision Review</button>'
        : ''}
      <button type="button" class="subtle" data-relationship-knowledge>Open Knowledge Object</button>
      <button type="button" class="subtle" data-relationship-source>Open Source Inspector</button>
      <button type="button" class="subtle" data-relationship-engineering>Open Engineering Workspace</button>
    </nav>
  `;

  $('#relationshipContext').innerHTML = `
    <dl class="mc-relationship-facts">
      <div><dt>Selected document</dt><dd>${esc(documentName)}</dd></div>
      <div><dt>Selected section</dt><dd>${esc(sectionName)}</dd></div>
      <div><dt>Project</dt><dd>${esc(state().projects.find(item => item.id === state().activeProject)?.name || 'Unavailable')}</dd></div>
      <div><dt>Library</dt><dd>${library ? esc(library.name) : 'Unavailable'}</dd></div>
    </dl>
    ${activeContext.section
      ? `<div class="mc-relationship-selected-section">
          <span>SELECTED SECTION</span>
          <strong>${esc(sectionName)}</strong>
          <small>${Array.isArray(activeContext.section.path) && activeContext.section.path.length ? esc(activeContext.section.path.join(' › ')) : 'Hierarchy path unavailable'}</small>
        </div>`
      : '<div class="mc-relationship-empty">Select a section relationship to center the explorer.</div>'}
    ${warningItems.length
      ? `<div class="mc-relationship-warnings"><strong>Validation warnings</strong><ul>${warningItems.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`
      : '<div class="mc-relationship-clear">No relationship-integrity warnings were detected.</div>'}
  `;

  const shownNodes = graph.nodes.slice(0, 28);
  const shownIds = new Set(shownNodes.map(node => node.id));
  const shownEdges = graph.edges.filter(edge => shownIds.has(edge.from) && shownIds.has(edge.to));
  const nodePositions = new Map(shownNodes.map((node, index) => {
    const column = node.type === 'Document' ? 0 : 1;
    const peers = shownNodes.filter(item => item.type === node.type);
    const peerIndex = peers.findIndex(item => item.id === node.id);
    return [node.id, {
      x: column ? 430 : 90,
      y: 45 + peerIndex * Math.max(42, Math.min(72, 460 / Math.max(1, peers.length)))
    }];
  }));
  const graphHeight = Math.max(230, ...[...nodePositions.values()].map(point => point.y + 45));
  $('#relationshipGraph').innerHTML = graph.nodes.length
    ? `
      <p class="mc-relationship-graph-note">Position shows document and section type only. It does not represent semantic similarity.</p>
      <svg viewBox="0 0 720 ${graphHeight}" role="img" aria-labelledby="relationshipGraphSvgTitle relationshipGraphSvgDesc">
        <title id="relationshipGraphSvgTitle">Explicit relationship graph for ${esc(documentName)}</title>
        <desc id="relationshipGraphSvgDesc">${esc(shownEdges.map(edge => `${edge.type}: ${edge.from} to ${edge.to}`).join('. '))}</desc>
        ${shownEdges.map(edge => {
          const from = nodePositions.get(edge.from);
          const to = nodePositions.get(edge.to);
          return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="mc-relationship-edge ${esc(edge.type.toLowerCase().replace(/\s+/g, '-'))}"><title>${esc(edge.type)}</title></line>`;
        }).join('')}
        ${shownNodes.map(node => {
          const point = nodePositions.get(node.id);
          return `<g class="mc-relationship-node ${node.type.toLowerCase()}" transform="translate(${point.x} ${point.y})"><rect x="-72" y="-17" width="144" height="34" rx="7"></rect><text text-anchor="middle" y="3">${esc(node.label.slice(0, 24))}</text><title>${esc(node.type)}: ${esc(node.label)}</title></g>`;
        }).join('')}
      </svg>
      ${graph.nodes.length > shownNodes.length ? `<p class="mc-relationship-graph-note">Showing ${fmt(shownNodes.length)} of ${fmt(graph.nodes.length)} nodes for readability.</p>` : ''}
      <details class="mc-relationship-text-alternative"><summary>Relationship list</summary><ul>${graph.textAlternative.map(item => `<li>${esc(item)}</li>`).join('')}</ul></details>
    `
    : '<div class="mc-relationship-empty">No graph relationships are available for this document.</div>';

  const parentEdges = activeContext.parent ? [{ item: activeContext.parent }] : [];
  const childEdges = activeContext.children.map(item => ({ item }));
  $('#relationshipDetail').innerHTML = [
    relationList('Parent', 'Hierarchy', parentEdges, edge => ({
      label: sectionHeadingValue(edge.item), documentId: edge.item.documentId, sectionId: edge.item.id
    })),
    relationList('Children', 'Hierarchy', childEdges, edge => ({
      label: sectionHeadingValue(edge.item), documentId: edge.item.documentId, sectionId: edge.item.id
    })),
    relationList('Explicit references', 'Explicit reference', references, edge => {
      const target = sectionById(edge.targetSectionId);
      return { label: target ? sectionHeadingValue(target) : edge.targetSectionId, documentId: edge.targetDocumentId, sectionId: edge.targetSectionId, detail: edge.sourceKind };
    }),
    relationList('Referenced by', 'Reverse reference', referencedBy, edge => {
      const target = sectionById(edge.targetSectionId);
      return { label: target ? sectionHeadingValue(target) : edge.targetSectionId, documentId: edge.targetDocumentId, sectionId: edge.targetSectionId };
    }),
    relationList('Referenced documents', 'Explicit reference', activeContext.referencedDocuments, edge => {
      const target = documentById(edge.to);
      return { label: target?.title || target?.name || edge.to, documentId: edge.to, sectionId: edge.targetSectionId };
    }),
    relationList('Related documents', 'Explicit reference', activeContext.relatedDocuments, edge => {
      const id = relatedDocumentId(edge, selectedDocumentId);
      const target = documentById(id);
      return { label: target?.title || target?.name || id, documentId: id };
    }),
    relationList('Same division', 'Same division', activeContext.sameDivision, edge => {
      const id = relatedDocumentId(edge, selectedDocumentId);
      const target = documentById(id);
      return { label: target?.title || target?.name || id, documentId: id, detail: edge.divisions.join(', ') };
    }),
    relationList('Same library', 'Same library', activeContext.sameLibrary, edge => {
      const id = relatedDocumentId(edge, selectedDocumentId);
      const target = documentById(id);
      return { label: target?.title || target?.name || id, documentId: id };
    })
  ].join('');

  $$('[data-relationship-document]').forEach(button => {
    button.onclick = () => {
      const documentId = button.dataset.relationshipDocument;
      if (!documents.some(item => item.id === documentId)) return;
      relationshipTarget = {
        ...relationshipTarget,
        documentId,
        sectionId: button.dataset.relationshipSection || '',
        libraryId: documentById(documentId)?.libraryId || ''
      };
      selectedDoc = documentId;
      renderRelationshipExplorer();
    };
  });
  $('[data-relationship-return-evidence]')?.addEventListener('click', returnToEvidenceExplorer);
  $('[data-relationship-return-revisions]')?.addEventListener('click', returnToRevisionReview);
  $('[data-relationship-knowledge]')?.addEventListener('click', () => openRelationshipSource('knowledge'));
  $('[data-relationship-source]')?.addEventListener('click', () => openRelationshipSource('sources'));
  $('[data-relationship-engineering]')?.addEventListener('click', () =>
    openEngineeringWorkspace({ documentId: selectedDocument.id, sectionId: activeContext.section?.id || '', libraryId: selectedDocument.libraryId, origin: 'relationships' })
  );
}

async function renderVersionExplorer() {
  const documents = await engine.documents();
  const sections = await engine.sections();
  const model = buildDocumentLineage({ documents, sections });
  const requestedId = lineageTarget?.documentId || selectedDoc;
  const selected = requestedId
    ? documents.find(document => document.id === requestedId) || null
    : documents[0] || null;

  if (!selected) {
    $('#lineageHeader').innerHTML = `
      <div><span>DOCUMENT HISTORY · READ ONLY</span><h2>${requestedId ? 'Selected version unavailable' : 'No document versions available'}</h2></div>
      <p>${requestedId ? 'The exact document record no longer exists.' : 'Add and index a document to begin recording explicit lineage.'}</p>
    `;
    $('#lineageCurrent').innerHTML = '<div class="mc-lineage-empty">Select a Knowledge Object to inspect its current-version status.</div>';
    $('#lineageHistory').innerHTML = '<div class="mc-lineage-empty">An explicit version chain appears when the selected document contains lineage records.</div>';
    $('#lineageChanges').innerHTML = '<div class="mc-lineage-empty">Select a document with an explicit previous version to compare revisions.</div>';
    return;
  }

  if (!lineageTarget || lineageTarget.documentId !== selected.id) {
    lineageTarget = {
      ...lineageNavigationTarget(selected.id),
      originatingMessageId: '',
      originatingWorkspace: view
    };
  }
  const selectedLineage = lineageForDocument(model, selected.id);
  const chain = selectedLineage.chain;
  const record = selectedLineage.record;
  const currentRecord = selectedLineage.current;
  const selectedName = selected.title || selected.name;
  const currentDocument = currentRecord?.document || null;
  const selectedComparison = chain?.comparisons.find(comparison =>
    comparison.currentDocumentId === selected.id ||
    comparison.previousDocumentId === selected.id
  ) || null;
  const exactDuplicateGroups = model.detectedDuplicates.filter(group =>
    group.documentIds.includes(selected.id)
  );
  const relevantBroken = model.validation.brokenLineage.filter(item =>
    item.documentId === selected.id || item.targetId === selected.id
  );
  const exactPrevious = documents.find(document =>
    document.id === (selected.previousDocumentId || selected.metadata?.previousDocumentId)
  ) || null;
  const comparablePrevious = exactPrevious && revisionPairStatus(
    exactPrevious,
    selected,
    documents
  ).comparable;
  const dateLabel = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Unavailable';
  };
  const comparisonValue = value =>
    value === null || value === undefined || value === ''
      ? 'Unavailable'
      : String(value);
  const versionCard = (item, label) => {
    const document = item.document;
    return `
      <button type="button" class="mc-lineage-version ${document.id === selected.id ? 'active' : ''}" data-lineage-document="${esc(document.id)}" ${document.id === selected.id ? 'aria-current="true"' : ''}>
        <span>${esc(label)}</span>
        <strong>${esc(document.title || document.name)}</strong>
        <small>${esc(item.status)} · ${esc(dateLabel(document.importedAt || document.indexedAt))}</small>
      </button>
    `;
  };

  $('#lineageHeader').innerHTML = `
    <div>
      <span>DOCUMENT HISTORY · READ ONLY</span>
      <h2>${esc(selectedName)}</h2>
      <p>Lineage status: ${esc(record?.status || 'unknown')} · Document ID: ${esc(selected.id)}</p>
    </div>
    <nav class="mc-lineage-actions" aria-label="Version navigation">
      ${comparablePrevious
        ? '<button type="button" data-lineage-compare>Compare with Previous Version</button>'
        : ''}
      <button type="button" data-lineage-knowledge>Open Knowledge Object</button>
      <button type="button" class="subtle" data-lineage-engineering>Open Engineering Workspace</button>
      <button type="button" class="subtle" data-lineage-source>Open Source Inspector</button>
      ${lineageTarget.originatingMessageId && state().chat.some(message => message.id === lineageTarget.originatingMessageId)
        ? '<button type="button" class="subtle" data-lineage-answer>Back to Answer</button>'
        : ''}
    </nav>
  `;

  $('#lineageCurrent').innerHTML = currentRecord
    ? `
      <article class="mc-lineage-current-card">
        <span>CURRENT</span>
        <h3>${esc(currentDocument.title || currentDocument.name)}</h3>
        <dl>
          <div><dt>Document ID</dt><dd>${esc(currentDocument.id)}</dd></div>
          <div><dt>Lineage ID</dt><dd>${esc(currentRecord.lineageId)}</dd></div>
          <div><dt>Imported</dt><dd>${esc(dateLabel(currentDocument.importedAt))}</dd></div>
          <div><dt>Indexed</dt><dd>${esc(dateLabel(currentDocument.indexedAt))}</dd></div>
          <div><dt>Sections</dt><dd>${fmt(currentDocument.sectionCount)}</dd></div>
          <div><dt>Characters</dt><dd>${fmt(currentDocument.characterCount)}</dd></div>
        </dl>
        ${currentDocument.id !== selected.id ? `<button type="button" data-lineage-document="${esc(currentDocument.id)}">Select Current Version</button>` : ''}
      </article>
    `
    : `
      <div class="mc-lineage-unknown">
        <strong>Current version unknown</strong>
        <p>No explicit current lineage record is available. Mission Companion will not infer one from dates or filenames.</p>
      </div>
    `;

  const previousRecords = chain?.previous || [];
  const duplicateRecords = chain?.duplicates || [];
  const unknownRecords = chain?.unknown || [];
  $('#lineageHistory').innerHTML = `
    <section class="mc-lineage-group">
      <h3>Previous Versions <span>${fmt(previousRecords.length)}</span></h3>
      ${previousRecords.length ? previousRecords.map(item => versionCard(item, 'SUPERSEDED')).join('') : '<p>No explicit previous versions.</p>'}
    </section>
    <section class="mc-lineage-group">
      <h3>Duplicates <span>${fmt(duplicateRecords.length)}</span></h3>
      ${duplicateRecords.length ? duplicateRecords.map(item => versionCard(item, 'DUPLICATE')).join('') : '<p>No explicitly linked duplicate imports.</p>'}
      ${exactDuplicateGroups.length ? `<div class="mc-lineage-fingerprint"><strong>Exact stored fingerprint matches</strong><ul>${exactDuplicateGroups.map(group => `<li>${group.documentIds.map(esc).join(' · ')}</li>`).join('')}</ul></div>` : ''}
    </section>
    <section class="mc-lineage-group">
      <h3>Unknown <span>${fmt(unknownRecords.length)}</span></h3>
      ${unknownRecords.length ? unknownRecords.map(item => versionCard(item, 'UNKNOWN')).join('') : '<p>No unknown records in this explicit family.</p>'}
    </section>
  `;

  $('#lineageChanges').innerHTML = `
    <section class="mc-lineage-comparison">
      <h3>Extraction Changes</h3>
      ${selectedComparison
        ? `<ul>${selectedComparison.changes.filter(item => item.category === 'Extraction').map(item => `<li class="${item.changed ? 'changed' : ''}"><strong>${esc(item.field)}</strong><span>${esc(comparisonValue(item.before))} → ${esc(comparisonValue(item.after))}</span></li>`).join('')}</ul>`
        : '<p>No explicit adjacent version is available for comparison.</p>'}
    </section>
    <section class="mc-lineage-comparison">
      <h3>Relationship Changes</h3>
      ${selectedComparison
        ? `<ul>${selectedComparison.changes.filter(item => item.category === 'Relationships').map(item => `<li class="${item.changed ? 'changed' : ''}"><strong>${esc(item.field)}</strong><span>${esc(comparisonValue(item.before))} → ${esc(comparisonValue(item.after))}</span></li>`).join('')}</ul>`
        : '<p>No explicit adjacent version is available for comparison.</p>'}
    </section>
    <section class="mc-lineage-warnings">
      <h3>Warnings</h3>
      ${relevantBroken.length || model.validation.circularPreviousLinks.length || model.validation.ambiguousCurrentFamilies.some(item => item.lineageId === record?.lineageId)
        ? `<ul>
            ${relevantBroken.map(item => `<li>Broken ${esc(item.field)} link from ${esc(item.documentId)} to ${esc(item.targetId)}.</li>`).join('')}
            ${model.validation.circularPreviousLinks.map(cycle => `<li>Circular previous-version chain: ${esc(cycle.join(' → '))}</li>`).join('')}
            ${model.validation.ambiguousCurrentFamilies.filter(item => item.lineageId === record?.lineageId).map(item => `<li>Multiple records are explicitly marked current: ${esc(item.documentIds.join(', '))}. No current version was selected.</li>`).join('')}
          </ul>`
        : '<p>No deterministic lineage warnings were detected for this document.</p>'}
    </section>
  `;

  $$('[data-lineage-document]').forEach(button => {
    button.onclick = async () => {
      const documentId = button.dataset.lineageDocument;
      const document = documents.find(item => item.id === documentId);
      if (!document) return;
      lineageTarget = { ...lineageTarget, documentId };
      selectedDoc = documentId;
      await activateEngineeringContext({ projectId: state().activeProject, libraryId: document.libraryId, documentId, lineageId: document.lineageId, source: CONTEXT_ACTIVATION_SOURCES.versionDocument });
      renderVersionExplorer();
    };
  });
  $('[data-lineage-knowledge]')?.addEventListener('click', () => {
    selectedDoc = selected.id;
    selectedKnowledgeSection = 'all';
    show('knowledge');
  });
  $('[data-lineage-source]')?.addEventListener('click', () => {
    selectedDoc = selected.id;
    show('sources');
  });
  $('[data-lineage-answer]')?.addEventListener('click', returnToOriginatingAnswer);
  $('[data-lineage-engineering]')?.addEventListener('click', () =>
    openEngineeringWorkspace({ documentId: selected.id, libraryId: selected.libraryId, origin: 'versions' })
  );
  $('[data-lineage-compare]')?.addEventListener('click', () =>
    openRevisionReview(exactPrevious.id, selected.id)
  );
}

async function renderRevisionReview() {
  const documents = await engine.documents();
  const sections = await engine.sections();
  const earlier = documents.find(document => document.id === revisionTarget?.earlierDocumentId) || null;
  const later = documents.find(document => document.id === revisionTarget?.laterDocumentId) || null;
  const comparison = compareRevisions({
    earlierDocument: earlier,
    laterDocument: later,
    documents,
    sections
  });
  const documentName = document => document?.title || document?.name || document?.id || 'Unavailable';
  const filterOptions = [
    ['all', 'All'], ['unchanged', 'Unchanged'], ['added', 'Added'], ['removed', 'Removed'],
    ['content-changed', 'Content'], ['structurally-changed', 'Structure'],
    ['reference-changed', 'References'], ['extraction-changed', 'Extraction'],
    ['ambiguous', 'Ambiguous'], ['unmatched', 'Unmatched']
  ];

  $('#revisionHeader').innerHTML = `
    <div>
      <span>EXPLICIT LINEAGE · READ ONLY</span>
      <h2>${comparison.comparable ? `${esc(documentName(earlier))} → ${esc(documentName(later))}` : 'Revision pair not comparable'}</h2>
      <p>${comparison.comparable
        ? `Lineage ${esc(comparison.lineageId)} · Exact previousDocumentId relationship`
        : esc(comparison.reasons.join(' '))}</p>
    </div>
    <nav class="mc-revision-actions" aria-label="Revision review navigation">
      <button type="button" data-revision-version>Back to Version Explorer</button>
      ${comparison.comparable ? `
        <button type="button" class="subtle" data-revision-object="earlier">Earlier Knowledge Object</button>
        <button type="button" class="subtle" data-revision-object="later">Later Knowledge Object</button>
        <button type="button" class="subtle" data-revision-relationships>Relationship Explorer</button>
        <button type="button" class="subtle" data-revision-engineering>Engineering Workspace</button>
      ` : ''}
    </nav>
  `;

  if (!comparison.comparable) {
    $('#revisionSummary').innerHTML = '';
    $('#revisionFilters').innerHTML = '';
    $('#revisionList').innerHTML = '<div class="mc-revision-empty">Mission Companion compares only exact adjacent records in one explicit lineage.</div>';
    $('#revisionDetail').innerHTML = '<div class="mc-revision-empty">No section comparison is available.</div>';
    $('#revisionWarnings').innerHTML = `<ul class="mc-revision-warning-list">${comparison.reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul>`;
    $('[data-revision-version]')?.addEventListener('click', () => {
      if (later?.id) openVersionExplorer(later.id);
      else show('versions');
    });
    return;
  }

  const summaryItems = [
    ['Unchanged', comparison.summary.unchanged], ['Added', comparison.summary.added],
    ['Removed', comparison.summary.removed], ['Content', comparison.summary.contentChanged],
    ['Structure', comparison.summary.structurallyChanged], ['References', comparison.summary.referenceChanged],
    ['Extraction', comparison.summary.extractionChanged], ['Ambiguous', comparison.summary.ambiguous],
    ['Unmatched', comparison.summary.unmatched]
  ];
  $('#revisionSummary').innerHTML = summaryItems.map(([label, count]) => `
    <article><span>${esc(label)}</span><strong>${fmt(count)}</strong></article>
  `).join('');
  $('#revisionFilters').innerHTML = filterOptions.map(([key, label]) => `
    <button type="button" data-revision-filter="${key}" class="${revisionFilter === key ? 'active' : ''}" aria-pressed="${revisionFilter === key}">${esc(label)}</button>
  `).join('');

  const visibleMatch = match => revisionFilter === 'all' || match.flags.includes(revisionFilter);
  const visibleSingle = flags => revisionFilter === 'all' || flags.includes(revisionFilter);
  const matchRows = comparison.matches.map((match, index) => ({ match, index })).filter(({ match }) => visibleMatch(match));
  const addedRows = comparison.added.filter(item => visibleSingle(item.flags));
  const removedRows = comparison.removed.filter(item => visibleSingle(item.flags));
  const ambiguousRows = comparison.ambiguous.filter(() => revisionFilter === 'all' || revisionFilter === 'ambiguous');
  const selected = comparison.matches[selectedRevisionMatch] || comparison.matches[0] || null;
  if (!comparison.matches[selectedRevisionMatch] && comparison.matches.length) selectedRevisionMatch = 0;
  const sectionLabel = (section, index = 0) => sectionHeadingValue(section, index) || section.sectionNumber || section.id || 'Untitled section';
  const flagLabel = flag => ({
    unchanged: 'Unchanged', 'content-changed': 'Content changed', 'structurally-changed': 'Structure changed',
    'reference-changed': 'References changed', 'extraction-changed': 'Extraction changed'
  }[flag] || flag);
  $('#revisionList').innerHTML = `
    <div class="mc-revision-list">
      ${matchRows.map(({ match, index }) => `
        <button type="button" data-revision-match="${index}" class="${index === selectedRevisionMatch ? 'active' : ''}" ${index === selectedRevisionMatch ? 'aria-current="true"' : ''}>
          <span>${match.flags.map(flag => `<em>${esc(flagLabel(flag))}</em>`).join('')}</span>
          <strong>${esc(sectionLabel(match.earlier, index))}</strong>
          <small class="mc-revision-match-rule">${esc(revisionMatchRuleLabel(match.matchRule))}</small>
        </button>
      `).join('')}
      ${addedRows.map((item, index) => `<article class="mc-revision-single added"><span>ADDED · UNMATCHED</span><strong>${esc(sectionLabel(item.section, index))}</strong><small>${esc(item.sectionId || 'No section ID')}</small></article>`).join('')}
      ${removedRows.map((item, index) => `<article class="mc-revision-single removed"><span>REMOVED · UNMATCHED</span><strong>${esc(sectionLabel(item.section, index))}</strong><small>${esc(item.sectionId || 'No section ID')}</small></article>`).join('')}
      ${ambiguousRows.map(item => `<article class="mc-revision-single ambiguous"><span>AMBIGUOUS · ${esc(item.rule)}</span><strong>${esc(item.key)}</strong><small>Earlier: ${esc(item.earlierSectionIds.join(', '))} · Later: ${esc(item.laterSectionIds.join(', '))}</small></article>`).join('')}
      ${!matchRows.length && !addedRows.length && !removedRows.length && !ambiguousRows.length ? '<div class="mc-revision-empty">No section records match this filter.</div>' : ''}
    </div>
  `;

  const differences = (items, empty) => items.length
    ? `<ul class="mc-revision-differences">${items.map(item => `<li><strong>${esc(item.field)}</strong><span>${esc(Array.isArray(item.before) ? item.before.join(', ') : item.before ?? 'Unavailable')} → ${esc(Array.isArray(item.after) ? item.after.join(', ') : item.after ?? 'Unavailable')}</span></li>`).join('')}</ul>`
    : `<p class="mc-revision-no-change">${esc(empty)}</p>`;
  if (!selected) {
    $('#revisionDetail').innerHTML = '<div class="mc-revision-empty">No deterministically matched section is available for side-by-side review.</div>';
  } else {
    const referenceItems = [
      ...(selected.referenceDifferences.crossReferences.changed ? [{ field: 'Cross references', before: selected.referenceDifferences.crossReferences.removed, after: selected.referenceDifferences.crossReferences.added }] : []),
      ...(selected.referenceDifferences.crossReferenceIds.changed ? [{ field: 'Cross-reference IDs', before: selected.referenceDifferences.crossReferenceIds.removed, after: selected.referenceDifferences.crossReferenceIds.added }] : [])
    ];
    $('#revisionDetail').innerHTML = `
      <div class="mc-revision-basis"><strong>Comparison basis</strong><span><b class="mc-revision-match-rule">${esc(revisionMatchRuleLabel(selected.matchRule))}</b> · Earlier ID ${esc(selected.earlierSectionId || 'Unavailable')} · Later ID ${esc(selected.laterSectionId || 'Unavailable')}</span></div>
      <div class="mc-revision-side-by-side">
        <article><header><span>EARLIER REVISION</span><h3>${esc(sectionLabel(selected.earlier))}</h3></header><pre>${esc(selected.content.earlierText)}</pre><button type="button" data-revision-source="earlier">Open in Source Inspector</button></article>
        <article><header><span>LATER REVISION</span><h3>${esc(sectionLabel(selected.later))}</h3></header><pre>${esc(selected.content.laterText)}</pre><button type="button" data-revision-source="later">Open in Source Inspector</button></article>
      </div>
      <section class="mc-revision-difference-group"><h3>Metadata and Structure</h3>${differences(selected.structuralDifferences, 'No objective structural differences.')}</section>
      <section class="mc-revision-difference-group"><h3>References</h3>${differences(referenceItems, 'No exact reference differences.')}</section>
      <section class="mc-revision-difference-group"><h3>Extraction</h3>${differences(selected.extractionDifferences, 'No extraction-field differences.')}</section>
    `;
  }
  $('#revisionWarnings').innerHTML = comparison.integrityWarnings.length
    ? `<ul class="mc-revision-warning-list">${comparison.integrityWarnings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`
    : '<div class="mc-revision-clear"><strong>No comparison integrity warnings</strong><span>All displayed pairs were resolved by exact deterministic rules.</span></div>';

  $$('[data-revision-filter]').forEach(button => button.onclick = () => {
    revisionFilter = button.dataset.revisionFilter;
    renderRevisionReview();
  });
  $$('[data-revision-match]').forEach(button => button.onclick = () => {
    selectedRevisionMatch = Number(button.dataset.revisionMatch);
    renderRevisionReview();
  });
  const openObject = side => {
    const document = side === 'earlier' ? earlier : later;
    const matchSection = comparison.matches[selectedRevisionMatch]?.[side];
    selectedDoc = document.id;
    selectedKnowledgeSection = 'all';
    sourceNavigationTarget = createSourceTarget({
      projectId: state().activeProject,
      libraryId: document.libraryId,
      documentId: document.id,
      sectionId: matchSection?.id || '',
      originatingWorkspace: 'revisions',
      destination: 'knowledge'
    });
    show('knowledge');
  };
  $$('[data-revision-object]').forEach(button => button.onclick = () => openObject(button.dataset.revisionObject));
  $$('[data-revision-source]').forEach(button => button.onclick = () => {
    const side = button.dataset.revisionSource;
    const document = side === 'earlier' ? earlier : later;
    const matchSection = comparison.matches[selectedRevisionMatch]?.[side];
    if (!matchSection?.id) return;
    selectedDoc = document.id;
    sourceNavigationTarget = createSourceTarget({
      projectId: state().activeProject,
      libraryId: document.libraryId,
      documentId: document.id,
      sectionId: matchSection.id,
      originatingWorkspace: 'revisions',
      destination: 'sources'
    });
    show('sources');
  });
  $('[data-revision-relationships]')?.addEventListener('click', () => {
    relationshipTarget = {
      ...relationshipNavigationTarget({ documentId: later.id, sectionId: selected?.later?.id || '' }),
      projectId: state().activeProject,
      libraryId: later.libraryId,
      originatingWorkspace: 'revisions'
    };
    selectedDoc = later.id;
    show('relationships');
  });
  $('[data-revision-engineering]')?.addEventListener('click', () =>
    openEngineeringWorkspace({ documentId: later.id, sectionId: selected?.later?.id || '', libraryId: later.libraryId, origin: 'revisions' })
  );
  $('[data-revision-version]')?.addEventListener('click', () => {
    lineageTarget = { ...lineageNavigationTarget(later.id), originatingWorkspace: 'revisions' };
    selectedDoc = later.id;
    show('versions');
  });
}

async function renderEngineeringWorkspace() {
  const currentState = state();
  const documents = await engine.documents();
  const sections = await engine.sections();
  const target = activeContextActivation;
  const context = target ? createEngineeringContext({
    ...target,
    projects: currentState.projects,
    documents,
    sections,
    retrievalSession: activeRetrievalSession
  }) : null;
  const documentById = id => documents.find(item => item.id === id);
  const sectionById = id => sections.find(item => item.id === id);
  const labelDocument = id => documentById(id)?.title || documentById(id)?.name || id;
  const labelSection = id => sectionHeadingValue(sectionById(id)) || id;
  const targetOrigin = target ? activationOrigin(target.source) : '';
  const originValid = target && ({
    chat: Boolean(activeRetrievalSession?.messageId && activeRetrievalSession.evidence.some(item => item.documentId === target.documentId)),
    evidence: Boolean(activeRetrievalSession?.evidence.some(item => item.documentId === target.documentId)),
    relationships: relationshipTarget?.documentId === target.documentId,
    knowledge: selectedDoc === target.documentId,
    versions: lineageTarget?.documentId === target.documentId,
    revisions: Boolean(revisionTarget && [revisionTarget.earlierDocumentId, revisionTarget.laterDocumentId].includes(target.documentId)),
    inspections: Boolean(selectedInspectionId)
  }[targetOrigin]);

  if (!context) {
    $('#engineeringHeader').innerHTML = '<div><span>ENGINEERING CONTEXT</span><h2>Engineering Context unavailable</h2><p>Open a Knowledge Object or ask an evidence-backed question to synchronize this workbench.</p></div>';
    $('#engineeringContext').innerHTML = `<div class="mc-context-activation-unavailable" role="status"><strong>No construction context selected.</strong><span>${contextClearedEvent ? `Current transition: cleared from ${esc(contextClearedEvent.source)}.` : 'Ask Chief a construction question or open an exact drawing, specification, or project record to synchronize this workspace.'}</span></div>`;
    $('#engineeringKnowledge').innerHTML = '<div class="mc-engineering-empty">Related project knowledge appears after an exact document establishes Engineering Context.</div>';
    $('#engineeringSession').innerHTML = '<div class="mc-engineering-empty">The temporary Inspection Session becomes available with an active Engineering Context.</div>';
    return;
  }
  let session = getInspectionSession();
  if (!session || session.context.projectId !== context.projectId || session.context.documentId !== context.documentId || session.context.sectionId !== context.sectionId) {
    session = startInspectionSession(context, { origin: activationOrigin(target.source) });
  }
  const seedDocument = documentById(context.documentId);
  const seedSection = sectionById(context.sectionId);
  const renderDocuments = (items, empty) => items.length
    ? `<ul>${items.map(item => `<li><strong>${esc(labelDocument(item.documentId))}</strong><span>${item.basis ? `Exact classification: ${esc(item.basis)}` : esc(item.documentId)}</span></li>`).join('')}</ul>`
    : `<div class="mc-engineering-empty">${esc(empty)}</div>`;
  const returnLabel = ({ chat: 'Back to Command Desk', evidence: 'Back to Evidence Explorer', relationships: 'Back to Relationship Explorer', knowledge: 'Back to Knowledge Object', versions: 'Back to Version Explorer', revisions: 'Back to Revision Review', inspections: 'Back to Inspection Records' })[targetOrigin] || '';

  $('#engineeringHeader').innerHTML = `
    <div><span>ENGINEERING CONTEXT</span><h2>${esc(seedDocument.title || seedDocument.name)}</h2><p>Project knowledge synchronized from ${esc(target.source)}.</p></div>
    <nav class="mc-engineering-actions" aria-label="Engineering workspace navigation">
      ${originValid ? `<button type="button" data-engineering-return>${esc(returnLabel)}</button>` : ''}
      <button type="button" class="subtle" data-engineering-object>Open Knowledge Object</button>
      <button type="button" class="subtle" data-engineering-source>Open Source Inspector</button>
      <button type="button" class="subtle" data-engineering-relationships>Relationship Explorer</button>
      <button type="button" class="subtle" data-engineering-versions>Version Explorer</button>
      <button type="button" class="subtle" data-engineering-inspection>Create Inspection Record</button>
      <button type="button" data-engineering-workflow>Open Workflow</button>
    </nav>
  `;
  $('#engineeringContext').innerHTML = `
    <dl class="mc-engineering-facts">
      <div><dt>Active document</dt><dd>${esc(seedDocument.title || seedDocument.name)}</dd></div><div><dt>Active section</dt><dd>${seedSection ? esc(labelSection(seedSection.id)) : 'Unavailable'}</dd></div>
      <div><dt>Related documents</dt><dd>${fmt(context.documentIds.length)}</dd></div><div><dt>Related sections</dt><dd>${fmt(context.sectionIds.length)}</dd></div>
      <div><dt>Building</dt><dd>${context.buildingId ? esc(context.buildingId) : 'Unavailable'}</dd></div><div><dt>Room</dt><dd>${context.roomId ? esc(context.roomId) : 'Unavailable'}</dd></div>
      <div><dt>Discipline</dt><dd>${context.discipline ? esc(context.discipline) : 'Unavailable'}</dd></div><div><dt>Trade</dt><dd>${context.trade ? esc(context.trade) : 'Unavailable'}</dd></div>
    </dl>
    <div class="mc-engineering-status ${context.incomplete ? 'incomplete' : 'complete'}"><strong>${context.incomplete ? 'Engineering Context incomplete' : 'Engineering Context ready'}</strong><span>${context.incomplete ? 'Some related evidence or relationship identifiers are unavailable.' : 'Available project knowledge has been synchronized.'}</span></div>
    ${context.unavailableFields.length ? `<div class="mc-engineering-unavailable"><strong>Unavailable context fields</strong><span>${esc(context.unavailableFields.join(', '))}</span></div>` : ''}
  `;
  const evidence = context.evidence.map(item => activeRetrievalSession?.evidence.find(candidate => candidate.id === item.id)).filter(Boolean);
  const referenced = context.referencedDocumentIds.map(documentId => ({ documentId, basis: '' }));
  const contextualList = items => items.length ? `<ul>${items.map(item => `<li><strong>${esc(labelDocument(item.documentId))}</strong><span>Contextual association only</span></li>`).join('')}</ul>` : '<div class="mc-engineering-empty">None available.</div>';
  $('#engineeringKnowledge').innerHTML = `
    <div class="mc-engineering-groups">
      <section><h3>Explicit Specifications <span>${context.classification.specifications.length}</span></h3>${renderDocuments(context.classification.specifications, 'No exactly classified specifications.')}</section>
      <section><h3>Exact Drawings <span>${context.classification.drawings.length}</span></h3>${renderDocuments(context.classification.drawings, 'No exactly classified drawings.')}</section>
      <section><h3>Exact Procedures <span>${context.classification.procedures.length}</span></h3>${renderDocuments(context.classification.procedures, 'No exactly classified procedures.')}</section>
      <section><h3>Unclassified <span>${context.classification.unclassified.length}</span></h3>${renderDocuments(context.classification.unclassified, 'No unclassified context documents.')}</section>
      <section><h3>Referenced Documents <span>${referenced.length}</span></h3>${renderDocuments(referenced, 'No resolved cross-document references.')}</section>
      <section><h3>Explicit Relationships <span>${context.relationshipIds.length}</span></h3>${context.relationshipIds.length ? `<ul>${context.relationshipIds.map(id => `<li><strong>${esc(id)}</strong></li>`).join('')}</ul>` : '<div class="mc-engineering-empty">No exact hierarchy or reference relationships.</div>'}</section>
      <section><h3>Contextual Same Division <span>${context.contextualSameDivision.length}</span></h3>${contextualList(context.contextualSameDivision)}</section>
      <section><h3>Contextual Same Library <span>${context.contextualSameLibrary.length}</span></h3>${contextualList(context.contextualSameLibrary)}</section>
      <section><h3>Active-Session Evidence <span>${evidence.length}</span></h3>${evidence.length ? `<ul>${evidence.map(item => `<li><strong>${esc(item.citationReference)} · ${esc(item.heading)}</strong><span>${esc(item.documentName)}</span></li>`).join('')}</ul>` : '<div class="mc-engineering-empty">No exact evidence from the active retrieval session.</div>'}</section>
      <section><h3>Version Status</h3><dl class="mc-engineering-mini-facts"><div><dt>Status</dt><dd>${esc(context.lineage.status)}</dd></div><div><dt>Current</dt><dd>${esc(context.lineage.currentDocumentId || 'Unavailable')}</dd></div><div><dt>Previous</dt><dd>${esc(context.lineage.previousDocumentId || 'Unavailable')}</dd></div><div><dt>Duplicates</dt><dd>${context.lineage.duplicateDocumentIds.length}</dd></div></dl></section>
    </div>
  `;
  const requirementItems = [
    ...context.classification.specifications.map(item => `Specification: ${labelDocument(item.documentId)}`),
    ...context.classification.procedures.map(item => `Procedure: ${labelDocument(item.documentId)}`),
    ...context.referencedDocumentIds.map(id => `Referenced document: ${labelDocument(id)}`),
    `Version status: ${context.lineage.status}`,
    ...context.warnings,
    ...context.unavailableFields.map(field => `Unavailable: ${field}`)
  ];
  $('#engineeringSession').innerHTML = `
    <section class="mc-engineering-summary"><h3>Requirements Summary</h3>${requirementItems.length ? `<ul>${requirementItems.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<div class="mc-engineering-empty">No objective requirements summary items are available.</div>'}</section>
    <section class="mc-engineering-notes"><label for="engineeringNotes"><strong>Temporary Inspection Notes</strong><span>Unsaved. Cleared when this context closes or is replaced.</span></label><textarea id="engineeringNotes" rows="8" placeholder="Temporary session notes">${esc(session.notes)}</textarea></section>
    <section class="mc-engineering-warnings"><h3>Context Warnings</h3>${context.warnings.length ? `<ul>${context.warnings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<div class="mc-engineering-clear">No explicit context warnings.</div>'}</section>
  `;
  $('#engineeringNotes')?.addEventListener('input', event => updateInspectionNotes(event.target.value));
  $('[data-engineering-return]')?.addEventListener('click', () => show(targetOrigin === 'knowledge' ? 'knowledge' : targetOrigin));
  $('[data-engineering-object]')?.addEventListener('click', () => { selectedDoc = context.documentId; selectedKnowledgeSection = 'all'; show('knowledge'); });
  $('[data-engineering-source]')?.addEventListener('click', () => { selectedDoc = context.documentId; show('sources'); });
  $('[data-engineering-relationships]')?.addEventListener('click', () => { relationshipTarget = { ...relationshipNavigationTarget({ documentId: context.documentId, sectionId: context.sectionId }), projectId: context.projectId, libraryId: context.libraryId, originatingWorkspace: 'engineering' }; show('relationships'); });
  $('[data-engineering-versions]')?.addEventListener('click', () => openVersionExplorer(context.documentId));
  $('[data-engineering-workflow]')?.addEventListener('click', () => {
    if (contextBusSnapshot.workflow.status === 'ambiguous') show('workflow');
    else openWorkflowWorkspace(contextBusSnapshot.workflow.workflowType || 'Inspection Preparation', 'engineering');
  });
  $('[data-engineering-inspection]')?.addEventListener('click', () => openInspectionForm());
}

async function renderWorkflowWorkspace() {
  const inspection = getInspectionSession();
  const context = inspection?.context || null;
  const documents = await engine.documents();
  const sections = await engine.sections();
  const revisions = buildRevisionMetrics({ documents, sections }).comparisons;
  if (contextBusSnapshot.workflow.status === 'ambiguous' && !workflowTarget) {
    $('#workflowHeader').innerHTML = '<div><span>SYNCHRONIZED ORCHESTRATION</span><h2>Select Workflow</h2><p>Multiple deterministic workflow templates qualify. Mission Companion will not guess.</p></div>';
    $('#workflowOverview').innerHTML = `<div class="mc-context-bus-workflow-choice" role="status"><strong>Select Workflow</strong><span>${esc(contextBusSnapshot.workflow.candidates.join(' · '))}</span><label>Workflow Type<select id="workflowType">${contextBusSnapshot.workflow.candidates.map(type => `<option>${esc(type)}</option>`).join('')}</select></label><button type="button" id="selectSynchronizedWorkflow">Load selected workflow</button></div>`;
    $('#workflowResources').innerHTML = '<div class="mc-workflow-empty">Workflow resources will appear after an explicit selection.</div>';
    $('#workflowSession').innerHTML = '<div class="mc-workflow-empty">Temporary notes begin after a workflow is selected.</div>';
    $('#selectSynchronizedWorkflow')?.addEventListener('click', () => {
      workflowTarget = workflowNavigationTarget({ workflowType: $('#workflowType').value, origin: activationOrigin(activeContextActivation.source) });
      renderWorkflowWorkspace();
    });
    return;
  }
  const workflow = createWorkflow({
    workflowType: workflowTarget?.workflowType,
    engineeringContext: context,
    documents,
    sections,
    revisionComparisons: revisions
  });
  const documentLabel = id => documents.find(item => item.id === id)?.title || documents.find(item => item.id === id)?.name || id;
  const sectionLabel = id => sectionHeadingValue(sections.find(item => item.id === id)) || id;
  const evidenceLabel = id => activeRetrievalSession?.evidence.find(item => item.id === id)?.citationReference || id;
  const originValid = workflowTarget && ({
    chat: Boolean(activeRetrievalSession?.messageId),
    engineering: Boolean(engineeringTarget && context),
    knowledge: selectedDoc === context?.documentId
  }[workflowTarget.origin]);

  $('#workflowHeader').innerHTML = `
    <div><span>WORKFLOW</span><h2>${esc(workflow.workflowType || 'Workflow unavailable')}</h2><p>Workflow status describes source availability only; it does not indicate compliance, acceptance, approval, or readiness to build.</p></div>
    <nav class="mc-workflow-actions" aria-label="Workflow navigation">
      ${originValid ? `<button type="button" data-workflow-return>Back to ${esc(workflowTarget.origin === 'chat' ? 'Command Desk' : workflowTarget.origin === 'knowledge' ? 'Knowledge Object' : 'Engineering Workspace')}</button>` : ''}
      ${context ? '<button type="button" class="subtle" data-workflow-engineering>Engineering Workspace</button>' : ''}
      ${workflow.workflowType === 'Inspection Preparation' ? '<button type="button" data-workflow-inspection>Create Inspection Record</button>' : ''}
    </nav>
  `;
  if (workflow.status === 'Unavailable') {
    clearWorkflowSession();
    $('#workflowOverview').innerHTML = '<div class="mc-workflow-empty"><strong>Workflow unavailable.</strong><span>Open a Knowledge Object or ask an evidence-backed question to establish Engineering Context.</span></div>';
    $('#workflowResources').innerHTML = '<div class="mc-workflow-empty">Workflow resources appear after a valid Engineering Context and Workflow are selected.</div>';
    $('#workflowSession').innerHTML = '<div class="mc-workflow-empty">Temporary Workflow Session notes become available when a Workflow loads.</div>';
    return;
  }
  let session = getWorkflowSession();
  if (session?.workflow.workflowId !== workflow.workflowId) session = startWorkflowSession(workflow, { origin: workflowTarget.origin });
  const renderIds = (ids, label, empty) => ids.length
    ? `<ul>${ids.map(id => `<li><strong>${esc(label(id))}</strong><span>${esc(id)}</span></li>`).join('')}</ul>`
    : `<div class="mc-workflow-empty">${esc(empty)}</div>`;
  $('#workflowOverview').innerHTML = `
    <label class="mc-workflow-selector">Workflow Type<select id="workflowType">${WORKFLOW_TYPES.map(type => `<option ${type === workflow.workflowType ? 'selected' : ''}>${esc(type)}</option>`).join('')}</select></label>
    <div class="mc-workflow-status ${workflow.status.toLowerCase()}" role="status"><strong>${esc(workflow.status)}</strong><span>${workflow.missingGroups.length ? `${workflow.missingGroups.length} required identifier group(s) unavailable` : 'All template-required identifier groups are available'}</span></div>
    <dl class="mc-workflow-facts"><div><dt>Workflow ID</dt><dd>${esc(workflow.workflowId)}</dd></div><div><dt>Context ID</dt><dd>${esc(workflow.engineeringContextId)}</dd></div><div><dt>Project ID</dt><dd>${esc(workflow.projectId)}</dd></div><div><dt>Seed document</dt><dd>${esc(workflow.seedDocumentId)}</dd></div></dl>
    ${workflow.missingGroups.length ? `<div class="mc-workflow-missing"><strong>Unavailable groups</strong><span>${esc(workflow.missingGroups.join(', '))}</span></div>` : ''}
  `;
  $('#workflowResources').innerHTML = `
    <div class="mc-workflow-groups">
      <section><h3>Required Documents <span>${workflow.requiredDocumentIds.length}</span></h3>${renderIds(workflow.requiredDocumentIds, documentLabel, 'No required document identifiers.')}</section>
      <section><h3>Required Sections <span>${workflow.requiredSectionIds.length}</span></h3>${renderIds(workflow.requiredSectionIds, sectionLabel, 'No required section identifiers.')}</section>
      <section><h3>Evidence <span>${workflow.evidenceIds.length}</span></h3>${renderIds(workflow.evidenceIds, evidenceLabel, 'No exact active-session evidence identifiers.')}</section>
      <section><h3>Relationships <span>${workflow.relationshipIds.length}</span></h3>${renderIds(workflow.relationshipIds, id => id, 'No explicit relationship identifiers.')}</section>
      <section><h3>Version Status <span>${workflow.lineageIds.length}</span></h3>${renderIds(workflow.lineageIds, id => id, 'No explicit lineage identifiers.')}</section>
      <section><h3>Revision Status <span>${workflow.revisionIds.length}</span></h3>${renderIds(workflow.revisionIds, id => id, 'No comparable revision-pair identifiers.')}</section>
    </div>
  `;
  $('#workflowSession').innerHTML = `
    <section class="mc-workflow-warnings"><h3>Warnings</h3>${workflow.warnings.length ? `<ul>${workflow.warnings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<div class="mc-workflow-clear">No workflow availability warnings.</div>'}</section>
    <section class="mc-workflow-notes"><label for="workflowNotes"><strong>Temporary Workflow Notes</strong><span>Unsaved. Cleared when the workflow or Engineering Context changes.</span></label><textarea id="workflowNotes" rows="9" placeholder="Temporary workflow notes">${esc(session.notes)}</textarea></section>
  `;
  $('#workflowType')?.addEventListener('change', event => {
    workflowTarget = workflowNavigationTarget({ workflowType: event.target.value, origin: workflowTarget.origin });
    clearWorkflowSession();
    renderWorkflowWorkspace();
  });
  $('#workflowNotes')?.addEventListener('input', event => updateWorkflowNotes(event.target.value));
  $('[data-workflow-return]')?.addEventListener('click', () => show(workflowTarget.origin === 'knowledge' ? 'knowledge' : workflowTarget.origin));
  $('[data-workflow-engineering]')?.addEventListener('click', () => show('engineering'));
  $('[data-workflow-inspection]')?.addEventListener('click', () => openInspectionForm());
}

function inspectionLocation(record) {
  return [record.building, record.area, record.room].filter(Boolean).join(' · ') || 'Location unavailable';
}

function inspectionPrefill() {
  const context = getInspectionSession()?.context;
  if (!context || context.projectId !== state().activeProject) return {};
  return {
    projectId: context.projectId,
    building: context.buildingId,
    room: context.roomId,
    trade: context.trade,
    discipline: context.discipline,
    sourceDocumentIds: context.documentIds,
    sourceSectionIds: context.sectionIds,
    relatedDrawingIds: context.classification.drawings.map(item => item.documentId),
    relatedSpecificationIds: context.classification.specifications.map(item => item.documentId),
    relationshipIds: context.relationshipIds,
    versionIds: context.versionIds,
    workflowTemplateId: workflowTarget?.workflowType === 'Inspection Preparation' ? 'Inspection Preparation' : '',
    evidenceReferences: []
  };
}

async function openInspectionForm(record = null, requestedPrefill = null) {
  const prefill = record || requestedPrefill || inspectionPrefill();
  const context = getInspectionSession()?.context;
  const evidenceCandidates = record ? [] : requestedPrefill?.evidenceReferences?.length ? requestedPrefill.evidenceReferences : (activeRetrievalSession?.evidence || []).filter(item =>
    context && (context.documentIds.includes(item.documentId) || context.sectionIds.includes(item.sectionId))
  ).map(item => ({ documentId: item.documentId, sectionId: item.sectionId }));
  const number = record?.inspectionNumber || await engine.nextInspectionNumber();
  openModal(`
    <form id="inspectionRecordForm" class="mc-inspection-form">
      <h2>${record ? `Edit ${esc(record.inspectionNumber)}` : 'Create Inspection Record'}</h2>
      <p>Conclusions, observations, results, and follow-up decisions are entered deliberately by the inspector.</p>
      <div class="mc-inspection-form-grid">
        <label>Inspection number<input value="${esc(number)}" disabled></label>
        <label>Inspection date<input id="inspectionDate" type="date" value="${esc(record?.inspectionDate || '')}" required></label>
        <label class="wide">Title<input id="inspectionTitle" value="${esc(record?.title || '')}" required></label>
        <label>Inspection type<input id="inspectionType" value="${esc(record?.inspectionType || '')}"></label>
        <label>Inspector name<input id="inspectionInspector" value="${esc(record?.inspectorName || '')}"></label>
        <label>Status<select id="inspectionStatus">${INSPECTION_STATUSES.map(value => `<option ${value === (record?.status || 'Draft') ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Result<select id="inspectionResult">${INSPECTION_RESULTS.map(value => `<option ${value === (record?.result || 'Not Evaluated') ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        ${['building','area','room','trade','discipline'].map(field => `<label>${field[0].toUpperCase() + field.slice(1)}<input id="inspection${field[0].toUpperCase() + field.slice(1)}" value="${esc(record?.[field] || prefill[field] || '')}"></label>`).join('')}
        <label class="wide">Description<textarea id="inspectionDescription">${esc(record?.description || '')}</textarea></label>
        <label class="wide">Scope<textarea id="inspectionScope">${esc(record?.scope || '')}</textarea></label>
        <label class="wide">Observed conditions<textarea id="inspectionObserved">${esc(record?.observedConditions || '')}</textarea></label>
        <label class="wide">Notes<textarea id="inspectionNotes">${esc(record?.notes || '')}</textarea></label>
        <label class="check"><input id="inspectionCorrective" type="checkbox" ${record?.correctiveActionRequired ? 'checked' : ''}> Corrective action required</label>
        <label class="check"><input id="inspectionFollowUp" type="checkbox" ${record?.followUpRequired ? 'checked' : ''}> Follow-up required</label>
        ${evidenceCandidates.length ? `<label class="check wide"><input id="inspectionAttachEvidence" type="checkbox"> Attach ${evidenceCandidates.length} exact source reference(s) from the active retrieval session</label>` : ''}
        <label>Follow-up date<input id="inspectionFollowUpDate" type="date" value="${esc(record?.followUpDate || '')}"></label>
      </div>
      <div class="mc-inspection-reference-note"><strong>Exact source references</strong><span>${(record?.sourceDocumentIds || prefill.sourceDocumentIds || []).length} documents · ${(record?.sourceSectionIds || prefill.sourceSectionIds || []).length} sections · ${(record?.evidenceReferences || prefill.evidenceReferences || []).length} saved evidence source references</span></div>
      <div class="mc-inspection-form-actions"><button type="button" class="subtle" data-inspection-cancel>Cancel</button><button type="submit">Save Inspection Record</button></div>
    </form>`, () => {
      let dirty = false;
      modalCloseGuard = () => !dirty || confirm('Discard unsaved Inspection Record changes?');
      $('#inspectionRecordForm').addEventListener('input', () => { dirty = true; });
      $('[data-inspection-cancel]').onclick = () => closeModal();
      $('#inspectionRecordForm').onsubmit = async event => {
        event.preventDefault();
        const base = record || prefill;
        const input = {
          ...base,
          inspectionNumber: number,
          title: $('#inspectionTitle').value,
          inspectionType: $('#inspectionType').value,
          status: $('#inspectionStatus').value,
          result: $('#inspectionResult').value,
          inspectionDate: $('#inspectionDate').value,
          inspectorName: $('#inspectionInspector').value,
          building: $('#inspectionBuilding').value,
          area: $('#inspectionArea').value,
          room: $('#inspectionRoom').value,
          trade: $('#inspectionTrade').value,
          discipline: $('#inspectionDiscipline').value,
          description: $('#inspectionDescription').value,
          scope: $('#inspectionScope').value,
          observedConditions: $('#inspectionObserved').value,
          notes: $('#inspectionNotes').value,
          correctiveActionRequired: $('#inspectionCorrective').checked,
          followUpRequired: $('#inspectionFollowUp').checked,
          followUpDate: $('#inspectionFollowUpDate').value,
          evidenceReferences: record?.evidenceReferences || requestedPrefill?.evidenceReferences || ($('#inspectionAttachEvidence')?.checked ? evidenceCandidates : [])
        };
        try {
          const saved = record
            ? await engine.updateInspectionRecord(record.inspectionId, input)
            : await engine.createInspectionRecord(input);
          selectedInspectionId = saved.inspectionId;
          closeModal(true);
          await renderInspectionRecords();
        } catch (error) { alert(error.message); }
      };
    });
}

async function activateInspectionRecord(record) {
  const [documents, sections] = await Promise.all([engine.documents(), engine.sections()]);
  const seed = inspectionContextSeed(record, { documents, sections });
  if (!seed) return false;
  const result = await activateEngineeringContext({ ...seed, source: CONTEXT_ACTIVATION_SOURCES.inspectionRecord });
  return result.available;
}

async function renderInspectionRecords() {
  const includeArchived = $('#inspectionShowArchived')?.checked === true;
  const [records, documents, sections] = await Promise.all([
    engine.inspectionRecords({ includeArchived }), engine.documents(), engine.sections()
  ]);
  const query = ($('#inspectionSearch')?.value || '').trim().toLowerCase();
  const locationQuery = ($('#inspectionLocationFilter')?.value || '').trim().toLowerCase();
  const status = $('#inspectionStatusFilter')?.value || '';
  const sort = $('#inspectionSort')?.value || 'number';
  const visible = records.filter(record =>
    (!status || record.status === status) &&
    (!query || [record.inspectionNumber, record.title, inspectionLocation(record), record.trade].join(' ').toLowerCase().includes(query)) &&
    (!locationQuery || inspectionLocation(record).toLowerCase().includes(locationQuery))
  ).sort((a, b) => sort === 'date'
    ? b.inspectionDate.localeCompare(a.inspectionDate) || a.inspectionNumber.localeCompare(b.inspectionNumber)
    : a.inspectionNumber.localeCompare(b.inspectionNumber));
  if (selectedInspectionId && !records.some(record => record.inspectionId === selectedInspectionId)) selectedInspectionId = null;
  $('#inspectionList').innerHTML = visible.length ? `<div class="mc-inspection-list">${visible.map(record => `
    <button class="mc-inspection-card ${record.inspectionId === selectedInspectionId ? 'active' : ''}" data-inspection-id="${esc(record.inspectionId)}" ${record.inspectionId === selectedInspectionId ? 'aria-current="true"' : ''}>
      <span><strong>${esc(record.inspectionNumber)}</strong><small>${esc(record.status)}${record.archivedAt ? ' · Archived' : ''}</small></span>
      <h3>${esc(record.title)}</h3><p>${esc(record.inspectionDate)} · ${esc(inspectionLocation(record))}</p>
      <footer><span>${esc(record.trade || 'Trade unavailable')}</span><span>${esc(record.result)}</span>${record.followUpRequired ? '<b>Follow-up</b>' : ''}</footer>
    </button>`).join('')}</div>` : '<div class="mc-inspection-empty"><strong>No matching Inspection Records.</strong><span>Create a record or adjust the active filters.</span></div>';
  $$('[data-inspection-id]').forEach(button => button.onclick = async () => {
    selectedInspectionId = button.dataset.inspectionId;
    const record = records.find(item => item.inspectionId === selectedInspectionId);
    await activateInspectionRecord(record);
    renderInspectionRecords();
  });
  const record = records.find(item => item.inspectionId === selectedInspectionId);
  if (!record) {
    $('#inspectionDetail').innerHTML = '<div class="mc-inspection-empty"><strong>No Inspection Record selected.</strong><span>Select a record to review its user-authored observations and exact source links.</span></div>';
    return;
  }
  const documentLink = id => documents.find(item => item.id === id);
  const sectionLink = id => sections.find(item => item.id === id);
  const links = (ids, resolver) => ids.length ? `<ul>${ids.map(id => { const item = resolver(id); const label = item ? item.title || item.name || sectionHeadingValue(item) : id; return `<li class="${item ? '' : 'unavailable'}"><strong>${esc(label)}</strong><span>${item ? esc(id) : `Unavailable reference: ${esc(id)}`}</span></li>`; }).join('')}</ul>` : '<p>None linked.</p>';
  $('#inspectionDetail').innerHTML = `
    <article class="mc-inspection-detail">
      <header><span>${esc(record.inspectionNumber)}</span><h2>${esc(record.title)}</h2><p>${esc(record.status)} · ${esc(record.result)}</p></header>
      <div class="mc-inspection-actions"><button data-inspection-edit>Edit</button>${record.archivedAt ? '' : '<button class="danger" data-inspection-archive>Archive</button>'}${['Closed','Cancelled'].includes(record.status) ? '<button class="subtle" data-inspection-reopen>Explicitly reopen</button>' : ''}</div>
      <dl><div><dt>Date</dt><dd>${esc(record.inspectionDate)}</dd></div><div><dt>Inspector</dt><dd>${esc(record.inspectorName || 'Unavailable')}</dd></div><div><dt>Location</dt><dd>${esc(inspectionLocation(record))}</dd></div><div><dt>Trade / discipline</dt><dd>${esc([record.trade, record.discipline].filter(Boolean).join(' · ') || 'Unavailable')}</dd></div><div><dt>Workflow</dt><dd>${esc(record.workflowTemplateId || 'Unavailable')}</dd></div><div><dt>Updated</dt><dd>${esc(record.updatedAt || 'Unavailable')}</dd></div></dl>
      ${[['Scope',record.scope],['Observed Conditions',record.observedConditions],['Notes',record.notes]].map(([label,value]) => `<section><h3>${label}</h3><p>${esc(value || 'Not recorded.')}</p></section>`).join('')}
      <section><h3>Corrective Action and Follow-Up</h3><p>${record.correctiveActionRequired ? 'Corrective action required.' : 'No corrective action marked.'} ${record.followUpRequired ? `Follow-up required${record.followUpDate ? ` on ${esc(record.followUpDate)}` : ''}.` : 'No follow-up marked.'}</p></section>
      <section><h3>Source Documents</h3>${links(record.sourceDocumentIds, documentLink)}</section>
      <section><h3>Source Sections</h3>${links(record.sourceSectionIds, sectionLink)}</section>
      <section><h3>Evidence References</h3>${record.evidenceReferences.length ? links(record.evidenceReferences.map(item => item.sectionId), sectionLink) : '<p>None linked from the active retrieval session.</p>'}</section>
      <section><h3>Related Records</h3>${links([...record.relatedDrawingIds,...record.relatedSpecificationIds,...record.relatedRfiIds,...record.relatedSubmittalIds,...record.relatedDeficiencyIds], documentLink)}</section>
      <nav class="mc-inspection-navigation" aria-label="Inspection source navigation"><button data-inspection-engineering>Engineering Workspace</button><button data-inspection-source>Source Inspector</button><button data-inspection-evidence>Evidence Explorer</button><button data-inspection-relationships>Relationship Explorer</button><button data-inspection-workflow>Workflow Workspace</button></nav>
    </article>`;
  $('[data-inspection-edit]').onclick = () => openInspectionForm(record);
  $('[data-inspection-archive]')?.addEventListener('click', async () => { if (confirm(`Archive ${record.inspectionNumber}? Its number will not be reused.`)) { await engine.archiveInspectionRecord(record.inspectionId); selectedInspectionId = null; await renderInspectionRecords(); } });
  $('[data-inspection-reopen]')?.addEventListener('click', async () => { if (confirm(`Explicitly reopen ${record.inspectionNumber} as In Progress?`)) { await engine.updateInspectionRecord(record.inspectionId, { status: 'In Progress' }, { reopen: true }); await renderInspectionRecords(); } });
  $('[data-inspection-engineering]').onclick = async () => { if (await activateInspectionRecord(record)) show('engineering'); else alert('No exact source reference is available to establish Engineering Context.'); };
  $('[data-inspection-source]').onclick = async () => { if (!(await activateInspectionRecord(record))) return alert('No exact source reference is available.'); selectedDoc = activeContextActivation.documentId; sourceNavigationTarget = createSourceTarget({ ...activeContextActivation, originatingWorkspace: 'inspections', destination: 'sources' }); show('sources'); };
  $('[data-inspection-evidence]').onclick = () => show('evidence');
  $('[data-inspection-relationships]').onclick = async () => { if (!(await activateInspectionRecord(record))) return; relationshipTarget = { ...relationshipNavigationTarget({ documentId: activeContextActivation.documentId, sectionId: activeContextActivation.sectionId }), originatingWorkspace: 'inspections' }; show('relationships'); };
  $('[data-inspection-workflow]').onclick = async () => { if (await activateInspectionRecord(record)) openWorkflowWorkspace(record.workflowTemplateId || 'Inspection Preparation', 'inspections'); };
}

$('#createInspectionRecord').onclick = () => openInspectionForm();
for (const id of ['inspectionSearch','inspectionStatusFilter','inspectionLocationFilter','inspectionSort','inspectionShowArchived']) {
  $(`#${id}`).addEventListener(id.includes('Search') || id.includes('Location') ? 'input' : 'change', renderInspectionRecords);
}

$('#upload').onclick = () => $('#fileInput').click();

const importStageCopy = {
  queued: 'Queued',
  extracting: 'Extracting',
  detecting: 'Detecting sections',
  indexing: 'Indexing',
  verifying: 'Verifying',
  ready: 'Ready',
  failed: 'Failed',
  skipped: 'Duplicate detected'
};

function importFailureMessage(stage) {
  return {
    extracting: 'Mission Companion could not read or extract this document.',
    detecting: 'Mission Companion could not detect document sections.',
    indexing: 'Mission Companion could not save the document and its sections.',
    verifying: 'Mission Companion could not verify the imported document.',
    queued: 'Mission Companion could not start the document import.'
  }[stage] || 'Mission Companion could not complete this document import.';
}

function updateQueueProgress(progress) {
  const stage = importStageCopy[progress.stage]
    ? progress.stage
    : 'extracting';

  importQueue = importQueue.map((queueItem, index) =>
    index === progress.current - 1
      ? {
          ...queueItem,
          status: 'processing',
          stage,
          detail: importStageCopy[stage],
          technicalDetail: ''
        }
      : queueItem
  );

  renderImportQueue();

  $('#ingestStatus').innerHTML = `
    <div class="progress">
      ${esc(importStageCopy[stage])}: ${esc(progress.name)}
      (${progress.current}/${progress.total})
    </div>
  `;
}

async function refreshAfterImport() {
  await refresh();
  await renderSources();
  await renderEvals();
}

$('#fileInput').onchange = async () => {
  const files = [...$('#fileInput').files];

  if (!files.length) {
    return;
  }

  const libraryId = state().activeLibrary;

  importQueue = files.map(file =>
    createImportQueueItem(file, libraryId)
  );

  renderImportQueue();

  $('#ingestStatus').innerHTML = '<div class="progress">Preparing files…</div>';

  try {
    const result = await engine.ingest(
      files,
      updateQueueProgress,
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
        return failImportQueueItem(
          queueItem,
          importFailureMessage(queueItem.stage),
          [
            failed.error || failed.healthDetail || 'Document extraction failed.',
            failed.errorStack || ''
          ].filter(Boolean).join('\n\n')
        );
      }

      if (skipped) {
        return {
          ...queueItem,
          status: 'skipped',
          stage: 'skipped',
          detail: duplicateDetail(skipped),
          duplicate: skipped.duplicate,
          technicalDetail: ''
        };
      }

      return completeImportQueueItem(queueItem);
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
        : failImportQueueItem(
            queueItem,
            importFailureMessage(queueItem.stage),
            error.message
          )
    );

    logger.error('Document import failed', {
      files: files.map(file => file.name),
      message: error.message,
      stack: error.stack || ''
    });

    renderImportQueue();

    $('#ingestStatus').innerHTML = `
      <div class="error">
        Import failed. Review the queue item for available actions.
      </div>
    `;
  } finally {
    $('#fileInput').value = '';
    await refreshAfterImport();
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

  if (!queueItem || queueItem.status === 'processing') {
    return;
  }

  if (!queueItem.file) {
    importQueue = importQueue.map(item => item.id === queueId
      ? {
          ...item,
          status: 'error',
          stage: 'failed',
          detail: 'Select this document again to retry the import.',
          technicalDetail: 'The browser no longer provides access to the original File object.'
        }
      : item
    );
    renderImportQueue();
    return;
  }

  importQueue = importQueue.map(item => item.id === queueId
    ? {
        ...item,
        status: 'processing',
        stage: 'extracting',
        detail: duplicateAction === 'replace'
          ? 'Replacing existing document'
          : 'Extracting',
        technicalDetail: ''
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
              status: 'processing',
              stage: progress.stage || 'extracting',
              detail:
                importStageCopy[progress.stage] ||
                'Extracting'
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
      ? completeImportQueueItem(
          item,
          `Indexed and verified (${document.sectionCount} sections)`
        )
      : item
    );
    $('#ingestStatus').innerHTML = `
      <div class="success">
        Indexed ${result.sections.length} sections from 1 document.
      </div>
    `;
  } catch (error) {
    const failedQueueItem = importQueue.find(item => item.id === queueId);

    importQueue = importQueue.map(item => item.id === queueId
      ? failImportQueueItem(
          item,
          importFailureMessage(failedQueueItem?.stage),
          error.message
        )
      : item
    );

    logger.error('Document import retry failed', {
      file: queueItem.name,
      message: error.message,
      stack: error.stack || ''
    });

    $('#ingestStatus').innerHTML = `
      <div class="error">
        Import failed. Review the queue item for available actions.
      </div>
    `;
  } finally {
    renderImportQueue();
    await refreshAfterImport();
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
            <span class="mc-import-stage">
              ${esc(importStageCopy[queueItem.stage] || queueItem.detail)}
            </span>
            <small>${esc(queueItem.detail)}</small>
            ${queueItem.status === 'error' && queueItem.technicalDetail
              ? `
                <details class="mc-import-technical">
                  <summary>View technical details</summary>
                  <pre>${esc(queueItem.technicalDetail)}</pre>
                </details>
              `
              : ''}
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
                : queueItem.status === 'complete'
                  ? `
                    <div class="queue-actions">
                      <button class="subtle" data-queue-id="${esc(queueItem.id)}" data-import-action="dismiss">Dismiss</button>
                    </div>
                  `
                  : ''}
          </div>
        </article>
      `).join('')
    : '<div class="empty">No imports in this session. Use Add documents to begin an import.</div>';

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
        ${project.isDemonstration ? '<div class="mc-demo-project-label"><strong>Demonstration Project</strong><small>Fictional Sample Data</small></div>' : ''}
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
    button.onclick = async () => {
      selectedDoc = button.dataset.documentSelect;
      if (sourceNavigationTarget?.documentId !== selectedDoc) {
        sourceNavigationTarget = null;
        sourceNavigationNotice = '';
      }

      const document = documents.find(item => item.id === selectedDoc);
      if (document) await activateEngineeringContext({
        projectId: state().activeProject,
        libraryId: document.libraryId,
        documentId: document.id,
        source: CONTEXT_ACTIVATION_SOURCES.knowledgeCatalog
      });

      renderDocumentMetadata(
        document,
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
  const extraction = verifyExtraction(
    document,
    allSections,
    allDocuments
  );
  const objectSourceResolution = sourceNavigationTarget?.destination === 'knowledge' &&
    sourceNavigationTarget.documentId === document.id
    ? resolveSourceTarget(sourceNavigationTarget, {
        projects: state().projects,
        libraries: engine.libraries(),
        documents: allDocuments,
        sections: allSections
      })
    : null;
  const specificationResolution = sourceNavigationTarget?.destination === 'knowledge' &&
    sourceNavigationTarget.documentId === document.id
    ? resolveSpecificationNavigationTarget(sourceNavigationTarget, {
        projects: state().projects,
        libraries: engine.libraries(),
        documents: allDocuments,
        sections: allSections
      })
    : null;
  const rfiResolution = sourceNavigationTarget?.destination === 'rfi' &&
    sourceNavigationTarget.documentId === document.id
    ? resolveRfiNavigationTarget(sourceNavigationTarget, {
        projects: state().projects,
        libraries: engine.libraries(),
        documents: allDocuments,
        sections: allSections
      })
    : null;
  const submittalResolution = sourceNavigationTarget?.destination === 'submittal' &&
    sourceNavigationTarget.documentId === document.id
    ? resolveSubmittalNavigationTarget(sourceNavigationTarget, {
        projects: state().projects,
        libraries: engine.libraries(),
        documents: allDocuments,
        sections: allSections
      })
    : null;
  const objectTargetSection = submittalResolution?.section || rfiResolution?.section || specificationResolution?.section || (objectSourceResolution?.status === 'section'
    ? objectSourceResolution.section
    : null);
  const objectRelationshipModel = buildKnowledgeRelationships({
    documents: allDocuments,
    sections: allSections
  });
  const objectRelationshipContext = relationshipContext(
    objectRelationshipModel,
    {
      documentId: document.id,
      sectionId: objectTargetSection?.id || ''
    }
  );
  const objectLineageModel = buildDocumentLineage({
    documents: allDocuments,
    sections: allSections
  });
  const objectLineage = lineageForDocument(objectLineageModel, document.id);
  const objectExplicitReferences = objectTargetSection
    ? objectRelationshipContext.references.length
    : objectRelationshipModel.explicitReferences.filter(edge =>
        edge.sourceDocumentId === document.id
      ).length;
  const objectReverseReferences = objectTargetSection
    ? objectRelationshipContext.referencedBy.length
    : objectRelationshipModel.reverseReferences.filter(edge =>
        edge.sourceDocumentId === document.id
      ).length;
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
    ${(objectSourceResolution || rfiResolution || submittalResolution)
      ? `
        <nav class="mc-source-target-return" aria-label="Source navigation">
          <strong>Evidence source context</strong>
          <div>
            <button type="button" data-source-return-evidence>Back to Evidence Explorer</button>
            ${sourceNavigationTarget.originatingWorkspace === 'relationships'
              ? '<button type="button" data-source-return-relationships>Back to Relationship Explorer</button>'
              : ''}
            ${sourceNavigationTarget.originatingWorkspace === 'revisions'
              ? '<button type="button" data-source-return-revisions>Back to Revision Review</button>'
              : ''}
            ${sourceNavigationTarget.originatingMessageId && state().chat.some(message => message.id === sourceNavigationTarget.originatingMessageId)
              ? '<button type="button" class="subtle" data-source-return-answer>Back to Answer</button>'
              : ''}
            <button type="button" class="subtle" data-source-open-inspector>Open in Source Inspector</button>
          </div>
        </nav>
      `
      : ''}
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

    ${rfiResolution ? `
      <section class="mc-object-section" aria-labelledby="objectRfiTitle">
        <h4 id="objectRfiTitle">Exact RFI</h4>
        <div class="mc-object-structure">
          <article><span>Record</span><strong>${esc(rfiResolution.recordNumber || 'Unavailable')}</strong></article>
          <article><span>Status</span><strong>${esc(rfiResolution.explicitStatus || 'Unavailable')}</strong></article>
          <article><span>Category</span><strong>${esc(rfiResolution.category || 'Unavailable')}</strong></article>
          <article><span>Type</span><strong>${esc(rfiResolution.type || 'Unavailable')}</strong></article>
        </div>
        <dl class="mc-object-facts mc-object-facts-compact">
          <div><dt>Title</dt><dd>${esc(rfiResolution.title || document.title || document.name)}</dd></div>
          <div><dt>Hierarchy</dt><dd>${esc(rfiResolution.hierarchy.join(' › ') || 'Unavailable')}</dd></div>
          <div><dt>Provenance</dt><dd>${esc(rfiResolution.provenance || 'Unavailable')}</dd></div>
          <div><dt>Tags</dt><dd>${rfiResolution.tags.length ? esc(rfiResolution.tags.join(', ')) : 'Unavailable'}</dd></div>
        </dl>
        ${rfiResolution.section ? `
          <div class="mc-object-structure">
            <article><span>Section number</span><strong>${esc(sectionNumberKey(rfiResolution.section) || 'Unavailable')}</strong></article>
            <article><span>Section title</span><strong>${esc(sectionHeadingValue(rfiResolution.section) || 'Unavailable')}</strong></article>
          </div>
          <pre>${esc(rfiResolution.sectionText || sectionTextValue(rfiResolution.section))}</pre>
        ` : ''}
        ${rfiResolution.notice ? `
          <div class="mc-source-target-unavailable" role="status">
            <strong>RFI unavailable</strong>
            <span>${esc(rfiResolution.notice)}</span>
          </div>
        ` : ''}
      </section>
    ` : ''}

    ${submittalResolution ? `
      <section class="mc-object-section" aria-labelledby="objectSubmittalTitle">
        <h4 id="objectSubmittalTitle">Exact Submittal</h4>
        <div class="mc-object-structure">
          <article><span>Record</span><strong>${esc(submittalResolution.recordNumber || 'Unavailable')}</strong></article>
          <article><span>Status</span><strong>${esc(submittalResolution.explicitStatus || 'Unavailable')}</strong></article>
          <article><span>Category</span><strong>${esc(submittalResolution.category || 'Unavailable')}</strong></article>
          <article><span>Type</span><strong>${esc(submittalResolution.type || 'Unavailable')}</strong></article>
        </div>
        <dl class="mc-object-facts mc-object-facts-compact">
          <div><dt>Title</dt><dd>${esc(submittalResolution.title || document.title || document.name)}</dd></div>
          <div><dt>Hierarchy</dt><dd>${esc(submittalResolution.hierarchy.join(' › ') || 'Unavailable')}</dd></div>
          <div><dt>Provenance</dt><dd>${esc(submittalResolution.provenance || 'Unavailable')}</dd></div>
          <div><dt>Tags</dt><dd>${submittalResolution.tags.length ? esc(submittalResolution.tags.join(', ')) : 'Unavailable'}</dd></div>
        </dl>
        ${submittalResolution.section ? `
          <div class="mc-object-structure">
            <article><span>Section number</span><strong>${esc(sectionNumberKey(submittalResolution.section) || 'Unavailable')}</strong></article>
            <article><span>Section title</span><strong>${esc(sectionHeadingValue(submittalResolution.section) || 'Unavailable')}</strong></article>
          </div>
          <pre>${esc(submittalResolution.sectionText || sectionTextValue(submittalResolution.section))}</pre>
        ` : ''}
        ${submittalResolution.notice ? `
          <div class="mc-source-target-unavailable" role="status">
            <strong>Submittal unavailable</strong>
            <span>${esc(submittalResolution.notice)}</span>
          </div>
        ` : ''}
      </section>
    ` : ''}

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

    <section class="mc-object-section mc-extraction-object-summary" aria-labelledby="objectExtractionTitle">
      <div class="mc-extraction-object-heading">
        <h4 id="objectExtractionTitle">Extraction Health</h4>
        <button type="button" id="openObjectSourceInspector" class="subtle">
          Open Source Inspector
        </button>
      </div>
      <div class="mc-source-health-status ${esc(extraction.verificationStatus.toLowerCase().replace(/\s+/g, '-'))}">
        <strong>${esc(extraction.verificationStatus)}</strong>
        <span>${esc(extraction.retrievalReadiness)}</span>
      </div>
      <dl class="mc-object-facts mc-object-facts-compact">
        <div><dt>Usable text</dt><dd>${extraction.usableText ? 'Available' : 'Unavailable'}</dd></div>
        <div><dt>Actual indexed sections</dt><dd>${fmt(extraction.sections.length)}</dd></div>
        <div><dt>Warnings</dt><dd>${fmt(extraction.warningCount)}</dd></div>
        <div><dt>Failed checks</dt><dd>${fmt(extraction.failCount)}</dd></div>
      </dl>
    </section>

    <section class="mc-object-section mc-lineage-object-summary" aria-labelledby="objectLineageTitle">
      <div class="mc-lineage-object-heading">
        <h4 id="objectLineageTitle">Version Information</h4>
        <button type="button" class="subtle" data-object-lineage>Open Version Explorer</button>
      </div>
      <div class="mc-lineage-status ${esc(objectLineage.record?.status || 'unknown')}">
        <strong>${esc((objectLineage.record?.status || 'unknown').toUpperCase())}</strong>
        <span>${objectLineage.record?.lineageId ? `Lineage ${esc(objectLineage.record.lineageId)}` : 'No explicit lineage metadata'}</span>
      </div>
      <dl class="mc-object-facts mc-object-facts-compact">
        <div><dt>Current document</dt><dd>${objectLineage.current?.documentId ? esc(objectLineage.current.documentId) : 'Unknown'}</dd></div>
        <div><dt>Previous versions</dt><dd>${fmt(objectLineage.chain?.previous.length || 0)}</dd></div>
        <div><dt>Duplicates</dt><dd>${fmt(objectLineage.chain?.duplicates.length || 0)}</dd></div>
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

    ${objectTargetSection && (specificationResolution?.section || rfiResolution?.section || submittalResolution?.section) ? `
      <section class="mc-object-section mc-object-section-wide" aria-labelledby="objectSectionTitle">
        <h4 id="objectSectionTitle">${submittalResolution ? 'Exact Submittal Section' : rfiResolution ? 'Exact RFI Section' : 'Exact Specification Section'}</h4>
        <div class="mc-object-structure">
          <article><span>Section number</span><strong>${esc(submittalResolution ? sectionNumberKey(submittalResolution.section) || 'Unavailable' : rfiResolution ? sectionNumberKey(rfiResolution.section) || 'Unavailable' : specificationResolution.sectionNumber || 'Unavailable')}</strong></article>
          <article><span>Title</span><strong>${esc(submittalResolution ? sectionHeadingValue(submittalResolution.section) || 'Unavailable' : rfiResolution ? sectionHeadingValue(rfiResolution.section) || 'Unavailable' : specificationResolution.sectionTitle || 'Unavailable')}</strong></article>
          <article><span>Path</span><strong>${esc(submittalResolution ? submittalResolution.hierarchy.join(' › ') || 'Unavailable' : rfiResolution ? rfiResolution.hierarchy.join(' › ') || 'Unavailable' : specificationResolution.sectionPath.join(' › ') || 'Unavailable')}</strong></article>
          <article><span>Provenance</span><strong>${esc(submittalResolution ? submittalResolution.provenance || 'Unavailable' : rfiResolution ? rfiResolution.provenance || 'Unavailable' : specificationResolution.sectionProvenance || 'Unavailable')}</strong></article>
        </div>
        <pre>${esc(submittalResolution ? submittalResolution.sectionText || sectionTextValue(objectTargetSection) : rfiResolution ? rfiResolution.sectionText || sectionTextValue(objectTargetSection) : specificationResolution.sectionText || sectionTextValue(objectTargetSection))}</pre>
      </section>
    ` : ''}

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
              <li
                id="${sourceAnchorId('knowledge-section', section.id)}"
                class="${objectTargetSection?.id === section.id ? 'mc-section-highlight-active' : ''}"
                ${objectTargetSection?.id === section.id ? 'tabindex="-1" aria-current="true"' : ''}
              >
                ${objectTargetSection?.id === section.id
                  ? '<em class="mc-source-target-indicator">Evidence source</em>'
                  : ''}
                <strong>${esc(sectionHeadingValue(section, index))}</strong>
                ${Array.isArray(section.path) && section.path.length
                  ? `<small>${esc(section.path.map(safeText).join(' › '))}</small>`
                  : ''}
                ${sectionLocationValue(section)
                  ? `<span>${esc(sectionLocationValue(section))}</span>`
                  : ''}
                ${objectTargetSection?.id === section.id
                  ? `<pre>${esc(sectionTextValue(section))}</pre>`
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
      ${objectSourceResolution?.status === 'missing-section' && sourceNavigationTarget?.sectionId
        ? `
          <div class="mc-source-target-unavailable" role="status">
            <strong>Source section unavailable</strong>
            <span>The document is available, but the exact stored section no longer exists.</span>
          </div>
        `
        : ''}
    </section>

    <section class="mc-object-section mc-object-section-wide mc-relationship-object-summary" aria-labelledby="objectRelationshipsTitle">
      <h4 id="objectRelationshipsTitle">Relationships</h4>
      <div class="mc-relationship-summary-grid">
        <article><span>Parent</span><strong>${objectRelationshipContext.parent ? '1' : '0'}</strong></article>
        <article><span>Children</span><strong>${fmt(objectRelationshipContext.children.length)}</strong></article>
        <article><span>References</span><strong>${fmt(objectExplicitReferences)}</strong></article>
        <article><span>Referenced by</span><strong>${fmt(objectReverseReferences)}</strong></article>
        <article><span>Related documents</span><strong>${fmt(objectRelationshipContext.relatedDocuments.length)}</strong></article>
        <article><span>Same division</span><strong>${fmt(objectRelationshipContext.sameDivision.length)}</strong></article>
        <article><span>Same library</span><strong>${fmt(objectRelationshipContext.sameLibrary.length)}</strong></article>
      </div>
      <button type="button" class="subtle mc-relationship-open" data-object-relationships>
        Open Relationship Explorer
      </button>
      <button type="button" class="subtle mc-engineering-open" data-object-engineering>
        Open Engineering Workspace
      </button>
      <button type="button" class="subtle mc-workflow-open" data-object-workflow>
        Open Workflow
      </button>
    </section>

    <section class="mc-object-section mc-object-section-wide" aria-labelledby="objectMetadataRelationshipsTitle">
      <h4 id="objectMetadataRelationshipsTitle">Existing Metadata Relationships</h4>
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
    if ([CONTEXT_ACTIVATION_SOURCES.knowledgeObjectDocument, CONTEXT_ACTIVATION_SOURCES.knowledgeObjectSection].includes(activeContextActivation?.source)) {
      clearActiveContext(CONTEXT_ACTIVATION_SOURCES.knowledgeObjectClose);
    }
    selectedDoc = null;
    renderKnowledgeWorkspace();
  };

  $('#openObjectSourceInspector').onclick = () => {
    selectedDoc = document.id;
    if (sourceNavigationTarget?.documentId === document.id) {
      sourceNavigationTarget = sourceNavigationDestination(
        sourceNavigationTarget,
        'sources'
      );
    }
    show('sources');
  };

  $('[data-source-return-evidence]')?.addEventListener(
    'click',
    returnToEvidenceExplorer
  );
  $('[data-source-return-answer]')?.addEventListener(
    'click',
    returnToOriginatingAnswer
  );
  $('[data-source-return-relationships]')?.addEventListener(
    'click',
    returnToRelationshipExplorer
  );
  $('[data-source-return-revisions]')?.addEventListener(
    'click',
    returnToRevisionReview
  );
  $('[data-source-open-inspector]')?.addEventListener('click', () => {
    sourceNavigationTarget = sourceNavigationDestination(
      sourceNavigationTarget,
      'sources'
    );
    show('sources');
  });
  $('[data-object-relationships]')?.addEventListener('click', () => {
    relationshipTarget = {
      ...relationshipNavigationTarget({
        documentId: document.id,
        sectionId: objectTargetSection?.id || ''
      }),
      projectId: state().activeProject,
      libraryId: document.libraryId,
      originatingMessageId: activeRetrievalSession?.messageId || '',
      evidenceId: selectedEvidenceId || ''
    };
    show('relationships');
  });
  $('[data-object-lineage]')?.addEventListener('click', () =>
    openVersionExplorer(document.id, activeRetrievalSession?.messageId || '')
  );
  $('[data-object-engineering]')?.addEventListener('click', () =>
    openEngineeringWorkspace({ documentId: document.id, sectionId: objectTargetSection?.id || '', libraryId: document.libraryId, origin: 'knowledge' })
  );
  $('[data-object-workflow]')?.addEventListener('click', () =>
    void seedWorkflowFromDocument(document.id, objectTargetSection?.id || '', 'knowledge')
  );

  if (objectTargetSection) {
    revealNavigationTarget(
      globalThis.document.getElementById(
        sourceAnchorId('knowledge-section', objectTargetSection.id)
      )
    );
  }

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
      ? shown.map(document => {
          const extraction = verifyExtraction(
            document,
            sections,
            documents
          );

          return `
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
                · ${esc(extraction.verificationStatus)}
              </small>
            </span>
            <b>${fmt(extraction.sections.length)}</b>
          </button>
        `;
        }).join('')
      : '<div class="empty">No documents match this filter. Clear or revise the filter to continue.</div>';

    $$('[data-doc]').forEach(button => {
      button.onclick = async () => {
        selectedDoc = button.dataset.doc;
        if (sourceNavigationTarget?.documentId !== selectedDoc) {
          sourceNavigationTarget = null;
          sourceNavigationNotice = '';
        }
        const document = documents.find(item => item.id === selectedDoc);
        if (document) await activateEngineeringContext({
          projectId: state().activeProject,
          libraryId: document.libraryId,
          documentId: document.id,
          source: CONTEXT_ACTIVATION_SOURCES.sourceInspectorDocument
        });
        renderSources();
      };
    });
  };

  $('#sourceDocumentFilter').oninput = drawDocuments;
  drawDocuments();

  const requestedDocument = selectedDoc
    ? documents.find(document => document.id === selectedDoc)
    : null;
  const selected = selectedDoc
    ? requestedDocument
    : documents[0];

  if (!selected) {
    $('#sourceDetail').innerHTML = selectedDoc
      ? `
        <div class="mc-section-preview-empty">
          The selected document is no longer available. Choose another
          source document to continue.
        </div>
      `
      : '<div class="empty">No indexed documents. Add documents in Knowledge Workspace, then return here to inspect extraction.</div>';
    selectedDoc = null;

    return;
  }

  selectedDoc = selected.id;

  const documentLabel = preferredText(
    selected.title,
    selected.name,
    'Untitled document'
  );

  const verification = verifyExtraction(
    selected,
    sections,
    documents
  );
  const selectedSections = verification.sections;
  const sourceLibraries = engine.libraries();
  const library = sourceLibraries.find(item =>
    item.id === selected.libraryId
  );
  const [sourceDrawingAnalysis, sourcePdfRecord] = isPdfDocument(selected)
    ? await Promise.all([engine.drawingAnalysis(selected.id), engine.sourceFile(selected.id)])
    : [null, null];
  const sourceTargetResolution = sourceNavigationTarget?.destination === 'sources' &&
    sourceNavigationTarget.documentId === selected.id
    ? resolveSourceTarget(sourceNavigationTarget, {
        projects: state().projects,
        libraries: sourceLibraries,
        documents,
        sections,
        analyses: sourceDrawingAnalysis ? [sourceDrawingAnalysis] : [],
        sourceFiles: sourcePdfRecord ? [sourcePdfRecord] : []
      })
    : null;
  const sourceRelationshipModel = buildKnowledgeRelationships({
    documents,
    sections
  });
  const sourceRelationshipContext = relationshipContext(
    sourceRelationshipModel,
    {
      documentId: selected.id,
      sectionId: sourceTargetResolution?.section?.id || ''
    }
  );
  const sourceDocumentReferences = sourceRelationshipModel.explicitReferences.filter(edge =>
    edge.sourceDocumentId === selected.id
  ).length;
  const sourceDocumentReferencedBy = sourceRelationshipModel.reverseReferences.filter(edge =>
    edge.sourceDocumentId === selected.id
  ).length;

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

  const emptySections = verification.emptySections.length;

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
    untitledSections: verification.untitledSections.length,
    shortSections,
    duplicateHeadings,
    verificationStatus: verification.verificationStatus,
    retrievalReadiness: verification.retrievalReadiness,
    sectionCountMismatch: verification.sectionCountMismatch,
    generatedAt: new Date().toISOString()
  };
  const verificationClass = verification.verificationStatus
    .toLowerCase()
    .replace(/\s+/g, '-');
  const technicalDetails = [
    selected.error,
    selected.errorStack
  ].map(safeText).filter(Boolean).join('\n\n');

  $('#sourceDetail').innerHTML = `
    ${sourceTargetResolution
      ? `
        <nav class="mc-source-target-return" aria-label="Source navigation">
          <strong>Evidence source context</strong>
          <div>
            <button type="button" data-source-return-evidence>Back to Evidence Explorer</button>
            ${sourceNavigationTarget.originatingWorkspace === 'relationships'
              ? '<button type="button" data-source-return-relationships>Back to Relationship Explorer</button>'
              : ''}
            ${sourceNavigationTarget.originatingWorkspace === 'revisions'
              ? '<button type="button" data-source-return-revisions>Back to Revision Review</button>'
              : ''}
            ${sourceNavigationTarget.originatingMessageId && state().chat.some(message => message.id === sourceNavigationTarget.originatingMessageId)
              ? '<button type="button" class="subtle" data-source-return-answer>Back to Answer</button>'
              : ''}
            <button type="button" class="subtle" data-source-open-object>Back to Knowledge Object</button>
          </div>
        </nav>
      `
      : ''}
    <div class="source-title">
      <span>EXTRACTION VERIFICATION</span>
      <h2>${esc(documentLabel)}</h2>
      <p>
        ${esc(selected.name)}
        · ${esc(selected.category || 'General')}
      </p>
    </div>

    ${isPdfDocument(selected) ? `<section class="mc-drawing-source-status"><div><span>AUTHORITATIVE DRAWING SOURCE</span><h3>${sourcePdfRecord ? 'Original PDF available' : 'Original PDF unavailable'}</h3><p>${sourcePdfRecord ? `${fmt(sourceDrawingAnalysis?.sheets?.length || 0)} deterministic sheet records are available.` : 'Reattach the exact original PDF to enable visual sheet review. Extracted text remains available.'}</p></div>${sourcePdfRecord ? '<button data-source-open-drawing>Open Drawing</button>' : '<label class="mc-drawing-reattach"><input id="sourcePdfReattach" type="file" accept="application/pdf,.pdf">Reattach Original PDF</label>'}</section>` : ''}

    <section class="mc-relationship-source-summary" aria-labelledby="sourceRelationshipTitle">
      <div>
        <span>EXPLICIT RELATIONSHIPS</span>
        <h3 id="sourceRelationshipTitle">Relationship Summary</h3>
      </div>
      <dl>
        <div><dt>Parent</dt><dd>${sourceRelationshipContext.parent ? '1' : '0'}</dd></div>
        <div><dt>Children</dt><dd>${fmt(sourceRelationshipContext.children.length)}</dd></div>
        <div><dt>References</dt><dd>${fmt(sourceTargetResolution?.section ? sourceRelationshipContext.references.length : sourceDocumentReferences)}</dd></div>
        <div><dt>Referenced by</dt><dd>${fmt(sourceTargetResolution?.section ? sourceRelationshipContext.referencedBy.length : sourceDocumentReferencedBy)}</dd></div>
      </dl>
      <button type="button" class="subtle" data-source-relationships>Open Relationship Explorer</button>
    </section>

    <section class="mc-extraction-overview" aria-labelledby="extractionOverviewTitle">
      <div class="mc-source-health-summary">
        <div>
          <span>EXTRACTION VERIFICATION</span>
          <h3 id="extractionOverviewTitle">${esc(verification.verificationStatus)}</h3>
          <p>${esc(verification.retrievalReadiness)}</p>
        </div>
        <div class="mc-source-health-actions">
          <button type="button" id="openSourceKnowledgeObject">
            Open Knowledge Object
          </button>
          <button type="button" id="reviewSourceValidation" class="subtle">
            Review Knowledge Validation
          </button>
        </div>
      </div>

      <div class="mc-source-health-status ${esc(verificationClass)}">
        <strong>${esc(verification.verificationStatus)}</strong>
        <span>
          ${verification.failCount
            ? `${fmt(verification.failCount)} failed check${verification.failCount === 1 ? '' : 's'}`
            : verification.warningCount
              ? `${fmt(verification.warningCount)} warning${verification.warningCount === 1 ? '' : 's'}`
              : 'No extraction issues detected'}
        </span>
      </div>

      <dl class="mc-extraction-facts">
        <div><dt>Filename</dt><dd>${esc(selected.name)}</dd></div>
        <div><dt>Library</dt><dd>${library ? esc(library.name) : 'Unavailable'}</dd></div>
        <div><dt>File type</dt><dd>${esc(documentType(selected))}</dd></div>
        <div><dt>Parser used</dt><dd>${verification.parser ? esc(verification.parser) : 'Unavailable'}</dd></div>
        <div><dt>Import status</dt><dd>${esc(documentStatus(selected).label)}</dd></div>
        <div><dt>Retrieval readiness</dt><dd>${esc(verification.retrievalReadiness)}</dd></div>
        <div><dt>Character count</dt><dd>${verification.recordedCharacters === null ? 'Unavailable' : fmt(verification.recordedCharacters)}</dd></div>
        <div><dt>Recorded sections</dt><dd>${verification.recordedSectionCount === null ? 'Unavailable' : fmt(verification.recordedSectionCount)}</dd></div>
        <div><dt>Stored sections</dt><dd>${fmt(verification.sections.length)}</dd></div>
        <div><dt>Non-empty sections</dt><dd>${fmt(verification.usableSections.length)}</dd></div>
        <div><dt>Empty sections</dt><dd>${fmt(verification.emptySections.length)}</dd></div>
        <div><dt>Untitled sections</dt><dd>${fmt(verification.untitledSections.length)}</dd></div>
        <div><dt>Hierarchy version</dt><dd>${selected.hierarchyVersion ?? 'Unavailable'}</dd></div>
        <div><dt>Page metadata</dt><dd>${verification.pageMetadataAvailable ? 'Available' : 'Unavailable'}</dd></div>
      </dl>

      ${verification.warnings.length
        ? `
          <div class="mc-extraction-warnings">
            <strong>Parser warnings</strong>
            <ul>
              ${verification.warnings.map(warning =>
                `<li>${esc(warning)}</li>`
              ).join('')}
            </ul>
          </div>
        `
        : ''}

      ${technicalDetails
        ? `
          <details class="mc-extraction-technical">
            <summary>View technical details</summary>
            <pre>${esc(technicalDetails)}</pre>
          </details>
        `
        : ''}
    </section>

    <section class="mc-extraction-check-section" aria-labelledby="extractionChecksTitle">
      <div class="mc-extraction-section-heading">
        <div>
          <span>EXPLICIT CONDITIONS</span>
          <h3 id="extractionChecksTitle">Extraction Checks</h3>
        </div>
      </div>
      <ul class="mc-extraction-checks">
        ${verification.checks.map(item => `
          <li>
            <span class="mc-extraction-badge ${item.status.toLowerCase()}">
              ${esc(item.status)}
            </span>
            <div>
              <strong>${esc(item.label)}</strong>
              <p>${esc(item.detail)}</p>
            </div>
          </li>
        `).join('')}
      </ul>
    </section>

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

    <section class="mc-section-preview" aria-labelledby="sectionPreviewTitle">
      <div class="mc-extraction-section-heading">
        <div>
          <span>STORED PLAIN TEXT</span>
          <h3 id="sectionPreviewTitle">Section Preview</h3>
        </div>
        <small>
          ${fmt(Math.min(verification.previews.length, 12))}
          of ${fmt(verification.previews.length)} shown
        </small>
      </div>
      ${verification.previews.length
        ? `
          <ol class="mc-section-preview-list">
            ${verification.previews.slice(0, 12).map(preview => `
              <li class="${preview.empty ? 'empty' : ''}">
                <div class="mc-section-preview-heading">
                  <strong>${esc(preview.title)}</strong>
                  <span>
                    ${preview.hierarchyLevel === null
                      ? 'Level unavailable'
                      : `Level ${fmt(preview.hierarchyLevel)}`}
                    · Order ${fmt(preview.order + 1)}
                    · ${fmt(preview.characters)} characters
                  </span>
                </div>
                ${preview.parentTitle
                  ? `<small>Parent: ${esc(preview.parentTitle)}</small>`
                  : ''}
                <p>
                  ${preview.empty
                    ? 'No usable text is stored for this section.'
                    : esc(preview.excerpt)}
                </p>
                ${preview.empty
                  ? '<em>EMPTY CONTENT</em>'
                  : ''}
              </li>
            `).join('')}
          </ol>
        `
        : `
          <div class="mc-section-preview-empty">
            No stored sections are available for this document.
          </div>
        `}
    </section>

    ${sourceTargetResolution?.status === 'missing-section' && sourceNavigationTarget?.sectionId
      ? `
        <div class="mc-source-target-unavailable" role="status">
          <strong>Source section unavailable</strong>
          <span>The document is available, but the exact stored section no longer exists.</span>
        </div>
      `
      : ''}

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

  $('#openSourceKnowledgeObject').onclick = () => {
    selectedKnowledgeSection = 'all';
    selectedDoc = selected.id;
    show('knowledge');
  };

  $('#reviewSourceValidation').onclick = () => {
    show('evaluate');
  };
  $('[data-source-open-drawing]')?.addEventListener('click', () => {
    drawingTarget = createDrawingTarget({ projectId: sourceDrawingAnalysis?.projectId || state().activeProject, documentId: selected.id, drawingSetId: sourceDrawingAnalysis?.drawingSetId, drawingId: sourceTargetResolution?.sheet?.drawingId, sheetId: sourceTargetResolution?.sheet?.sheetId, pageNumber: sourceTargetResolution?.sheet?.pageNumber || 1, observationId: sourceTargetResolution?.observation?.observationId, region: sourceTargetResolution?.observation?.region || sourceNavigationTarget?.region });
    show('drawings');
  });
  $('#sourcePdfReattach')?.addEventListener('change', async event => {
    if (!event.target.files?.[0]) return;
    try { const result = await engine.reattachPdfSource(selected.id, event.target.files[0]); if (!result.ok) alert(result.warning); else await renderSources(); }
    catch (error) { alert(error.message); }
  });

  $('[data-source-return-evidence]')?.addEventListener(
    'click',
    returnToEvidenceExplorer
  );
  $('[data-source-return-answer]')?.addEventListener(
    'click',
    returnToOriginatingAnswer
  );
  $('[data-source-return-relationships]')?.addEventListener(
    'click',
    returnToRelationshipExplorer
  );
  $('[data-source-return-revisions]')?.addEventListener(
    'click',
    returnToRevisionReview
  );
  $('[data-source-open-object]')?.addEventListener('click', () => {
    sourceNavigationTarget = sourceNavigationDestination(
      sourceNavigationTarget,
      'knowledge'
    );
    selectedKnowledgeSection = 'all';
    show('knowledge');
  });
  $('[data-source-relationships]')?.addEventListener('click', () => {
    relationshipTarget = {
      ...relationshipNavigationTarget({
        documentId: selected.id,
        sectionId: sourceTargetResolution?.section?.id || ''
      }),
      projectId: state().activeProject,
      libraryId: selected.libraryId,
      originatingMessageId: activeRetrievalSession?.messageId || '',
      evidenceId: selectedEvidenceId || ''
    };
    show('relationships');
  });

  let activeSectionId = sourceTargetResolution?.section?.id || null;
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
  const targetedBranchIds = new Set();
  let targetedBranchSection = activeSectionId
    ? sectionsById.get(activeSectionId)
    : null;
  while (targetedBranchSection) {
    targetedBranchIds.add(targetedBranchSection.id);
    targetedBranchSection = sectionsById.get(targetedBranchSection.parentId);
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
            id="${sourceAnchorId('source-section', section.id)}"
            class="source-section ${section.id === activeSectionId ? 'active mc-section-highlight-active' : ''}"
            data-section-node="${esc(section.id)}"
            ${section.id === activeSectionId ? 'tabindex="-1" aria-current="true"' : ''}
            ${query || targetedBranchIds.has(section.id) ? 'open' : ''}
          >
            <summary data-activate-section="${esc(section.id)}">
              <b>${section.order + 1}</b>

              <span style="--level:${Math.max(0, (section.level || 1) - 1)}">
                <strong>${esc(heading)}</strong>
                ${section.id === activeSectionId
                  ? '<i class="mc-source-target-indicator">Evidence source</i>'
                  : ''}
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
      container.querySelectorAll(':scope > details[open]').forEach(populateChildren);
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

    if (activeSectionId) {
      revealNavigationTarget(
        globalThis.document.getElementById(
          sourceAnchorId('source-section', activeSectionId)
        )
      );
    }
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

function renderAdvancedEvaluations() {
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

      renderAdvancedEvaluations();
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

async function renderEvals() {
  const libraries = engine.libraries();
  const documents = await engine.documents();
  const sections = await engine.sections();
  const catalog = knowledgeCatalogData(documents, sections, libraries);
  const extractionCoverage = aggregateExtractionVerification(
    documents,
    sections
  );
  const relationshipModel = buildKnowledgeRelationships({
    documents,
    sections
  });
  const relationshipValidation = relationshipModel.validation;
  const lineageModel = buildDocumentLineage({ documents, sections });
  const lineageValidation = lineageModel.validation;
  const revisionMetrics = buildRevisionMetrics({ documents, sections });
  const engineeringMetrics = engineeringContextMetrics(getInspectionSession()?.context || null);
  const activationMetrics = contextActivationMetrics(activeContextActivation, contextClearedEvent);
  const synchronizationMetrics = contextBusMetrics(contextBusSnapshot);
  const validationWorkflow = workflowTarget
    ? createWorkflow({
        workflowType: workflowTarget.workflowType,
        engineeringContext: getInspectionSession()?.context || null,
        documents,
        sections,
        revisionComparisons: revisionMetrics.comparisons
      })
    : null;
  const activeWorkflowMetrics = workflowMetrics(validationWorkflow);
  const lineageIssueCount =
    lineageValidation.brokenLineage.length +
    lineageValidation.circularPreviousLinks.length +
    lineageValidation.ambiguousCurrentFamilies.length;
  const documentsWithoutRelationships = relationshipValidation.documentsWithoutRelationships.length;
  const documentsWithRelationships = Math.max(
    0,
    documents.length - documentsWithoutRelationships
  );
  const brokenRelationshipReferences =
    relationshipValidation.brokenReferences.length +
    relationshipValidation.unresolvedReferences.length +
    relationshipValidation.ambiguousReferences.length;
  const sessionEvidenceDocumentIds = new Set(
    (activeRetrievalSession?.evidence || [])
      .map(item => item.documentId)
      .filter(Boolean)
  );
  const sessionEvidenceSectionIds = new Set(
    (activeRetrievalSession?.evidence || [])
      .map(item => item.sectionId)
      .filter(Boolean)
  );
  const documentsNotRetrieved = activeRetrievalSession
    ? documents.filter(document =>
        !sessionEvidenceDocumentIds.has(document.id)
      ).length
    : null;
  const sectionsNotRetrieved = activeRetrievalSession
    ? sections.filter(section =>
        !sessionEvidenceSectionIds.has(section.id)
      ).length
    : null;
  const enabledLibraries = libraries.filter(library => library.enabled);
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
  const uncategorized = documents.filter(document =>
    documentCatalogSection(document) === 'Uncategorized'
  );
  const indexedWithoutSections = indexed.filter(document =>
    Number(catalog.sectionCounts.get(document.id) || 0) <= 0
  );
  const missingMetadata = documents.filter(document => {
    const library = libraries.find(item =>
      item.id === document.libraryId
    );

    return !(
      document.id &&
      document.name &&
      documentType(document) !== 'Type unavailable' &&
      safeText(document.category || document.metadata?.category).trim() &&
      library
    );
  });
  const emptyEnabledLibraries = enabledLibraries.filter(library =>
    !documents.some(document => document.libraryId === library.id)
  );
  const disabledLibrariesWithDocuments = libraries.filter(library =>
    !library.enabled &&
    documents.some(document => document.libraryId === library.id)
  );

  const healthCards = [
    ['Libraries', libraries.length, `${enabledLibraries.length} enabled`],
    ['Documents', documents.length, 'Loaded production documents'],
    ['Indexed Documents', indexed.length, 'Recognized indexed status'],
    ['Pending Documents', pending.length, 'Awaiting or processing'],
    ['Indexed Sections', sections.length, 'Exposed production sections'],
    ['Retrieval Ready', extractionCoverage.documentsReadyForRetrieval, 'Documents with searchable stored content'],
    ['Extraction Warnings', extractionCoverage.documentsWithWarnings, 'Documents with objective warnings'],
    ['No Usable Text', extractionCoverage.documentsWithoutUsableText, 'Documents without searchable content'],
    ['Categories', catalog.entries.length, 'Represented knowledge categories'],
    ['File Types', catalog.types.length, 'Represented file-type groups'],
    ['Documents with Relationships', documentsWithRelationships, 'Explicit or exact shared-state links'],
    ['Documents without Relationships', documentsWithoutRelationships, 'No derived relationship edges'],
    ['Broken References', brokenRelationshipReferences, 'Broken, unresolved, or ambiguous explicit references'],
    ['Duplicate Imports', lineageValidation.duplicateImports, 'Explicit duplicate lineage records'],
    ['Superseded Documents', lineageValidation.supersededDocuments, 'Preserved previous versions'],
    ['Broken Lineage', lineageIssueCount, 'Missing, circular, or ambiguous lineage'],
    ['Unknown Versions', lineageValidation.unknownVersions, 'No explicit lineage metadata'],
    ['Comparable Revision Pairs', revisionMetrics.comparableRevisionPairs, 'Exact adjacent lineage records'],
    ['Ambiguous Revision Pairs', revisionMetrics.ambiguousRevisionPairs, 'Pairs with duplicate deterministic keys'],
    ['Broken Revision Links', revisionMetrics.brokenLineageLinks, 'Unavailable or invalid explicit previous links'],
    ['Added Revision Sections', revisionMetrics.addedSections, 'Unmatched later-revision sections'],
    ['Removed Revision Sections', revisionMetrics.removedSections, 'Unmatched earlier-revision sections'],
    ['Changed Revision Sections', revisionMetrics.changedSections, 'Matched sections with objective changes'],
    ['Unmatched Revision Sections', revisionMetrics.unmatchedSections, 'Sections without a deterministic pair'],
    ['Active Engineering Context', activationMetrics.activeEngineeringContext, activationMetrics.activationSource || 'No activation source'],
    ['Context Activated', activationMetrics.currentTransition === 'activated' ? 1 : 0, `Current transition: ${activationMetrics.currentTransition}`],
    ['Context Cleared', activationMetrics.contextCleared, activationMetrics.contextCleared ? `Cleared from ${activationMetrics.activationSource}` : 'Current transient state'],
    ['Active Synchronization', synchronizationMetrics.activeSynchronization, synchronizationMetrics.activationSource || 'No synchronized context'],
    ['Synchronized Workspaces', synchronizationMetrics.synchronizedModules, 'Workspaces using the active Engineering Context'],
    ['Unsynchronized Workspaces', synchronizationMetrics.unsynchronizedModules, 'Workspaces awaiting Engineering Context'],
    ['Context Has Evidence', engineeringMetrics.contextHasEvidence, 'Exact active-session evidence'],
    ['Context Has Relationships', engineeringMetrics.contextHasExplicitRelationships, 'Exact hierarchy or explicit references'],
    ['Context Has Version History', engineeringMetrics.contextHasVersionHistory, 'Explicit lineage records'],
    ['Context Has Specifications', engineeringMetrics.contextHasSpecifications, 'Exact metadata classification'],
    ['Context Has Drawings', engineeringMetrics.contextHasDrawings, 'Exact metadata classification'],
    ['Context Has Procedures', engineeringMetrics.contextHasProcedures, 'Exact metadata classification'],
    ['Incomplete Context', engineeringMetrics.incompleteContext, 'Current transient context only'],
    ['Active Workflow', activeWorkflowMetrics.activeWorkflow, 'Current transient workflow only'],
    ['Workflow Ready', activeWorkflowMetrics.workflowReady, 'Required identifiers available'],
    ['Workflow Incomplete', activeWorkflowMetrics.workflowIncomplete, 'Required identifiers unavailable'],
    ['Workflow Unavailable', activeWorkflowMetrics.workflowUnavailable, 'Invalid context or unsupported type'],
    ['Workflow Evidence', activeWorkflowMetrics.workflowEvidence, 'Exact active-session identifiers'],
    ['Workflow Relationships', activeWorkflowMetrics.workflowRelationships, 'Exact relationship identifiers'],
    ['Workflow Lineage', activeWorkflowMetrics.workflowLineage, 'Explicit lineage identifiers'],
    ['Workflow Revisions', activeWorkflowMetrics.workflowRevisions, 'Comparable revision identifiers']
  ];

  if (activeRetrievalSession) {
    healthCards.push(
      [
        'Recent Evidence',
        activeRetrievalSession.evidence.length,
        activeRetrievalSession.coverageClassification
      ],
      [
        'Citations Used',
        activeRetrievalSession.evidenceUsed,
        'Latest active retrieval session'
      ]
    );
  }

  $('#validationHealth').innerHTML = healthCards.map(([label, value, note]) => `
    <article class="mc-validation-health-card">
      <span>${esc(label)}</span>
      <strong>${fmt(value)}</strong>
      <small>${esc(note)}</small>
    </article>
  `).join('');

  const checks = [
    {
      label: 'Documents loaded',
      status: documents.length ? 'PASS' : 'INFO',
      detail: documents.length
        ? `${fmt(documents.length)} document${documents.length === 1 ? ' is' : 's are'} available.`
        : 'No documents are currently loaded.'
    },
    {
      label: 'Libraries enabled',
      status: enabledLibraries.length
        ? 'PASS'
        : libraries.length ? 'WARNING' : 'INFO',
      detail: enabledLibraries.length
        ? `${fmt(enabledLibraries.length)} of ${fmt(libraries.length)} ${libraries.length === 1 ? 'library is' : 'libraries are'} enabled.`
        : libraries.length
          ? 'Libraries exist, but none are enabled.'
          : 'No libraries are currently available.'
    },
    {
      label: 'Indexed sections detected',
      status: sections.length ? 'PASS' : documents.length ? 'WARNING' : 'INFO',
      detail: sections.length
        ? `${fmt(sections.length)} indexed section${sections.length === 1 ? ' is' : 's are'} exposed.`
        : documents.length
          ? 'Loaded documents expose no indexed sections.'
          : 'Sections can be detected after documents are loaded and indexed.'
    },
    {
      label: 'Categories assigned',
      status: !documents.length
        ? 'INFO'
        : uncategorized.length ? 'WARNING' : 'PASS',
      detail: !documents.length
        ? 'Category coverage is unavailable without documents.'
        : uncategorized.length
          ? `${fmt(uncategorized.length)} document${uncategorized.length === 1 ? ' is' : 's are'} uncategorized.`
          : `All ${fmt(documents.length)} loaded document${documents.length === 1 ? ' has' : 's have'} a category or deterministic type grouping.`
    },
    {
      label: 'Pending indexing',
      status: pending.length ? 'WARNING' : 'PASS',
      detail: pending.length
        ? `${fmt(pending.length)} document${pending.length === 1 ? ' is' : 's are'} pending indexing.`
        : 'No documents have a pending indexing status.'
    },
    {
      label: 'Metadata completeness',
      status: missingMetadata.length ? 'WARNING' : documents.length ? 'PASS' : 'INFO',
      detail: missingMetadata.length
        ? `${fmt(missingMetadata.length)} document${missingMetadata.length === 1 ? ' is' : 's are'} missing identity, type, category, or library metadata.`
        : documents.length
          ? 'Required display metadata is available for all documents.'
          : 'Metadata can be validated after documents are loaded.'
    },
    {
      label: 'Unavailable documents',
      status: unavailable.length ? 'WARNING' : 'PASS',
      detail: unavailable.length
        ? `${fmt(unavailable.length)} document${unavailable.length === 1 ? ' is' : 's are'} marked unavailable or failed by production state.`
        : 'No documents are marked unavailable.'
    },
    {
      label: 'Enabled library content',
      status: emptyEnabledLibraries.length ? 'WARNING' : enabledLibraries.length ? 'PASS' : 'INFO',
      detail: emptyEnabledLibraries.length
        ? `${fmt(emptyEnabledLibraries.length)} enabled ${emptyEnabledLibraries.length === 1 ? 'library contains' : 'libraries contain'} no documents.`
        : enabledLibraries.length
          ? 'Every enabled library contains at least one document.'
          : 'No enabled libraries are available to validate.'
    },
    {
      label: 'Indexed document structure',
      status: indexedWithoutSections.length ? 'WARNING' : indexed.length ? 'PASS' : 'INFO',
      detail: indexedWithoutSections.length
        ? `${fmt(indexedWithoutSections.length)} indexed document${indexedWithoutSections.length === 1 ? ' exposes' : 's expose'} zero sections.`
        : indexed.length
          ? 'Every indexed document exposes at least one section.'
          : 'No indexed documents are available to validate.'
    },
    {
      label: 'Recognized index status',
      status: unknown.length ? 'WARNING' : documents.length ? 'PASS' : 'INFO',
      detail: unknown.length
        ? `${fmt(unknown.length)} document${unknown.length === 1 ? ' has' : 's have'} an unrecognized or unavailable status.`
        : documents.length
          ? 'All document statuses are recognized.'
          : 'No document statuses are available.'
    },
    {
      label: 'Documents ready for retrieval',
      status: !documents.length
        ? 'INFO'
        : extractionCoverage.documentsReadyForRetrieval === documents.length
          ? 'PASS'
          : 'WARNING',
      detail: !documents.length
        ? 'Retrieval readiness can be checked after documents are loaded.'
        : `${fmt(extractionCoverage.documentsReadyForRetrieval)} of ${fmt(documents.length)} document${documents.length === 1 ? ' is' : 's are'} retrieval ready.`
    },
    {
      label: 'Usable extracted text',
      status: extractionCoverage.documentsWithoutUsableText
        ? 'FAIL'
        : documents.length ? 'PASS' : 'INFO',
      detail: extractionCoverage.documentsWithoutUsableText
        ? `${fmt(extractionCoverage.documentsWithoutUsableText)} document${extractionCoverage.documentsWithoutUsableText === 1 ? ' contains' : 's contain'} no usable extracted text.`
        : documents.length
          ? 'Every loaded document exposes usable text.'
          : 'No documents are available to inspect.'
    },
    {
      label: 'Document and stored section counts',
      status: extractionCoverage.documentSectionMismatches
        ? 'WARNING'
        : documents.length ? 'PASS' : 'INFO',
      detail: extractionCoverage.documentSectionMismatches
        ? `${fmt(extractionCoverage.documentSectionMismatches)} document${extractionCoverage.documentSectionMismatches === 1 ? ' reports' : 's report'} a different section count than storage.`
        : documents.length
          ? 'Recorded and stored section counts agree.'
          : 'No section counts are available to compare.'
    },
    {
      label: 'Section record integrity',
      status:
        extractionCoverage.duplicateSectionIds ||
        extractionCoverage.orphanedSections ||
        extractionCoverage.invalidDocumentLinks
          ? 'FAIL'
          : sections.length ? 'PASS' : 'INFO',
      detail:
        extractionCoverage.duplicateSectionIds ||
        extractionCoverage.orphanedSections ||
        extractionCoverage.invalidDocumentLinks
          ? `${fmt(extractionCoverage.duplicateSectionIds)} duplicate ID(s), ${fmt(extractionCoverage.orphanedSections)} orphaned section(s), and ${fmt(extractionCoverage.invalidDocumentLinks)} invalid document link(s) were detected.`
          : sections.length
            ? 'Stored section identifiers and document links are consistent.'
            : 'No stored sections are available to inspect.'
    },
    {
      label: 'Section content',
      status:
        extractionCoverage.emptySections ||
        extractionCoverage.untitledSections
          ? 'WARNING'
          : sections.length ? 'PASS' : 'INFO',
      detail:
        extractionCoverage.emptySections ||
        extractionCoverage.untitledSections
          ? `${fmt(extractionCoverage.emptySections)} empty and ${fmt(extractionCoverage.untitledSections)} untitled section(s) were detected.`
          : sections.length
            ? 'Stored sections contain usable text and titles.'
            : 'No stored section content is available.'
    }
  ];

  checks.push(
    {
      label: 'Explicit relationship references',
      status: brokenRelationshipReferences ? 'WARNING' : sections.length ? 'PASS' : 'INFO',
      detail: brokenRelationshipReferences
        ? `${fmt(relationshipValidation.brokenReferences.length)} broken ID, ${fmt(relationshipValidation.unresolvedReferences.length)} unresolved number, and ${fmt(relationshipValidation.ambiguousReferences.length)} ambiguous reference condition(s) were detected.`
        : sections.length
          ? 'No broken, unresolved, or ambiguous explicit references were detected.'
          : 'No sections are available for relationship validation.'
    },
    {
      label: 'Hierarchy relationships',
      status:
        relationshipValidation.orphanedHierarchy.length ||
        relationshipValidation.duplicateHierarchyEdges.length ||
        relationshipValidation.circularParentChains.length
          ? 'WARNING'
          : sections.length ? 'PASS' : 'INFO',
      detail: `${fmt(relationshipValidation.orphanedHierarchy.length)} orphaned parent link(s), ${fmt(relationshipValidation.duplicateHierarchyEdges.length)} duplicate edge(s), and ${fmt(relationshipValidation.circularParentChains.length)} circular parent chain(s).`
    },
    {
      label: 'Circular explicit references',
      status: relationshipValidation.circularReferences.length ? 'WARNING' : sections.length ? 'PASS' : 'INFO',
      detail: relationshipValidation.circularReferences.length
        ? `${fmt(relationshipValidation.circularReferences.length)} circular explicit reference path(s) were detected.`
        : sections.length
          ? 'No circular explicit reference paths were detected.'
          : 'No explicit references are available to validate.'
    }
    ,{
      label: 'Document lineage integrity',
      status: lineageIssueCount
        ? 'WARNING'
        : documents.length ? 'PASS' : 'INFO',
      detail: `${fmt(lineageValidation.brokenLineage.length)} broken link(s), ${fmt(lineageValidation.circularPreviousLinks.length)} circular chain(s), and ${fmt(lineageValidation.ambiguousCurrentFamilies.length)} family or families with multiple current records were detected.`
    },
    {
      label: 'Known document versions',
      status: lineageValidation.unknownVersions ? 'INFO' : documents.length ? 'PASS' : 'INFO',
      detail: lineageValidation.unknownVersions
        ? `${fmt(lineageValidation.unknownVersions)} existing document${lineageValidation.unknownVersions === 1 ? ' has' : 's have'} no explicit lineage metadata and remain unknown.`
        : documents.length
          ? 'All loaded documents expose explicit lineage metadata.'
          : 'No documents are available for lineage validation.'
    }
  );

  if (activeRetrievalSession) {
    const evidenceClassification =
      activeRetrievalSession.coverageClassification;
    const verification = activeRetrievalSession.citationVerification;
    const missingCitationCount = verification.uncited.length;

    checks.push(
      {
        label: 'Evidence coverage',
        status: evidenceClassification === 'High Evidence' ||
          evidenceClassification === 'Moderate Evidence'
          ? 'PASS'
          : 'WARNING',
        detail: `${evidenceClassification}. This describes available support, not answer correctness.`
      },
      {
        label: 'Recent retrieval health',
        status:
          activeRetrievalSession.evidence.length &&
          activeRetrievalSession.evidenceUsed
            ? 'PASS'
            : 'WARNING',
        detail: `${fmt(activeRetrievalSession.evidence.length)} section(s) retrieved and ${fmt(activeRetrievalSession.evidenceUsed)} cited in the latest answer.`
      },
      {
        label: 'Missing citation detection',
        status: missingCitationCount || verification.invalid.length
          ? 'WARNING'
          : 'PASS',
        detail: missingCitationCount || verification.invalid.length
          ? `${fmt(missingCitationCount)} uncited material claim(s) and ${fmt(verification.invalid.length)} invalid citation reference(s) were detected.`
          : 'No missing or invalid citations were detected in the latest answer.'
      }
    );
  }

  const statusSymbol = {
    PASS: '✓',
    WARNING: '!',
    INFO: 'i',
    FAIL: '×'
  };

  $('#validationChecks').innerHTML = `
    <ul class="mc-validation-checks">
      ${checks.map(check => `
        <li>
          <span
            class="mc-validation-check-icon ${check.status.toLowerCase()}"
            aria-hidden="true"
          >${statusSymbol[check.status]}</span>
          <div>
            <strong>${esc(check.label)}</strong>
            <p>${esc(check.detail)}</p>
          </div>
          <span class="mc-validation-badge ${check.status.toLowerCase()}">
            ${check.status}
          </span>
        </li>
      `).join('')}
    </ul>
  `;

  const attention = [
    ...(!libraries.length
      ? ['No libraries are available in production state.']
      : []),
    ...(!documents.length
      ? ['No content is loaded in the knowledge base.']
      : []),
    ...(documents.length && !sections.length
      ? ['Loaded documents currently expose no indexed sections.']
      : []),
    ...(pending.length
      ? [`${fmt(pending.length)} document${pending.length === 1 ? ' is' : 's are'} pending indexing.`]
      : []),
    ...(unavailable.length
      ? [`${fmt(unavailable.length)} document${unavailable.length === 1 ? ' is' : 's are'} marked unavailable or failed by production state.`]
      : []),
    ...(missingMetadata.length
      ? [`${fmt(missingMetadata.length)} document${missingMetadata.length === 1 ? ' is' : 's are'} missing identity, type, category, or library metadata.`]
      : []),
    ...(uncategorized.length
      ? [`${fmt(uncategorized.length)} document${uncategorized.length === 1 ? ' is' : 's are'} assigned to Uncategorized.`]
      : []),
    ...(indexedWithoutSections.length
      ? [`${fmt(indexedWithoutSections.length)} indexed document${indexedWithoutSections.length === 1 ? ' exposes' : 's expose'} zero available sections.`]
      : []),
    ...(extractionCoverage.documentsWithoutUsableText
      ? [`${fmt(extractionCoverage.documentsWithoutUsableText)} document${extractionCoverage.documentsWithoutUsableText === 1 ? ' contains' : 's contain'} no usable extracted text.`]
      : []),
    ...(extractionCoverage.emptySections
      ? [`${fmt(extractionCoverage.emptySections)} stored section${extractionCoverage.emptySections === 1 ? ' contains' : 's contain'} no usable text.`]
      : []),
    ...(extractionCoverage.untitledSections
      ? [`${fmt(extractionCoverage.untitledSections)} stored section${extractionCoverage.untitledSections === 1 ? ' has' : 's have'} no exposed title.`]
      : []),
    ...(extractionCoverage.documentSectionMismatches
      ? [`${fmt(extractionCoverage.documentSectionMismatches)} document${extractionCoverage.documentSectionMismatches === 1 ? ' reports' : 's report'} a different section count than IndexedDB contains.`]
      : []),
    ...(extractionCoverage.duplicateSectionIds
      ? [`${fmt(extractionCoverage.duplicateSectionIds)} duplicate stored section identifier${extractionCoverage.duplicateSectionIds === 1 ? ' was' : 's were'} detected.`]
      : []),
    ...(extractionCoverage.orphanedSections
      ? [`${fmt(extractionCoverage.orphanedSections)} stored section${extractionCoverage.orphanedSections === 1 ? ' references' : 's reference'} no existing document.`]
      : []),
    ...(extractionCoverage.invalidDocumentLinks
      ? [`${fmt(extractionCoverage.invalidDocumentLinks)} stored section${extractionCoverage.invalidDocumentLinks === 1 ? ' has' : 's have'} conflicting project, library, or filename links.`]
      : []),
    ...(unknown.length
      ? [`${fmt(unknown.length)} document${unknown.length === 1 ? ' has' : 's have'} an unrecognized or unavailable indexing status.`]
      : []),
    ...emptyEnabledLibraries.map(library =>
      `${library.name} is enabled but contains no documents.`
    ),
    ...disabledLibrariesWithDocuments.map(library => {
      const count = documents.filter(document =>
        document.libraryId === library.id
      ).length;

      return `${library.name} is disabled and contains ${fmt(count)} document${count === 1 ? '' : 's'}.`;
    }),
    ...(activeRetrievalSession?.coverageClassification === 'No Supporting Evidence'
      ? ['The latest retrieval returned no supporting evidence.']
      : []),
    ...((activeRetrievalSession?.citationVerification?.uncited?.length || 0)
      ? [`${fmt(activeRetrievalSession.citationVerification.uncited.length)} material claim${activeRetrievalSession.citationVerification.uncited.length === 1 ? ' lacks' : 's lack'} a citation in the latest answer.`]
      : []),
    ...((activeRetrievalSession?.citationVerification?.invalid?.length || 0)
      ? [`${fmt(activeRetrievalSession.citationVerification.invalid.length)} invalid citation reference${activeRetrievalSession.citationVerification.invalid.length === 1 ? ' was' : 's were'} detected in the latest answer.`]
      : []),
    ...(relationshipValidation.brokenReferences.length
      ? [`${fmt(relationshipValidation.brokenReferences.length)} exact cross-reference ID${relationshipValidation.brokenReferences.length === 1 ? ' does' : 's do'} not resolve to a stored section.`]
      : []),
    ...(relationshipValidation.unresolvedReferences.length
      ? [`${fmt(relationshipValidation.unresolvedReferences.length)} exact section-number reference${relationshipValidation.unresolvedReferences.length === 1 ? ' has' : 's have'} no stored match.`]
      : []),
    ...(relationshipValidation.ambiguousReferences.length
      ? [`${fmt(relationshipValidation.ambiguousReferences.length)} explicit reference${relationshipValidation.ambiguousReferences.length === 1 ? ' has' : 's have'} multiple exact matches and was not resolved.`]
      : []),
    ...(relationshipValidation.orphanedHierarchy.length
      ? [`${fmt(relationshipValidation.orphanedHierarchy.length)} section parent link${relationshipValidation.orphanedHierarchy.length === 1 ? ' points' : 's point'} to a missing section.`]
      : []),
    ...(relationshipValidation.duplicateReferences.length
      ? [`${fmt(relationshipValidation.duplicateReferences.length)} duplicate explicit reference entr${relationshipValidation.duplicateReferences.length === 1 ? 'y was' : 'ies were'} detected.`]
      : []),
    ...(relationshipValidation.duplicateHierarchyEdges.length
      ? [`${fmt(relationshipValidation.duplicateHierarchyEdges.length)} duplicate hierarchy edge${relationshipValidation.duplicateHierarchyEdges.length === 1 ? ' was' : 's were'} detected.`]
      : []),
    ...(relationshipValidation.circularParentChains.length
      ? [`${fmt(relationshipValidation.circularParentChains.length)} circular parent chain${relationshipValidation.circularParentChains.length === 1 ? ' was' : 's were'} detected.`]
      : []),
    ...(relationshipValidation.circularReferences.length
      ? [`${fmt(relationshipValidation.circularReferences.length)} circular explicit reference path${relationshipValidation.circularReferences.length === 1 ? ' was' : 's were'} detected.`]
      : []),
    ...(lineageValidation.brokenLineage.length
      ? [`${fmt(lineageValidation.brokenLineage.length)} exact document lineage link${lineageValidation.brokenLineage.length === 1 ? ' points' : 's point'} to a missing record.`]
      : []),
    ...(lineageValidation.circularPreviousLinks.length
      ? [`${fmt(lineageValidation.circularPreviousLinks.length)} circular previous-version chain${lineageValidation.circularPreviousLinks.length === 1 ? ' was' : 's were'} detected.`]
      : []),
    ...(lineageValidation.ambiguousCurrentFamilies.length
      ? [`${fmt(lineageValidation.ambiguousCurrentFamilies.length)} lineage ${lineageValidation.ambiguousCurrentFamilies.length === 1 ? 'family contains' : 'families contain'} multiple explicit current records; no current version was selected.`]
      : []),
    ...(lineageValidation.unknownVersions
      ? [`${fmt(lineageValidation.unknownVersions)} existing document${lineageValidation.unknownVersions === 1 ? ' has' : 's have'} unknown version status because explicit lineage metadata is unavailable.`]
      : []),
    ...(revisionMetrics.ambiguousRevisionPairs
      ? [`${fmt(revisionMetrics.ambiguousRevisionPairs)} comparable revision pair${revisionMetrics.ambiguousRevisionPairs === 1 ? ' contains' : 's contain'} ambiguous exact section keys.`]
      : []),
    ...(revisionMetrics.brokenLineageLinks
      ? [`${fmt(revisionMetrics.brokenLineageLinks)} revision link${revisionMetrics.brokenLineageLinks === 1 ? ' is' : 's are'} unavailable or not valid for deterministic comparison.`]
      : []),
    ...(revisionMetrics.unmatchedSections
      ? [`${fmt(revisionMetrics.unmatchedSections)} revision section${revisionMetrics.unmatchedSections === 1 ? ' has' : 's have'} no deterministic counterpart.`]
      : [])
  ];

  $('#validationAttention').innerHTML = attention.length
    ? `
      <ul class="mc-validation-attention">
        ${attention.map(item => `<li>${esc(item)}</li>`).join('')}
      </ul>
    `
    : `
      <div class="mc-validation-healthy">
        <strong>Knowledge base ready</strong>
        <p>No immediate knowledge-readiness issues were detected from system state.</p>
      </div>
    `;

  const statusCoverage = [
    ['Indexed', indexed.length],
    ['Pending', pending.length],
    ['Unavailable', unavailable.length],
    ['Unknown', unknown.length]
  ].filter(([, count]) => count || documents.length === 0);
  const coverageGroups = [
    {
      title: 'Libraries',
      empty: 'No libraries are available.',
      items: libraries.map(library => {
        const count = documents.filter(document =>
          document.libraryId === library.id
        ).length;

        return [
          library.name,
          `${fmt(count)} document${count === 1 ? '' : 's'} · ${library.enabled ? 'Enabled' : 'Disabled'}`
        ];
      })
    },
    {
      title: 'Knowledge Categories',
      empty: 'No categories are represented.',
      items: catalog.entries.map(entry => [
        entry.name,
        `${fmt(entry.documents.length)} document${entry.documents.length === 1 ? '' : 's'} · ${fmt(entry.exposedSections)} sections`
      ])
    },
    {
      title: 'File Types',
      empty: 'No file types are represented.',
      items: catalog.types.map(type => [
        type.name,
        `${fmt(type.documents.length)} · ${type.percentage}% of documents · ${fmt(type.indexed)} indexed`
      ])
    },
    {
      title: 'Indexed Status',
      empty: 'No document statuses are available.',
      items: statusCoverage.map(([label, count]) => [
        label,
        `${fmt(count)} document${count === 1 ? '' : 's'}`
      ])
    },
    {
      title: 'Extraction Status',
      empty: 'No extraction verification results are available.',
      items: [
        ['Retrieval ready', extractionCoverage.documentsReadyForRetrieval],
        ['With warnings', extractionCoverage.documentsWithWarnings],
        ['No usable text', extractionCoverage.documentsWithoutUsableText],
        ['Count mismatch', extractionCoverage.documentSectionMismatches]
      ].map(([label, count]) => [
        label,
        `${fmt(count)} document${count === 1 ? '' : 's'}`
      ])
    }
  ];

  if (activeRetrievalSession) {
    coverageGroups.push({
      title: 'Active Retrieval Session',
      empty: 'No active retrieval session is available.',
      items: [
        [
          'Evidence coverage',
          activeRetrievalSession.coverageClassification
        ],
        [
          'Evidence returned',
          `${fmt(activeRetrievalSession.evidence.length)} sections`
        ],
        [
          'Evidence cited',
          `${fmt(activeRetrievalSession.evidenceUsed)} sections`
        ],
        [
          'Documents not retrieved',
          `${fmt(documentsNotRetrieved)} in current session`
        ],
        [
          'Sections not retrieved',
          `${fmt(sectionsNotRetrieved)} in current session`
        ]
      ]
    });
  }

  $('#validationCoverage').innerHTML = coverageGroups.map(group => `
    <section class="mc-validation-coverage-group">
      <h3>${esc(group.title)}</h3>
      ${group.items.length
        ? `
          <ul>
            ${group.items.map(([label, value]) => `
              <li>
                <strong>${esc(label)}</strong>
                <span>${esc(value)}</span>
              </li>
            `).join('')}
          </ul>
        `
        : `<p>${esc(group.empty)}</p>`
      }
    </section>
  `).join('');

  const actions = [];
  const addAction = (label, description, targetView) => {
    if (!actions.some(action => action.label === label)) {
      actions.push({ description, label, targetView });
    }
  };

  if (!documents.length) {
    addAction(
      'Import Documents',
      'Open the existing Knowledge Workspace document workflow.',
      'knowledge'
    );
  } else {
    addAction(
      'Open Knowledge Workspace',
      'Browse the catalog, documents, and knowledge objects.',
      'knowledge'
    );
  }

  if (unavailable.length || indexedWithoutSections.length || !sections.length) {
    addAction(
      'Inspect Source Extraction',
      'Review the production sections exposed for loaded documents.',
      'sources'
    );
  }

  if (
    pending.length ||
    unavailable.length ||
    unknown.length ||
    missingMetadata.length ||
    emptyEnabledLibraries.length ||
    disabledLibrariesWithDocuments.length
  ) {
    addAction(
      'Review Diagnostics',
      'Inspect existing application and indexing diagnostics.',
      'diagnostics'
    );
  }

  if (indexed.length && sections.length) {
    addAction(
      'Ask Chief a Question',
      'Return to the Command Desk and ask an evidence-based question.',
      'chat'
    );
  }

  $('#validationActions').innerHTML = actions.length
    ? actions.slice(0, 4).map(action => `
      <button
        type="button"
        data-validation-action="${esc(action.targetView)}"
      >
        <strong>${esc(action.label)}</strong>
        <span>${esc(action.description)}</span>
      </button>
    `).join('')
    : '<div class="mc-validation-empty">No action is required from the current system state.</div>';

  $$('[data-validation-action]').forEach(button => {
    button.onclick = () => show(button.dataset.validationAction);
  });

  renderAdvancedEvaluations();
}

$('#addEval').onclick = () => openModal(
  `
    <h2>Add advanced AI evaluation</h2>

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
      renderAdvancedEvaluations();
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
  const startupExperience = normalizeStartupExperience(settings.startupExperience);
  $$('input[name="startupExperience"]').forEach(input => {
    input.checked = input.value === startupExperience;
  });
}

$('#saveSettings').onclick = () => {
  engine.saveSettings({
    openaiUrl: $('#apiUrl').value.trim(),
    openaiModel: $('#model').value.trim(),
    openaiKey: $('#apiKey').value.trim(),
    timeout: Number($('#timeout').value) * 1000,
    topK: Number($('#topK').value),
    startupExperience: $('input[name="startupExperience"]:checked')?.value || 'mission-control'
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

    const importedProject = await engine.importProject(
      JSON.parse(await file.text())
    );

    if (importedProject.id !== DEMO_PROJECT_ID) previousUserProjectId = importedProject.id;
    missionControlView = 'home';

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
  modalCloseGuard = null;
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
  ready?.();
}

function closeModal(force = false) {
  if (!force && modalCloseGuard && !modalCloseGuard()) return;
  $('#modal').hidden = true;
  modalCloseGuard = null;
}

$('#closeModal').onclick = () => closeModal();

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
    '[data-view="drawings"]',
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

if (normalizeStartupExperience(state().settings.startupExperience) === 'mission-control') {
  if (state().activeProject !== 'general') engine.setProject('general');
  engine.createConversation();
}

refresh()
  .then(() => {
    return switchExperience(state().settings.startupExperience, { force: true, focus: false });
  })
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

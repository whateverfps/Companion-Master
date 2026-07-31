import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeStartupExperience,
  buildMissionControlPriorities,
  buildRecentActivity,
  buildProjectHealth,
  buildRecommendedActions,
  buildContinuation,
  friendlyWorkspaceLabel,
  countMissionControlSources,
  buildMissionControlModel,
  separateMissionControlProjects,
  resolvePreviousProject,
  missionControlResponseModeLabel
} from '../src/mission-control.js';
import fs from 'node:fs';
import { createDemonstrationProjectFixture, DEMO_PROJECT_ID } from '../src/demo-project.js';

const project = { id: 'p1', name: 'Clinic Renovation' };
const baseInspection = {
  inspectionId: 'i1', inspectionNumber: 'INS-001', title: 'Firestopping',
  status: 'Complete', result: 'Acceptable', inspectionDate: '2026-07-31'
};

test('startup experience defaults and invalid values normalize to Mission Control', () => {
  assert.equal(normalizeStartupExperience(), 'mission-control');
  assert.equal(normalizeStartupExperience('invalid'), 'mission-control');
  assert.equal(normalizeStartupExperience('professional-workspace'), 'professional-workspace');
});

test('Mission Control labels each response mode without combining answer surfaces', () => {
  assert.equal(missionControlResponseModeLabel('offline'), 'Source-only evidence');
  assert.equal(missionControlResponseModeLabel('source'), 'Source-only AI');
  assert.equal(missionControlResponseModeLabel('assisted'), 'Expert-assisted AI');
  assert.equal(missionControlResponseModeLabel('general'), 'General assistant AI');
});

test('priorities use the approved practical urgency order', () => {
  const priorities = buildMissionControlPriorities({
    today: '2026-07-31',
    inspections: [
      { ...baseInspection, inspectionId: 'deficient', inspectionNumber: 'INS-005', result: 'Deficient' },
      { ...baseInspection, inspectionId: 'progress', inspectionNumber: 'INS-004', status: 'In Progress' },
      { ...baseInspection, inspectionId: 'follow', inspectionNumber: 'INS-003', followUpRequired: true },
      { ...baseInspection, inspectionId: 'today', inspectionNumber: 'INS-002', followUpRequired: true, followUpDate: '2026-07-31' },
      { ...baseInspection, inspectionId: 'overdue', inspectionNumber: 'INS-001', followUpRequired: true, followUpDate: '2026-07-30' }
    ]
  });
  assert.deepEqual(priorities.map(item => item.kind), ['overdue', 'due-today', 'follow-up', 'in-progress', 'deficient']);
});

test('closed inspections do not create overdue or deficient priorities', () => {
  const priorities = buildMissionControlPriorities({ today: '2026-07-31', inspections: [{ ...baseInspection, status: 'Closed', result: 'Deficient', followUpRequired: true, followUpDate: '2026-07-01' }] });
  assert.deepEqual(priorities, []);
});

test('RFI and submittal type alone never fabricate pending priorities', () => {
  const documents = [
    { id: 'r1', category: 'RFIs', type: 'rfi', status: 'Open' },
    { id: 's1', category: 'Submittals', type: 'submittal', status: 'Approved' }
  ];
  assert.deepEqual(buildMissionControlPriorities({ today: '2026-07-31', documents }), []);
  assert.deepEqual(countMissionControlSources(documents), { drawings: 0, specifications: 0, rfis: 1, submittals: 1 });
});

test('recent activity requires explicit timestamps and orders deterministically', () => {
  const activity = buildRecentActivity({
    project,
    inspections: [
      { ...baseInspection, inspectionId: 'untimed' },
      { ...baseInspection, inspectionId: 'updated', createdAt: '2026-07-29T12:00:00Z', updatedAt: '2026-07-31T12:00:00Z', status: 'Complete' }
    ],
    documents: [
      { id: 'd1', title: 'Drawing', importedAt: '2026-07-30T12:00:00Z' },
      { id: 'd2', title: 'No timestamp' }
    ]
  });
  assert.deepEqual(activity.map(item => item.id), ['inspection:updated:updated', 'document:d1:imported']);
  assert.equal(activity[0].detail, 'Current status: Complete');
});

test('health categories explain exact facts and do not infer positive health from missing data', () => {
  assert.equal(buildProjectHealth().label, 'No Project Open');
  const empty = buildProjectHealth({ project, inspections: [], today: '2026-07-31' });
  assert.equal(empty.label, 'Ready to Begin');
  assert.match(empty.explanation, /no current inspection task/i);
  const attention = buildProjectHealth({ project, today: '2026-07-31', inspections: [{ ...baseInspection, result: 'Deficient' }] });
  assert.equal(attention.label, 'Needs Attention');
  assert.match(attention.explanation, /deficient result/i);
});

test('recommended actions preserve deterministic reasons and targets', () => {
  const priorities = buildMissionControlPriorities({ today: '2026-07-31', inspections: [{ ...baseInspection, result: 'Deficient' }] });
  const actions = buildRecommendedActions(priorities);
  assert.equal(actions[0].reason, 'The recorded inspection result is Deficient.');
  assert.deepEqual(actions[0].target, { view: 'inspections', inspectionId: 'i1' });
});

test('continuation describes only current-session state', () => {
  const items = buildContinuation({ selectedInspectionId: 'i1', activeWorkflowType: 'Inspection Preparation', hasEngineeringContext: true, selectedDocumentId: 'd1', hasConversation: true });
  assert.deepEqual(items.map(item => item.label), ['Resume Inspection', 'Continue Current Task', 'Return to Current Work', 'Continue Reviewing Source']);
  assert.ok(items.every(item => item.reason.includes('session') || item.label === 'Continue Current Task'));
});

test('friendly labels remain presentation-only', () => {
  assert.equal(friendlyWorkspaceLabel('engineering'), 'Current Work');
  assert.equal(friendlyWorkspaceLabel('workflow'), 'Current Task');
  assert.equal(friendlyWorkspaceLabel('knowledge'), 'Project Library');
  assert.equal(friendlyWorkspaceLabel('evidence'), 'Supporting References');
  assert.equal(friendlyWorkspaceLabel('relationships'), 'Related Information');
});

test('empty-state selection is explicit and helpful', () => {
  const model = buildMissionControlModel({ now: '2026-07-31T10:00:00', project, documents: [], sections: [], inspections: [] });
  assert.match(model.empty.priorities, /caught up/i);
  assert.match(model.empty.continuation, /Open an inspection/i);
  assert.match(model.empty.activity, /Activity will appear/i);
});

test('the demonstration fixture is compatible without project-name special cases', () => {
  const fixture = createDemonstrationProjectFixture();
  const demoProject = fixture.manifest.project;
  const model = buildMissionControlModel({
    now: '2026-03-20T10:00:00', project: demoProject,
    documents: fixture.documents, sections: fixture.sections,
    inspections: fixture.inspectionRecords, isDemonstration: demoProject.id === DEMO_PROJECT_ID
  });
  assert.equal(model.project.isDemonstration, true);
  assert.ok(model.summary.drawings > 0);
  assert.ok(model.summary.specifications > 0);
  assert.ok(model.summary.rfis > 0);
  assert.ok(model.summary.submittals > 0);
  assert.ok(model.priorities.some(item => item.kind === 'overdue'));
  assert.ok(model.priorities.some(item => item.kind === 'due-today'));
});

test('My Projects separates user projects from the built-in demonstration', () => {
  const separated = separateMissionControlProjects([
    { id: DEMO_PROJECT_ID, name: 'Veterans Community Health Clinic Renovation' },
    { id: 'zeta', name: 'Zeta Project' },
    { id: 'alpha', name: 'Alpha Project' }
  ], DEMO_PROJECT_ID);
  assert.deepEqual(separated.userProjects.map(item => item.id), ['alpha', 'zeta']);
  assert.equal(separated.demonstrationProject.id, DEMO_PROJECT_ID);
});

test('return navigation restores only an available prior user project', () => {
  const projects = [{ id: 'user-project', name: 'User Project' }, { id: DEMO_PROJECT_ID, name: 'Demo' }];
  assert.equal(resolvePreviousProject('user-project', projects, DEMO_PROJECT_ID)?.id, 'user-project');
  assert.equal(resolvePreviousProject('removed', projects, DEMO_PROJECT_ID), null);
  assert.equal(resolvePreviousProject(DEMO_PROJECT_ID, projects, DEMO_PROJECT_ID), null);
});

test('Mission Control retains the shared dark visual system without white surfaces', () => {
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  const refinement = css.slice(css.lastIndexOf('Phase 22.1'));
  assert.match(refinement, /\.mc-control-shell\{[^}]*#071119/);
  assert.match(refinement, /\.mc-control-card[^}]*#0d1c26/);
  assert.doesNotMatch(refinement, /background(?:-color)?:#fff(?:fff)?(?:[;}]|$)/i);
});

test('Mission Control presents synchronized deterministic work packages without dead graphical claims', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(app, /buildActiveConstructionPackage/);
  assert.match(app, /CONSTRUCTION WORK PACKAGE/);
  assert.match(app, /Work shown or referenced/);
  assert.match(app, /Supporting requirements/);
  assert.match(app, /Current inspections/);
  assert.match(app, /Graphical association has not been verified/);
  assert.match(app, /data-work-package-current/);
  assert.match(app, /data-work-package-inspection/);
  assert.match(app, /data-work-package-target/);
  assert.match(app, /updateDrawingSearchResults/);
  assert.match(app, /pendingDrawingContext/);
  assert.match(css, /\.mc-work-package/);
  assert.doesNotMatch(app, /duct routing (?:is|shown)|diffuser quantity (?:is|shown)|clash detected/i);
});

test('Phase 23C presents drawings as construction evidence with a field-grade hierarchy', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(app, /CONSTRUCTION INTELLIGENCE · PLANS/);
  assert.match(app, /Find a sheet, room, trade, or tag/);
  assert.match(app, /Matched Room|matchedReason/);
  assert.match(app, /Construction Evidence/);
  assert.match(app, /Analysis details/);
  assert.match(app, /Reanalyze Drawing Set/);
  assert.match(app, /aria-label="Drawing navigation"/);
  assert.match(app, /aria-label="Drawing view controls"/);
  assert.match(app, /aria-label="Construction context actions"/);
  assert.match(app, /Reset View/);
  assert.match(app, /observationKindLabel/);
  assert.doesNotMatch(app, /<strong>\$\{esc\(item\.kind\)\}<\/strong>/);
  assert.match(css, /Phase 23C/);
  assert.match(css, /#missionDrawingViewer \.mc-drawing-evidence/);
  assert.match(css, /\.mc-drawing-stage\{min-height:520px/);
});

test('Phase 24A keeps construction work primary and viewport/search controls stable', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(app, /mc-construction-orientation/);
  assert.match(app, /drawingZoom = null/);
  assert.match(app, /preservedCanvas/);
  assert.match(app, /PageDown.*PageUp.*Home.*End/);
  assert.match(app, /Construction Timeline/);
  assert.doesNotMatch(app, /Matched positioned drawing text/);
  assert.match(css, /Phase 24A/);
  assert.match(css, /position:sticky/);
});

test('Phase 24A.1 contains drawing lifecycle failures without blanking the workspace', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(app, /drawingUpgradeWork = new Map/);
  assert.match(app, /drawingUpgradeFailures = new Set/);
  assert.match(app, /drawingLifecycleUnavailable/);
  assert.match(app, /Drawing source unavailable/);
  assert.match(app, /open-owning-project/);
  assert.match(app, /return-to-drawing-sets/);
  assert.match(app, /retry-analysis-upgrade/);
  assert.match(app, /reduceStaleDrawingTarget/);
  assert.doesNotMatch(app.slice(app.indexOf('async function currentDrawingAnalyses'), app.indexOf('async function buildActiveConstructionPackage')), /throw /);
  assert.match(css, /mc-drawing-recovery/);
});

test('Phase 24A.2 exposes a full-scale stable viewer and verified construction overlays', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(app, /Analyze Page Objects/);
  assert.match(app, /data-drawing-overlay/);
  assert.match(app, /Expand Drawing/);
  assert.match(app, /calculateDrawingFit/);
  assert.match(app, /Candidate occurrence/);
  assert.match(css, /\.mc-drawing-layout\.drawing-expanded/);
  assert.match(css, /\.mc-drawing-object-overlay\.confirmed/);
  assert.doesNotMatch(css, /\.mc-drawing-stage\{[^}]*background:\s*(?:white|#fff(?:fff)?)/i);
});

test('Phase 24B makes Chief construction-first with one synchronized drawing state', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  const messageMarkup = app.slice(app.indexOf('class="mc-control-messages"'), app.indexOf('id="missionControlComposer"'));
  assert.ok(messageMarkup.indexOf('constructionWorkPackageMarkup(message)') < messageMarkup.indexOf('mc-control-message-content'));
  assert.match(app, /chiefConstructionContext/);
  assert.match(app, /validateChiefConstructionContext/);
  assert.match(app, /missionInlineDrawingViewer/);
  assert.match(app, /Open Full Drawing Workspace/);
  assert.match(app, /activeDrawingRenderIdentity/);
  assert.match(app, /renderCanvas/);
  assert.match(app, /updateDrawingOverlays/);
  assert.match(app, /message\.workPackageReferences\) return ''/);
  assert.match(css, /Phase 24B/);
  assert.match(css, /\.mc-inline-plan/);
  assert.doesNotMatch(app, /engine\.setState\([^)]*workPackage|persistWorkPackage/);
});

test('Mission Control exposes My Projects and an accessible demonstration orientation banner', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-control-projects>My Projects/);
  assert.match(app, /aria-labelledby="mcDemoBannerTitle"/);
  assert.match(app, /Stop Demonstration/);
  assert.match(app, /Reset Demonstration Project/);
});

test('stopping the demonstration clears transient state without deleting the fixture or restoring a project', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const lifecycle = app.slice(app.indexOf('function clearDemonstrationTransientState'), app.indexOf('async function openDemonstrationProject'));
  assert.match(lifecycle, /activeRetrievalSession = null/);
  assert.match(lifecycle, /selectedInspectionId = null/);
  assert.match(lifecycle, /clearActiveContext/);
  assert.match(lifecycle, /engine\.setProject\('general'\)/);
  assert.match(lifecycle, /engine\.createConversation/);
  assert.doesNotMatch(lifecycle, /deleteProject|resetDemoProject/);
});

test('Mission Control explicitly isolates inactive shells from layout and focus', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(app, /\.inert = !missionControl/);
  assert.match(app, /\.inert = missionControl/);
  assert.match(app, /setAttribute\('aria-hidden'/);
  assert.match(css, /\[hidden\],\.mc-shell-inactive\{display:none!important\}/);
});

test('Mission Control owns native chat, conversation history, attachments, and precise source actions', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /function renderMissionControlChat/);
  assert.match(app, /function renderConversationHistory/);
  assert.match(app, /id="missionControlComposer"/);
  assert.match(app, /id="missionControlFiles"/);
  assert.match(app, /data-control-source-document/);
  assert.doesNotMatch(app.slice(app.indexOf('if \(button\.dataset\.controlPrompt\)'), app.indexOf('const action = button.dataset.controlAction')), /openProfessionalDestination\(\{ view: 'chat'/);
});

test('Stop Demonstration is top-positioned and starts a fresh conversation', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const banner = app.indexOf('Stop Demonstration');
  const dashboard = app.indexOf('mc-control-project"');
  assert.ok(banner > -1 && banner < dashboard);
  assert.match(app.slice(app.indexOf('async function returnFromDemonstrationProject'), app.indexOf('async function openDemonstrationProject')), /missionControlView = 'chat'/);
});

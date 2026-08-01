import { classifyEngineeringNavigationIntent, normalizeRegisteredSheetNumber } from './engineering-locator.js';
import { drawingAnalysisRequiresUpgrade } from './drawing-intelligence.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];

export function inspectDrawingRegistryRuntime({ activeProject = null, documents = [], analyses = [], activeAnalyses = [], query = '', rebuild = {} } = {}) {
  const records = list(analyses).flatMap(analysis => list(analysis.drawingRegistry).length
    ? analysis.drawingRegistry
    : list(analysis.sheets).map(sheet => ({ ...sheet, projectId: analysis.projectId, documentId: analysis.documentId, drawingSetId: analysis.drawingSetId })));
  const intent = classifyEngineeringNavigationIntent(query);
  const rawSheetToken = text(query).match(/\b(?:sheet|drawing|plan)\s+((?:\d{1,4}\s*)?[A-Z]{1,3}\s*-?\s*\d{3,4}[A-Z]?)/i)?.[1] || '';
  const normalizedQueryKey = intent.kind === 'exact-drawing-navigation' ? intent.value : '';
  const candidates = records.filter(record => normalizeRegisteredSheetNumber(record.normalizedSheetNumber || record.sheetNumber) === normalizedQueryKey);
  const disciplineMatches = intent.discipline ? candidates.filter(record => text(record.discipline) === intent.discipline) : candidates;
  const projectMatches = activeProject?.id && activeProject.id !== 'general' ? disciplineMatches.filter(record => text(record.projectId) === text(activeProject.id)) : disciplineMatches;
  const targets = ['61G001', '61M101', '61T402'];
  const matchingRecords = records.filter(record => targets.includes(normalizeRegisteredSheetNumber(record.normalizedSheetNumber || record.sheetNumber)));
  return {
    activeProjectId: text(activeProject?.id), activeProjectName: text(activeProject?.name),
    activeProjectRegistryCount: list(activeAnalyses).reduce((count, analysis) => count + (list(analysis.drawingRegistry).length || list(analysis.sheets).length), 0),
    globalRegistryCount: records.length,
    documents: list(documents).map(document => ({ documentId: text(document.id), title: text(document.title || document.name) })),
    analyses: list(analyses).map(analysis => ({ documentId: analysis.documentId, drawingSetId: analysis.drawingSetId, projectId: analysis.projectId, analysisVersion: analysis.analysisVersion, profileVersion: analysis.profile?.profileVersion || 0, profileSelected: Boolean(analysis.profile?.selected), profileEvidence: analysis.profile?.evidence || {}, drawingIndexDetected: Boolean(analysis.drawingIndex?.detected), drawingIndexPage: analysis.drawingIndex?.sourcePage || null, parsedIndexRowCount: analysis.indexEntries?.length || 0, registeredSheetCount: analysis.drawingRegistry?.length || analysis.sheets?.length || 0, staleAnalysis: drawingAnalysisRequiresUpgrade(analysis) })),
    registeredSheetCount: records.length,
    firstFormattedSheetNumbers: records.slice(0, 20).map(record => text(record.sheetNumber)),
    firstNormalizedSheetNumbers: records.slice(0, 20).map(record => normalizeRegisteredSheetNumber(record.normalizedSheetNumber || record.sheetNumber)),
    knownSheets: Object.fromEntries(targets.map(key => [key, records.some(record => normalizeRegisteredSheetNumber(record.normalizedSheetNumber || record.sheetNumber) === key)])),
    matchingRecords: matchingRecords.map(record => { const analysis = list(analyses).find(item => item.drawingSetId === record.drawingSetId); return { drawingId: record.drawingId, projectId: record.projectId, documentId: record.documentId, drawingSetId: record.drawingSetId, sheetId: record.sheetId, sheetNumber: record.sheetNumber, normalizedSheetNumber: normalizeRegisteredSheetNumber(record.normalizedSheetNumber || record.sheetNumber), sheetTitle: record.sheetTitle, pageNumber: record.pageNumber, profileVersion: analysis?.profile?.profileVersion || 0 }; }),
    ownershipFailures: list(analyses).filter(analysis => !analysis.projectId || analysis.projectId === 'general').map(analysis => ({ drawingSetId: analysis.drawingSetId, projectId: analysis.projectId || '', reason: 'invalid-bedford-owner' })),
    rebuild: { attempted: Boolean(rebuild.attempted), results: list(rebuild.results) },
    commandTrace: { intent, rawSheetToken, normalizedQueryKey, globalCandidateCount: candidates.length, candidatesBeforeFiltering: candidates.map(record => record.drawingId), disciplineMatchCount: disciplineMatches.length, projectMatchCount: projectMatches.length, finalMatchCount: projectMatches.length, rejectionReason: candidates.length === 0 ? 'normalized-sheet-not-registered' : disciplineMatches.length === 0 ? 'discipline-mismatch' : projectMatches.length === 0 ? 'project-ownership-mismatch' : projectMatches.length > 1 ? 'multiple-exact-registered-drawings' : '' }
  };
}

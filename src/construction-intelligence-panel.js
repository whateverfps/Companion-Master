const list = value => Array.isArray(value) ? value : [];
const text = value => value === null || value === undefined ? '' : String(value).trim();
export const CONSTRUCTION_INTELLIGENCE_PANEL_STATE_KEY = 'mission-companion:construction-intelligence-panel:v1';
export const CONSTRUCTION_INTELLIGENCE_DEFAULT_EXPANDED = Object.freeze(['current', 'specifications', 'field-requirements']);

export function loadConstructionIntelligencePanelState(storage = globalThis.localStorage) {
  try {
    const stored = JSON.parse(storage?.getItem?.(CONSTRUCTION_INTELLIGENCE_PANEL_STATE_KEY) || '{}');
    return { expanded: [...new Set(Array.isArray(stored.expanded) ? stored.expanded.filter(text) : CONSTRUCTION_INTELLIGENCE_DEFAULT_EXPANDED)] };
  } catch { return { expanded: [...CONSTRUCTION_INTELLIGENCE_DEFAULT_EXPANDED] }; }
}

export function saveConstructionIntelligencePanelState(expanded, storage = globalThis.localStorage) {
  const state = { expanded: [...new Set(list(expanded).map(text).filter(Boolean))].slice(0, 20) };
  try { storage?.setItem?.(CONSTRUCTION_INTELLIGENCE_PANEL_STATE_KEY, JSON.stringify(state)); } catch { /* UI preference persistence is optional. */ }
  return state;
}

function unique(items, key) {
  const seen = new Set();
  return list(items).filter(item => {
    const identity = key(item);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function relationshipRecords(groups, names) {
  return unique(names.flatMap(name => list(groups?.[name])).filter(item => item?.relationship?.verificationState !== 'rejected'), item => item.entity?.entityId || item.relationship?.relationshipId)
    .map(item => ({ ...item, label: text(item.entity?.label || item.entity?.title), target: item.entity?.metadata?.navigationTarget || null }));
}

function specificationRecords(requirements, links, { mode = 'page', objectId = '' } = {}) {
  const records = [
    ...list(requirements?.confirmedSpecifications),
    ...list(requirements?.suggestedSpecifications),
    ...list(links).filter(item => item.status !== 'rejected')
  ].filter(item => mode === 'object'
    ? text(item.objectId || item.sourceObjectId) === text(objectId) || text(item.applicabilityScope) === 'object-specific' || (!text(item.objectId || item.sourceObjectId) && !text(item.applicabilityScope))
    : !text(item.objectId || item.sourceObjectId) && text(item.applicabilityScope || 'page-wide') !== 'object-specific');
  return unique(records, item => `${text(item.specificationDocumentId)}:${text(item.sectionNumber).replace(/\D/g, '')}:${text(item.article?.id || item.articleReference)}`)
    .map(item => ({
      ...item,
      label: `${text(item.sectionNumber)}${text(item.sectionTitle) ? ` — ${text(item.sectionTitle)}` : ''}`,
      status: item.status || 'suggested',
      evidenceText: text(item.evidenceText || item.reason),
      canOpen: Boolean(text(item.specificationDocumentId) && text(item.sectionNumber)),
      canShowSource: Boolean(item.startPdfPage || item.sourcePageNumber),
      sourcePageNumber: Number(item.startPdfPage || item.sourcePageNumber) || null,
      evidenceCount: Math.max(1, list(item.evidence).length, list(item.evidenceObservations).length)
    }));
}

function historyRecords(object, history, specificationLinks) {
  const entries = [
    object?.createdAt ? { label: 'Created', value: object.createdAt } : null,
    object?.updatedAt ? { label: 'Modified', value: object.updatedAt } : null,
    object?.sourceObservationIds?.length ? { label: 'Parser observations', value: String(object.sourceObservationIds.length) } : null,
    ...list(history).map(item => ({ label: text(item.action || item.source || 'Object history'), value: text(item.timestamp || item.createdAt), note: text(item.note) })),
    ...list(specificationLinks).filter(item => item.status === 'confirmed').map(item => ({ label: 'Specification confirmation', value: text(item.updatedAt || item.createdAt), note: text(item.sectionNumber) }))
  ].filter(Boolean);
  return unique(entries, item => `${item.label}:${item.value}:${item.note || ''}`);
}

export function buildConstructionIntelligencePanelModel(input = {}) {
  const sheet = input.sheet || {};
  const object = input.selectedObject || null;
  if (!object) {
    const counts = list(input.pageObjects).filter(item => item.verificationState !== 'rejected').reduce((result, item) => {
      const key = text(item.type || item.objectType || 'object').replace(/-/g, ' ');
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    const specifications = specificationRecords(input.requirements, input.specificationLinks, { mode: 'page' });
    const fieldRequirements = unique(Object.entries(input.requirements?.fieldRequirements || {}).flatMap(([category, items]) => list(items).map(item => ({ ...item, category }))), item => `${item.category}:${item.requirementId || item.sectionNumber}:${item.article?.id || ''}`);
    return {
      mode: 'page',
      page: {
        drawing: text(input.document?.title || input.document?.name),
        sheet: text(sheet.sheetNumber) || `Page ${Number(sheet.pageNumber) || 1}`,
        sheetTitle: text(sheet.sheetTitle), building: text(sheet.building),
        discipline: text(sheet.discipline) || 'Unknown',
        activeTrade: text(input.trade?.label) || 'All Trades',
        pageStatus: text(input.pageStatus || sheet.identityStatus || (sheet.metadataAvailable ? 'Partial metadata' : 'Fallback')),
        drawingNotes: unique(list(input.pageNotes).map(item => text(item.label || item.value || item.text)).filter(Boolean), item => item),
        objectCounts: counts
      },
      specifications: { confirmed: specifications.filter(item => item.status === 'confirmed'), suggested: specifications.filter(item => item.status === 'suggested') },
      fieldRequirements,
      drawingContent: counts,
      projectInformation: {
        inspections: relationshipRecords(input.relationshipGroups, ['inspections']), rfis: relationshipRecords(input.relationshipGroups, ['rfis']), submittals: relationshipRecords(input.relationshipGroups, ['submittals']),
        photos: relationshipRecords(input.relationshipGroups, ['photos']), documents: relationshipRecords(input.relationshipGroups, ['documents', 'reports']), risks: relationshipRecords(input.relationshipGroups, ['risks']),
        procurement: relationshipRecords(input.relationshipGroups, ['procurement', 'procurementItems']), shutdowns: relationshipRecords(input.relationshipGroups, ['shutdowns']), commissioning: relationshipRecords(input.relationshipGroups, ['commissioning']),
        progress: relationshipRecords(input.relationshipGroups, ['progress']), pmis: relationshipRecords(input.relationshipGroups, ['pmis'])
      },
      relatedDrawings: relationshipRecords(input.relationshipGroups, ['relatedDrawings']),
      chiefInsights: relationshipRecords(input.relationshipGroups, ['chiefInsights', 'insights']),
      projectWideRequirements: list(input.requirements?.projectWideRequirements),
      diagnostics: list(input.developerDiagnostics)
    };
  }

  const groups = input.relationshipGroups || {};
  const specifications = specificationRecords(input.requirements, input.specificationLinks, { mode: 'object', objectId: object.objectId });
  const fields = Object.entries(input.requirements?.fieldRequirements || {}).flatMap(([category, items]) => list(items).map(item => ({ ...item, category })));
  return {
    mode: 'object',
    object: {
      name: text(object.label || object.tag), type: text(object.type || object.objectType), objectId: text(object.objectId),
      building: text(object.buildingId || sheet.building), room: text(object.roomId), trade: text(object.trade), system: text(object.system),
      confidence: Number(object.confidence) || 0, revision: text(object.revision || object.metadata?.revision), verificationState: text(object.verificationState)
      , hasLocation: Boolean(object.region || object.graphicalRegion), hasPossibleDuplicates: Boolean(input.hasPossibleDuplicates), hasMergedObjects: Boolean(object.mergedObjectIds?.length), canLinkSpecification: Boolean(input.canLinkSpecification)
    },
    specifications: {
      confirmed: specifications.filter(item => item.status === 'confirmed'),
      suggested: specifications.filter(item => item.status === 'suggested'),
      articles: unique(specifications.map(item => item.article).filter(Boolean), item => item.id || `${item.heading}:${item.pageNumber}`)
    },
    fieldRequirements: unique(fields, item => `${item.category}:${item.requirementId || item.sectionNumber}`),
    pmis: {
      inspections: relationshipRecords(groups, ['inspections']), risks: relationshipRecords(groups, ['risks']), issues: relationshipRecords(groups, ['issues']),
      rfis: relationshipRecords(groups, ['rfis']), submittals: relationshipRecords(groups, ['submittals']), shutdowns: relationshipRecords(groups, ['shutdowns']), commissioning: relationshipRecords(groups, ['commissioning'])
    },
    schedule: relationshipRecords(groups, ['scheduleActivities', 'activities']),
    procurement: relationshipRecords(groups, ['procurement', 'procurementItems']),
    documents: {
      photos: relationshipRecords(groups, ['photos']), reports: relationshipRecords(groups, ['reports', 'inspectionReports', 'dailyReports']),
      notes: relationshipRecords(groups, ['fieldNotes']), correspondence: relationshipRecords(groups, ['correspondence'])
    },
    history: historyRecords(object, input.objectHistory, input.specificationLinks),
    chiefInsights: relationshipRecords(groups, ['chiefInsights', 'insights', 'recommendations']),
    diagnostics: list(input.developerDiagnostics),
    chiefContext: {
      objectId: text(object.objectId), viewport: input.viewportContext || null, roomId: text(object.roomId) || null, trade: text(input.trade?.key || object.trade),
      specifications: specifications.filter(item => item.status === 'confirmed'), pmis: groups, schedule: relationshipRecords(groups, ['scheduleActivities', 'activities']),
      inspections: relationshipRecords(groups, ['inspections']), history: historyRecords(object, input.objectHistory, input.specificationLinks)
    },
    sourceEntityId: text(input.sourceEntityId)
  };
}

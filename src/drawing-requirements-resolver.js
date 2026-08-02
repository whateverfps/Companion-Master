const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const SCOPES = new Set(['project-wide', 'building-wide', 'page-wide', 'room-wide', 'object-specific', 'selected-region-candidate']);
const STATUSES = new Set(['confirmed', 'suggested', 'rejected']);

function requirementId(input) {
  return `drawing-requirement:${[input.projectId, input.scope, input.sourceObjectId || input.sourceRoomId || input.sourcePageId, input.specificationDocumentId, input.sectionNumber, input.articleId].map(text).join(':')}`;
}

export function createRequirementRecord(input = {}, specificationIndex) {
  const section = specificationIndex?.get?.(input.specificationDocumentId, input.sectionNumber);
  const scope = SCOPES.has(input.applicabilityScope) ? input.applicabilityScope : '';
  const status = STATUSES.has(input.status) ? input.status : 'suggested';
  if (!text(input.projectId) || !section || section.projectId !== text(input.projectId) || !scope || !text(input.evidenceType) || (!text(input.evidenceText) && input.origin !== 'manual')) return null;
  const article = input.articleId ? section.articles?.find(item => item.id === input.articleId) : null;
  return {
    requirementId: text(input.requirementId) || requirementId({ ...input, sectionNumber: section.sectionNumber }), projectId: text(input.projectId),
    relationshipId: text(input.relationshipId) || null, drawingSpecLinkId: text(input.drawingSpecLinkId) || null,
    sourceDocumentId: text(input.sourceDocumentId) || null, sourcePageId: text(input.sourcePageId) || null, sourceObjectId: text(input.sourceObjectId) || null, sourceRoomId: text(input.sourceRoomId) || null,
    evidenceType: text(input.evidenceType), evidenceText: text(input.evidenceText), graphicalRegion: input.graphicalRegion || null,
    specificationDocumentId: section.documentId, sectionNumber: section.sectionNumber, sectionTitle: section.sectionTitle,
    article: article ? structuredClone(article) : null, applicabilityScope: scope, confidence: Math.max(0, Math.min(1, Number(input.confidence) || 0)), status,
    reason: text(input.reason), origin: text(input.origin || 'relationship'), tradeChannels: list(input.tradeChannels).map(text).filter(Boolean),
    baselineSource: input.baselineSource ? structuredClone(input.baselineSource) : { documentId: section.documentId, sectionNumber: section.sectionNumber, revisionSource: section.revisionSource || null },
    modifications: list(input.modifications).map(item => structuredClone(item)), procurement: input.procurement ? structuredClone(input.procurement) : null, schedule: input.schedule ? structuredClone(input.schedule) : null
  };
}

function scopeFor(entity) {
  if (!entity) return '';
  if (entity.entityType === 'drawing-object' || entity.entityType === 'equipment') return 'object-specific';
  if (entity.entityType === 'room') return 'room-wide';
  if (entity.entityType === 'drawing-page') return 'page-wide';
  if (entity.entityType === 'building') return 'building-wide';
  if (entity.entityType === 'project') return 'project-wide';
  return '';
}

function sectionCategory(section) {
  const categories = new Set(section?.articles?.map(item => item.kind).filter(Boolean));
  return { submittals: categories.has('submittal'), quality: categories.has('quality assurance'), testing: categories.has('testing'), inspection: categories.has('inspection'), commissioning: categories.has('commissioning'), closeout: categories.has('closeout') };
}

export function createDrawingRequirementsResolver({ specificationIndex, relationshipEngine, providers = [], onMetric = () => {}, now = () => Date.now() } = {}) {
  const cache = new Map(); let generation = 0;
  const providerList = list(providers).filter(item => typeof item === 'function');
  const resolve = input => {
    const started = now(); const projectId = text(input.projectId); const trade = input.tradeChannel || { key: 'all-trades', divisions: [] };
    const sourceIds = [text(input.selectedObjectEntityId), text(input.selectedRoomEntityId), text(input.pageEntityId)].filter(Boolean);
    const cacheKey = JSON.stringify([projectId, sourceIds, trade.key, input.viewportContext?.selectedRegion, list(input.drawingSpecLinks).map(item => [item.linkId, item.status, item.updatedAt]), list(input.projectWideRequirements).map(item => [item.sectionNumber, item.status])]);
    if (cache.has(cacheKey)) return structuredClone(cache.get(cacheKey));
    const requirements = []; const governingDrawings = []; const warnings = [];
    const chosenSourceId = sourceIds[0]; const chosenSource = relationshipEngine?.getEntity?.(chosenSourceId);
    if (input.pageEntityId) {
      const page = relationshipEngine?.getEntity?.(input.pageEntityId);
      if (page) governingDrawings.push({ entity: page, relationship: null, status: page.verificationState, reason: 'Current active drawing page.' });
      for (const related of relationshipEngine?.getRelatedEntities?.(input.pageEntityId, { projectId, entityTypes: ['drawing-page'], verificationStates: ['confirmed', 'suggested'], limit: 50 }) || []) governingDrawings.push({ ...related, status: related.relationship.verificationState, reason: related.relationship.evidence?.[0]?.confidenceReason || 'Explicit drawing relationship.' });
    }
    for (const related of relationshipEngine?.getRelatedEntities?.(chosenSourceId, { projectId, entityTypes: ['specification-section', 'specification-article'], relationshipTypes: ['governed-by', 'requires', 'references'], verificationStates: ['confirmed', 'suggested'], limit: 100 }) || []) {
      const sectionEntity = related.entity.entityType === 'specification-section' ? related.entity : relationshipEngine.getRelatedEntities(related.entity.entityId, { projectId, entityTypes: ['specification-section'], relationshipTypes: ['belongs-to'], verificationStates: ['confirmed'], limit: 1 })[0]?.entity;
      if (!sectionEntity) continue;
      const evidence = related.relationship.evidence?.[0] || {};
      const record = createRequirementRecord({ projectId, sourceDocumentId: related.relationship.sourceDocumentId || chosenSource?.sourceDocumentId, sourcePageId: related.relationship.sourcePageId || input.viewportContext?.pageId, sourceObjectId: chosenSource?.entityType === 'drawing-object' ? chosenSource.sourceObjectId : null, sourceRoomId: chosenSource?.entityType === 'room' ? chosenSource.entityId : null,
        specificationDocumentId: sectionEntity.sourceDocumentId, sectionNumber: sectionEntity.normalizedKey, articleId: related.entity.entityType === 'specification-article' ? related.entity.normalizedKey : '', applicabilityScope: scopeFor(chosenSource),
        evidenceType: evidence.evidenceType || (related.relationship.origin === 'manual' ? 'manual confirmation' : 'relationship evidence'), evidenceText: evidence.sourceText || related.relationship.metadata?.note || 'Authoritative manually linked project relationship.', graphicalRegion: evidence.graphicalRegion,
        confidence: related.relationship.confidence, status: related.relationship.verificationState, reason: evidence.confidenceReason || `${related.relationship.relationshipType} relationship from ${chosenSource?.label || 'active context'}.`, origin: related.relationship.origin, tradeChannels: list(related.relationship.metadata?.tradeChannels) }, specificationIndex);
      if (record) record.relationshipId = related.relationship.relationshipId;
      if (record) requirements.push(record);
    }
    for (const link of list(input.drawingSpecLinks).filter(item => item.status !== 'rejected')) {
      const sourceScope = link.objectId && input.selectedObjectId === link.objectId ? 'object-specific' : link.objectId ? '' : 'page-wide';
      if (!sourceScope) continue;
      const record = createRequirementRecord({ projectId, sourceDocumentId: link.drawingDocumentId, sourcePageId: link.drawingPageId, sourceObjectId: link.objectId, specificationDocumentId: link.specificationDocumentId, sectionNumber: link.sectionNumber,
        applicabilityScope: sourceScope, evidenceType: link.evidenceSource || 'drawing specification link', evidenceText: link.evidenceText || link.note || 'Manual drawing-to-specification link.', graphicalRegion: link.graphicalRegion, confidence: link.confidence, status: link.status,
        reason: link.reason || (link.origin === 'explicit' ? 'Explicit specification reference on the drawing.' : link.origin === 'manual' ? 'Manually confirmed drawing requirement.' : 'Evidence-backed project vocabulary suggestion.'), origin: link.origin }, specificationIndex);
      if (record) record.drawingSpecLinkId = link.linkId;
      if (record) requirements.push(record);
    }
    for (const related of relationshipEngine?.getRelatedEntities?.(`project:${projectId}`, { projectId, entityTypes: ['specification-section'], relationshipTypes: ['governed-by', 'requires'], verificationStates: ['confirmed', 'suggested'], limit: 100 }) || []) {
      const evidence = related.relationship.evidence?.[0] || {};
      const record = createRequirementRecord({ projectId, relationshipId: related.relationship.relationshipId, specificationDocumentId: related.entity.sourceDocumentId, sectionNumber: related.entity.normalizedKey, applicabilityScope: 'project-wide', evidenceType: evidence.evidenceType || 'project-wide requirement', evidenceText: evidence.sourceText || related.relationship.metadata?.note || 'Imported authoritative project-wide relationship.', confidence: related.relationship.confidence, status: related.relationship.verificationState, reason: evidence.confidenceReason || 'Explicit project-wide relationship.', origin: related.relationship.origin }, specificationIndex);
      if (record) requirements.push(record);
    }
    for (const item of list(input.projectWideRequirements).filter(item => item.status !== 'rejected')) {
      const record = createRequirementRecord({ ...item, projectId, applicabilityScope: 'project-wide', evidenceType: item.evidenceType || 'project-wide requirement', evidenceText: item.evidenceText, reason: item.reason || 'Explicitly identified project-wide baseline requirement.' }, specificationIndex);
      if (record) requirements.push(record);
    }
    if (input.viewportContext?.selectedRegion && !chosenSource) warnings.push('Selected drawing region has no verified object or room requirement relationship.');
    for (const provider of providerList) { try { for (const candidate of list(provider(structuredClone(input)))) { const record = createRequirementRecord(candidate, specificationIndex); if (record) requirements.push(record); } } catch (error) { warnings.push(error?.message || 'A requirement provider is unavailable.'); } }
    const deduplicated = [...new Map(requirements.sort((a, b) => (a.status === 'confirmed' ? 0 : 1) - (b.status === 'confirmed' ? 0 : 1) || a.applicabilityScope.localeCompare(b.applicabilityScope) || a.sectionNumber.localeCompare(b.sectionNumber)).map(item => [item.requirementId, item])).values()];
    const allowed = trade.key === 'all-trades' ? deduplicated : deduplicated.filter(item => item.applicabilityScope === 'project-wide' || trade.divisions.includes(item.sectionNumber.replace(/\D/g, '').slice(0, 2)) || item.tradeChannels.includes(trade.key));
    const articleLookupStarted = now();
    const fieldRequirements = { submittals: [], 'quality assurance': [], 'products/materials': [], execution: [], 'examination/preparation': [], installation: [], testing: [], inspection: [], protection: [], commissioning: [], closeout: [] };
    for (const requirement of allowed) {
      const section = specificationIndex.get(requirement.specificationDocumentId, requirement.sectionNumber);
      for (const article of list(section?.articles)) if (article.kind && fieldRequirements[article.kind]) fieldRequirements[article.kind].push({ ...requirement, article: structuredClone(article) });
      const legacy = sectionCategory(section);
      if (legacy.quality && !fieldRequirements['quality assurance'].some(item => item.requirementId === requirement.requirementId)) fieldRequirements['quality assurance'].push(requirement);
    }
    fieldRequirements.quality = fieldRequirements['quality assurance'];
    onMetric({ operation: 'requirement-article-lookup', durationMs: Math.max(0, now() - articleLookupStarted), sectionCount: allowed.length, articleCount: Object.entries(fieldRequirements).filter(([key]) => key !== 'quality').reduce((sum, [, items]) => sum + items.length, 0) });
    const output = { projectId, contextSourceEntityId: chosenSourceId || null, tradeChannel: trade.key, governingDrawings, requirements: allowed, confirmedSpecifications: allowed.filter(item => item.status === 'confirmed' && item.applicabilityScope !== 'project-wide'), suggestedSpecifications: allowed.filter(item => item.status === 'suggested' && item.applicabilityScope !== 'project-wide'), projectWideRequirements: allowed.filter(item => item.applicabilityScope === 'project-wide'), fieldRequirements, warnings, resolvedAt: new Date().toISOString() };
    cache.set(cacheKey, output); onMetric({ operation: 'requirement-resolution', durationMs: Math.max(0, now() - started), requirementCount: allowed.length }); return structuredClone(output);
  };
  return {
    resolve,
    async resolveLatest(input) { const requestGeneration = ++generation; const result = await Promise.resolve().then(() => resolve(input)); return requestGeneration === generation ? { committed: true, generation, result } : { committed: false, generation: requestGeneration, result: null }; },
    invalidate() { cache.clear(); generation += 1; },
    generation: () => generation
  };
}

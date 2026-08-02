import { normalizeSpecificationNumber } from './specification-index.js';

const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const clean = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const BEDFORD_PROJECT_SPECIFICATION_VOCABULARY = Object.freeze([
  { sectionNumber: '10 14 00', terms: ['signage schedule', 'signage reference', 'sign type', 'signage', 'sign'] },
  { sectionNumber: '09 65 13', terms: ['resilient base', 'base type', 'rubber base', 'vinyl base', 'rb'] },
  { sectionNumber: '09 65 19', terms: ['resilient tile', 'resilient flooring', 'floor tile', 'lvt', 'vct'] },
  { sectionNumber: '09 91 00', terms: ['finish p 1', 'finish p 2', 'painted finish', 'wall finish', 'painted', 'paint', 'coating', 'p 1', 'p 2'] },
  { sectionNumber: '10 26 00', terms: ['resilient wall protection', 'wall protection', 'corner guard', 'wall guard', 'door protection'] },
  { sectionNumber: '10 44 13', terms: ['fire extinguisher cabinet', 'extinguisher cabinet', 'recessed cabinet', 'fec'] }
]);

function termPattern(term) {
  const words = clean(term).split(/\s+/).filter(Boolean);
  return new RegExp(`(?:^|\\b)${words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*[-/]?\\s*')}(?:\\b|$)`, 'i');
}

function evidenceRecords(input = {}) {
  return list(input.evidence).map((item, order) => typeof item === 'string' ? { text: item, source: 'drawing-text', region: null, order } : {
    text: text(item.text || item.value || item.label || item.title), source: text(item.source || item.kind || 'drawing-evidence'), region: item.region || null, observationId: text(item.observationId), order
  }).filter(item => item.text && !/^(?:518[-\s]?22[-\s]?700|61IN101|page\s+\d+|room\s+\d+)$/i.test(item.text));
}

export function createProjectSpecificationVocabulary({ specificationIndex, definitions = BEDFORD_PROJECT_SPECIFICATION_VOCABULARY, onDiagnostic = () => {} } = {}) {
  const compiled = definitions.map(definition => ({ ...definition, normalizedSectionNumber: normalizeSpecificationNumber(definition.sectionNumber).replace(/\s/g, ''), patterns: definition.terms.map(term => ({ term, pattern: termPattern(term) })) }));
  const match = (input, applicabilityScope) => {
    const started = globalThis.performance?.now?.() ?? Date.now();
    const evidence = evidenceRecords(input); const matches = [];
    for (const definition of compiled) {
      const section = specificationIndex?.get?.(input.specificationDocumentId, definition.sectionNumber);
      if (!section || section.projectId !== text(input.projectId)) continue;
      const supporting = [];
      for (const record of evidence) {
        const terms = definition.patterns.filter(candidate => candidate.pattern.test(clean(record.text))).map(candidate => candidate.term);
        const explicitSection = record.text.replace(/\D/g, '').includes(definition.normalizedSectionNumber);
        if (terms.length || explicitSection) supporting.push({ ...record, terms, explicitSection });
      }
      if (!supporting.length) continue;
      const explicit = supporting.some(item => item.explicitSection);
      const evidenceText = [...new Set(supporting.map(item => item.text))].slice(0, 6).join(' · ');
      matches.push({ projectId: section.projectId, specificationDocumentId: section.documentId, sectionNumber: section.sectionNumber, sectionTitle: section.sectionTitle,
        status: explicit ? 'confirmed' : 'suggested', origin: explicit ? 'explicit' : 'rule', confidence: explicit ? .98 : Math.min(.85, .5 + supporting.length * .08),
        applicabilityScope, evidenceSource: explicit ? 'explicit-specification-reference' : 'bedford-project-vocabulary', evidenceText,
        sourcePageId: text(input.pageId), sourceObjectId: text(input.objectId) || null, graphicalRegion: supporting.find(item => item.region)?.region || null,
        reason: `${applicabilityScope === 'object-specific' ? 'Selected object' : 'Active drawing page'} contains project vocabulary for ${section.sectionNumber}.`, matches: supporting });
    }
    onDiagnostic({ operation: 'project-specification-vocabulary', pageEvidenceCount: evidence.length, objectEvidenceCount: applicabilityScope === 'object-specific' ? evidence.length : 0,
      vocabularyMatches: matches.length, indexedSectionMatches: matches.length, durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - started) });
    return matches;
  };
  return {
    matchPage(input = {}) { return match(input, 'page-wide'); },
    matchObject(input = {}) { return match(input, 'object-specific'); },
    definitions() { return compiled.map(({ patterns, ...item }) => structuredClone(item)); }
  };
}

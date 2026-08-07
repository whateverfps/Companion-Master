import { ProjectStateService } from './project-state-service.js';
import { ConstructionReasoningEngine } from './construction-reasoning-engine.js';
import { ProjectFactEngine } from './project-fact-engine.js';
import { ProjectRelationshipEngine } from './project-relationship-engine.js';
import { createConstructionGraph } from './construction-graph.js';

class ChiefIntelligenceBridge {
  constructor() {
    this.projectStateService = null;
    this.reasoningEngine = null;
    this.factEngine = null;
    this.relationshipEngine = null;
    this.constructionGraph = null;
    this.initialized = false;
  }

  initialize(constructionGraph, factEngine, relationshipEngine, reasoningEngine, projectStateService) {
    this.constructionGraph = constructionGraph;
    this.factEngine = factEngine;
    this.relationshipEngine = relationshipEngine;
    this.reasoningEngine = reasoningEngine;
    this.projectStateService = projectStateService;
    this.initialized = true;
  }

  /**
   * Determine if a question should be answered by Mission Companion intelligence
   */
  shouldUseMissionCompanionIntelligence(question) {
    const lower = question.toLowerCase();
    
    // Questions about project state
    if (lower.includes('what governs') || lower.includes('governed by')) return true;
    if (lower.includes('what specs') || lower.includes('specifications')) return true;
    if (lower.includes('what inspections') || lower.includes('inspection')) return true;
    if (lower.includes('deficiencies') || lower.includes('deficiency')) return true;
    if (lower.includes('evidence') || lower.includes('support')) return true;
    if (lower.includes('what changed') || lower.includes('since')) return true;
    if (lower.includes('what prevents') || lower.includes('blocking') || lower.includes('blocks')) return true;
    if (lower.includes('activation') || lower.includes('turnover')) return true;
    if (lower.includes('what should i inspect') || lower.includes('inspect next')) return true;
    if (lower.includes('drawing details') || lower.includes('review')) return true;
    if (lower.includes('building') || lower.includes('room') || lower.includes('floor')) return true;
    
    return false;
  }

  /**
   * Build project context for a question
   */
  buildProjectContext(question, drawingContext = null) {
    if (!this.initialized) {
      return {
        hasContext: false,
        reason: 'Mission Companion intelligence not initialized'
      };
    }

    const context = {
      hasContext: true,
      question,
      projectState: null,
      reasoningResult: null,
      facts: [],
      relationships: [],
      specifications: [],
      drawingContext: drawingContext
    };

    // Get project state
    try {
      context.projectState = this.projectStateService.getProjectState();
    } catch (error) {
      context.projectState = null;
    }

    // Get reasoning result if question is about project
    if (this.shouldUseMissionCompanionIntelligence(question)) {
      try {
        context.reasoningResult = this.reasoningEngine.processQuestion(question);
      } catch (error) {
        context.reasoningResult = null;
      }
    }

    // Get facts related to drawing context
    if (drawingContext && drawingContext.objectId) {
      try {
        const objectFacts = this.factEngine.getFactsForSubject(drawingContext.objectId);
        context.facts = objectFacts;
      } catch (error) {
        context.facts = [];
      }
    }

    // Get relationships related to drawing context
    if (drawingContext && drawingContext.objectId) {
      try {
        const objectRelationships = this.relationshipEngine.getRelationshipsByType(
          drawingContext.objectId, null, 'outgoing'
        );
        context.relationships = objectRelationships;
      } catch (error) {
        context.relationships = [];
      }
    }

    return context;
  }

  /**
   * Generate answer from Mission Companion intelligence
   */
  generateMissionCompanionAnswer(question, context) {
    if (!context.hasContext || !context.reasoningResult) {
      return null;
    }

    const answer = {
      source: 'mission-companion',
      question,
      answer: context.reasoningResult.answer,
      confidence: context.reasoningResult.confidence,
      reasoningPath: context.reasoningResult.reasoningPath,
      evidence: context.reasoningResult.evidence,
      assumptions: context.reasoningResult.assumptions,
      unresolvedQuestions: context.reasoningResult.unresolvedQuestions,
      conflicts: context.reasoningResult.conflicts,
      projectState: context.projectState,
      facts: context.facts,
      relationships: context.relationships,
      diagnostics: context.reasoningResult.diagnostics
    };

    return answer;
  }

  /**
   * Build context string for LLM
   */
  buildContextString(context) {
    if (!context.hasContext) {
      return '';
    }

    const parts = [];

    // Add project state
    if (context.projectState) {
      parts.push('PROJECT STATE:');
      parts.push(`Current Phase: ${context.projectState.project?.currentState || 'unknown'}`);
      parts.push(`Activation: ${context.projectState.activation?.currentState || 'unknown'}`);
      parts.push(`Turnover: ${context.projectState.turnover?.currentState || 'unknown'}`);
      parts.push(`Inspection: ${context.projectState.inspection?.currentState || 'unknown'}`);
      parts.push(`Deficiency: ${context.projectState.deficiency?.currentState || 'unknown'}`);
      parts.push('');
    }

    // Add reasoning result
    if (context.reasoningResult) {
      parts.push('REASONING RESULT:');
      parts.push(`Answer: ${context.reasoningResult.answer}`);
      parts.push(`Confidence: ${(context.reasoningResult.confidence * 100).toFixed(0)}%`);
      parts.push('');
      parts.push('Reasoning Path:');
      for (const step of context.reasoningResult.reasoningPath) {
        parts.push(`  - ${step}`);
      }
      parts.push('');
      
      if (context.reasoningResult.evidence.length > 0) {
        parts.push('Evidence:');
        for (const evidence of context.reasoningResult.evidence) {
          parts.push(`  - ${evidence.type}: ${evidence.title || evidence.id || evidence.statement}`);
        }
        parts.push('');
      }
    }

    // Add facts
    if (context.facts.length > 0) {
      parts.push('RELATED FACTS:');
      for (const fact of context.facts) {
        parts.push(`  - ${fact.subjectId} ${fact.predicate} ${fact.objectId} (${(fact.confidence * 100).toFixed(0)}% confidence)`);
      }
      parts.push('');
    }

    // Add relationships
    if (context.relationships.length > 0) {
      parts.push('RELATED RELATIONSHIPS:');
      for (const rel of context.relationships) {
        parts.push(`  - ${rel.sourceId} ${rel.type} ${rel.targetId} (${(rel.confidence * 100).toFixed(0)}% confidence)`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Check if there is sufficient project evidence
   */
  hasSufficientEvidence(context) {
    if (!context.hasContext) return false;
    
    const evidenceCount = 
      (context.reasoningResult?.evidence?.length || 0) +
      (context.facts?.length || 0) +
      (context.relationships?.length || 0);
    
    return evidenceCount > 0;
  }

  /**
   * Generate missing information notice
   */
  generateMissingInformationNotice(context) {
    const missing = [];
    
    if (!context.projectState) {
      missing.push('project state');
    }
    
    if (!context.reasoningResult) {
      missing.push('reasoning result');
    }
    
    if (context.facts.length === 0) {
      missing.push('related facts');
    }
    
    if (context.relationships.length === 0) {
      missing.push('related relationships');
    }
    
    if (missing.length === 0) {
      return null;
    }
    
    return `The project does not currently contain enough information to answer this question. Missing: ${missing.join(', ')}.`;
  }
}

let chiefIntelligenceBridgeInstance = null;

export function createChiefIntelligenceBridge() {
  if (!chiefIntelligenceBridgeInstance) {
    chiefIntelligenceBridgeInstance = new ChiefIntelligenceBridge();
  }
  return chiefIntelligenceBridgeInstance;
}

export function getChiefIntelligenceBridge() {
  return chiefIntelligenceBridgeInstance;
}

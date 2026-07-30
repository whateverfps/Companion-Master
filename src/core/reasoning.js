import {
  retrieve,
  buildContext
} from "./retrieval.js";

import {
  extractRequirements,
  extractResponsibilities,
  extractDeliverables,
  extractAcceptanceCriteria,
  extractExceptions,
  buildComplianceMatrix,
  buildKnowledgeGraph,
  detectMissingEvidence,
  summarizeRequirements
} from "./retrieval.js";

/* ===========================================================
   Reasoning Session
   =========================================================== */

export class ReasoningSession {

  constructor(library = []) {
    this.library = library;
  }

  async search(query, options = {}) {
    return retrieve(query, this.library, options);
  }

  async analyze(query, options = {}) {

    const hits = await this.search(query, options);

    return {
      query,
      hits,

      context: buildContext(hits),

      requirements:
        extractRequirements(hits),

      responsibilities:
        extractResponsibilities(hits),

      deliverables:
        extractDeliverables(hits),

      acceptance:
        extractAcceptanceCriteria(hits),

      exceptions:
        extractExceptions(hits),

      compliance:
        buildComplianceMatrix(hits),

      evidence:
        detectMissingEvidence(hits),

      graph:
        buildKnowledgeGraph(hits),

      summary:
        summarizeRequirements(hits)
    };
  }

  async answer(question, options = {}) {

    const analysis =
      await this.analyze(question, options);

    return {
      question,

      answer:
        buildNarrativeAnswer(
          question,
          analysis
        ),

      analysis
    };
  }
}

/* ===========================================================
   Narrative Builder
   =========================================================== */

export function buildNarrativeAnswer(
  question,
  analysis
) {

  const lines = [];

  lines.push(
    `Question: ${question}`
  );

  lines.push("");

  lines.push(
    `Relevant requirements: ${analysis.summary.overview.totalRequirements}`
  );

  lines.push(
    `Compliance: ${analysis.summary.overview.compliancePercent}%`
  );

  lines.push("");

  for (
    const req of analysis.requirements.requirements.slice(0,10)
  ) {

    lines.push(
      "• " + req.statement
    );

    if(req.responsibleParty)
      lines.push(
        "  Responsible: " +
        req.responsibleParty
      );

    if(req.deliverables.length)
      lines.push(
        "  Deliverables: " +
        req.deliverables.join(", ")
      );

    if(req.references.length)
      lines.push(
        "  References: " +
        req.references.join(", ")
      );

    lines.push("");
  }

  return lines.join("\n");
}

/* ===========================================================
   Specialized Queries
   =========================================================== */

export async function answerResponsibilityQuestion(
  session,
  party
){

  const analysis =
    await session.analyze(party);

  return analysis.responsibilities;
}

export async function answerComplianceQuestion(
  session,
  topic
){

  const analysis =
    await session.analyze(topic);

  return analysis.compliance;
}

export async function answerEvidenceQuestion(
  session,
  topic
){

  const analysis =
    await session.analyze(topic);

  return analysis.evidence;
}

export async function answerOwnerQCQuestion(
  session,
  topic
){

  const analysis =
    await session.analyze(topic);

  return analysis.summary.ownerQC;
}

/* ===========================================================
   Future Expansion Hooks
   =========================================================== */

/*
Upcoming Build 9 commits:

- Dependency reasoning
- Timeline reasoning
- Conflict arbitration
- Executive briefing
- Spec comparison
- Cross-document inference
- Workflow planning
- Construction sequencing
- Commissioning advisor
- Owner QC assistant
*/

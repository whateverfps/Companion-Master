/**
 * Mission Companion
 * ComplianceRule.js
 * Commit 10A - Compliance Extraction Engine
 */
import { ReasoningRule } from "../ConflictReasoner.js";

export const RequirementLevel=Object.freeze({
 SHALL:"shall",MUST:"must",REQUIRED:"required",WILL:"will",
 SHOULD:"should",MAY:"may",OPTIONAL:"optional",PROHIBITED:"prohibited"
});

export const ComplianceStatus=Object.freeze({
 UNKNOWN:"unknown",PENDING:"pending",COMPLIANT:"compliant",
 PARTIAL:"partial",NON_COMPLIANT:"non_compliant",
 WAIVED:"waived",BLOCKED:"blocked",NOT_APPLICABLE:"not_applicable"
});

export const EvidenceType=Object.freeze({
 PHOTO:"photo",INSPECTION_REPORT:"inspection_report",
 TEST_REPORT:"test_report",SUBMITTAL:"submittal",
 COMMISSIONING_REPORT:"commissioning_report",
 DAILY_REPORT:"daily_report",CHECKLIST:"checklist",
 CERTIFICATE:"certificate",PUNCHLIST:"punchlist",
 CLOSEOUT:"closeout",TRAINING:"training"
});

export class ComplianceRequirement{
 constructor(){
  this.id="";this.text="";this.normalized="";
  this.document="";this.section="";this.paragraph="";
  this.level=RequirementLevel.SHALL;
  this.status=ComplianceStatus.UNKNOWN;
  this.responsibleParty=null;
  this.acceptingAuthority=null;
  this.requiredEvidence=[];
  this.requiredTests=[];
  this.requiredInspections=[];
  this.requiredDocuments=[];
  this.references=[];
  this.tags=[];
  this.confidence=0;
 }
}

export class ComplianceEvidence{
 constructor(){
  this.id="";this.type=null;this.document="";
  this.sourceNode="";this.date=null;
  this.description="";this.author="";
  this.relatedRequirement="";
  this.tags=[];this.confidence=0;
 }
}

const REQUIREMENT_PATTERNS=[
 /\bshall\b/i,/\bmust\b/i,/\brequired to\b/i,
 /\bshall install\b/i,/\bshall furnish\b/i,
 /\bshall provide\b/i,/\bshall inspect\b/i,
 /\bshall verify\b/i,/\bshall submit\b/i,
 /\bshall maintain\b/i,/\bshall test\b/i,
 /\bshall document\b/i
];

export function extractComplianceRequirements(node){
 const text=String(node.text||node.metadata?.text||"");
 const reqs=[];
 for(const p of REQUIREMENT_PATTERNS){
   if(p.test(text)){
      const r=new ComplianceRequirement();
      r.id=`REQ-${node.id}-${reqs.length+1}`;
      r.text=text.trim();
      r.normalized=text.toLowerCase().replace(/\s+/g," ").trim();
      r.document=node.metadata?.document||"";
      r.section=node.metadata?.section||"";
      r.paragraph=node.metadata?.paragraph||"";
      r.confidence=.90;
      reqs.push(r);
   }
 }
 return reqs;
}

export function extractEvidence(node){
 const text=String(node.text||"").toLowerCase();
 const out=[];
 const map=[
 ["photo",EvidenceType.PHOTO],["inspection",EvidenceType.INSPECTION_REPORT],
 ["test",EvidenceType.TEST_REPORT],["submittal",EvidenceType.SUBMITTAL],
 ["commission",EvidenceType.COMMISSIONING_REPORT],
 ["certificate",EvidenceType.CERTIFICATE],
 ["checklist",EvidenceType.CHECKLIST],
 ["punch",EvidenceType.PUNCHLIST]
 ];
 for(const [k,t] of map){
   if(text.includes(k)){
      const e=new ComplianceEvidence();
      e.id=`EVD-${node.id}-${out.length+1}`;
      e.type=t;
      e.description=node.text||"";
      e.document=node.metadata?.document||"";
      e.confidence=.85;
      out.push(e);
   }
 }
 return out;
}

export class ComplianceRule extends ReasoningRule{
 constructor(options={}){
   super(options.name||"Compliance Extraction",options.priority??70);
 }
 appliesTo(graph){
   return graph&&typeof graph.findNodes==="function";
 }
 execute(graph,result){
   const nodes=graph.findNodes({});
   const requirements=[];
   const evidence=[];
   for(const n of nodes){
      requirements.push(...extractComplianceRequirements(n));
      evidence.push(...extractEvidence(n));
   }
   result.metrics.requirementCount=requirements.length;
   result.metrics.evidenceCount=evidence.length;
   result.compliance={requirements,evidence};
 }
}

export function registerComplianceRule(reasoner,options={}){
 reasoner.registerRule(new ComplianceRule(options));
 return reasoner;
}

export default ComplianceRule;

/**
 * ComplianceRule.js
 * Commit 10B - Compliance Reasoning
 */

export const ComplianceFindingType = Object.freeze({
  MISSING_EVIDENCE:"missing_evidence",
  PARTIAL_COMPLIANCE:"partial_compliance",
  NON_COMPLIANT:"non_compliant",
  DUPLICATE_EVIDENCE:"duplicate_evidence",
  CONFLICTING_EVIDENCE:"conflicting_evidence",
  MISSING_TEST:"missing_test",
  MISSING_INSPECTION:"missing_inspection",
  MISSING_SUBMITTAL:"missing_submittal",
  MISSING_APPROVAL:"missing_approval"
});

export function normalizeRequirement(text){
 return String(text||"").toLowerCase().replace(/\s+/g," ").trim();
}

export function matchEvidence(requirement,evidence){
 const score={value:0,reasons:[]};
 const req=normalizeRequirement(requirement.text);
 const desc=normalizeRequirement(evidence.description);
 for(const token of req.split(" ")){
   if(token.length<4) continue;
   if(desc.includes(token)){
      score.value+=0.08;
      score.reasons.push(token);
   }
 }
 if(requirement.document&&requirement.document===evidence.document){
   score.value+=0.20;
   score.reasons.push("same_document");
 }
 return Math.min(score.value,1);
}

export function correlateRequirements(requirements,evidence){
 const findings=[];
 for(const req of requirements){
    const matches=evidence
      .map(e=>({e,s:matchEvidence(req,e)}))
      .filter(x=>x.s>0.25)
      .sort((a,b)=>b.s-a.s);

    if(matches.length===0){
      findings.push({
        type:ComplianceFindingType.MISSING_EVIDENCE,
        requirement:req.id,
        confidence:.94,
        explanation:"No supporting evidence found."
      });
      continue;
    }

    const best=matches[0];

    if(best.s<0.55){
      findings.push({
        type:ComplianceFindingType.PARTIAL_COMPLIANCE,
        requirement:req.id,
        evidence:best.e.id,
        confidence:best.s,
        explanation:"Evidence exists but is weak."
      });
    }
 }
 return findings;
}

export function detectDuplicateEvidence(evidence){
 const findings=[];
 for(let i=0;i<evidence.length;i++){
   for(let j=i+1;j<evidence.length;j++){
      const a=evidence[i],b=evidence[j];
      if(a.type===b.type&&a.document===b.document&&a.description===b.description){
        findings.push({
          type:ComplianceFindingType.DUPLICATE_EVIDENCE,
          left:a.id,right:b.id,confidence:.91
        });
      }
   }
 }
 return findings;
}

export function detectConflictingEvidence(evidence){
 const findings=[];
 const pass=/\bpass(ed)?\b/i;
 const fail=/\bfail(ed)?\b/i;
 for(let i=0;i<evidence.length;i++){
   for(let j=i+1;j<evidence.length;j++){
      const a=evidence[i],b=evidence[j];
      if(a.document!==b.document) continue;
      const ap=pass.test(a.description), af=fail.test(a.description);
      const bp=pass.test(b.description), bf=fail.test(b.description);
      if((ap&&bf)||(af&&bp)){
        findings.push({
          type:ComplianceFindingType.CONFLICTING_EVIDENCE,
          left:a.id,right:b.id,confidence:.96
        });
      }
   }
 }
 return findings;
}

/**
 * ComplianceRule.js
 * Commit 10C - Compliance Resolution & Reporting
 */

export const ComplianceSeverity=Object.freeze({
 CRITICAL:"critical",
 HIGH:"high",
 MEDIUM:"medium",
 LOW:"low"
});

export function scoreCompliance(requirements,findings){
 const total=requirements.length||1;
 const missing=findings.filter(f=>f.type==="missing_evidence").length;
 const partial=findings.filter(f=>f.type==="partial_compliance").length;
 const score=Math.max(0,100-(missing*15)-(partial*5));
 return {
   score,
   compliant:score>=95,
   partial:score>=70&&score<95,
   nonCompliant:score<70
 };
}

export function buildComplianceMatrix(requirements,evidence,findings){
 return requirements.map(req=>{
   const ev=evidence.filter(e=>e.relatedRequirement===req.id);
   const issue=findings.filter(f=>f.requirement===req.id);
   return{
      requirement:req.id,
      document:req.document,
      status:issue.length? "Needs Review":"Compliant",
      evidence:ev.map(x=>x.id),
      findings:issue.map(x=>x.type)
   };
 });
}

export function generateCorrectiveActions(findings){
 const actions=[];
 for(const f of findings){
   switch(f.type){
      case "missing_evidence":
        actions.push({
           priority:"high",
           action:"Obtain required evidence and attach to compliance record.",
           requirement:f.requirement
        });
        break;
      case "partial_compliance":
        actions.push({
           priority:"medium",
           action:"Strengthen supporting documentation.",
           requirement:f.requirement
        });
        break;
      case "conflicting_evidence":
        actions.push({
           priority:"high",
           action:"Resolve contradictory inspection or test results."
        });
        break;
      case "duplicate_evidence":
        actions.push({
           priority:"low",
           action:"Consolidate duplicate records."
        });
        break;
      default:
        actions.push({
           priority:"medium",
           action:"Review compliance record."
        });
   }
 }
 return actions;
}

export function executiveComplianceSummary(requirements,evidence,findings){
 const scorecard=scoreCompliance(requirements,findings);
 return{
    totals:{
      requirements:requirements.length,
      evidence:evidence.length,
      findings:findings.length
    },
    complianceScore:scorecard.score,
    compliant:scorecard.compliant,
    partial:scorecard.partial,
    nonCompliant:scorecard.nonCompliant
 };
}

export function finalizeComplianceResult(result,requirements,evidence,findings){
 const summary=executiveComplianceSummary(requirements,evidence,findings);
 result.metrics.complianceScore=summary.complianceScore;
 result.metrics.requirements=requirements.length;
 result.metrics.evidence=evidence.length;
 result.metrics.findings=findings.length;
 result.complianceSummary=summary;
 result.complianceMatrix=
   buildComplianceMatrix(requirements,evidence,findings);
 result.correctiveActions=
   generateCorrectiveActions(findings);
}

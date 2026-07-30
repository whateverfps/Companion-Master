
/**
 * WorkflowRule.js
 * Integrated Commit 11 (11A + 11B + 11C)
 * Mission Companion Conflict Engine
 */

import { ReasoningRule } from "../ConflictReasoner.js";

export const WorkflowStatus=Object.freeze({
 NOT_STARTED:"not_started",READY:"ready",IN_PROGRESS:"in_progress",
 BLOCKED:"blocked",COMPLETE:"complete",FAILED:"failed"
});

export const DependencyType=Object.freeze({
 FINISH_START:"finish_start",START_START:"start_start",
 FINISH_FINISH:"finish_finish",APPROVAL:"approval",
 DOCUMENT:"document",INSPECTION:"inspection",TEST:"test"
});

export const GateType=Object.freeze({
 HOLD_POINT:"hold_point",APPROVAL:"approval",
 INSPECTION:"inspection",COMMISSIONING:"commissioning",
 OWNER_ACCEPTANCE:"owner_acceptance",CLOSEOUT:"closeout"
});

export const WorkflowFindingType=Object.freeze({
 MISSING_PREREQUISITE:"missing_prerequisite",
 SKIPPED_APPROVAL:"skipped_approval",
 CIRCULAR_DEPENDENCY:"circular_dependency",
 DEAD_END:"dead_end",
 BLOCKED:"blocked",
 PARALLEL_CONFLICT:"parallel_conflict"
});

export const WorkflowSeverity=Object.freeze({
 INFO:"info",LOW:"low",MEDIUM:"medium",HIGH:"high",CRITICAL:"critical"
});

export class WorkflowActivity{
 constructor(){
  this.id="";this.name="";this.document="";this.section="";
  this.predecessors=[];this.successors=[];this.dependencies=[];
  this.requiredDocuments=[];this.requiredEvidence=[];
  this.responsibleParty=null;this.acceptingAuthority=null;
  this.status=WorkflowStatus.NOT_STARTED;
  this.confidence=0;
 }
}

const PATTERNS=["submit","review","approve","procure","install","inspect","test","witness","commission","certify","accept","close out"];

export function extractWorkflowActivities(node){
 const txt=String(node.text||node.metadata?.text||"");
 const out=[];
 for(const p of PATTERNS){
  const re=new RegExp("\\bshall\\s+"+p.replace(" ","\\s+")+"\\b","i");
  if(re.test(txt)){
   const a=new WorkflowActivity();
   a.id=`WF-${node.id}-${out.length+1}`;
   a.name=p;
   a.document=node.metadata?.document||"";
   a.section=node.metadata?.section||"";
   a.confidence=.90;
   out.push(a);
  }
 }
 return out;
}

export function buildWorkflowGraph(activities){
 const order=["submit","review","approve","procure","install","inspect","test","commission","accept","close out"];
 const map=new Map(activities.map(a=>[a.name,a]));
 for(let i=0;i<order.length-1;i++){
  const a=map.get(order[i]),b=map.get(order[i+1]);
  if(a&&b){
   a.successors.push(b.id);
   b.predecessors.push(a.id);
   a.dependencies.push({type:DependencyType.FINISH_START,target:b.id});
  }
 }
 return activities;
}

export function detectMissingPrerequisites(activities){
 return activities.filter(a=>(a.predecessors||[]).length===0 &&
 ["review","approve","install","inspect","test","commission","accept"].includes(a.name))
 .map(a=>({type:WorkflowFindingType.MISSING_PREREQUISITE,activity:a.id,confidence:.95}));
}

export function detectDeadEnds(activities){
 return activities.filter(a=>(a.successors||[]).length===0 && a.name!=="close out")
 .map(a=>({type:WorkflowFindingType.DEAD_END,activity:a.id,confidence:.90}));
}

export function detectCircularDependencies(activities){
 const map=new Map(activities.map(a=>[a.id,a]));
 const findings=[];
 function dfs(id,seen){
   seen=seen||new Set();
   if(seen.has(id)){findings.push({type:WorkflowFindingType.CIRCULAR_DEPENDENCY,node:id,confidence:.99});return;}
   const n=map.get(id); if(!n)return;
   const next=new Set(seen); next.add(id);
   for(const s of (n.successors||[])) dfs(s,next);
 }
 for(const a of activities) dfs(a.id);
 return findings;
}

export function validateWorkflow(result){
 const acts=result.workflow.activities;
 const findings=[
  ...detectMissingPrerequisites(acts),
  ...detectDeadEnds(acts),
  ...detectCircularDependencies(acts)
 ];
 result.workflow.findings=findings;
 return findings;
}

export function scoreWorkflow(findings){
 let score=100;
 for(const f of findings){
  if(f.type==="circular_dependency") score-=30;
  else if(f.type==="missing_prerequisite") score-=15;
  else if(f.type==="dead_end") score-=10;
  else score-=5;
 }
 return Math.max(score,0);
}

export function generateWorkflowRecommendations(findings){
 return findings.map(f=>({finding:f,action:
  f.type==="missing_prerequisite"?"Complete prerequisite activities.":
  f.type==="circular_dependency"?"Resolve circular dependency.":
  f.type==="dead_end"?"Define successor activity.":"Review workflow."
 }));
}

export class WorkflowRule extends ReasoningRule{
 constructor(options={}){
  super(options.name||"Workflow Rule",options.priority??65);
 }
 appliesTo(graph){return graph&&typeof graph.findNodes==="function";}
 execute(graph,result){
  const activities=[];
  for(const n of graph.findNodes({}))
   activities.push(...extractWorkflowActivities(n));

  buildWorkflowGraph(activities);

  result.workflow={activities};
  const findings=validateWorkflow(result);
  const recommendations=generateWorkflowRecommendations(findings);
  const score=scoreWorkflow(findings);

  result.workflow.summary={
    activityCount:activities.length,
    findingCount:findings.length,
    workflowScore:score,
    status:findings.length?"Attention Required":"Healthy"
  };
  result.workflow.recommendations=recommendations;

  result.findings=result.findings||[];
  result.explanations=result.explanations||[];
  result.recommendations=result.recommendations||[];
  result.findings.push(...findings);
  result.recommendations.push(...recommendations);
  result.metrics.workflowActivities=activities.length;
  result.metrics.workflowFindings=findings.length;
  result.metrics.workflowScore=score;
 }
}

export function registerWorkflowRule(reasoner,options={}){
 reasoner.registerRule(new WorkflowRule(options));
 return reasoner;
}

export default WorkflowRule;

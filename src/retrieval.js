const STOP=new Set('the a an and or but to of in on for with by from is are was were be been being this that these those it its as at into about what which who when where why how can could should would may might do does did'.split(' '));
const SYNONYMS={
  definition:['means','defined','definition','refers'],
  responsibility:['responsible','responsibility','duties','shall','must'],
  requirement:['required','requirement','shall','must','minimum'],
  submit:['submittal','submit','submission','provide'],
  approve:['approval','approved','acceptance','accepted'],
  inspect:['inspection','inspect','verify','verification'],
  schedule:['scheduled','scheduling','timeline','duration'],
  payment:['pay','paid','compensation','invoice'],
  contractor:['vendor','builder','construction contractor'],
  owner:['government','va','agency','owner representative'],
  conflict:['exception','unless','however','notwithstanding','supersede']
};
const NEGATION=/\b(no|not|never|shall not|must not|prohibited|except|unless|without)\b/i;
const REQUIREMENT=/\b(shall|must|required|prohibited|may not|is responsible|will)\b/i;
const tokens=s=>(String(s||'').toLowerCase().match(/[a-z0-9][a-z0-9._/-]*/g)||[]).filter(x=>x.length>1&&!STOP.has(x));
const stem=t=>t.replace(/(ing|ments|ment|ness|ation|ions|ion|ies|ied|ed|es|s)$/,'');
const uniq=a=>[...new Set(a.filter(Boolean))];

export function expandQuery(query){
  const base=tokens(query);const expanded=[];
  for(const t of base){expanded.push(t,stem(t));for(const [root,terms] of Object.entries(SYNONYMS)){if(t===root||terms.some(x=>x.includes(t)||t.includes(x)))expanded.push(root,...terms.flatMap(tokens));}}
  const phrases=[...String(query).matchAll(/"([^"]+)"/g)].map(x=>x[1].toLowerCase());
  const refs=String(query).match(/\b(?:section|article|chapter|appendix|specification)?\s*\d{1,2}(?:\s*\d{2}){1,3}(?:\.\d+)*\b/gi)||[];
  return {base:uniq(base),expanded:uniq(expanded),phrases:uniq(phrases),references:uniq(refs.map(x=>x.trim().toLowerCase()))};
}
function termFrequency(text,term){let n=0,i=0;while((i=text.indexOf(term,i))!==-1){n++;i+=Math.max(1,term.length)}return n}
function scoreSection(s,q){
  const heading=String(s.heading||'').toLowerCase(),path=(s.path||[]).join(' ').toLowerCase(),text=String(s.text||'').toLowerCase();
  const headingTokens=new Set(tokens(heading));const textTokens=new Set(tokens(text));let lexical=0,headingScore=0,phraseScore=0,referenceScore=0,coverage=0;const matched=[];
  for(const t of q.expanded){const st=stem(t);let hit=false;if(headingTokens.has(t)||headingTokens.has(st)||heading.includes(t)){headingScore+=14;hit=true}else if(path.includes(t)){headingScore+=8;hit=true}if(textTokens.has(t)||textTokens.has(st)){lexical+=4+Math.min(4,termFrequency(text,t));hit=true}else if(text.includes(t)){lexical+=1.5;hit=true}if(hit)matched.push(t)}
  for(const p of q.phrases){if(heading.includes(p)){phraseScore+=28;matched.push(p)}else if(text.includes(p)){phraseScore+=20;matched.push(p)}}
  for(const r of q.references){if(heading.includes(r)||path.includes(r)){referenceScore+=35;matched.push(r)}else if(text.includes(r)){referenceScore+=18;matched.push(r)}}
  coverage=q.base.length?q.base.filter(t=>matched.some(m=>m.includes(t)||t.includes(m))).length/q.base.length:0;
  let intent=0;const combined=`${heading} ${text}`;if(/define|definition|what is|means/i.test(q.raw)&&/\b(defined|means|definition|refers to)\b/i.test(combined))intent+=8;if(/who|responsib|duty/i.test(q.raw)&&/\b(responsible|shall|must|duties)\b/i.test(combined))intent+=7;if(/require|shall|must|prohibit/i.test(q.raw)&&REQUIREMENT.test(combined))intent+=6;if(/exception|unless|conflict/i.test(q.raw)&&/\b(exception|unless|however|notwithstanding|supersede)\b/i.test(combined))intent+=7;
  const specificity=Math.max(.72,1-Math.log10(Math.max(100,text.length))/18);const score=(lexical+headingScore+phraseScore+referenceScore+intent)*(0.55+coverage*.45)*specificity;
  return {score,components:{lexical,heading:headingScore,phrase:phraseScore,reference:referenceScore,intent,coverage:Math.round(coverage*100)},matchedTerms:uniq(matched).slice(0,12)};
}
function rerank(rows){
  const seenDocs=new Map();return rows.map((r,i)=>{const prior=seenDocs.get(r.documentId)||0;seenDocs.set(r.documentId,prior+1);let rerank=r.score;if(i<20&&r.components.coverage>=67)rerank+=8;if(r.level<=2)rerank+=2;if(prior>=3)rerank-=Math.min(8,(prior-2)*2);return {...r,rerankScore:rerank}}).sort((a,b)=>b.rerankScore-a.rerankScore||b.score-a.score);
}
export function detectConflicts(hits){
  const conflicts=[];for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++){
    const a=hits[i],b=hits[j];if(a.documentId===b.documentId)continue;const at=new Set(tokens(`${a.heading} ${a.text}`).map(stem)),bt=new Set(tokens(`${b.heading} ${b.text}`).map(stem));const overlap=[...at].filter(x=>bt.has(x)).length/Math.max(1,Math.min(at.size,bt.size));const aNeg=NEGATION.test(a.text),bNeg=NEGATION.test(b.text);if(overlap>.22&&aNeg!==bNeg&&REQUIREMENT.test(a.text)&&REQUIREMENT.test(b.text))conflicts.push({sourceA:a.sourceNumber,sourceB:b.sourceNumber,documents:[a.documentName,b.documentName],reason:'Potentially opposing requirement language',confidence:Math.round(Math.min(.95,overlap+.35)*100)});
  }return conflicts.slice(0,6);
}
export function retrieve(query,sections,topK=10){
  const q={...expandQuery(query),raw:String(query)};const scored=sections.map(s=>({...s,...scoreSection(s,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.max(topK*5,30));const ranked=rerank(scored).slice(0,topK).map((x,i)=>({...x,score:x.rerankScore,sourceNumber:i+1}));const conflicts=detectConflicts(ranked);return Object.assign(ranked,{meta:{queryExpansion:q,conflicts,totalCandidates:scored.length}});
}
export function buildContext(hits){const conflictNote=hits.meta?.conflicts?.length?`\nPOTENTIAL SOURCE CONFLICTS:\n${hits.meta.conflicts.map(c=>`[S${c.sourceA}] may conflict with [S${c.sourceB}]: ${c.reason}`).join('\n')}\n`:'';return hits.map(h=>`[S${h.sourceNumber}] DOCUMENT: ${h.documentName}\nSECTION: ${h.heading||'Unheaded section'}\nPATH: ${(h.path||[]).join(' > ')||'Not specified'}\nLOCATION: ${h.location||'Not specified'}\nRETRIEVAL: matched ${h.matchedTerms.join(', ')||'general relevance'}\n${h.text}`).join('\n\n---\n\n')+conflictNote}
export function verifyCitations(answer,hits){
  const valid=new Set(hits.map(h=>h.sourceNumber));const cited=[...String(answer).matchAll(/\[S(\d+)\]/g)].map(m=>Number(m[1]));const invalid=uniq(cited.filter(n=>!valid.has(n)));const used=uniq(cited.filter(n=>valid.has(n)));const sentences=String(answer).split(/(?<=[.!?])\s+/).filter(s=>s.trim().length>20);const material=sentences.filter(s=>/\b(shall|must|required|responsible|means|defined|prohibited|will|is|are|was|were)\b/i.test(s)&&!/^evidence gaps/i.test(s));const uncited=material.filter(s=>!/\[S\d+\]/.test(s));return {used,invalid,uncited,materialClaims:material.length,coverage:material.length?Math.round((material.length-uncited.length)/material.length*100):100,passed:invalid.length===0&&uncited.length===0};
}
export function scoreAnswer(answer,e,hits){const lower=answer.toLowerCase();const facts=(e.requiredFacts||'').split('\n').map(x=>x.trim()).filter(Boolean);const prohibited=(e.prohibited||'').split('\n').map(x=>x.trim()).filter(Boolean);const factHits=facts.filter(x=>lower.includes(x.toLowerCase()));const prohibitedHits=prohibited.filter(x=>lower.includes(x.toLowerCase()));const verification=verifyCitations(answer,hits);const sourceMatch=e.expectedSource?hits.some(h=>(h.documentName+' '+h.heading).toLowerCase().includes(e.expectedSource.toLowerCase())):true;const score=Math.max(0,Math.round((facts.length?factHits.length/facts.length:1)*55+Math.min(verification.used.length,3)*8+(sourceMatch?10:0)+(verification.passed?11:0)-prohibitedHits.length*20-verification.invalid.length*10));return {score,factHits,missingFacts:facts.filter(x=>!factHits.includes(x)),prohibitedHits,citations:verification.used.length,sourceMatch,answer,hits,citationVerification:verification,conflicts:hits.meta?.conflicts||[]}}

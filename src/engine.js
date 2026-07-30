import { parseFiles } from './parsers.js';
import { retrieve, buildContext, scoreAnswer, verifyCitations } from './retrieval.js';
import { logger, moduleStatus } from './diagnostics.js';

const STATE_KEY='mc-master-state-v2';
const DOC_DB='mc-master-documents-v2';
const defaults={settings:{openaiUrl:'https://api.openai.com/v1',openaiModel:'gpt-4.1-mini',openaiKey:'',timeout:180000,mode:'source',topK:10},projects:[{id:'general',name:'General'}],activeProject:'general',libraries:[{id:'general-library',projectId:'general',name:'General Library',description:'Default project knowledge library',enabled:true,createdAt:new Date().toISOString()}],activeLibrary:'general-library',chat:[],evaluations:[]};
let state=loadState();
moduleStatus('State Manager','ready',{summary:'State loaded'});
logger.info('Application state loaded',{projects:state.projects.length,activeProject:state.activeProject});
function loadState(){try{const loaded={...structuredClone(defaults),...JSON.parse(localStorage.getItem(STATE_KEY)||'{}')};loaded.libraries=Array.isArray(loaded.libraries)?loaded.libraries:structuredClone(defaults.libraries);loaded.projects.forEach(p=>{if(!loaded.libraries.some(l=>l.projectId===p.id)){loaded.libraries.push({id:uid(),projectId:p.id,name:`${p.name} Library`,description:'Project knowledge library',enabled:true,createdAt:new Date().toISOString()})}});if(!loaded.libraries.some(l=>l.id===loaded.activeLibrary&&l.projectId===loaded.activeProject))loaded.activeLibrary=loaded.libraries.find(l=>l.projectId===loaded.activeProject)?.id||null;return loaded}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
function uid(){return crypto.randomUUID()}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DOC_DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('documents'))db.createObjectStore('documents',{keyPath:'id'});if(!db.objectStoreNames.contains('sections')){const s=db.createObjectStore('sections',{keyPath:'id'});s.createIndex('projectId','projectId');s.createIndex('documentId','documentId')}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function tx(store,mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(store,mode);const s=t.objectStore(store);const out=fn(s);t.oncomplete=()=>resolve(out);t.onerror=()=>reject(t.error)})}
async function all(store,index=null,key=null){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly');const s=index?t.objectStore(store).index(index):t.objectStore(store);const r=key===null?s.getAll():s.getAll(key);r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
async function putMany(store,items){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');const s=t.objectStore(store);items.forEach(x=>s.put(x));t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)})}
async function delByIndex(store,index,key){const rows=await all(store,index,key);const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');const s=t.objectStore(store);rows.forEach(x=>s.delete(x.id));t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)})}

export const engine={
  state:()=>structuredClone(state),

  async healthCheck(){const db=await openDB();db.close();return true},
  async testConnection(){
    const s=state.settings;if(!s.openaiKey)throw new Error('Enter an OpenAI API key first.');
    logger.info('OpenAI connection test started',{model:s.openaiModel});
    const c=new AbortController();const timer=setTimeout(()=>c.abort(),Math.min(s.timeout,30000));
    try{const r=await fetch(`${s.openaiUrl.replace(/\/$/,'')}/models`,{headers:{'Authorization':`Bearer ${s.openaiKey}`},signal:c.signal});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error?.message||`Connection failed (${r.status})`);logger.info('OpenAI connection test passed');return {ok:true}}finally{clearTimeout(timer)}
  },
  async resetApplication(){
    logger.warning('Application reset requested');
    localStorage.removeItem(STATE_KEY);
    await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(DOC_DB);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);r.onblocked=()=>resolve()});
    return true
  },

  saveSettings(p){state.settings={...state.settings,...p};save();logger.info('Settings updated',{keys:Object.keys(p).filter(k=>k!=='openaiKey')})},
  setProject(id){state.activeProject=id;state.activeLibrary=state.libraries.find(l=>l.projectId===id&&l.enabled)?.id||state.libraries.find(l=>l.projectId===id)?.id||null;save();logger.info('Active project changed',{id})},
  addProject(name){const p={id:uid(),name:name.trim()};state.projects.push(p);const library={id:uid(),projectId:p.id,name:`${p.name} Library`,description:'Project knowledge library',enabled:true,createdAt:new Date().toISOString()};state.libraries.push(library);state.activeProject=p.id;state.activeLibrary=library.id;save();return p},
  async deleteProject(id){if(id==='general')throw new Error('General cannot be deleted.');await delByIndex('sections','projectId',id);const docs=await all('documents');await Promise.all(docs.filter(d=>d.projectId===id).map(d=>tx('documents','readwrite',s=>s.delete(d.id))));state.projects=state.projects.filter(p=>p.id!==id);state.libraries=state.libraries.filter(l=>l.projectId!==id);state.activeProject='general';state.activeLibrary=state.libraries.find(l=>l.projectId==='general')?.id||null;save()},
  libraries(){return structuredClone(state.libraries.filter(l=>l.projectId===state.activeProject))},
  setLibrary(id){if(!state.libraries.some(l=>l.id===id&&l.projectId===state.activeProject))throw new Error('Library not found.');state.activeLibrary=id;save()},
  addLibrary(name,description=''){const library={id:uid(),projectId:state.activeProject,name:name.trim(),description:description.trim(),enabled:true,createdAt:new Date().toISOString()};state.libraries.push(library);state.activeLibrary=library.id;save();logger.info('Knowledge library created',{name:library.name});return library},
  updateLibrary(id,patch){const library=state.libraries.find(l=>l.id===id&&l.projectId===state.activeProject);if(!library)throw new Error('Library not found.');Object.assign(library,patch,{updatedAt:new Date().toISOString()});if(!library.enabled&&state.activeLibrary===id)state.activeLibrary=state.libraries.find(l=>l.projectId===state.activeProject&&l.enabled&&l.id!==id)?.id||id;save();return structuredClone(library)},
  async deleteLibrary(id){const libraries=state.libraries.filter(l=>l.projectId===state.activeProject);if(libraries.length<=1)throw new Error('Each project must keep at least one library.');const docs=(await all('documents')).filter(d=>d.libraryId===id);for(const d of docs)await this.removeDocument(d.id);state.libraries=state.libraries.filter(l=>l.id!==id);if(state.activeLibrary===id)state.activeLibrary=state.libraries.find(l=>l.projectId===state.activeProject)?.id||null;save()},
  async documents(libraryId=null){return (await all('documents')).filter(d=>d.projectId===state.activeProject&&(!libraryId||d.libraryId===libraryId))},
  async sections(){return all('sections','projectId',state.activeProject)},
  async ingest(files,onProgress,libraryId=state.activeLibrary){if(!libraryId)throw new Error('Create or select a knowledge library first.');const existing=await this.documents();const incoming=[...files];const accepted=incoming.filter(f=>!existing.some(d=>d.name===f.name&&d.size===f.size));const skipped=incoming.filter(f=>!accepted.includes(f)).map(f=>({name:f.name,reason:'Duplicate name and file size'}));logger.info('Document ingestion started',{files:accepted.map(f=>f.name),libraryId,skipped:skipped.length});try{const parsed=await parseFiles(accepted,state.activeProject,onProgress,libraryId);await putMany('documents',parsed.documents);await putMany('sections',parsed.sections);logger.info('Document ingestion completed',{documents:parsed.documents.length,sections:parsed.sections.length,skipped:skipped.length});return {...parsed,skipped}}catch(error){logger.error('Document ingestion failed',{message:error.message});throw error}},
  async removeDocument(id){await delByIndex('sections','documentId',id);await tx('documents','readwrite',s=>s.delete(id))},
  async search(query){const sections=await this.sections();const hits=retrieve(query,sections,state.settings.topK);logger.info('Retrieval completed',{query,sectionsSearched:sections.length,hits:hits.length});return hits},
  async ask(prompt,mode=state.settings.mode){logger.info('Analysis started',{mode,promptLength:prompt.length});const hits=await this.search(prompt);const context=buildContext(hits);const answer=await callAI(prompt,context,mode);const citationVerification=verifyCitations(answer.content,hits);const message={id:uid(),role:'assistant',content:answer.content,citations:answer.citations,hits,retrievalMeta:hits.meta||{},citationVerification,createdAt:new Date().toISOString(),mode};state.chat.push({id:uid(),role:'user',content:prompt,createdAt:new Date().toISOString()});state.chat.push(message);save();logger.info('Analysis completed',{hits:hits.length,citations:message.citations.length,citationCoverage:citationVerification.coverage,conflicts:hits.meta?.conflicts?.length||0});return message},
  clearChat(){state.chat=[];save()},
  addEvaluation(e){state.evaluations.push({id:uid(),...e});save()},
  removeEvaluation(id){state.evaluations=state.evaluations.filter(x=>x.id!==id);save()},
  async runEvaluation(e){const hits=await this.search(e.question);const context=buildContext(hits);const answer=await callAI(e.question,context,'source');return scoreAnswer(answer.content,e,hits)},
  exportProject:async()=>({manifest:{version:'2.5.0',project:state.projects.find(p=>p.id===state.activeProject),exportedAt:new Date().toISOString()},libraries:this.libraries(),documents:await this.documents(),sections:await this.sections(),evaluations:state.evaluations}),
  async importProject(data){if(!data?.manifest||!Array.isArray(data.documents)||!Array.isArray(data.sections))throw new Error('Invalid Mission Companion project file.');const p=this.addProject(`${data.manifest.project?.name||'Imported'} (Imported)`);await putMany('documents',data.documents.map(d=>({...d,id:uid(),projectId:p.id})));const docs=await this.documents();const byName=new Map(docs.map(d=>[d.name,d.id]));await putMany('sections',data.sections.map(s=>({...s,id:uid(),projectId:p.id,documentId:byName.get(s.documentName)||s.documentId})));return p}
};

async function callAI(prompt,context,mode){const s=state.settings;if(!s.openaiKey)throw new Error('Enter an OpenAI API key in Settings.');const rules={source:'Answer only from the supplied evidence. If the evidence does not support an answer, say exactly that. Do not use outside knowledge. Cite every material claim with [S#].',assisted:'Use supplied evidence as the controlling source. Clearly label any general professional knowledge as "General SME context" and never present it as project-specific. Cite project claims with [S#].',general:'Answer as a general professional assistant. Use supplied evidence when relevant and cite it with [S#].'};
const system=`You are Mission Companion, a rigorous subject-matter analysis system. ${rules[mode]||rules.source}\nCheck for conflicts, exceptions, definitions, and cross-references. Prefer precise, defensible conclusions over confident guesses. End with a short Evidence Gaps section when anything important is uncertain.`;
const body={model:s.openaiModel,messages:[{role:'system',content:system},{role:'user',content:`QUESTION:\n${prompt}\n\nEVIDENCE:\n${context||'(No evidence retrieved.)'}`}],temperature:0.1};
const c=new AbortController();const timer=setTimeout(()=>c.abort(),s.timeout);try{const r=await fetch(`${s.openaiUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.openaiKey}`},body:JSON.stringify(body),signal:c.signal});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error?.message||`OpenAI request failed (${r.status})`);const content=j?.choices?.[0]?.message?.content||'No response returned.';const citations=[...content.matchAll(/\[S(\d+)\]/g)].map(m=>Number(m[1]));return {content,citations:[...new Set(citations)]}}finally{clearTimeout(timer)}}

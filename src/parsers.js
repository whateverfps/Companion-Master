function uid(){return crypto.randomUUID()}
function clean(s){return String(s||'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim()}
function headingInfo(raw){
  const text=String(raw||'').trim().replace(/^#{1,6}\s*/, '');
  const markdown=(String(raw||'').match(/^(#{1,6})\s+/)||[])[1];
  if(markdown)return {title:text,level:markdown.length,kind:'markdown'};
  if(/^(CHAPTER|PART|DIVISION)\s+/i.test(text))return {title:text,level:1,kind:'chapter'};
  if(/^(SECTION|ARTICLE|APPENDIX)\s+/i.test(text))return {title:text,level:2,kind:'section'};
  const numbered=text.match(/^(\d+(?:\.\d+){0,5})\s+(.+)/);
  if(numbered)return {title:text,level:Math.min(6,numbered[1].split('.').length),kind:'numbered'};
  return {title:text,level:2,kind:'caps'};
}
function splitSections(text,name){
  const lines=clean(text).split('\n');
  const out=[];let current={title:'Document beginning',level:1,kind:'root'},buf=[],start=1,path=[];
  const push=(end)=>{const t=clean(buf.join('\n'));if(t)out.push({heading:current.title,level:current.level,kind:current.kind,path:[...path],text:t,location:`Lines ${start}-${end}`,startLine:start,endLine:end});buf=[]};
  lines.forEach((line,i)=>{
    const h=line.trim();
    const isHeading=/^(#{1,6}\s+|(?:SECTION|CHAPTER|PART|DIVISION|ARTICLE|APPENDIX)\s+[A-Z0-9]|\d+(?:\.\d+){0,5}\s+[A-Z]|[A-Z][A-Z0-9 /&(),'-]{5,80})$/.test(h)&&h.length<140;
    if(isHeading&&buf.join(' ').length>120){
      push(i);current=headingInfo(h);path=path.slice(0,current.level-1);path[current.level-1]=current.title;start=i+1;
    }else buf.push(line)
  });
  push(lines.length);
  return out.flatMap(s=>s.text.length>7000?chunkLong(s):[s]);
}
function chunkLong(s){const paras=s.text.split(/\n\s*\n/);const out=[];let buf='';let n=1;for(const p of paras){if((buf+'\n\n'+p).length>6500&&buf){out.push({...s,heading:`${s.heading} — Part ${n++}`,text:buf});buf=p}else buf+=(buf?'\n\n':'')+p}if(buf)out.push({...s,heading:n>1?`${s.heading} — Part ${n}`:s.heading,text:buf});return out}
async function loadScript(src,test){if(test())return;await new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error(`Could not load parser: ${src}`));document.head.appendChild(s)})}
async function parsePDF(file){const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;const pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const c=await page.getTextContent();pages.push(`PAGE ${i}\n${c.items.map(x=>x.str).join(' ')}`)}return pages.join('\n\n')}
async function parseDocx(file){await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',()=>window.mammoth);const r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return r.value}
async function parseXlsx(file){await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',()=>window.XLSX);const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'});return wb.SheetNames.map(n=>`SHEET: ${n}\n${window.XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n')}
async function parseFile(file){const ext=file.name.split('.').pop().toLowerCase();if(['txt','md','csv','json','html','htm','xml','log'].includes(ext))return file.text();if(ext==='docx')return parseDocx(file);if(['xlsx','xls'].includes(ext))return parseXlsx(file);if(ext==='pdf')return parsePDF(file);throw new Error(`Unsupported file type: .${ext}`)}
function categoryFor(name){const n=name.toLowerCase();if(/spec|section|division/.test(n))return 'Specifications';if(/drawing|plan|sheet/.test(n))return 'Drawings';if(/sop|procedure|manual/.test(n))return 'SOPs';if(/report|assessment|inspection/.test(n))return 'Reports';if(/photo|image/.test(n))return 'Photos';return 'General'}
export async function parseFiles(files,projectId,onProgress=()=>{},libraryId=null){const documents=[],sections=[];let i=0;for(const file of files){onProgress({current:++i,total:files.length,name:file.name});try{const text=clean(await parseFile(file));const documentId=uid();const parts=splitSections(text,file.name);const extension=(file.name.split('.').pop()||'').toLowerCase();documents.push({id:documentId,projectId,libraryId,name:file.name,title:file.name.replace(/\.[^.]+$/,''),type:file.type||extension,extension,size:file.size,lastModified:file.lastModified||null,category:categoryFor(file.name),tags:[],sectionCount:parts.length,characterCount:text.length,lineCount:text?text.split('\n').length:0,headingCount:parts.filter(p=>p.heading!=='Document beginning').length,largestSection:Math.max(0,...parts.map(p=>p.text.length)),averageSection:parts.length?Math.round(text.length/parts.length):0,indexedAt:new Date().toISOString(),status:'verified',health:text.length<100?'warning':'healthy',healthDetail:text.length<100?'Very little extractable text was found.':'Text extraction and indexing completed.'});parts.forEach((p,n)=>sections.push({id:uid(),projectId,libraryId,documentId,documentName:file.name,heading:p.heading,level:p.level||1,kind:p.kind||'section',path:p.path||[p.heading],location:p.location,startLine:p.startLine||null,endLine:p.endLine||null,order:n,text:p.text,characters:p.text.length,wordCount:p.text.trim()?p.text.trim().split(/\s+/).length:0}))}catch(error){documents.push({id:uid(),projectId,libraryId,name:file.name,title:file.name.replace(/\.[^.]+$/,''),type:file.type,extension:(file.name.split('.').pop()||'').toLowerCase(),size:file.size,lastModified:file.lastModified||null,category:categoryFor(file.name),tags:[],sectionCount:0,characterCount:0,indexedAt:new Date().toISOString(),status:'error',health:'error',healthDetail:error.message,error:error.message})}}return {documents,sections}}

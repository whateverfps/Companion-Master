// Authoritative specification section resolver
// ONE INDEX. ONE VIEWER. ONE SOURCE-OPENING PATH.

// Load authoritative specification index
let authoritativeIndex = null;

async function loadAuthoritativeIndex() {
  if (!authoritativeIndex) {
    try {
      const response = await fetch('project-data/bedford/specifications/authoritative-spec-index.json');
      authoritativeIndex = await response.json();
    } catch (error) {
      console.error('Failed to load authoritative specification index:', error);
      authoritativeIndex = [];
    }
  }
  return authoritativeIndex;
}

// Normalize section number: "06 10 00" → "061000"
function normalizeSectionNumber(sectionNumber) {
  return String(sectionNumber || '').replace(/\s/g, '');
}

// Resolve section from authoritative index
async function resolveSection(sectionNumber) {
  const index = await loadAuthoritativeIndex();
  const normalized = normalizeSectionNumber(sectionNumber);
  
  // Try exact match first
  let section = index.find(s => s.sectionNumber === sectionNumber);
  
  // Try normalized match
  if (!section) {
    section = index.find(s => s.normalizedSectionNumber === normalized);
  }
  
  return section || null;
}

// THE SINGLE function to open a specification section
// Parameters: sectionNumber (e.g., "09 91 00")
// Returns: { ok: boolean, section: object|null, error: string }
export async function openSpecificationSection(sectionNumber) {
  if (!sectionNumber) {
    return { ok: false, section: null, error: 'Section number is required' };
  }
  
  const section = await resolveSection(sectionNumber);
  
  if (!section) {
    return { 
      ok: false, 
      section: null, 
      error: `Section ${sectionNumber} not found in authoritative specification index` 
    };
  }
  
  return {
    ok: true,
    section: {
      sectionNumber: section.sectionNumber,
      normalizedSectionNumber: section.normalizedSectionNumber,
      sectionTitle: section.sectionTitle,
      documentId: section.documentId,
      startPdfPage: section.startPdfPage,
      endPdfPage: section.endPdfPage
    },
    error: null
  };
}

// Integration with existing PDF viewer
// This function should be called from the UI to open a specification section
export async function openSpecificationDocument(sectionNumber, engine) {
  console.log('SPECIFICATION RESOLVER: openSpecificationDocument called');
  console.log('  sectionNumber:', sectionNumber);
  
  const result = await openSpecificationSection(sectionNumber);
  
  if (!result.ok) {
    console.log('SPECIFICATION RESOLVER: Section not found');
    console.log('  error:', result.error);
    alert(result.error);
    return;
  }
  
  console.log('SPECIFICATION RESOLVER: Section resolved successfully');
  console.log('  sectionNumber:', result.section.sectionNumber);
  console.log('  documentId:', result.section.documentId);
  console.log('  startPdfPage:', result.section.startPdfPage);
  
  const { section } = result;
  
  // Get the source file for the specification document
  console.log('SPECIFICATION RESOLVER: Calling engine.sourceFile()');
  console.log('  documentId:', section.documentId);
  
  const source = await engine.sourceFile(section.documentId);
  
  if (!source) {
    console.log('SPECIFICATION RESOLVER: Source file not found');
    console.log('  documentId:', section.documentId);
    alert(`Specification document ${section.documentId} not found in project.`);
    return;
  }
  
  console.log('SPECIFICATION RESOLVER: Source file found');
  console.log('  blob size:', source.sourceBlob?.size);
  console.log('  mime type:', source.sourceBlob?.type);
  
  // The caller should now:
  // 1. openPdfBlob(source.sourceBlob)
  // 2. navigate to section.startPdfPage
  
  return { source, section };
}

// For direct browser console testing
if (typeof globalThis !== 'undefined') {
  globalThis.openSpecificationSection = openSpecificationSection;
  globalThis.resolveSection = resolveSection;
  globalThis.openSpecificationDocument = openSpecificationDocument;
}

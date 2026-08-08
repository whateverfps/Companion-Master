// Authoritative specification section resolver
// ONE INDEX. ONE VIEWER. ONE SOURCE-OPENING PATH.

import { readFileSync } from 'fs';
import { join } from 'path';

// Load authoritative specification index
let authoritativeIndex = null;

function loadAuthoritativeIndex() {
  if (!authoritativeIndex) {
    try {
      const indexPath = join(process.cwd(), 'project-data/bedford/specifications/authoritative-spec-index.json');
      authoritativeIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));
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
function resolveSection(sectionNumber) {
  const index = loadAuthoritativeIndex();
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
export function openSpecificationSection(sectionNumber) {
  if (!sectionNumber) {
    return { ok: false, section: null, error: 'Section number is required' };
  }
  
  const section = resolveSection(sectionNumber);
  
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
  const result = openSpecificationSection(sectionNumber);
  
  if (!result.ok) {
    alert(result.error);
    return;
  }
  
  const { section } = result;
  
  // Get the source file for the specification document
  const source = await engine.sourceFile(section.documentId);
  
  if (!source) {
    alert(`Specification document ${section.documentId} not found in project.`);
    return;
  }
  
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

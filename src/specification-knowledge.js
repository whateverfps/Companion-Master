const text = value => value === null || value === undefined ? '' : String(value).trim();
const list = value => Array.isArray(value) ? value : [];

const BEDFORD_SPECIFICATION_MANUAL_FILE_NAME = 'bedford-specification-index.json';
const BEDFORD_SPECIFICATION_MANUAL_PATH = './project-data/bedford/bedford-specification-index.json';

let bedfordSpecificationIndex = null;
let bedfordSpecificationLoadPromise = null;

/**
 * Ensure Bedford specification knowledge is loaded
 */
export async function ensureSpecificationKnowledge({ engine, projectId, libraryId, manualFileName, manualPath, fetcher, onDiagnostic = () => {} } = {}) {
  if (bedfordSpecificationLoadPromise) {
    return bedfordSpecificationLoadPromise;
  }

  bedfordSpecificationLoadPromise = (async () => {
    const started = performance.now();
    
    try {
      // Try to load from project data
      let specificationData = null;
      
      try {
        const response = await fetcher?.(manualPath);
        if (response && response.ok) {
          specificationData = await response.json();
          onDiagnostic({ operation: 'bedford-specification-load', durationMs: performance.now() - started, source: 'project-data', sectionsLoaded: specificationData?.sections?.length || 0 });
        }
      } catch (error) {
        onDiagnostic({ operation: 'bedford-specification-load', durationMs: performance.now() - started, source: 'project-data', error: error?.message || String(error) });
      }
      
      if (specificationData && specificationData.sections) {
        bedfordSpecificationIndex = specificationData;
        return { ok: true, sections: specificationData.sections.length };
      }
      
      // Fallback: try to load from specification index
      const allDocuments = await engine.documents();
      const specDocuments = allDocuments.filter(doc => 
        doc.title?.toLowerCase().includes('specification') || 
        doc.name?.toLowerCase().includes('specification') ||
        doc.id?.toLowerCase().includes('spec')
      );
      
      onDiagnostic({ operation: 'bedford-specification-load', durationMs: performance.now() - started, source: 'document-library', specDocumentsFound: specDocuments.length });
      
      return { ok: false, reason: 'Bedford specification index not found in project data or document library' };
      
    } catch (error) {
      onDiagnostic({ operation: 'bedford-specification-load', durationMs: performance.now() - started, error: error?.message || String(error) });
      return { ok: false, reason: error?.message || 'Failed to load Bedford specification index' };
    }
  })();
  
  return bedfordSpecificationLoadPromise;
}

/**
 * Index specification documents into the specification index
 */
export function indexSpecificationDocuments({ specificationIndex, documents, sections, projectId } = {}) {
  const specificationDocuments = documents.filter(doc => 
    doc.title?.toLowerCase().includes('specification') || 
    doc.name?.toLowerCase().includes('specification') ||
    doc.id?.toLowerCase().includes('spec')
  );
  
  for (const document of specificationDocuments) {
    const sourceSections = sections.filter(item => item.documentId === document.id);
    if (sourceSections.length) {
      specificationIndex.index({ document, sourceSections });
    }
  }
  
  return { indexed: specificationDocuments.length, totalSections: sourceSections.length };
}

/**
 * Get Bedford specification index
 */
export function getBedfordSpecificationIndex() {
  return bedfordSpecificationIndex;
}

/**
 * Create specification explorer
 */
export function createSpecificationExplorer({ specificationIndex, relationshipGraph } = {}) {
  return {
    getSpecificationForDrawing(drawingPageId) {
      if (!bedfordSpecificationIndex || !bedfordSpecificationIndex.sections) {
        return [];
      }
      
      // Find specifications related to this drawing
      // This would be enhanced with actual drawing-to-spec mapping
      return bedfordSpecificationIndex.sections.filter(section => 
        section.projectId === specificationIndex.get(section.documentId, section.sectionNumber)?.projectId
      );
    },
    
    getSpecificationSection(documentId, sectionNumber) {
      return specificationIndex?.get?.(documentId, sectionNumber);
    }
  };
}

/**
 * Populate drawing-spec-links from Bedford specification index
 */
export function populateBedfordDrawingSpecLinks({ drawingSpecificationLinks, specificationIndex, projectId, drawingPageId, sheetDiscipline = '' } = {}) {
  if (!bedfordSpecificationIndex || !bedfordSpecificationIndex.sections) {
    return { populated: 0, reason: 'Bedford specification index not loaded' };
  }
  
  let populated = 0;
  
  // Filter specifications by discipline to reduce noise
  // Map disciplines to CSI divisions
  const disciplineToDivision = {
    'Architectural': ['01', '03', '04', '05', '06', '07', '08', '09', '10'],
    'Structural': ['03', '05', '13', '14'],
    'Mechanical': ['23', '25'],
    'Electrical': ['26', '27'],
    'Plumbing': ['22', '23'],
    'Fire Protection': ['21', '13'],
    'Civil': ['02', '31', '32', '33']
  };
  
  const relevantDivisions = disciplineToDivision[sheetDiscipline] || [];
  
  for (const section of bedfordSpecificationIndex.sections) {
    if (section.projectId !== projectId) continue;
    
    // If we have a discipline, filter by CSI division
    if (relevantDivisions.length > 0) {
      const sectionDivision = section.sectionNumber.slice(0, 2);
      if (!relevantDivisions.includes(sectionDivision)) continue;
    }
    
    const link = drawingSpecificationLinks.link({
      projectId,
      drawingDocumentId: section.documentId,
      drawingPageId,
      specificationDocumentId: section.documentId,
      sectionNumber: section.sectionNumber,
      origin: 'bedford-import',
      status: 'suggested',
      confidence: 0.7,
      evidenceSource: 'Bedford specification index',
      evidenceText: `Bedford specification ${section.sectionNumber} — ${section.sectionTitle}`,
      reason: sheetDiscipline ? `Imported from Bedford specification manual (filtered by ${sheetDiscipline} discipline)` : 'Imported from Bedford specification manual'
    });
    
    if (link) {
      populated++;
    }
  }
  
  return { populated, reason: 'Bedford specifications populated as suggestions' };
}

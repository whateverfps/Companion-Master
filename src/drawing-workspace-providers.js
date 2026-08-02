export async function loadDrawingWorkspaceProviders({ loadSections, loadDocuments, onFailure = () => {} } = {}) {
  let documents = [];
  try {
    documents = typeof loadDocuments === 'function' ? await loadDocuments() : [];
    if (!Array.isArray(documents)) throw new Error('Document provider returned an invalid result.');
  } catch (error) {
    const warning = 'Drawing documents are unavailable.'; onFailure({ provider: 'documents', warning, message: error?.message || String(error) });
    return { documents: [], sections: [], warnings: [warning] };
  }
  try {
    const sections = typeof loadSections === 'function' ? await loadSections() : [];
    if (!Array.isArray(sections)) throw new Error('Specification section provider returned an invalid result.');
    return { documents, sections, warnings: [] };
  } catch (error) {
    const warning = 'Specification requirements are unavailable. Manual drawing use remains available.';
    onFailure({ provider: 'specification-sections', warning, message: error?.message || String(error) });
    return { documents, sections: [], warnings: [warning] };
  }
}

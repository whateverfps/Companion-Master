export async function loadDrawingWorkspaceProviders({ loadSections, onFailure = () => {} } = {}) {
  try {
    const sections = typeof loadSections === 'function' ? await loadSections() : [];
    if (!Array.isArray(sections)) throw new Error('Specification section provider returned an invalid result.');
    return { sections, warnings: [] };
  } catch (error) {
    const warning = 'Specification requirements are unavailable. Manual drawing use remains available.';
    onFailure({ provider: 'specification-sections', warning, message: error?.message || String(error) });
    return { sections: [], warnings: [warning] };
  }
}

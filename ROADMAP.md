# Mission Companion Master Roadmap

## Current release — v2.1.0 (Build 1)

Implemented:

- Single master browser codebase
- Project-based knowledge libraries
- PDF, DOCX, XLS/XLSX, text, Markdown, CSV, JSON, HTML, XML, and log ingestion
- Heading- and section-aware indexing
- Source-only, SME-assisted, and general assistant modes
- Evidence panel and source inspector
- Known-answer SME evaluation cases
- Project export and import
- GitHub Pages deployment

## Next priorities

### Build 1 — Reliability — COMPLETE

- Expand automated tests for navigation, document ingestion, retrieval, and citations
- Add visible parser warnings when extraction is incomplete
- Add document and section statistics
- Add application error reporting panel

### 2.2 — Retrieval accuracy

- Improve exact-term and heading weighting
- Add query expansion for definitions and cross-references
- Add reranking of retrieved sections
- Add conflicting-source detection
- Add answer-level citation verification

### 2.3 — Knowledge packs

- Preserve full table-of-contents hierarchy
- Open entire chapters and specification sections
- Add document revision and governing-source metadata
- Add reusable project templates and evaluation packs

### 2.4 — Hosted product

- Secure server-side model proxy
- User accounts and project storage
- Shared organizational knowledge libraries
- Access controls, usage limits, and audit logs

### 2.5 — Desktop releases

- Build Windows and macOS shells from this same master repository
- Add local folder access and confidential local-only projects

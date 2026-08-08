#!/usr/bin/env node

import { openSpecificationSection } from '../src/authoritative-spec-resolver.js';

console.log('=== AUTHORITY SPECIFICATION RESOLVER TEST ===\n');

const testSections = [
  '06 10 00',
  '06 20 00',
  '09 30 13',
  '09 91 00',
  '10 14 00',
  '23 10 00',  // Should NOT be found
  '23 20 00',  // Should NOT be found
  '26 05 11',  // Real 26-series
  '27 05 53'   // Real 27-series
];

for (const sectionNumber of testSections) {
  const result = openSpecificationSection(sectionNumber);
  
  if (result.ok) {
    console.log(`✓ ${sectionNumber}`);
    console.log(`  Title: ${result.section.sectionTitle}`);
    console.log(`  Pages: ${result.section.startPdfPage}-${result.section.endPdfPage}`);
    console.log(`  Document: ${result.section.documentId}`);
  } else {
    console.log(`✗ ${sectionNumber}`);
    console.log(`  Error: ${result.error}`);
  }
  console.log();
}

console.log('=== TEST COMPLETE ===');

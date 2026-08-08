#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';

// Test the authoritative specification index directly
const index = JSON.parse(readFileSync(join(process.cwd(), 'project-data/bedford/specifications/authoritative-spec-index.json'), 'utf-8'));

console.log('=== AUTHORITY SPECIFICATION INDEX TEST ===\n');

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
  const section = index.find(s => s.sectionNumber === sectionNumber);
  
  if (section) {
    console.log(`✓ ${sectionNumber}`);
    console.log(`  Title: ${section.sectionTitle}`);
    console.log(`  Pages: ${section.startPdfPage}-${section.endPdfPage}`);
    console.log(`  Document: ${section.documentId}`);
  } else {
    console.log(`✗ ${sectionNumber}`);
    console.log(`  Error: Section not found in authoritative specification index`);
  }
  console.log();
}

console.log('=== TEST COMPLETE ===');

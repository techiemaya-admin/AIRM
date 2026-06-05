/**
 * Diagnostic: inspect DOCX XML to see how placeholders are stored.
 * Run: node inspect-docx.js "path/to/your/template.docx"
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PizZip = require('./frontend/node_modules/pizzip');

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node inspect-docx.js <path-to-docx>');
    process.exit(1);
}

const buf = readFileSync(filePath);
const zip = new PizZip(buf);

const xmlFiles = Object.keys(zip.files).filter(p => !zip.files[p].dir && p.toLowerCase().endsWith('.xml'));
console.log('\n=== XML files in DOCX ===');
console.log(xmlFiles);

// Focus on word/document.xml
const docXml = zip.files['word/document.xml']?.asText?.();
if (!docXml) {
    console.error('\n❌ word/document.xml not found or asText() unavailable');
    process.exit(1);
}

console.log('\n=== Searching for { and [ in word/document.xml ===');

// Find all <w:t> contents
const wtMatches = [...docXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
console.log(`\nTotal <w:t> elements: ${wtMatches.length}`);

const bracketedRuns = wtMatches.filter(m => m[1].includes('{') || m[1].includes('[') || m[1].includes('}') || m[1].includes(']'));
console.log(`\n<w:t> elements containing { or [ or } or ]:`);
bracketedRuns.forEach(m => console.log(`  → "${m[1]}"`));

// Find paragraph text by combining runs
console.log('\n=== Paragraph-level combined text (checking for split placeholders) ===');
const paraMatches = [...docXml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)];
paraMatches.forEach((para, i) => {
    const runs = [...para[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    const combined = runs.map(r => r[1]).join('');
    if (combined.includes('{') || combined.includes('[') || combined.includes('}') || combined.includes(']')) {
        console.log(`  Para ${i}: "${combined}"`);
    }
});

// Show raw XML around first { found
const firstBrace = docXml.indexOf('{');
if (firstBrace !== -1) {
    console.log('\n=== Raw XML around first { ===');
    console.log(docXml.substring(Math.max(0, firstBrace - 200), firstBrace + 300));
} else {
    console.log('\n❌ No { character found in document.xml at all!');
    // Search for partial text
    const sample = docXml.substring(0, 2000);
    console.log('\n=== First 2000 chars of document.xml ===');
    console.log(sample);
}

// Also check for SDT (structured document tags) or form fields
if (docXml.includes('<w:sdt>') || docXml.includes('<w:fldChar>')) {
    console.log('\n⚠️  Document uses SDT or field codes — placeholders might be in special elements');
}

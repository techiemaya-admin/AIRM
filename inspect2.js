import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PizZip = require('./frontend/node_modules/pizzip');

const filePath = process.argv[2];
const buf = readFileSync(filePath);
const zip = new PizZip(buf);

const docXml = zip.files['word/document.xml']?.asText?.() || '';
writeFileSync('word-document.xml', docXml, 'utf8');

// Find { and [ characters
const hasCurly = docXml.includes('{');
const hasSquare = docXml.includes('[');
console.log(`Has { : ${hasCurly}`);
console.log(`Has [ : ${hasSquare}`);
console.log(`XML length: ${docXml.length}`);

// Extract all w:t text contents
const wtTexts = [...docXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]);
const allText = wtTexts.join('');
console.log('\nAll w:t text joined:\n' + allText.substring(0, 3000));

// Check paragraph combined text
const paras = [...docXml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)];
console.log(`\nTotal paragraphs: ${paras.length}`);
const paraTexts = paras.map(p => {
    const runs = [...p[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    return runs.map(r => r[1]).join('');
}).filter(t => t.trim());
console.log('\nParagraph texts:');
paraTexts.slice(0, 30).forEach((t, i) => console.log(`  [${i}] ${t}`));

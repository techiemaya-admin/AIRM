
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const excludeFiles = [
    'create-test-erp-schema.js',
    'remove-schema-refs.js',
    'package-lock.json',
    'node_modules'
    // I also want to preserve the schema definition in connection.js
    // "const schema = process.env.DB_SCHEMA || 'erp';" - this is fine as it has no dot.
    // "sql `SET search_path TO ${schema}, public`" - fine.
];

const includeExts = ['.js', '.sql', '.ts'];

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git') continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            traverseDir(fullPath);
        } else {
            if (includeExts.includes(path.extname(file)) && !excludeFiles.includes(file)) {
                processFile(fullPath);
            }
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Regex to match "erp." not preceded by "_" or word chars, and replace it with empty string.
    // We want to capture the character before "erp." if it's not "_" or word char, and keep it.

    // /(?<![_\w])erp\./g -> '' (This is supported in Node 20)

    try {
        const regex = /(?<![_\w])erp\./g;
        content = content.replace(regex, '');
    } catch (e) {
        console.error(`Regex error on file ${filePath}: ${e}`);
        return;
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

console.log('Starting schema reference removal...');
traverseDir(rootDir);
console.log('Complete.');

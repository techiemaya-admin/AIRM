import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = __dirname;
const sdkDir = path.join(frontendDir, 'SDK');

if (!fs.existsSync(sdkDir)) {
    fs.mkdirSync(sdkDir);
}

function getFiles(dir, matchRule, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.vite' && file !== 'SDK') {
                getFiles(fullPath, matchRule, fileList);
            }
        } else {
            if (matchRule(fullPath)) {
                fileList.push(fullPath);
            }
        }
    }
    return fileList;
}

const matchFiles = (fp) => {
    const norm = fp.replace(/\\/g, '/');
    if (norm.endsWith('/src/lib/api.ts')) return true;
    if (norm.endsWith('/src/lib/joiningFormService.ts')) return true;
    if (norm.includes('/features/') && (norm.endsWith('Service.ts') || norm.endsWith('/api.ts'))) return true;
    return false;
};

const apiFiles = getFiles(frontendDir, matchFiles);

// Calculate move destinations
const moves = [];
apiFiles.forEach(srcPath => {
    const norm = srcPath.replace(/\\/g, '/');
    let newName = path.basename(srcPath);

    if (newName === 'api.ts') {
        if (norm.includes('/features/')) {
            const match = norm.match(/\/features\/([^/]+)/);
            if (match) {
                newName = `${match[1]}Api.ts`; // e.g., exit-formalitiesApi.ts
            }
        }
    }

    const destPath = path.join(sdkDir, newName);
    moves.push({ src: srcPath.replace(/\\/g, '/'), dest: destPath.replace(/\\/g, '/'), newName, norm });
});

console.log('moves:', moves.length);
fs.writeFileSync('moves.json', JSON.stringify(moves, null, 2));

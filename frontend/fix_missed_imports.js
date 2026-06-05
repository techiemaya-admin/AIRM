import fs from 'fs';
import path from 'path';

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

const frontendDir = 'c:/Users/prasanna/Downloads/my-test-repo/my-test-repo/my-test-repo-main/AIRM/frontend';
const allTsFiles = getFiles(frontendDir, (f) => f.endsWith('.ts') || f.endsWith('.tsx'));

let changedFilesCount = 0;

for (const f of allTsFiles) {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;

    // Fix missed joiningFormService imports
    const joiningRegexes = [
        /from ['"]\.\.\/joining-form\/services\/joiningFormService['"]/g,
        /from ['"]\.\/services\/joiningFormService['"]/g,
        /from ['"]\.\.\/\.\.\/joining-form\/services\/joiningFormService['"]/g,
        /from ['"]@\/lib\/joiningFormService['"]/g
    ];

    for (const regex of joiningRegexes) {
        if (content.match(regex)) {
            content = content.replace(regex, 'from "@sdk/joiningFormService"');
            changed = true;
        }
    }

    // Also catch any generic ../*/services/* imports that got missed
    const missedServiceRegex = /from ['"](?:\.\.\/)+[^/]+\/services\/([^/]+)['"]/g;
    content = content.replace(missedServiceRegex, (match, serviceName) => {
        // check if this is meant to go to sdk by dropping ".ts" if present
        const cleanName = serviceName.replace('.ts', '');
        changed = true;
        return `from "@sdk/${cleanName}"`;
    });

    const exactServiceRegex = /from ['"]\.\/services\/([^/]+)['"]/g;
    content = content.replace(exactServiceRegex, (match, serviceName) => {
        const cleanName = serviceName.replace('.ts', '');
        changed = true;
        return `from "@sdk/${cleanName}"`;
    });


    if (changed) {
        fs.writeFileSync(f, content);
        console.log('Fixed imports in', f);
        changedFilesCount++;
    }
}

console.log('Total files changed:', changedFilesCount);

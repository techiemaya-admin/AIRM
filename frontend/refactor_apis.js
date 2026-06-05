import fs from 'fs';
import path from 'path';

const moves = JSON.parse(fs.readFileSync('moves.json', 'utf8'));

const destSet = new Set();
for (let move of moves) {
    let baseName = move.newName;
    while (destSet.has(baseName)) {
        const parsed = path.parse(baseName);
        baseName = parsed.name + '-1' + parsed.ext;
    }
    destSet.add(baseName);
    move.newName = baseName;
    move.dest = path.join('C:/Users/prasanna/Downloads/my-test-repo/my-test-repo/my-test-repo-main/AIRM/frontend/SDK', baseName).replace(/\\/g, '/');
}

for (let move of moves) {
    if (fs.existsSync(move.src)) {
        fs.copyFileSync(move.src, move.dest);
    }
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

const frontendDir = 'C:/Users/prasanna/Downloads/my-test-repo/my-test-repo/my-test-repo-main/AIRM/frontend';
const allTsFiles = getFiles(frontendDir, (f) => f.endsWith('.ts') || f.endsWith('.tsx'));

const getImportPathMatchers = (srcPath) => {
    if (srcPath.includes('/src/lib/api.ts')) {
        return [/@\/lib\/api/g, /\.\.\/\.\.\/lib\/api/g, /\.\.\/lib\/api/g, /^..\/..\/..\/lib\/api$/g];
    }
    if (srcPath.includes('/src/lib/joiningFormService.ts')) {
        return [/@\/lib\/joiningFormService/g, /\.\.\/\.\.\/lib\/joiningFormService/g, /\.\.\/lib\/joiningFormService/g];
    }

    const featMatchService = srcPath.match(/\/features\/([^/]+)\/services\/([^.]+)\.ts/);
    if (featMatchService) {
        const [_, feat, name] = featMatchService;
        return [
            new RegExp(`@features/${feat}/services/${name}`, 'g'),
            new RegExp(`\\.\\./services/${name}`, 'g'),
            new RegExp(`\\.\\./\\.\\./services/${name}`, 'g'),
            new RegExp(`\\./services/${name}`, 'g'),
            new RegExp(`\\.\\./\\.\\./features/${feat}/services/${name}`, 'g')
        ];
    }

    const featMatchApi = srcPath.match(/\/features\/([^/]+)\/api\.ts/);
    if (featMatchApi) {
        const [_, feat] = featMatchApi;
        return [
            new RegExp(`@features/${feat}/api`, 'g'),
            new RegExp(`\\.\\./api`, 'g'),
            new RegExp(`\\./api`, 'g')
        ];
    }
    return [];
};

for (const f of allTsFiles) {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;

    // Quick and dirty string replace loop
    // Note: we replace paths within single or double quotes normally. The regexes above don't include quotes,
    // so replacing `@/lib/api` with `@sdk/api` will keep the quotes intact.

    for (const move of moves) {
        const matchers = getImportPathMatchers(move.norm);
        for (const regex of matchers) {
            if (content.match(regex)) {
                content = content.replace(regex, `@sdk/${path.parse(move.newName).name}`);
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(f, content);
    }
}

const tsPath = path.join(frontendDir, 'tsconfig.json');
let tsContent = fs.readFileSync(tsPath, 'utf8');
if (!tsContent.includes('"@sdk/*"')) {
    tsContent = tsContent.replace(/"paths":\s*\{/, '"paths": {\n      "@sdk/*": ["./SDK/*"],');
    fs.writeFileSync(tsPath, tsContent);
}

const vitePath = path.join(frontendDir, 'vite.config.ts');
let viteContent = fs.readFileSync(vitePath, 'utf8');
if (!viteContent.includes("'@sdk'")) {
    viteContent = viteContent.replace(/alias:\s*\{/, "alias: {\n        '@sdk': path.resolve(__dirname, './SDK'),");
    fs.writeFileSync(vitePath, viteContent);
}

for (let move of moves) {
    if (fs.existsSync(move.src)) {
        fs.unlinkSync(move.src);
    }
}

console.log('done refactoring APIs');

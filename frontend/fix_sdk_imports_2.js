import fs from 'fs';
import path from 'path';

const sdkDir = 'c:/Users/prasanna/Downloads/my-test-repo/my-test-repo/my-test-repo-main/AIRM/frontend/SDK';
const files = fs.readdirSync(sdkDir);

for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    const filePath = path.join(sdkDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    let featureName = '';
    if (file.startsWith('exit-')) featureName = 'exit-formalities';
    else if (file.startsWith('joiningForm')) featureName = 'joining-form';
    else if (file.startsWith('payroll-pf')) featureName = 'payroll-pf';
    else if (file.startsWith('leave-calendar')) featureName = 'leave-calendar';
    else if (file.includes('Service.ts')) {
        featureName = file.replace('Service.ts', '');
    }

    // Fix types imports
    const regex = /from ['"]\.\.\/types['"]/g;
    if (regex.test(content)) {
        if (featureName) {
            content = content.replace(regex, `from "../features/${featureName}/types"`);
            changed = true;
        } else if (file === 'documentService.ts') {
            content = content.replace(regex, `from "../features/profiles/types"`);
            changed = true;
        }
    }

    // Fix @/lib/api imports and @/hooks/...
    const apiRegex = /from ['"]@\/lib\/api['"]/g;
    if (apiRegex.test(content)) {
        content = content.replace(apiRegex, `from "@sdk/api"`);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed file', file);
    }
}

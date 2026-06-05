import fs from 'fs';
import path from 'path';

const sdkDir = 'c:/Users/prasanna/Downloads/my-test-repo/my-test-repo/my-test-repo-main/AIRM/frontend/SDK';
const files = fs.readdirSync(sdkDir);

for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    const filePath = path.join(sdkDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Infer the feature name from the filename. 
    // e.g., exit-assetService.ts -> exit-formalities
    // profilesService.ts -> profiles
    // We can use regex replacement with a map or just replace based on the leading part.

    let featureName = '';
    if (file.startsWith('exit-')) featureName = 'exit-formalities';
    else if (file.startsWith('joiningForm')) featureName = 'joining-form';
    else if (file.startsWith('payroll-pf')) featureName = 'payroll-pf';
    else if (file.startsWith('leave-calendar')) featureName = 'leave-calendar';
    else if (file.includes('Service.ts')) {
        featureName = file.replace('Service.ts', '');
    }

    if (featureName && content.includes(`from "../types"`)) {
        content = content.replace(/from ['"]\.\.\/types['"]/g, `from "../features/${featureName}/types"`);
        changed = true;
    }

    // Also handle joiningFormService.ts which might need specific fixing
    if (file === 'joiningFormService.ts') {
        content = content.replace(/from ['"]\.\.\/features\/joining-form\/types['"]/g, `from "../features/joining-form/types"`);
    }

    // Handle any other direct "../types" cases just in case
    const regex = /from ['"]\.\.\/types['"]/g;
    if (regex.test(content)) {
        // If feature could not be inferred perfectly, guess from filename or fail gracefully.
        // e.g., documentService.ts has "../types" (from profiles feature presumably).
        if (file === 'documentService.ts') {
            content = content.replace(regex, `from "../features/profiles/types"`);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed types import in', file);
    }
}

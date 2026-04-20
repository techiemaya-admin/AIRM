import PizZip from 'pizzip';
import { EmployeeData } from '../types';

// ─── Alias map ───────────────────────────────────────────────────────────────
// Keys are the canonical field names; values list every placeholder variant
// that might appear in a template.  All comparisons are case-insensitive
// (see buildMergeMap below).
const fieldAliases: Record<string, string[]> = {
  employee_name: [
    'Employee Name', 'employee_name', 'Name', 'Full Name', 'FullName',
  ],
  employee_id: [
    'Employee Code', 'Employee ID', 'Employee Id', 'employee_id',
    'EmployeeCode', 'Code', 'emp_code',
  ],
  designation: ['Designation', 'designation', 'Title', 'Position', 'Job Title'],
  department: ['Department', 'department', 'Dept'],
  date_of_joining: [
    'Joiningdate', 'JoiningDate', 'Joining Date', 'joining_date',
    'date_of_joining', 'Join Date', 'Date of Joining', 'Date of joining',
    'Joining date',
  ],
  date_of_leaving: [
    'Date of Leaving', 'Date of leaving', 'date_of_leaving',
    'Leaving Date', 'Date of Ending',
  ],
  salary: ['Salary', 'salary', 'Gross Salary', 'CTC', 'Pay'],
  address: ['Address', 'address', 'Residing At'],
  email: ['Email', 'email', 'E-mail', 'Mail'],
  phone: ['Phone', 'phone', 'Mobile', 'Contact', 'Phone No'],
  manager_name: ['Manager Name', 'Manager name', 'manager_name', 'Manager'],
  company_name: ['Company Name', 'Company name', 'company_name', 'Company'],
  bank_name: ['Bank Name', 'Bank name', 'bank_name', 'Bank'],
  bank_account: [
    'Bank Account No', 'Bank Account No.', 'bank_account',
    'Account Number', 'Account No', 'Bank Account',
  ],
  ifsc: ['IFSC', 'IFSC Code', 'ifsc', 'ifsc_code', 'Bank IFSC'],
  pan_number: ['PAN', 'PAN No', 'PAN No.', 'pan_number', 'PAN Number'],
  location: ['Location', 'location', 'City'],
  leave_balance: ['Leave balance', 'Leave Balance', 'leave_balance'],
  leave_availed: ['Leave Availed', 'Leave availed', 'leave_availed'],
  effective_work_days: [
    'Effective work day', 'Effective Work Days', 'Effective work days',
    'effective_work_days', 'Paid Days', 'Work Days',
  ],
  lop: ['LOP', 'lop', 'LOP Days', 'Loss of Pay'],
  basic_salary: ['Basic Salary', 'Basic salary', 'basic_salary', 'Basic', 'Basic Pay'],
  hra: ['HRA', 'hra', 'House Rent Allowance'],
  other_allowances: [
    'Other Allowances', 'Other allowances', 'Other Allowance', 'other_allowances',
  ],
  pt: ['PT', 'pt', 'Professional Tax'],
  total_earnings: [
    'Gross Payable', 'Gross payable', 'Total Earnings', 'total_earnings', 'Gross Pay',
  ],
  total_deduction: [
    'Total Deduction', 'Total deduction', 'total_deduction', 'Total Deductions',
  ],
  net_pay: ['Net Pay', 'Net pay', 'net_pay', 'Take Home', 'Net Salary'],
  rupees_in_words: [
    'Rupees in Words', 'Rupees in words', 'rupees_in_words', 'Amount in Words',
  ],
};

/**
 * Build a lookup: every alias variant → replacement value.
 * We store BOTH the exact-case and lower-case versions so our
 * replacements can be case-insensitive.
 */
function buildMergeMap(emp: EmployeeData): Map<string, string> {
  const map = new Map<string, string>();
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    const value = String((emp as any)[field] ?? '');
    // raw field key
    map.set(field.toLowerCase(), value);
    for (const alias of aliases) {
      map.set(alias.toLowerCase(), value);
    }
  }
  return map;
}

/** Escape a value so it is safe to embed as XML text content. */
function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Resolve a placeholder key against the merge map (case-insensitive). */
function resolvePlaceholder(key: string, map: Map<string, string>): string | undefined {
  return map.get(key.trim().toLowerCase());
}

/**
 * Replace {curly} and [bracket] style placeholders in one XML string.
 *
 * Two-pass strategy:
 *   Pass A – fast, regex-based: replaces placeholders that live within
 *             a single <w:t> element.
 *   Pass B – paragraph-level: handles placeholders that Word splits
 *             across multiple <w:r><w:t> runs.
 */
function replacePlaceholders(xml: string, map: Map<string, string>): string {
  // Regex that matches both {key} and [key] placeholders
  const PLACEHOLDER_RE = /[{\[]((?:[^}\]]+))[}\]]/g;

  const applyReplacements = (text: string): string => {
    return text.replace(PLACEHOLDER_RE, (match, key) => {
      const v = resolvePlaceholder(key, map);
      return v !== undefined ? xmlEscape(v) : match;
    });
  };

  const hasBrackets = (s: string) => s.includes('[') || s.includes('{');

  // ── Pass A: single-run replacement ───────────────────────────────────────
  // Operate only on <w:t> content to avoid touching XML attributes / tags.
  let result = xml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (_, attrs, text) => {
    if (!hasBrackets(text)) return `<w:t${attrs}>${text}</w:t>`;
    const replaced = applyReplacements(text);
    return `<w:t${attrs}>${replaced}</w:t>`;
  });

  // ── Pass B: paragraph-level normalization for split-run placeholders ──────
  result = result.replace(
    /(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g,
    (full, open, body, close) => {
      // Quick exit: no brackets in this paragraph
      if (!hasBrackets(body)) return full;

      // Collect all <w:t> runs
      const runRE = /(<w:t(?:[^>]*)>)([\s\S]*?)(<\/w:t>)/g;
      const runs: Array<{ open: string; text: string; close: string }> = [];
      let m: RegExpExecArray | null;
      while ((m = runRE.exec(body)) !== null) {
        runs.push({ open: m[1], text: m[2], close: m[3] });
      }
      if (runs.length === 0) return full;

      const combined = runs.map(r => r.text).join('');
      if (!hasBrackets(combined)) return full;

      const replaced = combined.replace(PLACEHOLDER_RE, (match, key) => {
        const v = resolvePlaceholder(key, map);
        if (v !== undefined) console.log(`[docxMerge] Pass-B: ${match} → ${v}`);
        return v !== undefined ? xmlEscape(v) : match;
      });

      if (replaced === combined) return full; // no change

      // Rebuild: put all text in first run, zero-out the rest
      let firstDone = false;
      const newBody = body.replace(
        /(<w:t(?:[^>]*)>)([\s\S]*?)(<\/w:t>)/g,
        (_, rOpen) => {
          if (!firstDone) {
            firstDone = true;
            // Ensure xml:space="preserve" so spaces at edges are kept
            const tag = rOpen.includes('preserve')
              ? rOpen
              : `<w:t xml:space="preserve">`;
            return `${tag}${replaced}</w:t>`;
          }
          return `<w:t></w:t>`;
        },
      );
      return open + newBody + close;
    },
  );

  // ── Pass C: Hardcoded "(Rupees ... Only)" replacement fallback ─────────
  // Some templates have hardcoded text like "(Rupees Twenty Thousand Only)"
  // instead of a `[Rupees in Words]` placeholder. We intercept and replace it.
  const wordsValue = map.get('rupees_in_words');
  if (wordsValue) {
    result = result.replace(
      /(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g,
      (full, open, body, close) => {
        // Collect all <w:t> runs in this paragraph
        const runRE = /(<w:t(?:[^>]*)>)([\s\S]*?)(<\/w:t>)/g;
        const runs: Array<{ open: string; text: string; close: string }> = [];
        let m: RegExpExecArray | null;
        while ((m = runRE.exec(body)) !== null) {
          runs.push({ open: m[1], text: m[2], close: m[3] });
        }
        if (runs.length === 0) return full;

        const combined = runs.map(r => r.text).join('');
        // Match "Rupees ... Only" OR "Rupees ... in words" case-insensitively
        const rupeesRegex = /Rupes?s?\s+(.*?\s+Only|.*?in\s+words)/gi;

        if (!rupeesRegex.test(combined)) return full;

        // the wordsValue already contains 'Amount Rupees Only', so we replace the whole match
        const replaced = combined.replace(rupeesRegex, wordsValue);
        if (replaced === combined) return full;

        console.log(`[docxMerge] Pass-C (Hardcoded Text) replaced with: ${wordsValue}`);

        let firstDone = false;
        const newBody = body.replace(
          /(<w:t(?:[^>]*)>)([\s\S]*?)(<\/w:t>)/g,
          (_, rOpen) => {
            if (!firstDone) {
              firstDone = true;
              const tag = rOpen.includes('preserve') ? rOpen : `<w:t xml:space="preserve">`;
              return `${tag}${replaced}</w:t>`;
            }
            return `<w:t></w:t>`;
          },
        );
        return open + newBody + close;
      }
    );
  }

  return result;
}

/** Entry point – merge template DOCX with employee data. */
export async function mergeDocxWithData(
  templateContent: ArrayBuffer,
  employeeData: EmployeeData,
): Promise<ArrayBuffer> {
  const map = buildMergeMap(employeeData);

  // ── 1. Load the DOCX (zip) ────────────────────────────────────────────────
  let zip: PizZip;
  try {
    zip = new PizZip(templateContent);
  } catch (e) {
    console.error('[docxMerge] PizZip failed to parse template:', e);
    throw new Error('Could not read the DOCX template file.');
  }

  // ── 2. Find all XML files that contain Word text ─────────────────────────
  // NOTE: PizZip does NOT have a .forEach() method in the browser ESM build.
  // Use Object.keys(zip.files) to iterate over entries instead.
  const wordXmlFiles: string[] = [];
  for (const path of Object.keys(zip.files)) {
    const file = zip.files[path];
    if (!file.dir && path.toLowerCase().endsWith('.xml')) {
      try {
        if (file.asText().includes('<w:t')) wordXmlFiles.push(path);
      } catch (_) { /* skip unreadable */ }
    }
  }
  console.log('[docxMerge] Word XML files found:', wordXmlFiles);

  // ── 3. Apply replacements to every XML file ───────────────────────────────
  let totalReplacements = 0;
  for (const path of wordXmlFiles) {
    try {
      const original = zip.file(path)!.asText();
      const updated = replacePlaceholders(original, map);
      if (updated !== original) {
        zip.file(path, updated);
        totalReplacements++;
        console.log(`[docxMerge] Updated: ${path}`);
      } else {
        console.log(`[docxMerge] No changes in: ${path} (brackets found: ${original.includes('[')}, first100: ${original.substring(0, 100)})`);
      }
    } catch (e) {
      console.error(`[docxMerge] Error processing ${path}:`, e);
    }
  }
  console.log(`[docxMerge] Total files updated: ${totalReplacements}`);

  // ── 4. Generate and return the modified DOCX ─────────────────────────────
  try {
    return zip.generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    }) as ArrayBuffer;
  } catch (e) {
    console.error('[docxMerge] zip.generate() failed:', e);
    throw new Error('Failed to generate the merged document.');
  }
}

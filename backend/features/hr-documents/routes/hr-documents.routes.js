import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import mammoth from 'mammoth';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';

const router = express.Router();

const baseDir = process.env.K_SERVICE ? '/tmp' : path.join(process.cwd(), 'backend');
const uploadsDir = path.resolve(baseDir, 'uploads', 'hr-documents');
fs.ensureDirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// List uploaded templates
router.get('/templates', async (req, res) => {
  try {
    const files = await fs.readdir(uploadsDir);
    const templates = files.filter(f => !f.endsWith('.meta.json')).map(f => ({ id: f, name: f }));
    res.json({ success: true, templates });
  } catch (err) {
    console.error('hr-documents: list templates error', err);
    res.status(500).json({ success: false, error: 'Could not list templates' });
  }
});

// Get template details (including converted HTML preview when possible)
router.get('/templates/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const templatePath = path.join(uploadsDir, id);
    if (!await fs.pathExists(templatePath)) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const stat = await fs.stat(templatePath);
    const ext = path.extname(templatePath).toLowerCase();
    let html = null;
    try {
      if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.convertToHtml({ path: templatePath });
        html = result.value || '';
      } else {
        // For plain text or other types, return file contents as preformatted HTML
        const txt = await fs.readFile(templatePath, 'utf8');
        html = `<pre>${txt.replace(/</g, '&lt;')}</pre>`;
      }
    } catch (e) {
      console.warn('hr-documents: preview conversion failed', e.message);
    }

    // Read metadata file if exists
    const metaPath = `${templatePath}.meta.json`;
    let meta = {};
    if (await fs.pathExists(metaPath)) {
      meta = await fs.readJson(metaPath);
    }

    return res.json({
      success: true, template: {
        id,
        originalname: meta.originalname || id,
        filename: id,
        path: templatePath,
        size: stat.size,
        extractedFields: meta.extractedFields || [],
        uploadedAt: meta.uploadedAt || null,
        html,
      }
    });
  } catch (err) {
    console.error('hr-documents: get template error', err);
    return res.status(500).json({ success: false, error: 'Could not read template' });
  }
});

// Delete a template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templatePath = path.join(uploadsDir, id);
    const metaPath = `${templatePath}.meta.json`;

    if (!await fs.pathExists(templatePath)) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Delete the template file
    await fs.remove(templatePath);

    // Delete the metadata file if exists
    if (await fs.pathExists(metaPath)) {
      await fs.remove(metaPath);
    }

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    console.error('hr-documents: delete template error', err);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

// Upload a template and attempt to extract handlebars-style placeholders
router.post('/templates/upload', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let extractedFields = [];
    let previewHtml = null;

    try {
      if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.convertToHtml({ path: filePath });
        const html = result.value || '';
        // extract handlebars-like tokens {{token}}
        const matches = [...html.matchAll(/{{\s*([\w.\-]+)\s*}}/g)];
        extractedFields = Array.from(new Set(matches.map(m => m[1])));
        previewHtml = html;
      } else {
        // For non-docx files, just record filename
        extractedFields = [];
      }
    } catch (e) {
      console.warn('hr-documents: template parsing failed', e.message);
    }

    // Save metadata alongside file
    const meta = {
      originalname: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      extractedFields,
      uploadedAt: new Date().toISOString(),
      body: req.body,
    };
    await fs.writeJson(path.join(uploadsDir, `${req.file.filename}.meta.json`), meta, { spaces: 2 });

    res.json({ success: true, message: 'Uploaded', meta, previewAvailable: Boolean(previewHtml) });
  } catch (err) {
    console.error('hr-documents upload error', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// Generate a preview by merging template with provided JSON data
router.post('/generate/preview', express.json(), async (req, res) => {
  try {
    const { templateId, data } = req.body;
    if (!templateId) return res.status(400).json({ success: false, error: 'templateId is required' });

    const templatePath = path.join(uploadsDir, templateId);
    if (!await fs.pathExists(templatePath)) return res.status(404).json({ success: false, error: 'Template not found' });

    const ext = path.extname(templatePath).toLowerCase();
    let html = '';
    if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.convertToHtml({ path: templatePath });
      html = result.value || '';
    } else {
      // fallback: return plain text wrapped in pre
      const txt = await fs.readFile(templatePath, 'utf8');
      html = `<pre>${escapeHtml(txt)}</pre>`;
    }

    // Detect placeholders in the original HTML
    const placeholderMatches = [...html.matchAll(/{{\s*([\w.\-]+)\s*}}/g)];
    const placeholders = Array.from(new Set(placeholderMatches.map(m => m[1])));
    const hasPlaceholders = placeholders.length > 0;

    // Compile with Handlebars
    const template = handlebars.compile(html);
    const merged = template(data || {});

    res.json({
      success: true,
      html: merged,
      hasPlaceholders,
      placeholders,
      message: hasPlaceholders
        ? `Template has ${placeholders.length} placeholder(s) that were replaced with employee data.`
        : 'This template has no placeholders. The document is displayed as-is. Employee data is shown for reference.'
    });
  } catch (err) {
    console.error('hr-documents preview error', err);
    res.status(500).json({ success: false, error: 'Preview generation failed' });
  }
});

// --- Template upload and fetch by type ---
const baseTemplateTypeDir = process.env.K_SERVICE ? '/tmp' : path.join(process.cwd(), 'backend');
const templateTypeDir = path.join(baseTemplateTypeDir, 'uploads', 'hr-templates');
fs.ensureDirSync(templateTypeDir);

const typeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, templateTypeDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.body.templateType}${ext}`);
  }
});
const typeUpload = multer({ storage: typeStorage });

// Upload HR template by type
router.post('/template/upload', typeUpload.single('template'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  res.json({ success: true, filename: req.file.filename });
});

// Get HR template by type
router.get('/template/:type', (req, res) => {
  const type = req.params.type;
  const files = fs.readdirSync(templateTypeDir);
  const file = files.find(f => f.startsWith(type));
  if (!file) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }
  res.sendFile(path.join(templateTypeDir, file));
});

router.get('/document-types', (req, res) => {
  res.json({
    success: true, documentTypes: [
      { id: 'payslip', name: 'Employee Payslip' },
      { id: 'experience_letter', name: 'Experience Letter' },
      { id: 'offer_letter', name: 'Offer Letter' },
    ]
  });
});

router.get('/formats', (req, res) => {
  res.json({ success: true, formats: ['docx', 'pdf', 'html'] });
});

// Generate PDF from merged HTML using Puppeteer for proper rendering
router.post('/generate/pdf', express.json(), async (req, res) => {
  let browser = null;
  try {
    const { templateId, data } = req.body;
    if (!templateId) return res.status(400).json({ success: false, error: 'templateId is required' });

    const templatePath = path.join(uploadsDir, templateId);
    if (!await fs.pathExists(templatePath)) return res.status(404).json({ success: false, error: 'Template not found' });

    const ext = path.extname(templatePath).toLowerCase();
    let html = '';
    if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.convertToHtml({ path: templatePath });
      html = result.value || '';
    } else {
      const txt = await fs.readFile(templatePath, 'utf8');
      html = `<pre>${escapeHtml(txt)}</pre>`;
    }

    // Replace bracket-style placeholders [Employee name], [Date of joining], etc.
    const bracketMappings = {
      'Employee name': data?.employee_name || '',
      'Employee Name': data?.employee_name || '',
      'employee name': data?.employee_name || '',
      'EMPLOYEE NAME': data?.employee_name || '',
      'Employee ID': data?.employee_id || '',
      'employee id': data?.employee_id || '',
      'Designation': data?.designation || '',
      'designation': data?.designation || '',
      'Position': data?.designation || '',
      'Department': data?.department || '',
      'department': data?.department || '',
      'Date of joining': data?.date_of_joining || '',
      'Date of Joining': data?.date_of_joining || '',
      'Joining Date': data?.date_of_joining || '',
      'Start Date': data?.date_of_joining || '',
      'Date of Ending': data?.date_of_leaving || '',
      'Date of leaving': data?.date_of_leaving || '',
      'Date of Leaving': data?.date_of_leaving || '',
      'End Date': data?.date_of_leaving || '',
      'Leaving Date': data?.date_of_leaving || '',
      'Salary': data?.salary || '',
      'salary': data?.salary || '',
      'Address': data?.address || '',
      'address': data?.address || '',
      'Email': data?.email || '',
      'email': data?.email || '',
      'Phone': data?.phone || '',
      'phone': data?.phone || '',
      'Manager Name': data?.manager_name || '',
      'manager name': data?.manager_name || '',
      'Company Name': data?.company_name || '',
      'company name': data?.company_name || '',
    };

    // Replace all bracket placeholders
    Object.entries(bracketMappings).forEach(([placeholder, value]) => {
      if (value) {
        const regex = new RegExp(`\\[${placeholder}\\]`, 'gi');
        html = html.replace(regex, value);
      }
    });

    // Also compile with Handlebars for {{}} style placeholders
    const tpl = handlebars.compile(html);
    const merged = tpl(data || {});

    // Wrap in full HTML document with styling matching the preview exactly
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6; /* Adjusted for better readability */
      text-align: justify; /* Ensure text alignment */
      margin: 0;
      padding: 10mm; /* Added padding for consistent layout */
    }
    p {
      margin: 0 0 10pt 0; /* Adjust paragraph spacing */
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
    }
    td, th {
      border: 1px solid #000;
      padding: 8pt;
      text-align: left;
    }
    h1, h2, h3 {
      text-align: center; /* Center-align headings */
      margin: 10pt 0;
    }
    strong, b {
      font-weight: bold;
    }
    em, i {
      font-style: italic;
    }
    u {
      text-decoration: underline;
    }
    /* Preserve document structure */
    .docx-wrapper, section {
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
  </style>
</head>
<body>
${merged}
</body>
</html>`;

    // Launch Puppeteer and generate PDF
    console.log('[hr-documents] Launching puppeteer for PDF generation...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('[hr-documents] Generating PDF buffer...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    browser = null;

    console.log('[hr-documents] PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Generate a meaningful filename using employee data from the merged content
    // Extract employee name from the data used in template replacement
    const employeeName = (data?.employee_name || data?.name || data?.employeeName || 'Employee')
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length

    const documentType = (data?.document_type || data?.documentType || 'Document')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);

    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${employeeName}_${documentType}_${timestamp}.pdf`;

    console.log('[hr-documents] Generated filename:', filename);
    console.log('[hr-documents] Employee data used:', { employeeName: data?.employee_name, documentType: data?.document_type });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('hr-documents pdf error', err);
    if (browser) {
      try { await browser.close(); } catch (e) { }
    }
    if (!res.headersSent) res.status(500).json({ success: false, error: 'PDF generation failed' });
  }
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

// Generate DOCX from template and data (returns merged DOCX file)
router.post('/generate/docx', express.json(), async (req, res) => {
  try {
    const { templateId, data } = req.body;
    if (!templateId) return res.status(400).json({ success: false, error: 'templateId is required' });

    const templatePath = path.join(uploadsDir, templateId);
    if (!await fs.pathExists(templatePath)) return res.status(404).json({ success: false, error: 'Template not found' });

    const ext = path.extname(templatePath).toLowerCase();
    if (ext !== '.docx') {
      return res.status(400).json({ success: false, error: 'Only DOCX templates are supported for DOCX download' });
    }

    // Read the DOCX file as a buffer
    let docxBuffer = await fs.readFile(templatePath);

    // Use docxtemplater to merge data into the DOCX
    const PizZip = (await import('pizzip')).default;
    const Docxtemplater = (await import('docxtemplater')).default;
    const zip = new PizZip(docxBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.setData(data || {});
    try {
      doc.render();
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to merge DOCX: ' + error.message });
    }
    const mergedBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${(templateId || 'document').replace(/\.[^.]+$/, '')}_merged.docx"`);
    res.send(mergedBuffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate DOCX' });
  }
});

export default router;

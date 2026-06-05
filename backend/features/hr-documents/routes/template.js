import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Directory for HR templates
const templateDir = path.join(process.cwd(), 'backend', 'uploads', 'hr-templates');
fs.mkdirSync(templateDir, { recursive: true });

// Multer config for HR templates
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, templateDir),
  filename: (req, file, cb) => {
    // Save as <templateType>.<ext> (e.g., payslip.docx)
    const ext = path.extname(file.originalname);
    cb(null, `${req.body.templateType}${ext}`);
  }
});
const upload = multer({ storage });

// Upload HR template
router.post('/hr-documents/upload-template', upload.single('template'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  res.json({ success: true, filename: req.file.filename });
});

// Get HR template by type
router.get('/hr-documents/template/:type', (req, res) => {
  const type = req.params.type;
  const files = fs.readdirSync(templateDir);
  const file = files.find(f => f.startsWith(type));
  if (!file) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }
  res.sendFile(path.join(templateDir, file));
});

export default router;

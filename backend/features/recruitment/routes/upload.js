import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as recruitmentModel from '../models/recruitment.model.js';

const router = express.Router();

// Configure multer for uploads
const baseDir = process.env.K_SERVICE ? '/tmp' : path.join(process.cwd(), 'backend');
const uploadDir = path.join(baseDir, 'uploads', 'verification');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.params.candidateId}_${req.params.verificationId}_${uniqueSuffix}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// POST /recruitment/:candidateId/verification/:verificationId/upload
router.post('/recruitment/:candidateId/verification/:verificationId/upload', upload.array('documents', 5), async (req, res) => {
  try {
    const { candidateId, verificationId } = req.params;
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    // Build file URLs
    const fileUrls = files.map(f => `/uploads/verification/${f.filename}`);
    // Update verification record
    await recruitmentModel.updateVerification(candidateId, verificationId, { documents: fileUrls });
    res.json({ success: true, files: fileUrls });
  } catch (error) {
    console.error('Error uploading verification documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

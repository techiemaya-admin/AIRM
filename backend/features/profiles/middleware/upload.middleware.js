/**
 * File Upload Middleware
 * Handles multipart/form-data file uploads using multer
 */

import multer from 'multer';

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf', // PDF
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv', // .csv
    'application/csv',
    'text/plain', // .txt
    'image/png', // .png
    'image/jpeg', // .jpg, .jpeg
    'image/gif', // .gif
    'image/webp', // .webp
    'image/bmp' // .bmp
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: PDF, Word, Excel, Text, Images. Received: ${file.mimetype}`), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Single file upload middleware
export const uploadSingle = upload.single('file');

// Multiple files upload middleware
export const uploadMultiple = upload.array('files', 10); // Max 10 files


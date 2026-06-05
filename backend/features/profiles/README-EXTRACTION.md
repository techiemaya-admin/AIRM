# HR Profile Extraction Engine

## Overview

The HR Profile Extraction Engine automatically extracts employee profile details from various file formats (PDF, Word, Excel, Text) using Google Gemini AI and maps them to canonical fields.

## Features

- **Multi-format Support**: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), and Text files
- **AI-Powered Extraction**: Uses Google Gemini AI for intelligent field extraction
- **Semantic Mapping**: Matches fields by meaning, not exact labels
- **Canonical Field Mapping**: Maps to standardized profile fields
- **Batch Processing**: Extract profiles from multiple files at once

## API Endpoints

### 1. Extract Profile (Single File)
```
POST /api/profiles/extract
Content-Type: multipart/form-data

Body:
  file: <file>
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "Employee_ID": "EMP001",
    "Full_Name": "John Doe",
    "Official_Email": "john.doe@company.com",
    ...
  },
  "filename": "resume.pdf"
}
```

### 2. Extract Profiles (Batch)
```
POST /api/profiles/extract/batch
Content-Type: multipart/form-data

Body:
  files: <file1>, <file2>, ...
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "filename": "resume1.pdf",
      "profile": {...},
      "success": true
    },
    {
      "filename": "resume2.docx",
      "error": "Error message",
      "success": false
    }
  ],
  "total": 2,
  "successful": 1,
  "failed": 1
}
```

### 3. Extract and Save Profile
```
POST /api/profiles/extract-and-save
Content-Type: multipart/form-data

Body:
  file: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile extracted and saved successfully",
  "profile_id": "user-uuid",
  "extracted_profile": {...}
}
```

## Canonical Fields

The extraction engine maps to these canonical fields:

- `Employee_ID` - Company employee ID
- `Full_Name` - Full name of employee
- `Official_Email` - Official work email
- `Phone_Number` - Contact phone number
- `Date_of_Joining` - Date in YYYY-MM-DD format
- `Department` - Department name
- `Role` - Job title/role
- `Employment_Type` - Full-time, Contract, Intern, etc.
- `Total_Experience_Years` - Numeric value (decimal allowed)
- `Skills` - Array of skills
- `Certifications` - Array of certifications
- `Past_Projects` - Array of past project names
- `Current_Project` - Current project name
- `Manager_Name` - Reporting manager name
- `Manager_Email` - Manager email
- `Location` - Work location
- `Notes` - Any additional notes

## Setup

### 1. Install Dependencies

```bash
npm install
```

Required packages:
- `@google/generative-ai` - Google Gemini AI
- `multer` - File upload handling
- `pdf-parse` - PDF parsing
- `mammoth` - Word document parsing
- `xlsx` - Excel file parsing

### 2. Configure Environment Variables

Add to your `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

### 3. File Size Limits

- Maximum file size: 10MB
- Maximum batch files: 10 files per request

## Usage Examples

### cURL Example

```bash
# Extract profile from single file
curl -X POST http://localhost:3001/api/profiles/extract \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"

# Extract and save profile
curl -X POST http://localhost:3001/api/profiles/extract-and-save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"
```

### JavaScript/TypeScript Example

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/profiles/extract', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result.profile);
```

## How It Works

1. **File Upload**: File is received via multipart/form-data
2. **File Parsing**: Content is extracted based on file type:
   - PDF → `pdf-parse`
   - Word → `mammoth`
   - Excel → `xlsx`
   - Text → Direct read
3. **AI Extraction**: Text content is sent to Gemini AI with extraction prompt
4. **Field Mapping**: Extracted data is mapped to canonical fields
5. **Normalization**: Dates, numbers, and strings are normalized
6. **Response**: Clean JSON is returned

## Error Handling

The engine handles:
- Invalid file types
- File parsing errors
- AI extraction failures
- Missing or invalid data
- Network errors

All errors are returned with descriptive messages.

## Notes

- The AI extraction uses semantic matching, so it can understand variations in field names
- Missing values are set to `null` or empty arrays
- Dates are normalized to YYYY-MM-DD format
- Numbers are parsed and validated
- Skills and certifications can be comma-separated strings or arrays


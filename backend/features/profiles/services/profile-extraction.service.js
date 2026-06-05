/**
 * Profile Extraction Service
 * Extracts employee profile details from various file formats using AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fileParser from './file-parser.service.js';
import * as fieldMapper from './field-mapper.service.js';

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBwu8RXgNC0pafKB9KCU27J7podB4jydcQ';
if (!GEMINI_API_KEY) {
  console.warn('[profile-extraction] WARNING: GEMINI_API_KEY not set. Profile extraction will fail.');
}
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Extract profile from file
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} Extracted profile data
 */
export async function extractProfileFromFile(fileBuffer, mimeType, filename) {
  try {
    console.log('[profile-extraction] Starting extraction for:', filename);
    console.log('[profile-extraction] MIME type:', mimeType);
    console.log('[profile-extraction] Buffer size:', fileBuffer?.length);

    // Step 1: Parse file content based on type
    let textContent = '';

    if (mimeType === 'application/pdf') {
      textContent = await fileParser.parsePDF(fileBuffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') {
      textContent = await fileParser.parseWord(fileBuffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel') {
      textContent = await fileParser.parseExcel(fileBuffer);
    } else if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'application/csv') {
      textContent = await fileParser.parseText(fileBuffer);
    } else if (mimeType?.startsWith('image/')) {
      // Use OCR for image files
      console.log('[profile-extraction] Using OCR for image file');
      textContent = await fileParser.parseImage(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Supported types: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Text (.txt, .csv), Images (.png, .jpg)`);
    }

    console.log('[profile-extraction] Extracted text length:', textContent?.length);
    console.log('[profile-extraction] First 200 chars:', textContent?.substring(0, 200));

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No content extracted from file. The document may be empty, scanned/image-based, or password-protected. Please ensure the document contains selectable text.');
    }

    // Step 2: Use Gemini AI to extract structured data
    const extractedData = await extractWithGemini(textContent);

    // Step 3: Map to canonical fields
    const mappedProfile = fieldMapper.mapToCanonicalFields(extractedData);

    return mappedProfile;
  } catch (error) {
    console.error('[profile-extraction] Error extracting profile:', error);
    throw new Error(`Failed to extract profile: ${error.message}`);
  }
}

/**
 * Extract profile data using Gemini AI
 * @param {string} textContent - Extracted text content
 * @returns {Promise<Object>} Extracted profile data
 */
async function extractWithGemini(textContent) {
  try {
    // If Gemini/AI is not configured we'll fall back to a simple heuristic parser
    // that looks for common labeled fields in the text content. This helps
    // when running locally without the external AI key and provides reasonable
    // extraction for simple profile documents.
    const heuristicallyExtract = (text) => {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const joined = lines.join('\n');

      const find = (keys) => {
        for (const k of keys) {
          const regex = new RegExp(`${k}[:\\-]\\s*(.+)`, 'i');
          const m = joined.match(regex);
          if (m && m[1]) return m[1].trim();
        }
        return null;
      };

      const extractEmail = () => {
        const m = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return m ? m[0].toLowerCase() : null;
      };

      const extractPhone = () => {
        const m = joined.match(/(\+?\d[\d\-() ]{6,}\d)/);
        return m ? m[0].replace(/\s+/g, ' ').trim() : null;
      };

      const skillsRaw = find(['Skills', 'Skillset', 'Technical Skills', 'Skills (comma-separated)']);
      const skills = skillsRaw ? skillsRaw.split(/[;,|]/).map(s => s.trim()).filter(Boolean) : [];

      const managerRaw = find(['Manager', 'Reporting Manager', 'Manager Name']);
      let managerName = null;
      let managerEmail = null;
      if (managerRaw) {
        // manager may include email in parentheses
        const m = managerRaw.match(/(.+?)\s*\(?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})?\)?/i);
        if (m) {
          managerName = m[1] ? m[1].trim() : null;
          managerEmail = m[2] ? m[2].toLowerCase() : null;
        }
      }

      const experienceRaw = find(['Experience', 'Experience (Years)', 'Total Experience', 'Experience Years']);
      let experience = null;
      if (experienceRaw) {
        const m = experienceRaw.match(/(\d+(?:\.\d+)?)/);
        if (m) experience = parseFloat(m[1]);
      }

      return {
        Employee_ID: find(['Employee ID', 'Employee_ID', 'Employee Id']) || null,
        Full_Name: find(['Name', 'Full Name', 'Full_Name']) || find(['Employee Name']) || null,
        Official_Email: extractEmail(),
        Phone_Number: extractPhone(),
        Date_of_Joining: find(['Date of Joining', 'Join Date', 'Date_of_Joining']) || null,
        Department: find(['Department']) || null,
        Role: find(['Role', 'Job Title', 'Designation']) || null,
        Employment_Type: find(['Employment Type']) || 'Full-time',
        Total_Experience_Years: experience,
        Skills: skills,
        Certifications: [],
        Past_Projects: [],
        Current_Project: find(['Current Project']) || null,
        Manager_Name: managerName,
        Manager_Email: managerEmail,
        Location: find(['Location']) || null,
        Notes: lines.slice(0, 20).join(' ')
      };
    };

    // Try using Gemini if available; otherwise use heuristic extraction
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
          Extract the following employee profile details from the provided content. 
          If any information is not present, return null for that field.
          Return only a JSON object with the following fields:

          {
            "Employee_ID": "string or null",
            "Full_Name": "string or null",
            "Official_Email": "string or null",
            "Phone_Number": "string or null",
            "Date_of_Joining": "string (YYYY-MM-DD) or null",
            "Department": "string or null",
            "Role": "string or null",
            "Employment_Type": "string or null",
            "Total_Experience_Years": "number or null",
            "Skills": "array of strings or null",
            "Certifications": "array of strings or null",
            "Past_Projects": "array of strings or null",
            "Current_Project": "string or null",
            "Manager_Name": "string or null",
            "Manager_Email": "string or null",
            "Location": "string or null",
            "Notes": "string or null"
          }

          Content to extract from:\n${textContent.substring(0, 3800)}\n`;

        const result = await model.generateContent({ prompt });
        const response = await result.response;
        const text = response.text();

        // Try to extract JSON object from the model output
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
          } catch (e) {
            console.warn('[profile-extraction] Failed to parse JSON from Gemini response, falling back to heuristic', e);
            return heuristicallyExtract(textContent);
          }
        } else {
          console.warn('[profile-extraction] No JSON found in Gemini response, falling back to heuristic');
          return heuristicallyExtract(textContent);
        }
      } catch (e) {
        console.warn('[profile-extraction] Gemini extraction failed, using heuristic parser', e);
        return heuristicallyExtract(textContent);
      }
    }

    // No AI key - use heuristic parser to extract common fields
    return heuristicallyExtract(textContent);
  } catch (error) {
    console.error('[profile-extraction] Mock extraction error:', error);
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

/**
 * Extract profiles from multiple files
 * @param {Array} files - Array of file objects {buffer, mimeType, filename}
 * @returns {Promise<Array>} Array of extracted profiles
 */
export async function extractProfilesFromFiles(files) {
  const results = [];

  for (const file of files) {
    try {
      const profile = await extractProfileFromFile(
        file.buffer,
        file.mimeType,
        file.filename
      );
      results.push({
        filename: file.filename,
        profile,
        success: true
      });
    } catch (error) {
      results.push({
        filename: file.filename,
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

/**
 * Parse batch profiles from Excel/CSV file
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} filename - Original filename
 * @returns {Promise<Array>} Array of profile objects
 */
export async function parseBatchProfilesFile(fileBuffer, mimeType, filename) {
  try {
    // Use the file parser service to parse the batch file
    const profiles = await fileParser.parseBatchProfilesFile(fileBuffer, filename);

    // Validate and clean the extracted profiles
    return profiles.map(profile => {
      // Clean up and normalize base values, but keep all other fields
      return {
        ...profile, // Keep Address, Bank_Details, Family_Details, _raw, etc.
        Employee_ID: profile.Employee_ID ? String(profile.Employee_ID).trim() : null,
        Full_Name: profile.Full_Name ? String(profile.Full_Name).trim() : null,
        Official_Email: profile.Official_Email ? String(profile.Official_Email).trim().toLowerCase() : null,
        Phone_Number: profile.Phone_Number ? String(profile.Phone_Number).trim() : null,
        Date_of_Joining: profile.Date_of_Joining ? String(profile.Date_of_Joining).trim() : null,
        Department: profile.Department ? String(profile.Department).trim() : null,
        Role: profile.Role ? String(profile.Role).trim() : null,
        Employment_Type: profile.Employment_Type ? String(profile.Employment_Type).trim() : null,
        Total_Experience_Years: profile.Total_Experience_Years ?
          typeof profile.Total_Experience_Years === 'number' ?
            profile.Total_Experience_Years :
            parseFloat(String(profile.Total_Experience_Years)) || null : null,
        Skills: profile.Skills ?
          Array.isArray(profile.Skills) ? profile.Skills :
            String(profile.Skills).split(',').map(s => s.trim()).filter(s => s) : null,
        Certifications: profile.Certifications ?
          Array.isArray(profile.Certifications) ? profile.Certifications :
            String(profile.Certifications).split(',').map(c => c.trim()).filter(c => c) : null,
        Past_Projects: profile.Past_Projects ?
          Array.isArray(profile.Past_Projects) ? profile.Past_Projects :
            String(profile.Past_Projects).split(',').map(p => p.trim()).filter(p => p) : null,
        Current_Project: profile.Current_Project ? String(profile.Current_Project).trim() : null,
        Manager_Name: profile.Manager_Name ? String(profile.Manager_Name).trim() : null,
        Manager_Email: profile.Manager_Email ? String(profile.Manager_Email).trim().toLowerCase() : null,
        Location: profile.Location ? String(profile.Location).trim() : null,
        Notes: profile.Notes ? String(profile.Notes).trim() : null,
      };
    });
  } catch (error) {
    console.error('[profile-extraction] Error parsing batch profiles:', error);
    throw new Error(`Failed to parse batch profiles: ${error.message}`);
  }
}


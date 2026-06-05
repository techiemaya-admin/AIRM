/**
 * File Parser Service
 * Parses different file formats to extract text content
 */

import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import Tesseract from 'tesseract.js';

/**
 * Parse PDF file
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text content
 */
export async function parsePDF(buffer) {
  try {
    console.log('[file-parser] Parsing PDF, buffer size:', buffer?.length);
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer received');
    }
    const data = await pdf(buffer);
    console.log('[file-parser] PDF parsed, text length:', data.text?.length);
    return data.text || '';
  } catch (error) {
    console.error('[file-parser] PDF parsing error:', error);
    // Return empty string instead of throwing to allow fallback
    return '';
  }
}

/**
 * Parse Word document
 * @param {Buffer} buffer - Word file buffer
 * @returns {Promise<string>} Extracted text content
 */
export async function parseWord(buffer) {
  try {
    console.log('[file-parser] Parsing Word document, buffer size:', buffer?.length);
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer received');
    }

    // Try extracting as HTML first (better for complex docs)
    let result;
    try {
      result = await mammoth.convertToHtml({ buffer });
      // Strip HTML tags to get plain text
      const htmlText = result.value;
      const plainText = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('[file-parser] Word parsed via HTML, text length:', plainText?.length);
      if (plainText && plainText.length > 10) {
        return plainText;
      }
    } catch (htmlError) {
      console.log('[file-parser] HTML extraction failed, trying raw text');
    }

    // Fallback to raw text extraction
    result = await mammoth.extractRawText({ buffer });
    console.log('[file-parser] Word parsed, text length:', result.value?.length);
    return result.value || '';
  } catch (error) {
    console.error('[file-parser] Word parsing error:', error);
    return '';
  }
}

/**
 * Parse Excel file
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Promise<string>} Extracted text content
 */
export async function parseExcel(buffer) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    let textContent = '';

    // Iterate through all sheets
    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        const rowValues = [];
        row.eachCell((cell) => {
          rowValues.push(cell.value);
        });
        textContent += rowValues.join(' | ') + '\n';
      });
      textContent += '\n';
    });

    return textContent;
  } catch (error) {
    console.error('[file-parser] Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Parse text file
 * @param {Buffer} buffer - Text file buffer
 * @returns {Promise<string>} Extracted text content
 */
export async function parseText(buffer) {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('[file-parser] Text parsing error:', error);
    throw new Error(`Failed to parse text file: ${error.message}`);
  }
}

/**
 * Parse image file using OCR
 * @param {Buffer} buffer - Image file buffer
 * @returns {Promise<string>} Extracted text content
 */
export async function parseImage(buffer) {
  try {
    console.log('[file-parser] Starting OCR on image, buffer size:', buffer?.length);
    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`[file-parser] OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    console.log('[file-parser] OCR completed, confidence:', result.data.confidence);
    console.log('[file-parser] OCR text length:', result.data.text?.length);
    return result.data.text || '';
  } catch (error) {
    console.error('[file-parser] OCR parsing error:', error);
    return '';
  }
}

/**
 * Parse Excel/CSV file for batch profile upload
 * @param {Buffer} buffer - Excel file buffer
 * @param {string} originalname - Original filename
 * @returns {Promise<Array>} Array of profile objects
 */
export async function parseBatchProfilesFile(buffer, originalname) {
  try {
    // Determine if it's CSV or Excel
    const isCSV = originalname.toLowerCase().endsWith('.csv');

    if (isCSV) {
      // For CSV, we'll use a simple parser
      const csvContent = buffer.toString('utf-8');
      return parseCSVContent(csvContent);
    } else {
      // For Excel files
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      // Get the first sheet robustly (try first worksheet, then fallback)
      let worksheet = null;
      if (workbook.worksheets && workbook.worksheets.length > 0) {
        worksheet = workbook.worksheets[0];
      } else {
        worksheet = workbook.getWorksheet(1);
      }

      if (!worksheet) {
        throw new Error('No worksheets found in the Excel file');
      }

      // Get headers from the first row and normalize them
      const headerRow = worksheet.getRow(1);
      const headers = [];

      const normalizeHeader = (h) => {
        if (h === null || h === undefined) return '';
        if (typeof h === 'object') {
          if (h.text) return String(h.text).trim();
          if (h.richText && Array.isArray(h.richText)) return h.richText.map(r => r.text || '').join('').trim();
          return String(h).trim();
        }
        return String(h).trim();
      };

      // Collect headers up to the last used column
      const lastCol = headerRow.cellCount || Math.max(...worksheet._rows.map(r => (r ? r.cellCount : 0)), 0);
      for (let i = 1; i <= lastCol; i++) {
        const cell = headerRow.getCell(i);
        const raw = cell && cell.value ? cell.value : '';
        const text = normalizeHeader(raw);
        headers.push(text);
      }

      console.log('[file-parser] Detected headers:', JSON.stringify(headers));

      // Process data rows
      const jsonData = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const rowObject = {};
        let hasData = false;

        // Iterate through header length to keep columns aligned
        for (let colNumber = 1; colNumber <= headers.length; colNumber++) {
          const header = headers[colNumber - 1];
          if (!header) continue; // skip empty header cells

          const cell = row.getCell(colNumber);
          let value = cell ? cell.value : null;

          // Convert Excel date objects to strings
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          } else if (value && typeof value === 'object' && value.text) {
            value = value.text;
          }

          // Assign both original header and a normalized key to make mapping tolerant
          rowObject[header] = value;
          const normalizedKey = String(header).trim().replace(/\s+/g, '_').replace(/[^\w_]/g, '').toLowerCase();
          if (normalizedKey) rowObject[normalizedKey] = value;

          if (value !== null && value !== undefined && value !== '') {
            hasData = true;
          }
        }

        // Only add rows that have at least some data
        if (hasData) {
          jsonData.push(rowObject);
        }
      });

      console.log('[file-parser] Parsed json rows count:', jsonData.length);
      if (jsonData.length > 0) console.log('[file-parser] Sample parsed row:', JSON.stringify(jsonData[0]));

      // Transform the data to match expected format and filter out invalid rows
      return jsonData
        .map(row => {
          // Helper function to format Excel dates
          const formatDate = (value) => {
            if (!value) return null;
            if (value instanceof Date) {
              return value.toISOString().split('T')[0];
            }
            if (typeof value === 'number') {
              // Excel date serial number
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
              return date.toISOString().split('T')[0];
            }
            if (typeof value === 'string') {
              // Try to parse various date formats
              const trimmed = value.trim();
              // DD-MM-YYYY or DD/MM/YYYY
              const ddmmyyyy = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
              if (ddmmyyyy) {
                const [, day, month, year] = ddmmyyyy;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              // YYYY-MM-DD
              if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                return trimmed;
              }
              // Try standard Date parsing
              const date = new Date(trimmed);
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            }
            return value;
          };

          // Helper to get value from multiple possible headers
          const getVal = (keys) => {
            if (!Array.isArray(keys)) keys = [keys];
            // 1. Exact match
            for (const k of keys) {
              if (row[k] !== undefined && row[k] !== null) return row[k];
            }
            // 2. Normalized match (lowercase, no spaces, no special chars)
            const rowKeys = Object.keys(row);
            for (const k of keys) {
              const normK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const rk of rowKeys) {
                const normRK = String(rk).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normK === normRK) return row[rk];
              }
            }
            return null;
          };

          const familyDetails = [];
          for (let i = 1; i <= 4; i++) {
            const name = getVal([`Name ${i}`, `Name${i}`]);
            if (name) {
              familyDetails.push({
                name: name,
                relation: getVal([`Relation${i > 1 ? i - 1 : ''}`, `Relation ${i}`]) || (i === 1 ? getVal(['Relation']) : null),
                occupation: getVal([`Occupation${i > 1 ? i - 1 : ''}`, `Occupation ${i}`]) || (i === 1 ? getVal(['Occupation']) : null),
                age: getVal([`Age${i > 1 ? i - 1 : ''}`, `Age ${i}`]) || (i === 1 ? getVal(['Age']) : null),
                contact: getVal([`Contact${i > 1 ? i - 1 : ''}`, `Contact ${i}`]) || (i === 1 ? getVal(['Contact']) : null)
              });
            }
          }

          const educationDetails = [];
          for (let i = 1; i <= 3; i++) {
            const qualification = getVal([`Qualification ${i}`, `Qualification${i}`]);
            if (qualification) {
              educationDetails.push({
                degree: qualification,
                college: getVal([`College Name${i > 1 ? i - 1 : ''}`, `College name ${i}`]) || (i === 1 ? getVal(['College name']) : null),
                passout_year: getVal([`Passout year${i > 1 ? i - 1 : ''}`, `Passout Year ${i}`]) || (i === 1 ? getVal(['Passout year']) : null),
                grade: getVal([`Grade / percentage${i > 1 ? i - 1 : ''}`, `Grade / Percentage ${i}`]) || (i === 1 ? getVal(['Grade / percentage']) : null)
              });
            }
          }

          const mapped = {
            Employee_ID: getVal(['Employee ID', 'Id', 'ID', 'Emp ID', 'Emp_ID', 'Employee Code']),
            Full_Name: getVal(['Full Name', 'Name', 'Employee Name', 'Emp Name']),
            Official_Email: getVal(['Email', 'Official Email', 'Email Address', 'Email ID', 'Mail', 'Mail ID', 'Official Mail', 'Work Email']),
            Personal_Email: getVal(['Personal Mail ID', 'Personal Email', 'Personal Mail']),
            Phone_Number: getVal(['Mobile No', 'Phone', 'Contact', 'Mobile', 'Cell', 'Phone Number', 'Contact Number']),
            Date_of_Joining: formatDate(getVal(['Joining Date (DD/MM/YY)', 'Joining Date', 'Date of Joining', 'DOJ', 'Join Date'])),
            Department: getVal(['Department', 'Department/Branch', 'Branch', 'Dept']),
            Role: getVal(['Designation', 'Role', 'Job Title', 'Position']),
            Employment_Type: getVal(['Employment Type', 'Emp Type', 'Type']),
            Gender: getVal(['Gender']),

            // Personal Details
            Personal_Details: {
              dob: formatDate(getVal(['DOB (DD/MM/YY)', 'DOB'])),
              pan: getVal(['PAN']),
              aadhaar: getVal(['Adhar No', 'Aadhaar']),
              marital_status: getVal(['Marital Status']),
              languages: getVal(['Language Known', 'Languages']),
              blood_group: getVal(['Blood Group']),
              uan: getVal(['UAN No (if applicable previously)', 'UAN']),
              emergency_contact: getVal(['Emergency contact no (name & relation of contact person)', 'Emergency Contact'])
            },

            // Address
            Address: {
              current: getVal(['Current Address']),
              permanent: getVal(['Permanent Address'])
            },

            // Bank Details
            Bank_Details: {
              bank_name: getVal(['Bank Name']),
              account_number: getVal(['Account Number']),
              ifsc: getVal(['IFSC']),
              branch: getVal(['Bank Branch'])
            },

            Family_Details: familyDetails,
            Education_Details: educationDetails,

            // Previous Employment
            Previous_Employment: {
              company: getVal(['Previous Employer Name']),
              designation: getVal(['Designation1', 'Previous Designation']),
              period: getVal(['Period of work (from - to)']),
              reason_leaving: getVal(['Reason of leaving']),
              manager_contact: getVal(['Reporting Manager Contact & Email'])
            },

            // Document Status
            Documents_Submitted: {
              current_address_proof: getVal(['Current Address Proof']),
              permanent_address_proof: getVal(['Permanent Address Proof']),
              pan_card: getVal(['PAN1']),
              bank_proof: getVal(['Bank Account Details / Cancelled Cheque / Passbook']),
              ssc_certificate: getVal(['SSC / 10th - passing certificate']),
              hsc_certificate: getVal(['HSC / 12th - Passing certificate']),
              graduation_certificate: getVal(['Graduation Certificate']),
              post_graduation: getVal(['Post Graduation']),
              experience_letter: getVal(['Previous \nEmployment Experience Letter', 'Experience Letter']),
              offer_letter: getVal(['Previous Employment Offer Letter']),
              salary_slip: getVal(['Previous Employment Salary Slip']),
              resume: getVal(['Updated Resume']),
              photo: getVal(['Passport size photo'])
            },

            Total_Experience_Years: null,
            Skills: getVal(['Language Known']) ? [getVal(['Language Known'])] : [],
            Certifications: [],
            Past_Projects: [],
            Manager_Name: getVal(['Reporting Manager', 'Manager', 'Supervisor']),
            Notes: null,
            _raw: row
          };

          return mapped;
        })
        .filter(row => {
          // Filter out rows that don't have at least an email or name
          // Also filter out the sample row if it contains "Sample" in Notes
          const hasEmail = row.Official_Email && String(row.Official_Email).trim() !== '';
          const hasName = row.Full_Name && String(row.Full_Name).trim() !== '';
          // Treat a row as a sample only if 'sample' appears in notes AND the row lacks name/email
          const isSample = row.Notes && String(row.Notes).toLowerCase().includes('sample') && !(hasEmail || hasName);

          return (hasEmail || hasName) && !isSample;
        });
    }
  } catch (error) {
    console.error('[file-parser] Batch profile parsing error:', error);
    throw new Error(`Failed to parse batch profiles file: ${error.message}`);
  }
}

/**
 * Parse CSV content
 * @param {string} csvContent - CSV string content
 * @returns {Array} Array of profile objects
 */
function parseCSVContent(csvContent) {
  const lines = csvContent.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least one header row and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    const row = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || null;
    }

    // Map to canonical fields
    results.push({
      Employee_ID: row['Employee_ID'] || row['employee_id'] || row['Employee ID'] || row['employee id'] || row['Name'] || row['name'] || null,
      Full_Name: row['Full_Name'] || row['full_name'] || row['Full Name'] || row['full name'] || row['Name'] || row['name'] || null,
      Official_Email: row['Official_Email'] || row['official_email'] || row['Email'] || row['email'] || row['Official Email'] || row['official email'] || null,
      Phone_Number: row['Phone_Number'] || row['phone_number'] || row['Phone'] || row['phone'] || row['Phone Number'] || row['phone number'] || null,
      Date_of_Joining: row['Date_of_Joining'] || row['date_of_joining'] || row['Join Date'] || row['join_date'] || row['Date of Joining'] || row['date of joining'] || null,
      Department: row['Department'] || row['department'] || null,
      Role: row['Role'] || row['role'] || row['Job Title'] || row['job_title'] || row['Job_Title'] || null,
      Employment_Type: row['Employment_Type'] || row['employment_type'] || row['Employment Type'] || row['employment type'] || null,
      Total_Experience_Years: row['Total_Experience_Years'] || row['total_experience_years'] || row['Experience Years'] || row['experience_years'] || row['Total Experience Years'] || row['total experience years'] || null,
      Skills: row['Skills'] || row['skills'] || null,
      Certifications: row['Certifications'] || row['certifications'] || null,
      Past_Projects: row['Past_Projects'] || row['past_projects'] || row['Past Projects'] || row['past projects'] || null,
      Current_Project: row['Current_Project'] || row['current_project'] || row['Current Project'] || row['current project'] || null,
      Manager_Name: row['Manager_Name'] || row['manager_name'] || row['Manager Name'] || row['manager name'] || null,
      Manager_Email: row['Manager_Email'] || row['manager_email'] || row['Manager Email'] || row['manager email'] || null,
      Location: row['Location'] || row['location'] || null,
      Notes: row['Notes'] || row['notes'] || null,
    });
  }

  return results;
}

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line to parse
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}


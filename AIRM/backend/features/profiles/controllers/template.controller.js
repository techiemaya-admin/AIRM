/**
 * Template Controller
 * Handles template download requests
 */

import ExcelJS from 'exceljs';

// Helper to style a header row
function styleHeaderRow(row, color = 'FF4472C4') {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 52;
}

// Helper to create a worksheet with headers
function createSheet(workbook, sheetName, headers, color) {
  const ws = workbook.addWorksheet(sheetName);
  ws.columns = headers.map(h => ({ header: h.label, key: h.key, width: h.width || 22 }));
  styleHeaderRow(ws.getRow(1), color);
  // Add an empty example row so user knows how many rows to fill
  ws.addRow({});
  return ws;
}

/**
 * Download employee joining form template
 * GET /api/profiles/template/download
 */
export async function downloadTemplate(req, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AIRM System';
    workbook.created = new Date();

    // ── Sheet 1: Employee Info ─────────────────────────────
    createSheet(workbook, '1. Employee Info', [
      { key: 'full_name', label: 'Full Name *', width: 25 },
      { key: 'email', label: 'Official Email *', width: 30 },
      { key: 'personal_email', label: 'Personal Email', width: 30 },
      { key: 'employee_id', label: 'Employee ID', width: 18 },
      { key: 'phone', label: 'Phone Number *', width: 18 },
      { key: 'date_of_birth', label: 'Date of Birth (YYYY-MM-DD)', width: 22 },
      { key: 'gender', label: 'Gender (Male/Female/Other)', width: 22 },
      { key: 'marital_status', label: 'Marital Status', width: 20 },
      { key: 'blood_group', label: 'Blood Group', width: 15 },
      { key: 'designation', label: 'Designation *', width: 22 },
      { key: 'department', label: 'Department *', width: 20 },
      { key: 'join_date', label: 'Date of Joining (YYYY-MM-DD)', width: 24 },
      { key: 'current_address', label: 'Current Address', width: 35 },
      { key: 'permanent_address', label: 'Permanent Address', width: 35 },
      { key: 'languages_known', label: 'Languages Known (comma separated)', width: 30 },
      { key: 'height', label: 'Height (cm)', width: 15 },
      { key: 'weight', label: 'Weight (kg)', width: 15 },
      { key: 'medical_history', label: 'Medical History / Allergies', width: 35 },
      { key: 'bank_name', label: 'Bank Name', width: 22 },
      { key: 'bank_ifsc', label: 'Bank IFSC Code', width: 18 },
      { key: 'bank_branch', label: 'Bank Branch', width: 22 },
      { key: 'bank_account_number', label: 'Bank Account Number', width: 25 },
      { key: 'uan_number', label: 'UAN Number', width: 20 },
      { key: 'pf_number', label: 'PF Number', width: 20 },
    ], 'FF2E75B6');

    // ── Sheet 2: Family Members ────────────────────────────
    createSheet(workbook, '2. Family Members', [
      { key: 'member_type', label: 'Member Type (Spouse/Parent/Child/Sibling/Emergency)', width: 38 },
      { key: 'member_name', label: 'Full Name *', width: 25 },
      { key: 'relation', label: 'Relation', width: 20 },
      { key: 'contact', label: 'Contact Number', width: 20 },
      { key: 'location', label: 'Location / City', width: 25 },
    ], 'FF70AD47');

    // ── Sheet 3: Academic / Educational Info ───────────────
    createSheet(workbook, '3. Academic Info', [
      { key: 'qualification', label: 'Qualification *', width: 25 },
      { key: 'specialization', label: 'Specialization / Stream', width: 28 },
      { key: 'institution_name', label: 'Institution / College Name', width: 35 },
      { key: 'board_university', label: 'Board / University', width: 30 },
      { key: 'passout_year', label: 'Passout Year', width: 15 },
      { key: 'grade_percentage', label: 'Grade / Percentage', width: 20 },
    ], 'FFED7D31');

    // ── Sheet 4: Previous Employment ──────────────────────
    createSheet(workbook, '4. Previous Employment', [
      { key: 'employer_name', label: 'Employer / Company Name *', width: 30 },
      { key: 'designation', label: 'Designation / Role *', width: 25 },
      { key: 'duration_from', label: 'From Date (YYYY-MM-DD)', width: 22 },
      { key: 'duration_to', label: 'To Date (YYYY-MM-DD)', width: 22 },
      { key: 'salary', label: 'Last Drawn Salary', width: 22 },
      { key: 'reason_for_leaving', label: 'Reason for Leaving', width: 30 },
    ], 'FF7030A0');

    // ── Sheet 5: Background Verification ──────────────────
    createSheet(workbook, '5. Verification Info', [
      { key: 'name', label: 'Full Name *', width: 25 },
      { key: 'father_name', label: "Father's Name", width: 25 },
      { key: 'designation', label: 'Designation', width: 22 },
      { key: 'department', label: 'Department', width: 20 },
      { key: 'date_of_birth', label: 'Date of Birth (YYYY-MM-DD)', width: 24 },
      { key: 'gender', label: 'Gender', width: 15 },
      { key: 'pan_number', label: 'PAN Number', width: 18 },
      { key: 'aadhar_number', label: 'Aadhar Number', width: 18 },
      { key: 'present_address', label: 'Present Address', width: 35 },
      { key: 'present_stay_period', label: 'Present Address Stay Period', width: 28 },
      { key: 'present_contact', label: 'Present Contact', width: 20 },
      { key: 'permanent_address', label: 'Permanent Address', width: 35 },
      { key: 'permanent_stay_period', label: 'Permanent Address Stay Period', width: 28 },
      { key: 'permanent_contact', label: 'Permanent Contact', width: 20 },
      // Previous employer verification
      { key: 'employer_name', label: 'Previous Employer Name', width: 28 },
      { key: 'emp_designation', label: 'Employer - Designation', width: 25 },
      { key: 'emp_location', label: 'Employer - Location', width: 25 },
      { key: 'period_of_working', label: 'Period of Working', width: 22 },
      { key: 'reason_for_leaving', label: 'Reason for Leaving', width: 28 },
      { key: 'supervisor_contact', label: 'Supervisor Contact', width: 22 },
      { key: 'hr_mail', label: 'HR Email', width: 28 },
      { key: 'hr_contact', label: 'HR Contact', width: 20 },
    ], 'FFC00000');

    // ── Instructions sheet ─────────────────────────────────
    const infoWs = workbook.addWorksheet('ℹ Instructions');
    infoWs.getColumn(1).width = 80;
    const instructions = [
      ['JOINING FORM - BULK UPLOAD TEMPLATE'],
      [''],
      ['INSTRUCTIONS:'],
      ['1. Fill each sheet for the respective section of the Joining Form.'],
      ['2. Sheet "1. Employee Info" - One row per employee. Fields marked * are required.'],
      ['3. Sheet "2. Family Members" - Multiple rows allowed per employee (match email).'],
      ['4. Sheet "3. Academic Info" - Multiple rows per employee (each qualification = 1 row).'],
      ['5. Sheet "4. Previous Employment" - Multiple rows per employee (each job = 1 row).'],
      ['6. Sheet "5. Verification Info" - Background check details. One row per employee.'],
      ['7. Do NOT change the column headers.'],
      ['8. Dates must be in YYYY-MM-DD format (e.g. 2024-01-15).'],
      ['9. For Languages Known, separate with commas (e.g. English, Hindi, Telugu).'],
      [''],
      ['Generated by AIRM System'],
    ];
    instructions.forEach((row, i) => {
      const r = infoWs.getRow(i + 1);
      r.getCell(1).value = row[0] || '';
      if (i === 0) {
        r.font = { bold: true, size: 14, color: { argb: 'FF2E75B6' } };
      } else if (i === 2) {
        r.font = { bold: true, size: 11 };
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Joining_Form_Template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[template] Download error:', error);
    res.status(500).json({
      error: 'Failed to generate template',
      message: error.message || 'Internal server error'
    });
  }
}




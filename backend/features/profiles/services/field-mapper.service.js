/**
 * Field Mapper Service
 * Maps extracted data to canonical profile fields
 */

/**
 * Map extracted data to canonical fields
 * @param {Object} extractedData - Raw extracted data from AI
 * @returns {Object} Mapped canonical profile
 */
export function mapToCanonicalFields(extractedData) {
  const mapped = {
    Employee_ID: normalizeString(extractedData.Employee_ID || extractedData.employee_id || extractedData.emp_id),
    Full_Name: normalizeString(extractedData.Full_Name || extractedData.full_name || extractedData.name),
    Official_Email: normalizeEmail(extractedData.Official_Email || extractedData.official_email || extractedData.email || extractedData.work_email),
    Phone_Number: normalizePhone(extractedData.Phone_Number || extractedData.phone_number || extractedData.phone || extractedData.mobile),
    Date_of_Joining: normalizeDate(extractedData.Date_of_Joining || extractedData.date_of_joining || extractedData.join_date || extractedData.doj),
    Department: normalizeString(extractedData.Department || extractedData.department || extractedData.dept),
    Role: normalizeString(extractedData.Role || extractedData.role || extractedData.job_title || extractedData.position || extractedData.designation),
    Employment_Type: normalizeEmploymentType(extractedData.Employment_Type || extractedData.employment_type || extractedData.emp_type || extractedData.type),
    Total_Experience_Years: normalizeNumber(extractedData.Total_Experience_Years || extractedData.total_experience_years || extractedData.experience || extractedData.exp_years),
    Skills: normalizeArray(extractedData.Skills || extractedData.skills),
    Certifications: normalizeArray(extractedData.Certifications || extractedData.certifications || extractedData.certs),
    Past_Projects: normalizeArray(extractedData.Past_Projects || extractedData.past_projects || extractedData.previous_projects),
    Current_Project: normalizeString(extractedData.Current_Project || extractedData.current_project || extractedData.project),
    Manager_Name: normalizeString(extractedData.Manager_Name || extractedData.manager_name || extractedData.manager || extractedData.reporting_manager),
    Manager_Email: normalizeEmail(extractedData.Manager_Email || extractedData.manager_email || extractedData.manager_email_address),
    Location: normalizeString(extractedData.Location || extractedData.location || extractedData.work_location || extractedData.office_location),
    Notes: normalizeString(extractedData.Notes || extractedData.notes || extractedData.additional_info || extractedData.remarks)
  };

  return mapped;
}

/**
 * Normalize string value
 */
function normalizeString(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return String(value).trim() || null;
}

/**
 * Normalize email value
 */
function normalizeEmail(value) {
  if (!value) return null;
  const email = normalizeString(value);
  if (!email) return null;
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email.toLowerCase() : null;
}

/**
 * Normalize phone number
 */
function normalizePhone(value) {
  if (!value) return null;
  const phone = normalizeString(value);
  if (!phone) return null;
  // Remove common separators and spaces
  return phone.replace(/[\s\-\(\)]/g, '') || null;
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(value) {
  if (!value) return null;
  
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Try to parse various date formats
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}

/**
 * Normalize employment type
 */
function normalizeEmploymentType(value) {
  if (!value) return null;
  const type = normalizeString(value);
  if (!type) return null;
  
  // Normalize common variations
  const normalized = type.toLowerCase();
  if (normalized.includes('full') || normalized.includes('permanent')) {
    return 'Full-time';
  }
  if (normalized.includes('contract')) {
    return 'Contract';
  }
  if (normalized.includes('intern')) {
    return 'Intern';
  }
  if (normalized.includes('part')) {
    return 'Part-time';
  }
  
  // Capitalize first letter of each word
  return type.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Normalize number value
 */
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Remove common non-numeric characters except decimal point
    const cleaned = trimmed.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * Normalize array value
 */
function normalizeArray(value) {
  if (!value) return [];
  
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeString(item))
      .filter(item => item !== null && item !== '');
  }
  
  if (typeof value === 'string') {
    // Handle comma-separated strings
    return value
      .split(',')
      .map(item => normalizeString(item))
      .filter(item => item !== null && item !== '');
  }
  
  return [];
}


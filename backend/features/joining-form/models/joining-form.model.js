// Create a new empty profile for onboarding
export async function createEmptyProfile(profileId, email) {
  // First, create a user row (to satisfy FK constraint)
  await pool.query(`
    INSERT INTO users (id, full_name, email, created_at, updated_at)
    VALUES ($1, '', $2, now(), now())
    ON CONFLICT (id) DO NOTHING
  `, [profileId, email]);
  // Then, create the profile row
  await pool.query(`
    INSERT INTO profiles (id, onboarding_status, created_at, updated_at)
    VALUES ($1, 'pending', now(), now())
  `, [profileId]);
}
/**
 * Joining Form Model
 * PostgreSQL queries for employee onboarding data
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all joining forms with employee details
 */
export async function getAllJoiningForms() {
  const result = await pool.query(`
    SELECT 
      u.id,
      COALESCE(p.full_name, u.full_name) as full_name,
      u.email,
      p.employee_id,
      p.phone,
      p.date_of_birth,
      p.gender,
      p.join_date,
      p.job_title AS designation,
      p.department,
      p.marital_status,
      p.bank_name,
      p.bank_ifsc,
      p.bank_branch,
      p.bank_account_number,
      p.uan_number,
      p.pf_number,
      p.current_address,
      p.permanent_address,
      p.languages_known,
      p.blood_group,
      p.height,
      p.weight,
      p.medical_history,
      COALESCE(p.onboarding_status, 'pending') as onboarding_status,
      p.onboarding_completed_at,
      u.created_at,
      COALESCE(p.updated_at, u.updated_at) as updated_at
    FROM users u
    LEFT JOIN profiles p ON u.id = p.id
    ORDER BY u.created_at DESC
  `);
  return result.rows;
}

/**
 * Get joining form by profile ID
 */
export async function getJoiningFormById(profileId) {
  console.log('[joining-form-model] getJoiningFormById profileId:', profileId);
  const profileResult = await pool.query(`
    SELECT 
      u.id,
      COALESCE(p.full_name, u.full_name) as full_name,
      u.email,
      p.employee_id,
      p.phone,
      p.date_of_birth,
      p.gender,
      p.join_date,
      p.job_title AS designation,
      p.department,
      p.marital_status,
      p.bank_name,
      p.bank_ifsc,
      p.bank_branch,
      p.bank_account_number,
      p.uan_number,
      p.pf_number,
      p.current_address,
      p.permanent_address,
      p.languages_known,
      p.blood_group,
      p.height,
      p.weight,
      p.medical_history,
      COALESCE(p.onboarding_status, 'pending') as onboarding_status,
      p.onboarding_completed_at,
      p.personal_email,
      p.emergency_contact,
      p.background_verification
    FROM users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = $1
  `, [profileId]);

  if (profileResult.rows.length === 0) {
    return null;
  }

  // Get family members
  const familyResult = await pool.query(`
    SELECT id, member_type, member_name, contact, location, relation
    FROM employee_family_members
    WHERE profile_id = $1
    ORDER BY created_at
  `, [profileId]);

  // Get academic info
  const academicResult = await pool.query(`
    SELECT id, qualification, specialization, institution_name, board_university, passout_year, grade_percentage
    FROM employee_academic_info
    WHERE profile_id = $1
    ORDER BY passout_year DESC
  `, [profileId]);

  // Get previous employment
  const employmentResult = await pool.query(`
    SELECT id, employer_name, designation, duration_from, duration_to, salary, reason_for_leaving
    FROM employee_previous_employment
    WHERE profile_id = $1
    ORDER BY duration_to DESC
  `, [profileId]);

  return {
    ...profileResult.rows[0],
    family_members: familyResult.rows,
    academic_info: academicResult.rows,
    previous_employment: employmentResult.rows
  };
}

/**
 * Create or update employee information
 */

// Helper to normalize date string to YYYY-MM-DD
function normalizeDateString(date) {
  if (!date) return null;
  // Accepts both Date objects and strings
  if (typeof date === 'string') {
    // If already YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    // If ISO string, extract date part
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return date;
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  return null;
}

export async function upsertEmployeeInfo(profileId, data) {
  const {
    full_name,
    email,
    employee_id,
    date_of_birth,
    gender,
    join_date,
    designation,
    department,
    marital_status,
    phone,
    personal_email,
    bank_name,
    bank_ifsc,
    bank_branch,
    bank_account_number,
    uan_number,
    pf_number,
    current_address,
    permanent_address,
    languages_known,
    blood_group,
    height,
    weight,
    medical_history,
    background_verification,
    onboarding_status
  } = data;

  const serializedBackgroundVerification = background_verification
    ? (typeof background_verification === 'string'
      ? background_verification
      : JSON.stringify(background_verification))
    : null;

  // Normalize date fields to YYYY-MM-DD
  const normalizedDob = normalizeDateString(date_of_birth);
  const normalizedJoinDate = normalizeDateString(join_date);

  await pool.query(`
    INSERT INTO profiles (
      id, full_name, employee_id, date_of_birth, gender, join_date,
      job_title, department, marital_status, phone, personal_email,
      bank_name, bank_ifsc, bank_branch, bank_account_number,
      uan_number, pf_number, current_address, permanent_address,
      languages_known, blood_group, height, weight, medical_history,
      background_verification, onboarding_status, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, now())
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
      date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
      gender = COALESCE(EXCLUDED.gender, profiles.gender),
      join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
      job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
      department = COALESCE(EXCLUDED.department, profiles.department),
      marital_status = COALESCE(EXCLUDED.marital_status, profiles.marital_status),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
      bank_name = COALESCE(EXCLUDED.bank_name, profiles.bank_name),
      bank_ifsc = COALESCE(EXCLUDED.bank_ifsc, profiles.bank_ifsc),
      bank_branch = COALESCE(EXCLUDED.bank_branch, profiles.bank_branch),
      bank_account_number = COALESCE(EXCLUDED.bank_account_number, profiles.bank_account_number),
      uan_number = COALESCE(EXCLUDED.uan_number, profiles.uan_number),
      pf_number = COALESCE(EXCLUDED.pf_number, profiles.pf_number),
      current_address = COALESCE(EXCLUDED.current_address, profiles.current_address),
      permanent_address = COALESCE(EXCLUDED.permanent_address, profiles.permanent_address),
      languages_known = COALESCE(EXCLUDED.languages_known, profiles.languages_known),
      blood_group = COALESCE(EXCLUDED.blood_group, profiles.blood_group),
      height = COALESCE(EXCLUDED.height, profiles.height),
      weight = COALESCE(EXCLUDED.weight, profiles.weight),
      medical_history = COALESCE(EXCLUDED.medical_history, profiles.medical_history),
      background_verification = COALESCE(EXCLUDED.background_verification, profiles.background_verification),
      onboarding_status = COALESCE(EXCLUDED.onboarding_status, profiles.onboarding_status),
      updated_at = now()
  `, [
    profileId,
    full_name || null,
    employee_id || null,
    normalizedDob || null,
    gender || null,
    normalizedJoinDate || null,
    designation || null,
    department || null,
    marital_status || null,
    phone || null,
    personal_email || null,
    bank_name || null,
    bank_ifsc || null,
    bank_branch || null,
    bank_account_number || null,
    uan_number || null,
    pf_number || null,
    current_address || null,
    permanent_address || null,
    languages_known ? JSON.stringify(languages_known) : null,
    blood_group || null,
    height || null,
    weight || null,
    medical_history || null,
    serializedBackgroundVerification,
    onboarding_status || 'pending'
  ]);

  // Sync full_name to users table if provided
  if (full_name) {
    await pool.query(
      'UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2',
      [full_name, profileId]
    );
  }

  // Update official email in users table if provided
  if (email) {
    await pool.query(
      'UPDATE users SET email = $1, updated_at = now() WHERE id = $2',
      [email.toLowerCase().trim(), profileId]
    );
  }
}


/**
 * Add family member
 */
export async function addFamilyMember(profileId, data) {
  const { member_type, member_name, contact, location, relation } = data;
  const result = await pool.query(`
    INSERT INTO employee_family_members (profile_id, member_type, member_name, contact, location, relation)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [profileId, member_type, member_name, contact || null, location || null, relation || null]);
  return result.rows[0];
}

/**
 * Update family member
 */
export async function updateFamilyMember(memberId, data) {
  const { member_type, member_name, contact, location, relation } = data;
  const result = await pool.query(`
    UPDATE employee_family_members
    SET member_type = $1, member_name = $2, contact = $3, location = $4, relation = $5, updated_at = now()
    WHERE id = $6
    RETURNING *
  `, [member_type, member_name, contact, location, relation, memberId]);
  return result.rows[0];
}

/**
 * Delete family member
 */
export async function deleteFamilyMember(memberId) {
  await pool.query('DELETE FROM employee_family_members WHERE id = $1', [memberId]);
}

/**
 * Add academic qualification
 */
export async function addAcademicInfo(profileId, data) {
  const { qualification, specialization, institution_name, board_university, passout_year, grade_percentage } = data;
  const result = await pool.query(`
    INSERT INTO employee_academic_info (profile_id, qualification, specialization, institution_name, board_university, passout_year, grade_percentage)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [profileId, qualification, specialization || null, institution_name, board_university, passout_year, grade_percentage]);
  return result.rows[0];
}

/**
 * Update academic qualification
 */
export async function updateAcademicInfo(academicId, data) {
  const { qualification, specialization, institution_name, board_university, passout_year, grade_percentage } = data;
  const result = await pool.query(`
    UPDATE employee_academic_info
    SET qualification = $1, specialization = $2, institution_name = $3, board_university = $4, passout_year = $5, grade_percentage = $6, updated_at = now()
    WHERE id = $7
    RETURNING *
  `, [qualification, specialization, institution_name, board_university, passout_year, grade_percentage, academicId]);
  return result.rows[0];
}

/**
 * Delete academic qualification
 */
export async function deleteAcademicInfo(academicId) {
  await pool.query('DELETE FROM employee_academic_info WHERE id = $1', [academicId]);
}

/**
 * Add previous employment
 */
export async function addPreviousEmployment(profileId, data) {
  const { employer_name, designation, duration_from, duration_to, salary, reason_for_leaving } = data;
  const result = await pool.query(`
    INSERT INTO employee_previous_employment (profile_id, employer_name, designation, duration_from, duration_to, salary, reason_for_leaving)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [profileId, employer_name, designation, duration_from, duration_to, salary || null, reason_for_leaving || null]);
  return result.rows[0];
}

/**
 * Update previous employment
 */
export async function updatePreviousEmployment(employmentId, data) {
  const { employer_name, designation, duration_from, duration_to, salary, reason_for_leaving } = data;
  const result = await pool.query(`
    UPDATE employee_previous_employment
    SET employer_name = $1, designation = $2, duration_from = $3, duration_to = $4, salary = $5, reason_for_leaving = $6, updated_at = now()
    WHERE id = $7
    RETURNING *
  `, [employer_name, designation, duration_from, duration_to, salary, reason_for_leaving, employmentId]);
  return result.rows[0];
}

/**
 * Delete previous employment
 */
export async function deletePreviousEmployment(employmentId) {
  await pool.query('DELETE FROM employee_previous_employment WHERE id = $1', [employmentId]);
}

/**
 * Bulk save family members (replace all)
 */
export async function saveFamilyMembers(profileId, members) {
  // Delete existing
  await pool.query('DELETE FROM employee_family_members WHERE profile_id = $1', [profileId]);

  // Insert new
  for (const member of members) {
    await addFamilyMember(profileId, member);
  }
}

/**
 * Bulk save academic info (replace all)
 */
export async function saveAcademicInfo(profileId, academics) {
  // Delete existing
  await pool.query('DELETE FROM employee_academic_info WHERE profile_id = $1', [profileId]);

  // Insert new
  for (const academic of academics) {
    await addAcademicInfo(profileId, academic);
  }
}

/**
 * Bulk save previous employment (replace all)
 */
export async function savePreviousEmployment(profileId, employments) {
  // Delete existing
  await pool.query('DELETE FROM employee_previous_employment WHERE profile_id = $1', [profileId]);

  // Insert new
  for (const employment of employments) {
    await addPreviousEmployment(profileId, employment);
  }
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(profileId) {
  await pool.query(`
    UPDATE profiles
    SET onboarding_status = 'completed', onboarding_completed_at = now(), updated_at = now()
    WHERE id = $1
  `, [profileId]);
}

/**
 * Get employees with pending onboarding
 */
export async function getPendingOnboarding() {
  const result = await pool.query(`
    SELECT 
      u.id,
      COALESCE(p.full_name, u.full_name) as full_name,
      u.email,
      p.employee_id,
      p.department,
      p.job_title AS designation,
      COALESCE(p.onboarding_status, 'pending') as onboarding_status,
      u.created_at
    FROM users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.onboarding_status != 'completed' OR p.onboarding_status IS NULL
    ORDER BY u.created_at DESC
  `);
  return result.rows;
}

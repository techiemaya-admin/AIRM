/**
 * Profiles Model
 * PostgreSQL queries only - NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all profiles from database
 */
export async function getAllProfiles() {
  try {
    // Check if burnout_score column exists, if not use COALESCE to handle it
    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        COALESCE(e.full_name, p.full_name, u.full_name) as full_name,
        u.created_at,
        ur.role,
        COALESCE(e.mobile_no, p.phone) as phone,
        p.skills,
        COALESCE(p.join_date, (CASE WHEN e.joining_date IS NOT NULL AND e.joining_date ~ '^\d{4}-\d{2}-\d{2}$' THEN e.joining_date::date ELSE NULL END)) as join_date,
        p.experience_years,
        p.previous_projects,
        p.bio,
        p.linkedin_url,
        p.github_url,
        p.avatar_url,
        COALESCE(e.designation, p.job_title) as job_title,
        COALESCE(e.department, p.department) as department,
        p.employment_type,
        p.employee_id,
        p.reporting_manager,
        COALESCE(e.personal_mail_id, p.personal_email) as personal_email,
        COALESCE(e.emergency_contact_no, p.emergency_contact) as emergency_contact,
        p.education,
        p.certifications,
        p.project_history,
        p.performance_reviews,
        p.documents,
        COALESCE(p.burnout_score, 0) as burnout_score,
        COALESCE(p.date_of_birth, (CASE WHEN e.dob IS NOT NULL AND e.dob ~ '^\d{4}-\d{2}-\d{2}$' THEN e.dob::date ELSE NULL END)) as date_of_birth,
        p.gender,
        COALESCE(e.marital_status, p.marital_status) as marital_status,
        COALESCE(e.bank_name, p.bank_name) as bank_name,
        COALESCE(e.ifsc, p.bank_ifsc) as bank_ifsc,
        COALESCE(e.bank_branch, p.bank_branch) as bank_branch,
        COALESCE(e.account_number, p.bank_account_number) as bank_account_number,
        COALESCE(e.uan_no, p.uan_number) as uan_number,
        p.pf_number,
        COALESCE(e.current_address, p.current_address) as current_address,
        COALESCE(e.permanent_address, p.permanent_address) as permanent_address,
        p.languages_known,
        COALESCE(e.blood_group, p.blood_group) as blood_group,
        p.height,
        p.weight,
        p.medical_history,
        p.family_details,
        p.bank_details,
        p.personal_details,
        p.address,
        e.pan,
        e.adhar_no,
        e.uan_no,
        e.start_time,
        e.completion_time,
        p.updated_at
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN profiles p ON u.id = p.id
      LEFT JOIN employee e ON p.id = e.profile_id
      ORDER BY p.join_date DESC NULLS LAST, u.created_at DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('[profiles] Error in getAllProfiles model:', error);
    console.error('[profiles] Error details:', error.message, error.stack);
    throw error;
  }
}

/**
 * Get profile by user ID
 */
export async function getProfileById(userId) {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.email,
      COALESCE(e.full_name, p.full_name, u.full_name) as full_name,
      u.created_at,
      ur.role,
      COALESCE(e.mobile_no, p.phone) as phone,
      p.skills,
      COALESCE(p.join_date, (CASE WHEN e.joining_date IS NOT NULL AND e.joining_date ~ '^\d{4}-\d{2}-\d{2}$' THEN e.joining_date::date ELSE NULL END)) as join_date,
      p.experience_years,
      p.previous_projects,
      p.bio,
      p.linkedin_url,
      p.github_url,
      p.avatar_url,
      COALESCE(e.designation, p.job_title) as job_title,
      COALESCE(e.department, p.department) as department,
      p.employment_type,
      p.employee_id,
      p.reporting_manager,
      COALESCE(e.personal_mail_id, p.personal_email) as personal_email,
      COALESCE(e.emergency_contact_no, p.emergency_contact) as emergency_contact,
      p.education,
      p.certifications,
      p.project_history,
      p.performance_reviews,
      p.documents,
      COALESCE(p.burnout_score, 0) as burnout_score,
      COALESCE(p.date_of_birth, (CASE WHEN e.dob IS NOT NULL AND e.dob ~ '^\d{4}-\d{2}-\d{2}$' THEN e.dob::date ELSE NULL END)) as date_of_birth,
      p.gender,
      COALESCE(e.marital_status, p.marital_status) as marital_status,
      COALESCE(e.bank_name, p.bank_name) as bank_name,
      COALESCE(e.ifsc, p.bank_ifsc) as bank_ifsc,
      COALESCE(e.bank_branch, p.bank_branch) as bank_branch,
      COALESCE(e.account_number, p.bank_account_number) as bank_account_number,
      COALESCE(e.uan_no, p.uan_number) as uan_number,
      p.pf_number,
      COALESCE(e.current_address, p.current_address) as current_address,
      COALESCE(e.permanent_address, p.permanent_address) as permanent_address,
      p.languages_known,
      COALESCE(e.blood_group, p.blood_group) as blood_group,
      p.height,
      p.weight,
      p.medical_history,
      p.family_details,
      p.bank_details,
      p.personal_details,
      p.address,
      e.pan,
      e.adhar_no,
      e.uan_no,
      e.start_time,
      e.completion_time,
      p.updated_at
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN profiles p ON u.id = p.id
    LEFT JOIN employee e ON p.id = e.profile_id
    WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Check if user exists
 */
export async function userExists(userId) {
  const result = await pool.query(
    'SELECT id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0;
}

/**
 * Update user full_name
 */
export async function updateUserName(userId, fullName) {
  await pool.query(
    'UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2',
    [fullName, userId]
  );
}

/**
 * Update user official email
 */
export async function updateUserEmail(userId, email) {
  await pool.query(
    'UPDATE users SET email = $1, updated_at = now() WHERE id = $2',
    [email, userId]
  );
}

/**
 * Insert or update profile
 */
export async function upsertProfile(profileData) {
  const {
    id,
    phone,
    skills,
    join_date,
    experience_years,
    previous_projects,
    bio,
    linkedin_url,
    github_url,
    full_name,
    job_title,
    department,
    employment_type,
    employee_id,
    reporting_manager,
    personal_email,
    emergency_contact,
    education,
    certifications,
    project_history,
    performance_reviews,
    documents,
    burnout_score,
    family_details,
    bank_details,
    personal_details,
    address
  } = profileData;

  await pool.query(
    `INSERT INTO profiles (
      id, phone, skills, join_date, experience_years, 
      previous_projects, bio, linkedin_url, github_url, full_name,
      job_title, department, employment_type, employee_id,
      reporting_manager, personal_email, emergency_contact,
      education, certifications, project_history, performance_reviews, documents,
      burnout_score, family_details, bank_details, personal_details, address, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, now())
    ON CONFLICT (id) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      skills = COALESCE(EXCLUDED.skills, profiles.skills),
      join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
      experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
      previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
      bio = COALESCE(EXCLUDED.bio, profiles.bio),
      linkedin_url = COALESCE(EXCLUDED.linkedin_url, profiles.linkedin_url),
      github_url = COALESCE(EXCLUDED.github_url, profiles.github_url),
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
      department = COALESCE(EXCLUDED.department, profiles.department),
      employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
      employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
      reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
      personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
      emergency_contact = COALESCE(EXCLUDED.emergency_contact, profiles.emergency_contact),
      education = COALESCE(EXCLUDED.education, profiles.education),
      certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
      project_history = COALESCE(EXCLUDED.project_history, profiles.project_history),
      performance_reviews = COALESCE(EXCLUDED.performance_reviews, profiles.performance_reviews),
      documents = COALESCE(EXCLUDED.documents, profiles.documents),
      burnout_score = COALESCE(EXCLUDED.burnout_score, profiles.burnout_score),
      family_details = COALESCE(EXCLUDED.family_details, profiles.family_details),
      bank_details = COALESCE(EXCLUDED.bank_details, profiles.bank_details),
      personal_details = COALESCE(EXCLUDED.personal_details, profiles.personal_details),
      address = COALESCE(EXCLUDED.address, profiles.address),
      updated_at = now()`,
    [
      id,
      phone || null,
      skills || null,
      join_date || null,
      experience_years || null,
      previous_projects ? JSON.stringify(previous_projects) : null,
      bio || null,
      linkedin_url || null,
      github_url || null,
      full_name || null,
      job_title || null,
      department || null,
      employment_type || null,
      employee_id || null,
      reporting_manager || null,
      personal_email || null,
      emergency_contact || null,
      education ? JSON.stringify(education) : null,
      certifications ? JSON.stringify(certifications) : null,
      project_history ? JSON.stringify(project_history) : null,
      performance_reviews ? JSON.stringify(performance_reviews) : null,
      documents ? JSON.stringify(documents) : null,
      burnout_score !== undefined && burnout_score !== null ? parseInt(burnout_score) : 0,
      family_details ? JSON.stringify(family_details) : null,
      bank_details ? JSON.stringify(bank_details) : null,
      personal_details ? JSON.stringify(personal_details) : null,
      address ? JSON.stringify(address) : null
    ]
  );

  // Sync with employee table
  await pool.query(
    `UPDATE employee SET
      full_name = COALESCE($2, full_name),
      mobile_no = COALESCE($3, mobile_no),
      designation = COALESCE($4, designation),
      department = COALESCE($5, department),
      personal_mail_id = COALESCE($6, personal_mail_id),
      emergency_contact_no = COALESCE($7, emergency_contact_no),
      updated_at = now()
    WHERE profile_id = $1`,
    [id, full_name, phone, job_title, department, personal_email, emergency_contact]
  );
}

/**
 * Delete profile row by user id
 */
export async function deleteProfileById(userId) {
  console.log('[profiles.model] Deleting profile for userId:', userId);
  // Delete from employee table first
  await pool.query('DELETE FROM employee WHERE profile_id = $1', [userId]);
  const result = await pool.query('DELETE FROM profiles WHERE id = $1 RETURNING id', [userId]);
  console.log('[profiles.model] Delete result:', result.rowCount, 'rows deleted');
  return result;
}

/**
 * Delete user role by user id
 */
export async function deleteUserRoleById(userId) {
  console.log('[profiles.model] Deleting user_roles for userId:', userId);
  const result = await pool.query('DELETE FROM user_roles WHERE user_id = $1 RETURNING user_id', [userId]);
  console.log('[profiles.model] Delete user_roles result:', result.rowCount, 'rows deleted');
  return result;
}

/**
 * Delete user by id
 */
export async function deleteUserById(userId) {
  console.log('[profiles.model] Deleting user for userId:', userId);
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
  console.log('[profiles.model] Delete user result:', result.rowCount, 'rows deleted');
  return result;
}


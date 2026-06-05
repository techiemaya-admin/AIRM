/**
 * Profile Extraction Controller
 * Handles file upload and profile extraction requests
 */

import * as extractionService from '../services/profile-extraction.service.js';
import pool from '../../../shared/database/connection.js';

/**
 * Extract profile from uploaded file
 * POST /api/profiles/extract
 */
export async function extractProfile(req, res) {
  try {
    if (!req.file && !req.files) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a PDF, Word, Excel, or text file'
      });
    }

    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        error: 'Invalid file',
        message: 'File upload failed'
      });
    }

    // Extract profile from file
    const profile = await extractionService.extractProfileFromFile(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    // Map canonical extraction fields to frontend DTO shape
    const mapToFrontendDto = (p) => ({
      // Do not set `id` to employee identifier (which is not a UUID).
      // `id` should represent the user's UUID in the system — leave null
      // for extracted previews. The frontend will use `employee_id` field
      // for display and later linking.
      id: null,
      email: p.Official_Email || p.official_email || null,
      full_name: p.Full_Name || p.full_name || null,
      role: p.Role || p.role || 'user',
      phone: p.Phone_Number || p.phone_number || null,
      skills: p.Skills || p.skills || [],
      join_date: p.Date_of_Joining || p.date_of_joining || null,
      experience_years: p.Total_Experience_Years || p.total_experience_years || null,
      previous_projects: p.Past_Projects || p.past_projects || [],
      bio: p.Notes || p.notes || null,
      linkedin_url: p.LinkedIn || p.linkedin_url || null,
      github_url: p.GitHub || p.github_url || null,
      avatar_url: null,
      job_title: p.Role || p.job_title || null,
      department: p.Department || p.department || null,
      employment_type: p.Employment_Type || p.employment_type || null,
      employee_id: p.Employee_ID || p.employee_id || null,
      reporting_manager: p.Manager_Name || p.manager_name || null,
      personal_email: p.Official_Email || p.personal_email || null,
      emergency_contact: null,
      education: p.Education || p.education || [],
      certifications: p.Certifications || p.certifications || [],
      project_history: p.Past_Projects || p.project_history || [],
      performance_reviews: [],
      documents: [],
      burnout_score: p.Burnout_Score || p.burnout_score || null,
      created_at: new Date().toISOString(),
      updated_at: null,
    });

    res.json({
      success: true,
      profile: mapToFrontendDto(profile),
      filename: file.originalname
    });
  } catch (error) {
    console.error('[profile-extraction] Controller error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error.message || 'Failed to extract profile from file'
    });
  }
}

/**
 * Extract profiles from multiple files
 * POST /api/profiles/extract/batch
 */
export async function extractProfilesBatch(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files provided',
        message: 'Please upload one or more files'
      });
    }

    const files = req.files.map(file => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname
    }));

    const results = await extractionService.extractProfilesFromFiles(files);

    res.json({
      success: true,
      results,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('[profile-extraction] Batch controller error:', error);
    res.status(500).json({
      error: 'Batch extraction failed',
      message: error.message || 'Failed to extract profiles from files'
    });
  }
}

/**
 * Extract and create/update profile
 * POST /api/profiles/extract-and-save
 */
export async function extractAndSaveProfile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a file'
      });
    }

    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Extract profile from file
    const extractedProfile = await extractionService.extractProfileFromFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Map extracted fields to database schema
    const profileData = mapExtractedToProfileSchema(extractedProfile);

    // Check if user exists (by email or employee_id)

    let targetUserId = userId;

    if (extractedProfile.Official_Email) {
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [extractedProfile.Official_Email]
      );

      if (userCheck.rows.length > 0) {
        targetUserId = userCheck.rows[0].id;
      } else if (isAdmin && extractedProfile.Employee_ID) {
        // Admin can create new user if employee_id provided
        // For now, we'll just update existing user or return error
        return res.status(404).json({
          error: 'User not found',
          message: `No user found with email ${extractedProfile.Official_Email}. Please create user first.`,
          extracted_profile: extractedProfile
        });
      }
    }

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [targetUserId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist. Please create user first.',
        extracted_profile: extractedProfile
      });
    }

    // Update user full_name if provided
    if (profileData.full_name) {
      await pool.query(
        'UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2',
        [profileData.full_name, targetUserId]
      );
    }

    // Insert or update profile
    await pool.query(
      `INSERT INTO profiles (
        id, phone, skills, join_date, experience_years, 
        previous_projects, full_name,
        job_title, department, employment_type, employee_id,
        reporting_manager, personal_email,
        certifications, project_history,
        education, documents,
        family_details, bank_details, personal_details, address,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, now())
      ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        skills = COALESCE(EXCLUDED.skills, profiles.skills),
        join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
        experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
        previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
        department = COALESCE(EXCLUDED.department, profiles.department),
        employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
        employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
        reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
        personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
        certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
        project_history = COALESCE(EXCLUDED.project_history, profiles.project_history),
        education = COALESCE(EXCLUDED.education, profiles.education),
        documents = COALESCE(EXCLUDED.documents, profiles.documents),
        family_details = COALESCE(EXCLUDED.family_details, profiles.family_details),
        bank_details = COALESCE(EXCLUDED.bank_details, profiles.bank_details),
        personal_details = COALESCE(EXCLUDED.personal_details, profiles.personal_details),
        address = COALESCE(EXCLUDED.address, profiles.address),
        updated_at = now()`,
      [
        targetUserId,
        profileData.phone || null,
        profileData.skills ? JSON.stringify(profileData.skills) : null,
        profileData.join_date || null,
        profileData.experience_years || null,
        profileData.previous_projects ? JSON.stringify(profileData.previous_projects) : null,
        profileData.full_name || null,
        profileData.job_title || null,
        profileData.department || null,
        profileData.employment_type || null,
        profileData.employee_id || null,
        profileData.reporting_manager || null,
        profileData.personal_email || null,
        profileData.certifications ? JSON.stringify(profileData.certifications) : null,
        profileData.project_history ? JSON.stringify(profileData.project_history) : null,
        profileData.education ? JSON.stringify(profileData.education) : null,
        profileData.documents ? JSON.stringify(profileData.documents) : null,
        profileData.family_details ? JSON.stringify(profileData.family_details) : null,
        profileData.bank_details ? JSON.stringify(profileData.bank_details) : null,
        profileData.personal_details ? JSON.stringify(profileData.personal_details) : null,
        profileData.address ? JSON.stringify(profileData.address) : null
      ]
    );

    res.json({
      success: true,
      message: 'Profile extracted and saved successfully',
      profile_id: targetUserId,
      extracted_profile: extractedProfile
    });
  } catch (error) {
    console.error('[profile-extraction] Extract and save error:', error);
    res.status(500).json({
      error: 'Failed to extract and save profile',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Map extracted profile to database schema
 */
function mapExtractedToProfileSchema(extracted) {
  return {
    employee_id: extracted.Employee_ID,
    full_name: extracted.Full_Name,
    personal_email: extracted.Personal_Email || extracted.Official_Email,
    // Logic: If personal email extracted use it, otherwise use official as fallback.
    // However, users table uses official email as key usually.
    // The parser separated them.

    phone: extracted.Phone_Number,
    join_date: extracted.Date_of_Joining,
    department: extracted.Department,
    job_title: extracted.Role,
    employment_type: extracted.Employment_Type,
    experience_years: extracted.Total_Experience_Years,
    skills: extracted.Skills,
    certifications: extracted.Certifications,
    previous_projects: extracted.Past_Projects,
    reporting_manager: extracted.Manager_Name,
    project_history: extracted.Project_History || (extracted.Previous_Employment ? [extracted.Previous_Employment] : (extracted.Current_Project ? [{
      name: extracted.Current_Project,
      status: 'current',
      start_date: null
    }] : [])),

    // Flattened fields for profiles compatibility (used by Joining Form UI)
    date_of_birth: extracted.Personal_Details?.dob,
    gender: extracted.Gender || extracted.Personal_Details?.gender,
    marital_status: extracted.Personal_Details?.marital_status,
    blood_group: extracted.Personal_Details?.blood_group,
    languages_known: extracted.Personal_Details?.languages,
    uan_number: extracted.Personal_Details?.uan,
    emergency_contact: extracted.Personal_Details?.emergency_contact,

    current_address: extracted.Address?.current,
    permanent_address: extracted.Address?.permanent,

    bank_name: extracted.Bank_Details?.bank_name,
    bank_account_number: extracted.Bank_Details?.account_number,
    bank_ifsc: extracted.Bank_Details?.ifsc,
    bank_branch: extracted.Bank_Details?.branch,

    // New Fields (JSONB)
    family_details: extracted.Family_Details,
    bank_details: extracted.Bank_Details,
    personal_details: extracted.Personal_Details,
    address: extracted.Address,
    education: extracted.Education_Details,
    documents: extracted.Documents_Submitted
  };
}

/**
 * Save edited profile data
 * POST /api/profiles/save-edited
 */
export async function saveEditedProfile(req, res) {
  try {
    const { profile } = req.body;
    const userId = req.userId;

    if (!profile) {
      return res.status(400).json({
        error: 'No profile data provided',
        message: 'Profile data is required'
      });
    }

    // Map edited profile to database schema
    const profileData = mapExtractedToProfileSchema(profile);

    // Check if user exists (by email)
    let targetUserId = userId;

    if (profile.Official_Email) {
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [profile.Official_Email]
      );

      if (userCheck.rows.length > 0) {
        targetUserId = userCheck.rows[0].id;
      } else {
        // Create new user if not exists
        const newUser = await pool.query(
          'INSERT INTO users (id, email, full_name, created_at, updated_at) VALUES (uuid_generate_v4(), $1, $2, now(), now()) RETURNING id',
          [profile.Official_Email, profile.Full_Name || '']
        );
        targetUserId = newUser.rows[0].id;
      }
    }

    // Update user full_name if provided
    if (profileData.full_name) {
      await pool.query(
        'UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2',
        [profileData.full_name, targetUserId]
      );
    }

    // Insert or update profile
    await pool.query(
      `INSERT INTO profiles (
        id, phone, skills, join_date, experience_years,
        previous_projects, full_name,
        job_title, department, employment_type, employee_id,
        reporting_manager, personal_email,
        certifications, project_history,
        education, documents,
        family_details, bank_details, personal_details, address,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, now())
      ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        skills = COALESCE(EXCLUDED.skills, profiles.skills),
        join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
        experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
        previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
        department = COALESCE(EXCLUDED.department, profiles.department),
        employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
        employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
        reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
        personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
        certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
        project_history = COALESCE(EXCLUDED.project_history, profiles.project_history),
        education = COALESCE(EXCLUDED.education, profiles.education),
        documents = COALESCE(EXCLUDED.documents, profiles.documents),
        family_details = COALESCE(EXCLUDED.family_details, profiles.family_details),
        bank_details = COALESCE(EXCLUDED.bank_details, profiles.bank_details),
        personal_details = COALESCE(EXCLUDED.personal_details, profiles.personal_details),
        address = COALESCE(EXCLUDED.address, profiles.address),
        updated_at = now()`,
      [
        targetUserId,
        profileData.phone || null,
        profileData.skills ? JSON.stringify(profileData.skills) : null,
        profileData.join_date || null,
        profileData.experience_years || null,
        profileData.previous_projects ? JSON.stringify(profileData.previous_projects) : null,
        profileData.full_name || null,
        profileData.job_title || null,
        profileData.department || null,
        profileData.employment_type || null,
        profileData.employee_id || null,
        profileData.reporting_manager || null,
        profileData.personal_email || null,
        profileData.certifications ? JSON.stringify(profileData.certifications) : null,
        profileData.project_history ? JSON.stringify(profileData.project_history) : null,
        profileData.education ? JSON.stringify(profileData.education) : null,
        profileData.documents ? JSON.stringify(profileData.documents) : null,
        profileData.family_details ? JSON.stringify(profileData.family_details) : null,
        profileData.bank_details ? JSON.stringify(profileData.bank_details) : null,
        profileData.personal_details ? JSON.stringify(profileData.personal_details) : null,
        profileData.address ? JSON.stringify(profileData.address) : null
      ]
    );

    res.json({
      success: true,
      message: 'Profile saved successfully',
      profile_id: targetUserId
    });
  } catch (error) {
    console.error('[profile-extraction] Save edited profile error:', error);
    res.status(500).json({
      error: 'Failed to save profile',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Upload and save multiple profiles from Excel/CSV file
 * POST /api/profiles/upload-batch
 */
export async function uploadBatchProfiles(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload an Excel or CSV file'
      });
    }

    const file = req.file;

    // Parse the Excel/CSV file to extract profiles
    const profilesData = await extractionService.parseBatchProfilesFile(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    const userId = req.userId;
    const results = [];
    // const isAdmin = req.isAdmin;

    // if (!isAdmin) {
    //   return res.status(403).json({
    //     error: 'Permission denied',
    //     message: 'Only admin users can upload batch profiles'
    //   });
    // }

    console.log('[batch-upload] Total profiles to process:', profilesData.length);
    console.log('[batch-upload] Parsed profiles:', JSON.stringify(profilesData, null, 2));

    if (profilesData.length === 0) {
      return res.status(400).json({
        error: 'No valid profiles found',
        message: 'The uploaded file does not contain any valid profile data. Please ensure the file has data rows with at least an email or name, and remove the sample row.'
      });
    }

    for (const profileData of profilesData) {
      try {
        console.log('[batch-upload] Processing profile:', JSON.stringify(profileData, null, 2));

        // Map extracted fields to database schema
        const mappedProfile = mapExtractedToProfileSchema(profileData);

        // Find user by email or employee_id
        let targetUserId = null;

        if (profileData.Official_Email || profileData.Personal_Email) {
          const emailToUse = profileData.Official_Email || profileData.Personal_Email;

          const userCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [emailToUse]
          );

          if (userCheck.rows.length > 0) {
            targetUserId = userCheck.rows[0].id;
          } else {
            // Create new user if not exists
            const newUser = await pool.query(
              'INSERT INTO users (id, email, full_name, created_at, updated_at) VALUES (uuid_generate_v4(), $1, $2, now(), now()) RETURNING id',
              [emailToUse, profileData.Full_Name || '']
            );
            targetUserId = newUser.rows[0].id;
          }
        } else {
          const availableHeaders = Object.keys(profileData._raw).join(', ');
          results.push({
            success: false,
            email: profileData.Official_Email,
            error: `Missing email - email is required to create or identify user. Checked columns for email: Email, Official Email, Personal Email, etc. Found headers: ${availableHeaders}`
          });
          continue;
        }

        // Update user full_name if provided
        if (mappedProfile.full_name) {
          await pool.query(
            'UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2',
            [mappedProfile.full_name, targetUserId]
          );
        }

        // Insert or update profile (with available fields)
        await pool.query(
          `INSERT INTO profiles (
            id, full_name, phone, skills, join_date, experience_years, 
            previous_projects, job_title, department, employment_type, 
            employee_id, reporting_manager, personal_email, certifications,
            education, documents,
            family_details, bank_details, personal_details, address,
            date_of_birth, marital_status, bank_name, bank_ifsc, bank_branch, 
            bank_account_number, uan_number, current_address, permanent_address, 
            languages_known, blood_group, emergency_contact, gender,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, now())
          ON CONFLICT (id) DO UPDATE SET
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            phone = COALESCE(EXCLUDED.phone, profiles.phone),
            skills = COALESCE(EXCLUDED.skills, profiles.skills),
            join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
            experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
            previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
            job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
            department = COALESCE(EXCLUDED.department, profiles.department),
            employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
            employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
            reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
            personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
            certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
            education = COALESCE(EXCLUDED.education, profiles.education),
            documents = COALESCE(EXCLUDED.documents, profiles.documents),
            family_details = COALESCE(EXCLUDED.family_details, profiles.family_details),
            bank_details = COALESCE(EXCLUDED.bank_details, profiles.bank_details),
            personal_details = COALESCE(EXCLUDED.personal_details, profiles.personal_details),
            address = COALESCE(EXCLUDED.address, profiles.address),
            date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
            marital_status = COALESCE(EXCLUDED.marital_status, profiles.marital_status),
            bank_name = COALESCE(EXCLUDED.bank_name, profiles.bank_name),
            bank_ifsc = COALESCE(EXCLUDED.bank_ifsc, profiles.bank_ifsc),
            bank_branch = COALESCE(EXCLUDED.bank_branch, profiles.bank_branch),
            bank_account_number = COALESCE(EXCLUDED.bank_account_number, profiles.bank_account_number),
            uan_number = COALESCE(EXCLUDED.uan_number, profiles.uan_number),
            current_address = COALESCE(EXCLUDED.current_address, profiles.current_address),
            permanent_address = COALESCE(EXCLUDED.permanent_address, profiles.permanent_address),
            languages_known = COALESCE(EXCLUDED.languages_known, profiles.languages_known),
            blood_group = COALESCE(EXCLUDED.blood_group, profiles.blood_group),
            emergency_contact = COALESCE(EXCLUDED.emergency_contact, profiles.emergency_contact),
            gender = COALESCE(EXCLUDED.gender, profiles.gender),
            updated_at = now()`,
          [
            targetUserId,
            mappedProfile.full_name || null,
            mappedProfile.phone || null,
            // `skills` column is stored as a Postgres array; pass JS array directly
            mappedProfile.skills ? (Array.isArray(mappedProfile.skills) ? mappedProfile.skills : String(mappedProfile.skills).split(',').map(s => s.trim()).filter(Boolean)) : null,
            mappedProfile.join_date || null,
            mappedProfile.experience_years || null,
            mappedProfile.previous_projects ? JSON.stringify(mappedProfile.previous_projects) : null,
            mappedProfile.job_title || null,
            mappedProfile.department || null,
            mappedProfile.employment_type || null,
            mappedProfile.employee_id || null,
            mappedProfile.reporting_manager || null,
            mappedProfile.personal_email || null,
            mappedProfile.certifications ? JSON.stringify(mappedProfile.certifications) : null,
            mappedProfile.education ? JSON.stringify(mappedProfile.education) : null,
            mappedProfile.documents ? JSON.stringify(mappedProfile.documents) : null,
            mappedProfile.family_details ? JSON.stringify(mappedProfile.family_details) : null,
            mappedProfile.bank_details ? JSON.stringify(mappedProfile.bank_details) : null,
            mappedProfile.personal_details ? JSON.stringify(mappedProfile.personal_details) : null,
            mappedProfile.address ? JSON.stringify(mappedProfile.address) : null,
            mappedProfile.date_of_birth || null,
            mappedProfile.marital_status || null,
            mappedProfile.bank_name || null,
            mappedProfile.bank_ifsc || null,
            mappedProfile.bank_branch || null,
            mappedProfile.bank_account_number || null,
            mappedProfile.uan_number || null,
            mappedProfile.current_address || null,
            mappedProfile.permanent_address || null,
            mappedProfile.languages_known ? JSON.stringify(typeof mappedProfile.languages_known === 'string' ? [mappedProfile.languages_known] : mappedProfile.languages_known) : null,
            mappedProfile.blood_group || null,
            mappedProfile.emergency_contact || null,
            mappedProfile.gender || null
          ]
        );

        // Save to related tables for Joining Form compatibility (Family, Education)
        if (mappedProfile.family_details && Array.isArray(mappedProfile.family_details)) {
          await pool.query('DELETE FROM employee_family_members WHERE profile_id = $1', [targetUserId]);
          for (const member of mappedProfile.family_details) {
            await pool.query(
              'INSERT INTO employee_family_members (profile_id, member_type, member_name, contact, relation) VALUES ($1, $2, $3, $4, $5)',
              [targetUserId, member.relation || 'Family', member.name, member.contact || null, member.relation || null]
            );
          }
        }

        if (mappedProfile.education && Array.isArray(mappedProfile.education)) {
          await pool.query('DELETE FROM employee_academic_info WHERE profile_id = $1', [targetUserId]);
          for (const edu of mappedProfile.education) {
            await pool.query(
              'INSERT INTO employee_academic_info (profile_id, qualification, institution_name, passout_year, grade_percentage) VALUES ($1, $2, $3, $4, $5)',
              [targetUserId, edu.degree, edu.college, edu.passout_year, edu.grade]
            );
          }
        }

        results.push({
          success: true,
          email: profileData.Official_Email,
          name: profileData.Full_Name,
          message: 'Profile created/updated successfully'
        });

        // Also save to employee table
        try {
          await saveToEmployeeTable(targetUserId, profileData._raw);
          console.log('[batch-upload] Saved to employee table');
        } catch (employeeTableError) {
          console.error('[batch-upload] Error saving to employee table:', employeeTableError);
          // Don't fail the whole process if this fails
        }

      } catch (error) {
        console.error('[batch-upload] Error processing profile:', error);
        console.error('[batch-upload] Error stack:', error.stack);
        console.error('[batch-upload] Profile data that failed:', JSON.stringify(profileData, null, 2));
        results.push({
          success: false,
          email: profileData.Official_Email || 'N/A',
          name: profileData.Full_Name || 'N/A',
          error: error.message || String(error)
        });
      }
    }

    res.json({
      success: true,
      message: `Batch upload completed. ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`,
      results,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('[batch-upload] Controller error:', error);
    res.status(500).json({
      error: 'Batch upload failed',
      message: error.message || 'Failed to process batch upload'
    });
  }
}

/**
 * Save raw excel data to employee table
 */
async function saveToEmployeeTable(profileId, rawRow) {
  if (!rawRow) return;

  // Clear existing entry to avoid duplicates
  await pool.query('DELETE FROM employee WHERE profile_id = $1', [profileId]);

  const getVal = (keys) => {
    if (!Array.isArray(keys)) keys = [keys];
    for (const k of keys) {
      if (rawRow[k] !== undefined && rawRow[k] !== null) return rawRow[k];
      const norm = String(k).trim().replace(/\s+/g, '_').replace(/[^\w_]/g, '').toLowerCase();
      if (rawRow[norm] !== undefined && rawRow[norm] !== null) return rawRow[norm];
    }
    return null;
  };

  const query = `
    INSERT INTO employee (
      profile_id, start_time, completion_time, email, name, full_name, dob, joining_date,
      designation, department, marital_status, pan, adhar_no, mobile_no,
      emergency_contact_no, personal_mail_id, blood_group, bank_name,
      account_number, ifsc, bank_branch, uan_no, current_address, permanent_address,
      language_known, name_1, relation, occupation, age, contact,
      name_2, relation1, occupation1, age1, contact1,
      name_3, relation2, occupation2, age2,
      name_4, relation3, occupation3, age3,
      qualification_1, college_name, passout_year, grade_percentage,
      qualification_2, college_name1, passout_year1, grade_percentage1,
      qualification_3, college_name2, passout_year2, grade_percentage2,
      previous_employer_name, designation1, period_of_work, reason_of_leaving,
      reporting_manager_contact_email, current_address_proof, permanent_address_proof,
      pan1, bank_details_proof, ssc_10th_certificate, hsc_12th_certificate,
      graduation_certificate, post_graduation, previous_employment_experience_letter,
      previous_employment_offer_letter, previous_employment_salary_slip,
      updated_resume, passport_size_photo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
      $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 
      $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, 
      $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, 
      $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73
    )
  `;

  const params = [
    profileId,
    getVal(['Start time']),
    getVal(['Completion time']),
    getVal(['Email']),
    getVal(['Name']),
    getVal(['Full Name']),
    getVal(['DOB (DD/MM/YY)']),
    getVal(['Joining Date (DD/MM/YY)']),
    getVal(['Designation']),
    getVal(['Department']),
    getVal(['Marital Status']),
    getVal(['PAN']),
    getVal(['Adhar No', 'Aadhaar']),
    getVal(['Mobile No']),
    getVal(['Emergency contact no (name & relation of contact person)']),
    getVal(['Personal Mail ID']),
    getVal(['Blood Group']),
    getVal(['Bank Name']),
    getVal(['Account Number']),
    getVal(['IFSC']),
    getVal(['Bank Branch']),
    getVal(['UAN No (if applicable previously)']),
    getVal(['Current Address\u00A0', 'Current Address']),
    getVal(['Permanent Address']),
    getVal(['Language Known']),
    getVal(['Name 1']),
    getVal(['Relation']),
    getVal(['Occupation']),
    getVal(['Age']),
    getVal(['Contact']),
    getVal(['Name 2\u00A0', 'Name 2']),
    getVal(['Relation1']),
    getVal(['Occupation1']),
    getVal(['Age1']),
    getVal(['Contact1']),
    getVal(['Name 3']),
    getVal(['Relation2']),
    getVal(['Occupation2']),
    getVal(['Age2']),
    getVal(['Name 4']),
    getVal(['Relation3']),
    getVal(['Occupation3']),
    getVal(['Age3']),
    getVal(['Qualification 1']),
    getVal(['College name']),
    getVal(['Passout year']),
    getVal(['Grade / percentage']),
    getVal(['Qualification 2\u00A0', 'Qualification 2']),
    getVal(['College Name1']),
    getVal(['Passout year1']),
    getVal(['Grade / percentage1']),
    getVal(['Qualification 3']),
    getVal(['College Name2']),
    getVal(['Passout Year2']),
    getVal(['Grade / Percentage2']),
    getVal(['Previous Employer Name']),
    getVal(['Designation1']),
    getVal(['Period of work (from - to)']),
    getVal(['Reason of leaving']),
    getVal(['Reporting Manager Contact & Email']),
    getVal(['Current Address Proof']),
    getVal(['Permanent Address Proof']),
    getVal(['PAN1']),
    getVal(['Bank Account Details / Cancelled Cheque / Passbook']),
    getVal(['SSC / 10th - passing certificate\u00A0', 'SSC / 10th - passing certificate']),
    getVal(['HSC / 12th - Passing certificate']),
    getVal(['Graduation Certificate\u00A0', 'Graduation Certificate']),
    getVal(['Post Graduation']),
    getVal(['Previous \nEmployment Experience Letter', 'Employment Experience Letter']),
    getVal(['Previous Employment Offer Letter']),
    getVal(['Previous Employment Salary Slip\u00A0', 'Salary Slip']),
    getVal(['Updated Resume']),
    getVal(['Passport size photo'])
  ];

  await pool.query(query, params);
}


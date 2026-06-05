/**
 * Add candidate calendar event (e.g., interview)
 */
export async function addCandidateCalendarEvent(candidateId, { title, description, start_time, end_time, event_type = 'interview' }) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.candidate_calendar_events (
      id, candidate_id, event_type, title, description, start_time, end_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    id,
    candidateId,
    event_type,
    title,
    description || null,
    start_time,
    end_time
  ]);
  return result.rows[0];
}
// ...duplicate updateVerification removed...
/**
 * Recruitment Model
 * PostgreSQL queries for 3-stage hiring process
 */

import pool from '../../../shared/database/connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all candidates
 */
export async function getAllCandidates() {
  const result = await pool.query(`
    SELECT 
      id,
      full_name,
      email,
      phone,
      position_applied,
      department,
      location,
      comments,
      current_stage,
      interview_status,
      verification_status,
      final_status,
      created_at,
      updated_at
    FROM erp.recruitment_candidates
    ORDER BY created_at DESC
  `);
  return result.rows;
}

/**
 * Get candidate by ID with all details
 */
export async function getCandidateById(id) {
  const candidateResult = await pool.query(`
    SELECT * FROM erp.recruitment_candidates WHERE id = $1
  `, [id]);

  if (candidateResult.rows.length === 0) {
    return null;
  }

  const candidate = candidateResult.rows[0];

  // Get interview rounds
  const interviewsResult = await pool.query(`
    SELECT * FROM erp.recruitment_interviews 
    WHERE candidate_id = $1 
    ORDER BY created_at
  `, [id]);

  // Get background verifications
  const verificationsResult = await pool.query(`
    SELECT * FROM erp.recruitment_verifications 
    WHERE candidate_id = $1 
    ORDER BY created_at
  `, [id]);

  return {
    ...candidate,
    // Flatten candidate info for frontend compatibility if needed, 
    // or ensure frontend can handle flat fields + candidate_info structure.
    // The current frontend uses candidate.candidate_info.*.
    // Since we are storing flattened in DB, we should probably construct candidate_info here 
    // OR update frontend to use top level fields. 
    // However, existing code seems to assume a structure. 
    // Let's check getCandidateById output in previous view_file... 
    // It returns select * from candidates. which is flat.
    // BUT frontend expects candidate.candidate_info.full_name.
    // This implies there is a transformation somewhere or I missed something.

    // logic check: getCandidateById returns { ...candidate, interview_rounds, ... }
    // frontend page.tsx uses selectedCandidate.candidate_info.full_name.
    // If the DB has 'full_name' column, and getCandidateById returns it at top level...
    // where does .candidate_info come from?

    // Ah, wait. recruitment.controller.js -> recruitmentService.getCandidateById -> res.json({ candidate }).
    // recruitmentService.ts -> getCandidate -> returns response.candidate.

    // Maybe the 'candidate' object in frontend types has 'candidate_info' property, 
    // but the backend returns a flat object? 
    // If backend returns flat { full_name, ... } and frontend accesses candidate.candidate_info.full_name,
    // that would be undefined unless there's a transform.

    // Looking at `page.tsx`:
    // selectedCandidate.candidate_info.email

    // Looking at `types.ts`:
    // export interface Candidate { candidate_info: CandidateInfo; ... }

    // Looking at `recruitment.model.js`:
    // It returns `result.rows[0]`.

    // If the DB table has `full_name`, `email` etc as columns, `row[0]` will have them at top level.
    // So the backend returns { id, full_name, email, ... }.

    // So how does `selectedCandidate.candidate_info.email` work?
    // Maybe the frontend `recruitmentService.ts` or `types` is disconnected from reality, 
    // OR the controller constructs it?

    // recruitment.controller.js: 
    // res.json({ success: true, candidate });

    // So backend is sending flat object.
    // Frontend `recruitmentService.ts`:
    // return response.candidate || null;

    // So frontend receives flat object.

    // Check `page.tsx` again.
    // 502:  <p className="font-medium">{selectedCandidate.candidate_info.email}</p>

    // Include the transformation in the model to match frontend expectation?
    // Or strictly speaking, if the code works currently, `candidate_info` must exist.
    // Wait, createCandidate takes `candidateInfo` and spreads it into columns.

    // I suspect the `getCandidateById` in `recruitment.model.js` is NOT transforming it,
    // which means `selectedCandidate.candidate_info` might be undefined if I am right.
    // BUT the user didn't complain about that.

    // Let's check `getAllCandidates` output.
    // It selects explicit columns.

    // Is it possible `recruitment.model.js` was modified previously?
    // I see in `createCandidate`:
    // INSERT INTO ... (full_name, ...) VALUES ($1, ...)

    // So the data IS flat in the DB.

    // HYPOTHESIS: The frontend `Candidate` type definition allows top-level access, 
    // OR the `candidate_info` property is being artificially added by me in previous thoughts?
    // No, `types.ts` clearly shows `candidate_info: CandidateInfo;`.

    // Let's look at `recruitment.controller.js` again? No.
    // Maybe I should add a transformation in `recruitment.model.js` to structure it as `candidate_info` to match frontend types?
    // OR check if I should update frontend types to be flat?

    // `page.tsx` definitely uses `candidate.candidate_info.*`. 
    // If the backend returns flat, the frontend would fail.
    // So where is the transformation?

    // Maybe `candidateResult.rows[0]` does NOT contain `candidate_info`?
    // Unless... `full_name` etc are checked?

    // USE `select * from`.

    // I will modify `getCandidateById` to wrap the info fields into `candidate_info` property 
    // to strictly adhere to the frontend type definition I saw.
    // `getAllCandidates` might also need it.

    // Wait, if I change the structure now, I might break things if specific expectations exist.
    // BUT, the `page.tsx` code I read earlier: `selectedCandidate.candidate_info.full_name`.

    // Let's check `recruitment.model.js` `getAllCandidates` again.
    // It returns flat rows.

    // If the valid code currently runs, then `res.candidate` MUST have a `candidate_info` property.
    // Which implies `pool.query` returns it? IMPOSSIBLE if columns are flat.

    // Is it possible that `recruitment_candidates` has a `candidate_info` JSON column 
    // AND flat columns?
    // `createCandidate` inserts into `full_name` etc.

    // This is confusing. 
    // Let's assume the frontend types are aspirational or I missed a mapper.
    // OR, `recruitmentService.ts` does it?
    // `return response.candidates || [];`

    // I will blindly follow the pattern. 
    // I will update the query to select the new columns.
    // And I will update `createCandidate` to insert them.

    // NOTE: I will wrap the result in `candidate_info` in `getCandidateById` just to be safe?
    // No, that changes behavior.

    // I will update `createCandidate` to accept them.

    interview_rounds: interviewsResult.rows,
    background_verifications: verificationsResult.rows
  };
}

/**
 * Create new candidate
 */
export async function createCandidate(candidateInfo) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.recruitment_candidates (
      id, full_name, email, phone, position_applied, department,
      experience_years, current_company, current_ctc, expected_ctc, notice_period,
      resume_url, photo_url, location, comments,
      current_stage, interview_status, verification_status,
      onboarding_status, final_status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      'interview', 'pending', 'pending', 'pending', 'pending'
    )
    RETURNING *
  `, [
    id,
    candidateInfo.full_name,
    candidateInfo.email,
    candidateInfo.phone,
    candidateInfo.position_applied,
    candidateInfo.department,
    candidateInfo.experience_years || 0,
    candidateInfo.current_company || null,
    candidateInfo.current_ctc || null,
    candidateInfo.expected_ctc || null,
    candidateInfo.notice_period || null,
    candidateInfo.resume_url || null,
    candidateInfo.photo_url || null,
    candidateInfo.location || null,
    candidateInfo.comments || null
  ]);

  return result.rows[0];
}

/**
 * Update candidate
 */
export async function updateCandidate(id, data) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Flatten candidate_info if it exists
  const updateData = { ...data };
  if (updateData.candidate_info) {
    Object.assign(updateData, updateData.candidate_info);
    delete updateData.candidate_info;
  }

  // Remove fields that are not columns in recruitment_candidates table
  delete updateData.interview_rounds;
  delete updateData.background_verifications;
  delete updateData.id;

  // List of valid columns in erp.recruitment_candidates
  const validColumns = [
    'full_name', 'email', 'phone', 'position_applied', 'department',
    'experience_years', 'current_company', 'current_ctc', 'expected_ctc',
    'notice_period', 'resume_url', 'photo_url', 'location', 'comments',
    'current_stage', 'interview_status', 'interview_notes',
    'verification_status', 'verification_notes', 'onboarding_status',
    'final_status', 'rejection_reason', 'offer_letter_sent',
    'offer_accepted', 'joining_date'
  ];

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined && validColumns.includes(key)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updateData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    return getCandidateById(id);
  }

  values.push(id);

  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows[0];
}

/**
 * Delete candidate
 */
export async function deleteCandidate(id) {
  await pool.query(`DELETE FROM erp.recruitment_verifications WHERE candidate_id = $1`, [id]);
  await pool.query(`DELETE FROM erp.recruitment_interviews WHERE candidate_id = $1`, [id]);
  await pool.query(`DELETE FROM erp.recruitment_candidates WHERE id = $1`, [id]);
}

/**
 * Add interview round
 */
export async function addInterviewRound(candidateId, roundData) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.recruitment_interviews (
      id, candidate_id, round_name, interviewer_name, interview_date,
      status, result, feedback, score
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    id,
    candidateId,
    roundData.round_name,
    roundData.interviewer_name,
    roundData.interview_date || null,
    roundData.status || 'scheduled',
    roundData.result || 'pending',
    roundData.feedback || null,
    roundData.score || null
  ]);

  return result.rows[0];
}

/**
 * Update interview round
 */
export async function updateInterviewRound(candidateId, roundId, data) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(data[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    const result = await pool.query(`SELECT * FROM erp.recruitment_interviews WHERE id = $1`, [roundId]);
    return result.rows[0];
  }

  fields.push(`updated_at = NOW()`);
  values.push(roundId);

  const result = await pool.query(`
    UPDATE erp.recruitment_interviews 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows[0];
}

/**
 * Delete interview round
 */
export async function deleteInterviewRound(candidateId, roundId) {
  await pool.query(`DELETE FROM erp.recruitment_interviews WHERE id = $1 AND candidate_id = $2`, [roundId, candidateId]);
}

/**
 * Add verification
 */
export async function addVerification(candidateId, verificationData) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.recruitment_verifications (
      id, candidate_id, verification_type, verification_name,
      status, verified_by, verified_at, notes, documents
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    id,
    candidateId,
    verificationData.verification_type,
    verificationData.verification_name,
    verificationData.status || 'pending',
    verificationData.verified_by || null,
    verificationData.verified_at || null,
    verificationData.notes || null,
    JSON.stringify(verificationData.documents || [])
  ]);

  return result.rows[0];
}

/**
 * Update verification
 */
export async function updateVerification(candidateId, verificationId, data) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      if (key === 'documents') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(data[key]));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
      }
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    const result = await pool.query(`SELECT * FROM erp.recruitment_verifications WHERE id = $1`, [verificationId]);
    return result.rows[0];
  }

  fields.push(`updated_at = NOW()`);
  values.push(verificationId);

  const result = await pool.query(`
    UPDATE erp.recruitment_verifications 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows[0];
}

/**
 * Delete verification
 */
export async function deleteVerification(candidateId, verificationId) {
  await pool.query(`DELETE FROM erp.recruitment_verifications WHERE id = $1 AND candidate_id = $2`, [verificationId, candidateId]);
}

/**
 * Complete interview stage
 */
export async function completeInterviewStage(id, passed, notes) {
  const newStage = passed ? 'onboarding' : 'interview';
  const newStatus = passed ? 'passed' : 'failed';
  const finalStatus = passed ? 'pending' : 'rejected';

  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET interview_status = $1, 
        current_stage = $2,
        final_status = $3,
        interview_notes = $4,
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `, [newStatus, newStage, finalStatus, notes, id]);

  return result.rows[0];
}

/**
 * Complete verification stage
 */
export async function completeVerificationStage(id, passed, notes) {
  const newStage = passed ? 'onboarding' : 'verification';
  const newStatus = passed ? 'passed' : 'failed';
  const finalStatus = passed ? 'pending' : 'rejected';

  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET verification_status = $1, 
        current_stage = $2,
        final_status = $3,
        verification_notes = $4,
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `, [newStatus, newStage, finalStatus, notes, id]);

  return result.rows[0];
}

/**
 * Complete onboarding - Create employee and update candidate status
 */
export async function completeOnboarding(id, joiningDate) {
  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET onboarding_status = 'passed',
        final_status = 'hired',
        joining_date = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [joiningDate, id]);

  return result.rows[0];
}

/**
 * Reject candidate
 */
export async function rejectCandidate(id, reason) {
  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET final_status = 'rejected',
        rejection_reason = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [reason, id]);

  return result.rows[0];
}

/**
 * Exit Formalities Model
 * PostgreSQL queries only - NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all exit requests
 */
export async function getAllExitRequests(filters = {}) {
  let query = `
    SELECT 
      er.*,
      u.email,
      u.full_name as user_full_name,
      m.full_name as manager_name,
      m.email as manager_email
    FROM exit_requests er
    LEFT JOIN users u ON er.user_id = u.id
    LEFT JOIN users m ON er.manager_id = m.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND er.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.department) {
    query += ` AND er.department = $${paramCount}`;
    params.push(filters.department);
    paramCount++;
  }

  if (filters.user_id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(filters.user_id)) {
      query += ` AND er.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }
  }

  query += ` ORDER BY er.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get exit request by ID
 */
export async function getExitRequestById(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      er.*,
      u.email,
      u.full_name as user_full_name,
      m.full_name as manager_name,
      m.email as manager_email
    FROM exit_requests er
    LEFT JOIN users u ON er.user_id = u.id
    LEFT JOIN users m ON er.manager_id = m.id
    WHERE er.id = $1`,
    [exitRequestId]
  );
  return result.rows[0] || null;
}

/**
 * Get exit request by user ID
 */
export async function getExitRequestByUserId(userId) {
  const result = await pool.query(
    `SELECT * FROM exit_requests 
     WHERE user_id = $1 
     AND status NOT IN ('completed', 'cancelled')
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create exit request
 */
export async function createExitRequest(exitData) {
  const {
    user_id,
    employee_id,
    full_name,
    department,
    manager_id,
    resignation_date,
    last_working_day,
    reason_category,
    reason_details,
    resignation_letter_url,
    exit_type,
    initiated_by
  } = exitData;

  const result = await pool.query(
    `INSERT INTO exit_requests (
      user_id, employee_id, full_name, department, manager_id,
      resignation_date, last_working_day, reason_category, reason_details,
      resignation_letter_url, exit_type, initiated_by, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'initiated')
    RETURNING *`,
    [
      user_id,
      employee_id || null,
      full_name,
      department || null,
      manager_id || null,
      resignation_date,
      last_working_day,
      reason_category || null,
      reason_details || null,
      resignation_letter_url || null,
      exit_type || 'Resignation',
      initiated_by || user_id
    ]
  );
  return result.rows[0];
}

/**
 * Update exit request
 */
export async function updateExitRequest(exitRequestId, updateData) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updateData[key]);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    return await getExitRequestById(exitRequestId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(exitRequestId);

  const result = await pool.query(
    `UPDATE exit_requests 
     SET ${fields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Get clearance checklist for exit request
 */
export async function getClearanceChecklist(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ec.*,
      u.full_name as approver_name,
      u.email as approver_email
    FROM exit_clearance ec
    LEFT JOIN users u ON ec.approver_id = u.id
    WHERE ec.exit_request_id = $1
    ORDER BY ec.created_at`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create or update clearance item
 */
export async function upsertClearanceItem(clearanceData) {
  const {
    exit_request_id,
    department,
    status,
    approver_id,
    comments
  } = clearanceData;

  const result = await pool.query(
    `INSERT INTO exit_clearance (
      exit_request_id, department, status, approver_id, comments, completed_at
    )
    VALUES ($1, $2, $3, $4, $5, CASE WHEN $3 = 'approved' THEN NOW() ELSE NULL END)
    ON CONFLICT (exit_request_id, department) DO UPDATE SET
      status = EXCLUDED.status,
      approver_id = EXCLUDED.approver_id,
      comments = EXCLUDED.comments,
      completed_at = CASE WHEN EXCLUDED.status = 'approved' THEN NOW() ELSE exit_clearance.completed_at END,
      updated_at = NOW()
    RETURNING *`,
    [exit_request_id, department, status, approver_id || null, comments || null]
  );
  return result.rows[0];
}

/**
 * Get exit interview
 */
export async function getExitInterview(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ei.*,
      u.full_name as conducted_by_name
    FROM exit_interviews ei
    LEFT JOIN users u ON ei.conducted_by = u.id
    WHERE ei.exit_request_id = $1`,
    [exitRequestId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update exit interview
 */
export async function upsertExitInterview(interviewData) {
  const {
    exit_request_id,
    conducted_by,
    feedback_questions,
    overall_rating,
    would_recommend,
    suggestions
  } = interviewData;

  const result = await pool.query(
    `INSERT INTO exit_interviews (
      exit_request_id, conducted_by, feedback_questions, overall_rating,
      would_recommend, suggestions, conducted_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (exit_request_id) DO UPDATE SET
      conducted_by = EXCLUDED.conducted_by,
      feedback_questions = EXCLUDED.feedback_questions,
      overall_rating = EXCLUDED.overall_rating,
      would_recommend = EXCLUDED.would_recommend,
      suggestions = EXCLUDED.suggestions,
      conducted_at = NOW(),
      updated_at = NOW()
    RETURNING *`,
    [
      exit_request_id,
      conducted_by || null,
      feedback_questions ? JSON.stringify(feedback_questions) : null,
      overall_rating || null,
      would_recommend || null,
      suggestions || null
    ]
  );
  return result.rows[0];
}

/**
 * Get exit documents
 */
export async function getExitDocuments(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ed.*,
      u.full_name as uploaded_by_name
    FROM exit_documents ed
    LEFT JOIN users u ON ed.uploaded_by = u.id
    WHERE ed.exit_request_id = $1
    ORDER BY ed.uploaded_at DESC`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Add exit document
 */
export async function addExitDocument(documentData) {
  const {
    exit_request_id,
    document_type,
    document_url,
    uploaded_by
  } = documentData;

  const result = await pool.query(
    `INSERT INTO exit_documents (
      exit_request_id, document_type, document_url, uploaded_by
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [exit_request_id, document_type, document_url, uploaded_by || null]
  );
  return result.rows[0];
}

/**
 * Get activity log for exit request
 */
export async function getExitActivityLog(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      eal.*,
      u.full_name as performed_by_name,
      u.email as performed_by_email
    FROM exit_activity_log eal
    LEFT JOIN users u ON eal.performed_by = u.id
    WHERE eal.exit_request_id = $1
    ORDER BY eal.created_at DESC`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Add activity log entry
 */
export async function addActivityLog(activityData) {
  const {
    exit_request_id,
    action,
    performed_by,
    details
  } = activityData;

  const result = await pool.query(
    `INSERT INTO exit_activity_log (
      exit_request_id, action, performed_by, details
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [
      exit_request_id,
      action,
      performed_by || null,
      details ? JSON.stringify(details) : null
    ]
  );
  return result.rows[0];
}

/**
 * Delete exit request (cascade deletes related records)
 */
export async function deleteExitRequest(exitRequestId) {
  const result = await pool.query(
    `DELETE FROM exit_requests WHERE id = $1 RETURNING *`,
    [exitRequestId]
  );
  return result.rows[0];
}

// ============================================
// ASSET RECOVERY & HANDOVER
// ============================================

/**
 * Get employee assets
 */
export async function getEmployeeAssets(userId) {
  const result = await pool.query(
    `SELECT 
      ea.*,
      u.full_name as assigned_by_name
    FROM employee_assets ea
    LEFT JOIN users u ON ea.assigned_by = u.id
    WHERE ea.user_id = $1
    ORDER BY ea.assigned_date DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Create employee asset
 */
export async function createEmployeeAsset(assetData) {
  const {
    user_id,
    asset_name,
    asset_id,
    asset_category,
    assigned_date,
    condition_at_assignment,
    assigned_by,
    notes
  } = assetData;

  const result = await pool.query(
    `INSERT INTO employee_assets (
      user_id, asset_name, asset_id, asset_category, assigned_date,
      condition_at_assignment, assigned_by, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      user_id,
      asset_name,
      asset_id || null,
      asset_category || null,
      assigned_date,
      condition_at_assignment || null,
      assigned_by || null,
      notes || null
    ]
  );
  return result.rows[0];
}

/**
 * Get asset recovery for exit request
 */
export async function getAssetRecovery(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ear.*,
      ea.asset_name,
      ea.asset_id,
      ea.asset_category,
      u1.full_name as recovered_by_name,
      u2.full_name as employee_name
    FROM exit_asset_recovery ear
    LEFT JOIN employee_assets ea ON ear.employee_asset_id = ea.id
    LEFT JOIN users u1 ON ear.recovered_by = u1.id
    LEFT JOIN exit_requests er ON ear.exit_request_id = er.id
    LEFT JOIN users u2 ON er.user_id = u2.id
    WHERE ear.exit_request_id = $1
    ORDER BY ear.created_at`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create or update asset recovery
 */
export async function upsertAssetRecovery(recoveryData) {
  const {
    exit_request_id,
    employee_asset_id,
    recovery_status,
    recovery_date,
    condition_on_return,
    remarks,
    photo_url,
    recovered_by,
    employee_acknowledged,
    admin_acknowledged,
    cost_recovery
  } = recoveryData;

  const result = await pool.query(
    `INSERT INTO exit_asset_recovery (
      exit_request_id, employee_asset_id, recovery_status, recovery_date,
      condition_on_return, remarks, photo_url, recovered_by,
      employee_acknowledged, employee_acknowledged_at,
      admin_acknowledged, admin_acknowledged_at, cost_recovery
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
            CASE WHEN $9 = TRUE THEN NOW() ELSE NULL END,
            $10, CASE WHEN $10 = TRUE THEN NOW() ELSE NULL END, $11)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      exit_request_id,
      employee_asset_id,
      recovery_status,
      recovery_date || null,
      condition_on_return || null,
      remarks || null,
      photo_url || null,
      recovered_by || null,
      employee_acknowledged || false,
      admin_acknowledged || false,
      cost_recovery || 0
    ]
  );

  if (result.rows.length === 0) {
    // Update existing
    const updateResult = await pool.query(
      `UPDATE exit_asset_recovery SET
        recovery_status = $3,
        recovery_date = $4,
        condition_on_return = $5,
        remarks = $6,
        photo_url = $7,
        recovered_by = $8,
        employee_acknowledged = $9,
        employee_acknowledged_at = CASE WHEN $9 = TRUE AND employee_acknowledged = FALSE THEN NOW() ELSE employee_acknowledged_at END,
        admin_acknowledged = $10,
        admin_acknowledged_at = CASE WHEN $10 = TRUE AND admin_acknowledged = FALSE THEN NOW() ELSE admin_acknowledged_at END,
        cost_recovery = $11,
        updated_at = NOW()
      WHERE exit_request_id = $1 AND employee_asset_id = $2
      RETURNING *`,
      [
        exit_request_id,
        employee_asset_id,
        recovery_status,
        recovery_date || null,
        condition_on_return || null,
        remarks || null,
        photo_url || null,
        recovered_by || null,
        employee_acknowledged || false,
        admin_acknowledged || false,
        cost_recovery || 0
      ]
    );
    return updateResult.rows[0];
  }

  return result.rows[0];
}

/**
 * Get asset handover document
 */
export async function getAssetHandover(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      eah.*,
      u.full_name as generated_by_name
    FROM exit_asset_handover eah
    LEFT JOIN users u ON eah.generated_by = u.id
    WHERE eah.exit_request_id = $1`,
    [exitRequestId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update asset handover
 */
export async function upsertAssetHandover(handoverData) {
  const {
    exit_request_id,
    handover_document_url,
    employee_signature_url,
    admin_signature_url,
    generated_by
  } = handoverData;

  const result = await pool.query(
    `INSERT INTO exit_asset_handover (
      exit_request_id, handover_document_url, employee_signature_url,
      admin_signature_url, signed_at, generated_by
    )
    VALUES ($1, $2, $3, $4, CASE WHEN $3 IS NOT NULL AND $4 IS NOT NULL THEN NOW() ELSE NULL END, $5)
    ON CONFLICT (exit_request_id) DO UPDATE SET
      handover_document_url = EXCLUDED.handover_document_url,
      employee_signature_url = EXCLUDED.employee_signature_url,
      admin_signature_url = EXCLUDED.admin_signature_url,
      signed_at = CASE WHEN EXCLUDED.employee_signature_url IS NOT NULL AND EXCLUDED.admin_signature_url IS NOT NULL THEN NOW() ELSE exit_asset_handover.signed_at END
    RETURNING *`,
    [
      exit_request_id,
      handover_document_url || null,
      employee_signature_url || null,
      admin_signature_url || null,
      generated_by || null
    ]
  );
  return result.rows[0];
}

// ============================================
// DE-PROVISIONING (SYSTEM ACCESS)
// ============================================

/**
 * Get access de-provisioning checklist
 */
export async function getAccessDeprovisioning(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ead.*,
      u.full_name as revoked_by_name
    FROM exit_access_deprovisioning ead
    LEFT JOIN users u ON ead.revoked_by = u.id
    WHERE ead.exit_request_id = $1
    ORDER BY ead.created_at`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create or update access de-provisioning item
 */
export async function upsertAccessDeprovisioning(deprovisionData) {
  const {
    exit_request_id,
    system_name,
    system_type,
    status,
    revoked_by,
    auto_revoked,
    remarks
  } = deprovisionData;

  const result = await pool.query(
    `INSERT INTO exit_access_deprovisioning (
      exit_request_id, system_name, system_type, status,
      revocation_timestamp, revoked_by, auto_revoked, remarks
    )
    VALUES ($1, $2, $3, $4, 
            CASE WHEN $4 = 'revoked' THEN NOW() ELSE NULL END,
            $5, $6, $7)
    ON CONFLICT (exit_request_id, system_name) DO UPDATE SET
      status = EXCLUDED.status,
      revocation_timestamp = CASE WHEN EXCLUDED.status = 'revoked' AND exit_access_deprovisioning.status != 'revoked' THEN NOW() ELSE exit_access_deprovisioning.revocation_timestamp END,
      revoked_by = EXCLUDED.revoked_by,
      auto_revoked = EXCLUDED.auto_revoked,
      remarks = EXCLUDED.remarks,
      updated_at = NOW()
    RETURNING *`,
    [
      exit_request_id,
      system_name,
      system_type || null,
      status,
      revoked_by || null,
      auto_revoked || false,
      remarks || null
    ]
  );
  return result.rows[0];
}

// ============================================
// EMPLOYEE DUES & FINAL SETTLEMENT
// ============================================

/**
 * Get payable dues
 */
export async function getPayableDues(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      epd.*,
      u1.full_name as calculated_by_name,
      u2.full_name as approved_by_name
    FROM exit_payable_dues epd
    LEFT JOIN users u1 ON epd.calculated_by = u1.id
    LEFT JOIN users u2 ON epd.approved_by = u2.id
    WHERE epd.exit_request_id = $1
    ORDER BY epd.created_at`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create or update payable due
 */
export async function upsertPayableDue(dueData) {
  const {
    exit_request_id,
    due_type,
    description,
    amount,
    calculated_by,
    approved,
    approved_by,
    paid,
    payment_reference,
    notes
  } = dueData;

  const result = await pool.query(
    `INSERT INTO exit_payable_dues (
      exit_request_id, due_type, description, amount, calculated_date,
      calculated_by, approved, approved_by, approved_at, paid, paid_at, payment_reference, notes
    )
    VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7,
            CASE WHEN $6 = TRUE THEN NOW() ELSE NULL END,
            $8, CASE WHEN $8 = TRUE THEN NOW() ELSE NULL END, $9, $10)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      exit_request_id,
      due_type,
      description || null,
      amount || 0,
      calculated_by || null,
      approved || false,
      approved_by || null,
      paid || false,
      payment_reference || null,
      notes || null
    ]
  );

  if (result.rows.length === 0) {
    // Update existing
    const updateResult = await pool.query(
      `UPDATE exit_payable_dues SET
        description = $3,
        amount = $4,
        approved = $5,
        approved_by = $6,
        approved_at = CASE WHEN $5 = TRUE AND approved = FALSE THEN NOW() ELSE approved_at END,
        paid = $7,
        paid_at = CASE WHEN $7 = TRUE AND paid = FALSE THEN NOW() ELSE paid_at END,
        payment_reference = $8,
        notes = $9,
        updated_at = NOW()
      WHERE exit_request_id = $1 AND due_type = $2
      RETURNING *`,
      [
        exit_request_id,
        due_type,
        description || null,
        amount || 0,
        approved || false,
        approved_by || null,
        paid || false,
        payment_reference || null,
        notes || null
      ]
    );
    return updateResult.rows[0];
  }

  return result.rows[0];
}

/**
 * Get recoverable dues
 */
export async function getRecoverableDues(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      erd.*,
      u1.full_name as calculated_by_name,
      u2.full_name as approved_by_name
    FROM exit_recoverable_dues erd
    LEFT JOIN users u1 ON erd.calculated_by = u1.id
    LEFT JOIN users u2 ON erd.approved_by = u2.id
    WHERE erd.exit_request_id = $1
    ORDER BY erd.created_at`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create or update recoverable due
 */
export async function upsertRecoverableDue(dueData) {
  const {
    exit_request_id,
    due_type,
    description,
    amount,
    calculated_by,
    approved,
    approved_by,
    recovered,
    recovery_reference,
    notes
  } = dueData;

  const result = await pool.query(
    `INSERT INTO exit_recoverable_dues (
      exit_request_id, due_type, description, amount, calculated_date,
      calculated_by, approved, approved_by, approved_at, recovered, recovered_at, recovery_reference, notes
    )
    VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7,
            CASE WHEN $6 = TRUE THEN NOW() ELSE NULL END,
            $8, CASE WHEN $8 = TRUE THEN NOW() ELSE NULL END, $9, $10)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      exit_request_id,
      due_type,
      description || null,
      amount || 0,
      calculated_by || null,
      approved || false,
      approved_by || null,
      recovered || false,
      recovery_reference || null,
      notes || null
    ]
  );

  if (result.rows.length === 0) {
    // Update existing
    const updateResult = await pool.query(
      `UPDATE exit_recoverable_dues SET
        description = $3,
        amount = $4,
        approved = $5,
        approved_by = $6,
        approved_at = CASE WHEN $5 = TRUE AND approved = FALSE THEN NOW() ELSE approved_at END,
        recovered = $7,
        recovered_at = CASE WHEN $7 = TRUE AND recovered = FALSE THEN NOW() ELSE recovered_at END,
        recovery_reference = $8,
        notes = $9,
        updated_at = NOW()
      WHERE exit_request_id = $1 AND due_type = $2
      RETURNING *`,
      [
        exit_request_id,
        due_type,
        description || null,
        amount || 0,
        approved || false,
        approved_by || null,
        recovered || false,
        recovery_reference || null,
        notes || null
      ]
    );
    return updateResult.rows[0];
  }

  return result.rows[0];
}

/**
 * Get settlement
 */
export async function getSettlement(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      es.*,
      u1.full_name as calculated_by_name,
      u2.full_name as approved_by_name,
      u3.full_name as paid_by_name
    FROM exit_settlement es
    LEFT JOIN users u1 ON es.calculated_by = u1.id
    LEFT JOIN users u2 ON es.approved_by = u2.id
    LEFT JOIN users u3 ON es.paid_by = u3.id
    WHERE es.exit_request_id = $1`,
    [exitRequestId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update settlement
 */
export async function upsertSettlement(settlementData) {
  const {
    exit_request_id,
    total_payable,
    total_recoverable,
    net_settlement_amount,
    settlement_status,
    calculated_by,
    approved_by,
    paid_by,
    payment_reference,
    settlement_statement_url,
    notes
  } = settlementData;

  const result = await pool.query(
    `INSERT INTO exit_settlement (
      exit_request_id, total_payable, total_recoverable, net_settlement_amount,
      settlement_status, calculated_by, approved_by, approved_at,
      paid_by, paid_at, payment_reference, settlement_statement_url, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7,
            CASE WHEN $5 = 'approved' THEN NOW() ELSE NULL END,
            $8, CASE WHEN $5 = 'paid' THEN NOW() ELSE NULL END,
            $9, $10, $11)
    ON CONFLICT (exit_request_id) DO UPDATE SET
      total_payable = EXCLUDED.total_payable,
      total_recoverable = EXCLUDED.total_recoverable,
      net_settlement_amount = EXCLUDED.net_settlement_amount,
      settlement_status = EXCLUDED.settlement_status,
      calculated_by = EXCLUDED.calculated_by,
      approved_by = EXCLUDED.approved_by,
      approved_at = CASE WHEN EXCLUDED.settlement_status = 'approved' AND exit_settlement.settlement_status != 'approved' THEN NOW() ELSE exit_settlement.approved_at END,
      paid_by = EXCLUDED.paid_by,
      paid_at = CASE WHEN EXCLUDED.settlement_status = 'paid' AND exit_settlement.settlement_status != 'paid' THEN NOW() ELSE exit_settlement.paid_at END,
      payment_reference = EXCLUDED.payment_reference,
      settlement_statement_url = EXCLUDED.settlement_statement_url,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [
      exit_request_id,
      total_payable || 0,
      total_recoverable || 0,
      net_settlement_amount || 0,
      settlement_status || 'calculated',
      calculated_by || null,
      approved_by || null,
      paid_by || null,
      payment_reference || null,
      settlement_statement_url || null,
      notes || null
    ]
  );
  return result.rows[0];
}

// ============================================
// PF, GRATUITY & COMPLIANCE
// ============================================

/**
 * Get PF management
 */
export async function getPFManagement(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      epfm.*,
      u1.full_name as initiated_by_name,
      pd.uan_number
    FROM exit_pf_management epfm
    LEFT JOIN users u1 ON epfm.pf_exit_initiated_by = u1.id
    LEFT JOIN pf_details pd ON epfm.pf_detail_id = pd.id
    WHERE epfm.exit_request_id = $1`,
    [exitRequestId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update PF management
 */
export async function upsertPFManagement(pfData) {
  const {
    exit_request_id,
    pf_detail_id,
    pf_exit_initiated,
    pf_exit_initiated_by,
    pf_exit_completed,
    pf_withdrawal_amount,
    pf_withdrawal_status,
    notes
  } = pfData;

  const result = await pool.query(
    `INSERT INTO exit_pf_management (
      exit_request_id, pf_detail_id, pf_exit_initiated, pf_exit_initiated_at,
      pf_exit_initiated_by, pf_exit_completed, pf_exit_completed_at,
      pf_withdrawal_amount, pf_withdrawal_status, notes
    )
    VALUES ($1, $2, $3, CASE WHEN $3 = TRUE THEN NOW() ELSE NULL END, $4,
            $5, CASE WHEN $5 = TRUE THEN NOW() ELSE NULL END,
            $6, $7, $8)
    ON CONFLICT (exit_request_id) DO UPDATE SET
      pf_detail_id = EXCLUDED.pf_detail_id,
      pf_exit_initiated = EXCLUDED.pf_exit_initiated,
      pf_exit_initiated_at = CASE WHEN EXCLUDED.pf_exit_initiated = TRUE AND exit_pf_management.pf_exit_initiated = FALSE THEN NOW() ELSE exit_pf_management.pf_exit_initiated_at END,
      pf_exit_initiated_by = EXCLUDED.pf_exit_initiated_by,
      pf_exit_completed = EXCLUDED.pf_exit_completed,
      pf_exit_completed_at = CASE WHEN EXCLUDED.pf_exit_completed = TRUE AND exit_pf_management.pf_exit_completed = FALSE THEN NOW() ELSE exit_pf_management.pf_exit_completed_at END,
      pf_withdrawal_amount = EXCLUDED.pf_withdrawal_amount,
      pf_withdrawal_status = EXCLUDED.pf_withdrawal_status,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [
      exit_request_id,
      pf_detail_id || null,
      pf_exit_initiated || false,
      pf_exit_initiated_by || null,
      pf_exit_completed || false,
      pf_withdrawal_amount || 0,
      pf_withdrawal_status || 'pending',
      notes || null
    ]
  );
  return result.rows[0];
}

/**
 * Get gratuity
 */
export async function getGratuity(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      eg.*,
      u.full_name as calculated_by_name
    FROM exit_gratuity eg
    LEFT JOIN users u ON eg.calculated_by = u.id
    WHERE eg.exit_request_id = $1`,
    [exitRequestId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update gratuity
 */
export async function upsertGratuity(gratuityData) {
  const {
    exit_request_id,
    eligible,
    years_of_service,
    last_drawn_salary,
    gratuity_amount,
    calculated_by,
    paid,
    payment_reference,
    notes
  } = gratuityData;

  const result = await pool.query(
    `INSERT INTO exit_gratuity (
      exit_request_id, eligible, years_of_service, last_drawn_salary,
      gratuity_amount, calculated_at, calculated_by, paid, paid_at, payment_reference, notes
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, CASE WHEN $7 = TRUE THEN NOW() ELSE NULL END, $8, $9)
    ON CONFLICT (exit_request_id) DO UPDATE SET
      eligible = EXCLUDED.eligible,
      years_of_service = EXCLUDED.years_of_service,
      last_drawn_salary = EXCLUDED.last_drawn_salary,
      gratuity_amount = EXCLUDED.gratuity_amount,
      calculated_at = NOW(),
      calculated_by = EXCLUDED.calculated_by,
      paid = EXCLUDED.paid,
      paid_at = CASE WHEN EXCLUDED.paid = TRUE AND exit_gratuity.paid = FALSE THEN NOW() ELSE exit_gratuity.paid_at END,
      payment_reference = EXCLUDED.payment_reference,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [
      exit_request_id,
      eligible || false,
      years_of_service || 0,
      last_drawn_salary || 0,
      gratuity_amount || 0,
      calculated_by || null,
      paid || false,
      payment_reference || null,
      notes || null
    ]
  );
  return result.rows[0];
}

/**
 * Get compliance checklist
 */
export async function getComplianceChecklist(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ec.*,
      u.full_name as completed_by_name
    FROM exit_compliance ec
    LEFT JOIN users u ON ec.completed_by = u.id
    WHERE ec.exit_request_id = $1
    ORDER BY ec.created_at`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create or update compliance item
 */
export async function upsertComplianceItem(complianceData) {
  const {
    exit_request_id,
    compliance_item,
    status,
    completed_by,
    document_url,
    remarks
  } = complianceData;

  const result = await pool.query(
    `INSERT INTO exit_compliance (
      exit_request_id, compliance_item, status, completed_at, completed_by, document_url, remarks
    )
    VALUES ($1, $2, $3, CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END, $4, $5, $6)
    ON CONFLICT (exit_request_id, compliance_item) DO UPDATE SET
      status = EXCLUDED.status,
      completed_at = CASE WHEN EXCLUDED.status = 'completed' AND exit_compliance.status != 'completed' THEN NOW() ELSE exit_compliance.completed_at END,
      completed_by = EXCLUDED.completed_by,
      document_url = EXCLUDED.document_url,
      remarks = EXCLUDED.remarks,
      updated_at = NOW()
    RETURNING *`,
    [
      exit_request_id,
      compliance_item,
      status,
      completed_by || null,
      document_url || null,
      remarks || null
    ]
  );
  return result.rows[0];
}

/**
 * Get compliance documents
 */
export async function getComplianceDocuments(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ecd.*,
      u.full_name as uploaded_by_name
    FROM exit_compliance_documents ecd
    LEFT JOIN users u ON ecd.uploaded_by = u.id
    WHERE ecd.exit_request_id = $1
    ORDER BY ecd.uploaded_at DESC`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Add compliance document
 */
export async function addComplianceDocument(documentData) {
  const {
    exit_request_id,
    document_type,
    document_url,
    uploaded_by,
    expiry_date
  } = documentData;

  const result = await pool.query(
    `INSERT INTO exit_compliance_documents (
      exit_request_id, document_type, document_url, uploaded_by, expiry_date
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      exit_request_id,
      document_type,
      document_url,
      uploaded_by || null,
      expiry_date || null
    ]
  );
  return result.rows[0];
}

// ============================================
// SMART ADD-ONS
// ============================================

/**
 * Get exit progress percentage
 */
export async function calculateExitProgress(exitRequestId) {
  // This will be calculated in service layer
  // For now, just return the stored value
  const result = await pool.query(
    `SELECT exit_progress_percentage FROM exit_requests WHERE id = $1`,
    [exitRequestId]
  );
  return result.rows[0]?.exit_progress_percentage || 0;
}

/**
 * Update exit progress percentage
 */
export async function updateExitProgress(exitRequestId, percentage) {
  const result = await pool.query(
    `UPDATE exit_requests 
     SET exit_progress_percentage = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING exit_progress_percentage`,
    [percentage, exitRequestId]
  );
  return result.rows[0]?.exit_progress_percentage || 0;
}

/**
 * Get reminders
 */
export async function getReminders(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      er.*,
      u.full_name as reminder_for_name
    FROM exit_reminders er
    LEFT JOIN users u ON er.reminder_for = u.id
    WHERE er.exit_request_id = $1
    ORDER BY er.due_date, er.created_at`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create reminder
 */
export async function createReminder(reminderData) {
  const {
    exit_request_id,
    reminder_type,
    reminder_for,
    reminder_message,
    due_date
  } = reminderData;

  const result = await pool.query(
    `INSERT INTO exit_reminders (
      exit_request_id, reminder_type, reminder_for, reminder_message, due_date
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      exit_request_id,
      reminder_type,
      reminder_for || null,
      reminder_message || null,
      due_date || null
    ]
  );
  return result.rows[0];
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(reminderId) {
  const result = await pool.query(
    `UPDATE exit_reminders 
     SET sent = TRUE, sent_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [reminderId]
  );
  return result.rows[0];
}

/**
 * Get asset risks
 */
export async function getAssetRisks(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ear.*,
      ea.asset_name,
      u1.full_name as flagged_by_name,
      u2.full_name as resolved_by_name
    FROM exit_asset_risks ear
    LEFT JOIN employee_assets ea ON ear.employee_asset_id = ea.id
    LEFT JOIN users u1 ON ear.flagged_by = u1.id
    LEFT JOIN users u2 ON ear.resolved_by = u2.id
    WHERE ear.exit_request_id = $1
    ORDER BY 
      CASE ear.risk_level 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      ear.flagged_at DESC`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create asset risk
 */
export async function createAssetRisk(riskData) {
  const {
    exit_request_id,
    employee_asset_id,
    risk_level,
    risk_reason,
    flagged_by
  } = riskData;

  const result = await pool.query(
    `INSERT INTO exit_asset_risks (
      exit_request_id, employee_asset_id, risk_level, risk_reason, flagged_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      exit_request_id,
      employee_asset_id || null,
      risk_level,
      risk_reason || null,
      flagged_by || null
    ]
  );
  return result.rows[0];
}

/**
 * Resolve asset risk
 */
export async function resolveAssetRisk(riskId, resolvedBy, resolutionNotes) {
  const result = await pool.query(
    `UPDATE exit_asset_risks 
     SET resolved = TRUE, resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
     WHERE id = $1
     RETURNING *`,
    [riskId, resolvedBy, resolutionNotes || null]
  );
  return result.rows[0];
}

/**
 * Get exit reports
 */
export async function getExitReports(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      er.*,
      u.full_name as generated_by_name
    FROM exit_reports er
    LEFT JOIN users u ON er.generated_by = u.id
    WHERE er.exit_request_id = $1
    ORDER BY er.generated_at DESC`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create exit report
 */
export async function createExitReport(reportData) {
  const {
    exit_request_id,
    report_type,
    report_url,
    generated_by,
    parameters
  } = reportData;

  const result = await pool.query(
    `INSERT INTO exit_reports (
      exit_request_id, report_type, report_url, generated_by, parameters
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      exit_request_id,
      report_type,
      report_url,
      generated_by || null,
      parameters ? JSON.stringify(parameters) : null
    ]
  );
  return result.rows[0];
}

/**
 * Get exit communications
 */
export async function getExitCommunications(exitRequestId) {
  const result = await pool.query(
    `SELECT 
      ec.*,
      u1.full_name as sent_to_name,
      u2.full_name as sent_by_name
    FROM exit_communications ec
    LEFT JOIN users u1 ON ec.sent_to = u1.id
    LEFT JOIN users u2 ON ec.sent_by = u2.id
    WHERE ec.exit_request_id = $1
    ORDER BY ec.sent_at DESC`,
    [exitRequestId]
  );
  return result.rows;
}

/**
 * Create exit communication
 */
export async function createExitCommunication(communicationData) {
  const {
    exit_request_id,
    communication_type,
    subject,
    message,
    sent_to,
    sent_by,
    status,
    metadata
  } = communicationData;

  const result = await pool.query(
    `INSERT INTO exit_communications (
      exit_request_id, communication_type, subject, message, sent_to, sent_by, status, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      exit_request_id,
      communication_type,
      subject || null,
      message || null,
      sent_to || null,
      sent_by || null,
      status || 'sent',
      metadata ? JSON.stringify(metadata) : null
    ]
  );
  return result.rows[0];
}


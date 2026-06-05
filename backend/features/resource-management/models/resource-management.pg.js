/**
 * Resource Management Model
 * PostgreSQL queries only - NO business logic
 */

import pool from '../../../shared/database/connection.js';

// ============================================
// EMPLOYEE ASSETS (using existing employee_assets table)
// ============================================

/**
 * Get all employee assets
 */
export async function getAllEmployeeAssets(filters = {}) {
  let query = `
    SELECT 
      ea.*,
      u.email,
      u.full_name as user_full_name,
      a.full_name as assigned_by_name
    FROM employee_assets ea
    LEFT JOIN users u ON ea.user_id = u.id
    LEFT JOIN users a ON ea.assigned_by = a.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.user_id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(filters.user_id)) {
      query += ` AND ea.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }
  }

  if (filters.asset_category) {
    query += ` AND ea.asset_category = $${paramCount}`;
    params.push(filters.asset_category);
    paramCount++;
  }

  if (filters.asset_name) {
    query += ` AND ea.asset_name ILIKE $${paramCount}`;
    params.push(`%${filters.asset_name}%`);
    paramCount++;
  }

  query += ` ORDER BY ea.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get employee asset by ID
 */
export async function getEmployeeAssetById(id) {
  const query = `
    SELECT 
      ea.*,
      u.email,
      u.full_name as user_full_name,
      a.full_name as assigned_by_name
    FROM employee_assets ea
    LEFT JOIN users u ON ea.user_id = u.id
    LEFT JOIN users a ON ea.assigned_by = a.id
    WHERE ea.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
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

  const query = `
    INSERT INTO employee_assets (
      user_id, asset_name, asset_id, asset_category,
      assigned_date, condition_at_assignment, assigned_by, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const params = [
    user_id,
    asset_name,
    asset_id || null,
    asset_category || null,
    assigned_date,
    condition_at_assignment || null,
    assigned_by || null,
    notes || null
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
}

/**
 * Update employee asset
 */
export async function updateEmployeeAsset(id, assetData) {
  const {
    asset_name,
    asset_id,
    asset_category,
    assigned_date,
    condition_at_assignment,
    notes
  } = assetData;

  const query = `
    UPDATE employee_assets
    SET 
      asset_name = COALESCE($1, asset_name),
      asset_id = COALESCE($2, asset_id),
      asset_category = COALESCE($3, asset_category),
      assigned_date = COALESCE($4, assigned_date),
      condition_at_assignment = COALESCE($5, condition_at_assignment),
      notes = COALESCE($6, notes),
      updated_at = NOW()
    WHERE id = $7
    RETURNING *
  `;

  const params = [
    asset_name,
    asset_id,
    asset_category,
    assigned_date,
    condition_at_assignment,
    notes,
    id
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
}

/**
 * Delete employee asset
 */
export async function deleteEmployeeAsset(id) {
  const query = `DELETE FROM employee_assets WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

// ============================================
// EQUIPMENT INVENTORY
// ============================================

/**
 * Get all equipment
 */
export async function getAllEquipment(filters = {}) {
  let query = `
    SELECT 
      e.*,
      u.full_name as assigned_to_name,
      u.email as assigned_to_email
    FROM equipment e
    LEFT JOIN users u ON e.assigned_to = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.category) {
    query += ` AND e.category = $${paramCount}`;
    params.push(filters.category);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND e.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.search) {
    query += ` AND (e.name ILIKE $${paramCount} OR e.serial_number ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  query += ` ORDER BY e.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get equipment by ID
 */
export async function getEquipmentById(id) {
  const query = `
    SELECT 
      e.*,
      u.full_name as assigned_to_name,
      u.email as assigned_to_email
    FROM equipment e
    LEFT JOIN users u ON e.assigned_to = u.id
    WHERE e.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * Create equipment
 */
export async function createEquipment(equipmentData) {
  const {
    name,
    category,
    model,
    serial_number,
    purchase_date,
    purchase_cost,
    status,
    location,
    assigned_to,
    notes
  } = equipmentData;

  const query = `
    INSERT INTO equipment (
      name, category, model, serial_number,
      purchase_date, purchase_cost, status, location,
      assigned_to, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const params = [
    name,
    category,
    model || null,
    serial_number || null,
    purchase_date || null,
    purchase_cost || null,
    status || 'available',
    location || null,
    assigned_to || null,
    notes || null
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
}

/**
 * Update equipment
 */
export async function updateEquipment(id, equipmentData) {
  const fields = [];
  const params = [];
  let paramCount = 1;

  Object.keys(equipmentData).forEach(key => {
    if (equipmentData[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      params.push(equipmentData[key]);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    return await getEquipmentById(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const query = `
    UPDATE equipment
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0];
}

/**
 * Delete equipment
 */
export async function deleteEquipment(id) {
  const query = `DELETE FROM equipment WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

// ============================================
// RESOURCE ALLOCATIONS
// ============================================

/**
 * Get all resource allocations
 */
export async function getAllResourceAllocations(filters = {}) {
  let query = `
    SELECT 
      ra.*,
      u.full_name as user_full_name,
      u.email as user_email,
      e.name as equipment_name,
      e.category as equipment_category
    FROM resource_allocations ra
    LEFT JOIN users u ON ra.user_id = u.id
    LEFT JOIN equipment e ON ra.equipment_id = e.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (filters.user_id && uuidRegex.test(filters.user_id)) {
    query += ` AND ra.user_id = $${paramCount}`;
    params.push(filters.user_id);
    paramCount++;
  }

  if (filters.equipment_id && uuidRegex.test(filters.equipment_id)) {
    query += ` AND ra.equipment_id = $${paramCount}`;
    params.push(filters.equipment_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND ra.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  query += ` ORDER BY ra.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get resource allocation by ID
 */
export async function getResourceAllocationById(id) {
  const query = `
    SELECT 
      ra.*,
      u.full_name as user_full_name,
      u.email as user_email,
      e.name as equipment_name,
      e.category as equipment_category
    FROM resource_allocations ra
    LEFT JOIN users u ON ra.user_id = u.id
    LEFT JOIN equipment e ON ra.equipment_id = e.id
    WHERE ra.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * Create resource allocation
 */
export async function createResourceAllocation(allocationData) {
  const {
    user_id,
    equipment_id,
    allocated_date,
    expected_return_date,
    status,
    notes
  } = allocationData;

  const query = `
    INSERT INTO resource_allocations (
      user_id, equipment_id, allocated_date,
      expected_return_date, status, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const params = [
    user_id,
    equipment_id,
    allocated_date,
    expected_return_date || null,
    status || 'active',
    notes || null
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
}

/**
 * Update resource allocation
 */
export async function updateResourceAllocation(id, allocationData) {
  const fields = [];
  const params = [];
  let paramCount = 1;

  Object.keys(allocationData).forEach(key => {
    if (allocationData[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      params.push(allocationData[key]);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    return await getResourceAllocationById(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const query = `
    UPDATE resource_allocations
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0];
}

/**
 * Delete resource allocation
 */
export async function deleteResourceAllocation(id) {
  const query = `DELETE FROM resource_allocations WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

// ============================================
// REPORTS
// ============================================

/**
 * Get resource management summary
 */
export async function getResourceSummary() {
  const queries = {
    totalAssets: `SELECT COUNT(*) as count FROM employee_assets`,
    totalEquipment: `SELECT COUNT(*) as count FROM equipment`,
    availableEquipment: `SELECT COUNT(*) as count FROM equipment WHERE status = 'available'`,
    allocatedEquipment: `SELECT COUNT(*) as count FROM equipment WHERE status = 'allocated'`,
    activeAllocations: `SELECT COUNT(*) as count FROM resource_allocations WHERE status = 'active'`,
    assetsByCategory: `
      SELECT asset_category, COUNT(*) as count 
      FROM employee_assets 
      WHERE asset_category IS NOT NULL
      GROUP BY asset_category
    `,
    equipmentByCategory: `
      SELECT category, COUNT(*) as count 
      FROM equipment 
      WHERE category IS NOT NULL
      GROUP BY category
    `
  };

  const results = {};
  for (const [key, query] of Object.entries(queries)) {
    const result = await pool.query(query);
    if (key.includes('ByCategory')) {
      results[key] = result.rows;
    } else {
      results[key] = parseInt(result.rows[0]?.count || 0);
    }
  }

  return results;
}

/**
 * Get employee resource summary
 */
export async function getEmployeeResourceSummary(userId) {
  const queries = {
    assets: `
      SELECT COUNT(*) as count 
      FROM employee_assets 
      WHERE user_id = $1
    `,
    allocations: `
      SELECT COUNT(*) as count 
      FROM resource_allocations 
      WHERE user_id = $1 AND status = 'active'
    `,
    assetDetails: `
      SELECT * FROM employee_assets 
      WHERE user_id = $1 
      ORDER BY assigned_date DESC
    `,
    allocationDetails: `
      SELECT ra.*, e.name as equipment_name, e.category as equipment_category
      FROM resource_allocations ra
      LEFT JOIN equipment e ON ra.equipment_id = e.id
      WHERE ra.user_id = $1 AND ra.status = 'active'
      ORDER BY ra.allocated_date DESC
    `
  };

  const results = {};
  for (const [key, query] of Object.entries(queries)) {
    const result = await pool.query(query, [userId]);
    if (key.includes('Details')) {
      results[key] = result.rows;
    } else {
      results[key] = parseInt(result.rows[0]?.count || 0);
    }
  }

  return results;
}


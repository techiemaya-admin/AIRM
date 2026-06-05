/**
 * Payroll & PF Routes
 * Define API endpoints only
 * Wire middleware and controllers
 * NO business logic
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as payslipController from '../controllers/payslips.controller.js';
import * as pfController from '../controllers/pf-management.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/payroll-pf/payslips
 * Get payslips (filtered by user for employees, all for HR/Admin)
 */
router.get('/payslips', payslipController.getPayslips);

/**
 * GET /api/payroll-pf/payslips/:id
 * Get single payslip
 */
router.get('/payslips/:id', payslipController.getPayslipById);

/**
 * POST /api/payroll-pf/payslips
 * Create payslip (HR/Admin only)
 */
router.post('/payslips', payslipController.upsertPayslip);

/**
 * POST /api/payroll-pf/payslips/generate
 * Generate payslips from attendance (HR/Admin only)
 */
router.post('/payslips/generate', payslipController.generatePayslips);

/**
 * PUT /api/payroll-pf/payslips/:id
 * Update payslip (HR/Admin only)
 */
router.put('/payslips/:id', payslipController.upsertPayslip);

/**
 * PUT /api/payroll-pf/payslips/:id/release
 * Release payslip (HR/Admin only)
 */
router.put('/payslips/:id/release', payslipController.releasePayslip);

/**
 * PUT /api/payroll-pf/payslips/:id/lock
 * Lock payslip (HR/Admin only)
 */
router.put('/payslips/:id/lock', payslipController.lockPayslip);

/**
 * GET /api/payroll-pf/employees-salary-info
 * Get all employees with salary and bank details (HR/Admin only)
 */
router.get('/employees-salary-info', payslipController.getEmployeesSalaryInfo);

/**
 * POST /api/payroll-pf/payslips/generate-employee
 * Generate payslip for specific employee from attendance (HR/Admin only)
 */
router.post('/payslips/generate-employee', payslipController.generatePayslipForEmployee);

/**
 * PUT /api/payroll-pf/employees/:userId/salary
 * Update employee salary (HR/Admin only)
 */
router.put('/employees/:userId/salary', payslipController.updateEmployeeSalary);

/**
 * GET /api/payroll-pf/pf-details/:user-id
 * Get PF details for user
 */
router.get('/pf-details/:user-id', pfController.getPfDetails);

/**
 * GET /api/payroll-pf/pf-details
 * Get own PF details (for employees)
 */
router.get('/pf-details', pfController.getPfDetails);

/**
 * POST /api/payroll-pf/pf-details
 * Create PF details (HR/Admin only)
 */
router.post('/pf-details', pfController.upsertPfDetails);

/**
 * PUT /api/payroll-pf/pf-details/:user-id
 * Update PF details (HR/Admin only)
 */
router.put('/pf-details/:user-id', pfController.upsertPfDetails);

/**
 * GET /api/payroll-pf/pf-contributions
 * Get PF contributions
 */
router.get('/pf-contributions', pfController.getPfContributions);

/**
 * POST /api/payroll-pf/pf-contributions
 * Create PF contribution (HR/Admin only)
 */
router.post('/pf-contributions', pfController.createPfContribution);

/**
 * GET /api/payroll-pf/pf-documents
 * Get PF documents
 */
router.get('/pf-documents', pfController.getPfDocuments);

/**
 * POST /api/payroll-pf/pf-documents
 * Add PF document (HR/Admin only)
 */
router.post('/pf-documents', pfController.addPfDocument);

/**
 * GET /api/payroll-pf/audit-log
 * Get payroll audit log (HR/Admin only)
 */
router.get('/audit-log', pfController.getPayrollAuditLog);

export default router;


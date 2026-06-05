/**
 * Payslips Routes
 * Re-exporting from payroll-pf feature
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as payslipController from '../../payroll-pf/controllers/payslips.controller.js';

const router = express.Router();
router.use(authenticate);

// Re-export payslip routes from payroll-pf
router.get('/', payslipController.getPayslips);
router.get('/:id', payslipController.getPayslipById);
router.post('/', payslipController.upsertPayslip);
router.put('/:id', payslipController.upsertPayslip);

export default router;


const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../../../core/auth/authMiddleware');
const payslipsController = require('../controllers/payslips.controller');

// Get all employees with salary and bank details (Admin only)
router.get('/employees-salary-info', authenticateToken, requireAdmin, payslipsController.getEmployeesSalaryInfo);

// Generate payslip for specific employee from attendance
router.post('/generate-for-employee', authenticateToken, requireAdmin, payslipsController.generatePayslipForEmployee);

// Update employee salary
router.put('/update-employee-salary/:userId', authenticateToken, requireAdmin, payslipsController.updateEmployeeSalary);

// Existing routes
router.get('/', authenticateToken, payslipsController.getPayslips);
router.get('/:id', authenticateToken, payslipsController.getPayslip);
router.post('/', authenticateToken, requireAdmin, payslipsController.upsertPayslip);
router.post('/release/:id', authenticateToken, requireAdmin, payslipsController.releasePayslip);
router.post('/lock/:id', authenticateToken, requireAdmin, payslipsController.lockPayslip);
router.post('/generate-from-attendance', authenticateToken, requireAdmin, payslipsController.generateFromAttendance);

module.exports = router;

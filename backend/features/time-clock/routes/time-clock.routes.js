/**
 * Time Clock Routes
 * Re-exporting clock-in/out from timesheet feature
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
// TODO: Create time-clock specific controllers
// For now, these endpoints are handled by timesheet feature
import timesheetRouter from '../../timesheet/routes/timesheet.routes.js';

const router = express.Router();
router.use(authenticate);

// Re-export clock-in/out endpoints
router.post('/clock-in', timesheetRouter);
router.post('/clock-out', timesheetRouter);
router.get('/current', timesheetRouter);

export default router;


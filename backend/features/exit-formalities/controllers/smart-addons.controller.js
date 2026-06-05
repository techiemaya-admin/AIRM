/**
 * Smart Add-ons Controller
 * Handle request/response for exit progress, reminders, risks, reports, and communications
 * Call services
 * NO database queries, NO business logic
 */

import * as exitService from '../services/exit-formalities.service.js';

/**
 * Get exit progress
 */
export async function getExitProgress(req, res) {
  try {
    const { id } = req.params;
    const progress = await exitService.calculateExitProgress(id);
    res.json({ progress_percentage: progress });
  } catch (error) {
    console.error('[exit-formalities] Get exit progress error:', error);
    res.status(500).json({
      error: 'Failed to get exit progress',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get reminders
 */
export async function getReminders(req, res) {
  try {
    const { id } = req.params;
    const reminders = await exitService.getReminders(id);
    res.json({ reminders });
  } catch (error) {
    console.error('[exit-formalities] Get reminders error:', error);
    res.status(500).json({
      error: 'Failed to get reminders',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Create reminder
 */
export async function createReminder(req, res) {
  try {
    const { id } = req.params;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can create reminders'
      });
    }

    const reminder = await exitService.createReminder({
      ...req.body,
      exit_request_id: id
    });

    res.status(201).json({
      message: 'Reminder created successfully',
      reminder
    });
  } catch (error) {
    console.error('[exit-formalities] Create reminder error:', error);
    res.status(500).json({
      error: 'Failed to create reminder',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get asset risks
 */
export async function getAssetRisks(req, res) {
  try {
    const { id } = req.params;
    const risks = await exitService.getAssetRisks(id);
    res.json({ risks });
  } catch (error) {
    console.error('[exit-formalities] Get asset risks error:', error);
    res.status(500).json({
      error: 'Failed to get asset risks',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Flag asset risk
 */
export async function flagAssetRisk(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can flag asset risks'
      });
    }

    const risk = await exitService.flagAssetRisk({
      ...req.body,
      exit_request_id: id,
      flagged_by: userId
    });

    res.status(201).json({
      message: 'Asset risk flagged successfully',
      risk
    });
  } catch (error) {
    console.error('[exit-formalities] Flag asset risk error:', error);
    res.status(500).json({
      error: 'Failed to flag asset risk',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Resolve asset risk
 */
export async function resolveAssetRisk(req, res) {
  try {
    const riskId = req.params['risk-id'];
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    const { resolution_notes } = req.body;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can resolve asset risks'
      });
    }

    const risk = await exitService.resolveAssetRisk(riskId, userId, resolution_notes);

    res.json({
      message: 'Asset risk resolved successfully',
      risk
    });
  } catch (error) {
    console.error('[exit-formalities] Resolve asset risk error:', error);
    res.status(500).json({
      error: 'Failed to resolve asset risk',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get exit reports
 */
export async function getExitReports(req, res) {
  try {
    const { id } = req.params;
    const reports = await exitService.getExitReports(id);
    res.json({ reports });
  } catch (error) {
    console.error('[exit-formalities] Get exit reports error:', error);
    res.status(500).json({
      error: 'Failed to get exit reports',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Create exit report
 */
export async function createExitReport(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can create exit reports'
      });
    }

    const report = await exitService.createExitReport({
      ...req.body,
      exit_request_id: id,
      generated_by: userId
    });

    res.status(201).json({
      message: 'Exit report created successfully',
      report
    });
  } catch (error) {
    console.error('[exit-formalities] Create exit report error:', error);
    res.status(500).json({
      error: 'Failed to create exit report',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get exit communications
 */
export async function getExitCommunications(req, res) {
  try {
    const { id } = req.params;
    const communications = await exitService.getExitCommunications(id);
    res.json({ communications });
  } catch (error) {
    console.error('[exit-formalities] Get exit communications error:', error);
    res.status(500).json({
      error: 'Failed to get exit communications',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get exit dashboard metrics
 */
export async function getExitDashboardMetrics(req, res) {
  try {
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can view dashboard metrics'
      });
    }

    const filters = {
      status: req.query.status,
      department: req.query.department
    };

    const metrics = await exitService.getExitDashboardMetrics(filters);
    res.json({ metrics });
  } catch (error) {
    console.error('[exit-formalities] Get exit dashboard metrics error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard metrics',
      message: error.message || 'Internal server error'
    });
  }
}


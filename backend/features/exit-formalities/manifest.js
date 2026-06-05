/**
 * Exit Formalities Feature Manifest
 * Feature metadata and configuration
 */

export default {
  name: 'exit-formalities',
  version: '2.0.0',
  description: 'Complete Exit Management Module with Asset Recovery, De-Provisioning, Settlement, and Compliance',
  routes: {
    prefix: '/api/exit-formalities',
    endpoints: [
      'GET /',
      'GET /:id',
      'POST /',
      'PUT /:id',
      'PUT /:id/approve',
      'PUT /:id/clearance',
      'PUT /:id/complete',
      'POST /:id/interview',
      'GET /assets',
      'POST /assets',
      'GET /:id/assets',
      'PUT /:id/assets',
      'GET /:id/assets/handover',
      'POST /:id/assets/handover',
      'GET /:id/deprovisioning',
      'PUT /:id/deprovisioning',
      'POST /:id/deprovisioning/auto-revoke',
      'GET /:id/dues/payable',
      'POST /:id/dues/payable',
      'GET /:id/dues/recoverable',
      'POST /:id/dues/recoverable',
      'POST /:id/settlement/calculate',
      'GET /:id/settlement',
      'PUT /:id/settlement',
      'GET /:id/pf',
      'POST /:id/pf/initiate',
      'GET /:id/gratuity',
      'POST /:id/gratuity/calculate',
      'GET /:id/compliance',
      'PUT /:id/compliance',
      'GET /:id/compliance/documents',
      'POST /:id/compliance/documents',
      'GET /:id/progress',
      'GET /:id/reminders',
      'POST /:id/reminders',
      'GET /:id/risks',
      'POST /:id/risks',
      'PUT /risks/:risk-id/resolve',
      'GET /:id/reports',
      'POST /:id/reports',
      'GET /:id/communications',
      'GET /dashboard/metrics'
    ]
  },
  access: {
    plan: 'all',
    flags: {
      exitWorkflow: true,
      clearanceChecklist: true,
      exitInterview: true,
      assetRecovery: true,
      deprovisioning: true,
      settlement: true,
      compliance: true,
      exitDashboard: true
    }
  },
  dependencies: ['profiles', 'payroll-pf']
};


/**
 * Payslips Feature Manifest
 * Payslip viewing and management (separate from payroll-pf for UI organization)
 */

export default {
  name: 'payslips',
  version: '1.0.0',
  description: 'Payslip viewing and management',
  type: 'feature',
  routes: {
    prefix: '/api/payslips',
    endpoints: [
      'GET /',
      'GET /:id',
      'POST /',
      'PUT /:id'
    ]
  },
  dependencies: ['auth', 'users', 'payroll-pf']
};


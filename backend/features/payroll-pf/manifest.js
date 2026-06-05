/**
 * Payroll & PF Management Feature Manifest
 * Feature metadata and configuration
 */

export default {
  name: 'payroll-pf',
  version: '1.0.0',
  description: 'Payroll, payslip, and Provident Fund management system',
  routes: {
    prefix: '/api/payroll-pf',
    endpoints: [
      'GET /payslips',
      'GET /payslips/:id',
      'POST /payslips',
      'PUT /payslips/:id',
      'PUT /payslips/:id/release',
      'PUT /payslips/:id/lock',
      'GET /pf-details',
      'GET /pf-details/:user-id',
      'POST /pf-details',
      'PUT /pf-details/:user-id',
      'GET /pf-contributions',
      'POST /pf-contributions',
      'GET /pf-documents',
      'POST /pf-documents',
      'GET /audit-log'
    ]
  },
  access: {
    plan: 'all',
    flags: {
      payslipManagement: true,
      pfManagement: true,
      bulkOperations: true
    }
  },
  dependencies: ['profiles']
};


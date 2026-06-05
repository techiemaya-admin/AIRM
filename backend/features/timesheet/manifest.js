/**
 * Timesheet Feature Manifest
 * Time tracking and timesheet management
 */

export default {
  name: 'timesheet',
  version: '1.0.0',
  description: 'Time tracking, clock in/out, and timesheet management',
  type: 'feature',
  routes: {
    prefix: '/api/timesheet',
    endpoints: [
      'POST /clock-in',
      'POST /clock-out',
      'POST /pause',
      'POST /resume',
      'GET /current',
      'GET /entries',
      'GET /',
      'GET /active',
      'POST /',
      'GET /:id'
    ]
  },
  dependencies: ['auth', 'users']
};


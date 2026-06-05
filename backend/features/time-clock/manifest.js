/**
 * Time Clock Feature Manifest
 * Time clock operations (clock in/out)
 */

export default {
  name: 'time-clock',
  version: '1.0.0',
  description: 'Time clock operations',
  type: 'feature',
  routes: {
    prefix: '/api/time-clock',
    endpoints: [
      'POST /clock-in',
      'POST /clock-out',
      'GET /current',
      'GET /history'
    ]
  },
  dependencies: ['auth', 'users', 'timesheet']
};


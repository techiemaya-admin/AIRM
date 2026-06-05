/**
 * Leave Calendar Feature Manifest
 * Leave request management
 */

export default {
  name: 'leave-calendar',
  version: '1.0.0',
  description: 'Leave request and calendar management',
  type: 'feature',
  routes: {
    prefix: '/api/leave-calendar',
    endpoints: [
      'GET /',
      'POST /',
      'PUT /:id/status',
      'GET /calendar'
    ]
  },
  dependencies: ['auth', 'users']
};


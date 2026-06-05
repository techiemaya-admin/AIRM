/**
 * Projects Feature Manifest
 * Project management with GitLab integration
 */

export default {
  name: 'projects',
  version: '1.0.0',
  description: 'Project management and GitLab synchronization',
  type: 'feature',
  routes: {
    prefix: '/api/projects',
    endpoints: [
      'GET /',
      'GET /:id',
      'POST /',
      'PUT /:id',
      'DELETE /:id',
      'GET /:id/members',
      'POST /:id/members'
    ]
  },
  dependencies: ['auth', 'users']
};


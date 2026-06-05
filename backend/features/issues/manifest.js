/**
 * Issues Feature Manifest
 * Issue management with GitLab integration
 */

export default {
  name: 'issues',
  version: '1.0.0',
  description: 'Issue tracking and GitLab synchronization',
  type: 'feature',
  routes: {
    prefix: '/api/issues',
    endpoints: [
      'GET /',
      'GET /:id',
      'POST /',
      'PUT /:id',
      'POST /:id/comments',
      'POST /:id/assign',
      'DELETE /:id/assign/:user_id',
      'POST /:id/labels',
      'DELETE /:id/labels/:label_id'
    ]
  },
  dependencies: ['auth', 'users', 'projects']
};


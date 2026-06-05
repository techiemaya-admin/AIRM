/**
 * Git Feature Manifest
 * Git integration and synchronization
 */

export default {
  name: 'git',
  version: '1.0.0',
  description: 'Git integration and GitLab synchronization',
  type: 'feature',
  routes: {
    prefix: '/api/git',
    endpoints: [
      'GET /commits',
      'GET /issues',
      'GET /commits/:sha',
      'GET /issues/:id',
      'POST /sync-users',
      'POST /sync-issues',
      'GET /users'
    ]
  },
  dependencies: ['auth', 'users', 'projects', 'issues']
};


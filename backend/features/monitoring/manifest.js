/**
 * Monitoring Feature Manifest
 * System monitoring and analytics
 */

export default {
  name: 'monitoring',
  version: '1.0.0',
  description: 'System monitoring and analytics',
  type: 'feature',
  routes: {
    prefix: '/api/monitoring',
    endpoints: [
      'GET /',
      'GET /stats',
      'GET /health'
    ]
  },
  dependencies: ['auth']
};


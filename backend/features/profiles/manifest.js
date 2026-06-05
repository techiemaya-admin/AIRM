/**
 * Profiles Feature Manifest
 * Feature metadata and configuration
 */

export default {
  name: 'profiles',
  version: '1.0.0',
  description: 'Employee profile management and directory',
  routes: {
    prefix: '/api/profiles',
    endpoints: [
      'GET /',
      'GET /:id',
      'PUT /:id'
    ]
  },
  access: {
    plan: 'all', // Available in all plans
    flags: {
      extendedFields: true,
      projectHistory: true,
      performanceReviews: true
    }
  },
  dependencies: []
};


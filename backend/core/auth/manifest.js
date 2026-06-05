/**
 * Auth Feature Manifest
 * Core authentication and authorization module
 */

export default {
  name: 'auth',
  version: '1.0.0',
  description: 'Core authentication and authorization',
  type: 'core',
  routes: {
    prefix: '/api/auth',
    public: ['/send-magic-link', '/verify-magic-link'],
    protected: ['/me']
  },
  dependencies: []
};


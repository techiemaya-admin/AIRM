/**
 * Users Feature Manifest
 * Core user management module
 */

export default {
  name: 'users',
  version: '1.0.0',
  description: 'Core user management',
  type: 'core',
  routes: {
    prefix: '/api/users',
    public: [],
    protected: ['/*']
  },
  dependencies: ['auth']
};


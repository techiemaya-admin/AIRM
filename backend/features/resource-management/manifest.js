/**
 * Resource Management Feature Manifest
 * Feature metadata and configuration
 */

export default {
  name: 'resource-management',
  version: '1.0.0',
  description: 'Resource management including assets, equipment, and allocations',
  routes: {
    prefix: '/api/resource-management',
    endpoints: [
      'GET /assets',
      'POST /assets',
      'GET /assets/:id',
      'PUT /assets/:id',
      'DELETE /assets/:id',
      'GET /equipment',
      'POST /equipment',
      'GET /equipment/:id',
      'PUT /equipment/:id',
      'DELETE /equipment/:id',
      'GET /allocations',
      'POST /allocations',
      'GET /allocations/:id',
      'PUT /allocations/:id',
      'DELETE /allocations/:id',
      'GET /reports/summary',
      'GET /reports/employee/:userId'
    ]
  },
  access: {
    plan: 'all',
    flags: {
      assetManagement: true,
      equipmentTracking: true,
      resourceAllocation: true,
      reporting: true
    }
  },
  dependencies: ['profiles', 'exit-formalities']
};


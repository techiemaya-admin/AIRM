/**
 * Feature Guard Middleware
 * Feature flag middleware for enabling/disabling features
 */

/**
 * Feature flags configuration
 * Can be loaded from database or environment variables
 */
const featureFlags = {
  'exit-formalities': process.env.FEATURE_EXIT_FORMALITIES !== 'false',
  'payroll-pf': process.env.FEATURE_PAYROLL_PF !== 'false',
  'timesheet': process.env.FEATURE_TIMESHEET !== 'false',
  'projects': process.env.FEATURE_PROJECTS !== 'false',
  'issues': process.env.FEATURE_ISSUES !== 'false',
  'monitoring': process.env.FEATURE_MONITORING !== 'false',
  'time-clock': process.env.FEATURE_TIME_CLOCK !== 'false',
  'leave-calendar': process.env.FEATURE_LEAVE_CALENDAR !== 'false',
  'git': process.env.FEATURE_GIT !== 'false',
  'profiles': process.env.FEATURE_PROFILES !== 'false',
};

/**
 * Middleware to check if a feature is enabled
 * @param {string} featureName - Name of the feature to check
 */
export function requireFeature(featureName) {
  return (req, res, next) => {
    const isEnabled = featureFlags[featureName];
    
    if (!isEnabled) {
      return res.status(403).json({
        error: 'Feature disabled',
        message: `The ${featureName} feature is currently disabled`,
      });
    }
    
    next();
  };
}

/**
 * Get all feature flags (for admin endpoints)
 */
export function getFeatureFlags() {
  return featureFlags;
}

/**
 * Update a feature flag (for admin endpoints)
 */
export function updateFeatureFlag(featureName, enabled) {
  if (featureFlags.hasOwnProperty(featureName)) {
    featureFlags[featureName] = enabled;
    return true;
  }
  return false;
}


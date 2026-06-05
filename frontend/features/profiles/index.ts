/**
 * Profiles Feature SDK
 * Public exports only
 */

// Services
export * from '@sdk/profilesService';

// Hooks
export {
  useProfiles,
  useProfile,
  useProfileMutation,
} from './hooks/useprofiles';

// Types
export * from './types';

// Page export
export { default } from './page';

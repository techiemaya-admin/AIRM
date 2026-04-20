console.log(
  "VITE_API_BASE_URL =",
  import.meta.env.VITE_API_BASE_URL
);

/**
 * Exit Formalities Feature SDK
 * Public exports only
 */

// Services
export * from '@sdk/exit-formalitiesService';

// Hooks
export {
  useExitRequests,
  useExitRequest,
  useExitMutation,
  useSettlement,
  useCalculateSettlement,
  useSettlementPDFData,
  useAssetHandoverPDFData,
  useExperienceLetterPDFData,
  useRelievingLetterPDFData,
  type UseExitRequestsFilters,
} from './hooks/useexit-formalities';

// Types
export * from './types';

// Page export
export { default } from './page';

// Stubs for exit-formalities API. Replace with real implementations as needed.
export async function getExitProgress(exitId: string) { return { progress_percentage: 0 }; }
export async function getAssetRecovery(exitId: string) { return { assets: [] }; }
export async function getAccessDeprovisioning(exitId: string) { return { deprovisioning: [] }; }
export async function getSettlement(exitId: string) { return { settlement: null }; }
export async function getPayableDues(exitId: string) { return { dues: [] }; }
export async function getRecoverableDues(exitId: string) { return { dues: [] }; }
export async function getPFManagement(exitId: string) { return { pf_management: null }; }
export async function getGratuity(exitId: string) { return { gratuity: null }; }
export async function getComplianceChecklist(exitId: string) { return { compliance: [] }; }
export async function getAssetRisks(exitId: string) { return { risks: [] }; }
export async function calculateSettlement(exitId: string) { return { settlement: null }; }
export async function autoRevokeAccess(exitId: string) { return {}; }

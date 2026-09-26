// Batched push to POST /sync/push. PENDING → IN_FLIGHT → SYNCED, or
// RETRYABLE_ERROR (exponential backoff) / FATAL_ERROR → DEAD_LETTER
// (surfaced to the owner, never silently dropped).
export {};

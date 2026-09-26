# Offline sync

Cashier UI reads/writes only IndexedDB. Outbox rows: PENDING → IN_FLIGHT → SYNCED, or RETRYABLE_ERROR / FATAL_ERROR → DEAD_LETTER. Server idempotent on client_id. Pull is delta by updated_at cursor; catalog is server-wins, sales are client-wins, stock conflicts are accepted and flagged, never prevented.

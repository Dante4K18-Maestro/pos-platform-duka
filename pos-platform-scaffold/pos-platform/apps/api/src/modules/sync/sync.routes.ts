// POST /sync/push, GET /sync/pull — the offline-first contract. The server
// is idempotent on client_id (push) and serves deltas by updated_at cursor
// (pull). See docs/04-offline-sync.md before touching this file.
export {};

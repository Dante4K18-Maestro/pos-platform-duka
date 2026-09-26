// BFF ONLY: httpOnly cookie + token refresh. No business logic ever lives
// in apps/web/src/app/api — the moment it does, there are two backends and
// an offline client that cannot reason about either.
export {};

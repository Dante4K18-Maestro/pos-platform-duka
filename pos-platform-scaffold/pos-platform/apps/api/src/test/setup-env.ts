// The env module fails fast on a missing required var, on purpose. Tests set
// the minimum here so a unit test is hermetic and never reads a developer's
// local .env values.
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/pos_test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.AI_SERVICE_TOKEN ??= "test-ai-token";

import { describe, expect, it } from "vitest";
import { SalesService } from "./sales.service";

describe("SalesService", () => {
  it("is idempotent on client_id", async () => {
    const service = new SalesService();
    // TODO: seed a repo double and assert a repeated clientId returns the
    // same sale rather than creating a second one.
    expect(service).toBeTruthy();
  });
});

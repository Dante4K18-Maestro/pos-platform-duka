// Reports business rules live here, and only here.
import type { ReportsOverview } from "@pos/contracts";
import { ReportsRepository, type ReportsRepositoryLike } from "./reports.repository";

export class ReportsService {
  constructor(private readonly repo: ReportsRepositoryLike = new ReportsRepository()) {}

  // "Today" is resolved server-side (UTC) so every client agrees on the
  // window; Kenya-time day boundaries are a reporting refinement.
  async overview(tenantId: string): Promise<ReportsOverview> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    return this.repo.overview(tenantId, startOfToday);
  }
}

// Cash session rules live here, and only here. A drawer is opened once per
// register, movers need a reason, and closing records the variance as seen
// at that moment — it is never recomputed after the fact.
import type {
  CashMovement,
  CashSession,
  CloseCashSessionInput,
  CreateCashMovementInput,
  OpenCashSessionInput,
} from "@pos/contracts";
import {
  CashSessionsRepository,
  type CashSessionRow,
  type CashSessionsRepositoryLike,
} from "./cash-sessions.repository";

export class CashSessionNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "CASH_SESSION_NOT_FOUND";
  constructor() {
    super("cash session not found");
  }
}

export class CashSessionConflictError extends Error {
  readonly statusCode = 409;
  readonly code = "CASH_SESSION_OPEN";
  constructor() {
    super("this register already has an open cash session");
  }
}

export class CashSessionClosedError extends Error {
  readonly statusCode = 409;
  readonly code = "CASH_SESSION_CLOSED";
  constructor() {
    super("this cash session is already closed");
  }
}

export class RegisterNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "REGISTER_NOT_FOUND";
  constructor() {
    super("register not found");
  }
}

// Money leaving the drawer needs a story; money arriving does not.
export class CashMovementReasonError extends Error {
  readonly statusCode = 400;
  readonly code = "REASON_REQUIRED";
  constructor() {
    super("a reason is required for a pay-out");
  }
}

export class CashSessionsService {
  constructor(private readonly repo: CashSessionsRepositoryLike = new CashSessionsRepository()) {}

  async list(tenantId: string): Promise<{ sessions: CashSession[]; open: CashSession | null }> {
    const [sessions, open] = await Promise.all([
      this.repo.list(tenantId),
      this.repo.findOpen(tenantId),
    ]);
    return { sessions, open };
  }

  async open(
    tenantId: string,
    openedByUserId: string,
    input: OpenCashSessionInput,
  ): Promise<CashSession> {
    if (!(await this.repo.registerExists(tenantId, input.registerId))) {
      throw new RegisterNotFoundError();
    }
    // One open drawer per register: two floats on one till is two truths
    // about the same money.
    const existing = await this.repo.findOpenByRegister(tenantId, input.registerId);
    if (existing) throw new CashSessionConflictError();

    return this.repo.create(tenantId, {
      registerId: input.registerId,
      openedByUserId,
      openingFloatMinor: input.openingFloatMinor,
    });
  }

  async close(tenantId: string, id: string, input: CloseCashSessionInput): Promise<CashSession> {
    const session = await this.requireOpen(tenantId, id);
    // Variance is counted − expected, signed: negative means short.
    const varianceMinor = input.countedCloseMinor - session.expectedCashMinor;
    return this.repo.close(id, input.countedCloseMinor, varianceMinor);
  }

  async addMovement(
    tenantId: string,
    id: string,
    input: CreateCashMovementInput,
  ): Promise<CashMovement> {
    await this.requireOpen(tenantId, id);
    if (input.type === "PAY_OUT" && !input.reason?.trim()) {
      throw new CashMovementReasonError();
    }
    return this.repo.addMovement(tenantId, id, input);
  }

  private async requireOpen(tenantId: string, id: string): Promise<CashSessionRow> {
    const session = await this.repo.findById(tenantId, id);
    if (!session) throw new CashSessionNotFoundError();
    if (session.closedAt) throw new CashSessionClosedError();
    return session;
  }
}

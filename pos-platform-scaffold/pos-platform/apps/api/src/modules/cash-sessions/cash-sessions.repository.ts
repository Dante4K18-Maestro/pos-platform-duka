// Cash sessions data access — Prisma queries, nothing else.
import type { CashMovement, CashSession, CreateCashMovementInput } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface CashSessionRow {
  id: string;
  registerId: string;
  registerName: string;
  openedByUserId: string;
  openingFloatMinor: number;
  countedCloseMinor: number | null;
  computedVarianceMinor: number | null;
  closedAt: string | null;
  createdAt: string;
  cashSalesMinor: number;
  payInMinor: number;
  payOutMinor: number;
  expectedCashMinor: number;
  movements: CashMovement[];
}

export interface CreateSessionInput {
  registerId: string;
  openedByUserId: string;
  openingFloatMinor: number;
}

export interface CashSessionsRepositoryLike {
  list(tenantId: string): Promise<CashSessionRow[]>;
  findOpen(tenantId: string): Promise<CashSessionRow | null>;
  findOpenByRegister(tenantId: string, registerId: string): Promise<{ id: string } | null>;
  findById(tenantId: string, id: string): Promise<CashSessionRow | null>;
  registerExists(tenantId: string, registerId: string): Promise<boolean>;
  create(tenantId: string, input: CreateSessionInput): Promise<CashSessionRow>;
  close(id: string, countedCloseMinor: number, varianceMinor: number): Promise<CashSessionRow>;
  addMovement(
    tenantId: string,
    sessionId: string,
    input: CreateCashMovementInput,
  ): Promise<CashMovement>;
}

type SessionWithRelations = {
  id: string;
  tenantId: string;
  registerId: string;
  openedByUserId: string;
  openingFloatMinor: number;
  countedCloseMinor: number | null;
  computedVarianceMinor: number | null;
  closedAt: Date | null;
  createdAt: Date;
  register: { name: string };
  movements: { id: string; type: string; amountMinor: number; reason: string | null; createdAt: Date }[];
};

// Cash in the drawer is the sum of *confirmed* CASH payments against the
// session's non-voided sales. An M-Pesa payment — even one that later
// confirms — never counts, and a PENDING cash payment does not either.
function cashSalesMinor(
  sales: { status: string; payments: { method: string; status: string; amountMinor: number }[] }[],
): number {
  return sales.reduce((sum, sale) => {
    const cash = sale.payments
      .filter((payment) => payment.method === "CASH" && payment.status === "CONFIRMED")
      .reduce((paid, payment) => paid + payment.amountMinor, 0);
    return sum + cash;
  }, 0);
}

function toRow(session: SessionWithRelations, cashSales: number): CashSessionRow {
  const movements: CashMovement[] = session.movements
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((movement) => ({
      id: movement.id,
      type: movement.type as CashMovement["type"],
      amountMinor: movement.amountMinor,
      reason: movement.reason,
      createdAt: movement.createdAt.toISOString(),
    }));

  const payInMinor = movements
    .filter((movement) => movement.type === "PAY_IN")
    .reduce((sum, movement) => sum + movement.amountMinor, 0);
  const payOutMinor = movements
    .filter((movement) => movement.type === "PAY_OUT")
    .reduce((sum, movement) => sum + movement.amountMinor, 0);

  return {
    id: session.id,
    registerId: session.registerId,
    registerName: session.register.name,
    openedByUserId: session.openedByUserId,
    openingFloatMinor: session.openingFloatMinor,
    countedCloseMinor: session.countedCloseMinor,
    computedVarianceMinor: session.computedVarianceMinor,
    closedAt: session.closedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    cashSalesMinor: cashSales,
    payInMinor,
    payOutMinor,
    // What the drawer *should* hold: float + cash taken + paid in − paid out.
    expectedCashMinor: session.openingFloatMinor + cashSales + payInMinor - payOutMinor,
    movements,
  };
}

const include = {
  register: { select: { name: true } },
  movements: true,
} as const;

export class CashSessionsRepository implements CashSessionsRepositoryLike {
  // Sales are fetched once for every session in the list rather than in a
  // loop, so a till with months of history is still one round trip.
  private async cashSalesBySession(tenantId: string, sessionIds: string[]) {
    if (sessionIds.length === 0) return new Map<string, number>();
    const sales = await prisma.sale.findMany({
      where: { tenantId, deletedAt: null, cashSessionId: { in: sessionIds } },
      select: {
        cashSessionId: true,
        status: true,
        payments: { where: { deletedAt: null }, select: { method: true, status: true, amountMinor: true } },
      },
    });

    const map = new Map<string, number>();
    for (const sale of sales) {
      if (!sale.cashSessionId || sale.status === "VOIDED") continue;
      map.set(sale.cashSessionId, (map.get(sale.cashSessionId) ?? 0) + cashSalesMinor([sale]));
    }
    return map;
  }

  async list(tenantId: string): Promise<CashSessionRow[]> {
    const rows = await prisma.cashSession.findMany({
      where: { tenantId, deletedAt: null },
      include,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const cashBySession = await this.cashSalesBySession(
      tenantId,
      rows.map((row) => row.id),
    );
    return rows.map((row) => toRow(row, cashBySession.get(row.id) ?? 0));
  }

  async findOpen(tenantId: string): Promise<CashSessionRow | null> {
    const row = await prisma.cashSession.findFirst({
      where: { tenantId, deletedAt: null, closedAt: null },
      include,
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    const cashBySession = await this.cashSalesBySession(tenantId, [row.id]);
    return toRow(row, cashBySession.get(row.id) ?? 0);
  }

  async findOpenByRegister(tenantId: string, registerId: string): Promise<{ id: string } | null> {
    return prisma.cashSession.findFirst({
      where: { tenantId, registerId, deletedAt: null, closedAt: null },
      select: { id: true },
    });
  }

  async findById(tenantId: string, id: string): Promise<CashSessionRow | null> {
    const row = await prisma.cashSession.findFirst({
      where: { id, tenantId, deletedAt: null },
      include,
    });
    if (!row) return null;
    const cashBySession = await this.cashSalesBySession(tenantId, [row.id]);
    return toRow(row, cashBySession.get(row.id) ?? 0);
  }

  async registerExists(tenantId: string, registerId: string): Promise<boolean> {
    const count = await prisma.register.count({ where: { id: registerId, tenantId, deletedAt: null } });
    return count > 0;
  }

  async create(tenantId: string, input: CreateSessionInput): Promise<CashSessionRow> {
    const row = await prisma.cashSession.create({
      data: {
        tenantId,
        registerId: input.registerId,
        openedByUserId: input.openedByUserId,
        openingFloatMinor: input.openingFloatMinor,
      },
      include,
    });
    return toRow(row, 0);
  }

  async close(id: string, countedCloseMinor: number, varianceMinor: number): Promise<CashSessionRow> {
    const row = await prisma.cashSession.update({
      where: { id },
      data: { countedCloseMinor, computedVarianceMinor: varianceMinor, closedAt: new Date() },
      include,
    });
    const cashBySession = await this.cashSalesBySession(row.tenantId, [row.id]);
    return toRow(row, cashBySession.get(row.id) ?? 0);
  }

  async addMovement(
    tenantId: string,
    sessionId: string,
    input: CreateCashMovementInput,
  ): Promise<CashMovement> {
    const row = await prisma.cashMovement.create({
      data: {
        tenantId,
        cashSessionId: sessionId,
        type: input.type,
        amountMinor: input.amountMinor,
        reason: input.reason ?? null,
      },
    });
    return {
      id: row.id,
      type: row.type,
      amountMinor: row.amountMinor,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export type { CashSession };

// Settings data access — Prisma queries, nothing else.
//
// Tax rates are real rows. Everything else (profile extras, receipts, M-Pesa)
// lives inside Tenant.featureFlags — the one JSON column the tenant already
// carries — under a `settings` key. That keeps tenant config additive without
// a migration per new toggle, and a single read resolves the whole snapshot.
import type { CreateTaxRateInput, UpdateTaxRateInput } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface TenantSettingsBlob {
  currency?: string;
  timezone?: string;
  receipts?: {
    headerText?: string;
    footerText?: string;
    showTaxBreakdown?: boolean;
    printAutomatically?: boolean;
  };
  mpesa?: {
    shortcode?: string;
    paybillType?: "PAYBILL" | "TILL";
    environment?: "sandbox" | "production";
  };
}

export interface TenantRecord {
  id: string;
  name: string;
  settings: TenantSettingsBlob;
}

export interface TaxRateRecord {
  id: string;
  name: string;
  rateBasisPoints: number;
  createdAt: string;
}

export interface SettingsRepositoryLike {
  listTaxRates(tenantId: string): Promise<TaxRateRecord[]>;
  findTaxRate(tenantId: string, id: string): Promise<{ id: string } | null>;
  createTaxRate(tenantId: string, input: CreateTaxRateInput): Promise<TaxRateRecord>;
  updateTaxRate(tenantId: string, id: string, input: UpdateTaxRateInput): Promise<TaxRateRecord>;
  softDeleteTaxRate(tenantId: string, id: string): Promise<void>;
  getTenant(tenantId: string): Promise<TenantRecord | null>;
  saveSettings(tenantId: string, settings: TenantSettingsBlob, name?: string): Promise<TenantRecord>;
}

// featureFlags is Json; treat anything that isn't the shape we wrote as empty
// rather than throwing at the first request after a hand-edit.
function readSettings(flags: unknown): TenantSettingsBlob {
  if (!flags || typeof flags !== "object") return {};
  const bag = (flags as Record<string, unknown>).settings;
  return bag && typeof bag === "object" ? (bag as TenantSettingsBlob) : {};
}

export class SettingsRepository implements SettingsRepositoryLike {
  async listTaxRates(tenantId: string): Promise<TaxRateRecord[]> {
    const rows = await prisma.taxRate.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      rateBasisPoints: row.rateBasisPoints,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async findTaxRate(tenantId: string, id: string): Promise<{ id: string } | null> {
    return prisma.taxRate.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true } });
  }

  async createTaxRate(tenantId: string, input: CreateTaxRateInput): Promise<TaxRateRecord> {
    const row = await prisma.taxRate.create({
      data: { tenantId, name: input.name, rateBasisPoints: input.rateBasisPoints },
    });
    return {
      id: row.id,
      name: row.name,
      rateBasisPoints: row.rateBasisPoints,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async updateTaxRate(tenantId: string, id: string, input: UpdateTaxRateInput): Promise<TaxRateRecord> {
    const row = await prisma.taxRate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.rateBasisPoints !== undefined ? { rateBasisPoints: input.rateBasisPoints } : {}),
      },
    });
    // tenantId is only in the where clause of findTaxRate; Prisma update needs
    // a unique key, so the caller proves ownership first.
    void tenantId;
    return {
      id: row.id,
      name: row.name,
      rateBasisPoints: row.rateBasisPoints,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async softDeleteTaxRate(tenantId: string, id: string): Promise<void> {
    await prisma.taxRate.update({ where: { id }, data: { deletedAt: new Date() } });
    void tenantId;
  }

  async getTenant(tenantId: string): Promise<TenantRecord | null> {
    const row = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, name: true, featureFlags: true },
    });
    if (!row) return null;
    return { id: row.id, name: row.name, settings: readSettings(row.featureFlags) };
  }

  async saveSettings(
    tenantId: string,
    settings: TenantSettingsBlob,
    name?: string,
  ): Promise<TenantRecord> {
    const current = await prisma.tenant.findFirstOrThrow({
      where: { id: tenantId },
      select: { featureFlags: true },
    });
    const flags = (current.featureFlags as Record<string, unknown> | null) ?? {};
    const row = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name !== undefined ? { name } : {}),
        featureFlags: { ...flags, settings } as object,
      },
      select: { id: true, name: true, featureFlags: true },
    });
    return { id: row.id, name: row.name, settings: readSettings(row.featureFlags) };
  }
}

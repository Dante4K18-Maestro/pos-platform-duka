// Settings business rules live here, and only here.
import type {
  BusinessProfile,
  CreateTaxRateInput,
  MpesaSettings,
  ReceiptSettings,
  SettingsSnapshot,
  TaxRate,
  UpdateBusinessProfileInput,
  UpdateMpesaSettingsInput,
  UpdateReceiptSettingsInput,
  UpdateTaxRateInput,
} from "@pos/contracts";
import { env } from "../../config/env";
import {
  SettingsRepository,
  type SettingsRepositoryLike,
  type TenantRecord,
} from "./settings.repository";

export class SettingsNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code: string;
  constructor(message: string, code = "SETTINGS_NOT_FOUND") {
    super(message);
    this.code = code;
  }
}

// Until a Tenant carries explicit columns for these, defaults are what the UI
// shows for a tenant that has never saved them. They are *resolved* server
// side so the register and the settings page agree on one answer.
const DEFAULT_RECEIPTS: ReceiptSettings = {
  headerText: "",
  footerText: "Asante kwa kununua nasi!",
  showTaxBreakdown: true,
  printAutomatically: true,
};

const DEFAULT_CURRENCY = "KES";
const DEFAULT_TIMEZONE = "Africa/Nairobi";

export class SettingsService {
  constructor(private readonly repo: SettingsRepositoryLike = new SettingsRepository()) {}

  // ---- Taxes -------------------------------------------------------

  async listTaxRates(tenantId: string): Promise<TaxRate[]> {
    return this.repo.listTaxRates(tenantId);
  }

  async createTaxRate(tenantId: string, input: CreateTaxRateInput): Promise<TaxRate> {
    return this.repo.createTaxRate(tenantId, input);
  }

  async updateTaxRate(tenantId: string, id: string, input: UpdateTaxRateInput): Promise<TaxRate> {
    await this.requireTaxRate(tenantId, id);
    return this.repo.updateTaxRate(tenantId, id, input);
  }

  async deleteTaxRate(tenantId: string, id: string): Promise<void> {
    await this.requireTaxRate(tenantId, id);
    await this.repo.softDeleteTaxRate(tenantId, id);
  }

  private async requireTaxRate(tenantId: string, id: string) {
    const found = await this.repo.findTaxRate(tenantId, id);
    if (!found) throw new SettingsNotFoundError("tax rate not found", "TAX_RATE_NOT_FOUND");
  }

  // ---- Snapshot ----------------------------------------------------

  async getSnapshot(tenantId: string): Promise<SettingsSnapshot> {
    const tenant = await this.requireTenant(tenantId);
    return {
      profile: this.profile(tenant),
      receipts: this.receipts(tenant),
      mpesa: this.mpesa(tenant),
    };
  }

  async updateProfile(tenantId: string, input: UpdateBusinessProfileInput): Promise<BusinessProfile> {
    const tenant = await this.requireTenant(tenantId);
    const settings = { ...tenant.settings };
    if (input.currency !== undefined) settings.currency = input.currency;
    if (input.timezone !== undefined) settings.timezone = input.timezone;

    const saved = await this.repo.saveSettings(tenantId, settings, input.name);
    return this.profile(saved);
  }

  async updateReceipts(tenantId: string, input: UpdateReceiptSettingsInput): Promise<ReceiptSettings> {
    const tenant = await this.requireTenant(tenantId);
    const settings = {
      ...tenant.settings,
      receipts: { ...tenant.settings.receipts, ...input },
    };
    const saved = await this.repo.saveSettings(tenantId, settings);
    return this.receipts(saved);
  }

  async updateMpesa(tenantId: string, input: UpdateMpesaSettingsInput): Promise<MpesaSettings> {
    const tenant = await this.requireTenant(tenantId);
    const settings = {
      ...tenant.settings,
      mpesa: { ...tenant.settings.mpesa, ...input },
    };
    const saved = await this.repo.saveSettings(tenantId, settings);
    return this.mpesa(saved);
  }

  // ---- Resolvers (settings blob + defaults + env) -------------------

  private async requireTenant(tenantId: string): Promise<TenantRecord> {
    const tenant = await this.repo.getTenant(tenantId);
    if (!tenant) throw new SettingsNotFoundError("tenant not found", "TENANT_NOT_FOUND");
    return tenant;
  }

  private profile(tenant: TenantRecord): BusinessProfile {
    return {
      tenantId: tenant.id,
      name: tenant.name,
      currency: tenant.settings.currency ?? DEFAULT_CURRENCY,
      timezone: tenant.settings.timezone ?? DEFAULT_TIMEZONE,
    };
  }

  private receipts(tenant: TenantRecord): ReceiptSettings {
    return { ...DEFAULT_RECEIPTS, ...tenant.settings.receipts };
  }

  private mpesa(tenant: TenantRecord): MpesaSettings {
    // Credentials are never sent to the client — only whether the server
    // holds a usable set, and where Daraja will call back.
    const configured = Boolean(
      env.MPESA_CONSUMER_KEY &&
        env.MPESA_CONSUMER_SECRET &&
        env.MPESA_PASSKEY &&
        env.MPESA_CALLBACK_URL,
    );
    return {
      shortcode: tenant.settings.mpesa?.shortcode ?? env.MPESA_SHORTCODE ?? "",
      paybillType: tenant.settings.mpesa?.paybillType ?? "PAYBILL",
      environment: tenant.settings.mpesa?.environment ?? env.MPESA_ENVIRONMENT,
      configured,
      callbackUrl: env.MPESA_CALLBACK_URL ?? "",
    };
  }
}

// Seeds a demo tenant so the Render health check, the first Vercel deploy,
// and the first real sale on a phone all have something concrete to point
// at. Run with `pnpm prisma:seed`.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_STORE_ID = "00000000-0000-0000-0000-000000000002";
const DEMO_REGISTER_ID = "00000000-0000-0000-0000-000000000003";
const DEMO_PRODUCT_ID = "00000000-0000-0000-0000-000000000004";
const DEMO_VARIANT_ID = "00000000-0000-0000-0000-000000000005";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      name: "Demo Duka",
      featureFlags: { businessProfile: "retail" },
    },
  });

  const store = await prisma.store.upsert({
    where: { id: DEMO_STORE_ID },
    update: {},
    create: { id: DEMO_STORE_ID, tenantId: tenant.id, name: "Main Street" },
  });

  const register = await prisma.register.upsert({
    where: { id: DEMO_REGISTER_ID },
    update: {},
    create: { id: DEMO_REGISTER_ID, tenantId: tenant.id, storeId: store.id, name: "Till 1" },
  });

  await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "owner" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "owner",
      permissions: ["sale.create", "sale.refund", "inventory.adjust", "reports.view", "settings.manage"],
    },
  });

  const product = await prisma.product.upsert({
    where: { id: DEMO_PRODUCT_ID },
    update: {},
    create: { id: DEMO_PRODUCT_ID, tenantId: tenant.id, name: "500ml Soda" },
  });

  const variant = await prisma.variant.upsert({
    where: { id: DEMO_VARIANT_ID },
    update: {},
    create: {
      id: DEMO_VARIANT_ID,
      tenantId: tenant.id,
      productId: product.id,
      sku: "SODA-500",
      barcode: "6001234567890",
      priceMinor: 8000, // KES 80.00 — integer minor units, always
    },
  });

  await prisma.inventoryLevel.upsert({
    where: { storeId_variantId: { storeId: store.id, variantId: variant.id } },
    update: {},
    create: { tenantId: tenant.id, storeId: store.id, variantId: variant.id, onHand: 50 },
  });

  console.log(`Seeded demo tenant "${tenant.name}" (${tenant.id})`);
  console.log(`  store=${store.name} register=${register.name}`);
  console.log(`  product="${product.name}" variant=${variant.sku} onHand=50`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

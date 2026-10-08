// Seeds a demo tenant so the Render health check, the first Vercel deploy,
// and the first real sale on a phone all have something concrete to point
// at. Run with `pnpm prisma:seed`.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_STORE_ID = "00000000-0000-0000-0000-000000000002";
const DEMO_REGISTER_ID = "00000000-0000-0000-0000-000000000003";
const DEMO_PRODUCT_ID = "00000000-0000-0000-0000-000000000004";
const DEMO_VARIANT_ID = "00000000-0000-0000-0000-000000000005";
const DEMO_TAX_RATE_ID = "00000000-0000-0000-0000-000000000006";

// Register demo catalog — a full convenience-store shelf, not four cards.
// Each item carries the keyword used to resolve a copyright-free picture
// (see resolveImage below) so the register and inventory both show a
// descriptive photograph rather than a placeholder glyph.
const DEMO_CATEGORY_IDS = {
  Beverages: "00000000-0000-0000-0000-000000000011",
  Snacks: "00000000-0000-0000-0000-000000000012",
  Electronics: "00000000-0000-0000-0000-000000000013",
  Bakery: "00000000-0000-0000-0000-000000000014",
  Dairy: "00000000-0000-0000-0000-000000000015",
  Groceries: "00000000-0000-0000-0000-000000000016",
  Household: "00000000-0000-0000-0000-000000000017",
  "Personal Care": "00000000-0000-0000-0000-000000000018",
  Stationery: "00000000-0000-0000-0000-000000000019",
  Produce: "00000000-0000-0000-0000-00000000001a",
} as const;

interface DemoCatalogEntry {
  name: string;
  category: keyof typeof DEMO_CATEGORY_IDS;
  priceMinor: number;
  onHand: number;
  // Search phrase handed to the CC image index — the picture is chosen from
  // this, so it is descriptive of the item, not decorative filler.
  imageQuery: string;
}

const DEMO_CATALOG: DemoCatalogEntry[] = [
  // Beverages
  { name: "Mineral Water 500ml", category: "Beverages", priceMinor: 5000, onHand: 24, imageQuery: "bottled mineral water" },
  { name: "Cola Soda 500ml", category: "Beverages", priceMinor: 8000, onHand: 36, imageQuery: "cola soda can" },
  { name: "Orange Juice 1L", category: "Beverages", priceMinor: 22000, onHand: 14, imageQuery: "orange juice carton" },
  { name: "House Coffee", category: "Beverages", priceMinor: 15000, onHand: 40, imageQuery: "roasted coffee beans" },
  { name: "Green Tea Bags", category: "Beverages", priceMinor: 18000, onHand: 22, imageQuery: "green tea cup" },
  { name: "Energy Drink 250ml", category: "Beverages", priceMinor: 20000, onHand: 18, imageQuery: "energy drink can" },
  { name: "Mango Smoothie", category: "Beverages", priceMinor: 25000, onHand: 9, imageQuery: "mango smoothie glass" },
  { name: "Sparkling Water 500ml", category: "Beverages", priceMinor: 9000, onHand: 4, imageQuery: "sparkling water bottle" },

  // Snacks
  { name: "Chocolate Chip Cookies", category: "Snacks", priceMinor: 12000, onHand: 30, imageQuery: "chocolate chip cookies" },
  { name: "Salted Crisps 150g", category: "Snacks", priceMinor: 10000, onHand: 42, imageQuery: "potato crisps bag" },
  { name: "Roasted Peanuts 200g", category: "Snacks", priceMinor: 15000, onHand: 26, imageQuery: "roasted peanuts bowl" },
  { name: "Granola Bar", category: "Snacks", priceMinor: 9000, onHand: 35, imageQuery: "granola cereal bar" },
  { name: "Buttered Popcorn", category: "Snacks", priceMinor: 8000, onHand: 20, imageQuery: "popcorn bowl" },
  { name: "Dark Chocolate Bar", category: "Snacks", priceMinor: 16000, onHand: 16, imageQuery: "dark chocolate bar" },
  { name: "Mint Chewing Gum", category: "Snacks", priceMinor: 6000, onHand: 50, imageQuery: "chewing gum pack" },

  // Bakery
  { name: "White Bread Loaf", category: "Bakery", priceMinor: 6500, onHand: 12, imageQuery: "sliced white bread" },
  { name: "Brown Bread Loaf", category: "Bakery", priceMinor: 7500, onHand: 10, imageQuery: "whole wheat bread" },
  { name: "Butter Croissant", category: "Bakery", priceMinor: 14000, onHand: 8, imageQuery: "butter croissant" },
  { name: "Blueberry Muffin", category: "Bakery", priceMinor: 12000, onHand: 6, imageQuery: "blueberry muffin" },
  { name: "Glazed Doughnut", category: "Bakery", priceMinor: 10000, onHand: 0, imageQuery: "glazed doughnut" },

  // Dairy
  { name: "Fresh Milk 500ml", category: "Dairy", priceMinor: 7000, onHand: 20, imageQuery: "milk bottle glass" },
  { name: "Greek Yogurt 250g", category: "Dairy", priceMinor: 13000, onHand: 15, imageQuery: "greek yogurt bowl" },
  { name: "Cheddar Cheese 250g", category: "Dairy", priceMinor: 48000, onHand: 7, imageQuery: "cheddar cheese block" },
  { name: "Butter 250g", category: "Dairy", priceMinor: 32000, onHand: 11, imageQuery: "butter block" },
  { name: "Eggs Tray (12)", category: "Dairy", priceMinor: 45000, onHand: 13, imageQuery: "dozen eggs carton" },
  { name: "Vanilla Ice Cream 1L", category: "Dairy", priceMinor: 55000, onHand: 5, imageQuery: "vanilla ice cream tub" },

  // Groceries
  { name: "Maize Flour 2kg", category: "Groceries", priceMinor: 18000, onHand: 32, imageQuery: "maize flour bag" },
  { name: "White Rice 1kg", category: "Groceries", priceMinor: 22000, onHand: 28, imageQuery: "white rice grains" },
  { name: "Cooking Oil 1L", category: "Groceries", priceMinor: 30000, onHand: 24, imageQuery: "cooking oil bottle" },
  { name: "Sugar 1kg", category: "Groceries", priceMinor: 16000, onHand: 40, imageQuery: "white sugar bowl" },
  { name: "Table Salt 500g", category: "Groceries", priceMinor: 5000, onHand: 46, imageQuery: "table salt" },
  { name: "Spaghetti 500g", category: "Groceries", priceMinor: 11000, onHand: 30, imageQuery: "dry spaghetti pasta" },
  { name: "Baked Beans 400g", category: "Groceries", priceMinor: 13000, onHand: 18, imageQuery: "baked beans can" },

  // Household
  { name: "Dish Soap 500ml", category: "Household", priceMinor: 17000, onHand: 21, imageQuery: "dish washing soap" },
  { name: "Laundry Detergent 1kg", category: "Household", priceMinor: 42000, onHand: 14, imageQuery: "laundry detergent powder" },
  { name: "Toilet Paper 4pk", category: "Household", priceMinor: 19000, onHand: 33, imageQuery: "toilet paper rolls" },
  { name: "Scouring Sponges", category: "Household", priceMinor: 8000, onHand: 25, imageQuery: "kitchen sponge" },
  { name: "Garbage Bags 20pk", category: "Household", priceMinor: 15000, onHand: 19, imageQuery: "garbage bin bags" },
  { name: "All-Purpose Cleaner", category: "Household", priceMinor: 24000, onHand: 3, imageQuery: "spray cleaning bottle" },

  // Personal Care
  { name: "Toothpaste 100ml", category: "Personal Care", priceMinor: 14000, onHand: 27, imageQuery: "toothpaste tube" },
  { name: "Bath Soap Bar", category: "Personal Care", priceMinor: 9000, onHand: 38, imageQuery: "bar of soap" },
  { name: "Shampoo 400ml", category: "Personal Care", priceMinor: 33000, onHand: 12, imageQuery: "shampoo bottle" },
  { name: "Roll-on Deodorant", category: "Personal Care", priceMinor: 26000, onHand: 9, imageQuery: "deodorant roll on" },
  { name: "Body Lotion 250ml", category: "Personal Care", priceMinor: 29000, onHand: 16, imageQuery: "body lotion bottle" },

  // Electronics
  { name: "USB-C Cable", category: "Electronics", priceMinor: 35000, onHand: 10, imageQuery: "usb c cable" },
  { name: "Phone Charger 20W", category: "Electronics", priceMinor: 90000, onHand: 6, imageQuery: "phone charger adapter" },
  { name: "Wireless Earbuds", category: "Electronics", priceMinor: 220000, onHand: 4, imageQuery: "wireless earbuds" },
  { name: "Power Bank 10000mAh", category: "Electronics", priceMinor: 180000, onHand: 5, imageQuery: "power bank charger" },
  { name: "AA Batteries 4pk", category: "Electronics", priceMinor: 25000, onHand: 22, imageQuery: "aa batteries" },

  // Stationery
  { name: "Ballpoint Pens 5pk", category: "Stationery", priceMinor: 7000, onHand: 29, imageQuery: "ballpoint pens" },
  { name: "A5 Notebook", category: "Stationery", priceMinor: 12000, onHand: 24, imageQuery: "notebook journal" },
  { name: "Pencil Set", category: "Stationery", priceMinor: 6000, onHand: 31, imageQuery: "pencils set" },
  { name: "Sticky Notes", category: "Stationery", priceMinor: 9000, onHand: 17, imageQuery: "sticky notes" },

  // Produce
  { name: "Bananas 1kg", category: "Produce", priceMinor: 11000, onHand: 20, imageQuery: "bunch of bananas" },
  { name: "Tomatoes 1kg", category: "Produce", priceMinor: 9000, onHand: 15, imageQuery: "fresh tomatoes" },
  { name: "Red Onions 1kg", category: "Produce", priceMinor: 10000, onHand: 18, imageQuery: "red onions" },
  { name: "Avocado (each)", category: "Produce", priceMinor: 6000, onHand: 26, imageQuery: "avocado fruit" },
  { name: "Potatoes 1kg", category: "Produce", priceMinor: 8000, onHand: 23, imageQuery: "potatoes sack" },
];

// Resolves a descriptive, copyright-free picture for a product keyword. The
// Openverse index aggregates openly-licensed (CC / public-domain) images; we
// keep only commercially-usable ones. If the index is unreachable the seed
// still succeeds — it falls back to a deterministic photo, never a broken
// URL.
const IMAGE_CONCURRENCY = 6;

async function resolveImage(query: string, fallbackSeed: string): Promise<string> {
  const fallback = `https://picsum.photos/seed/${fallbackSeed}/640/480`;
  try {
    const url =
      "https://api.openverse.org/v1/images/?" +
      new URLSearchParams({
        q: query,
        license_type: "commercial",
        mature: "false",
        page_size: "4",
      }).toString();
    const res = await fetch(url, {
      headers: { "user-agent": "DukaPOS-seed/1.0 (demo data)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return fallback;
    const body = (await res.json()) as { results?: Array<{ url?: string; thumbnail?: string }> };
    const hit = body.results?.find((r) => r.url || r.thumbnail);
    return hit?.url ?? hit?.thumbnail ?? fallback;
  } catch {
    return fallback;
  }
}

// Runs resolveImage over the whole catalog with a small concurrency pool so a
// 60-item shelf resolves in a few seconds rather than a minute.
async function resolveImages(
  entries: DemoCatalogEntry[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      const sku = slugSku(entry.name);
      resolved.set(sku, await resolveImage(entry.imageQuery, sku.toLowerCase()));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_CONCURRENCY, entries.length) }, worker),
  );
  return resolved;
}

function slugSku(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

// Dev-only credentials, printed at the end so the demo UI can be driven.
const DEMO_EMAIL = "owner@demo.duka";
const DEMO_PASSWORD = "demo1234";

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

  const ownerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "owner" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "owner",
      permissions: ["sale.create", "sale.refund", "inventory.adjust", "reports.view", "settings.manage"],
    },
  });

  // Re-hashed on every seed run so the demo password is always the one
  // documented in the README.
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: DEMO_EMAIL } },
    update: { passwordHash },
    create: { tenantId: tenant.id, email: DEMO_EMAIL, passwordHash },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: ownerRole.id } },
    update: {},
    create: { userId: user.id, roleId: ownerRole.id },
  });

  // Without a rate the sale service correctly charges 0% tax; seed the Kenya
  // standard VAT rate so the demo exercises the tax path end to end.
  await prisma.taxRate.upsert({
    where: { id: DEMO_TAX_RATE_ID },
    update: {},
    create: { id: DEMO_TAX_RATE_ID, tenantId: tenant.id, name: "VAT 16%", rateBasisPoints: 1600 },
  });

  // Categories, then the register catalog. Deterministic UUIDs keep repeated
  // seed runs idempotent.
  for (const [name, id] of Object.entries(DEMO_CATEGORY_IDS)) {
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: { id, tenantId: tenant.id, name },
    });
  }

  const images = await resolveImages(DEMO_CATALOG);
  console.log(`  images: resolved ${images.size} copyright-free product pictures`);

  // Guard against two products slugging to the same SKU — a duplicate would
  // violate the (tenantId, sku) unique constraint and abort the seed.
  const usedSkus = new Set<string>();

  let index = 0;
  for (const entry of DEMO_CATALOG) {
    index += 1;
    const productId = `00000000-0000-0000-0000-0000000001${index.toString().padStart(2, "0")}`;
    const variantId = `00000000-0000-0000-0000-0000000002${index.toString().padStart(2, "0")}`;
    let sku = slugSku(entry.name);
    if (usedSkus.has(sku)) sku = `${sku.slice(0, 20)}-${index}`;
    usedSkus.add(sku);

    const imageUrl = images.get(slugSku(entry.name)) ?? null;

    // Deterministic ids make repeated seeds idempotent, but the shelf has
    // changed since the first seed — so every field is brought up to date on
    // the update path too, never only on create. Without this, a stale row's
    // old SKU lingers and collides with the SKU another item now wants.
    const product = await prisma.product.upsert({
      where: { id: productId },
      update: {
        name: entry.name,
        categoryId: DEMO_CATEGORY_IDS[entry.category],
        imageUrl,
      },
      create: {
        id: productId,
        tenantId: tenant.id,
        categoryId: DEMO_CATEGORY_IDS[entry.category],
        name: entry.name,
        imageUrl,
      },
    });

    const variant = await prisma.variant.upsert({
      where: { id: variantId },
      update: { productId: product.id, sku, priceMinor: entry.priceMinor },
      create: {
        id: variantId,
        tenantId: tenant.id,
        productId: product.id,
        sku,
        priceMinor: entry.priceMinor,
      },
    });

    await prisma.inventoryLevel.upsert({
      where: { storeId_variantId: { storeId: store.id, variantId: variant.id } },
      update: { onHand: entry.onHand },
      create: {
        tenantId: tenant.id,
        storeId: store.id,
        variantId: variant.id,
        onHand: entry.onHand,
      },
    });

    console.log(`  catalog: ${entry.name} (${sku}) @ ${(entry.priceMinor / 100).toFixed(2)} × ${entry.onHand}`);
  }

  // The original seeded soda stays so earlier demos (barcode 6001234567890)
  // keep working.
  const sodaImage = await resolveImage("cola bottle soda", "soda-500");
  const sodaProduct = await prisma.product.upsert({
    where: { id: DEMO_PRODUCT_ID },
    update: { imageUrl: sodaImage },
    create: {
      id: DEMO_PRODUCT_ID,
      tenantId: tenant.id,
      name: "500ml Soda",
      imageUrl: sodaImage,
    },
  });

  const sodaVariant = await prisma.variant.upsert({
    where: { id: DEMO_VARIANT_ID },
    update: {},
    create: {
      id: DEMO_VARIANT_ID,
      tenantId: tenant.id,
      productId: sodaProduct.id,
      sku: "SODA-500",
      barcode: "6001234567890",
      priceMinor: 8000, // KES 80.00 — integer minor units, always
    },
  });

  await prisma.inventoryLevel.upsert({
    where: { storeId_variantId: { storeId: store.id, variantId: sodaVariant.id } },
    update: {},
    create: { tenantId: tenant.id, storeId: store.id, variantId: sodaVariant.id, onHand: 50 },
  });

  // Demo customers so the CRM tab has rows on a fresh database. Phones use
  // the canonical 2547XXXXXXXX form the whole stack normalises to.
  const DEMO_CUSTOMERS = [
    { name: "Grace Wanjiru", phone: "254711111111", email: "grace.wanjiru@example.com" },
    { name: "John Otieno", phone: "254722222222", email: "john.otieno@example.com" },
    { name: "Amina Hassan", phone: "254733333333", email: null },
    { name: "Peter Kamau", phone: "254744444444", email: null },
  ];
  for (const customer of DEMO_CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, phone: customer.phone, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      await prisma.customer.create({
        data: { tenantId: tenant.id, ...customer },
      });
    }
  }
  console.log(`  customers: ${DEMO_CUSTOMERS.length} demo walk-ins`);

  // Purchasing demo data — the Suppliers and Purchase Orders screens read
  // these. Deterministic ids keep repeated seeds idempotent.
  const DEMO_SUPPLIERS = [
    {
      id: "00000000-0000-0000-0000-0000000000a1",
      name: "Nairobi Wholesale Distributors",
      contact: { email: "sales@nairobiwholesale.example", phone: "254700000101" },
    },
    {
      id: "00000000-0000-0000-0000-0000000000a2",
      name: "Coastline Beverages Ltd",
      contact: { email: "orders@coastline.example", phone: "254700000102" },
    },
    {
      id: "00000000-0000-0000-0000-0000000000a3",
      name: "Rift Valley Grains",
      contact: { email: "info@riftgrains.example", phone: "254700000103" },
    },
    {
      id: "00000000-0000-0000-0000-0000000000a4",
      name: "TechLink Electronics",
      contact: { email: "supply@techlink.example", phone: "254700000104" },
    },
  ] as const;

  for (const supplier of DEMO_SUPPLIERS) {
    await prisma.supplier.upsert({
      where: { id: supplier.id },
      update: { name: supplier.name, contactInfo: supplier.contact },
      create: {
        id: supplier.id,
        tenantId: tenant.id,
        name: supplier.name,
        contactInfo: supplier.contact,
      },
    });
  }

  const poVariants = await prisma.variant.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 12,
  });

  const DEMO_PURCHASE_ORDERS = [
    { id: "00000000-0000-0000-0000-0000000000b1", supplierId: "00000000-0000-0000-0000-0000000000a2", status: "ORDERED", offset: 0, count: 4 },
    { id: "00000000-0000-0000-0000-0000000000b2", supplierId: "00000000-0000-0000-0000-0000000000a3", status: "RECEIVED", offset: 4, count: 3 },
    { id: "00000000-0000-0000-0000-0000000000b3", supplierId: "00000000-0000-0000-0000-0000000000a4", status: "DRAFT", offset: 7, count: 2 },
  ] as const;

  for (const order of DEMO_PURCHASE_ORDERS) {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: order.id } });
    if (existing) continue;
    const picked = poVariants.slice(order.offset, order.offset + order.count);
    if (picked.length === 0) continue;
    await prisma.purchaseOrder.create({
      data: {
        id: order.id,
        tenantId: tenant.id,
        storeId: store.id,
        supplierId: order.supplierId,
        status: order.status,
        items: {
          create: picked.map((variant, i) => ({
            variantId: variant.id,
            quantityOrdered: 10 * (i + 1),
            unitCostMinor: 5000 * (i + 1),
          })),
        },
      },
    });
  }

  // A little audit history so the Audit screen is not a blank page on a fresh
  // database. Only written when the log is empty — never on top of real rows.
  const auditCount = await prisma.auditLog.count({ where: { tenantId: tenant.id } });
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        { tenantId: tenant.id, actorUserId: user.id, action: "catalog.seed", entityType: "product", entityId: DEMO_PRODUCT_ID },
        { tenantId: tenant.id, actorUserId: user.id, action: "settings.profile.update", entityType: "tenant", entityId: tenant.id },
        { tenantId: tenant.id, actorUserId: user.id, action: "tax.create", entityType: "tax_rate", entityId: DEMO_TAX_RATE_ID },
        { tenantId: tenant.id, actorUserId: user.id, action: "store.create", entityType: "store", entityId: store.id },
        { tenantId: tenant.id, actorUserId: user.id, action: "register.create", entityType: "register", entityId: register.id },
      ],
    });
  }

  console.log(`  suppliers: ${DEMO_SUPPLIERS.length}, purchase orders: ${DEMO_PURCHASE_ORDERS.length}`);

  console.log(`Seeded demo tenant "${tenant.name}" (${tenant.id})`);
  console.log(`  store=${store.name} register=${register.name}`);
  console.log(`  taxRate="VAT 16%" (1600 basis points)`);
  console.log(`  login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  registerId=${register.id} variantId=${sodaVariant.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

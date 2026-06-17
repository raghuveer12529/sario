import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AdminRole, VendorStatus, ProductStatus, OrderStatus, PaymentStatus, RefundStatus } from "@prisma/client";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Admin user ──────────────────────────────────────────────────────────────
  // Dev password: Password1!
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@sario.in" },
    update: { passwordHash: "$2b$10$3EU5QRjIIca/adf5TzNbBuRc//YxQ8AcPFOMxn8xMebDTXKj.ISyO" },
    create: {
      email: "admin@sario.in",
      passwordHash: "$2b$10$3EU5QRjIIca/adf5TzNbBuRc//YxQ8AcPFOMxn8xMebDTXKj.ISyO",
      name: "Sario Admin",
      role: AdminRole.SUPER_ADMIN,
    },
  });

  // ── Categories ──────────────────────────────────────────────────────────────
  const ucat = (slug: string, name: string, sortOrder: number, gstBps = 500, parentId?: string) =>
    prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, gstBps, sortOrder, ...(parentId ? { parentId } : {}) },
    });

  // Level 0 — top-level departments
  const [ethnicWear, westernWear, fusionWear, lingerie, maternity, accessories, beauty] = await Promise.all([
    ucat("ethnic-wear",   "Ethnic Wear",             1),
    ucat("western-wear",  "Western Wear",             2),
    ucat("fusion-wear",   "Fusion Wear",              3),
    ucat("lingerie",      "Lingerie & Sleepwear",     4, 1200),
    ucat("maternity",     "Maternity",                5),
    ucat("accessories",   "Accessories",              6, 300),
    ucat("beauty",        "Beauty & Personal Care",   7, 1800),
  ]);

  // Level 1 — Ethnic Wear children
  const [sareesCat, salwarSuits, kurtaKurtis, lehengas, dupattas, blouses, shararaDhoti] = await Promise.all([
    ucat("sarees",          "Sarees",               1, 500, ethnicWear.id),
    ucat("salwar-suits",    "Salwar Suits",          2, 500, ethnicWear.id),
    ucat("kurtas-kurtis",   "Kurtas & Kurtis",      3, 500, ethnicWear.id),
    ucat("lehengas",        "Lehengas",              4, 500, ethnicWear.id),
    ucat("dupattas-stoles", "Dupattas & Stoles",    5, 500, ethnicWear.id),
    ucat("blouses",         "Blouses",               6, 500, ethnicWear.id),
    ucat("sharara-dhoti",   "Sharara & Dhoti Sets", 7, 500, ethnicWear.id),
  ]);

  // Level 2 — Sarees subcategories (silk / cotton / silk-cotton kept as-is for product references)
  const [silkCat, cottonCat, silkCottonCat] = await Promise.all([
    ucat("silk-sarees",        "Silk Sarees",        1, 500, sareesCat.id),
    ucat("cotton-sarees",      "Cotton Sarees",      2, 500, sareesCat.id),
    ucat("silk-cotton-sarees", "Silk-Cotton Sarees", 3, 500, sareesCat.id),
  ]);
  await Promise.all([
    ucat("georgette-sarees", "Georgette Sarees", 4, 1200, sareesCat.id),
    ucat("chiffon-sarees",   "Chiffon Sarees",   5, 1200, sareesCat.id),
    ucat("net-sarees",       "Net Sarees",        6, 1200, sareesCat.id),
    ucat("linen-sarees",     "Linen Sarees",      7,  500, sareesCat.id),
    ucat("organza-sarees",   "Organza Sarees",    8, 1200, sareesCat.id),
  ]);

  // Level 3 — Silk Sarees subcategories
  await Promise.all([
    ucat("kanjivaram",   "Kanjivaram",   1, 500, silkCat.id),
    ucat("banarasi",     "Banarasi",     2, 500, silkCat.id),
    ucat("paithani",     "Paithani",     3, 500, silkCat.id),
    ucat("mysore-silk",  "Mysore Silk",  4, 500, silkCat.id),
    ucat("tussar-silk",  "Tussar Silk",  5, 500, silkCat.id),
    ucat("uppada-silk",  "Uppada Silk",  6, 500, silkCat.id),
  ]);

  // Level 3 — Cotton Sarees subcategories
  await Promise.all([
    ucat("pochampally",     "Pochampally",     1, 500, cottonCat.id),
    ucat("chanderi-cotton", "Chanderi Cotton", 2, 500, cottonCat.id),
    ucat("linen-cotton",    "Linen Cotton",    3, 500, cottonCat.id),
    ucat("kalamkari",       "Kalamkari",       4, 500, cottonCat.id),
    ucat("sambalpuri",      "Sambalpuri",      5, 500, cottonCat.id),
  ]);

  // Level 3 — Silk-Cotton subcategories
  await Promise.all([
    ucat("chanderi-silk-cotton", "Chanderi Silk-Cotton", 1, 500, silkCottonCat.id),
    ucat("gadwal",               "Gadwal",               2, 500, silkCottonCat.id),
    ucat("ikkat-silk-cotton",    "Ikkat Silk-Cotton",    3, 500, silkCottonCat.id),
  ]);

  // Level 2 — Salwar Suits subcategories
  await Promise.all([
    ucat("anarkali",       "Anarkali",       1, 500, salwarSuits.id),
    ucat("straight-cut",   "Straight Cut",   2, 500, salwarSuits.id),
    ucat("palazzo-set",    "Palazzo Set",    3, 500, salwarSuits.id),
    ucat("patiala",        "Patiala",        4, 500, salwarSuits.id),
    ucat("pakistani-suit", "Pakistani Style",5, 500, salwarSuits.id),
  ]);

  // Level 2 — Kurtas & Kurtis subcategories
  await Promise.all([
    ucat("a-line-kurti",     "A-Line",     1, 500, kurtaKurtis.id),
    ucat("straight-kurti",   "Straight",   2, 500, kurtaKurtis.id),
    ucat("flared-kurti",     "Flared",     3, 500, kurtaKurtis.id),
    ucat("asymmetric-kurti", "Asymmetric", 4, 500, kurtaKurtis.id),
    ucat("high-low-kurti",   "High-Low",   5, 500, kurtaKurtis.id),
  ]);

  // Level 2 — Lehenga subcategories
  await Promise.all([
    ucat("bridal-lehenga",    "Bridal",    1, 500, lehengas.id),
    ucat("party-lehenga",     "Party Wear",2, 500, lehengas.id),
    ucat("casual-lehenga",    "Casual",    3, 500, lehengas.id),
  ]);

  // Level 2 — Blouses subcategories
  await Promise.all([
    ucat("readymade-blouse",  "Readymade",  1, 500, blouses.id),
    ucat("unstitched-blouse", "Unstitched", 2, 500, blouses.id),
  ]);

  // Level 1 — Western Wear children
  await Promise.all([
    ucat("tops-tshirts",      "Tops & T-Shirts",    1, 1200, westernWear.id),
    ucat("dresses-jumpsuits", "Dresses & Jumpsuits",2, 1200, westernWear.id),
    ucat("jeans-trousers",    "Jeans & Trousers",   3, 1200, westernWear.id),
    ucat("skirts",            "Skirts",              4, 1200, westernWear.id),
    ucat("coord-sets",        "Co-ord Sets",         5, 1200, westernWear.id),
    ucat("sweatshirts",       "Sweatshirts & Hoodies",6,1200, westernWear.id),
  ]);

  // Level 1 — Fusion Wear children
  await Promise.all([
    ucat("indo-western-dresses", "Indo-Western Dresses", 1, 500, fusionWear.id),
    ucat("cape-jacket-kurtas",   "Cape & Jacket Kurtas", 2, 500, fusionWear.id),
    ucat("dhoti-sarees",         "Dhoti Sarees",          3, 500, fusionWear.id),
    ucat("shirt-sarees",         "Shirt Sarees",           4, 500, fusionWear.id),
  ]);

  // Level 1 — Lingerie subcategories
  await Promise.all([
    ucat("bras-bralettes",   "Bras & Bralettes",    1, 1200, lingerie.id),
    ucat("panties-shapewear","Panties & Shapewear", 2, 1200, lingerie.id),
    ucat("nightwear",        "Nightgowns & Pyjamas",3, 1200, lingerie.id),
    ucat("camisoles-slips",  "Camisoles & Slips",   4, 1200, lingerie.id),
  ]);

  // Level 1 — Maternity subcategories
  await Promise.all([
    ucat("maternity-kurtas",  "Maternity Kurtas",  1, 500, maternity.id),
    ucat("maternity-dresses", "Maternity Dresses", 2, 500, maternity.id),
    ucat("nursing-tops",      "Nursing Tops",       3, 500, maternity.id),
  ]);

  // Level 1 — Accessories children
  const [jewellery, footwear] = await Promise.all([
    ucat("jewellery",           "Jewellery",            1, 300, accessories.id),
    ucat("handbags-clutches",   "Handbags & Clutches",  2, 1200, accessories.id),
    ucat("footwear",            "Footwear",              3, 1200, accessories.id),
    ucat("belts-hair-acc",      "Belts & Hair Accessories",4,1200, accessories.id),
    ucat("sunglasses-watches",  "Sunglasses & Watches", 5, 1800, accessories.id),
  ]).then(([j, , f]) => [j, f]);

  // Level 2 — Jewellery subcategories
  await Promise.all([
    ucat("earrings",   "Earrings",   1, 300, jewellery.id),
    ucat("necklaces",  "Necklaces",  2, 300, jewellery.id),
    ucat("bangles",    "Bangles",    3, 300, jewellery.id),
    ucat("maang-tikka","Maang Tikka",4, 300, jewellery.id),
    ucat("rings",      "Rings",      5, 300, jewellery.id),
  ]);

  // Level 2 — Footwear subcategories
  await Promise.all([
    ucat("heels",      "Heels",      1, 1200, footwear.id),
    ucat("flats",      "Flats",      2,  500, footwear.id),
    ucat("kolhapuris", "Kolhapuris", 3,  500, footwear.id),
    ucat("juttis",     "Juttis",     4,  500, footwear.id),
    ucat("sandals",    "Sandals",    5,  500, footwear.id),
  ]);

  // Level 1 — Beauty subcategories
  await Promise.all([
    ucat("skincare", "Skincare", 1, 1800, beauty.id),
    ucat("haircare", "Haircare", 2, 1800, beauty.id),
    ucat("makeup",   "Makeup",   3, 1800, beauty.id),
  ]);

  // ── Buyers ──────────────────────────────────────────────────────────────────
  const [priya, ananya, meera, kavya, sita] = await Promise.all([
    prisma.user.upsert({ where: { phone: "+919876543210" }, update: {}, create: { phone: "+919876543210", name: "Priya Sharma", email: "priya@example.com", isVerified: true, trustScore: 80 } }),
    prisma.user.upsert({ where: { phone: "+919123456789" }, update: {}, create: { phone: "+919123456789", name: "Ananya Patel", email: "ananya@example.com", isVerified: true, trustScore: 75 } }),
    prisma.user.upsert({ where: { phone: "+919988776655" }, update: {}, create: { phone: "+919988776655", name: "Meera Nair", email: "meera@example.com", isVerified: true, trustScore: 90 } }),
    prisma.user.upsert({ where: { phone: "+918765432109" }, update: {}, create: { phone: "+918765432109", name: "Kavya Reddy", email: "kavya@example.com", isVerified: true, trustScore: 70 } }),
    prisma.user.upsert({ where: { phone: "+917654321098" }, update: {}, create: { phone: "+917654321098", name: "Sita Krishnan", email: "sita@example.com", isVerified: true, trustScore: 65 } }),
  ]);

  // ── Vendor owner accounts — Dev password: Password1! ────────────────────────
  // Login at /auth/vendor/login with these email + password credentials
  const vendorPwHash = "$2b$10$3EU5QRjIIca/adf5TzNbBuRc//YxQ8AcPFOMxn8xMebDTXKj.ISyO";
  const [vendorUser1, vendorUser2] = await Promise.all([
    prisma.user.upsert({
      where: { email: "vendor1@sario.dev" },
      update: { passwordHash: vendorPwHash, isVerified: true },
      create: { email: "vendor1@sario.dev", phone: "+919000000001", name: "Roop Kashish Owner", passwordHash: vendorPwHash, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: "vendor2@sario.dev" },
      update: { passwordHash: vendorPwHash, isVerified: true },
      create: { email: "vendor2@sario.dev", phone: "+919000000002", name: "Chanderi Craft Studio Owner", passwordHash: vendorPwHash, isVerified: true },
    }),
  ]);

  // ── Vendors ─────────────────────────────────────────────────────────────────
  const upsertVendor = async (slug: string, data: Parameters<typeof prisma.vendor.create>[0]["data"]) => {
    const existing = await prisma.vendor.findUnique({ where: { slug } });
    if (existing) return existing;
    return prisma.vendor.create({ data });
  };

  const [rookash, chanderi, nalli, banarasi, pochampally, mysoreEmporium] = await Promise.all([
    upsertVendor("roop-kashish-textiles", {
      businessName: "Roop Kashish Textiles",
      slug: "roop-kashish-textiles",
      gstin: "07AAACR5432C1ZK",
      pan: "AAACR5432C",
      status: VendorStatus.APPROVED,
      about: "Delhi-based heritage textile house specialising in Kanjivaram and Banarasi weaves since 1978.",
      returnPolicy: "7-day returns on all orders. Items must be in original condition with tags.",
      commissionBps: 1200,
      userId: vendorUser1.id,
      bankAccounts: {
        create: { accountHolder: "Roop Kashish Textiles Pvt Ltd", accountNumber: "00112233445566", ifsc: "AXIS0001234", bankName: "Axis Bank", isPrimary: true, isPennyDropDone: true, isVerified: true },
      },
    }),
    upsertVendor("chanderi-craft-studio", {
      businessName: "Chanderi Craft Studio",
      slug: "chanderi-craft-studio",
      gstin: "23AAACC1111D1ZM",
      pan: "AAACC1111D",
      status: VendorStatus.APPROVED,
      about: "Madhya Pradesh-based studio working directly with Chanderi master weavers to preserve traditional craft.",
      returnPolicy: "7-day hassle-free returns.",
      commissionBps: 1400,
      userId: vendorUser2.id,
      bankAccounts: {
        create: { accountHolder: "Chanderi Craft Studio LLP", accountNumber: "00998877665544", ifsc: "ICIC0005678", bankName: "ICICI Bank", isPrimary: true, isPennyDropDone: true, isVerified: true },
      },
    }),
    upsertVendor("nalli-silks-pvt-ltd", {
      businessName: "Nalli Silks Pvt Ltd",
      slug: "nalli-silks-pvt-ltd",
      gstin: "33AACCN4307B1ZQ",
      pan: "AACCN4307B",
      status: VendorStatus.PENDING,
      about: "One of India's most trusted names in handloom sarees since 1928.",
      commissionBps: 1000,
      bankAccounts: {
        create: { accountHolder: "Nalli Chinnasami Chetty", accountNumber: "11223344556677", ifsc: "HDFC0001111", bankName: "HDFC Bank", isPrimary: true, isPennyDropDone: true, isVerified: false },
      },
    }),
    upsertVendor("banarasi-brocade-house", {
      businessName: "Banarasi Brocade House",
      slug: "banarasi-brocade-house",
      gstin: "09AABCB1234A1ZP",
      pan: "AABCB1234A",
      status: VendorStatus.PENDING,
      about: "Varanasi weavers collective producing authentic Banarasi brocade for three generations.",
      commissionBps: 1500,
      bankAccounts: {
        create: { accountHolder: "Banarasi Brocade House", accountNumber: "22334455667788", ifsc: "SBIN0001234", bankName: "SBI", isPrimary: true, isPennyDropDone: true, isVerified: false },
      },
    }),
    upsertVendor("pochampally-weavers-coop", {
      businessName: "Pochampally Weavers Co-op",
      slug: "pochampally-weavers-coop",
      gstin: "36AAACP9876B1ZT",
      pan: "AAACP9876B",
      status: VendorStatus.PENDING,
      about: "GI-certified cooperative of 120+ weaver families in Pochampally village, Telangana.",
      commissionBps: 800,
      bankAccounts: {
        create: { accountHolder: "Pochampally Handloom Weavers Coop Society", accountNumber: "33445566778899", ifsc: "CNRB0001234", bankName: "Canara Bank", isPrimary: true, isPennyDropDone: true, isVerified: true },
      },
    }),
    upsertVendor("mysore-silk-emporium", {
      businessName: "Mysore Silk Emporium",
      slug: "mysore-silk-emporium",
      gstin: "29AAACM8765E1ZN",
      pan: "AAACM8765E",
      status: VendorStatus.SUSPENDED,
      about: "Bangalore-based emporium for authentic Mysore silk.",
      commissionBps: 1500,
      bankAccounts: {
        create: { accountHolder: "Mysore Silk Emporium", accountNumber: "44556677889900", ifsc: "KARB0001234", bankName: "Karnataka Bank", isPrimary: true, isPennyDropDone: true, isVerified: true },
      },
    }),
  ]);

  // ── Helper: upsert product ──────────────────────────────────────────────────
  const upsertProduct = async (slug: string, data: Parameters<typeof prisma.product.create>[0]["data"]) => {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) return existing;
    return prisma.product.create({ data });
  };

  // ── APPROVED products (storefront visible) ──────────────────────────────────
  const kanjiMain = await upsertProduct("kanjivaram-pure-silk-peacock", {
    vendorId: rookash.id,
    categoryId: silkCat.id,
    name: "Kanjivaram Pure Silk Saree — Peacock Motif",
    slug: "kanjivaram-pure-silk-peacock",
    description: "Woven over three days on a traditional pit loom in Kanchipuram, this saree features the iconic peacock motif in zari on a deep crimson field. The double warp construction gives it the characteristic weight and drape that Kanjivaram silk is renowned for.",
    fabric: "Kanjivaram",
    region: "Kanchipuram, Tamil Nadu",
    weaverStory: "Woven by master weaver Ramasamy and his son at their ancestral pit loom workshop in Pillaiyar Koil Street, Kanchipuram. The family has been weaving since 1923.",
    giTag: "Kanchipuram Silk",
    status: ProductStatus.APPROVED,
    qualityScore: 95,
    tags: ["kanjivaram", "silk", "zari", "wedding", "bridal"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Deep Crimson", sku: "KAN-CRI-001", color: "#8B1A1A", pricePaise: 1249900, mrpPaise: 1599900, inventory: { create: { quantity: 3, reservedQuantity: 1 } } },
        { name: "Royal Peacock Blue", sku: "KAN-BLU-001", color: "#1B4F72", pricePaise: 1249900, mrpPaise: 1599900, inventory: { create: { quantity: 2, reservedQuantity: 0 } } },
        { name: "Forest Green", sku: "KAN-GRN-001", color: "#1A5276", pricePaise: 1299900, mrpPaise: 1599900, inventory: { create: { quantity: 0, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", altText: "Kanjivaram silk saree front view", isPrimary: true, sortOrder: 0 },
        { url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80", altText: "Pallu detail", sortOrder: 1 },
        { url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80", altText: "Border closeup", sortOrder: 2 },
        { url: "https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&q=80", altText: "Full length drape", sortOrder: 3 },
      ],
    },
  });

  const banarasi1 = await upsertProduct("banarasi-katan-zari-brocade", {
    vendorId: rookash.id,
    categoryId: silkCat.id,
    name: "Banarasi Katan Silk Saree — Zari Brocade",
    slug: "banarasi-katan-zari-brocade",
    description: "Handwoven in Varanasi on a Jacquard loom, this Katan silk saree is adorned with intricate zari brocade across the body and a heavy pallu. A timeless piece for weddings and celebrations.",
    fabric: "Banarasi",
    region: "Varanasi, Uttar Pradesh",
    weaverStory: "Made in the bustling weaving district of Madanpura, Varanasi by the Ansari family who have mastered the Jacquard loom over four generations.",
    giTag: "Banarasi Brocade",
    status: ProductStatus.APPROVED,
    qualityScore: 90,
    tags: ["banarasi", "silk", "zari", "brocade", "wedding"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Ivory Gold", sku: "BAN-IVG-001", color: "#F5F0DC", pricePaise: 849900, mrpPaise: 999900, inventory: { create: { quantity: 4, reservedQuantity: 1 } } },
        { name: "Deep Burgundy", sku: "BAN-BUR-001", color: "#800020", pricePaise: 849900, mrpPaise: 999900, inventory: { create: { quantity: 2, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80", altText: "Banarasi saree in gold", isPrimary: true, sortOrder: 0 },
        { url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", altText: "Zari work detail", sortOrder: 1 },
      ],
    },
  });

  const tussar = await upsertProduct("tussar-raw-silk-natural-indigo", {
    vendorId: rookash.id,
    categoryId: silkCat.id,
    name: "Tussar Raw Silk Saree — Natural Indigo Dye",
    slug: "tussar-raw-silk-natural-indigo",
    description: "Wild Tussar silk hand-dyed with natural indigo from Jharkhand forests. The irregular slub texture and earth tones are a hallmark of authentic Tussar weaving.",
    fabric: "Tussar",
    region: "Bhagalpur, Bihar",
    weaverStory: "Woven by Reshma Devi's cooperative in Nathnagar, Bhagalpur — the silk city of India. Natural dyes sourced from forests within 50 km.",
    status: ProductStatus.APPROVED,
    qualityScore: 85,
    tags: ["tussar", "natural-dye", "handloom", "sustainable"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Indigo Blue", sku: "TUS-IND-001", pricePaise: 389900, mrpPaise: 489900, inventory: { create: { quantity: 6, reservedQuantity: 0 } } },
        { name: "Natural Ivory", sku: "TUS-NAT-001", pricePaise: 369900, mrpPaise: 449900, inventory: { create: { quantity: 4, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80", altText: "Tussar silk saree", isPrimary: true, sortOrder: 0 },
      ],
    },
  });

  const paithani = await upsertProduct("paithani-silk-peacock-lotus", {
    vendorId: rookash.id,
    categoryId: silkCat.id,
    name: "Paithani Silk Saree — Peacock & Lotus",
    slug: "paithani-silk-peacock-lotus",
    description: "One of Maharashtra's most treasured handloom traditions, this Paithani silk saree features the classic peacock and lotus motif in vibrant contrast zari on a rich mulberry silk base.",
    fabric: "Paithani",
    region: "Paithan, Maharashtra",
    giTag: "Paithani Saree",
    status: ProductStatus.APPROVED,
    qualityScore: 88,
    tags: ["paithani", "silk", "maharashtra", "wedding", "bridal", "zari"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Purple with Gold", sku: "PAI-PUR-001", pricePaise: 1899900, mrpPaise: 2299900, inventory: { create: { quantity: 2, reservedQuantity: 0 } } },
        { name: "Green with Red", sku: "PAI-GRE-001", pricePaise: 1899900, mrpPaise: 2299900, inventory: { create: { quantity: 1, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1631125915902-d8abe9225ff2?w=800&q=80", altText: "Paithani saree", isPrimary: true, sortOrder: 0 },
      ],
    },
  });

  const pochampally1 = await upsertProduct("pochampally-double-ikat-cotton", {
    vendorId: chanderi.id,
    categoryId: cottonCat.id,
    name: "Pochampally Double Ikat Cotton Saree",
    slug: "pochampally-double-ikat-cotton",
    description: "Made using the rare double ikat technique where both warp and weft threads are resist-dyed before weaving. Each piece takes 5–7 days to complete and is unique.",
    fabric: "Pochampally",
    region: "Pochampally, Telangana",
    giTag: "Pochampally Ikat",
    status: ProductStatus.APPROVED,
    qualityScore: 82,
    tags: ["pochampally", "ikat", "cotton", "telangana", "handloom"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Mustard & Maroon", sku: "POC-MUS-001", pricePaise: 349900, mrpPaise: 349900, inventory: { create: { quantity: 8, reservedQuantity: 2 } } },
        { name: "Teal & Black", sku: "POC-TEA-001", pricePaise: 349900, mrpPaise: 349900, inventory: { create: { quantity: 5, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80", altText: "Pochampally ikat saree", isPrimary: true, sortOrder: 0 },
      ],
    },
  });

  const chanderi1 = await upsertProduct("chanderi-silk-cotton-floral-jaal", {
    vendorId: chanderi.id,
    categoryId: silkCottonCat.id,
    name: "Chanderi Silk-Cotton Saree — Floral Jaal",
    slug: "chanderi-silk-cotton-floral-jaal",
    description: "Gossamer-light Chanderi silk-cotton with a delicate floral jaal pattern woven throughout. The translucent fabric and subtle sheen are characteristic of authentic Chanderi weaving.",
    fabric: "Chanderi",
    region: "Chanderi, Madhya Pradesh",
    giTag: "Chanderi Fabric",
    status: ProductStatus.APPROVED,
    qualityScore: 80,
    tags: ["chanderi", "silk-cotton", "madhya-pradesh", "lightweight", "festive"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Pastel Pink", sku: "CHA-PNK-001", pricePaise: 529900, mrpPaise: 649900, inventory: { create: { quantity: 5, reservedQuantity: 0 } } },
        { name: "Sage Green", sku: "CHA-GRN-001", pricePaise: 529900, mrpPaise: 649900, inventory: { create: { quantity: 3, reservedQuantity: 0 } } },
        { name: "Sky Blue", sku: "CHA-BLU-001", pricePaise: 559900, mrpPaise: 679900, inventory: { create: { quantity: 2, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=800&q=80", altText: "Chanderi saree", isPrimary: true, sortOrder: 0 },
      ],
    },
  });

  const gadwal = await upsertProduct("gadwal-cotton-silk-checks-stripes", {
    vendorId: chanderi.id,
    categoryId: silkCottonCat.id,
    name: "Gadwal Cotton-Silk Saree — Checks & Stripes",
    slug: "gadwal-cotton-silk-checks-stripes",
    description: "Traditional Gadwal saree with a pure silk border contrasting against a cotton body. The distinctive checks and stripes pattern is achieved through a unique interlocking weave technique.",
    fabric: "Gadwal",
    region: "Gadwal, Telangana",
    status: ProductStatus.APPROVED,
    qualityScore: 78,
    tags: ["gadwal", "cotton-silk", "telangana", "checks", "daily-wear"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Navy & Gold", sku: "GAD-NAV-001", pricePaise: 279900, mrpPaise: 329900, inventory: { create: { quantity: 10, reservedQuantity: 0 } } },
        { name: "Red & Green", sku: "GAD-RED-001", pricePaise: 279900, mrpPaise: 329900, inventory: { create: { quantity: 8, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1622495966027-e7a6b89d4e49?w=800&q=80", altText: "Gadwal saree", isPrimary: true, sortOrder: 0 },
      ],
    },
  });

  const mysore1 = await upsertProduct("mysore-crepe-silk-temple-border", {
    vendorId: chanderi.id,
    categoryId: silkCat.id,
    name: "Mysore Crepe Silk Saree — Temple Border",
    slug: "mysore-crepe-silk-temple-border",
    description: "Made from KSIC-certified pure Mysore silk with the characteristic smooth crepe finish. The intricate temple border design uses traditional Mysore-style buttas.",
    fabric: "Mysore Silk",
    region: "Mysuru, Karnataka",
    giTag: "Mysore Silk",
    status: ProductStatus.APPROVED,
    qualityScore: 76,
    tags: ["mysore-silk", "karnataka", "crepe", "silk", "temple-border"],
    searchIndexedAt: new Date(),
    variants: {
      create: [
        { name: "Deep Violet", sku: "MYS-VIO-001", pricePaise: 449900, mrpPaise: 549900, inventory: { create: { quantity: 4, reservedQuantity: 0 } } },
        { name: "Ruby Red", sku: "MYS-RED-001", pricePaise: 449900, mrpPaise: 549900, inventory: { create: { quantity: 3, reservedQuantity: 0 } } },
      ],
    },
    images: {
      create: [
        { url: "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=800&q=80", altText: "Mysore silk saree", isPrimary: true, sortOrder: 0 },
      ],
    },
  });

  // ── PENDING_REVIEW products ─────────────────────────────────────────────────
  await upsertProduct("nalli-kanjivaram-pure-silk-red", {
    vendorId: nalli.id, categoryId: silkCat.id,
    name: "Nalli Kanjivaram Pure Silk — Classic Red",
    slug: "nalli-kanjivaram-pure-silk-red",
    description: "Classic Kanjivaram pure silk in deep red with traditional gold zari border.",
    fabric: "Kanjivaram", region: "Kanchipuram, Tamil Nadu",
    status: ProductStatus.PENDING_REVIEW, tags: ["kanjivaram", "silk"],
    variants: { create: [{ name: "Deep Red", sku: "NAL-RED-001", pricePaise: 1099900, mrpPaise: 1349900, inventory: { create: { quantity: 5, reservedQuantity: 0 } } }] },
    images: { create: [{ url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("nalli-mysore-crepe-navy", {
    vendorId: nalli.id, categoryId: silkCat.id,
    name: "Nalli Mysore Crepe Silk — Navy Blue",
    slug: "nalli-mysore-crepe-navy",
    description: "Smooth Mysore crepe silk in rich navy blue with silver border.",
    fabric: "Mysore Silk", region: "Mysuru, Karnataka",
    status: ProductStatus.PENDING_REVIEW, tags: ["mysore-silk", "crepe"],
    variants: { create: [{ name: "Navy Blue", sku: "NAL-NAV-001", pricePaise: 479900, mrpPaise: 599900, inventory: { create: { quantity: 3, reservedQuantity: 0 } } }] },
    images: { create: [{ url: "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=600&q=80", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("banarasi-georgette-royal-blue", {
    vendorId: banarasi.id, categoryId: silkCat.id,
    name: "Banarasi Georgette Saree — Royal Blue",
    slug: "banarasi-georgette-royal-blue",
    description: "Lightweight Banarasi georgette with silver zari threadwork on royal blue.",
    fabric: "Banarasi", region: "Varanasi, Uttar Pradesh",
    status: ProductStatus.PENDING_REVIEW, tags: ["banarasi", "georgette"],
    variants: { create: [{ name: "Royal Blue", sku: "BAN-GEO-001", pricePaise: 589900, mrpPaise: 719900, inventory: { create: { quantity: 4, reservedQuantity: 0 } } }] },
    images: { create: [{ url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("pochampally-ikat-silk-wedding", {
    vendorId: pochampally.id, categoryId: silkCat.id,
    name: "Pochampally Ikat Silk Saree — Wedding Collection",
    slug: "pochampally-ikat-silk-wedding",
    description: "Premium Pochampally ikat in pure silk with vibrant geometric patterns.",
    fabric: "Pochampally", region: "Pochampally, Telangana",
    status: ProductStatus.PENDING_REVIEW, tags: ["pochampally", "ikat", "silk"],
    variants: { create: [{ name: "Crimson & Gold", sku: "POC-WED-001", pricePaise: 699900, mrpPaise: 849900, inventory: { create: { quantity: 3, reservedQuantity: 0 } } }] },
    images: { create: [{ url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("pochampally-single-ikat-cotton-daily", {
    vendorId: pochampally.id, categoryId: cottonCat.id,
    name: "Pochampally Single Ikat Cotton — Everyday Wear",
    slug: "pochampally-single-ikat-cotton-daily",
    description: "Comfortable single ikat cotton saree for everyday wear. Hand-dyed with azo-free dyes.",
    fabric: "Pochampally", region: "Pochampally, Telangana",
    status: ProductStatus.PENDING_REVIEW, tags: ["pochampally", "cotton", "daily-wear"],
    variants: { create: [{ name: "Teal Ikat", sku: "POC-TEA-DAI-001", pricePaise: 189900, mrpPaise: 229900, inventory: { create: { quantity: 12, reservedQuantity: 0 } } }] },
    images: { create: [{ url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80", isPrimary: true, sortOrder: 0 }] },
  });

  // ── REJECTED products ───────────────────────────────────────────────────────
  await upsertProduct("mysore-silk-emporium-plain-crepe", {
    vendorId: mysoreEmporium.id, categoryId: silkCat.id,
    name: "Mysore Pure Silk — Plain Crepe",
    slug: "mysore-silk-emporium-plain-crepe",
    description: "Plain Mysore pure silk saree.",
    fabric: "Mysore Silk", region: "Mysuru, Karnataka",
    status: ProductStatus.REJECTED, rejectionReason: "Images do not match description. Product photos appear to be stock images, not of the actual product.",
    tags: ["mysore-silk"],
    variants: { create: [{ name: "Ivory", sku: "MYS-EMP-001", pricePaise: 399900, mrpPaise: 499900, inventory: { create: { quantity: 0, reservedQuantity: 0 } } }] },
    images: { create: [{ url: "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=600&q=80", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("chanderi-cotton-digital-print", {
    vendorId: chanderi.id, categoryId: cottonCat.id,
    name: "Chanderi Cotton Digital Print",
    slug: "chanderi-cotton-digital-print",
    description: "Chanderi cotton saree with digital floral print.",
    fabric: "Chanderi", region: "Chanderi, Madhya Pradesh",
    status: ProductStatus.REJECTED, rejectionReason: "Digital print sarees are not accepted on Sario. Platform is for handwoven and hand-printed textiles only.",
    tags: ["chanderi", "digital-print"],
    variants: { create: [{ name: "Multicolour", sku: "CHA-DIG-001", pricePaise: 189900, mrpPaise: 249900, inventory: { create: { quantity: 0, reservedQuantity: 0 } } }] },
    images: { create: [{ url: "https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&q=80", isPrimary: true, sortOrder: 0 }] },
  });

  // ── Fetch category IDs not captured as variables ────────────────────────────
  const [georgetteCat, chiffonCat, netCat, handbagsCat, skincareCat, haircareCat, makeupCat] = await Promise.all([
    prisma.category.findUniqueOrThrow({ where: { slug: "georgette-sarees" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "chiffon-sarees" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "net-sarees" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "handbags-clutches" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "skincare" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "haircare" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "makeup" } }),
  ]);

  // ── Additional APPROVED products — new categories ────────────────────────────

  // Georgette Sarees
  await upsertProduct("georgette-floral-print-heavy-border", {
    vendorId: rookash.id, categoryId: georgetteCat.id,
    name: "Georgette Floral Print Saree — Heavy Border",
    slug: "georgette-floral-print-heavy-border",
    description: "Lightweight georgette with an all-over floral print and a heavily embellished stone-work border. Flows beautifully and is ideal for parties and festivals.",
    fabric: "Georgette",
    status: ProductStatus.APPROVED, qualityScore: 74, searchIndexedAt: new Date(),
    tags: ["georgette", "printed", "party-wear", "festive"],
    variants: {
      create: [
        { name: "Coral Pink", sku: "GEO-COR-001", pricePaise: 179900, mrpPaise: 229900, inventory: { create: { quantity: 15, reservedQuantity: 2 } } },
        { name: "Teal Green", sku: "GEO-TEA-001", pricePaise: 179900, mrpPaise: 229900, inventory: { create: { quantity: 10, reservedQuantity: 0 } } },
        { name: "Royal Blue", sku: "GEO-BLU-001", pricePaise: 189900, mrpPaise: 239900, inventory: { create: { quantity: 8,  reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80", altText: "Georgette saree", isPrimary: true, sortOrder: 0 }] },
  });

  // Chiffon Sarees
  await upsertProduct("chiffon-sequin-work-saree-midnight", {
    vendorId: chanderi.id, categoryId: chiffonCat.id,
    name: "Chiffon Saree with Sequin Work — Midnight Glam",
    slug: "chiffon-sequin-work-saree-midnight",
    description: "Sheer chiffon saree with hand-applied sequin work across the pallu and a plain body for a balanced look. Perfect for evening events.",
    fabric: "Chiffon",
    status: ProductStatus.APPROVED, qualityScore: 72, searchIndexedAt: new Date(),
    tags: ["chiffon", "sequin", "evening", "party-wear"],
    variants: {
      create: [
        { name: "Midnight Black", sku: "CHF-BLK-001", pricePaise: 149900, mrpPaise: 199900, inventory: { create: { quantity: 12, reservedQuantity: 0 } } },
        { name: "Wine Red",       sku: "CHF-WIN-001", pricePaise: 149900, mrpPaise: 199900, inventory: { create: { quantity: 9,  reservedQuantity: 1 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80", altText: "Chiffon sequin saree", isPrimary: true, sortOrder: 0 }] },
  });

  // Net Sarees
  await upsertProduct("net-saree-thread-embroidery-bridal", {
    vendorId: rookash.id, categoryId: netCat.id,
    name: "Net Saree with Thread Embroidery — Bridal",
    slug: "net-saree-thread-embroidery-bridal",
    description: "Sheer net saree with dense thread embroidery work on the pallu and borders. Comes with a matching stitched blouse. A favourite for wedding receptions.",
    fabric: "Net",
    status: ProductStatus.APPROVED, qualityScore: 80, searchIndexedAt: new Date(),
    tags: ["net", "embroidery", "bridal", "reception", "wedding"],
    variants: {
      create: [
        { name: "Champagne Gold", sku: "NET-CHA-001", pricePaise: 599900, mrpPaise: 749900, inventory: { create: { quantity: 5, reservedQuantity: 0 } } },
        { name: "Blush Pink",     sku: "NET-BLU-001", pricePaise: 599900, mrpPaise: 749900, inventory: { create: { quantity: 4, reservedQuantity: 0 } } },
        { name: "Ivory White",    sku: "NET-IVO-001", pricePaise: 649900, mrpPaise: 799900, inventory: { create: { quantity: 3, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1631125915902-d8abe9225ff2?w=800&q=80", altText: "Net bridal saree", isPrimary: true, sortOrder: 0 }] },
  });

  // Salwar Suits
  await upsertProduct("lucknowi-chikankari-anarkali-suit", {
    vendorId: rookash.id, categoryId: salwarSuits.id,
    name: "Lucknowi Chikankari Anarkali Suit",
    slug: "lucknowi-chikankari-anarkali-suit",
    description: "Hand-embroidered Chikankari Anarkali suit in pure georgette. The delicate white threadwork on a pastel base is the hallmark of Lucknow's finest artisans. Set includes kurta, palazzo and dupatta.",
    fabric: "Georgette", region: "Lucknow, Uttar Pradesh",
    status: ProductStatus.APPROVED, qualityScore: 88, searchIndexedAt: new Date(),
    tags: ["chikankari", "anarkali", "lucknow", "handembroidered", "festive"],
    variants: {
      create: [
        { name: "Ivory",       sku: "CHK-IVO-001", pricePaise: 449900, mrpPaise: 549900, inventory: { create: { quantity: 8, reservedQuantity: 1 } } },
        { name: "Mint Green",  sku: "CHK-MNT-001", pricePaise: 449900, mrpPaise: 549900, inventory: { create: { quantity: 6, reservedQuantity: 0 } } },
        { name: "Powder Blue", sku: "CHK-PWD-001", pricePaise: 469900, mrpPaise: 569900, inventory: { create: { quantity: 5, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", altText: "Chikankari Anarkali suit", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("hand-block-print-cotton-straight-suit", {
    vendorId: chanderi.id, categoryId: salwarSuits.id,
    name: "Hand Block Print Cotton Straight Suit — Jaipur",
    slug: "hand-block-print-cotton-straight-suit",
    description: "Sanganeri hand block printed cotton straight suit from Jaipur. Breathable and light, ideal for daily wear and office. Set includes kurta, churidar and cotton dupatta.",
    fabric: "Cotton", region: "Jaipur, Rajasthan",
    status: ProductStatus.APPROVED, qualityScore: 76, searchIndexedAt: new Date(),
    tags: ["block-print", "cotton", "jaipur", "daily-wear", "office-wear"],
    variants: {
      create: [
        { name: "Indigo Floral", sku: "BLK-IND-001", pricePaise: 189900, mrpPaise: 239900, inventory: { create: { quantity: 20, reservedQuantity: 3 } } },
        { name: "Red Buti",      sku: "BLK-RED-001", pricePaise: 189900, mrpPaise: 239900, inventory: { create: { quantity: 15, reservedQuantity: 0 } } },
        { name: "Black Stripe",  sku: "BLK-BLK-001", pricePaise: 199900, mrpPaise: 249900, inventory: { create: { quantity: 12, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=800&q=80", altText: "Block print cotton suit", isPrimary: true, sortOrder: 0 }] },
  });

  // Kurtas & Kurtis
  await upsertProduct("ajrakh-a-line-kurti-kalamkari", {
    vendorId: chanderi.id, categoryId: kurtaKurtis.id,
    name: "Ajrakh Print A-Line Kurti — Kalamkari",
    slug: "ajrakh-a-line-kurti-kalamkari",
    description: "Soft cotton A-line kurti with traditional Ajrakh block print from Kutch. The natural indigo and madder dyes give it its signature deep tones. Pairs with palazzos or jeans.",
    fabric: "Cotton", region: "Kutch, Gujarat",
    status: ProductStatus.APPROVED, qualityScore: 78, searchIndexedAt: new Date(),
    tags: ["ajrakh", "kurti", "a-line", "kutch", "natural-dye"],
    variants: {
      create: [
        { name: "S",  sku: "AJR-KUR-S",  pricePaise: 129900, mrpPaise: 159900, inventory: { create: { quantity: 10, reservedQuantity: 0 } } },
        { name: "M",  sku: "AJR-KUR-M",  pricePaise: 129900, mrpPaise: 159900, inventory: { create: { quantity: 15, reservedQuantity: 2 } } },
        { name: "L",  sku: "AJR-KUR-L",  pricePaise: 129900, mrpPaise: 159900, inventory: { create: { quantity: 12, reservedQuantity: 1 } } },
        { name: "XL", sku: "AJR-KUR-XL", pricePaise: 139900, mrpPaise: 169900, inventory: { create: { quantity: 8,  reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1622495966027-e7a6b89d4e49?w=800&q=80", altText: "Ajrakh kurti", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("bandhani-flared-kurti-gujarat", {
    vendorId: rookash.id, categoryId: kurtaKurtis.id,
    name: "Bandhani Flared Kurti — Gujarat",
    slug: "bandhani-flared-kurti-gujarat",
    description: "Traditional Bandhani tie-dye flared kurti in fine cotton. Each piece is hand-tied by artisans in Jamnagar before dyeing, making every kurta unique. Bell sleeves and side pockets.",
    fabric: "Cotton", region: "Jamnagar, Gujarat",
    status: ProductStatus.APPROVED, qualityScore: 80, searchIndexedAt: new Date(),
    tags: ["bandhani", "kurti", "flared", "gujarat", "tie-dye"],
    variants: {
      create: [
        { name: "S",  sku: "BAN-KUR-S",  pricePaise: 149900, mrpPaise: 189900, inventory: { create: { quantity: 8,  reservedQuantity: 0 } } },
        { name: "M",  sku: "BAN-KUR-M",  pricePaise: 149900, mrpPaise: 189900, inventory: { create: { quantity: 12, reservedQuantity: 1 } } },
        { name: "L",  sku: "BAN-KUR-L",  pricePaise: 149900, mrpPaise: 189900, inventory: { create: { quantity: 10, reservedQuantity: 0 } } },
        { name: "XL", sku: "BAN-KUR-XL", pricePaise: 159900, mrpPaise: 199900, inventory: { create: { quantity: 6,  reservedQuantity: 0 } } },
        { name: "XXL",sku: "BAN-KUR-XXL",pricePaise: 159900, mrpPaise: 199900, inventory: { create: { quantity: 4,  reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80", altText: "Bandhani kurti", isPrimary: true, sortOrder: 0 }] },
  });

  // Lehengas
  await upsertProduct("zardozi-bridal-lehenga-choli", {
    vendorId: rookash.id, categoryId: lehengas.id,
    name: "Zardozi Bridal Lehenga Choli — Heritage",
    slug: "zardozi-bridal-lehenga-choli",
    description: "Heavy silk lehenga with dense Zardozi goldwork embroidery on the skirt, blouse and dupatta. Crafted over 45 days by master embroiderers in Varanasi. Comes with a full-length stitched blouse and dupatta.",
    fabric: "Silk", region: "Varanasi, Uttar Pradesh",
    status: ProductStatus.APPROVED, qualityScore: 96, searchIndexedAt: new Date(),
    tags: ["zardozi", "bridal", "lehenga", "silk", "embroidery", "wedding"],
    variants: {
      create: [
        { name: "Scarlet Red & Gold",  sku: "ZAR-RED-001", pricePaise: 8499900, mrpPaise: 9999900, inventory: { create: { quantity: 2, reservedQuantity: 0 } } },
        { name: "Ivory & Gold",        sku: "ZAR-IVO-001", pricePaise: 8499900, mrpPaise: 9999900, inventory: { create: { quantity: 1, reservedQuantity: 0 } } },
        { name: "Deep Magenta & Gold", sku: "ZAR-MAG-001", pricePaise: 8999900, mrpPaise: 10499900,inventory: { create: { quantity: 1, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1631125915902-d8abe9225ff2?w=800&q=80", altText: "Zardozi bridal lehenga", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("bandhani-party-lehenga-choli", {
    vendorId: chanderi.id, categoryId: lehengas.id,
    name: "Bandhani Party Lehenga Choli — Navratri",
    slug: "bandhani-party-lehenga-choli",
    description: "Vibrant Bandhani lehenga choli set in pure cotton with mirror-work blouse. A Navratri and Garba staple from Ahmedabad's oldest Bandhani houses. Flared silhouette, 3-metre skirt.",
    fabric: "Cotton", region: "Ahmedabad, Gujarat",
    status: ProductStatus.APPROVED, qualityScore: 82, searchIndexedAt: new Date(),
    tags: ["bandhani", "lehenga", "party-wear", "navratri", "garba"],
    variants: {
      create: [
        { name: "Fuchsia & Orange", sku: "BND-FOC-001", pricePaise: 349900, mrpPaise: 429900, inventory: { create: { quantity: 8, reservedQuantity: 2 } } },
        { name: "Green & Yellow",   sku: "BND-GRY-001", pricePaise: 349900, mrpPaise: 429900, inventory: { create: { quantity: 6, reservedQuantity: 0 } } },
        { name: "Red & Turquoise",  sku: "BND-RET-001", pricePaise: 369900, mrpPaise: 449900, inventory: { create: { quantity: 5, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", altText: "Bandhani party lehenga", isPrimary: true, sortOrder: 0 }] },
  });

  // Fusion Wear
  await upsertProduct("chanderi-shirt-saree-contemporary", {
    vendorId: chanderi.id, categoryId: fusionWear.id,
    name: "Chanderi Shirt Saree — Contemporary Drape",
    slug: "chanderi-shirt-saree-contemporary",
    description: "Pre-stitched Chanderi shirt saree with a structured shirt-style top and a pre-pleated saree skirt. Comes ready to wear in 2 minutes. Modern workwear meets Indian craft.",
    fabric: "Chanderi", region: "Chanderi, Madhya Pradesh",
    status: ProductStatus.APPROVED, qualityScore: 83, searchIndexedAt: new Date(),
    tags: ["chanderi", "shirt-saree", "fusion", "workwear", "pre-stitched"],
    variants: {
      create: [
        { name: "Off White",   sku: "SHR-OWH-001", pricePaise: 429900, mrpPaise: 529900, inventory: { create: { quantity: 7, reservedQuantity: 1 } } },
        { name: "Sage Green",  sku: "SHR-SAG-001", pricePaise: 429900, mrpPaise: 529900, inventory: { create: { quantity: 5, reservedQuantity: 0 } } },
        { name: "Dusty Mauve", sku: "SHR-MAU-001", pricePaise: 449900, mrpPaise: 549900, inventory: { create: { quantity: 4, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=800&q=80", altText: "Chanderi shirt saree", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("silk-dhoti-saree-contrast-belt", {
    vendorId: rookash.id, categoryId: fusionWear.id,
    name: "Silk Dhoti Saree with Contrast Belt",
    slug: "silk-dhoti-saree-contrast-belt",
    description: "Pre-stitched silk dhoti saree with a structured top and a contrast leather belt at the waist. The dhoti silhouette gives it a contemporary runway feel while keeping the Indian saree spirit.",
    fabric: "Silk",
    status: ProductStatus.APPROVED, qualityScore: 79, searchIndexedAt: new Date(),
    tags: ["dhoti-saree", "fusion", "silk", "belt", "contemporary"],
    variants: {
      create: [
        { name: "Ivory & Gold Belt",  sku: "DHT-IVG-001", pricePaise: 699900, mrpPaise: 849900, inventory: { create: { quantity: 4, reservedQuantity: 0 } } },
        { name: "Navy & Brown Belt",  sku: "DHT-NBR-001", pricePaise: 699900, mrpPaise: 849900, inventory: { create: { quantity: 3, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=800&q=80", altText: "Silk dhoti saree", isPrimary: true, sortOrder: 0 }] },
  });

  // Jewellery
  await upsertProduct("oxidised-silver-jhumka-earrings", {
    vendorId: rookash.id, categoryId: jewellery.id,
    name: "Oxidised Silver Jhumka Earrings — Rajasthani",
    slug: "oxidised-silver-jhumka-earrings",
    description: "Handcrafted oxidised silver Jhumkas from Jaipur's Johri Bazaar. Features intricate filigree work and hanging ghungroos. Pairs beautifully with cotton and silk sarees.",
    region: "Jaipur, Rajasthan",
    status: ProductStatus.APPROVED, qualityScore: 86, searchIndexedAt: new Date(),
    tags: ["jhumka", "earrings", "silver", "oxidised", "jaipur", "traditional"],
    variants: {
      create: [
        { name: "Small (2.5 cm)", sku: "JHM-SM-001", pricePaise: 89900,  mrpPaise: 119900, inventory: { create: { quantity: 25, reservedQuantity: 3 } } },
        { name: "Large (4 cm)",   sku: "JHM-LG-001", pricePaise: 129900, mrpPaise: 169900, inventory: { create: { quantity: 18, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80", altText: "Oxidised silver jhumkas", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("meenakari-choker-necklace-set", {
    vendorId: chanderi.id, categoryId: jewellery.id,
    name: "Meenakari Choker Necklace Set",
    slug: "meenakari-choker-necklace-set",
    description: "Five-piece Meenakari jewellery set including choker necklace, earrings, maang tikka and two bangles. Handpainted enamel on gold-plated brass by Jaipur's Meenakari artisans.",
    region: "Jaipur, Rajasthan",
    status: ProductStatus.APPROVED, qualityScore: 84, searchIndexedAt: new Date(),
    tags: ["meenakari", "choker", "necklace", "set", "gold-plated", "jaipur"],
    variants: {
      create: [
        { name: "Red & Green Peacock", sku: "MEE-RGP-001", pricePaise: 249900, mrpPaise: 329900, inventory: { create: { quantity: 10, reservedQuantity: 1 } } },
        { name: "Blue & White Floral", sku: "MEE-BWF-001", pricePaise: 249900, mrpPaise: 329900, inventory: { create: { quantity: 8,  reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80", altText: "Meenakari choker set", isPrimary: true, sortOrder: 0 }] },
  });

  // Handbags & Clutches
  await upsertProduct("embroidered-potli-bag-rajasthani", {
    vendorId: rookash.id, categoryId: handbagsCat.id,
    name: "Embroidered Potli Bag — Rajasthani Zardozi",
    slug: "embroidered-potli-bag-rajasthani",
    description: "Handcrafted Zardozi embroidered Potli bag in velvet with a golden drawstring. A classic accessory for weddings, sangeet and festive occasions.",
    region: "Jaipur, Rajasthan",
    status: ProductStatus.APPROVED, qualityScore: 81, searchIndexedAt: new Date(),
    tags: ["potli", "bag", "zardozi", "wedding", "festive", "velvet"],
    variants: {
      create: [
        { name: "Maroon Velvet",  sku: "POT-MAR-001", pricePaise: 99900,  mrpPaise: 129900, inventory: { create: { quantity: 20, reservedQuantity: 4 } } },
        { name: "Bottle Green",   sku: "POT-GRN-001", pricePaise: 99900,  mrpPaise: 129900, inventory: { create: { quantity: 15, reservedQuantity: 0 } } },
        { name: "Royal Purple",   sku: "POT-PUR-001", pricePaise: 109900, mrpPaise: 139900, inventory: { create: { quantity: 12, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80", altText: "Embroidered potli bag", isPrimary: true, sortOrder: 0 }] },
  });

  // Footwear
  await upsertProduct("handcrafted-kolhapuri-leather-sandals", {
    vendorId: chanderi.id, categoryId: footwear.id,
    name: "Handcrafted Kolhapuri Leather Sandals",
    slug: "handcrafted-kolhapuri-leather-sandals",
    description: "Genuine vegetable-tanned leather Kolhapuri chappals made by third-generation artisans in Kolhapur. GI-tagged craft. Naturally moisture-wicking, they get more comfortable with wear.",
    region: "Kolhapur, Maharashtra",
    giTag: "Kolhapuri Chappal",
    status: ProductStatus.APPROVED, qualityScore: 88, searchIndexedAt: new Date(),
    tags: ["kolhapuri", "footwear", "leather", "handcrafted", "sandals"],
    variants: {
      create: [
        { name: "UK 4", sku: "KOL-UK4-001", pricePaise: 189900, mrpPaise: 239900, inventory: { create: { quantity: 8,  reservedQuantity: 0 } } },
        { name: "UK 5", sku: "KOL-UK5-001", pricePaise: 189900, mrpPaise: 239900, inventory: { create: { quantity: 12, reservedQuantity: 1 } } },
        { name: "UK 6", sku: "KOL-UK6-001", pricePaise: 189900, mrpPaise: 239900, inventory: { create: { quantity: 10, reservedQuantity: 0 } } },
        { name: "UK 7", sku: "KOL-UK7-001", pricePaise: 199900, mrpPaise: 249900, inventory: { create: { quantity: 6,  reservedQuantity: 0 } } },
        { name: "UK 8", sku: "KOL-UK8-001", pricePaise: 199900, mrpPaise: 249900, inventory: { create: { quantity: 4,  reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80", altText: "Kolhapuri sandals", isPrimary: true, sortOrder: 0 }] },
  });

  // Western Wear
  await upsertProduct("block-print-flowy-maxi-dress", {
    vendorId: chanderi.id, categoryId: westernWear.id,
    name: "Hand Block Print Flowy Maxi Dress — Bagru",
    slug: "block-print-flowy-maxi-dress",
    description: "Breeze-light cotton maxi dress with Bagru hand block print from Rajasthan. Tiered silhouette, adjustable straps and side pockets. The natural dyes are certified azo-free.",
    fabric: "Cotton", region: "Bagru, Rajasthan",
    status: ProductStatus.APPROVED, qualityScore: 75, searchIndexedAt: new Date(),
    tags: ["block-print", "maxi-dress", "cotton", "bagru", "western"],
    variants: {
      create: [
        { name: "XS", sku: "MAX-XS-001", pricePaise: 199900, mrpPaise: 249900, inventory: { create: { quantity: 8,  reservedQuantity: 0 } } },
        { name: "S",  sku: "MAX-S-001",  pricePaise: 199900, mrpPaise: 249900, inventory: { create: { quantity: 12, reservedQuantity: 2 } } },
        { name: "M",  sku: "MAX-M-001",  pricePaise: 199900, mrpPaise: 249900, inventory: { create: { quantity: 15, reservedQuantity: 1 } } },
        { name: "L",  sku: "MAX-L-001",  pricePaise: 199900, mrpPaise: 249900, inventory: { create: { quantity: 10, reservedQuantity: 0 } } },
        { name: "XL", sku: "MAX-XL-001", pricePaise: 209900, mrpPaise: 259900, inventory: { create: { quantity: 6,  reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80", altText: "Block print maxi dress", isPrimary: true, sortOrder: 0 }] },
  });

  // Beauty & Personal Care
  await upsertProduct("rose-saffron-face-serum", {
    vendorId: chanderi.id, categoryId: skincareCat.id,
    name: "Rose & Saffron Brightening Face Serum",
    slug: "rose-saffron-face-serum",
    description: "Ayurvedic face serum with pure Kashmiri saffron extract and Bulgarian rose water. Brightens skin tone, reduces dark spots and adds a natural glow. Paraben-free, cruelty-free, dermatologist tested.",
    status: ProductStatus.APPROVED, qualityScore: 77, searchIndexedAt: new Date(),
    tags: ["skincare", "serum", "saffron", "rose", "ayurvedic", "brightening"],
    variants: {
      create: [
        { name: "15ml",  sku: "SER-15-001",  pricePaise: 89900,  mrpPaise: 119900, inventory: { create: { quantity: 30, reservedQuantity: 5 } } },
        { name: "30ml",  sku: "SER-30-001",  pricePaise: 159900, mrpPaise: 199900, inventory: { create: { quantity: 25, reservedQuantity: 2 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80", altText: "Rose saffron serum", isPrimary: true, sortOrder: 0 }] },
  });

  await upsertProduct("amla-brahmi-hair-oil", {
    vendorId: rookash.id, categoryId: haircareCat.id,
    name: "Amla & Brahmi Growth Hair Oil",
    slug: "amla-brahmi-hair-oil",
    description: "Cold-pressed Amla oil infused with Brahmi, Bhringraj and Neem extracts. Traditional Ayurvedic formulation for hair strengthening and scalp nourishment. Suitable for all hair types.",
    status: ProductStatus.APPROVED, qualityScore: 80, searchIndexedAt: new Date(),
    tags: ["haircare", "oil", "amla", "brahmi", "ayurvedic", "hair-growth"],
    variants: {
      create: [
        { name: "100ml", sku: "HAR-100-001", pricePaise: 59900,  mrpPaise: 79900,  inventory: { create: { quantity: 40, reservedQuantity: 3 } } },
        { name: "200ml", sku: "HAR-200-001", pricePaise: 109900, mrpPaise: 139900, inventory: { create: { quantity: 30, reservedQuantity: 0 } } },
      ],
    },
    images: { create: [{ url: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80", altText: "Amla brahmi hair oil", isPrimary: true, sortOrder: 0 }] },
  });

  // ── Addresses ────────────────────────────────────────────────────────────────
  const addrData = [
    { userId: priya.id, fullName: "Priya Sharma", phone: "+919876543210", line1: "42 Punjabi Bagh West", city: "New Delhi", state: "Delhi", pincode: "110026" },
    { userId: ananya.id, fullName: "Ananya Patel", phone: "+919123456789", line1: "15 Paldi Cross Roads", city: "Ahmedabad", state: "Gujarat", pincode: "380007" },
    { userId: meera.id, fullName: "Meera Nair", phone: "+919988776655", line1: "7/B Vasant Vihar", city: "Thiruvananthapuram", state: "Kerala", pincode: "695030" },
    { userId: kavya.id, fullName: "Kavya Reddy", phone: "+918765432109", line1: "301 Jubilee Hills", city: "Hyderabad", state: "Telangana", pincode: "500033" },
    { userId: sita.id, fullName: "Sita Krishnan", phone: "+917654321098", line1: "22 T Nagar", city: "Chennai", state: "Tamil Nadu", pincode: "600017" },
  ];

  const addresses = await Promise.all(addrData.map(async (a) => {
    const existing = await prisma.address.findFirst({ where: { userId: a.userId } });
    if (existing) return existing;
    return prisma.address.create({ data: { ...a, isDefault: true } });
  }));

  const [addrPriya, addrAnanya, addrMeera, addrKavya, addrSita] = addresses;

  // ── Helper: create order ────────────────────────────────────────────────────
  const createOrder = async (
    idKey: string,
    userId: string,
    vendorId: string,
    addressId: string,
    addrSnap: object,
    status: OrderStatus,
    items: Array<{ variantId: string; productName: string; variantName: string; qty: number; pricePaise: number }>,
    opts: { notes?: string; confirmedAt?: Date; shippedAt?: Date; deliveredAt?: Date; cancelledAt?: Date; cancellationReason?: string } = {},
  ) => {
    const existing = await prisma.order.findFirst({ where: { payments: { some: { idempotencyKey: idKey } } } });
    if (existing) return existing;

    const subtotalPaise = items.reduce((s, i) => s + i.pricePaise * i.qty, 0);
    const totalPaise = subtotalPaise;

    return prisma.order.create({
      data: {
        userId,
        vendorId,
        addressId,
        addressSnapshot: addrSnap,
        status,
        subtotalPaise,
        totalPaise,
        ...opts,
        items: {
          create: items.map((i) => ({
            variantId: i.variantId,
            productSnapshot: { productName: i.productName, variantName: i.variantName },
            quantity: i.qty,
            unitPricePaise: i.pricePaise,
            totalPaise: i.pricePaise * i.qty,
          })),
        },
        payments: {
          create: {
            razorpayOrderId: `rzp_order_seed_${idKey}`,
            razorpayPaymentId: status !== OrderStatus.PENDING ? `rzp_pay_seed_${idKey}` : undefined,
            amountPaise: totalPaise,
            status: status === OrderStatus.PENDING ? PaymentStatus.CREATED : PaymentStatus.CAPTURED,
            method: "upi",
            idempotencyKey: idKey,
            capturedAt: status !== OrderStatus.PENDING ? new Date() : undefined,
          },
        },
      },
    });
  };

  // ── Fetch variant IDs ────────────────────────────────────────────────────────
  const [kanjiVar, banarasi1Var, tussarVar, chanderi1Var, mysore1Var, gadwalVar] = await Promise.all([
    prisma.productVariant.findFirst({ where: { productId: kanjiMain.id, sku: "KAN-CRI-001" } }),
    prisma.productVariant.findFirst({ where: { productId: banarasi1.id } }),
    prisma.productVariant.findFirst({ where: { productId: tussar.id } }),
    prisma.productVariant.findFirst({ where: { productId: chanderi1.id } }),
    prisma.productVariant.findFirst({ where: { productId: mysore1.id } }),
    prisma.productVariant.findFirst({ where: { productId: gadwal.id } }),
  ]);

  // ── Orders ──────────────────────────────────────────────────────────────────
  const order1 = await createOrder("ord_seed_001", priya.id, rookash.id, addrPriya!.id,
    { fullName: addrPriya!.fullName, phone: addrPriya!.phone, line1: addrPriya!.line1, city: addrPriya!.city, state: addrPriya!.state, pincode: addrPriya!.pincode, country: "IN" },
    OrderStatus.CONFIRMED,
    [
      { variantId: kanjiVar!.id, productName: "Kanjivaram Pure Silk Saree — Peacock Motif", variantName: "Deep Crimson", qty: 1, pricePaise: 1249900 },
      { variantId: banarasi1Var!.id, productName: "Banarasi Katan Silk Saree — Zari Brocade", variantName: "Ivory Gold", qty: 1, pricePaise: 849900 },
    ],
    { confirmedAt: new Date("2026-05-03T12:00:00Z") },
  );

  await createOrder("ord_seed_002", ananya.id, chanderi.id, addrAnanya!.id,
    { fullName: addrAnanya!.fullName, phone: addrAnanya!.phone, line1: addrAnanya!.line1, city: addrAnanya!.city, state: addrAnanya!.state, pincode: addrAnanya!.pincode, country: "IN" },
    OrderStatus.SHIPPED,
    [
      { variantId: gadwalVar!.id, productName: "Gadwal Cotton-Silk Saree — Checks & Stripes", variantName: "Navy & Gold", qty: 1, pricePaise: 279900 },
    ],
    { confirmedAt: new Date("2026-05-02T10:00:00Z"), shippedAt: new Date("2026-05-03T08:00:00Z") },
  );

  await createOrder("ord_seed_003", meera.id, chanderi.id, addrMeera!.id,
    { fullName: addrMeera!.fullName, phone: addrMeera!.phone, line1: addrMeera!.line1, city: addrMeera!.city, state: addrMeera!.state, pincode: addrMeera!.pincode, country: "IN" },
    OrderStatus.DELIVERED,
    [
      { variantId: chanderi1Var!.id, productName: "Chanderi Silk-Cotton Saree — Floral Jaal", variantName: "Pastel Pink", qty: 1, pricePaise: 529900 },
      { variantId: mysore1Var!.id, productName: "Mysore Crepe Silk Saree — Temple Border", variantName: "Deep Violet", qty: 1, pricePaise: 449900 },
    ],
    { confirmedAt: new Date("2026-04-28T09:00:00Z"), shippedAt: new Date("2026-04-29T08:00:00Z"), deliveredAt: new Date("2026-05-01T14:00:00Z") },
  );

  await createOrder("ord_seed_004", kavya.id, rookash.id, addrKavya!.id,
    { fullName: addrKavya!.fullName, phone: addrKavya!.phone, line1: addrKavya!.line1, city: addrKavya!.city, state: addrKavya!.state, pincode: addrKavya!.pincode, country: "IN" },
    OrderStatus.PACKED,
    [
      { variantId: kanjiVar!.id, productName: "Kanjivaram Pure Silk Saree — Peacock Motif", variantName: "Deep Crimson", qty: 1, pricePaise: 1249900 },
    ],
    { confirmedAt: new Date("2026-05-04T07:00:00Z") },
  );

  await createOrder("ord_seed_005", sita.id, rookash.id, addrSita!.id,
    { fullName: addrSita!.fullName, phone: addrSita!.phone, line1: addrSita!.line1, city: addrSita!.city, state: addrSita!.state, pincode: addrSita!.pincode, country: "IN" },
    OrderStatus.CANCELLED,
    [
      { variantId: banarasi1Var!.id, productName: "Banarasi Katan Silk Saree — Zari Brocade", variantName: "Ivory Gold", qty: 1, pricePaise: 849900 },
    ],
    { cancellationReason: "Customer requested cancellation before dispatch.", cancelledAt: new Date("2026-04-25T17:00:00Z"), confirmedAt: new Date("2026-04-25T10:00:00Z") },
  );

  // Return-requested orders
  const retOrder1 = await createOrder("ord_seed_ret_001", priya.id, rookash.id, addrPriya!.id,
    { fullName: addrPriya!.fullName, phone: addrPriya!.phone, line1: addrPriya!.line1, city: addrPriya!.city, state: addrPriya!.state, pincode: addrPriya!.pincode, country: "IN" },
    OrderStatus.RETURN_REQUESTED,
    [
      { variantId: tussarVar!.id, productName: "Tussar Raw Silk Saree — Natural Indigo Dye", variantName: "Indigo Blue", qty: 1, pricePaise: 389900 },
    ],
    {
      notes: "Wrong colour received — saree is more grey-blue than the deep indigo shown in photos.",
      confirmedAt: new Date("2026-04-22T10:00:00Z"),
      shippedAt: new Date("2026-04-23T09:00:00Z"),
      deliveredAt: new Date("2026-04-26T14:00:00Z"),
    },
  );

  const retOrder2 = await createOrder("ord_seed_ret_002", meera.id, chanderi.id, addrMeera!.id,
    { fullName: addrMeera!.fullName, phone: addrMeera!.phone, line1: addrMeera!.line1, city: addrMeera!.city, state: addrMeera!.state, pincode: addrMeera!.pincode, country: "IN" },
    OrderStatus.RETURN_REQUESTED,
    [
      { variantId: gadwalVar!.id, productName: "Gadwal Cotton-Silk Saree — Checks & Stripes", variantName: "Navy & Gold", qty: 1, pricePaise: 279900 },
    ],
    {
      notes: "Defective silk border — threads coming loose after first wash.",
      confirmedAt: new Date("2026-04-20T09:00:00Z"),
      shippedAt: new Date("2026-04-21T09:00:00Z"),
      deliveredAt: new Date("2026-04-24T13:00:00Z"),
    },
  );

  // Refunded order
  const refundedOrder = await createOrder("ord_seed_refund_001", ananya.id, rookash.id, addrAnanya!.id,
    { fullName: addrAnanya!.fullName, phone: addrAnanya!.phone, line1: addrAnanya!.line1, city: addrAnanya!.city, state: addrAnanya!.state, pincode: addrAnanya!.pincode, country: "IN" },
    OrderStatus.REFUNDED,
    [
      { variantId: chanderi1Var!.id, productName: "Chanderi Silk-Cotton Saree — Floral Jaal", variantName: "Sage Green", qty: 1, pricePaise: 529900 },
    ],
    {
      notes: "Size of blouse piece much smaller than described.",
      confirmedAt: new Date("2026-04-10T10:00:00Z"),
      shippedAt: new Date("2026-04-11T09:00:00Z"),
      deliveredAt: new Date("2026-04-14T14:00:00Z"),
    },
  );

  // Create refund record for the refunded order
  const refundedPayment = await prisma.payment.findFirst({ where: { orderId: refundedOrder.id } });
  if (refundedPayment) {
    await prisma.refund.upsert({
      where: { razorpayRefundId: `rzp_refund_seed_001` },
      update: {},
      create: {
        orderId: refundedOrder.id,
        paymentId: refundedPayment.id,
        razorpayRefundId: `rzp_refund_seed_001`,
        amountPaise: 529900,
        reason: "Size of blouse piece much smaller than described.",
        status: RefundStatus.PROCESSED,
        processedAt: new Date("2026-04-18T10:00:00Z"),
      },
    });
  }

  // ── Index approved products in Meilisearch ─────────────────────────────────
  const meiliHost = process.env["MEILI_HOST"] ?? "http://localhost:7700";
  const meiliKey  = process.env["MEILI_API_KEY"] ?? "sario_meili_dev_key";

  const approvedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED, deletedAt: null },
    include: {
      variants: { where: { isActive: true }, select: { pricePaise: true } },
      images:   { select: { url: true, isPrimary: true } },
    },
  });

  const meiliDocs = approvedProducts.map((p) => {
    const prices = p.variants.map((v) => v.pricePaise);
    const minPricePaise = prices.length ? Math.min(...prices) : 0;
    const primaryImage = p.images.find((i) => i.isPrimary) ?? p.images[0];
    return {
      id:              p.id,
      name:            p.name,
      slug:            p.slug,
      description:     p.description ?? "",
      fabric:          p.fabric ?? null,
      region:          p.region ?? null,
      tags:            p.tags as string[],
      categoryId:      p.categoryId,
      vendorId:        p.vendorId,
      minPricePaise,
      primaryImageUrl: primaryImage?.url,
    };
  });

  try {
    const res = await fetch(`${meiliHost}/indexes/products/documents?primaryKey=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${meiliKey}` },
      body: JSON.stringify(meiliDocs),
    });
    if (!res.ok) throw new Error(await res.text());
    console.log(`✅ Meilisearch: indexed ${meiliDocs.length} products`);
  } catch (err) {
    console.warn("⚠️  Meilisearch indexing failed (is it running?):", err);
  }

  console.log(`
╔══════════════════════════════════════════════════════╗
║           SARIO DEV CREDENTIALS CHEAT SHEET          ║
╠══════════════════════════════════════════════════════╣
║  ADMIN (apps/admin → http://localhost:3001/login)    ║
║    email:    admin@sario.in                          ║
║    password: Password1!                              ║
╠══════════════════════════════════════════════════════╣
║  VENDOR 1 — Roop Kashish Textiles (APPROVED)         ║
║    email:    vendor1@sario.dev                       ║
║    password: Password1!                              ║
║    portal:   http://localhost:3000/vendor            ║
║  VENDOR 2 — Chanderi Craft Studio (APPROVED)         ║
║    email:    vendor2@sario.dev                       ║
║    password: Password1!                              ║
║    portal:   http://localhost:3000/vendor            ║
╠══════════════════════════════════════════════════════╣
║  CUSTOMERS (apps/web → http://localhost:3000)        ║
║    +919876543210  Priya Sharma   (OTP in API console)║
║    +919123456789  Ananya Patel   (OTP in API console)║
║    +919988776655  Meera Nair     (OTP in API console)║
╠══════════════════════════════════════════════════════╣
║  DEV SHORTCUT: POST /v1/auth/dev { "phone": "..." } ║
║  Returns tokens instantly — no OTP needed            ║
╚══════════════════════════════════════════════════════╝
`);
  console.log("✅ Seed complete:", {
    admin: admin.email,
    categories: { topLevel: 7, total: "57 categories across 3 levels" },
    vendors: { approved: 2, pending: 3, suspended: 1 },
    products: { approved: 25, pendingReview: 5, rejected: 2 },
    buyers: 5,
    orders: 8,
  });
}

main()
  .catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); })
  .finally(() => pool.end());

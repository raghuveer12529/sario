import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AdminRole, VendorStatus, ProductStatus, OrderStatus, PaymentStatus, RefundStatus } from "@prisma/client";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Admin user ──────────────────────────────────────────────────────────────
  // Dev password: Admin@sario1
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@sario.in" },
    update: { passwordHash: "$2b$10$lpGk.r5zGOiUbNp0uNHt9.qK/qij7FhimpBoK1SiD7xchsiWrpjdS" },
    create: {
      email: "admin@sario.in",
      passwordHash: "$2b$10$lpGk.r5zGOiUbNp0uNHt9.qK/qij7FhimpBoK1SiD7xchsiWrpjdS",
      name: "Sario Admin",
      role: AdminRole.SUPER_ADMIN,
    },
  });

  // ── Categories ──────────────────────────────────────────────────────────────
  const [silkCat, cottonCat, silkCottonCat] = await Promise.all([
    prisma.category.upsert({
      where: { slug: "silk-sarees" },
      update: {},
      create: { name: "Silk Sarees", slug: "silk-sarees", gstBps: 500, sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: "cotton-sarees" },
      update: {},
      create: { name: "Cotton Sarees", slug: "cotton-sarees", gstBps: 500, sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: "silk-cotton-sarees" },
      update: {},
      create: { name: "Silk-Cotton Sarees", slug: "silk-cotton-sarees", gstBps: 500, sortOrder: 3 },
    }),
  ]);

  await Promise.all([
    prisma.category.upsert({ where: { slug: "kanjivaram" }, update: {}, create: { name: "Kanjivaram", slug: "kanjivaram", parentId: silkCat.id, gstBps: 500, sortOrder: 1 } }),
    prisma.category.upsert({ where: { slug: "banarasi" }, update: {}, create: { name: "Banarasi", slug: "banarasi", parentId: silkCat.id, gstBps: 500, sortOrder: 2 } }),
    prisma.category.upsert({ where: { slug: "pochampally" }, update: {}, create: { name: "Pochampally", slug: "pochampally", parentId: cottonCat.id, gstBps: 500, sortOrder: 3 } }),
    prisma.category.upsert({ where: { slug: "synthetic-sarees" }, update: {}, create: { name: "Synthetic Sarees", slug: "synthetic-sarees", gstBps: 1200, sortOrder: 4 } }),
  ]);

  // ── Buyers ──────────────────────────────────────────────────────────────────
  const [priya, ananya, meera, kavya, sita] = await Promise.all([
    prisma.user.upsert({ where: { phone: "+919876543210" }, update: {}, create: { phone: "+919876543210", name: "Priya Sharma", email: "priya@example.com", isVerified: true, trustScore: 80 } }),
    prisma.user.upsert({ where: { phone: "+919123456789" }, update: {}, create: { phone: "+919123456789", name: "Ananya Patel", email: "ananya@example.com", isVerified: true, trustScore: 75 } }),
    prisma.user.upsert({ where: { phone: "+919988776655" }, update: {}, create: { phone: "+919988776655", name: "Meera Nair", email: "meera@example.com", isVerified: true, trustScore: 90 } }),
    prisma.user.upsert({ where: { phone: "+918765432109" }, update: {}, create: { phone: "+918765432109", name: "Kavya Reddy", email: "kavya@example.com", isVerified: true, trustScore: 70 } }),
    prisma.user.upsert({ where: { phone: "+917654321098" }, update: {}, create: { phone: "+917654321098", name: "Sita Krishnan", email: "sita@example.com", isVerified: true, trustScore: 65 } }),
  ]);

  // ── Vendor owner accounts (login via OTP; OTP appears in API console in dev) ─
  const [vendorUser1, vendorUser2] = await Promise.all([
    prisma.user.upsert({
      where: { phone: "+919000000001" },
      update: {},
      create: { phone: "+919000000001", name: "Roop Kashish Owner", isVerified: true },
    }),
    prisma.user.upsert({
      where: { phone: "+919000000002" },
      update: {},
      create: { phone: "+919000000002", name: "Chanderi Craft Owner", isVerified: true },
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

  console.log(`
╔══════════════════════════════════════════════════════╗
║           SARIO DEV CREDENTIALS CHEAT SHEET          ║
╠══════════════════════════════════════════════════════╣
║  ADMIN (apps/admin → http://localhost:3001/login)    ║
║    email:    admin@sario.in                          ║
║    password: Admin@sario1                            ║
╠══════════════════════════════════════════════════════╣
║  VENDOR 1 — Roop Kashish Textiles (APPROVED)         ║
║    phone: +919000000001  (OTP in API console)        ║
║  VENDOR 2 — Chanderi Craft Studio (APPROVED)         ║
║    phone: +919000000002  (OTP in API console)        ║
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
    vendors: { approved: 2, pending: 3, suspended: 1 },
    products: { approved: 8, pendingReview: 5, rejected: 2 },
    buyers: 5,
    orders: 8,
  });
}

main()
  .catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); })
  .finally(() => pool.end());

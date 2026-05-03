// Starter seed �� replace with your own data as the app grows.
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AdminRole } from "@prisma/client";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Starter model: AdminUser
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@sario.in" },
    update: {},
    create: {
      email: "admin@sario.in",
      // bcrypt hash of "admin123" — CHANGE IN PRODUCTION before first login
      passwordHash: "$2b$10$K9L1D3mTxH7bQ2vNpR8sPuEwYzfJcXnA0iGo4lVk6sHdBq5rW1mCe",
      name: "Sario Admin",
      role: AdminRole.SUPER_ADMIN,
    },
  });

  // Starter model: Category (root saree categories)
  const categories = await Promise.all([
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
      where: { slug: "synthetic-sarees" },
      update: {},
      create: { name: "Synthetic Sarees", slug: "synthetic-sarees", gstBps: 1200, sortOrder: 3 },
    }),
  ]);

  // Starter relation: sub-categories under Silk Sarees
  const silkId = categories[0]!.id;
  await Promise.all([
    prisma.category.upsert({
      where: { slug: "kanjivaram" },
      update: {},
      create: { name: "Kanjivaram", slug: "kanjivaram", parentId: silkId, gstBps: 500, sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: "banarasi" },
      update: {},
      create: { name: "Banarasi", slug: "banarasi", parentId: silkId, gstBps: 500, sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: "pochampally" },
      update: {},
      create: { name: "Pochampally", slug: "pochampally", parentId: silkId, gstBps: 500, sortOrder: 3 },
    }),
  ]);

  console.log("✅ Seeded:", {
    admin: admin.email,
    rootCategories: categories.map((c) => c.slug),
    subCategories: ["kanjivaram", "banarasi", "pochampally"],
  });
}

main()
  .catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); })
  .finally(() => pool.end());

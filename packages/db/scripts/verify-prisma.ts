import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error("❌ DATABASE_URL is not set in packages/db/.env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const [categoryCount, adminCount] = await Promise.all([
      prisma.category.count(),
      prisma.adminUser.count(),
    ]);

    console.log("✅ Connected to Prisma Postgres");
    console.log(`   Categories : ${categoryCount}`);
    console.log(`   Admin users: ${adminCount}`);
  } catch (err) {
    console.error("❌ Connection failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

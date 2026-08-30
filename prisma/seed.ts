import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.domain.count();
  console.log(`No seed data configured. ${count} domain(s) already in the database.`);
  console.log("Add domains via Bulk Import or the checker ingestion API.");
}

main().finally(() => prisma.$disconnect());

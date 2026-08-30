import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "../lib/password";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

const prisma = new PrismaClient({ adapter });

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage: tsx scripts/create-admin.ts <username> <password>");
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const admin = await prisma.admin.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`Admin "${admin.username}" created/updated (id ${admin.id}).`);
}

main().finally(() => prisma.$disconnect());

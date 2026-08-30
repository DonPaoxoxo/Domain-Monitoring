import "dotenv/config";
import { execFileSync } from "node:child_process";
import { prisma } from "../lib/db";
import type { Prisma } from "../lib/generated/prisma/client";

// One-off migration: reads every row out of the old SQLite dev.db (via the
// `sqlite3` CLI, so no SQLite Node driver is needed) and inserts it into the
// MariaDB database configured by DATABASE_URL. Run once during cutover,
// against empty MariaDB tables (freshly created via `prisma migrate deploy`).
//
// Usage: npx tsx scripts/migrate-sqlite-to-mariadb.ts /path/to/dev.db

type Row = Record<string, unknown>;

function readTable(dbPath: string, table: string): Row[] {
  const out = execFileSync("sqlite3", ["-json", dbPath, `SELECT * FROM ${table};`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 512,
  }).trim();
  return out ? (JSON.parse(out) as Row[]) : [];
}

function convert(rows: Row[], booleanFields: string[], dateFields: string[]): Row[] {
  return rows.map((row) => {
    const converted = { ...row };
    for (const field of booleanFields) {
      if (converted[field] !== null && converted[field] !== undefined) {
        converted[field] = converted[field] === 1;
      }
    }
    for (const field of dateFields) {
      if (converted[field] !== null && converted[field] !== undefined) {
        converted[field] = new Date(converted[field] as string);
      }
    }
    return converted;
  });
}

async function loadTable(
  dbPath: string,
  table: string,
  insertBatch: (data: Row[]) => Promise<unknown>,
  options: { booleanFields?: string[]; dateFields?: string[]; batchSize?: number } = {},
) {
  const rows = convert(readTable(dbPath, table), options.booleanFields ?? [], options.dateFields ?? []);
  const batchSize = options.batchSize ?? 1000;

  for (let i = 0; i < rows.length; i += batchSize) {
    await insertBatch(rows.slice(i, i + batchSize));
  }
  console.log(`${table}: migrated ${rows.length} row(s)`);
}

async function fixAutoIncrement(table: string) {
  const [{ maxId }] = await prisma.$queryRawUnsafe<{ maxId: bigint | number | null }[]>(
    `SELECT MAX(id) AS maxId FROM \`${table}\``,
  );
  if (maxId === null) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${Number(maxId) + 1}`);
}

async function main() {
  const dbPath = process.argv[2];
  if (!dbPath) {
    console.error("Usage: npx tsx scripts/migrate-sqlite-to-mariadb.ts /path/to/dev.db");
    process.exit(1);
  }

  // FK-safe order: Domain first, then independent singletons/logs, then
  // tables that reference Domain.
  await loadTable(dbPath, "Domain", (data) => prisma.domain.createMany({ data: data as Prisma.DomainCreateManyInput[] }), {
    booleanFields: ["active", "paused"],
    dateFields: ["createdAt"],
  });
  await fixAutoIncrement("Domain");

  await loadTable(dbPath, "Admin", (data) => prisma.admin.createMany({ data: data as Prisma.AdminCreateManyInput[] }), {
    dateFields: ["createdAt"],
  });
  await fixAutoIncrement("Admin");

  await loadTable(
    dbPath,
    "AlertSettings",
    (data) => prisma.alertSettings.createMany({ data: data as Prisma.AlertSettingsCreateManyInput[] }),
    {
      booleanFields: ["emailEnabled", "webhookEnabled", "smsEnabled"],
      dateFields: ["updatedAt"],
    },
  );

  await loadTable(
    dbPath,
    "AppSettings",
    (data) => prisma.appSettings.createMany({ data: data as Prisma.AppSettingsCreateManyInput[] }),
    { dateFields: ["updatedAt"] },
  );

  await loadTable(
    dbPath,
    "BulkImportLog",
    (data) => prisma.bulkImportLog.createMany({ data: data as Prisma.BulkImportLogCreateManyInput[] }),
    { dateFields: ["createdAt"] },
  );
  await fixAutoIncrement("BulkImportLog");

  await loadTable(
    dbPath,
    "DomainAlertState",
    (data) => prisma.domainAlertState.createMany({ data: data as Prisma.DomainAlertStateCreateManyInput[] }),
    { dateFields: ["updatedAt"] },
  );
  await fixAutoIncrement("DomainAlertState");

  await loadTable(
    dbPath,
    "CheckResult",
    (data) => prisma.checkResult.createMany({ data: data as Prisma.CheckResultCreateManyInput[] }),
    { dateFields: ["checkedAt", "updatedAt"] },
  );
  await fixAutoIncrement("CheckResult");

  await loadTable(
    dbPath,
    "CheckLog",
    (data) => prisma.checkLog.createMany({ data: data as Prisma.CheckLogCreateManyInput[] }),
    { dateFields: ["checkedAt"], batchSize: 2000 },
  );
  await fixAutoIncrement("CheckLog");

  console.log("Migration complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });

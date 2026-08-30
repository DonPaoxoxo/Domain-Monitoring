import AppShell from "@/components/AppShell";
import BulkImportPanel from "@/components/BulkImportPanel";
import { getRecentBulkImports } from "@/lib/bulkImports";

export default async function BulkImportPage() {
  const recentImports = await getRecentBulkImports();

  return (
    <AppShell
      title="Bulk Import"
      subtitle="Add domains in bulk for the India or Indonesia target markets."
    >
      <BulkImportPanel recentImports={recentImports} />
    </AppShell>
  );
}

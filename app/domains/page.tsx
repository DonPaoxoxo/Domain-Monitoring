import AppShell from "@/components/AppShell";
import DomainsPageContent from "@/components/DomainsPageContent";
import { getDomainMonitors } from "@/lib/domains";

export default async function DomainsPage() {
  const domains = await getDomainMonitors();

  return (
    <AppShell
      title="Domains"
      subtitle="Full inventory of monitored domains across the India and Indonesia target markets."
    >
      <DomainsPageContent domains={domains} />
    </AppShell>
  );
}

import AppShell from "@/components/AppShell";
import DashboardContent from "@/components/DashboardContent";
import { getDomainMonitors } from "@/lib/domains";

export default async function DashboardPage() {
  const domains = await getDomainMonitors();

  return (
    <AppShell
      title="Dashboard"
      subtitle="Monitor domain visibility across target-country and Global checkpoints."
    >
      <DashboardContent domains={domains} />
    </AppShell>
  );
}

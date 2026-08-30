import AppShell from "@/components/AppShell";
import ReportsContent from "@/components/ReportsContent";
import { getDomainMonitors } from "@/lib/domains";

export default async function ReportsPage() {
  const domains = await getDomainMonitors();

  return (
    <AppShell
      title="Reports"
      subtitle="Daily, weekly, and monthly accessibility reports across India, Indonesia, and Global checkpoints."
    >
      <ReportsContent domains={domains} />
    </AppShell>
  );
}

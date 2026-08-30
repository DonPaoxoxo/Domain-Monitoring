import AppShell from "@/components/AppShell";
import IncidentsList from "@/components/IncidentsList";
import { getDomainMonitors } from "@/lib/domains";

export default async function IncidentsPage() {
  const domains = await getDomainMonitors();

  return (
    <AppShell
      title="Incidents"
      subtitle="Active accessibility issues detected across India, Indonesia, and Global checkpoints."
    >
      <IncidentsList domains={domains} />
    </AppShell>
  );
}

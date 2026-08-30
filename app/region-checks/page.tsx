import AppShell from "@/components/AppShell";
import LiveCheckpointMap from "@/components/LiveCheckpointMap";
import RegionChecksOverview from "@/components/RegionChecksOverview";
import CheckerHowItWorks from "@/components/CheckerHowItWorks";
import { getCheckpointStatuses } from "@/lib/checkpoints";
import { getDomainMonitors } from "@/lib/domains";

export default async function RegionChecksPage() {
  const [domains, checkpoints] = await Promise.all([getDomainMonitors(), getCheckpointStatuses()]);

  return (
    <AppShell
      title="Region Checks"
      subtitle="Per-location checkpoint health aggregated across all monitored domains."
    >
      <LiveCheckpointMap initialCheckpoints={checkpoints} initialGeneratedAt={new Date().toISOString()} />
      <CheckerHowItWorks />
      <RegionChecksOverview domains={domains} />
    </AppShell>
  );
}

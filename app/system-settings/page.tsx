import AppShell from "@/components/AppShell";
import SystemSettingsForm from "@/components/SystemSettingsForm";
import { getCheckerNodes } from "@/lib/checkerNodes";
import { getAppSettings } from "@/lib/settings";

export default async function SystemSettingsPage() {
  const [checkerNodes, settings] = await Promise.all([getCheckerNodes(), getAppSettings()]);

  return (
    <AppShell
      title="System Settings"
      subtitle="Configure monitoring defaults, checker node status, and API access."
    >
      <SystemSettingsForm checkerNodes={checkerNodes} settings={settings} />
    </AppShell>
  );
}

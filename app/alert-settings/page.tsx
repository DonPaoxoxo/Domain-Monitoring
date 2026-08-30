import AppShell from "@/components/AppShell";
import AlertSettingsForm from "@/components/AlertSettingsForm";
import { getAlertSettings } from "@/lib/alertSettings";

export default async function AlertSettingsPage() {
  const settings = await getAlertSettings();

  return (
    <AppShell
      title="Alert Settings"
      subtitle="Configure how and when you're notified about regional visibility issues."
    >
      <AlertSettingsForm settings={settings} />
    </AppShell>
  );
}

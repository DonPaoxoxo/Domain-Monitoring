import { getSession } from "@/lib/auth";
import { getCheckerFleetSummary } from "@/lib/checkerNodes";
import AppShellClient from "./AppShellClient";

interface AppShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default async function AppShell({ title, subtitle, children }: AppShellProps) {
  const session = await getSession();
  const fleetStatus = await getCheckerFleetSummary();

  return (
    <AppShellClient title={title} subtitle={subtitle} username={session?.username ?? "Admin"} fleetStatus={fleetStatus}>
      {children}
    </AppShellClient>
  );
}

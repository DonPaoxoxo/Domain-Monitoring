import AppShell from "@/components/AppShell";
import RedirectMapContent from "@/components/RedirectMapContent";
import { getRedirectMapData } from "@/lib/redirectMap";

export default async function RedirectMapPage() {
  const data = await getRedirectMapData();

  return (
    <AppShell
      title="Redirect Map"
      subtitle="See which domains redirect where, and which are standalone or unreachable."
    >
      <RedirectMapContent data={data} />
    </AppShell>
  );
}

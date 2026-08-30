import Image from "next/image";
import { redirect } from "next/navigation";
import { Activity, BellRing, Globe2, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCheckerFleetSummary } from "@/lib/checkerNodes";
import LoginForm from "@/components/LoginForm";

const FEATURES = [
  { icon: Globe2, label: "Multi-region visibility" },
  { icon: BellRing, label: "Real-time alerts" },
  { icon: Activity, label: "Health scores" },
];

const STATUS_ROWS = [
  { label: "domain1.com · India", value: "10/10 UP", pct: 100, barClass: "bg-[#5cb85c]" },
  { label: "cloudmart.in · India", value: "6/10 UP", pct: 60, barClass: "bg-[#f39c12]" },
  { label: "paywiseapp.com · India", value: "0/10 UP", pct: 0, barClass: "bg-[#d9534f]" },
];

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const fleetStatus = await getCheckerFleetSummary();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-full max-w-md flex-col justify-between overflow-hidden bg-linear-to-br from-[#1d262b] via-[#1a2228] to-[#10171b] p-10 text-white lg:flex xl:max-w-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#20a8d8]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#5cb85c]/10 blur-3xl" />

        <div className="relative animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Mi-hawk" width={36} height={36} className="h-9 w-9 rounded-md" />
            <div>
              <p className="text-sm font-semibold leading-tight text-white">Mi-hawk</p>
              <p className="text-[11px] text-[#90a4ae]">Regional Monitor</p>
            </div>
          </div>

          <div className="mt-12 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-[#90a4ae]">
            <Sparkles size={12} className="text-[#20a8d8]" />
            Multi-region monitoring platform
          </div>

          <h1 className="mt-4 text-3xl leading-tight font-semibold">
            See where your domains are{" "}
            <span className="bg-linear-to-r from-[#20a8d8] to-[#5cb85c] bg-clip-text text-transparent">
              visible
            </span>{" "}
            — and where they&apos;re not.
          </h1>
          <p className="mt-3 max-w-sm text-sm text-[#90a4ae]">
            One dashboard for monitoring uptime and accessibility across every market you operate in.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">Live region status</p>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#5cb85c]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5cb85c] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5cb85c]" />
                </span>
                Live
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {STATUS_ROWS.map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#cfd8dc]">{row.label}</span>
                    <span className="font-medium text-white">{row.value}</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-2">
          {FEATURES.map((feature) => (
            <span
              key={feature.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#cfd8dc]"
            >
              <feature.icon size={12} className="text-[#20a8d8]" />
              {feature.label}
            </span>
          ))}
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-[#90a4ae]">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${fleetStatus.dotClassName}`} />
          {fleetStatus.label}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Image src="/logo.png" alt="Mi-hawk" width={64} height={64} className="h-16 w-16 rounded-2xl shadow-lg" />
            <h1 className="mt-3 text-base font-semibold text-foreground">Mi-hawk</h1>
            <p className="text-xs text-muted">Regional Monitor</p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-[11px] text-muted">Protected dashboard · authorized personnel only</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const STATUS_RULES: { label: string; badgeClass: string; description: string }[] = [
  {
    label: "Up",
    badgeClass: "bg-[#eaf6ea] text-[#3e8e41]",
    description:
      "The domain's own server responded with a 2xx-3xx status code. Redirects are not followed — a 3xx response already proves the origin answered, so it counts as reachable.",
  },
  {
    label: "Blocked",
    badgeClass: "bg-[#fdf2e3] text-[#b9770e]",
    description:
      "A non-2xx response matched a known Cloudflare/CloudFront edge-block page. This means the CDN flagged the checker's IP before the request reached the site's origin — real visitors from other IPs may still load the site fine.",
  },
  {
    label: "Down",
    badgeClass: "bg-[#fdecea] text-[#d9534f]",
    description:
      "Everything else: 4xx/5xx responses, DNS failures, refused/reset connections, expired or invalid TLS certificates, or a request that timed out twice in a row.",
  },
];

const ERROR_REASONS = [
  { code: "Timeout", meaning: "No response within 10 seconds — retried once before being marked Down." },
  { code: "DNS Error", meaning: "The domain name could not be resolved (ENOTFOUND / EAI_AGAIN)." },
  { code: "Connection Refused", meaning: "The server actively rejected the connection (ECONNREFUSED)." },
  { code: "Connection Reset", meaning: "The connection was dropped mid-request (ECONNRESET)." },
  { code: "SSL Error", meaning: "Expired, self-signed, or otherwise invalid TLS certificate." },
];

export default function CheckerHowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <HelpCircle size={15} className="text-[#20a8d8]" />
          <span className="text-sm font-semibold text-foreground">How checkpoint monitoring works</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4 text-[13px] text-foreground">
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Check cycle</h3>
            <p className="mt-1.5 text-muted">
              Each checker node runs independently from its own location on an hourly timer. Every cycle it
              fetches the current domain list from the main server, requests the domains in small concurrent
              batches, and reports every result back in a single submission.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">A single domain check</h3>
            <p className="mt-1.5 text-muted">
              The node sends a plain HTTP(S) <code className="rounded bg-surface-muted px-1 py-0.5">GET</code>{" "}
              request to the domain with a 10-second timeout and a{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5">Mi-hawk-Checker/1.0</code> user agent.
              Redirects are not followed — whatever status code the domain&apos;s own server returns determines
              the result:
            </p>
            <div className="mt-3 space-y-2">
              {STATUS_RULES.map((rule) => (
                <div key={rule.label} className="flex items-start gap-2.5 rounded-md border border-border p-2.5">
                  <span
                    className={`inline-flex shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${rule.badgeClass}`}
                  >
                    {rule.label}
                  </span>
                  <p className="text-muted">{rule.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Down — reason codes</h3>
            <p className="mt-1.5 text-muted">
              When a domain is marked <span className="font-medium text-foreground">Down</span>, the specific
              reason is recorded alongside it:
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-100 border-collapse text-[13px]">
                <tbody>
                  {ERROR_REASONS.map((reason) => (
                    <tr key={reason.code} className="border-b border-border last:border-b-0">
                      <td className="py-1.5 pr-4 font-medium whitespace-nowrap text-foreground">{reason.code}</td>
                      <td className="py-1.5 text-muted">{reason.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Why multiple locations</h3>
            <p className="mt-1.5 text-muted">
              The same domain is checked independently from every location shown on the map (10 across India, 5
              across Indonesia, plus 1 global checkpoint in Singapore). Each checks from its own network and IP
              address, so region-specific blocking, ISP-level censorship, or CDN routing differences show up
              per-location instead of being hidden behind a single vantage point.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Reporting &amp; freshness</h3>
            <p className="mt-1.5 text-muted">
              Results are submitted back to the main server and stored as each domain&apos;s latest status per
              region/location, plus appended to the check history log. A checkpoint is shown as{" "}
              <span className="font-medium text-foreground">online</span>{" "}
              as long as it has reported within the last 90 minutes — tolerating one missed hourly cycle before
              it&apos;s flagged as offline.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

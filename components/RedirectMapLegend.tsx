const LEGEND_ITEMS = [
  { color: "bg-[#5cb85c]", label: "Active / Standalone", description: "Serves content directly — no redirect detected." },
  { color: "bg-[#20a8d8]", label: "301 Redirect", description: "Permanently redirects to another monitored domain." },
  { color: "bg-[#f0ad4e]", label: "302 Redirect", description: "Temporarily redirects to another monitored domain." },
  { color: "bg-[#9b59b6]", label: "Bridge Page", description: "Returns 200 OK but shows a click-gate/loading page that auto-redirects (meta refresh) to another domain." },
  { color: "bg-[#d9534f]", label: "Not Connected", description: "Unreachable for its target market — needs review." },
];

export default function RedirectMapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-border bg-surface px-4 py-3 text-xs shadow-sm">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2" title={item.description}>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`} />
          <span className="text-foreground">{item.label}</span>
        </div>
      ))}
      <div
        className="flex items-center gap-2"
        title="Redirect target is monitored in the other market, or isn't monitored here at all"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-muted bg-surface-muted" />
        <span className="text-foreground">External / Cross-Market Target</span>
      </div>
    </div>
  );
}

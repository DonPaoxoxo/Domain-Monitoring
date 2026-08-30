import { getDomainMonitors } from "@/lib/domains";
import type { DomainMonitor, TargetMarket } from "@/types/monitor";

export type RedirectNodeStatus = "active" | "redirect-301" | "redirect-302" | "bridge" | "broken";

export interface RedirectMapNode {
  id: number;
  domain: string;
  targetMarket: TargetMarket;
  status: RedirectNodeStatus;
  redirectStatusCode: number | null;
  /** Normalized hostname of the redirect target, or null if not redirecting. */
  redirectTargetHost: string | null;
  /** Set when the redirect target is a monitored domain in the same market section (an arrow is drawn). */
  redirectTargetId: number | null;
  /** Set when the redirect target is a monitored domain in the OTHER market section (shown as a chip). */
  redirectTargetMarket: TargetMarket | null;
}

export interface RedirectMapEdge {
  /** Index into the group's `nodes` array. */
  fromIndex: number;
  /** Index into the group's `nodes` array. */
  toIndex: number;
  statusCode: number;
}

/** One chain (edges.length >= 1) or a single standalone/broken node (edges.length === 0). */
export interface RedirectGroup {
  nodes: RedirectMapNode[];
  edges: RedirectMapEdge[];
}

export interface RedirectMapStats {
  total: number;
  active: number;
  redirect301: number;
  redirect302: number;
  bridge: number;
  broken: number;
  chains: number;
}

export interface RedirectMapData {
  india: RedirectGroup[];
  indonesia: RedirectGroup[];
  stats: RedirectMapStats;
}

/** Lowercases a hostname and strips a leading "www.", parsing bare hostnames (no scheme) too. */
function normalizeHost(input: string): string | null {
  try {
    const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
    const url = new URL(hasProtocol ? input : `https://${input}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Classifies a domain for the redirect map. "broken" (fully unreachable for its
 * target market) takes priority over any redirect info, which may be stale.
 * A 200 OK with a detected meta-refresh target is a "bridge" (click-gate) page.
 */
function classify(domain: DomainMonitor): RedirectNodeStatus {
  if (domain.overallStatus === "Critical") return "broken";
  if (domain.redirectUrl && domain.redirectStatusCode) {
    if (domain.redirectStatusCode === 301 || domain.redirectStatusCode === 308) return "redirect-301";
    if (domain.redirectStatusCode >= 300) return "redirect-302";
    return "bridge";
  }
  return "active";
}

/**
 * Groups a market's nodes into chains (connected via redirect edges) and
 * standalone nodes.
 *
 * Each node has at most one outgoing edge (its single redirect target), but a
 * target can have many incoming edges - e.g. several mirror/bridge domains
 * all funneling into one landing page. A "fan-in" target (>=2 incoming edges)
 * ends every chain that points to it, and - if it has its own outgoing edge -
 * also starts a new chain of its own. This means a fan-in target's card can
 * appear in multiple groups (once per incoming chain), which is intentional:
 * each row shows one complete redirect path.
 */
function buildGroups(nodes: RedirectMapNode[], market: TargetMarket): RedirectGroup[] {
  const indices = nodes.map((_, i) => i).filter((i) => nodes[i].targetMarket === market);
  const indexById = new Map<number, number>();
  indices.forEach((i) => indexById.set(nodes[i].id, i));

  const outgoing = new Map<number, { toIndex: number; statusCode: number }>();
  const incomingCount = new Map<number, number>();

  for (const i of indices) {
    const node = nodes[i];
    if (node.redirectTargetId == null) continue;
    const toIndex = indexById.get(node.redirectTargetId);
    if (toIndex == null) continue;

    outgoing.set(i, { toIndex, statusCode: node.redirectStatusCode! });
    incomingCount.set(toIndex, (incomingCount.get(toIndex) ?? 0) + 1);
  }

  const isFanIn = (idx: number) => (incomingCount.get(idx) ?? 0) >= 2;
  const isHead = (idx: number) => outgoing.has(idx) && (incomingCount.get(idx) ?? 0) !== 1;

  const included = new Set<number>();
  const groups: RedirectGroup[] = [];

  for (const i of indices) {
    if (!isHead(i)) continue;

    const chainNodes = [i];
    const edges: RedirectMapEdge[] = [];
    const seen = new Set([i]);
    let current = i;

    while (outgoing.has(current)) {
      const { toIndex, statusCode } = outgoing.get(current)!;
      if (seen.has(toIndex)) break;
      edges.push({ fromIndex: chainNodes.length - 1, toIndex: chainNodes.length, statusCode });
      chainNodes.push(toIndex);
      seen.add(toIndex);
      if (isFanIn(toIndex)) break;
      current = toIndex;
    }

    chainNodes.forEach((idx) => included.add(idx));
    groups.push({ nodes: chainNodes.map((idx) => nodes[idx]), edges });
  }

  for (const i of indices) {
    if (included.has(i)) continue;
    groups.push({ nodes: [nodes[i]], edges: [] });
  }

  return groups.sort((a, b) => {
    if (a.nodes.length !== b.nodes.length) return b.nodes.length - a.nodes.length;
    return a.nodes[0].domain.localeCompare(b.nodes[0].domain);
  });
}

/**
 * Builds the redirect map: every monitored domain classified as active,
 * 301/302 redirecting, or broken (unreachable), grouped into chains where a
 * domain's redirect target is itself a monitored domain.
 */
export async function getRedirectMapData(): Promise<RedirectMapData> {
  const domains = await getDomainMonitors();

  const byHost = new Map<string, DomainMonitor>();
  for (const d of domains) {
    const host = normalizeHost(d.domain);
    if (host) byHost.set(host, d);
  }

  const nodes: RedirectMapNode[] = domains.map((d) => {
    const status = classify(d);
    let redirectTargetHost: string | null = null;
    let redirectTargetId: number | null = null;
    let redirectTargetMarket: TargetMarket | null = null;

    if (status === "redirect-301" || status === "redirect-302" || status === "bridge") {
      redirectTargetHost = d.redirectUrl ? normalizeHost(d.redirectUrl) : null;
      if (redirectTargetHost) {
        const target = byHost.get(redirectTargetHost);
        if (target && target.id !== d.id) {
          if (target.targetMarket === d.targetMarket) {
            redirectTargetId = target.id;
          } else {
            redirectTargetMarket = target.targetMarket;
          }
        }
      }
    }

    return {
      id: d.id,
      domain: d.domain,
      targetMarket: d.targetMarket,
      status,
      redirectStatusCode: d.redirectStatusCode,
      redirectTargetHost,
      redirectTargetId,
      redirectTargetMarket,
    };
  });

  const india = buildGroups(nodes, "india");
  const indonesia = buildGroups(nodes, "indonesia");

  const stats: RedirectMapStats = {
    total: nodes.length,
    active: nodes.filter((n) => n.status === "active").length,
    redirect301: nodes.filter((n) => n.status === "redirect-301").length,
    redirect302: nodes.filter((n) => n.status === "redirect-302").length,
    bridge: nodes.filter((n) => n.status === "bridge").length,
    broken: nodes.filter((n) => n.status === "broken").length,
    chains: [...india, ...indonesia].filter((g) => g.nodes.length >= 2).length,
  };

  return { india, indonesia, stats };
}

# Mi-Hawk Domain Radar — Technical Documentation

This document is a deeper technical reference for the system, covering the
data model, status/scoring algorithm, checker-node internals, API contracts,
configuration, and operations. For a quick project overview and local setup,
see [README.md](README.md).

> **Note:** This project runs on a fork of Next.js with breaking changes from
> upstream (e.g. `proxy.ts` instead of `middleware.ts`). See `AGENTS.md` and
> `node_modules/next/dist/docs/` before changing framework-level code.

---

## 1. Overview

Mi-Hawk Domain Radar monitors whether domains are *reachable for the audience
that matters* — not just "is the server up?". Each domain is monitored only
from its own **target market** region — India (10 locations) or Indonesia (5
locations) — never a generic global average.

By default, checks run via a single scheduled script
([`scripts/globalping-checker.ts`](scripts/globalping-checker.ts)) that reads
active domains from the database and probes each one through
[Globalping](https://globalping.io)'s distributed public probe network, one
measurement per checkpoint location (15 total). An alternative, self-hosted
checker fleet ([`checker-node/`](checker-node/) — one lightweight Node.js
process per checkpoint, managed with PM2) is also included for anyone who'd
rather run their own probe VPS instead of depending on Globalping — see
[§7](#7-checker). Either way, results are reported back to the dashboard over
a small authenticated API. The dashboard (this Next.js app) stores the latest
results plus a 30-day history, computes per-region and overall status, and
surfaces it through a CoreUI-style admin UI, plus email/webhook alerting on
status changes.

---

## 2. Architecture

```mermaid
flowchart LR
    subgraph Dashboard["Dashboard (Next.js)"]
        UI["Admin UI (App Router pages)"]
        DB[("MariaDB via Prisma")]
        API["/api/checker/*<br/>/api/checkpoints/live<br/>/api/domains/*"]
        Alerts["Alert dispatch<br/>(email / webhook)"]
        UI --> DB
        API --> DB
        DB -. "status change" .-> Alerts
    end

    subgraph Checker["Checker (default): Globalping cron job"]
        GP["scripts/globalping-checker.ts<br/>probes 15 locations via Globalping API"]
    end

    subgraph Legacy["Checker (alternative): self-hosted fleet"]
        VPS["checker-node/ — one PM2 process<br/>per checkpoint location"]
    end

    GP -- "GET /api/checker/domains" --> API
    GP -- "POST /api/checker/results" --> API
    VPS -- "GET /api/checker/domains" --> API
    VPS -- "POST /api/checker/results" --> API
```

- **The dashboard never contacts monitored domains directly.** All
  reachability data comes from a checker — Globalping-based by default, or
  the self-hosted fleet.
- Both checker implementations speak the same small authenticated API and are
  interchangeable: they **pull** the domain list + current interval (`GET
  /api/checker/domains`) and **push** results (`POST /api/checker/results`),
  authenticated with `Bearer CHECKER_API_KEY`.
- **Location names are a shared contract.** Whatever reports a result must use
  the exact same `location` string the dashboard expects — see
  [`data/checkpoints.ts`](data/checkpoints.ts) and
  [`data/mockDomains.ts`](data/mockDomains.ts)`.REGION_LOCATIONS`. A mismatch
  doesn't error — it just means the checker's results are silently invisible
  to the dashboard (every location reads "No data yet" even though checks are
  succeeding). See [§13](#13-known-limitations--roadmap).

---

## 3. Tech stack

| Layer | Stack |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Styling | Tailwind CSS 4 |
| Database | MariaDB via Prisma 7 + `@prisma/adapter-mariadb` |
| Charts / maps | Chart.js (`react-chartjs-2`), Leaflet + `react-leaflet` (OpenStreetMap tiles) |
| Reporting exports | jsPDF + `jspdf-autotable`, ExcelJS |
| Email alerts | nodemailer (SMTP) |
| Checker | Scheduled Globalping API probe script (default), or standalone Node.js (ESM) processes managed by PM2 (self-hosted alternative) |
| Auth | Custom HMAC-signed session cookies + scrypt password hashing (no external auth library) |

---

## 4. Data model

MariaDB database (`mi_hawk`), schema managed by Prisma (`prisma/schema.prisma`,
generated client under `lib/generated/prisma/`).

### `Domain`
The monitored site itself.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Int (PK) | |
| `domain` | String, unique | e.g. `cloudmart.in` |
| `url` | String | Full URL checked by the fleet, e.g. `https://cloudmart.in` |
| `group` | String, default `"Default"` | Free-form grouping label |
| `targetMarket` | String? | `"india"` or `"indonesia"` |
| `active` | Boolean, default `true` | Inactive domains are excluded from `/api/checker/domains` and the dashboard |
| `paused` | Boolean, default `false` | Paused from the dashboard; checker nodes skip these (see [Domains page](#domains)) |
| `createdAt` | DateTime | |

Relations: `results` (`CheckResult[]`), `checkLogs` (`CheckLog[]`),
`alertState` (`DomainAlertState?`).

### `CheckResult`
The **latest** status for one `(domain, region, location)` triple — one row
per checkpoint per domain, upserted every cycle. This is what the dashboard
reads.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Int (PK) | |
| `domainId` | Int (FK → `Domain`) | |
| `region` | String | `"india"` \| `"indonesia"` |
| `location` | String | Must match a name in `REGION_LOCATIONS`/`CHECKPOINTS` exactly, e.g. `"Mumbai"`, `"Jakarta"` |
| `nodeName` | String | Reporting checker's `NODE_NAME` |
| `status` | String | `"up"` \| `"down"` \| `"blocked"` |
| `statusCode` | Int? | HTTP status code, if any |
| `responseTimeMs` | Int? | Only set for `"up"` |
| `errorMessage` | String? | Failure reason / block description |
| `checkedAt` | DateTime | When the checker performed the check |
| `updatedAt` | DateTime | Auto-updated on upsert |

Unique on `(domainId, region, location)`; indexed on `(region, location)`.

### `CheckLog`
Append-only history of every check (same shape as `CheckResult` minus the
upsert semantics), pruned to the last **30 days**. Powers the
[Check History](#check-history) page.

Indexed on `(domainId, checkedAt)` and `(checkedAt)`.

### `DomainAlertState`
One row per domain, tracking the **last status an alert was sent for**, so
[alert dispatch](#10-alerting) only fires on transitions, not every cycle.

| Field | Type |
| --- | --- |
| `id` | Int (PK) |
| `domainId` | Int (FK → `Domain`, unique) |
| `lastStatus` | String (an `OverallStatus`) |
| `updatedAt` | DateTime |

### `AppSettings` (singleton, `id = 1`)
Dashboard-configurable "Monitoring defaults" (System Settings page).

| Field | Type | Default |
| --- | --- | --- |
| `checkInterval` | String | `"1 hour"` |
| `requestTimeout` | String | `"10 seconds"` |
| `retries` | Int | `2` |
| `checkerApiKey` | String? | Overrides `CHECKER_API_KEY` env var once regenerated via the UI |

### `AlertSettings` (singleton, `id = 1`)
Configuration for the [Alert Settings](#alert-settings) page.

| Field | Type | Default |
| --- | --- | --- |
| `emailEnabled` | Boolean | `true` |
| `email` | String | `"ops@mi-hawk.io"` |
| `webhookEnabled` | Boolean | `true` |
| `webhookUrl` | String | placeholder Slack URL |
| `smsEnabled` | Boolean | `false` |
| `smsNumber` | String | `""` |
| `thresholdIndia` / `thresholdIndonesia` | Int | `70` / `70` |
| `thresholdGlobal` | Int | `50` — **legacy column**, unused since the Global region was retired; not read anywhere |
| `escalation` | String (JSON) | per-`OverallStatus` `{ email, webhook }` map |

### `BulkImportLog`
One row per [Bulk Import](#bulk-import) batch, for the "Recent imports" table:
`fileName`, `market`, `added`, `skipped`, `createdAt`.

### `Admin`
Additional admin accounts beyond the single env-configured admin
(`ADMIN_USERNAME`/`ADMIN_PASSWORD`). Managed via `scripts/create-admin.ts`.
`passwordHash` is `scrypt`-derived (see [`lib/password.ts`](lib/password.ts)).

---

## 5. Status & scoring model

All scoring logic lives in [`lib/status.ts`](lib/status.ts).

### Location status
Each checked location is one of:

- **`up`** — HTTP response in the `200-399` range (redirects count as up;
  they are *not* followed).
- **`down`** — non-2xx/3xx response that doesn't match a known CDN/WAF
  block-page signature, or a network-level failure (DNS, connection refused,
  TLS error, timeout after retry).
- **`blocked`** — non-2xx response that *matches* a known CDN/WAF edge-block
  signature (Cloudflare/CloudFront "Attention Required" / "Request Blocked"
  pages). This means **the checker's own IP was challenged by the target's
  CDN before reaching the origin** — it is a checker-side signal, not
  evidence the site is down for real visitors.

### Region percentage — `getRegionPercentage()`
```
checked = region.total - region.blocked
percentage = checked <= 0 ? 100 : round(region.up / checked * 100)
```
`blocked` locations are excluded from **both** sides of the ratio — by
design, so a WAF flagging the checker's IP doesn't tank a domain's score or
trigger a false alert. If every location for a region is blocked (or nothing
has been checked yet), the region defaults to **100%**.

### Status buckets — `statusFromPercentage()`
| Percentage | Status |
| --- | --- |
| 100 | Healthy |
| 70-99 | Minor Issue |
| 30-69 | Partial Issue |
| 1-29 | Major Issue |
| 0 | Critical |

### Overall status — `computeOverallStatus()`
The domain's **target market region** (India or Indonesia) is the *only*
input — `regions` only ever carries the one region matching
`domain.targetMarket` (built in [`getDomainMonitors()`](lib/domains.ts)), so
overall status is simply `statusFromPercentage(getRegionPercentage(target))`.
There is no secondary/global checkpoint that can influence or downgrade it —
that mechanism existed when a Global (Singapore) checkpoint was still part of
the fleet and was removed along with it. A domain's status reflects only what
its own audience's region actually sees.

### Severity ranking
Used for sorting "worst first" throughout the UI (Incidents list, table row
accents, summary cards):
```
Critical (0) < Major Issue (1) < Partial Issue (2) < Minor Issue (3) < Healthy (4)
```

### Summary-card buckets — `SEVERITY_FILTER_STATUSES`
The dashboard's summary cards group the 5 `OverallStatus` values into 3
filters:
- **Healthy** → `Healthy`
- **Partial Issue** → `Minor Issue`, `Partial Issue`
- **Critical** → `Major Issue`, `Critical`

---

## 6. Dashboard pages

All pages are server components wrapped in `<AppShell>` (sidebar + header
layout) and require an admin session (enforced in `proxy.ts` — this fork's
equivalent of middleware).

### Dashboard (`/dashboard`)
Fleet-wide summary cards (Healthy / Partial Issue / Critical counts), a
domain table with per-region score badges, and recent-activity context. Data
via [`getDomainMonitors()`](lib/domains.ts).

### Domains (`/domains`)
Full searchable directory of monitored domains, grouped and filterable by
target market, with per-region (India/Indonesia) up/down/blocked breakdowns.
Per-domain actions ([`app/domains/actions.ts`](app/domains/actions.ts)):
- **Pause/resume** (`setDomainPaused`) — paused domains are excluded from
  `/api/checker/domains`, so the fleet stops checking them entirely.
- **Remove** (`removeDomain`) — cascades to `CheckResult`/`CheckLog`/`DomainAlertState`.
- **Add domain** ([`app/bulk-import` form action `addDomain`](app/bulk-import/actions.ts)) —
  normalizes input (strips protocol/path, lowercases, validates hostname
  shape), defaults `url` to `https://<domain>`.
- **Live check** — triggers `/api/domains/[id]/live-check` (see [API
  reference](#api-reference)) for an on-demand diagnostic from the dashboard
  server itself (not the fleet).

### Region Checks (`/region-checks`)
Per-location checkpoint health aggregated across *all* monitored domains
(`getLocationAggregates()`), plus the **Live Checkpoint Map**
([`components/LiveCheckpointMap.tsx`](components/LiveCheckpointMap.tsx) +
[`LeafletCheckpointMap.tsx`](components/LeafletCheckpointMap.tsx)) — a real
Leaflet/OpenStreetMap view of all 15 checkpoints (coordinates in
[`data/checkpoints.ts`](data/checkpoints.ts)), color-coded by status, polling
`/api/checkpoints/live` every 30s.

### Incidents (`/incidents`)
Flattened, severity-sorted feed of every `down` location across the portfolio
(`getIncidents()`), each entry showing the domain, region, location, and
error reason.

### Check History (`/check-history`)
Paginated (50/page), filterable (by domain/region/status) view over the
30-day `CheckLog` timelog (`getCheckHistory()`).

### Reports (`/reports`)
Daily/weekly/monthly accessibility reports with PDF (jsPDF) and Excel
(ExcelJS) export. Daily figures are the live snapshot; weekly/monthly figures
are **deterministically projected** from the daily snapshot via a seeded PRNG
(`periodUptime`/`periodIncidents` in [`lib/reports.ts`](lib/reports.ts)) since
no historical time-series aggregation exists yet — see [Known
limitations](#13-known-limitations--roadmap).

### Bulk Import (`/bulk-import`)
Add/update domains in bulk for India or Indonesia, with a log of recent
import batches (`BulkImportLog`, via [`lib/bulkImports.ts`](lib/bulkImports.ts)).

### Alert Settings (`/alert-settings`)
Configure email/webhook/SMS notification channels, per-region thresholds
(India/Indonesia), and per-`OverallStatus` escalation rules (which
severities trigger email vs. webhook). Backed by `AlertSettings` /
[`lib/alertSettings.ts`](lib/alertSettings.ts).

> Note: the `thresholdIndia`/`thresholdIndonesia` values (plus a legacy,
> unused `thresholdGlobal`) are stored and editable here but are **not
> currently read** by
> `evaluateAndDispatchAlerts()` — alerting is driven purely by *overall status
> transitions* + the escalation map, not by threshold crossings. See [Known
> limitations](#13-known-limitations--roadmap).

### System Settings (`/system-settings`)
- **Monitoring defaults**: Check interval (1 min – 12 hours), Request timeout
  (5/10/15/30s), Retry count (0-3) — persisted to `AppSettings` via
  [`saveMonitoringDefaults`](app/system-settings/actions.ts). **Check interval
  is the only one of these three actually wired to the checker fleet** (see
  [§7](#7-checker)); request timeout and retries are currently
  display-only.
- **Checker node status**: live online/offline table from
  [`getCheckerNodes()`](lib/checkerNodes.ts) — derived from how recently each
  `(nodeName, region, location)` has posted a `CheckResult` (offline if silent
  for >1.5× the *currently configured* check interval, via
  `getOnlineThresholdMs()` — scales automatically when the interval changes).
- **Checker API key**: view (masked, revealable), copy, and **regenerate**
  (`regenerateApiKey`) the shared bearer token used by `checkApiKey()`. Once
  regenerated via the UI, the DB value (`AppSettings.checkerApiKey`)
  overrides the `CHECKER_API_KEY` env var for the dashboard — **every checker
  node's `.env`/ecosystem config must be updated to match**, or they'll start
  getting `401`s.

### Login (`/login`)
Single-admin login (`ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars), plus any rows
in the `Admin` table (passwords hashed with `scrypt`). Sets an HMAC-signed
session cookie (see [§11](#11-authentication--security)).

---

## 7. Checker

Two interchangeable checker implementations exist. Both speak the same API
([§8](#8-api-reference)) and must report `location` values that exactly match
[`data/checkpoints.ts`](data/checkpoints.ts) / `REGION_LOCATIONS` in
[`data/mockDomains.ts`](data/mockDomains.ts) — see the warning in
[§2](#2-architecture).

### 7.1 Globalping checker (default)

Source: [`scripts/globalping-checker.ts`](scripts/globalping-checker.ts),
using the [`lib/globalping.ts`](lib/globalping.ts) API client.

- Runs as a scheduled job (PM2 `cron_restart` in the root
  [`ecosystem.config.cjs`](ecosystem.config.cjs), every 4 hours by default —
  independent of the dashboard's "Check interval" setting, which only the
  legacy checker fleet consumes).
- Each run: loads every `active`, non-`paused` domain from the database,
  probes it from all 10 India + 5 Indonesia locations via the Globalping API
  (`GLOBALPING_API_KEY_INDIA` / `GLOBALPING_API_KEY_INDONESIA`), skipping a
  market's locations entirely if the domain's `targetMarket` excludes it, then
  submits one batched `POST /api/checker/results` per location.
- Status mapping (`toStatus()`): `statusCode === null` → `down`; `403` →
  `blocked`; `200-499` → `up`; anything else → `down`. This is coarser than
  the legacy checker's CDN block-page-body sniffing — it relies on the origin
  (or a WAF in front of it) actually returning `403` for a block.
- If the Globalping measurement itself fails (network error, quota) for a
  domain, every location for that probe run is reported `down` with the raw
  error as `errorMessage`.
- Run manually with `npm run checker:run`.

### 7.2 Self-hosted checker fleet (`checker-node/`, alternative)

Source: [`checker-node/`](checker-node/) — a standalone ESM Node.js project,
deployed as one PM2 process **per checkpoint location** (up to 15, split
across as many VPS as you like — commonly one India VPS + one Indonesia VPS).
Use this instead of Globalping if you'd rather control your own probe
infrastructure.

#### Lifecycle (`src/index.js`)
A self-rescheduling loop (not `setInterval`):

```js
async function tick() {
  // 1. runCheckCycle() — fetch domains + run checks + submit results
  // 2. nextIntervalMinutes = server-provided checkIntervalMinutes,
  //    falling back to config.checkIntervalMinutes (CHECK_INTERVAL_MINUTES env var)
  // 3. setTimeout(tick, nextIntervalMinutes * 60 * 1000)
}
```

Each cycle re-fetches the current interval from the dashboard, so **changing
"Check interval" in System Settings reschedules every node within one cycle**
— no restart needed. If the dashboard is unreachable or omits the field, the
node falls back to its own `CHECK_INTERVAL_MINUTES` env var.

#### Run cycle (`src/runner.js`)
```js
const { domains, checkIntervalMinutes } = await fetchDomains();
// process `domains` in batches of config.batchSize (default 5) via Promise.all
// submitResults(results) if any results were produced
return { results, checkIntervalMinutes };
```
Because each batch runs with `Promise.all`, a batch's wall-clock time equals
its **slowest** member (up to `2 × timeoutMs` if that domain times out twice).

#### Check logic (`src/checker.js`) — `checkDomain()`
- `fetch(url, { method: "GET", redirect: "manual", ... })` with a
  `User-Agent: Mi-hawk-Checker/1.0` header.
- **Redirects are not followed** — a 3xx from the domain's own server counts
  as `up` (the redirect target, if monitored separately, is checked on its
  own).
- `200-399` → `up`, with `statusCode` and `responseTimeMs`.
- Non-2xx → checks response body/headers against `CDN_BLOCK_SIGNATURES`
  (Cloudflare "Attention Required" / "Sorry, you have been blocked",
  CloudFront "Request Blocked" / "could not be satisfied"). Match → `blocked`;
  no match → `down` with `"<code> <statusText>"`.
- **Timeout/retry**: each attempt is bounded by `AbortController` +
  `setTimeout(() => controller.abort(), config.timeoutMs)`. On `AbortError`
  at attempt 1, retries once with a fresh timer before giving up as `down`
  ("Timeout") — a single slow response shouldn't flip a domain's status.
- Other network errors are classified via `classifyError()`: DNS Error
  (`ENOTFOUND`/`EAI_AGAIN`), Connection Refused (`ECONNREFUSED`), Connection
  Reset (`ECONNRESET`), SSL Error (cert issues), or the raw error message.

#### Configuration (`src/config.js`)
| Env var | Used as | Default |
| --- | --- | --- |
| `MAIN_SERVER_URL` | `config.mainServerUrl` | *(required)* |
| `CHECKER_API_KEY` | `config.apiKey` | *(required)* |
| `NODE_NAME` | `config.nodeName` | *(required)* |
| `REGION_NAME` | `config.region` | *(required)* — `india` \| `indonesia` |
| `LOCATION_NAME` | `config.location` | *(required)* — must match a name in `REGION_LOCATIONS` exactly |
| `CHECK_INTERVAL_MINUTES` | fallback interval | `60` |
| `BATCH_SIZE` | concurrent checks per batch | `5` |
| — | `config.timeoutMs` | **hardcoded `10_000`** (10s) — not currently env-configurable or wired to the dashboard's "Request timeout" setting |

`validateConfig()` exits the process if any of the five required vars are
missing.

#### Communication (`src/api.js`)
- `fetchDomains()` → `GET {MAIN_SERVER_URL}/api/checker/domains` with
  `Authorization: Bearer {CHECKER_API_KEY}`. Returns `{ domains,
  checkIntervalMinutes }`.
- `submitResults(results)` → `POST {MAIN_SERVER_URL}/api/checker/results` with
  `{ nodeName, region, location, results }`.

#### Process management
Each checkpoint is a PM2 app (see [`checker-node/ecosystem.config.cjs`](checker-node/ecosystem.config.cjs)
for the single-process template; production deployments use one
ecosystem file per VPS defining one app per location, sharing
`MAIN_SERVER_URL`/`CHECKER_API_KEY` but with distinct
`NODE_NAME`/`REGION_NAME`/`LOCATION_NAME`).

```bash
pm2 start ecosystem.config.cjs
pm2 logs <app-name>
# After editing ecosystem env vars, `restart` alone does NOT reload them:
pm2 restart ecosystem.config.cjs --update-env
```

---

## 8. API reference

### `GET /api/checker/domains`
**Auth:** `Authorization: Bearer <CHECKER_API_KEY>` (checked against
`AppSettings.checkerApiKey` or `CHECKER_API_KEY` env var).

Returns the active, non-paused domain list plus the current check interval
(from Monitoring Defaults), so checker nodes can self-reschedule.

```json
{
  "domains": [{ "id": 12, "domain": "cloudmart.in", "url": "https://cloudmart.in" }],
  "checkIntervalMinutes": 180
}
```

### `POST /api/checker/results`
**Auth:** same bearer key.

**Body:**
```json
{
  "nodeName": "india-mumbai",
  "region": "india",
  "location": "Mumbai",
  "results": [
    {
      "domainId": 12,
      "status": "up",
      "statusCode": 200,
      "responseTimeMs": 310,
      "errorMessage": null,
      "checkedAt": "2026-06-13T04:00:00.000Z"
    }
  ]
}
```

Behavior:
- Upserts `CheckResult` per `(domainId, region, location)` and appends to
  `CheckLog`, **all inside a single MariaDB transaction** (batching avoids
  serialized per-row transactions when multiple nodes submit concurrently —
  previously caused 30-100s submissions and nginx 60s timeouts).
- Prunes `CheckLog` rows older than 30 days in the same transaction.
- Fires `evaluateAndDispatchAlerts()` **asynchronously** (not awaited) for any
  domains whose results were just written — does not delay the response.

**Response:**
```json
{ "success": true, "received": 1, "processed": 1, "failed": [] }
```

### `GET /api/domains/[id]/live-check`
**Auth:** admin session cookie (dashboard UI only, not the checker fleet).

Server-Sent Events (SSE) stream of a real-time, step-by-step diagnostic for
one domain — DNS resolution, HTTP request, response classification — mirroring
`checker-node`'s logic exactly (same CDN block signatures, same 10s
timeout/retry, same error classification), so admins can debug *why* a domain
shows a given status without waiting for the fleet's next cycle.

Event types: `{ type: "step", message: string }` (progress narration) and a
final `{ type: "result", status, statusCode, responseTimeMs, errorMessage,
checkedAt }`.

### `GET /api/checkpoints/live`
**Auth:** admin session cookie.

Returns live up/down/blocked counts + online status for each of the 15
checkpoints, for the Region Checks page's Leaflet map (polled every 30s).

```json
{
  "checkpoints": [
    {
      "name": "Mumbai", "regionKey": "india", "regionLabel": "India",
      "lat": 19.076, "lng": 72.8777,
      "up": 180, "down": 5, "blocked": 10, "total": 195,
      "percentage": 97, "lastCheckedAt": "2026-06-13T04:00:00.000Z", "online": true
    }
  ],
  "generatedAt": "2026-06-13T04:05:00.000Z"
}
```

---

## 9. Configuration & settings

### Monitoring defaults (`AppSettings`, System Settings page)
| Setting | Options | Wired to a checker? |
| --- | --- | --- |
| Check interval | 1/5/15/30 min, 1/2/3/4/6/12 hours | **Only the self-hosted fleet** — via `checkIntervalMinutes` in `/api/checker/domains`, consumed by `checker-node/src/index.js`'s `tick()`. The Globalping checker runs on its own PM2 cron schedule (`ecosystem.config.cjs`), independent of this setting. |
| Request timeout | 5/10/15/30 sec | **No** — `checker-node/src/config.js` hardcodes `timeoutMs: 10_000`; the Globalping checker has no client-side timeout of its own (bounded by Globalping's measurement API instead) |
| Retries | 0-3 | **No** — `checker-node/src/checker.js` always retries exactly once on timeout; the Globalping checker doesn't retry (a failed measurement is reported down as-is) |

`checkIntervalToMinutes()` ([`lib/settings.ts`](lib/settings.ts)) converts the
human-readable string (e.g. `"3 hours"`) to a minute count for the fleet.

### Alert settings (`AlertSettings`, Alert Settings page)
- **Channels**: email (SMTP via nodemailer), webhook (POST `{ text }` to any
  Slack-compatible incoming-webhook URL, 8s timeout), SMS (UI only — no
  dispatch implementation yet).
- **Escalation map**: per `OverallStatus`, whether email and/or webhook fire.
  Defaults: Critical/Major Issue → both; Partial Issue → email only;
  Minor Issue/Healthy → neither.
- **Thresholds** (`thresholdIndia`/`thresholdIndonesia`, plus a legacy unused
  `thresholdGlobal`): stored and editable, but not currently consulted by the
  alert dispatcher (see [§13](#13-known-limitations--roadmap)).

---

## 10. Alerting

[`lib/alerts.ts`](lib/alerts.ts) — `evaluateAndDispatchAlerts(domainIds)`,
called (fire-and-forget) after every `POST /api/checker/results`:

1. Loads current `DomainMonitor`s for the affected domains and their last
   alerted status (`DomainAlertState`).
2. For a domain seen for the first time, records its current
   `overallStatus` as the baseline — **no alert** (avoids a flood on first
   run / new domain).
3. If `overallStatus` is unchanged since the last alert, does nothing.
4. On a transition, updates `DomainAlertState.lastStatus` and, per the
   escalation rule for the **new** status:
   - **Email** (if enabled + rule allows + an address is set): via
     `sendEmailAlert()` — requires `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` env
     vars; silently skipped (logged) if unset.
   - **Webhook** (if enabled + rule allows + a URL is set): via
     `sendWebhookAlert()` — POSTs `{ text }` JSON, 8s timeout.

Message format:
```
🔴 cloudmart.in is now Major Issue (was Healthy)
India: 40% reachable
```
(emoji per `STATUS_EMOJI`, followed by the domain's target-market line).

---

## 11. Authentication & security

- **Admin session**: HMAC-SHA256-signed cookie (`mihawk_session`, 7-day
  expiry) — [`lib/session.ts`](lib/session.ts). Signature verified with
  `timingSafeEqual`; payload includes `username` + `expiresAt`. Signing key is
  `SESSION_SECRET` (env var, required).
- **Login**: [`app/login/actions.ts`](app/login/actions.ts) — checks
  `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars first, then falls back to the
  `Admin` table (passwords hashed with `scrypt`, 64-byte key,
  `<salt>:<hash>` hex format — [`lib/password.ts`](lib/password.ts)).
- **Cookie security**: `Secure` flag is on unless `COOKIE_SECURE="false"` —
  only disable for plain-HTTP (no TLS) deployments, otherwise browsers drop
  the cookie silently and login appears to fail.
- **Checker API**: single shared bearer token (`checkApiKey()` in
  [`lib/auth.ts`](lib/auth.ts)), checked against `AppSettings.checkerApiKey`
  (if ever regenerated via System Settings) or the `CHECKER_API_KEY` env var.
  Protects `POST /api/checker/results` and `GET /api/checker/domains` only —
  all other API routes use the admin session cookie.

---

## 12. Environment variables

### Dashboard (`.env`, see [`.env.example`](.env.example))
| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | MariaDB connection string, e.g. `mysql://user:password@127.0.0.1:3306/mi_hawk` |
| `CHECKER_API_KEY` | Shared secret for `/api/checker/*` (overridable via System Settings) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Primary admin login |
| `SESSION_SECRET` | HMAC key for session cookies |
| `COOKIE_SECURE` | `"true"` (default) requires HTTPS for the session cookie |
| `GLOBALPING_API_KEY_INDIA` / `GLOBALPING_API_KEY_INDONESIA` | API keys for the default checker (`scripts/globalping-checker.ts`) — separate keys give each region its own Globalping rate-limit pool |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Email alert delivery (nodemailer); unset = email alerts skipped |

### Self-hosted checker fleet, alternative (`checker-node/.env`, see [`checker-node/.env.example`](checker-node/.env.example))
| Var | Purpose |
| --- | --- |
| `MAIN_SERVER_URL` | Dashboard base URL (no trailing slash) |
| `CHECKER_API_KEY` | Must match the dashboard's |
| `NODE_NAME` | Identifies this process in logs/results |
| `REGION_NAME` | `india` \| `indonesia` |
| `LOCATION_NAME` | One of `REGION_LOCATIONS[REGION_NAME]` (e.g. `Mumbai`) — must match exactly |
| `CHECK_INTERVAL_MINUTES` | Fallback interval if the dashboard is unreachable (default `60`) |
| `BATCH_SIZE` | Concurrent checks per batch (default `5`) |

---

## 13. Known limitations / roadmap

- **Location names are a fragile shared contract.** The dashboard matches
  `CheckResult.location` against `data/checkpoints.ts` / `REGION_LOCATIONS`
  by exact string, in application code — there's no foreign key or shared
  constant enforcing it. A checker that reports a differently-spelled or
  differently-formatted location (as happened when
  `scripts/globalping-checker.ts` was first added, submitting slugs like
  `"india-mumbai"` against a checkpoint list expecting `"Mumbai"`) silently
  produces zero matches rather than an error — every location reads "No data
  yet" even though checks are succeeding and being written to the database.
  If you add or rename a checkpoint, update `data/checkpoints.ts`,
  `REGION_LOCATIONS` in `data/mockDomains.ts`, and every checker's location
  values together, in the same change.
- **Request timeout & retries are display-only.** `AppSettings.requestTimeout`
  and `.retries` are saved from System Settings but not read by either
  checker — the self-hosted fleet hardcodes 10s with exactly one retry, and
  the Globalping checker has no equivalent settings at all. Could be wired
  the same way `checkInterval` was for the self-hosted fleet (return alongside
  `checkIntervalMinutes` from `/api/checker/domains`).
- **Alert thresholds are unused.** `AlertSettings.thresholdIndia`/`thresholdIndonesia`
  (plus a legacy `thresholdGlobal` column left over from the retired Global
  region) are stored/editable but `evaluateAndDispatchAlerts()` only reacts to
  overall *status-transitions* (via the escalation map), not threshold
  crossings.
- **SMS channel has no dispatcher.** `smsEnabled`/`smsNumber` exist in the
  schema/UI but no send path is implemented.
- **Weekly/monthly reports are projections, not real aggregates.** No
  historical time-series table exists yet — `lib/reports.ts` deterministically
  derives weekly/monthly figures from the current snapshot via a seeded PRNG.
  A true implementation would aggregate `CheckLog` over the period.
- **CDN/WAF block-page signatures are limited to Cloudflare and CloudFront.**
  Other WAFs (Akamai, Sucuri, AWS WAF, etc.) currently fall through to `down`
  rather than `blocked`. Extendable via `CDN_BLOCK_SIGNATURES` in
  `checker-node/src/checker.js` (and the mirrored copy in
  `app/api/domains/[id]/live-check/route.ts`).
- **Globalping status mapping is coarser than the self-hosted checker's.**
  `scripts/globalping-checker.ts` classifies purely by HTTP status code (`403`
  → `blocked`, else `up`/`down`) and has no CDN/WAF block-page-body detection,
  unlike `checker-node/src/checker.js` and the live-check route's mirrored
  `CDN_BLOCK_SIGNATURES`. A WAF that challenges with a `200`/`503` block page
  rather than a bare `403` will be misclassified as `up`/`down` instead of
  `blocked` when using the Globalping checker.

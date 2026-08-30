import { config, validateConfig } from "./config.js";
import { runCheckCycle } from "./runner.js";

validateConfig();

/**
 * Runs one check cycle, then schedules the next one. The interval comes from
 * the main server's Monitoring Defaults (re-fetched every cycle), so changing
 * it on the dashboard reschedules every node within one cycle — no restart
 * needed. Falls back to this node's CHECK_INTERVAL_MINUTES env var if the
 * server is unreachable or doesn't report one.
 */
async function tick() {
  const startedAt = Date.now();
  console.log(`[${new Date().toISOString()}] [${config.nodeName}] Starting check cycle (${config.region}/${config.location})`);

  let nextIntervalMinutes = config.checkIntervalMinutes;

  try {
    const { results, checkIntervalMinutes } = await runCheckCycle();
    if (checkIntervalMinutes) nextIntervalMinutes = checkIntervalMinutes;

    const up = results.filter((r) => r.status === "up").length;
    const down = results.length - up;
    console.log(
      `[${new Date().toISOString()}] [${config.nodeName}] Done in ${Date.now() - startedAt}ms — ${up} up, ${down} down. Next check in ${nextIntervalMinutes}m.`
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [${config.nodeName}] Check cycle failed:`, err.message);
  }

  setTimeout(tick, nextIntervalMinutes * 60 * 1000);
}

// Spread checker starts across a random window so all nodes on the same VPS
// don't fire simultaneously after a pm2 restart.
const jitterMs = Math.floor(Math.random() * 5 * 60 * 1000); // 0–5 minutes
console.log(
  `[${new Date().toISOString()}] [${config.nodeName}] Startup jitter: ${Math.round(jitterMs / 1000)}s before first cycle`
);
setTimeout(tick, jitterMs);

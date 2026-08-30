import { config } from "./config.js";
import { fetchDomains, submitResults } from "./api.js";
import { checkDomain } from "./checker.js";

/**
 * Runs one full check cycle: fetch domains, check in batches, submit results.
 * Returns the results plus the server's current check interval (minutes), so
 * the caller can self-adjust its polling cadence without a restart.
 */
export async function runCheckCycle() {
  const { domains, checkIntervalMinutes } = await fetchDomains();
  const results = [];

  for (let i = 0; i < domains.length; i += config.batchSize) {
    const batch = domains.slice(i, i + config.batchSize);
    const batchResults = await Promise.all(batch.map(checkDomain));
    results.push(...batchResults);
  }

  if (results.length > 0) {
    await submitResults(results);
  }

  return { results, checkIntervalMinutes };
}

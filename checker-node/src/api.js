import { config } from "./config.js";

/**
 * Fetches the list of active domains to check, along with the current
 * check interval (minutes) from Monitoring Defaults.
 */
export async function fetchDomains() {
  const marketParam = config.targetMarket ? `?market=${encodeURIComponent(config.targetMarket)}` : "";
  const response = await fetch(`${config.mainServerUrl}/api/checker/domains${marketParam}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch domains: HTTP ${response.status}`);
  }

  const data = await response.json();
  return { domains: data.domains ?? [], checkIntervalMinutes: data.checkIntervalMinutes };
}

/** Submits a batch of check results for this node's region/location to the main server. */
export async function submitResults(results) {
  const response = await fetch(`${config.mainServerUrl}/api/checker/results`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nodeName: config.nodeName,
      region: config.region,
      location: config.location,
      results,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit results: HTTP ${response.status}`);
  }

  return response.json();
}

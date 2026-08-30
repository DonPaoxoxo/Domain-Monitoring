const GLOBALPING_API = "https://api.globalping.io/v1/measurements";

export interface GlobpingProbeResult {
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  redirectUrl: string | null;
}

interface GlobpingMeasurement {
  status: string;
  results: Array<{
    probe: { city?: string };
    result: {
      statusCode?: number;
      timings?: { total?: number };
      headers?: Record<string, string>;
      rawHeaders?: string;
      error?: string | null;
    };
  }>;
}

function authHeaders(apiKey?: string): Record<string, string> {
  const key = apiKey ?? process.env.GLOBALPING_API_KEY;
  return {
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

export async function createMeasurement(
  target: string,
  locationMagics: string[],
  apiKey?: string
): Promise<string> {
  const response = await fetch(GLOBALPING_API, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      type: "http",
      target,
      locations: locationMagics.map((magic) => ({ magic, limit: 1 })),
      measurementOptions: { request: { method: "GET" } },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Globalping create error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data.id as string;
}

export async function pollMeasurement(id: string, apiKey?: string): Promise<GlobpingMeasurement> {
  const url = `${GLOBALPING_API}/${id}`;
  for (let i = 0; i < 30; i++) {
    const response = await fetch(url, { headers: authHeaders(apiKey) });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Globalping poll error ${response.status}: ${text}`);
    }
    const data: GlobpingMeasurement = await response.json();
    if (data.status === "finished") return data;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Measurement ${id} did not finish within 60 seconds`);
}

export function parseProbeResult(
  result: GlobpingMeasurement["results"][number]["result"]
): GlobpingProbeResult {
  const statusCode = typeof result.statusCode === "number" ? result.statusCode : null;
  const responseTimeMs =
    typeof result.timings?.total === "number" ? Math.round(result.timings.total) : null;

  let redirectUrl: string | null = null;
  if (statusCode !== null && statusCode >= 300 && statusCode < 400) {
    redirectUrl =
      result.headers?.location ??
      result.headers?.Location ??
      null;
  }

  const errorMessage = result.error ? String(result.error) : null;
  return { statusCode, responseTimeMs, errorMessage, redirectUrl };
}

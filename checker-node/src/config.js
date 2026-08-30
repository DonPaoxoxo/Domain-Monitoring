import "dotenv/config";

const REQUIRED_VARS = ["MAIN_SERVER_URL", "CHECKER_API_KEY", "NODE_NAME", "REGION_NAME", "LOCATION_NAME"];

export function validateConfig() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export const config = {
  mainServerUrl: (process.env.MAIN_SERVER_URL ?? "").replace(/\/+$/, ""),
  apiKey: process.env.CHECKER_API_KEY ?? "",
  nodeName: process.env.NODE_NAME ?? "",
  region: process.env.REGION_NAME ?? "",
  location: process.env.LOCATION_NAME ?? "",
  targetMarket: process.env.TARGET_MARKET || null,
  checkIntervalMinutes: Number(process.env.CHECK_INTERVAL_MINUTES) || 60,
  batchSize: Number(process.env.BATCH_SIZE) || 5,
  timeoutMs: 10_000,
};

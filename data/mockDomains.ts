import type { RegionKey } from "@/types/monitor";

/** Must match the `location` values submitted by `scripts/globalping-checker.ts` exactly — see the note on {@link CHECKPOINTS} in `data/checkpoints.ts`. */
export const REGION_LOCATIONS: Record<RegionKey, string[]> = {
  india: [
    "Delhi",
    "Mumbai",
    "Bengaluru",
    "Chennai",
    "Kolkata",
    "Ahmedabad",
    "Lucknow",
    "Kanpur",
    "Nagpur",
    "Patna",
  ],
  indonesia: ["Jakarta", "Denpasar", "Bandung", "Medan", "Surabaya"],
};

export const REGION_LABELS: Record<RegionKey, string> = {
  india: "India",
  indonesia: "Indonesia",
};

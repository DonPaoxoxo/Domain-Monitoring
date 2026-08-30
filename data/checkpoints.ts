import type { RegionKey } from "@/types/monitor";

export interface Checkpoint {
  name: string;
  regionKey: RegionKey;
  /** Approximate city-center coordinates, used to position the location on the live checkpoint map. */
  lat: number;
  lng: number;
}

/**
 * Geographic coordinates for every checker location in {@link REGION_LOCATIONS}.
 * Names must match `location` exactly as submitted by the checker
 * (see the `magic`/`location` pairs in `scripts/globalping-checker.ts`) —
 * this list drives both the per-domain region breakdown (`lib/domains.ts`)
 * and the live checkpoint map (`lib/checkpoints.ts`), both of which match
 * on this exact string.
 */
export const CHECKPOINTS: Checkpoint[] = [
  { name: "Delhi", regionKey: "india", lat: 28.6139, lng: 77.209 },
  { name: "Mumbai", regionKey: "india", lat: 19.076, lng: 72.8777 },
  { name: "Bengaluru", regionKey: "india", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", regionKey: "india", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", regionKey: "india", lat: 22.5726, lng: 88.3639 },
  { name: "Ahmedabad", regionKey: "india", lat: 23.0225, lng: 72.5714 },
  { name: "Lucknow", regionKey: "india", lat: 26.8467, lng: 80.9462 },
  { name: "Kanpur", regionKey: "india", lat: 26.4499, lng: 80.3319 },
  { name: "Nagpur", regionKey: "india", lat: 21.1458, lng: 79.0882 },
  { name: "Patna", regionKey: "india", lat: 25.5941, lng: 85.1376 },
  { name: "Jakarta", regionKey: "indonesia", lat: -6.2088, lng: 106.8456 },
  { name: "Denpasar", regionKey: "indonesia", lat: -8.6705, lng: 115.2126 },
  { name: "Bandung", regionKey: "indonesia", lat: -6.9175, lng: 107.6191 },
  { name: "Medan", regionKey: "indonesia", lat: 3.5952, lng: 98.6722 },
  { name: "Surabaya", regionKey: "indonesia", lat: -7.2575, lng: 112.7521 },
];

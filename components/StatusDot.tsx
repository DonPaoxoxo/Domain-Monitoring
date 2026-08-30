import type { OverallStatus } from "@/types/monitor";

interface StatusDotProps {
  status: OverallStatus;
  className?: string;
}

/** Small status indicator dot. Healthy/Critical pulse softly; warning states stay solid (no flicker). */
export default function StatusDot({ status, className = "" }: StatusDotProps) {
  if (status === "Healthy") {
    return (
      <span className={`relative flex h-2.5 w-2.5 ${className}`}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60"></span>
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
      </span>
    );
  }

  if (status === "Critical") {
    return (
      <span className={`relative flex h-2.5 w-2.5 ${className}`}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600"></span>
      </span>
    );
  }

  return <span className={`inline-flex h-2.5 w-2.5 rounded-full bg-yellow-500 ${className}`}></span>;
}

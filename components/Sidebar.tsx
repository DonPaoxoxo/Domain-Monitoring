"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe2,
  MapPinned,
  Route,
  AlertCircle,
  FileBarChart,
  History,
  UploadCloud,
  BellRing,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { CheckerFleetSummary } from "@/lib/checkerNodes";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Monitoring",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Domains", href: "/domains", icon: Globe2 },
      { label: "Redirect Map", href: "/redirect-map", icon: Route },
      { label: "Region Checks", href: "/region-checks", icon: MapPinned },
      { label: "Incidents", href: "/incidents", icon: AlertCircle },
      { label: "Reports", href: "/reports", icon: FileBarChart },
      { label: "Check History", href: "/check-history", icon: History },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Bulk Import", href: "/bulk-import", icon: UploadCloud },
      { label: "Alert Settings", href: "/alert-settings", icon: BellRing },
      { label: "System Settings", href: "/system-settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  fleetStatus: CheckerFleetSummary;
  onNavigate?: () => void;
}

export default function Sidebar({ fleetStatus, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col bg-[#263238] text-[#cfd8dc]">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <Image src="/logo.png" alt="Mi-hawk" width={32} height={32} className="h-8 w-8 rounded-md" />
        <div>
          <p className="text-sm font-semibold leading-tight text-white">Mi-hawk</p>
          <p className="text-[11px] text-[#78909c]">Regional Monitor</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1 px-2">
            <p className="px-2.5 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-[#607d8b] uppercase">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`group flex items-center gap-2.5 border-l-2 px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                        active
                          ? "border-[#20a8d8] bg-[#20a8d8]/10 text-white"
                          : "border-transparent text-[#90a4ae] hover:border-[#344955] hover:bg-[#344955] hover:text-white"
                      }`}
                    >
                      <item.icon
                        size={15}
                        className={active ? "text-[#20a8d8]" : "text-[#78909c] group-hover:text-[#cfd8dc]"}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#90a4ae]">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${fleetStatus.dotClassName}`} />
          {fleetStatus.label}
        </div>
        <p className="text-[11px] leading-snug text-[#607d8b]">
          See where your domains are visible — and where they&apos;re not.
        </p>
      </div>
    </aside>
  );
}

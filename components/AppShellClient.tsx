"use client";

import { useEffect, useState } from "react";
import type { CheckerFleetSummary } from "@/lib/checkerNodes";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

interface AppShellClientProps {
  title: string;
  subtitle: string;
  username: string;
  fleetStatus: CheckerFleetSummary;
  children: React.ReactNode;
}

export default function AppShellClient({ title, subtitle, username, fleetStatus, children }: AppShellClientProps) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;

    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      {navOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-56 lg:shrink-0 lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar fleetStatus={fleetStatus} onNavigate={() => setNavOpen(false)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader title={title} subtitle={subtitle} username={username} onMenuClick={() => setNavOpen(true)} />
        <main className="relative isolate flex-1 space-y-4 p-4">{children}</main>
      </div>
    </div>
  );
}

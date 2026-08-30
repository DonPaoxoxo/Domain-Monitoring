"use client";

import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border/40"
    >
      <Sun size={13} className="hidden dark:block" />
      <Moon size={13} className="dark:hidden" />
    </button>
  );
}

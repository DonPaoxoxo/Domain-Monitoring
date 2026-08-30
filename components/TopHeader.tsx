"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, RefreshCw } from "lucide-react";
import { logout } from "@/app/login/actions";
import HeaderClocks from "./HeaderClocks";
import ThemeToggle from "./ThemeToggle";

interface TopHeaderProps {
  title: string;
  subtitle: string;
  username: string;
  onMenuClick: () => void;
}

export default function TopHeader({ title, subtitle, username, onMenuClick }: TopHeaderProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <header className="flex flex-col gap-2 border-b border-border bg-surface px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="-ml-1.5 flex shrink-0 items-center justify-center rounded-md p-1.5 text-foreground transition-colors hover:bg-surface-muted lg:hidden"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto lg:shrink-0">
        <HeaderClocks />
        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border/40 disabled:opacity-60"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#20a8d8] text-[11px] font-semibold text-white">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-foreground">{username}</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border/40"
          >
            <LogOut size={13} />
          </button>
        </form>
      </div>
    </header>
  );
}

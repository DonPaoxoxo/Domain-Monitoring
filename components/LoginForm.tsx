"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      action={formAction}
      className="relative space-y-5 overflow-hidden rounded-xl border border-border bg-surface p-7 shadow-xl shadow-black/[0.04]"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#20a8d8] to-[#5cb85c]" />

      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6fb] px-2.5 py-1 text-[11px] font-medium text-[#20a8d8]">
          <ShieldCheck size={12} />
          Secure Admin Access
        </span>
        <h2 className="mt-3 text-lg font-semibold text-foreground">Welcome back</h2>
        <p className="mt-1 text-xs text-muted">Sign in to access the regional monitor.</p>
      </div>

      <div>
        <label htmlFor="username" className="text-[11px] font-semibold tracking-wide text-muted uppercase">
          Username
        </label>
        <div className="relative mt-2">
          <User size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            autoFocus
            placeholder="admin"
            className="w-full rounded-md border border-border bg-surface-muted py-2 pr-3 pl-9 text-[13px] text-foreground transition-colors focus:border-[#20a8d8] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[#20a8d8]/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="text-[11px] font-semibold tracking-wide text-muted uppercase">
          Password
        </label>
        <div className="relative mt-2">
          <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-md border border-border bg-surface-muted py-2 pr-9 pl-9 text-[13px] text-foreground transition-colors focus:border-[#20a8d8] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[#20a8d8]/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-md border border-[#f5c6cb] bg-[#fbeaea] px-3 py-2 text-xs font-medium text-[#d9534f]">
          <AlertCircle size={14} className="shrink-0" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#20a8d8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#20a8d8]/25 transition-all hover:bg-[#1c93bd] hover:shadow-lg hover:shadow-[#20a8d8]/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <Loader2 size={15} className="animate-spin" />}
        {pending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

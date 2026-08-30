"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2, SlidersHorizontal, PauseCircle, PlayCircle, Trash2 } from "lucide-react";

interface ManageMenuProps {
  paused: boolean;
  onManage: () => void;
  onTogglePause: () => void;
  onRemove: () => void;
}

const MENU_WIDTH = 176;

export default function ManageMenu({ paused, onManage, onTogglePause, onRemove }: ManageMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleDismiss = () => setOpen(false);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.right - MENU_WIDTH });
    }
    setOpen((value) => !value);
  };

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-[#20a8d8] hover:bg-[#eaf6fb] hover:text-[#20a8d8] dark:hover:bg-[#20a8d8]/10"
      >
        <Settings2 size={12} />
        Manage
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-44 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md"
          >
            <button
              type="button"
              onClick={() => runAction(onManage)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-surface-muted"
            >
              <SlidersHorizontal size={14} className="text-muted" />
              Manage details
            </button>
            <button
              type="button"
              onClick={() => runAction(onTogglePause)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-surface-muted"
            >
              {paused ? (
                <PlayCircle size={14} className="text-muted" />
              ) : (
                <PauseCircle size={14} className="text-muted" />
              )}
              {paused ? "Resume monitoring" : "Pause monitoring"}
            </button>
            <button
              type="button"
              onClick={() => runAction(onRemove)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#d9534f] transition-colors hover:bg-[#fbeaea] dark:hover:bg-[#3a2020]"
            >
              <Trash2 size={14} />
              Remove domain
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

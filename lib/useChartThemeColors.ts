"use client";

import { useEffect, useState } from "react";

export interface ThemeColors {
  foreground: string;
  muted: string;
  border: string;
  surface: string;
}

export const DEFAULT_CHART_COLORS: ThemeColors = {
  foreground: "#333333",
  muted: "#8a96a3",
  border: "#e5e9f0",
  surface: "#ffffff",
};

/** Reads the active CSS theme tokens so charts can re-color themselves on dark-mode toggle. */
export function useChartThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_CHART_COLORS);

  useEffect(() => {
    const readColors = () => {
      const styles = getComputedStyle(document.documentElement);
      setColors({
        foreground: styles.getPropertyValue("--foreground").trim() || DEFAULT_CHART_COLORS.foreground,
        muted: styles.getPropertyValue("--muted").trim() || DEFAULT_CHART_COLORS.muted,
        border: styles.getPropertyValue("--border").trim() || DEFAULT_CHART_COLORS.border,
        surface: styles.getPropertyValue("--surface").trim() || DEFAULT_CHART_COLORS.surface,
      });
    };

    readColors();

    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}

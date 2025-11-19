"use client";

import { useEffect, useState } from "react";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import type { ToasterProps } from "sonner";

/* eslint-disable no-console */
console.log("[sonner.tsx] Module loaded");
console.log("[sonner.tsx] typeof window:", typeof window);
console.log("[sonner.tsx] typeof global:", typeof global);

try {
  console.log("[sonner.tsx] About to import lucide-react icons");
  console.log("[sonner.tsx] CircleCheckIcon:", typeof CircleCheckIcon);
} catch (error) {
  console.error("[sonner.tsx] Error importing icons:", error);
  throw error;
}

const Toaster = ({ ...props }: ToasterProps) => {
  console.log("[sonner.tsx] Toaster component rendering");
  console.log("[sonner.tsx] typeof window:", typeof window);

  const [Sonner, setSonner] = useState<typeof import("sonner").Toaster | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("[sonner.tsx] useEffect running");
    console.log("[sonner.tsx] typeof window:", typeof window);

    // Only load sonner in browser
    if (typeof window !== "undefined") {
      console.log("[sonner.tsx] Loading sonner library");
      setMounted(true);
      import("sonner")
        .then((module) => {
          console.log("[sonner.tsx] Sonner library loaded successfully");
          setSonner(() => module.Toaster);
        })
        .catch((error) => {
          console.error("[sonner.tsx] Error loading sonner library:", error);
        });
    } else {
      console.log("[sonner.tsx] Skipping sonner load (not browser)");
    }
  }, []);

  if (!mounted || !Sonner) {
    return null;
  }

  return (
    <Sonner
      theme="system"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};
/* eslint-enable no-console */

export { Toaster };

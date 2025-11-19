"use client";

import { useEffect, useState } from "react";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";

// Wrapper component that only loads Toaster on the client side
// This prevents any SSR evaluation of the sonner library
export default function ToasterWrapper() {
  const [ToasterComponent, setToasterComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only load in browser environment
    if (typeof window === "undefined") {
      return;
    }

    setMounted(true);

    // Dynamically import sonner library directly (not the wrapper component)
    import("sonner")
      .then((module) => {
        setToasterComponent(() => module.Toaster);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[ToasterWrapper] Error loading sonner library:", error);
      });
  }, []);

  if (!mounted || !ToasterComponent) {
    return null;
  }

  return (
    <ToasterComponent
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
    />
  );
}

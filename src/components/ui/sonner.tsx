"use client";

import { useEffect, useState } from "react";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const [Sonner, setSonner] = useState<typeof import("sonner").Toaster | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only load sonner in browser
    if (typeof window !== "undefined") {
      setMounted(true);
      import("sonner")
        .then((module) => {
          setSonner(() => module.Toaster);
        })
        .catch((error) => {
          console.error("[sonner.tsx] Error loading sonner library:", error);
        });
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

export { Toaster };

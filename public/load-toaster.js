/* eslint-env browser */
/* eslint-disable no-undef, no-console */
// Load Toaster directly without ToasterWrapper to prevent SSR evaluation
// This script is served as a static file and never processed by Astro SSR
(function () {
  if (typeof window === "undefined") return;

  function loadToaster() {
    // Wait for React to be available from other components
    const checkReact = setInterval(() => {
      // Check if React is loaded by looking for React components on the page
      const rootElement = document.getElementById("root");
      if (!rootElement) {
        return;
      }

      clearInterval(checkReact);

      // Dynamically import sonner and React - this only runs in browser
      Promise.all([import("sonner"), import("react"), import("react-dom/client"), import("lucide-react")])
        .then(([sonnerModule, React, ReactDOM, lucide]) => {
          const container = document.createElement("div");
          container.id = "toaster-container";
          document.body.appendChild(container);

          const Toaster = sonnerModule.Toaster;
          const root = ReactDOM.createRoot(container);

          root.render(
            React.createElement(Toaster, {
              theme: "system",
              className: "toaster group",
              icons: {
                success: React.createElement(lucide.CircleCheckIcon, { className: "size-4" }),
                info: React.createElement(lucide.InfoIcon, { className: "size-4" }),
                warning: React.createElement(lucide.TriangleAlertIcon, { className: "size-4" }),
                error: React.createElement(lucide.OctagonXIcon, { className: "size-4" }),
                loading: React.createElement(lucide.Loader2Icon, { className: "size-4 animate-spin" }),
              },
              style: {
                "--normal-bg": "var(--popover)",
                "--normal-text": "var(--popover-foreground)",
                "--normal-border": "var(--border)",
                "--border-radius": "var(--radius)",
              },
            })
          );
        })
        .catch((err) => {
          console.debug("Toaster not loaded:", err);
        });
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkReact), 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadToaster);
  } else {
    loadToaster();
  }
})();

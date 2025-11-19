import { useEffect } from "react";

export default function LogoutHandler() {
  useEffect(() => {
    const form = document.getElementById("logout-form") as HTMLFormElement;
    if (form) {
      const handleSubmit = async (e: Event) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Signing out...";

        try {
          const response = await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          const data = await response.json();

          if (response.ok && data.success) {
            window.location.href = "/";
          } else {
            alert("Sign out failed: " + (data.error || "Please try again."));
            btn.disabled = false;
            btn.textContent = orig;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Logout error:", error);
          alert("Sign out failed: Network error. Please try again.");
          btn.disabled = false;
          btn.textContent = orig;
        }
      };

      form.addEventListener("submit", handleSubmit);

      return () => {
        form.removeEventListener("submit", handleSubmit);
      };
    }
  }, []);

  return null;
}

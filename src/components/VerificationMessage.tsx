import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Mail, RefreshCw } from "lucide-react";

interface VerificationMessageProps {
  onResendVerification?: () => Promise<void>;
  isResending?: boolean;
}

export default function VerificationMessage({ onResendVerification, isResending = false }: VerificationMessageProps) {
  const [resendMessage, setResendMessage] = useState("");
  const [toast, setToast] = useState<typeof import("sonner").toast | null>(null);

  // Dynamically import toast only on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("sonner").then((module) => {
        setToast(() => module.toast);
      });
    }
  }, []);

  const handleResendVerification = async () => {
    if (!onResendVerification) return;

    try {
      await onResendVerification();
      if (toast) {
        toast.success("Verification link sent successfully.");
      }
      setResendMessage("Verification link sent successfully.");
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      if (toast) {
        toast.error("Error sending verification link. Please try again.");
      }
      setResendMessage("Error sending verification link. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 p-3">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Check Your Email</h1>
        <p className="text-muted-foreground">Check your email to verify your address.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            We&apos;re sending a verification link to your email address. Click the link to activate your account and be
            able to sign in.
          </p>
        </div>

        {onResendVerification && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Didn&apos;t receive the message?</p>
            <Button variant="outline" onClick={handleResendVerification} disabled={isResending} className="w-full">
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend
                </>
              )}
            </Button>
          </div>
        )}

        {resendMessage && (
          <p
            className={`text-sm ${resendMessage.includes("error") || resendMessage.includes("Error") ? "text-destructive" : "text-green-600"}`}
          >
            {resendMessage}
          </p>
        )}

        <div className="pt-4">
          <a
            href="/login"
            className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

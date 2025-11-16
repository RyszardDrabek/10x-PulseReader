import { useState, FormEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

type AuthMode = "register" | "login" | "forgot-password";

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (data: { email: string; password?: string }) => Promise<void>;
  isLoading?: boolean;
}

export default function AuthForm({ mode, onSubmit, isLoading = false }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const getTitle = () => {
    switch (mode) {
      case "register":
        return "Sign Up";
      case "login":
        return "Sign In";
      case "forgot-password":
        return "Reset Password";
      default:
        return "";
    }
  };

  const getSubmitButtonText = () => {
    switch (mode) {
      case "register":
        return "Sign Up";
      case "login":
        return "Sign In";
      case "forgot-password":
        return "Send Reset Link";
      default:
        return "";
    }
  };

  const getAlternativeLink = () => {
    switch (mode) {
      case "register":
        return { text: "Already have an account? Sign In", href: "/login" };
      case "login":
        return { text: "Don't have an account? Sign Up", href: "/register" };
      case "forgot-password":
        return { text: "Back to Sign In", href: "/login" };
      default:
        return null;
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (mode !== "forgot-password") {
      if (!password || password.length < 8) {
        toast.error(
          "Password must be at least 8 characters long and contain uppercase, lowercase letters and a number."
        );
        return false;
      }

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        toast.error(
          "Password must be at least 8 characters long and contain uppercase, lowercase letters and a number."
        );
        return false;
      }

      if (mode === "register" && password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit({ email: email.trim(), password });
    } catch {
      // Error handling will be done in the parent component
    }
  };

  const alternativeLink = getAlternativeLink();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{getTitle()}</h1>
        <p className="text-muted-foreground">
          {mode === "forgot-password"
            ? "Enter your email address to receive a password reset link."
            : mode === "register"
              ? "Create an account to access personalized content."
              : "Sign in to your account."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            aria-describedby="email-error"
          />
        </div>

        {mode !== "forgot-password" && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              aria-describedby="password-error"
            />
          </div>
        )}

        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              aria-describedby="confirm-password-error"
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : getSubmitButtonText()}
        </Button>
      </form>

      {alternativeLink && (
        <div className="text-center">
          <a
            href={alternativeLink.href}
            className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
          >
            {alternativeLink.text}
          </a>
        </div>
      )}
    </div>
  );
}

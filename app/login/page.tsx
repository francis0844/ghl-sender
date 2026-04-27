"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password. Please try again.");
        setIsLoading(false);
      }
    } catch {
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* App identity */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-16 w-16 rounded-2xl bg-foreground flex items-center justify-center mb-5 shadow-sm">
            <Lock size={26} aria-hidden className="text-background" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            GHL Sender
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 text-center">
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Password field */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              // 16px prevents iOS auto-zoom
              style={{ fontSize: "16px" }}
              className={cn(
                "w-full h-12 px-4 pr-12 rounded-xl border bg-card",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                error ? "border-red-400" : "border-input"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-muted-foreground active:text-foreground"
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden />
              ) : (
                <Eye size={16} aria-hidden />
              )}
            </button>
          </div>

          {/* Inline error */}
          {error && (
            <p role="alert" className="text-sm text-red-500 text-center -mt-1">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className={cn(
              "w-full min-h-[56px] rounded-2xl text-base font-semibold",
              "flex items-center justify-center gap-2 transition-colors",
              isLoading || !password.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-background active:opacity-80"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} aria-hidden className="animate-spin" />
                Unlocking…
              </>
            ) : (
              "Unlock"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

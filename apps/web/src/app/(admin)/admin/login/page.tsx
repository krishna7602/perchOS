"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Coffee, Mail, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await loginAdmin(email, password);
      localStorage.setItem("perch_admin_token", data.token);
      localStorage.setItem("perch_admin_name", data.name);
      router.push("/admin/dashboard");
    } catch {
      setError("Invalid email or password.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="w-full max-w-sm animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg"
            alt="Perch Logo"
          />
          <h1
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Perch Admin
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Sign in to manage your venues
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleLogin}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              Cafe ID or Admin Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-muted)" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., starbucks@perch.store"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--color-bg)",
                  border: "1.5px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-muted)" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--color-bg)",
                  border: "1.5px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}

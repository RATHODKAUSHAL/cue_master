"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveAdminToken } from "@/lib/admin/client";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to login.");
      saveAdminToken(data.token);
      router.replace("/v1/admin/home");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Email address
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          placeholder="admin@cuedesk.com"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          placeholder="Enter admin password"
          required
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <Button className="h-12 rounded-xl text-sm" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in to Admin"}
      </Button>
    </form>
  );
}

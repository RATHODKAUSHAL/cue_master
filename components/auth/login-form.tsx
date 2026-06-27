"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveUserSession } from "@/lib/auth/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const registered = searchParams.get("registered") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to login.");
        return;
      }

      if (typeof data.token === "string") {
        saveUserSession(data.token);
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Unable to login right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
      <Link href="/" className="text-sm font-semibold text-zinc-500 hover:text-zinc-950">
        Back to home
      </Link>
      <div className="mt-8">
        <p className="section-kicker">CueDesk CRM</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">Login</h1>
        <p className="mt-3 leading-7 text-zinc-600">
          Login with your owner account to open the dashboard.
        </p>
      </div>

      {registered ? (
        <div className="mt-5 rounded-md border border-[#3195EF]/30 bg-[#3195EF]/10 px-4 py-3 text-sm font-medium text-[#126ec1]">
          Registration completed. Login with your email and password.
        </div>
      ) : null}

      <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@example.com"
            className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition focus:border-zinc-950"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition focus:border-zinc-950"
            required
          />
        </label>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <Button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[#3195EF]">
          Register
        </Link>
      </p>
    </section>
  );
}

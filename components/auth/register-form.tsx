"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to register.");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Unable to register right now.");
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
        <p className="section-kicker">Free tier registration</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">Create your account</h1>
        <p className="mt-3 leading-7 text-zinc-600">
          Add your details to create an owner account for CueDesk CRM.
        </p>
      </div>

      <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Arjun Patel"
            className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition focus:border-zinc-950"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="owner@example.com"
            className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition focus:border-zinc-950"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Mobile Number
          <input
            type="tel"
            value={form.mobileNumber}
            onChange={(event) => updateField("mobileNumber", event.target.value)}
            placeholder="9876543210"
            className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition focus:border-zinc-950"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Minimum 8 characters"
            className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition focus:border-zinc-950"
            required
          />
        </label>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <Button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#3195EF]">
          Login
        </Link>
      </p>
    </section>
  );
}

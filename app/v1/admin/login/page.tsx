import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getCurrentAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Admin Login | CueDesk CRM" };

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect("/v1/admin/home");
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-12 text-white lg:block">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">CueDesk CRM</p>
          <h1 className="mt-8 max-w-md text-5xl font-bold leading-tight tracking-tight">One secure console for the entire platform.</h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-blue-100">Monitor users, customers, games, revenue activity, and account health from a dedicated administration workspace.</p>
        </section>
        <section className="p-7 sm:p-12">
          <div className="mb-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-sm font-bold text-white">CA</span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight">Admin sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use a seeded administrator account. Registration is disabled.</p>
          </div>
          <AdminLoginForm />
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { userFetch } from "@/lib/auth/client";

type AddOnAmount = {
  id: string;
  amount: number;
  createdAt: string;
};

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AddOnManager() {
  const [addOns, setAddOns] = useState<AddOnAmount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadAddOns(showLoading = true) {
    if (showLoading) setLoading(true);
    setLoadError("");

    try {
      const response = await userFetch("/api/add-ons", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load add-on amounts.");
      }

      setAddOns(data.addOns || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load add-on amounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    userFetch("/api/add-ons", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Unable to load add-on amounts.");
        }

        return data;
      })
      .then((data) => {
        if (active) setAddOns(data.addOns || []);
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setAmount("");
    setFormError("");
    setOpen(true);
  }

  async function createAddOn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const response = await userFetch("/api/add-ons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to create add-on amount.");
      }

      setOpen(false);
      await loadAddOns(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create add-on amount.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="-m-4 min-h-[calc(100vh-4rem)] rounded-[1.5rem] border border-brand-green bg-white p-4 pb-24 text-zinc-800 shadow-xs sm:-m-6 sm:p-6 sm:pb-28 lg:m-0 lg:min-h-[calc(100vh-8rem)] lg:p-6">
        <div className="rounded-[1.35rem] border border-[#337418]/15 bg-[#f4ebe1]/30 p-4 shadow-sm sm:rounded-[1.75rem] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#337418] sm:text-xs">
                Add-on setup
              </p>
              <h1 className="mt-2 text-xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
                Add-on Amounts
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium leading-5 text-zinc-500 sm:text-base">
                Create quick amounts that can be added to a session bill.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="h-11 rounded-[1.1rem] bg-[#337418] px-5 text-sm font-extrabold text-[#F8F8F8] shadow-sm hover:bg-[#337418] sm:h-12"
            >
              <Plus aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              Create Add-on amount
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
              ))}
            </div>
          ) : loadError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              {loadError}
            </p>
          ) : addOns.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {addOns.map((addOn) => (
                <div
                  key={addOn.id}
                  className="rounded-2xl border border-[#337418]/20 bg-[#337418]/10 p-4 text-center text-[#337418] shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70">Amount</p>
                  <p className="mt-2 text-xl font-extrabold">{money(addOn.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
              <p className="text-base font-bold text-zinc-800">No add-on amount created.</p>
              <Button onClick={openCreate} className="mt-5 bg-[#337418] text-white hover:bg-[#337418]">
                <Plus aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
                Create Add-on amount
              </Button>
            </div>
          )}
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 grid items-end bg-zinc-950/60 px-0 backdrop-blur-sm sm:place-items-center sm:px-4">
          <div className="max-h-[92dvh] w-full overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#F8F8F8] shadow-2xl sm:max-w-md sm:rounded-[1.5rem]">
            <div className="flex items-start justify-between bg-[#202020] p-5 text-white">
              <div>
                <h2 className="text-lg font-extrabold">Create Add-on amount</h2>
                <p className="mt-1 text-sm text-white/55">Enter a quick amount like 5, 10, or 15.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close add-on form"
                className="rounded-xl text-white hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={createAddOn}>
              <label className="grid gap-2 text-sm font-bold text-[#202020]">
                Add-on Amount
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15"
                  placeholder="10"
                  required
                />
              </label>

              {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button className="h-11 rounded-xl bg-[#337418] text-[#F8F8F8] hover:bg-[#337418]" type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

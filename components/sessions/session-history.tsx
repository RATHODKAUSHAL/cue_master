"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { userFetch } from "@/lib/auth/client";

type HistorySession = {
  id: string;
  pricingMode: "PER_HOUR" | "PER_GAME";
  gameCount: number;
  plannedDurationMinutes: number;
  finalAmount: number | null;
  ownerPlaying: boolean;
  ownerResult: "OWNER_WON" | "OWNER_LOST" | null;
  startedAt: string;
  finalizedAt: string | null;
  table: { name: string };
  primaryCustomer: { name: string; mobileNumber: string };
  payments: Array<{
    id: string;
    mode: "CASH" | "UPI" | "WALLET" | "PENDING";
    amount: number;
    customer: { name: string; mobileNumber: string };
  }>;
};

const fieldClass =
  "h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#337418] focus:ring-2 focus:ring-[#337418]/15";

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory(filters?: { name: string; mobile: string; date: string }) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      const values = filters || { name, mobile, date };
      if (values.name.trim()) params.set("name", values.name.trim());
      if (values.mobile.trim()) params.set("mobile", values.mobile.replace(/\D/g, ""));
      if (values.date) params.set("date", values.date);

      const response = await userFetch(`/api/sessions/history?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load session history.");
      setSessions(data.sessions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load session history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    userFetch("/api/sessions/history", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load session history.");
        return data;
      })
      .then((data) => {
        if (active) setSessions(data.sessions);
      })
      .catch((loadError: Error) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function searchHistory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadHistory();
  }

  function clearFilters() {
    setName("");
    setMobile("");
    setDate("");
    void loadHistory({ name: "", mobile: "", date: "" });
  }

  return (
    <section className="-m-4 min-h-[calc(100vh-4rem)] rounded-[1.5rem] border border-brand-green bg-white p-4 pb-24 text-zinc-800 shadow-xs sm:-m-6 sm:p-6 sm:pb-28 lg:m-0 lg:min-h-[calc(100vh-8rem)] lg:p-6">
      <div className="rounded-[1.35rem] border border-[#337418]/15 bg-[#f4ebe1]/30 p-4 shadow-sm sm:rounded-[1.75rem] sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#337418] sm:text-xs">History</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-normal text-zinc-950">Session History</h1>
        <p className="mt-2 text-sm font-medium text-zinc-500">
          Completed sessions are stored here with bill and payment details.
        </p>

        <form
          className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_200px_auto_auto]"
          onSubmit={searchHistory}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
            placeholder="Customer name"
            aria-label="Search history by customer name"
          />
          <input
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            className={fieldClass}
            placeholder="Mobile number"
            inputMode="numeric"
            aria-label="Search history by mobile number"
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={fieldClass}
            aria-label="Search history by date"
          />
          <Button type="submit" className="bg-[#337418] text-[#F8F8F8] hover:bg-[#337418]">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#337418]/20 bg-white text-[#337418] hover:bg-[#337418]/10 hover:text-[#337418]"
            onClick={clearFilters}
          >
            Clear
          </Button>
        </form>
      </div>

      <div className="mt-4 grid gap-3">
        {loading ? (
          <div className="rounded-2xl border border-[#337418]/15 bg-white p-8 text-center text-sm font-semibold text-zinc-500 shadow-sm">
            Loading session history...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : sessions.length ? (
          sessions.map((session) => {
            const gamesOrTime =
              session.pricingMode === "PER_GAME"
                ? `${session.gameCount} game${session.gameCount === 1 ? "" : "s"}`
                : `${Math.floor(session.plannedDurationMinutes / 60)}h ${
                    session.plannedDurationMinutes % 60
                  }m`;
            const payment = session.payments.length
              ? session.payments.map((item) => `${item.mode} ${money(item.amount)}`).join(", ")
              : "Owner paid";

            return (
              <article
                key={session.id}
                className="rounded-[1.15rem] border-2 border-[#337418] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_38px_rgba(51,116,24,0.06)] sm:rounded-[1.55rem] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold text-zinc-950">
                      {session.primaryCustomer.name}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      {session.primaryCustomer.mobileNumber}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#337418]/15 px-3 py-1 text-xs font-extrabold text-[#337418]">
                    {money(session.finalAmount || 0)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Table</p>
                    <p className="mt-1 font-bold text-zinc-900">{session.table.name}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Game / Time</p>
                    <p className="mt-1 font-bold text-zinc-900">{gamesOrTime}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Payment</p>
                    <p className="mt-1 font-bold text-[#337418]">{payment}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Completed</p>
                    <p className="mt-1 font-bold text-zinc-900">
                      {session.finalizedAt
                        ? new Date(session.finalizedAt).toLocaleDateString("en-IN")
                        : "-"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs font-semibold text-zinc-400">
                  {session.ownerPlaying
                    ? session.ownerResult === "OWNER_WON"
                      ? "Owner Won"
                      : "Customer Won"
                    : "Owner not playing"}
                </p>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-[#337418]/15 bg-white p-8 text-center text-sm font-semibold text-zinc-500 shadow-sm">
            No completed sessions found.
          </div>
        )}
      </div>
    </section>
  );
}

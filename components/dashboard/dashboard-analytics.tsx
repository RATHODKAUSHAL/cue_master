"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { userFetch } from "@/lib/auth/client";

type Period = "day" | "week" | "month";

type Analytics = {
  period: Period;
  selectedDate: string;
  totalCustomers: number;
  totalRevenue: number;
  totalPendingAmount: number;
  totalExpense: number;
  completedSessions: number;
};

function indiaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-zinc-200 bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}

export function DashboardAnalytics({
  userName,
  greeting,
}: {
  userName: string;
  greeting: string;
}) {
  const [period, setPeriod] = useState<Period>("day");
  const [date, setDate] = useState(indiaToday);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  async function loadAnalytics(nextPeriod = period, nextDate = date) {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ period: nextPeriod, date: nextDate });
      const response = await userFetch(`/api/dashboard?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "Unable to load analytics.");
      if (currentRequest === requestId.current) setAnalytics(data.analytics);
    } catch (loadError) {
      if (currentRequest === requestId.current) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load analytics.");
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ period: "day", date: indiaToday() });

    userFetch(`/api/dashboard?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load analytics.");
        return data;
      })
      .then((data) => setAnalytics(data.analytics))
      .catch((loadError: Error) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  function changePeriod(nextPeriod: Period) {
    setPeriod(nextPeriod);
    void loadAnalytics(nextPeriod, date);
  }

  function changeDate(nextDate: string) {
    setDate(nextDate);
    if (nextDate) void loadAnalytics(period, nextDate);
  }

  const stats = analytics
    ? [
        {
          title: "Total Customers",
          value: analytics.totalCustomers.toLocaleString("en-IN"),
          note: "All listed customers",
        },
        {
          title: "Total Revenue",
          value: money(analytics.totalRevenue),
          note: `${analytics.completedSessions} completed sessions`,
        },
        {
          title: "Total Pending Amount",
          value: money(analytics.totalPendingAmount),
          note: "Current outstanding balance",
        },
        {
          title: "Expense / Game Loss",
          value: money(analytics.totalExpense),
          note: "Owner-lost game value",
        },
      ]
    : [];

  return (
    <section className="-m-3 min-h-[calc(100vh-4rem)] border border-brand-green bg-white p-4 pb-24 rounded-[1.5rem] shadow-xs text-zinc-800 sm:-m-6 sm:p-6 sm:pb-28 lg:m-0 lg:min-h-[calc(100vh-8rem)] lg:p-6">
      <div className="grid gap-4">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#337418] sm:text-3xl">
              {greeting}, {userName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {(["day", "week", "month"] as Period[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changePeriod(value)}
                  className={`h-8 rounded-lg px-3 text-xs font-bold transition-all ${
                    period === value
                      ? "bg-[#337418] text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {value === "day" ? "Date" : value === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>

            <input
              type="date"
              value={date}
              onChange={(event) => changeDate(event.target.value)}
              className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-805 outline-none focus:border-[#337418] transition"
              aria-label="Change report date"
            />
            <Link
              href="/sessions"
              className="inline-flex h-9 items-center justify-center glass-btn-biscuit rounded-xl text-center text-sm font-bold shadow-xs px-4"
            >
              New Session
            </Link>
          </div>
        </header>

        {loading && !analytics ? (
          <div className="mt-8">
            <DashboardSkeleton />
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 font-semibold">
            {error}
          </div>
        ) : analytics ? (
          <section className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mt-2 ${loading ? "opacity-60" : ""}`}>
            {stats.map((stat) => (
              <article
                key={stat.title}
                className="rounded-2xl border border-[#337418]/15 bg-gradient-to-br from-[#337418] to-[#265912] p-5 shadow-md shadow-brand-green/5 text-white flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{stat.title}</p>
                  <p className="mt-3 truncate text-3xl font-extrabold tracking-tight text-white">{stat.value}</p>
                </div>
                <p className="mt-4 text-xs font-medium text-white/80 border-t border-white/10 pt-3">{stat.note}</p>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </section>
  );
}

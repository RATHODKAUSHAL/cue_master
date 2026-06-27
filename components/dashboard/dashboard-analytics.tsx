"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  chart: Array<{ label: string; value: number }>;
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
          <div key={index} className="h-32 rounded-lg bg-zinc-100" />
        ))}
      </div>
      <div className="mt-6 h-96 rounded-lg bg-zinc-100" />
    </div>
  );
}

function RevenueChart({ points }: { points: Analytics["chart"] }) {
  const width = 900;
  const height = 280;
  const paddingX = 35;
  const paddingY = 28;
  const max = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const coordinates = points.map((point, index) => {
    const x =
      paddingX +
      (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
    const y = paddingY + chartHeight - (point.value / max) * chartHeight;
    return { ...point, x, y };
  });
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = coordinates.length
    ? `${paddingX},${height - paddingY} ${line} ${
        coordinates[coordinates.length - 1].x
      },${height - paddingY}`
    : "";
  const labelStep = Math.max(1, Math.ceil(points.length / 10));

  return (
    <div>
      <div className="h-72 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img">
          <defs>
            <linearGradient id="dashboardRevenueFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3195EF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3195EF" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingY + ratio * chartHeight;
            return (
              <line
                key={ratio}
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="#e4e4e7"
                strokeDasharray="4 6"
              />
            );
          })}
          {area ? <polygon points={area} fill="url(#dashboardRevenueFill)" /> : null}
          {line ? (
            <polyline
              points={line}
              fill="none"
              stroke="#3195EF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {coordinates.map((point, index) => (
            <circle
              key={`${point.label}-${index}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3195EF"
            >
              <title>
                {point.label}: {money(point.value)}
              </title>
            </circle>
          ))}
        </svg>
      </div>
      <div
        className="grid gap-1 text-center text-[11px] text-zinc-500"
        style={{
          gridTemplateColumns: `repeat(${Math.min(points.length, 10)}, minmax(0, 1fr))`,
        }}
      >
        {points
          .filter((_, index) => index % labelStep === 0)
          .map((point) => (
            <span key={point.label}>{point.label}</span>
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
    <Card className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-xl bg-white">
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {greeting}, {userName}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Live financial and customer analytics for your club.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month"] as Period[]).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={period === value ? "default" : "outline"}
                onClick={() => changePeriod(value)}
              >
                {value === "day" ? "Date" : value === "week" ? "Week" : "Month"}
              </Button>
            ))}
            <input
              type="date"
              value={date}
              onChange={(event) => changeDate(event.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#3195EF]"
            />
            <Link
              href="/sessions"
              className="inline-flex h-9 items-center rounded-md bg-[#3195EF] px-4 text-sm font-semibold text-white"
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
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : analytics ? (
          <>
            <section className={`mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
              {stats.map((stat) => (
                <Card key={stat.title} className="shadow-none">
                  <CardContent className="p-5">
                    <p className="text-sm text-zinc-500">{stat.title}</p>
                    <p className="mt-3 text-2xl font-semibold">{stat.value}</p>
                    <p className="mt-2 text-xs text-zinc-500">{stat.note}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <Card className={`mt-6 shadow-none ${loading ? "opacity-60" : ""}`}>
              <CardHeader className="border-b border-zinc-100">
                <div>
                  <CardTitle>Revenue Chart</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    Collected Cash, UPI, Wallet, and cleared pending payments.
                  </p>
                </div>
                <p className="text-xl font-semibold">{money(analytics.totalRevenue)}</p>
              </CardHeader>
              <CardContent className="p-5">
                <RevenueChart points={analytics.chart} />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Card>
  );
}

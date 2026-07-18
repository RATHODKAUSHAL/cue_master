"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { userFetch } from "@/lib/auth/client";

type ReportMode = "customers" | "sessions";

type CustomerReportRow = {
  id: string;
  customerName: string;
  amountSpent: number;
  gamesPlayed: number;
  pendingAmount: number;
};

type SessionReportRow = {
  id: string;
  customerNames: string;
  mobileNumbers: string;
  tableName: string;
  revenueAmount: number;
  pendingAmount: number;
  createdAt: string;
};

type Report = {
  customers: CustomerReportRow[];
  sessions: SessionReportRow[];
  totals: {
    totalRevenue: number;
    totalPendingAmount: number;
  };
};

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeCell(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadExcel(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const htmlRows = [
    `<tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr>`,
    ...rows.map(
      (row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`,
    ),
  ].join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${htmlRows}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ReportsManager() {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ReportMode>("customers");
  const [date, setDate] = useState("");
  const [report, setReport] = useState<Report>({
    customers: [],
    sessions: [],
    totals: { totalRevenue: 0, totalPendingAmount: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function loadReport(selectedDate = date) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set("date", selectedDate);

      const response = await userFetch(`/api/reports?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load reports.");
      setReport(data.report);
      return data.report as Report;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    userFetch("/api/reports", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load reports.");
        return data.report as Report;
      })
      .then((nextReport) => {
        if (active) setReport(nextReport);
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

  const activeCount = mode === "customers" ? report.customers.length : report.sessions.length;
  const exportLabel = useMemo(() => {
    const label = mode === "customers" ? "Customer List" : "Session List";
    return date ? `${label} - ${date}` : label;
  }, [date, mode]);

  function changeReportDate(nextDate: string) {
    setDate(nextDate);
    void loadReport(nextDate);
  }

  function openDatePicker() {
    const picker = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (picker?.showPicker) {
      picker.showPicker();
      return;
    }
    picker?.focus();
    picker?.click();
  }

  async function exportActiveReport() {
    setExporting(true);
    setError("");

    try {
      const freshReport = await loadReport(date);
      const exportReport = freshReport || report;

      if (mode === "customers") {
        downloadExcel(
          `customer-list${date ? `-${date}` : ""}.xls`,
          ["Customer Name", "Customer Amount Spend", "Customer Play Number of Games", "Pending Amount"],
          exportReport.customers.map((customer) => [
            customer.customerName,
            customer.amountSpent,
            customer.gamesPlayed,
            customer.pendingAmount,
          ]),
        );
      } else {
        downloadExcel(
          `session-list${date ? `-${date}` : ""}.xls`,
          [
            "Session Customer Name",
            "Mobile Number",
            "Table Name",
            "Revenue Amount",
            "Pending Amount",
            "Session Created Date",
          ],
          exportReport.sessions.map((session) => [
            session.customerNames,
            session.mobileNumbers,
            session.tableName,
            session.revenueAmount,
            session.pendingAmount,
            new Date(session.createdAt).toLocaleString("en-IN"),
          ]),
        );
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="-m-4 min-h-[calc(100vh-4rem)] rounded-[1.5rem] border border-brand-green bg-white p-3 pb-24 text-zinc-800 shadow-xs sm:-m-6 sm:p-5 sm:pb-28 lg:m-0 lg:min-h-[calc(100vh-8rem)] lg:p-5">
      <div className="grid gap-3">
        <div className="rounded-[1.25rem] border border-[#337418]/15 bg-[#f4ebe1]/25 p-4 shadow-sm sm:rounded-[1.5rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#337418]">Reports</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-normal text-zinc-950">Reports</h1>
            </div>
            <Button
              type="button"
              size="icon"
              className="size-11 shrink-0 rounded-full bg-[#337418] text-white shadow-sm hover:bg-[#2b6414]"
              onClick={exportActiveReport}
              disabled={loading || exporting}
              aria-label={exporting ? "Exporting report" : "Export report to Excel"}
              title={exporting ? "Exporting..." : "Export file"}
            >
              <FileSpreadsheet aria-hidden="true" className="size-5" strokeWidth={2} />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#337418]/15 bg-white p-2 shadow-[0_6px_18px_rgba(0,0,0,0.03)]">
            <div className="relative shrink-0">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-10 rounded-xl border-[#337418]/20 bg-white text-[#337418] hover:bg-[#337418]/10 hover:text-[#337418]"
                onClick={openDatePicker}
                aria-label="Select report date"
                title="Select date"
              >
                <CalendarDays aria-hidden="true" className="size-4" strokeWidth={2.2} />
              </Button>
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(event) => changeReportDate(event.target.value)}
                className="pointer-events-none absolute inset-0 size-10 opacity-0"
                aria-label="Change report date"
                tabIndex={-1}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-zinc-950">
                {date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }) : "All dates"}
              </p>
              <p className="text-xs font-medium text-zinc-400">
                {date ? "Filtered report" : "Tap calendar to filter"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-[#337418]/20 bg-white px-4 text-sm font-extrabold text-[#337418] hover:bg-[#337418]/10 hover:text-[#337418]"
              onClick={() => changeReportDate("")}
              disabled={!date || loading}
            >
              Clear
            </Button>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-2">
          {[
            ["Total Revenue", money(report.totals.totalRevenue), date ? "Collected on selected date" : "Collected across all records"],
            ["Total Pending Amount", money(report.totals.totalPendingAmount), "Current customer due balance"],
          ].map(([label, value, note]) => (
            <article key={label} className="rounded-[1.15rem] border-2 border-[#337418] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:rounded-[1.35rem]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
              <p className="mt-2 truncate text-[1.7rem] font-extrabold leading-tight text-[#337418]">{value}</p>
              <p className="mt-1 text-xs font-medium text-zinc-400">{note}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[1.25rem] border border-[#337418]/15 bg-white p-3 shadow-sm sm:rounded-[1.45rem] sm:p-4">
          <div className="grid gap-3">
            <div className="inline-grid grid-cols-2 rounded-2xl border border-[#337418]/15 bg-[#337418]/5 p-1">
              {[
                ["customers", "Customers"],
                ["sessions", "Sessions"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value as ReportMode)}
                  className={cn(
                    "h-10 rounded-xl px-4 text-sm font-extrabold transition",
                    mode === value ? "bg-[#337418] text-[#F8F8F8]" : "text-zinc-500 hover:text-[#337418]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold leading-tight text-zinc-950">{exportLabel}</h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Showing {activeCount} record{activeCount === 1 ? "" : "s"}
                </p>
              </div>
              <p className="text-right text-xs font-semibold text-zinc-400">
                {loading ? "Refreshing..." : date ? `Date: ${date}` : "All dates"}
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-[#337418]/15 bg-white p-6 text-center text-sm font-semibold text-zinc-500 shadow-sm">
                Loading reports...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : mode === "customers" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {report.customers.length ? (
                  report.customers.map((customer) => (
                    <article key={customer.id} className="rounded-2xl border border-[#337418]/20 bg-white p-3 shadow-sm">
                      <h3 className="truncate text-base font-extrabold text-zinc-950">{customer.customerName}</h3>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-zinc-400">Spent</p><p className="mt-1 font-bold text-[#337418]">{money(customer.amountSpent)}</p></div>
                        <div><p className="text-zinc-400">Games</p><p className="mt-1 font-bold text-zinc-900">{customer.gamesPlayed}</p></div>
                        <div className="col-span-2"><p className="text-zinc-400">Pending</p><p className={cn("mt-1 font-bold", customer.pendingAmount > 0 ? "text-red-600" : "text-[#337418]")}>{money(customer.pendingAmount)}</p></div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-[#337418]/15 bg-white p-6 text-center text-sm font-semibold text-zinc-500 shadow-sm md:col-span-2 xl:col-span-3">
                    No customers found.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {report.sessions.length ? (
                  report.sessions.map((session) => (
                    <article key={session.id} className="rounded-2xl border border-[#337418]/20 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-extrabold text-zinc-950">{session.customerNames || "-"}</h3>
                          <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{session.mobileNumbers || "-"}</p>
                        </div>
                        <span className="rounded-full bg-[#337418]/15 px-3 py-1 text-xs font-extrabold text-[#337418]">{money(session.revenueAmount)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-zinc-400">Table</p><p className="mt-1 font-bold text-zinc-900">{session.tableName}</p></div>
                        <div><p className="text-zinc-400">Pending</p><p className={cn("mt-1 font-bold", session.pendingAmount > 0 ? "text-red-600" : "text-[#337418]")}>{money(session.pendingAmount)}</p></div>
                        <div className="col-span-2"><p className="text-zinc-400">Created</p><p className="mt-1 font-bold text-zinc-900">{new Date(session.createdAt).toLocaleString("en-IN")}</p></div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-[#337418]/15 bg-white p-6 text-center text-sm font-semibold text-zinc-500 shadow-sm md:col-span-2 xl:col-span-3">
                    No completed sessions found.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

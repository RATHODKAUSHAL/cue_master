"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { userFetch } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

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

const fieldClass =
  "h-11 rounded-md border border-zinc-300 bg-white px-3 outline-none transition focus:border-[#3195EF] focus:ring-2 focus:ring-[#3195EF]/15";

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
    <div className="grid gap-5">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/50 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">Reports</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {exportLabel} ready for review and Excel export.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[220px_auto_auto]">
            <input
              type="date"
              value={date}
              onChange={(event) => changeReportDate(event.target.value)}
              className={fieldClass}
              aria-label="Change report date"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => changeReportDate("")}
              disabled={!date || loading}
            >
              Clear Date
            </Button>
            <Button type="button" onClick={exportActiveReport} disabled={loading || exporting}>
              {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm shadow-zinc-200/50">
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-700">Total Revenue</p>
              <p className="mt-2 truncate text-3xl font-semibold text-zinc-950">
                {money(report.totals.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {date ? "Collected on selected date" : "Collected across all records"}
              </p>
            </div>
            <div className="grid size-12 shrink-0 place-items-center rounded-md bg-emerald-50 text-sm font-semibold text-emerald-700">
              Rs
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-amber-100 bg-white shadow-sm shadow-zinc-200/50">
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-700">Total Pending Amount</p>
              <p className="mt-2 truncate text-3xl font-semibold text-zinc-950">
                {money(report.totals.totalPendingAmount)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Current customer due balance</p>
            </div>
            <div className="grid size-12 shrink-0 place-items-center rounded-md bg-amber-50 text-sm font-semibold text-amber-700">
              Due
            </div>
          </div>
        </div>
      </section>

      <Card className="min-h-[calc(100vh-16rem)] overflow-hidden rounded-xl bg-white">
        <CardHeader className="border-b border-zinc-200 p-4 sm:p-5">
          <div className="grid w-full gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="inline-grid w-full grid-cols-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1 sm:w-auto">
              {[
                ["customers", "Customers"],
                ["sessions", "Session"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value as ReportMode)}
                  className={cn(
                    "h-10 min-w-32 rounded-md px-4 text-sm font-semibold transition",
                    mode === value
                      ? "bg-[#3195EF] text-white shadow-sm"
                      : "text-zinc-600 hover:bg-white hover:text-zinc-950",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{exportLabel}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Showing {activeCount} record{activeCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="text-left text-sm text-zinc-500 lg:text-right">
              {loading ? "Refreshing report..." : date ? `Date: ${date}` : "All dates"}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            {mode === "customers" ? (
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Customer Amount Spend</TableHead>
                    <TableHead>Customer Play Number of Games</TableHead>
                    <TableHead>Pending Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-zinc-500">
                        Loading customer reports...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-red-600">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : report.customers.length ? (
                    report.customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-semibold">{customer.customerName}</TableCell>
                        <TableCell>{money(customer.amountSpent)}</TableCell>
                        <TableCell>{customer.gamesPlayed}</TableCell>
                        <TableCell
                          className={customer.pendingAmount > 0 ? "font-semibold text-red-600" : ""}
                        >
                          {money(customer.pendingAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-zinc-500">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Session Customer Name</TableHead>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>Table Name</TableHead>
                    <TableHead>Revenue Amount</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Session Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-zinc-500">
                        Loading session reports...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-red-600">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : report.sessions.length ? (
                    report.sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="max-w-[260px] whitespace-normal font-semibold">
                          {session.customerNames || "-"}
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal">
                          {session.mobileNumbers || "-"}
                        </TableCell>
                        <TableCell>{session.tableName}</TableCell>
                        <TableCell>{money(session.revenueAmount)}</TableCell>
                        <TableCell
                          className={session.pendingAmount > 0 ? "font-semibold text-red-600" : ""}
                        >
                          {money(session.pendingAmount)}
                        </TableCell>
                        <TableCell>{new Date(session.createdAt).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-zinc-500">
                        No completed sessions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

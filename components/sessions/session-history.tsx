"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { userFetch } from "@/lib/auth/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  "h-11 rounded-md border border-zinc-300 bg-white px-3 outline-none transition focus:border-[#3195EF] focus:ring-2 focus:ring-[#3195EF]/15";

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
    <Card className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-xl bg-white">
      <CardHeader className="border-b border-zinc-200 p-5 sm:p-6">
        <div>
          <CardTitle className="text-2xl">Session History</CardTitle>
          <p className="mt-2 text-sm text-zinc-500">
            Completed sessions are stored here with bill and payment details.
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <form
          className="mb-5 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[1fr_1fr_200px_auto_auto]"
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
            onChange={(event) =>
              setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
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
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Completed Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Table Type</TableHead>
                <TableHead>Games / Time</TableHead>
                <TableHead>Final Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Owner Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-zinc-500">
                    Loading session history...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-red-600">
                    {error}
                  </TableCell>
                </TableRow>
              ) : sessions.length ? (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {session.finalizedAt
                        ? new Date(session.finalizedAt).toLocaleString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {session.primaryCustomer.name}
                    </TableCell>
                    <TableCell>{session.primaryCustomer.mobileNumber}</TableCell>
                    <TableCell>{session.table.name}</TableCell>
                    <TableCell>
                      {session.pricingMode === "PER_HOUR" ? "Per Hour" : "Per Game"}
                    </TableCell>
                    <TableCell>
                      {session.pricingMode === "PER_GAME"
                        ? `${session.gameCount} game${session.gameCount === 1 ? "" : "s"}`
                        : `${Math.floor(session.plannedDurationMinutes / 60)}h ${
                            session.plannedDurationMinutes % 60
                          }m`}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {money(session.finalAmount || 0)}
                    </TableCell>
                    <TableCell>
                      {session.payments.length
                        ? session.payments
                            .map((payment) => `${payment.mode} ${money(payment.amount)}`)
                            .join(", ")
                        : "Owner paid"}
                    </TableCell>
                    <TableCell>
                      {session.ownerPlaying ? (
                        <Badge variant="outline">
                          {session.ownerResult === "OWNER_WON" ? "Owner Won" : "Customer Won"}
                        </Badge>
                      ) : (
                        "Not playing"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-zinc-500">
                    No completed sessions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

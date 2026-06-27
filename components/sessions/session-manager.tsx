"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardIcon } from "@/components/dashboard/dashboard-shell";
import { userFetch } from "@/lib/auth/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PricingMode = "PER_HOUR" | "PER_GAME";
type SessionStatus = "ACTIVE" | "PAUSED" | "ENDED" | "COMPLETED" | "CANCELLED";
type PaymentMode = "CASH" | "UPI" | "PENDING";

type VenueTable = {
  id: string;
  name: string;
  pricingMode: PricingMode;
  price: number;
  durationMinutes: number | null;
};

type Customer = {
  id: string;
  name: string;
  mobileNumber: string;
  pendingAmount: number;
  walletBalance: number;
};

type GameSession = {
  id: string;
  tableId: string;
  pricingMode: PricingMode;
  tablePrice: number;
  gameCount: number;
  plannedDurationMinutes: number;
  calculatedAmount: number;
  finalAmount: number | null;
  status: SessionStatus;
  ownerPlaying: boolean;
  ownerResult: "OWNER_WON" | "OWNER_LOST" | null;
  startedAt: string;
  pauseStartedAt: string | null;
  totalPausedSeconds: number;
  endedAt: string | null;
  finalizedAt: string | null;
  table: VenueTable;
  primaryCustomer: Customer;
};

type SessionForm = {
  customerName: string;
  customerMobileNumber: string;
  tableId: string;
  durationHours: string;
  durationMinutes: string;
  gameCount: string;
  ownerPlaying: boolean;
};

type SplitRow = {
  key: string;
  customerName: string;
  customerMobileNumber: string;
  amount: string;
  mode: PaymentMode;
};

const emptyForm: SessionForm = {
  customerName: "",
  customerMobileNumber: "",
  tableId: "",
  durationHours: "1",
  durationMinutes: "0",
  gameCount: "1",
  ownerPlaying: false,
};

const fieldClass =
  "h-11 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10";

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPricingMode(mode: PricingMode) {
  return mode === "PER_HOUR" ? "Per Hour" : "Per Game";
}

function getRemainingSeconds(session: GameSession, now: number) {
  const durationSeconds = session.plannedDurationMinutes * 60;
  const stopAt =
    session.status === "PAUSED" && session.pauseStartedAt
      ? new Date(session.pauseStartedAt).getTime()
      : session.endedAt
        ? new Date(session.endedAt).getTime()
        : now;
  const elapsed = Math.max(
    0,
    Math.floor((stopAt - new Date(session.startedAt).getTime()) / 1000) -
      session.totalPausedSeconds,
  );

  return Math.max(0, durationSeconds - elapsed);
}

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formFromSession(session: GameSession): SessionForm {
  return {
    customerName: session.primaryCustomer.name,
    customerMobileNumber: session.primaryCustomer.mobileNumber,
    tableId: session.tableId,
    durationHours: String(Math.floor(session.plannedDurationMinutes / 60)),
    durationMinutes: String(session.plannedDurationMinutes % 60),
    gameCount: String(session.gameCount || 1),
    ownerPlaying: session.ownerPlaying,
  };
}

function newSplitRow(customer?: Customer, amount = ""): SplitRow {
  return {
    key: crypto.randomUUID(),
    customerName: customer?.name || "",
    customerMobileNumber: customer?.mobileNumber || "",
    amount,
    mode: "CASH",
  };
}

export default function SessionManager() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [availableTables, setAvailableTables] = useState<VenueTable[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GameSession | null>(null);
  const [form, setForm] = useState<SessionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [finalizingSession, setFinalizingSession] = useState<GameSession | null>(null);
  const [paymentType, setPaymentType] = useState<"FULL" | "SPLIT">("FULL");
  const [fullPaymentMode, setFullPaymentMode] = useState<PaymentMode>("CASH");
  const [ownerResult, setOwnerResult] = useState<"OWNER_WON" | "OWNER_LOST" | "">("");
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [finalizeError, setFinalizeError] = useState("");
  const [finalizeSaving, setFinalizeSaving] = useState(false);

  async function readJson(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }
    return data;
  }

  async function loadData(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      setLoadError("");
      const [sessionsResponse, tablesResponse] = await Promise.all([
        userFetch("/api/sessions", { cache: "no-store" }),
        userFetch("/api/tables/available", { cache: "no-store" }),
      ]);
      const [sessionsData, tablesData] = await Promise.all([
        readJson(sessionsResponse),
        readJson(tablesResponse),
      ]);
      setSessions(sessionsData.sessions);
      setAvailableTables(tablesData.tables);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      userFetch("/api/sessions", { cache: "no-store" }),
      userFetch("/api/tables/available", { cache: "no-store" }),
    ])
      .then(async ([sessionsResponse, tablesResponse]) => {
        const [sessionsData, tablesData] = await Promise.all([
          sessionsResponse.json().catch(() => ({})),
          tablesResponse.json().catch(() => ({})),
        ]);

        if (!sessionsResponse.ok) {
          throw new Error(sessionsData.message || "Unable to load sessions.");
        }
        if (!tablesResponse.ok) {
          throw new Error(tablesData.message || "Unable to load available tables.");
        }

        return [sessionsData, tablesData];
      })
      .then(([sessionsData, tablesData]) => {
        if (!active) return;
        setSessions(sessionsData.sessions);
        setAvailableTables(tablesData.tables);
        setLoadError("");
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const selectedTable = useMemo(() => {
    if (editingSession?.tableId === form.tableId) return editingSession.table;
    return availableTables.find((table) => table.id === form.tableId) || null;
  }, [availableTables, editingSession, form.tableId]);

  function openCreate() {
    setEditingSession(null);
    setForm({ ...emptyForm, tableId: availableTables[0]?.id || "" });
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(session: GameSession) {
    setEditingSession(session);
    setForm(formFromSession(session));
    setFormError("");
    setFormOpen(true);
  }

  async function lookupCustomer() {
    const mobile = form.customerMobileNumber.replace(/\D/g, "").slice(-10);
    if (mobile.length !== 10) return;

    try {
      const response = await userFetch(`/api/customers?mobile=${encodeURIComponent(mobile)}`, {
        cache: "no-store",
      });
      const data = await readJson(response);
      if (data.customer) {
        setForm((current) => ({ ...current, customerName: data.customer.name }));
      }
    } catch {
      // The form remains usable for a new customer.
    }
  }

  async function saveSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!selectedTable) {
      setFormError("Select an available table.");
      return;
    }

    const durationMinutes =
      Number(form.durationHours || 0) * 60 + Number(form.durationMinutes || 0);
    if (selectedTable.pricingMode === "PER_HOUR" && durationMinutes <= 0) {
      setFormError("Enter a session time.");
      return;
    }

    setSaving(true);
    try {
      const response = await userFetch(
        editingSession ? `/api/sessions/${editingSession.id}` : "/api/sessions",
        {
          method: editingSession ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: form.customerName,
            customerMobileNumber: form.customerMobileNumber,
            tableId: form.tableId,
            durationMinutes:
              selectedTable.pricingMode === "PER_HOUR" ? durationMinutes : undefined,
            gameCount:
              selectedTable.pricingMode === "PER_GAME" ? Number(form.gameCount) : undefined,
            ownerPlaying: form.ownerPlaying,
          }),
        },
      );
      await readJson(response);
      setFormOpen(false);
      await loadData(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save session.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(session: GameSession, action: "pause" | "resume" | "end") {
    setBusyId(session.id);
    setActionError("");
    try {
      const response = await userFetch(`/api/sessions/${session.id}/${action}`, { method: "POST" });
      await readJson(response);
      await loadData(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update session.");
    } finally {
      setBusyId("");
    }
  }

  async function removeSession(session: GameSession) {
    if (!window.confirm(`Delete the session for ${session.primaryCustomer.name}?`)) return;

    setBusyId(session.id);
    setActionError("");
    try {
      const response = await userFetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      await readJson(response);
      await loadData(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete session.");
    } finally {
      setBusyId("");
    }
  }

  function openFinalize(session: GameSession) {
    setFinalizingSession(session);
    setPaymentType("FULL");
    setFullPaymentMode("CASH");
    setOwnerResult("");
    setSplitRows([newSplitRow(session.primaryCustomer, String(session.calculatedAmount))]);
    setFinalizeError("");
  }

  const finalBill = finalizingSession
    ? finalizingSession.ownerPlaying && ownerResult === "OWNER_LOST"
      ? 0
      : finalizingSession.calculatedAmount
    : 0;

  async function completeFinalization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!finalizingSession) return;

    if (finalizingSession.ownerPlaying && !ownerResult) {
      setFinalizeError("Select whether the owner won.");
      return;
    }

    let players: Array<{
      customerId?: string;
      customerName?: string;
      customerMobileNumber?: string;
      splitAmount: number;
    }>;
    let payments: Array<{
      customerId?: string;
      customerName?: string;
      customerMobileNumber?: string;
      mode: PaymentMode;
      amount: number;
    }>;

    if (finalBill === 0) {
      players = [{ customerId: finalizingSession.primaryCustomer.id, splitAmount: 0 }];
      payments = [];
    } else if (paymentType === "FULL") {
      players = [{ customerId: finalizingSession.primaryCustomer.id, splitAmount: finalBill }];
      payments = [
        {
          customerId: finalizingSession.primaryCustomer.id,
          mode: fullPaymentMode,
          amount: finalBill,
        },
      ];
    } else {
      const normalizedRows = splitRows.map((row) => ({
        ...row,
        customerMobileNumber: row.customerMobileNumber.replace(/\D/g, "").slice(-10),
        amount: Number(row.amount),
      }));
      const total = normalizedRows.reduce((sum, row) => sum + row.amount, 0);
      const mobileNumbers = normalizedRows.map((row) => row.customerMobileNumber);

      if (
        normalizedRows.some(
          (row) =>
            !row.customerName.trim() ||
            row.customerMobileNumber.length !== 10 ||
            !Number.isFinite(row.amount) ||
            row.amount <= 0,
        )
      ) {
        setFinalizeError("Enter valid customer, mobile, and amount details for every split.");
        return;
      }
      if (new Set(mobileNumbers).size !== mobileNumbers.length) {
        setFinalizeError("Each split customer must have a different mobile number.");
        return;
      }
      if (total !== finalBill) {
        setFinalizeError(`Split total must equal ${money(finalBill)}.`);
        return;
      }

      players = normalizedRows.map((row) => ({
        customerName: row.customerName,
        customerMobileNumber: row.customerMobileNumber,
        splitAmount: row.amount,
      }));
      payments = normalizedRows.map((row) => ({
        customerName: row.customerName,
        customerMobileNumber: row.customerMobileNumber,
        mode: row.mode,
        amount: row.amount,
      }));
    }

    setFinalizeSaving(true);
    setFinalizeError("");
    try {
      const response = await userFetch(`/api/sessions/${finalizingSession.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerResult: ownerResult || null,
          players,
          payments,
        }),
      });
      const data = await readJson(response);
      const completedSession = data.session as GameSession;
      setSessions((current) => current.filter((session) => session.id !== completedSession.id));
      setAvailableTables((current) =>
        current.some((table) => table.id === completedSession.table.id)
          ? current
          : [...current, completedSession.table],
      );
      setFinalizingSession(null);
    } catch (error) {
      setFinalizeError(error instanceof Error ? error.message : "Unable to finalize bill.");
    } finally {
      setFinalizeSaving(false);
    }
  }

  return (
    <>
      <Card className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="flex-col border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/60 p-5 sm:flex-row sm:items-center sm:p-7">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Live operations
            </p>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Sessions
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Start games, track countdowns, and finalize customer payments.
            </p>
          </div>
          <Button className="rounded-xl px-5 shadow-sm" onClick={openCreate}>
            <DashboardIcon name="plus" className="size-4" />
            Create New Session
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {actionError ? (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {actionError}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <Table className="min-w-[1180px]">
              <TableHeader className="bg-slate-50/90">
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Table Type</TableHead>
                  <TableHead>Games / Time</TableHead>
                  <TableHead>Reverse Timer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-zinc-500">
                      Loading sessions...
                    </TableCell>
                  </TableRow>
                ) : loadError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-red-600">
                      {loadError}
                    </TableCell>
                  </TableRow>
                ) : sessions.length ? (
                  sessions.map((session) => {
                    const remaining = getRemainingSeconds(session, now);
                    const canFinalize =
                      session.status === "ENDED" ||
                      (remaining === 0 &&
                        (session.status === "ACTIVE" || session.status === "PAUSED"));

                    return (
                      <TableRow key={session.id} className="transition-colors hover:bg-blue-50/35">
                        <TableCell className="font-semibold text-slate-900">
                          {session.primaryCustomer.name}
                          {session.ownerPlaying ? (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              Owner playing
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {session.primaryCustomer.mobileNumber}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">{session.table.name}</TableCell>
                        <TableCell className="text-slate-600">
                          {formatPricingMode(session.pricingMode)}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {session.pricingMode === "PER_GAME"
                            ? `${session.gameCount} game${session.gameCount === 1 ? "" : "s"}`
                            : `${Math.floor(session.plannedDurationMinutes / 60)}h ${session.plannedDurationMinutes % 60}m`}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums ${
                              remaining === 0
                                ? "border-red-200 bg-red-50 text-red-600"
                                : "border-slate-200 bg-slate-50 text-slate-900"
                            }`}
                          >
                            {formatTimer(remaining)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={session.status === "ACTIVE" ? "default" : "outline"}
                            className={
                              session.status === "COMPLETED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : session.status === "PAUSED"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : undefined
                            }
                          >
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {session.status === "ACTIVE" && remaining > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50"
                                disabled={busyId === session.id}
                                onClick={() => runAction(session, "pause")}
                              >
                                Pause
                              </Button>
                            ) : session.status === "PAUSED" && remaining > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                disabled={busyId === session.id}
                                onClick={() => runAction(session, "resume")}
                              >
                                Resume
                              </Button>
                            ) : null}
                            {["ACTIVE", "PAUSED"].includes(session.status) && remaining > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                                disabled={busyId === session.id}
                                onClick={() => runAction(session, "end")}
                              >
                                Stop
                              </Button>
                            ) : null}
                            {canFinalize ? (
                              <Button className="rounded-lg" size="sm" onClick={() => openFinalize(session)}>
                                Finalise
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <details className="relative inline-block text-left">
                            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                              Action
                              <DashboardIcon name="chevron" className="size-3.5" />
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 grid min-w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                              <button
                                type="button"
                                className="rounded px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-40"
                                disabled={!["ACTIVE", "PAUSED"].includes(session.status)}
                                onClick={() => openEdit(session)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                                disabled={session.status === "COMPLETED" || busyId === session.id}
                                onClick={() => removeSession(session)}
                              >
                                Delete
                              </button>
                            </div>
                          </details>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-zinc-500">
                      No sessions found. Create the first session from an available table.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/80 p-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {editingSession ? "Edit Session" : "Create New Session"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Only currently available tables can start a new session.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} aria-label="Close">
                <DashboardIcon name="close" className="size-4" />
              </Button>
            </div>

            <form className="grid gap-5 p-5 sm:p-6" onSubmit={saveSession}>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Customer Mobile Number
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.customerMobileNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customerMobileNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  onBlur={lookupCustomer}
                  className={fieldClass}
                  placeholder="9876543210"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Customer Name
                <input
                  value={form.customerName}
                  onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                  className={fieldClass}
                  placeholder="Customer name"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Select Table
                <select
                  value={form.tableId}
                  onChange={(event) => setForm({ ...form, tableId: event.target.value })}
                  className={fieldClass}
                  required
                >
                  <option value="">Select an available table</option>
                  {editingSession ? (
                    <option value={editingSession.table.id}>
                      {editingSession.table.name} (Current)
                    </option>
                  ) : null}
                  {availableTables
                    .filter((table) => table.id !== editingSession?.tableId)
                    .map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} - {formatPricingMode(table.pricingMode)} - {money(table.price)}
                      </option>
                    ))}
                </select>
              </label>

              {selectedTable?.pricingMode === "PER_HOUR" ? (
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium text-zinc-700">Session Time</legend>
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <label className="grid gap-2 text-sm text-zinc-700">
                      Hours
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={form.durationHours}
                        onChange={(event) => setForm({ ...form, durationHours: event.target.value })}
                        className={fieldClass}
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-zinc-700">
                      Minutes
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={form.durationMinutes}
                        onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                </fieldset>
              ) : null}

              {selectedTable?.pricingMode === "PER_GAME" ? (
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  How Many Games?
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.gameCount}
                    onChange={(event) => setForm({ ...form, gameCount: event.target.value })}
                    className={fieldClass}
                    required
                  />
                  <span className="text-xs font-normal text-zinc-500">
                    Countdown uses {selectedTable.durationMinutes || 45} minutes per game.
                  </span>
                </label>
              ) : null}

              <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.ownerPlaying}
                  onChange={(event) => setForm({ ...form, ownerPlaying: event.target.checked })}
                  className="size-4 accent-[#3195EF]"
                />
                Is Owner Playing?
              </label>

              {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingSession ? "Update Session" : "Save & Start Session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {finalizingSession ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/80 p-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">Finalise Bill</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {finalizingSession.table.name} · {finalizingSession.primaryCustomer.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFinalizingSession(null)}
                aria-label="Close"
              >
                <DashboardIcon name="close" className="size-4" />
              </Button>
            </div>

            <form className="grid gap-5 p-5 sm:p-6" onSubmit={completeFinalization}>
              {finalizingSession.ownerPlaying ? (
                <fieldset className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <legend className="px-1 text-sm font-semibold text-blue-900">Did the owner win?</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-md border border-blue-200 bg-white p-3 text-sm">
                      <input
                        type="radio"
                        name="ownerResult"
                        value="OWNER_WON"
                        checked={ownerResult === "OWNER_WON"}
                        onChange={() => setOwnerResult("OWNER_WON")}
                      />
                      Yes, customer pays
                    </label>
                    <label className="flex items-center gap-3 rounded-md border border-blue-200 bg-white p-3 text-sm">
                      <input
                        type="radio"
                        name="ownerResult"
                        value="OWNER_LOST"
                        checked={ownerResult === "OWNER_LOST"}
                        onChange={() => setOwnerResult("OWNER_LOST")}
                      />
                      No, owner pays
                    </label>
                  </div>
                </fieldset>
              ) : null}

              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-950 to-blue-950 p-5 text-white shadow-lg shadow-slate-950/10">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                    Final bill
                  </span>
                  <p className="mt-1 text-xs text-slate-300">Calculated from actual active play time</p>
                </div>
                <span className="text-3xl font-bold tracking-tight">{money(finalBill)}</span>
              </div>

              {finalBill > 0 ? (
                <>
                  <fieldset className="grid gap-3">
                    <legend className="text-sm font-semibold text-zinc-700">Payment Type</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-sm font-medium">
                        <input
                          type="radio"
                          name="paymentType"
                          checked={paymentType === "FULL"}
                          onChange={() => setPaymentType("FULL")}
                        />
                        Full Payment
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-sm font-medium">
                        <input
                          type="radio"
                          name="paymentType"
                          checked={paymentType === "SPLIT"}
                          onChange={() => {
                            setPaymentType("SPLIT");
                            setSplitRows((rows) =>
                              rows.length === 1
                                ? [{ ...rows[0], amount: String(finalBill) }]
                                : rows,
                            );
                          }}
                        />
                        Split Payment
                      </label>
                    </div>
                  </fieldset>

                  {paymentType === "FULL" ? (
                    <label className="grid gap-2 text-sm font-medium text-zinc-700">
                      Payment Method
                      <select
                        value={fullPaymentMode}
                        onChange={(event) => setFullPaymentMode(event.target.value as PaymentMode)}
                        className={fieldClass}
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="PENDING">Pending</option>
                      </select>
                      {fullPaymentMode === "PENDING" ? (
                        <span className="text-xs font-normal text-amber-700">
                          This amount will be added to the customer&apos;s pending balance.
                        </span>
                      ) : null}
                    </label>
                  ) : (
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">Split Customers</h3>
                          <p className="text-xs text-zinc-500">Split total must equal {money(finalBill)}.</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSplitRows([...splitRows, newSplitRow()])}
                        >
                          <DashboardIcon name="plus" className="size-4" />
                          Add Customer
                        </Button>
                      </div>

                      {splitRows.map((row, index) => (
                        <div
                          key={row.key}
                          className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Customer {index + 1}</p>
                            {splitRows.length > 1 ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-red-600"
                                onClick={() =>
                                  setSplitRows(splitRows.filter((item) => item.key !== row.key))
                                }
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2 text-xs font-medium text-zinc-600">
                              Customer Mobile
                              <input
                                inputMode="numeric"
                                maxLength={10}
                                value={row.customerMobileNumber}
                                onChange={(event) =>
                                  setSplitRows(
                                    splitRows.map((item) =>
                                      item.key === row.key
                                        ? {
                                            ...item,
                                            customerMobileNumber: event.target.value
                                              .replace(/\D/g, "")
                                              .slice(0, 10),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className={fieldClass}
                              />
                            </label>
                            <label className="grid gap-2 text-xs font-medium text-zinc-600">
                              Customer Name
                              <input
                                value={row.customerName}
                                onChange={(event) =>
                                  setSplitRows(
                                    splitRows.map((item) =>
                                      item.key === row.key
                                        ? { ...item, customerName: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                className={fieldClass}
                              />
                            </label>
                            <label className="grid gap-2 text-xs font-medium text-zinc-600">
                              Amount
                              <input
                                type="number"
                                min="1"
                                value={row.amount}
                                onChange={(event) =>
                                  setSplitRows(
                                    splitRows.map((item) =>
                                      item.key === row.key
                                        ? { ...item, amount: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                className={fieldClass}
                              />
                            </label>
                            <label className="grid gap-2 text-xs font-medium text-zinc-600">
                              Payment Method
                              <select
                                value={row.mode}
                                onChange={(event) =>
                                  setSplitRows(
                                    splitRows.map((item) =>
                                      item.key === row.key
                                        ? { ...item, mode: event.target.value as PaymentMode }
                                        : item,
                                    ),
                                  )
                                }
                                className={fieldClass}
                              >
                                <option value="UPI">UPI</option>
                                <option value="CASH">Cash</option>
                                <option value="PENDING">Pending</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Customer won, so the owner covers this game. No customer payment will be recorded.
                </p>
              )}

              {finalizeError ? (
                <p className="text-sm font-medium text-red-600">{finalizeError}</p>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setFinalizingSession(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={finalizeSaving}>
                  {finalizeSaving ? "Completing..." : "Complete"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

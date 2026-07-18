"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gamepad2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { userFetch } from "@/lib/auth/client";

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

type AddOnAmount = {
  id: string;
  amount: number;
};

type GameSession = {
  id: string;
  tableId: string;
  pricingMode: PricingMode;
  tablePrice: number;
  gameCount: number;
  plannedDurationMinutes: number;
  calculatedAmount: number;
  addOnAmount: number;
  finalAmount: number | null;
  status: SessionStatus;
  ownerPlaying: boolean;
  ownerResult: "OWNER_WON" | "OWNER_LOST" | null;
  startedAt: string;
  pauseStartedAt: string | null;
  totalPausedSeconds: number;
  endedAt: string | null;
  finalizedAt: string | null;
  completedNotificationSentAt: string | null;
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
  customerId?: string;
  customerName: string;
  customerMobileNumber: string;
  amount: string;
  mode: PaymentMode;
  pendingAmount: number;
  walletBalance: number;
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
  "h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-[#202020] shadow-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15";

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

function DetailIcon({ name }: { name: "user" | "phone" | "table" | "game" | "time" | "more" | "pause" | "stop" | "check" }) {
  const common = "fill-none stroke-current stroke-[1.9] stroke-linecap-round stroke-linejoin-round";
  const paths = {
    user: (
      <>
        <path className={common} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path className={common} d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    phone: <path className={common} d="M7 4.5 5 6.5c-.7.7-.3 3.6 2.8 6.7 3.1 3.1 6 3.5 6.7 2.8l2-2-3-3-1.8 1.8c-.9-.3-1.8-.9-2.6-1.7-.8-.8-1.4-1.7-1.7-2.6L10 7.5l-3-3Z" />,
    table: <path className={common} d="M6 8h12v7H6zM8 15v3M16 15v3M9 11.5h6" />,
    game: (
      <>
        <path className={common} d="M7 9h10a4 4 0 0 1 3.5 5.9l-.5.9a2.2 2.2 0 0 1-3.8.4L14.7 15H9.3l-1.5 2.2a2.2 2.2 0 0 1-3.8-.4l-.5-.9A4 4 0 0 1 7 9Z" />
        <path className={common} d="M8 12v3M6.5 13.5h3M17 13h.01" />
      </>
    ),
    time: <path className={common} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l2.8 1.7" />,
    more: (
      <>
        <circle cx="12" cy="5" r="1.2" className="fill-current" />
        <circle cx="12" cy="12" r="1.2" className="fill-current" />
        <circle cx="12" cy="19" r="1.2" className="fill-current" />
      </>
    ),
    pause: <path className={common} d="M8 6v12M16 6v12" />,
    stop: <path className={common} d="M7 7h10v10H7z" />,
    check: <path className={common} d="m5 13 4 4L19 7" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      {paths[name]}
    </svg>
  );
}

function SessionDetail({
  icon,
  label,
  value,
}: {
  icon: "game" | "time";
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[2.75rem_1fr] items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl border border-[#337418]/15 bg-[#337418]/10 text-[#337418] sm:size-11 sm:rounded-2xl">
        <DetailIcon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold text-zinc-400 sm:text-xs">{label}</span>
        <span className="mt-0.5 block truncate text-xs font-bold text-zinc-805 sm:mt-1 sm:text-sm">{value}</span>
      </span>
    </div>
  );
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
    customerId: customer?.id,
    customerName: customer?.name || "",
    customerMobileNumber: customer?.mobileNumber || "",
    amount,
    mode: "CASH",
    pendingAmount: customer?.pendingAmount || 0,
    walletBalance: customer?.walletBalance || 0,
  };
}

export default function SessionManager() {
  const searchParams = useSearchParams();
  const highlightedSessionId = searchParams.get("sessionId") || "";
  const notificationInFlight = useRef<Set<string>>(new Set());
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [availableTables, setAvailableTables] = useState<VenueTable[]>([]);
  const [addOns, setAddOns] = useState<AddOnAmount[]>([]);
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
  const [fullPaymentAmount, setFullPaymentAmount] = useState("");
  const [ownerResult, setOwnerResult] = useState<"OWNER_WON" | "OWNER_LOST" | "">("");
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [formCustomerPendingAmount, setFormCustomerPendingAmount] = useState(0);
  const [formCustomerWalletBalance, setFormCustomerWalletBalance] = useState(0);
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
      const [sessionsResponse, tablesResponse, addOnsResponse] = await Promise.all([
        userFetch("/api/sessions", { cache: "no-store" }),
        userFetch("/api/tables/available", { cache: "no-store" }),
        userFetch("/api/add-ons", { cache: "no-store" }),
      ]);
      const [sessionsData, tablesData, addOnsData] = await Promise.all([
        readJson(sessionsResponse),
        readJson(tablesResponse),
        readJson(addOnsResponse),
      ]);
      setSessions(sessionsData.sessions);
      setAvailableTables(tablesData.tables);
      setAddOns(addOnsData.addOns || []);
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
      userFetch("/api/add-ons", { cache: "no-store" }),
    ])
      .then(async ([sessionsResponse, tablesResponse, addOnsResponse]) => {
        const [sessionsData, tablesData, addOnsData] = await Promise.all([
          sessionsResponse.json().catch(() => ({})),
          tablesResponse.json().catch(() => ({})),
          addOnsResponse.json().catch(() => ({})),
        ]);

        if (!sessionsResponse.ok) {
          throw new Error(sessionsData.message || "Unable to load sessions.");
        }
        if (!tablesResponse.ok) {
          throw new Error(tablesData.message || "Unable to load available tables.");
        }
        if (!addOnsResponse.ok) {
          throw new Error(addOnsData.message || "Unable to load add-on amounts.");
        }

        return [sessionsData, tablesData, addOnsData];
      })
      .then(([sessionsData, tablesData, addOnsData]) => {
        if (!active) return;
        setSessions(sessionsData.sessions);
        setAvailableTables(tablesData.tables);
        setAddOns(addOnsData.addOns || []);
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

  useEffect(() => {
    if (!highlightedSessionId || loading) return;

    const element = document.getElementById(`session-${highlightedSessionId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedSessionId, loading, sessions.length]);

  useEffect(() => {
    if (!sessions.length || !now) return;

    for (const session of sessions) {
      const remaining = getRemainingSeconds(session, now);
      const readyForFinalize =
        remaining === 0 && (session.status === "ACTIVE" || session.status === "PAUSED" || session.status === "ENDED");

      if (
        !readyForFinalize ||
        session.completedNotificationSentAt ||
        notificationInFlight.current.has(session.id)
      ) {
        continue;
      }

      notificationInFlight.current.add(session.id);
      void userFetch(`/api/sessions/${session.id}/notify-completed`, { method: "POST" })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || "Unable to send session notification.");
          }

          setSessions((current) =>
            current.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    completedNotificationSentAt:
                      item.completedNotificationSentAt || new Date().toISOString(),
                  }
                : item,
            ),
          );
        })
        .catch((error) => {
          console.error("Unable to send session completion notification", error);
        })
        .finally(() => {
          notificationInFlight.current.delete(session.id);
        });
    }
  }, [now, sessions]);

  const selectedTable = useMemo(() => {
    if (editingSession?.tableId === form.tableId) return editingSession.table;
    return availableTables.find((table) => table.id === form.tableId) || null;
  }, [availableTables, editingSession, form.tableId]);

  function openCreate() {
    setEditingSession(null);
    setForm({ ...emptyForm, tableId: availableTables[0]?.id || "" });
    setFormCustomerPendingAmount(0);
    setFormCustomerWalletBalance(0);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(session: GameSession) {
    setEditingSession(session);
    setForm(formFromSession(session));
    setFormCustomerPendingAmount(session.primaryCustomer.pendingAmount);
    setFormCustomerWalletBalance(session.primaryCustomer.walletBalance);
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
        setFormCustomerPendingAmount(Number(data.customer.pendingAmount || 0));
        setFormCustomerWalletBalance(Number(data.customer.walletBalance || 0));
      } else {
        setFormCustomerPendingAmount(0);
        setFormCustomerWalletBalance(0);
      }
    } catch {
      // The form remains usable for a new customer.
    }
  }

  async function lookupSplitCustomer(rowKey: string) {
    const row = splitRows.find((item) => item.key === rowKey);
    const mobile = row?.customerMobileNumber.replace(/\D/g, "").slice(-10) || "";

    if (mobile.length !== 10) return;

    try {
      const response = await userFetch(`/api/customers?mobile=${encodeURIComponent(mobile)}`, {
        cache: "no-store",
      });
      const data = await readJson(response);
      if (!data.customer) return;

      setSplitRows((rows) =>
        rows.map((item) =>
          item.key === rowKey
            ? {
                ...item,
                customerId: data.customer.id,
                customerName: data.customer.name,
                pendingAmount: Number(data.customer.pendingAmount || 0),
                walletBalance: Number(data.customer.walletBalance || 0),
              }
            : item,
        ),
      );
    } catch {
      // Split customer can still be created during finalization.
    }
  }

  async function updateSessionAddOn(sessionId: string, delta: number) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, addOnAmount: Math.max(0, session.addOnAmount + delta) }
          : session,
      ),
    );

    try {
      const response = await userFetch(`/api/sessions/${sessionId}/add-on`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await readJson(response);
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? { ...session, addOnAmount: Number(data.addOnAmount || 0) }
            : session,
        ),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update add-on amount.");
      await loadData(false);
    }
  }

  function addSessionAddOn(sessionId: string, amount: number) {
    void updateSessionAddOn(sessionId, amount);
  }

  function removeSessionAddOn(sessionId: string, amount: number) {
    void updateSessionAddOn(sessionId, -amount);
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
    const addOnTotal = session.addOnAmount || 0;
    const payableAmount = session.calculatedAmount + addOnTotal;

    setFinalizingSession(session);
    setPaymentType("FULL");
    setFullPaymentMode("CASH");
    setFullPaymentAmount(String(payableAmount));
    setOwnerResult("");
    setSplitRows([newSplitRow(session.primaryCustomer, String(payableAmount))]);
    setFinalizeError("");
  }

  const selectedFinalizeAddOnTotal = finalizingSession
    ? finalizingSession.addOnAmount || 0
    : 0;
  const baseFinalBill = finalizingSession
    ? finalizingSession.ownerPlaying && ownerResult === "OWNER_LOST"
      ? 0
      : finalizingSession.calculatedAmount
    : 0;
  const finalBill = finalizingSession
    ? finalizingSession.ownerPlaying && ownerResult === "OWNER_LOST"
      ? 0
      : baseFinalBill + selectedFinalizeAddOnTotal
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
      const paidAmount = Number(fullPaymentAmount);

      if (!Number.isFinite(paidAmount) || paidAmount < finalBill) {
        setFinalizeError(`Amount paid must be at least ${money(finalBill)}.`);
        return;
      }
      if (fullPaymentMode === "PENDING" && paidAmount !== finalBill) {
        setFinalizeError("Pending payment amount must match the final bill.");
        return;
      }

      players = [{ customerId: finalizingSession.primaryCustomer.id, splitAmount: finalBill }];
      payments = [
        {
          customerId: finalizingSession.primaryCustomer.id,
          mode: fullPaymentMode,
          amount: paidAmount,
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
        ...(row.customerId
          ? { customerId: row.customerId }
          : { customerName: row.customerName, customerMobileNumber: row.customerMobileNumber }),
        splitAmount: row.amount,
      }));
      payments = normalizedRows.map((row) => ({
        ...(row.customerId
          ? { customerId: row.customerId }
          : { customerName: row.customerName, customerMobileNumber: row.customerMobileNumber }),
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
          addOnAmount: selectedFinalizeAddOnTotal,
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
      <section className="-m-4 min-h-[calc(100vh-4rem)] border border-brand-green bg-white p-4 pb-24 rounded-[1.5rem] shadow-xs text-zinc-800 sm:-m-6 sm:p-6 sm:pb-28 lg:m-0 lg:min-h-[calc(100vh-8rem)] lg:p-6">
        <Button
          className="h-11 w-full rounded-[1.1rem] glass-btn-biscuit text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 sm:h-14 sm:rounded-[1.35rem] sm:text-base flex items-center justify-center gap-2"
          onClick={openCreate}
        >
          <Gamepad2 aria-hidden="true" strokeWidth={1.8} className="size-4.5 shrink-0" />
          New Session
        </Button>

        {actionError ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-55 px-4 py-3 text-sm font-semibold text-red-700 shadow-xs">
            {actionError}
          </p>
        ) : null}

        <div className="mt-4 sm:mt-8">
          <h2 className="text-base font-extrabold tracking-tight text-zinc-950 sm:text-xl">All Active Sessions</h2>
          <div className="mt-2 h-0.5 w-10 rounded-full bg-[#337418] sm:mt-3 sm:h-1 sm:w-12" />
        </div>

        <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-4">
          {loading ? (
            <div className="rounded-[1.35rem] border border-white/10 bg-[#202020]/80 p-8 text-center text-sm font-semibold text-white/60 shadow-sm backdrop-blur">
              Loading sessions...
            </div>
          ) : loadError ? (
            <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 p-8 text-center text-sm font-semibold text-red-200 shadow-sm">
              {loadError}
            </div>
          ) : sessions.length ? (
            sessions.map((session) => {
              const remaining = getRemainingSeconds(session, now);
              const canFinalize =
                session.status === "ENDED" ||
                (remaining === 0 &&
                  (session.status === "ACTIVE" || session.status === "PAUSED"));
              const gamesOrTime =
                session.pricingMode === "PER_GAME"
                  ? `${session.gameCount} game${session.gameCount === 1 ? "" : "s"}`
                  : `${Math.floor(session.plannedDurationMinutes / 60)}h ${session.plannedDurationMinutes % 60}m`;
              const selectedAmount = session.addOnAmount || 0;

              return (
                <article
                  id={`session-${session.id}`}
                  key={session.id}
                  className={`overflow-hidden rounded-[1.15rem] border-2 p-3.5 shadow-sm sm:rounded-[1.55rem] sm:p-5 transition-all duration-200 hover:shadow-md ${
                    highlightedSessionId === session.id
                      ? "border-[#337418] bg-[#337418]/5 ring-4 ring-[#337418]/15"
                      : canFinalize
                        ? "border-[#337418]/80 bg-white"
                        : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-extrabold shadow-sm sm:size-14 sm:text-lg bg-[#337418] text-[#F8F8F8]">
                        {session.primaryCustomer.name.slice(0, 1).toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-extrabold tracking-tight text-zinc-950 sm:text-xl">
                          {session.primaryCustomer.name}
                        </h2>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-zinc-500 sm:mt-1 sm:gap-2 sm:text-sm">
                          <DetailIcon name="phone" />
                          <span className="truncate">{session.primaryCustomer.mobileNumber}</span>
                        </div>
                        {session.primaryCustomer.pendingAmount > 0 ? (
                          <p className="mt-1 text-xs font-extrabold text-red-600">
                            Pending {money(session.primaryCustomer.pendingAmount)}
                          </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap gap-2 sm:mt-2">
                          {session.ownerPlaying ? (
                            <span className="inline-flex rounded-full border border-[#337418]/20 bg-[#337418]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#337418]">
                              Owner playing
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <details className="relative shrink-0 text-left">
                      <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 sm:size-10">
                        <DetailIcon name="more" />
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 grid min-w-36 rounded-xl border border-zinc-700 bg-[#18181b] p-1 shadow-xl text-white">
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#c4e0b0] hover:bg-white/10 disabled:opacity-40"
                          disabled={!["ACTIVE", "PAUSED"].includes(session.status)}
                          onClick={() => openEdit(session)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-400 hover:bg-white/10 disabled:opacity-40"
                          disabled={session.status === "COMPLETED" || busyId === session.id}
                          onClick={() => removeSession(session)}
                        >
                          Delete
                        </button>
                      </div>
                    </details>
                  </div>

                  <div className="mt-3 text-center sm:mt-6">
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#337418] sm:gap-2 sm:text-sm">
                      <DetailIcon name="time" />
                      Reverse Timer
                    </div>
                    <div className="mt-1 font-mono text-[clamp(2rem,10vw,2.75rem)] font-extrabold leading-none tracking-normal text-[#337418] tabular-nums sm:mt-2 sm:text-[clamp(2.6rem,13vw,4rem)]">
                      {formatTimer(remaining)}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-4 sm:mt-5 sm:pt-5">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <SessionDetail icon="game" label="Game / Type" value={formatPricingMode(session.pricingMode)} />
                      <SessionDetail icon="time" label="Games / Time" value={gamesOrTime} />
                    </div>

                    {addOns.length ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div className="grid grid-cols-7 gap-2">
                          {addOns.map((addOn) => (
                            <button
                              key={addOn.id}
                              type="button"
                              onClick={() => addSessionAddOn(session.id, addOn.amount)}
                              className="min-h-9 rounded-xl border border-[#337418]/20 bg-[#337418]/10 px-2 text-xs font-extrabold text-[#337418] transition hover:bg-[#337418]/15"
                              title={`Add ${money(addOn.amount)}`}
                            >
                              +{addOn.amount}
                            </button>
                          ))}
                        </div>
                        {selectedAmount > 0 ? (
                          <div className="rounded-2xl border border-[#337418]/20 bg-[#337418]/10 p-3 text-[#337418] lg:min-w-56">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-wide opacity-70">
                                  Add-on Amount
                                </p>
                                <p className="mt-1 text-lg font-extrabold">{money(selectedAmount)}</p>
                              </div>
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {addOns.map((addOn) => (
                                  <button
                                    key={addOn.id}
                                    type="button"
                                    onClick={() => removeSessionAddOn(session.id, addOn.amount)}
                                    className="grid size-8 place-items-center rounded-full border border-red-200 bg-white text-xs font-extrabold text-red-600 transition hover:bg-red-50"
                                    title={`Minus ${money(addOn.amount)}`}
                                    aria-label={`Minus ${money(addOn.amount)} add-on`}
                                  >
                                    -{addOn.amount}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 sm:mt-5">
                      {canFinalize ? (
                        <Button
                          className="h-10 w-full rounded-2xl glass-btn-biscuit text-sm font-extrabold shadow-xs transition hover:-translate-y-0.5 sm:h-14 sm:text-base flex items-center justify-center gap-2"
                          onClick={() => openFinalize(session)}
                        >
                          <DetailIcon name="check" />
                          Finalise Session
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                        {session.status === "ACTIVE" && remaining > 0 ? (
                          <Button
                            size="sm"
                            className="h-10 rounded-2xl glass-btn-white text-sm font-extrabold shadow-xs hover:-translate-y-0.5 sm:h-[3.25rem] sm:text-base flex items-center justify-center gap-2"
                            disabled={busyId === session.id}
                            onClick={() => runAction(session, "pause")}
                          >
                            <DetailIcon name="pause" />
                            Pause
                          </Button>
                        ) : session.status === "PAUSED" && remaining > 0 ? (
                          <Button
                            size="sm"
                            className="h-10 rounded-2xl glass-btn-white text-sm font-extrabold shadow-xs hover:-translate-y-0.5 sm:h-[3.25rem] sm:text-base flex items-center justify-center gap-2"
                            disabled={busyId === session.id}
                            onClick={() => runAction(session, "resume")}
                          >
                            <DetailIcon name="pause" />
                            Resume
                          </Button>
                        ) : null}
                        {["ACTIVE", "PAUSED"].includes(session.status) && remaining > 0 ? (
                          <Button
                            size="sm"
                            className="h-10 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 text-sm font-extrabold shadow-xs hover:-translate-y-0.5 sm:h-[3.25rem] sm:text-base flex items-center justify-center gap-2"
                            disabled={busyId === session.id}
                            onClick={() => runAction(session, "end")}
                          >
                            <DetailIcon name="stop" />
                            Stop
                          </Button>
                        ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[1.35rem] border border-zinc-200 bg-white p-8 text-center shadow-xs">
              <p className="text-base font-bold text-zinc-800">No sessions found.</p>
              <p className="mt-2 text-sm text-zinc-400 font-medium font-semibold">
                Create the first session from an available table.
              </p>
              <Button
                className="mt-5 h-11 rounded-xl glass-btn-biscuit px-5 font-bold"
                onClick={openCreate}
              >
                <Plus aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
                New Session
              </Button>
            </div>
          )}
        </div>
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid items-end overflow-y-auto bg-zinc-950/55 px-0 backdrop-blur-sm sm:place-items-center sm:px-4">
          <div className="max-h-[92dvh] w-full overflow-hidden rounded-t-[1.75rem] border border-zinc-200 bg-white shadow-2xl sm:my-6 sm:max-w-xl sm:rounded-[1.5rem]">
            <div className="flex items-start justify-between gap-4 bg-[#202020] p-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#337418]">
                  Session details
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-normal">
                  {editingSession ? "Edit Session" : "Create New Session"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Only currently available tables can start a new session.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFormOpen(false)}
                aria-label="Close"
                className="rounded-xl text-white hover:bg-white/15 hover:text-white"
              >
                <X aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              </Button>
            </div>

            <form className="grid max-h-[calc(92dvh-8rem)] gap-5 overflow-y-auto bg-[#F8F8F8] p-5 sm:p-6" onSubmit={saveSession}>
              <label className="grid gap-2 text-sm font-bold text-[#202020]">
                Customer Mobile Number
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.customerMobileNumber}
                  onChange={(event) =>
                    {
                      const customerMobileNumber = event.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm({ ...form, customerMobileNumber });
                      if (customerMobileNumber.length !== 10) {
                        setFormCustomerPendingAmount(0);
                        setFormCustomerWalletBalance(0);
                      }
                    }
                  }
                  onBlur={lookupCustomer}
                  className={fieldClass}
                  placeholder="9876543210"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#202020]">
                Customer Name
                <input
                  value={form.customerName}
                  onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                  className={fieldClass}
                  placeholder="Customer name"
                  required
                />
                {formCustomerPendingAmount > 0 ? (
                  <span className="text-xs font-extrabold text-red-600">
                    Pending amount {money(formCustomerPendingAmount)}
                  </span>
                ) : null}
                {formCustomerWalletBalance > 0 ? (
                  <span className="text-xs font-semibold text-emerald-700">
                    Advance amount {money(formCustomerWalletBalance)}
                  </span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#202020]">
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
                  <legend className="text-sm font-bold text-[#202020]">Session Time</legend>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                    <label className="grid gap-2 text-sm font-semibold text-[#202020]">
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
                    <label className="grid gap-2 text-sm font-semibold text-[#202020]">
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
                <label className="grid gap-2 text-sm font-bold text-[#202020]">
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

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-bold text-[#202020]">
                <input
                  type="checkbox"
                  checked={form.ownerPlaying}
                  onChange={(event) => setForm({ ...form, ownerPlaying: event.target.checked })}
                  className="size-4 accent-[#337418]"
                />
                Is Owner Playing?
              </label>

              {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="h-12 rounded-2xl" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-12 rounded-2xl bg-[#337418] font-bold text-white hover:bg-[#337418]"
                >
                  {saving ? "Saving..." : editingSession ? "Update Session" : "Save & Start Session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {finalizingSession ? (
        <div className="fixed inset-0 z-50 grid items-end overflow-y-auto bg-zinc-950/55 px-0 backdrop-blur-sm sm:place-items-center sm:px-4">
          <div className="max-h-[92dvh] w-full overflow-hidden rounded-t-[1.75rem] border border-zinc-200 bg-white shadow-2xl sm:my-6 sm:max-w-2xl sm:rounded-[1.5rem]">
            <div className="flex items-start justify-between gap-4 bg-[#202020] p-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#337418]">
                  Payment
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-normal">Finalise Bill</h2>
                <p className="mt-1 text-sm text-white/70">
                  {finalizingSession.table.name} · {finalizingSession.primaryCustomer.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFinalizingSession(null)}
                aria-label="Close"
                className="rounded-xl text-white hover:bg-white/15 hover:text-white"
              >
                <X aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              </Button>
            </div>

            <form className="grid max-h-[calc(92dvh-8rem)] gap-5 overflow-y-auto bg-[#F8F8F8] p-5 sm:p-6" onSubmit={completeFinalization}>
              {finalizingSession.ownerPlaying ? (
                <fieldset className="grid gap-3 rounded-2xl border border-[#337418]/20 bg-[#337418]/10 p-4">
                  <legend className="px-1 text-sm font-bold text-[#337418]">Did the owner win?</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-xl border border-[#337418]/20 bg-white p-3 text-sm font-semibold">
                      <input
                        type="radio"
                        name="ownerResult"
                        value="OWNER_WON"
                        checked={ownerResult === "OWNER_WON"}
                        onChange={() => {
                          setOwnerResult("OWNER_WON");
                          setFullPaymentAmount(String(finalizingSession.calculatedAmount + selectedFinalizeAddOnTotal));
                        }}
                      />
                      Yes, customer pays
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-[#337418]/20 bg-white p-3 text-sm font-semibold">
                      <input
                        type="radio"
                        name="ownerResult"
                        value="OWNER_LOST"
                        checked={ownerResult === "OWNER_LOST"}
                        onChange={() => {
                          setOwnerResult("OWNER_LOST");
                          setFullPaymentAmount("0");
                        }}
                      />
                      No, owner pays
                    </label>
                  </div>
                </fieldset>
              ) : null}

              <div className="flex items-center justify-between rounded-2xl bg-[#202020] p-5 text-white shadow-lg shadow-zinc-950/10">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#337418]">
                    Final bill
                  </span>
                  <p className="mt-1 text-xs text-slate-300">
                    Base {money(baseFinalBill)}
                    {selectedFinalizeAddOnTotal > 0 ? ` + add-on ${money(selectedFinalizeAddOnTotal)}` : ""}
                  </p>
                  {finalizingSession.primaryCustomer.pendingAmount > 0 ? (
                    <p className="mt-2 text-xs font-extrabold text-red-300">
                      Pending amount {money(finalizingSession.primaryCustomer.pendingAmount)}
                    </p>
                  ) : null}
                </div>
                <span className="text-3xl font-bold tracking-tight">{money(finalBill)}</span>
              </div>

              {finalBill > 0 ? (
                <>
                  <fieldset className="grid gap-3">
                    <legend className="text-sm font-semibold text-zinc-700">Payment Type</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold">
                        <input
                          type="radio"
                          name="paymentType"
                          checked={paymentType === "FULL"}
                          onChange={() => setPaymentType("FULL")}
                        />
                        Full Payment
                      </label>
                      <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold">
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-zinc-700">
                        Amount Paid
                        <input
                          type="number"
                          min={finalBill}
                          value={fullPaymentAmount}
                          onChange={(event) => setFullPaymentAmount(event.target.value)}
                          className={fieldClass}
                        />
                        {Number(fullPaymentAmount) > finalBill ? (
                          <span className="text-xs font-normal text-emerald-700">
                            Extra payment clears pending first, then becomes advance.
                          </span>
                        ) : null}
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-zinc-700">
                        Payment Method
                        <select
                          value={fullPaymentMode}
                          onChange={(event) => {
                            const mode = event.target.value as PaymentMode;
                            setFullPaymentMode(mode);
                            if (mode === "PENDING") {
                              setFullPaymentAmount(String(finalBill));
                            }
                          }}
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
                    </div>
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
                          <Plus aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
                          Add Customer
                        </Button>
                      </div>

                      {splitRows.map((row, index) => (
                        <div
                          key={row.key}
                          className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
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
                                onBlur={() => lookupSplitCustomer(row.key)}
                                onChange={(event) =>
                                  setSplitRows(
                                    splitRows.map((item) =>
                                      item.key === row.key
                                        ? {
                                            ...item,
                                            customerId: undefined,
                                            pendingAmount: 0,
                                            walletBalance: 0,
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
                              {row.pendingAmount > 0 ? (
                                <span className="text-xs font-extrabold text-red-600">
                                  Pending amount {money(row.pendingAmount)}
                                </span>
                              ) : null}
                              {row.walletBalance > 0 ? (
                                <span className="text-xs font-semibold text-emerald-700">
                                  Advance amount {money(row.walletBalance)}
                                </span>
                              ) : null}
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

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 rounded-2xl" onClick={() => setFinalizingSession(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={finalizeSaving}
                  className="h-12 rounded-2xl bg-[#337418] font-bold text-white hover:bg-[#337418]"
                >
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

import { normalizeMobile } from "@/lib/controllers/customer.controller";
import {
  endSession,
  finalizeSession,
  getSession,
  listSessionHistory,
  listSessions,
  notifySessionCompleted,
  pauseSession,
  resumeSession,
  SessionModelError,
  startSession,
  updateSession,
  updateSessionAddOnAmount,
  deleteSession,
  type FinalizeSessionPayload,
  type SessionPaymentInput,
  type SessionPlayerInput,
} from "@/lib/models/session.model";

type StartSessionInput = {
  customerName?: string;
  customerMobileNumber?: string;
  tableId?: string;
  durationMinutes?: number;
  gameCount?: number;
  ownerPlaying?: boolean;
};

type FinalizeSessionInput = {
  ownerResult?: string | null;
  players?: Array<{
    customerId?: string;
    customerName?: string;
    customerMobileNumber?: string;
    splitAmount?: number;
  }>;
  payments?: Array<{
    customerId?: string;
    customerName?: string;
    customerMobileNumber?: string;
    mode?: string;
    amount?: number;
  }>;
  addOnAmount?: number;
  extraPaymentAction?: string | null;
  extraAmount?: number;
};

function normalizeAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : NaN;
}

function handleSessionError(error: unknown, fallback: string) {
  if (error instanceof SessionModelError) {
    return { ok: false as const, status: error.status, message: error.message };
  }

  console.error(fallback, error);

  return {
    ok: false as const,
    status: 500,
    message: fallback,
    ...(process.env.NODE_ENV === "development" && error instanceof Error
      ? { detail: error.message }
      : {}),
  };
}

function normalizeStartInput(input: StartSessionInput) {
  const customerName = String(input.customerName ?? "").trim();
  const customerMobileNumber = normalizeMobile(String(input.customerMobileNumber ?? ""));
  const tableId = String(input.tableId ?? "").trim();
  const durationMinutes = normalizeAmount(input.durationMinutes);
  const gameCount = normalizeAmount(input.gameCount);

  if (!customerName) {
    return { ok: false as const, status: 400, message: "Customer name is required." };
  }

  if (customerMobileNumber.length !== 10) {
    return { ok: false as const, status: 400, message: "Enter a valid mobile number." };
  }

  if (!tableId) {
    return { ok: false as const, status: 400, message: "Select a table." };
  }

  if (input.durationMinutes !== undefined && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
    return { ok: false as const, status: 400, message: "Select a valid duration." };
  }

  if (input.gameCount !== undefined && (!Number.isFinite(gameCount) || gameCount <= 0)) {
    return { ok: false as const, status: 400, message: "Enter a valid number of games." };
  }

  return {
    ok: true as const,
    data: {
      customerName,
      customerMobileNumber,
      tableId,
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
      gameCount: Number.isFinite(gameCount) ? gameCount : null,
      ownerPlaying: Boolean(input.ownerPlaying),
    },
  };
}

function normalizeFinalizeInput(input: FinalizeSessionInput) {
  const ownerResult =
    input.ownerResult === "OWNER_WON" || input.ownerResult === "OWNER_LOST" ? input.ownerResult : null;
  const addOnAmount = normalizeAmount(input.addOnAmount || 0);
  const extraPaymentAction = input.extraPaymentAction === "WALLET" ? "WALLET" : null;
  const extraAmount = normalizeAmount(input.extraAmount || 0);
  const players: SessionPlayerInput[] = [];
  const payments: SessionPaymentInput[] = [];

  for (const player of input.players ?? []) {
    const customerId = String(player.customerId ?? "").trim();
    const customerName = String(player.customerName ?? "").trim();
    const customerMobileNumber = normalizeMobile(String(player.customerMobileNumber ?? ""));
    const splitAmount = normalizeAmount(player.splitAmount);

    if (
      (!customerId && (!customerName || customerMobileNumber.length !== 10)) ||
      !Number.isFinite(splitAmount) ||
      splitAmount < 0
    ) {
      return { ok: false as const, status: 400, message: "Enter valid player split details." };
    }

    players.push({
      ...(customerId ? { customerId } : { customerName, customerMobileNumber }),
      splitAmount,
    });
  }

  for (const payment of input.payments ?? []) {
    const customerId = String(payment.customerId ?? "").trim();
    const customerName = String(payment.customerName ?? "").trim();
    const customerMobileNumber = normalizeMobile(String(payment.customerMobileNumber ?? ""));
    const amount = normalizeAmount(payment.amount);
    const mode = String(payment.mode ?? "");

    if (!["CASH", "UPI", "WALLET", "PENDING"].includes(mode)) {
      return { ok: false as const, status: 400, message: "Select a valid payment mode." };
    }

    if (
      (!customerId && (!customerName || customerMobileNumber.length !== 10)) ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return { ok: false as const, status: 400, message: "Enter valid payment details." };
    }

    payments.push({
      customerId,
      customerName,
      customerMobileNumber,
      mode: mode as SessionPaymentInput["mode"],
      amount,
    });
  }

  if (!Number.isFinite(extraAmount) || extraAmount < 0) {
    return { ok: false as const, status: 400, message: "Enter a valid extra amount." };
  }

  if (!Number.isFinite(addOnAmount) || addOnAmount < 0) {
    return { ok: false as const, status: 400, message: "Enter a valid add-on amount." };
  }

  return {
    ok: true as const,
    data: {
      ownerResult,
      players,
      payments,
      addOnAmount,
      extraPaymentAction,
      extraAmount,
    } satisfies FinalizeSessionPayload,
  };
}

export async function listSessionsForUser(ownerId: string, status?: string | null) {
  const sessions = await listSessions(ownerId, status);
  return { ok: true as const, sessions };
}

export async function listSessionHistoryForUser(
  ownerId: string,
  input: {
    customerName?: string | null;
    mobileNumber?: string | null;
    date?: string | null;
  },
) {
  const customerName = String(input.customerName ?? "").trim();
  const mobileNumber = String(input.mobileNumber ?? "").replace(/\D/g, "").slice(0, 10);
  const date = String(input.date ?? "").trim();
  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  if (date) {
    const parsed = new Date(`${date}T00:00:00+05:30`);

    if (Number.isNaN(parsed.getTime())) {
      return { ok: false as const, status: 400, message: "Select a valid history date." };
    }

    dateFrom = parsed;
    dateTo = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
  }

  const sessions = await listSessionHistory(ownerId, {
    customerName: customerName || undefined,
    mobileNumber: mobileNumber || undefined,
    dateFrom,
    dateTo,
  });

  return { ok: true as const, sessions };
}

export async function getSessionForUser(ownerId: string, id: string) {
  const session = await getSession(ownerId, id);

  if (!session) {
    return { ok: false as const, status: 404, message: "Session not found." };
  }

  return { ok: true as const, session };
}

export async function startSessionForUser(ownerId: string, input: StartSessionInput) {
  const normalized = normalizeStartInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const session = await startSession(ownerId, normalized.data);
    return { ok: true as const, session };
  } catch (error) {
    return handleSessionError(error, "Unable to start session.");
  }
}

export async function pauseSessionForUser(ownerId: string, id: string) {
  try {
    const session = await pauseSession(ownerId, id);
    return { ok: true as const, session };
  } catch (error) {
    return handleSessionError(error, "Unable to pause session.");
  }
}

export async function updateSessionForUser(ownerId: string, id: string, input: StartSessionInput) {
  const normalized = normalizeStartInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const session = await updateSession(ownerId, id, normalized.data);
    return { ok: true as const, session };
  } catch (error) {
    return handleSessionError(error, "Unable to update session.");
  }
}

export async function updateSessionAddOnForUser(ownerId: string, id: string, deltaInput: unknown) {
  const delta = normalizeAmount(deltaInput);

  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false as const, status: 400, message: "Enter a valid add-on amount." };
  }

  try {
    const session = await updateSessionAddOnAmount(ownerId, id, delta);

    if (!session) {
      return { ok: false as const, status: 404, message: "Session not found." };
    }

    return { ok: true as const, addOnAmount: session.addOnAmount };
  } catch (error) {
    return handleSessionError(error, "Unable to update add-on amount.");
  }
}

export async function notifySessionCompletedForUser(ownerId: string, id: string) {
  try {
    const result = await notifySessionCompleted(ownerId, id);
    return { ok: true as const, ...result };
  } catch (error) {
    return handleSessionError(error, "Unable to send session notification.");
  }
}

export async function deleteSessionForUser(ownerId: string, id: string) {
  try {
    await deleteSession(ownerId, id);
    return { ok: true as const };
  } catch (error) {
    return handleSessionError(error, "Unable to delete session.");
  }
}

export async function resumeSessionForUser(ownerId: string, id: string) {
  try {
    const session = await resumeSession(ownerId, id);
    return { ok: true as const, session };
  } catch (error) {
    return handleSessionError(error, "Unable to resume session.");
  }
}

export async function endSessionForUser(ownerId: string, id: string) {
  try {
    const session = await endSession(ownerId, id);
    return { ok: true as const, session };
  } catch (error) {
    return handleSessionError(error, "Unable to end session.");
  }
}

export async function finalizeSessionForUser(ownerId: string, id: string, input: FinalizeSessionInput) {
  const normalized = normalizeFinalizeInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const session = await finalizeSession(ownerId, id, normalized.data);
    return { ok: true as const, session };
  } catch (error) {
    return handleSessionError(error, "Unable to finalize session.");
  }
}

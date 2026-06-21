import {
  createCustomer,
  findCustomerByMobile,
  listCustomers,
  getCustomerProfile,
  payCustomerPending,
  upsertCustomerByMobile,
  type CustomerPayload,
} from "@/lib/models/customer.model";

type CustomerInput = {
  name?: string;
  mobileNumber?: string;
};

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function normalizeCustomerInput(input: CustomerInput, requireName: boolean) {
  const name = String(input.name ?? "").trim();
  const mobileNumber = normalizeMobile(String(input.mobileNumber ?? ""));

  if (mobileNumber.length !== 10) {
    return { ok: false as const, status: 400, message: "Enter a valid mobile number." };
  }

  if (requireName && !name) {
    return { ok: false as const, status: 400, message: "Customer name is required." };
  }

  return {
    ok: true as const,
    data: { name, mobileNumber } satisfies CustomerPayload,
  };
}

function getPrismaErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

export async function searchCustomerForUser(ownerId: string, mobileNumberInput: string) {
  const normalized = normalizeCustomerInput({ mobileNumber: mobileNumberInput }, false);

  if (!normalized.ok) {
    return normalized;
  }

  const customer = await findCustomerByMobile(ownerId, normalized.data.mobileNumber);
  return { ok: true as const, customer };
}

export async function listCustomersForUser(ownerId: string, search?: string | null) {
  const customers = await listCustomers(ownerId, String(search ?? "").slice(0, 100));
  return { ok: true as const, customers };
}

export async function createCustomerForUser(ownerId: string, input: CustomerInput) {
  const normalized = normalizeCustomerInput(input, true);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const customer = await createCustomer(ownerId, normalized.data);
    return { ok: true as const, customer };
  } catch (error) {
    if (getPrismaErrorCode(error) === "P2002") {
      return { ok: false as const, status: 409, message: "Customer already exists." };
    }

    return { ok: false as const, status: 500, message: "Unable to create customer." };
  }
}

export async function upsertCustomerForUser(ownerId: string, input: CustomerInput) {
  const normalized = normalizeCustomerInput(input, true);

  if (!normalized.ok) {
    return normalized;
  }

  const customer = await upsertCustomerByMobile(ownerId, normalized.data);
  return { ok: true as const, customer };
}

export async function payCustomerPendingForUser(
  ownerId: string,
  customerId: string,
  amountInput: unknown,
) {
  const amount = Math.round(Number(amountInput));

  if (!customerId) {
    return { ok: false as const, status: 400, message: "Customer is required." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, status: 400, message: "Enter a valid payment amount." };
  }

  const customer = await payCustomerPending(ownerId, customerId, amount);

  if (!customer) {
    return {
      ok: false as const,
      status: 400,
      message: "Payment amount cannot be more than the pending amount.",
    };
  }

  return { ok: true as const, pendingAmount: customer.pendingAmount };
}

export async function getCustomerProfileForUser(ownerId: string, customerId: string) {
  const customer = await getCustomerProfile(ownerId, customerId);

  if (!customer) {
    return { ok: false as const, status: 404, message: "Customer not found." };
  }

  const totalPendingCreated = customer.pendingEntries
    .filter((entry) => entry.type === "CREATED")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalPendingPaid = customer.pendingEntries
    .filter((entry) => entry.type === "PAID")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalPaid =
    customer.payments
      .filter((payment) => payment.mode !== "PENDING")
      .reduce((sum, payment) => sum + payment.amount, 0) + totalPendingPaid;

  return {
    ok: true as const,
    customer: {
      id: customer.id,
      name: customer.name,
      mobileNumber: customer.mobileNumber,
      pendingAmount: customer.pendingAmount,
      walletBalance: customer.walletBalance,
      createdAt: customer.createdAt,
      metrics: {
        gamesPlayed: customer.players.reduce(
          (sum, player) =>
            sum +
            (player.session.pricingMode === "PER_GAME"
              ? player.session.gameCount
              : 1),
          0,
        ),
        sessionsPlayed: customer.players.length,
        totalPaid,
        totalPendingCreated,
        totalPendingPaid,
      },
      sessions: customer.players.map((player) => ({
        ...player.session,
        customerShare: player.splitAmount,
      })),
      payments: customer.payments,
      pendingEntries: customer.pendingEntries,
    },
  };
}

export { normalizeMobile };

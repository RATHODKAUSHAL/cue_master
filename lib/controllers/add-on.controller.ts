import { createAddOnAmount, listAddOnAmounts } from "@/lib/models/add-on.model";

function getPrismaErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function normalizeAmount(input: unknown) {
  const amount = Math.round(Number(input));
  return Number.isFinite(amount) ? amount : NaN;
}

function getDatabaseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export async function listAddOnsForUser(ownerId: string) {
  const addOns = await listAddOnAmounts(ownerId);
  return { ok: true as const, addOns };
}

export async function createAddOnForUser(ownerId: string, input: unknown) {
  const amount = normalizeAmount(input);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, status: 400, message: "Enter a valid add-on amount." };
  }

  try {
    const rows = await createAddOnAmount(ownerId, amount);
    const addOn = rows[0];

    if (!addOn) {
      return { ok: false as const, status: 409, message: "This add-on amount already exists." };
    }

    return { ok: true as const, addOn };
  } catch (error) {
    const message = getDatabaseErrorMessage(error);

    if (getPrismaErrorCode(error) === "P2002" || message.includes("add_on_amounts_ownerId_amount_key")) {
      return { ok: false as const, status: 409, message: "This add-on amount already exists." };
    }

    console.error("Unable to create add-on amount", error);
    return { ok: false as const, status: 500, message: "Unable to create add-on amount." };
  }
}

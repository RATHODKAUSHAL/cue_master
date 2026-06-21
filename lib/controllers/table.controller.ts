import {
  createTable,
  deleteTable,
  listAvailableTables,
  listTables,
  updateTable,
  type TablePayload,
} from "@/lib/models/table.model";

type TableInput = {
  name: string;
  category: string;
  pricingMode: string;
  price: number;
  durationHours?: number;
  durationMinutes?: number;
};

function getPrismaErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function isUniqueConstraintError(error: unknown) {
  return getPrismaErrorCode(error) === "P2002";
}

function isRecordNotFoundError(error: unknown) {
  return getPrismaErrorCode(error) === "P2025";
}

function normalizeTableInput(input: TableInput) {
  const name = input.name.trim();
  const category = input.category === "SNOOKER" ? "SNOOKER" : "POOL";
  const pricingMode = input.pricingMode === "PER_GAME" ? "PER_GAME" : "PER_HOUR";
  const price = Number(input.price);
  const hours = Number(input.durationHours || 0);
  const minutes = Number(input.durationMinutes || 0);
  const durationMinutes = pricingMode === "PER_GAME" ? hours * 60 + minutes : null;

  if (!name) {
    return { ok: false as const, status: 400, message: "Table name is required." };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false as const, status: 400, message: "Enter a valid table price." };
  }

  if (pricingMode === "PER_GAME" && (!Number.isInteger(hours) || hours < 0 || hours > 24)) {
    return { ok: false as const, status: 400, message: "Enter a valid hour value." };
  }

  if (
    pricingMode === "PER_GAME" &&
    (!Number.isInteger(minutes) || minutes < 0 || minutes > 59)
  ) {
    return { ok: false as const, status: 400, message: "Enter minutes between 0 and 59." };
  }

  if (pricingMode === "PER_GAME" && (!durationMinutes || durationMinutes <= 0)) {
    return {
      ok: false as const,
      status: 400,
      message: "Enter how long one game lasts.",
    };
  }

  return {
    ok: true as const,
    data: {
      name,
      category,
      pricingMode,
      price: Math.round(price),
      durationMinutes,
    } satisfies TablePayload,
  };
}

export async function getTablesForUser(ownerId: string) {
  return listTables(ownerId);
}

export async function getAvailableTablesForUser(ownerId: string) {
  return listAvailableTables(ownerId);
}

export async function createTableForUser(ownerId: string, input: TableInput) {
  const normalized = normalizeTableInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const table = await createTable(ownerId, normalized.data);
    return { ok: true as const, table };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false as const, status: 409, message: "A table with this name already exists." };
    }

    return { ok: false as const, status: 500, message: "Unable to create table." };
  }
}

export async function updateTableForUser(ownerId: string, id: string, input: TableInput) {
  const normalized = normalizeTableInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const table = await updateTable(ownerId, id, normalized.data);
    return { ok: true as const, table };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false as const, status: 409, message: "A table with this name already exists." };
    }

    if (!isRecordNotFoundError(error)) {
      return { ok: false as const, status: 500, message: "Unable to update table." };
    }

    return { ok: false as const, status: 404, message: "Table not found." };
  }
}

export async function deleteTableForUser(ownerId: string, id: string) {
  try {
    await deleteTable(ownerId, id);
    return { ok: true as const };
  } catch (error) {
    if (!isRecordNotFoundError(error)) {
      return { ok: false as const, status: 500, message: "Unable to delete table." };
    }

    return { ok: false as const, status: 404, message: "Table not found." };
  }
}

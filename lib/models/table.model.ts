import { prisma } from "@/lib/prisma";

export type TablePayload = {
  name: string;
  category: "POOL" | "SNOOKER";
  pricingMode: "PER_HOUR" | "PER_GAME";
  price: number;
  durationMinutes?: number | null;
};

export class TableModelError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TableModelError";
  }
}

export function listTables(ownerId: string) {
  return prisma.venueTable.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

export function listAvailableTables(ownerId: string) {
  return prisma.venueTable.findMany({
    where: {
      ownerId,
      status: "AVAILABLE",
    },
    orderBy: { createdAt: "desc" },
  });
}

export function createTable(ownerId: string, data: TablePayload) {
  return prisma.venueTable.create({
    data: {
      ownerId,
      name: data.name,
      category: data.category,
      pricingMode: data.pricingMode,
      price: data.price,
      durationMinutes: data.durationMinutes,
      status: "AVAILABLE",
    },
  });
}

export function updateTable(ownerId: string, id: string, data: TablePayload) {
  return prisma.venueTable.update({
    where: {
      id_ownerId: { id, ownerId },
    },
    data: {
      name: data.name,
      category: data.category,
      pricingMode: data.pricingMode,
      price: data.price,
      durationMinutes: data.durationMinutes,
    },
  });
}

export function deleteTable(ownerId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.venueTable.findUnique({
      where: {
        id_ownerId: { id, ownerId },
      },
      select: {
        id: true,
        status: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!table) {
      throw new TableModelError("Table not found.", 404);
    }

    if (table.status === "OCCUPIED") {
      throw new TableModelError(
        "This table has an active session. Finalise or delete the session before deleting the table.",
        409,
      );
    }

    if (table._count.sessions > 0) {
      throw new TableModelError(
        "This table is linked to session history and cannot be deleted.",
        409,
      );
    }

    return tx.venueTable.delete({
      where: {
        id_ownerId: { id, ownerId },
      },
    });
  });
}

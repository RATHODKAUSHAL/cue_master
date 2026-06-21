import { prisma } from "@/lib/prisma";

export type TablePayload = {
  name: string;
  category: "POOL" | "SNOOKER";
  pricingMode: "PER_HOUR" | "PER_GAME";
  price: number;
  durationMinutes?: number | null;
};

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
  return prisma.venueTable.delete({
    where: {
      id_ownerId: { id, ownerId },
    },
  });
}

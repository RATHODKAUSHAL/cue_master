import { prisma } from "@/lib/prisma";

export async function getAdminAnalytics(userId?: string | null) {
  const userFilter = userId ? { ownerId: userId } : {};
  const [totalUsers, totalGames, totalCustomers, users] = await Promise.all([
    prisma.user.count(),
    prisma.gameSession.count({ where: userFilter }),
    prisma.customer.count({ where: userFilter }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { totalUsers, totalGames, totalCustomers, users, selectedUserId: userId || "" };
}

export function listAdminUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      mobileNumber: true,
      createdAt: true,
      _count: { select: { customers: true, sessions: true, tables: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAdminUser(id: string, data: { name: string; email: string; mobileNumber: string }) {
  return prisma.user.update({
    where: { id },
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      mobileNumber: data.mobileNumber.replace(/\D/g, "").slice(-10),
    },
  });
}

export function deleteAdminUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

export async function listAdminCustomers() {
  const customers = await prisma.customer.findMany({
    include: {
      owner: { select: { name: true, mobileNumber: true } },
      players: {
        where: { session: { status: "COMPLETED" } },
        select: { splitAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    mobileNumber: customer.mobileNumber,
    userName: customer.owner.name,
    userMobileNumber: customer.owner.mobileNumber,
    totalSpent: customer.players.reduce((sum, player) => sum + player.splitAmount, 0),
    pendingAmount: customer.pendingAmount,
  }));
}

export function updateAdminCustomer(id: string, data: { name: string; mobileNumber: string }) {
  return prisma.customer.update({
    where: { id },
    data: {
      name: data.name.trim(),
      mobileNumber: data.mobileNumber.replace(/\D/g, "").slice(-10),
    },
  });
}

export function deleteAdminCustomer(id: string) {
  return prisma.customer.delete({ where: { id } });
}

export async function listAdminGames() {
  const games = await prisma.gameSession.findMany({
    select: {
      id: true,
      status: true,
      calculatedAmount: true,
      finalAmount: true,
      createdAt: true,
      finalizedAt: true,
      table: { select: { name: true, category: true } },
      primaryCustomer: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return games.map((game) => ({
    id: game.id,
    gameName: `${game.table.category === "POOL" ? "Pool" : "Snooker"} Game`,
    tableName: game.table.name,
    customerName: game.primaryCustomer.name,
    userName: game.owner.name,
    amount: game.finalAmount ?? game.calculatedAmount,
    status: game.status,
    date: game.finalizedAt ?? game.createdAt,
  }));
}

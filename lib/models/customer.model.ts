import { prisma } from "@/lib/prisma";

export type CustomerPayload = {
  name: string;
  mobileNumber: string;
};

export function findCustomerByMobile(ownerId: string, mobileNumber: string) {
  return prisma.customer.findUnique({
    where: {
      ownerId_mobileNumber: {
        ownerId,
        mobileNumber,
      },
    },
  });
}

export function listCustomers(ownerId: string, search?: string) {
  const normalizedSearch = search?.trim();
  const mobileSearch = normalizedSearch?.replace(/\D/g, "");

  return prisma.customer.findMany({
    where: {
      ownerId,
      ...(normalizedSearch
        ? {
            OR: [
              {
                name: {
                  contains: normalizedSearch,
                  mode: "insensitive" as const,
                },
              },
              ...(mobileSearch
                ? [
                    {
                      mobileNumber: {
                        contains: mobileSearch,
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    },
    include: {
      pendingEntries: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });
}

export function createCustomer(ownerId: string, data: CustomerPayload) {
  return prisma.customer.create({
    data: {
      ownerId,
      name: data.name,
      mobileNumber: data.mobileNumber,
    },
  });
}

export function upsertCustomerByMobile(ownerId: string, data: CustomerPayload) {
  return prisma.customer.upsert({
    where: {
      ownerId_mobileNumber: {
        ownerId,
        mobileNumber: data.mobileNumber,
      },
    },
    update: {
      name: data.name,
    },
    create: {
      ownerId,
      name: data.name,
      mobileNumber: data.mobileNumber,
    },
  });
}

export async function payCustomerPending(ownerId: string, customerId: string, amount: number) {
  const rows = await prisma.$queryRaw<Array<{ pendingAmount: number }>>`
    WITH updated_customer AS (
      UPDATE customers
      SET
        "pendingAmount" = "pendingAmount" - ${amount},
        "updatedAt" = NOW()
      WHERE id = ${customerId}
        AND "ownerId" = ${ownerId}
        AND "pendingAmount" >= ${amount}
      RETURNING id, "pendingAmount"
    ),
    ledger AS (
      INSERT INTO pending_ledger (
        id, "ownerId", "customerId", "sessionId",
        type, amount, note, "createdAt"
      )
      SELECT
        'l' || md5(random()::text || clock_timestamp()::text || id),
        ${ownerId},
        id,
        NULL,
        'PAID',
        ${amount},
        'Pending amount paid',
        NOW()
      FROM updated_customer
      RETURNING id
    )
    SELECT "pendingAmount"
    FROM updated_customer
    WHERE (SELECT COUNT(*) FROM ledger) = 1
  `;

  return rows[0] || null;
}

export function getCustomerProfile(ownerId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, ownerId },
    select: {
      id: true,
      name: true,
      mobileNumber: true,
      pendingAmount: true,
      walletBalance: true,
      createdAt: true,
      players: {
        where: { session: { status: "COMPLETED" } },
        select: {
          splitAmount: true,
          session: {
            select: {
              id: true,
              pricingMode: true,
              gameCount: true,
              plannedDurationMinutes: true,
              finalAmount: true,
              finalizedAt: true,
              table: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        select: {
          id: true,
          mode: true,
          amount: true,
          createdAt: true,
          sessionId: true,
        },
        orderBy: { createdAt: "desc" },
      },
      pendingEntries: {
        select: {
          id: true,
          type: true,
          amount: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
}

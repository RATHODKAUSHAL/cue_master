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

export async function listCustomers(ownerId: string, search?: string) {
  const normalizedSearch = search?.trim();
  const mobileSearch = normalizedSearch?.replace(/\D/g, "");

  const customers = await prisma.customer.findMany({
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
        where: { type: "CREATED" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });

  if (!customers.length) {
    return customers;
  }

  const ledgerRows = await prisma.pendingLedger.groupBy({
    by: ["customerId", "type"],
    where: {
      ownerId,
      customerId: { in: customers.map((customer) => customer.id) },
    },
    _sum: { amount: true },
  });

  const ledgerBalances = new Map<string, number>();

  for (const row of ledgerRows) {
    const current = ledgerBalances.get(row.customerId) || 0;
    const amount = row._sum.amount || 0;
    ledgerBalances.set(row.customerId, row.type === "CREATED" ? current + amount : current - amount);
  }

  return customers.map((customer) => {
    const ledgerPendingAmount = Math.max(0, ledgerBalances.get(customer.id) || 0);
    const pendingAmount = Math.max(customer.pendingAmount, ledgerPendingAmount);

    return {
      ...customer,
      pendingAmount,
      pendingEntries: pendingAmount > 0 ? customer.pendingEntries : [],
    };
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
    WITH ledger_balance AS (
      SELECT
        customer.id,
        GREATEST(
          customer."pendingAmount",
          COALESCE(
            SUM(
              CASE
                WHEN ledger.type = 'CREATED' THEN ledger.amount
                WHEN ledger.type = 'PAID' THEN -ledger.amount
                ELSE 0
              END
            ),
            0
          )
        )::integer AS "currentPendingAmount"
      FROM customers customer
      LEFT JOIN pending_ledger ledger
        ON ledger."customerId" = customer.id
       AND ledger."ownerId" = ${ownerId}
      WHERE customer.id = ${customerId}
        AND customer."ownerId" = ${ownerId}
      GROUP BY customer.id, customer."pendingAmount"
    ),
    updated_customer AS (
      UPDATE customers
      SET
        "pendingAmount" = ledger_balance."currentPendingAmount" - ${amount},
        "updatedAt" = NOW()
      FROM ledger_balance
      WHERE customers.id = ${customerId}
        AND customers."ownerId" = ${ownerId}
        AND customers.id = ledger_balance.id
        AND ledger_balance."currentPendingAmount" >= ${amount}
      RETURNING customers.id, customers."pendingAmount"
    ),
    ledger AS (
      INSERT INTO pending_ledger (
        id, "ownerId", "customerId", "sessionId",
        type, amount, note, "createdAt"
      )
      SELECT
        'l' || md5(random()::text || clock_timestamp()::text || updated_customer.id),
        ${ownerId},
        updated_customer.id,
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

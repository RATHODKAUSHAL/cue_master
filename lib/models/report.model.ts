import { prisma } from "@/lib/prisma";

export type ReportCustomerRow = {
  id: string;
  customerName: string;
  amountSpent: number;
  gamesPlayed: number;
  pendingAmount: number;
};

export type ReportSessionRow = {
  id: string;
  customerNames: string;
  mobileNumbers: string;
  tableName: string;
  revenueAmount: number;
  pendingAmount: number;
  createdAt: Date;
};

export type ReportData = {
  customers: ReportCustomerRow[];
  sessions: ReportSessionRow[];
  totals: {
    totalRevenue: number;
    totalPendingAmount: number;
  };
};

export async function getReportData(
  ownerId: string,
  dateFrom: Date | null,
  dateTo: Date | null,
): Promise<ReportData> {
  const customers = await prisma.$queryRaw<ReportCustomerRow[]>`
    WITH customer_payments AS (
      SELECT
        payment."customerId",
        COALESCE(SUM(payment.amount), 0)::integer AS "amountSpent"
      FROM payment_records payment
      WHERE payment."ownerId" = ${ownerId}
        AND payment.mode <> 'PENDING'
        AND (${dateFrom}::timestamp IS NULL OR payment."createdAt" >= ${dateFrom})
        AND (${dateTo}::timestamp IS NULL OR payment."createdAt" < ${dateTo})
      GROUP BY payment."customerId"
    ),
    pending_recoveries AS (
      SELECT
        ledger."customerId",
        COALESCE(SUM(ledger.amount), 0)::integer AS "amountRecovered"
      FROM pending_ledger ledger
      WHERE ledger."ownerId" = ${ownerId}
        AND ledger.type = 'PAID'
        AND (${dateFrom}::timestamp IS NULL OR ledger."createdAt" >= ${dateFrom})
        AND (${dateTo}::timestamp IS NULL OR ledger."createdAt" < ${dateTo})
      GROUP BY ledger."customerId"
    ),
    customer_games AS (
      SELECT
        player."customerId",
        COALESCE(
          SUM(
            CASE
              WHEN session."pricingMode" = 'PER_GAME' THEN session."gameCount"
              ELSE 1
            END
          ),
          0
        )::integer AS "gamesPlayed"
      FROM session_players player
      JOIN game_sessions session ON session.id = player."sessionId"
      WHERE player."ownerId" = ${ownerId}
        AND session."ownerId" = ${ownerId}
        AND session.status = 'COMPLETED'
        AND (${dateFrom}::timestamp IS NULL OR session."createdAt" >= ${dateFrom})
        AND (${dateTo}::timestamp IS NULL OR session."createdAt" < ${dateTo})
      GROUP BY player."customerId"
    )
    SELECT
      customer.id,
      customer.name AS "customerName",
      (
        COALESCE(customer_payments."amountSpent", 0) +
        COALESCE(pending_recoveries."amountRecovered", 0)
      )::integer AS "amountSpent",
      COALESCE(customer_games."gamesPlayed", 0)::integer AS "gamesPlayed",
      customer."pendingAmount"::integer AS "pendingAmount"
    FROM customers customer
    LEFT JOIN customer_payments ON customer_payments."customerId" = customer.id
    LEFT JOIN pending_recoveries ON pending_recoveries."customerId" = customer.id
    LEFT JOIN customer_games ON customer_games."customerId" = customer.id
    WHERE customer."ownerId" = ${ownerId}
    ORDER BY customer.name ASC, customer."updatedAt" DESC
  `;

  const sessions = await prisma.$queryRaw<ReportSessionRow[]>`
    WITH player_summary AS (
      SELECT
        player."sessionId",
        COALESCE(STRING_AGG(DISTINCT customer.name, ', ' ORDER BY customer.name), '') AS "customerNames",
        COALESCE(STRING_AGG(DISTINCT customer."mobileNumber", ', ' ORDER BY customer."mobileNumber"), '') AS "mobileNumbers"
      FROM session_players player
      JOIN customers customer ON customer.id = player."customerId"
      WHERE player."ownerId" = ${ownerId}
      GROUP BY player."sessionId"
    ),
    payment_summary AS (
      SELECT
        payment."sessionId",
        COALESCE(SUM(payment.amount) FILTER (WHERE payment.mode <> 'PENDING'), 0)::integer AS "revenueAmount",
        COALESCE(SUM(payment.amount) FILTER (WHERE payment.mode = 'PENDING'), 0)::integer AS "pendingAmount"
      FROM payment_records payment
      WHERE payment."ownerId" = ${ownerId}
      GROUP BY payment."sessionId"
    )
    SELECT
      session.id,
      COALESCE(player_summary."customerNames", '') AS "customerNames",
      COALESCE(player_summary."mobileNumbers", '') AS "mobileNumbers",
      venue.name AS "tableName",
      COALESCE(payment_summary."revenueAmount", 0)::integer AS "revenueAmount",
      COALESCE(payment_summary."pendingAmount", 0)::integer AS "pendingAmount",
      session."createdAt"
    FROM game_sessions session
    JOIN tables venue ON venue.id = session."tableId"
    LEFT JOIN player_summary ON player_summary."sessionId" = session.id
    LEFT JOIN payment_summary ON payment_summary."sessionId" = session.id
    WHERE session."ownerId" = ${ownerId}
      AND session.status = 'COMPLETED'
      AND (${dateFrom}::timestamp IS NULL OR session."createdAt" >= ${dateFrom})
      AND (${dateTo}::timestamp IS NULL OR session."createdAt" < ${dateTo})
    ORDER BY session."createdAt" DESC
  `;

  const totalRevenue = customers.reduce((sum, customer) => sum + Number(customer.amountSpent || 0), 0);
  const totalPendingAmount = customers.reduce(
    (sum, customer) => sum + Number(customer.pendingAmount || 0),
    0,
  );

  return {
    customers: customers.map((customer) => ({
      ...customer,
      amountSpent: Number(customer.amountSpent || 0),
      gamesPlayed: Number(customer.gamesPlayed || 0),
      pendingAmount: Number(customer.pendingAmount || 0),
    })),
    sessions: sessions.map((session) => ({
      ...session,
      revenueAmount: Number(session.revenueAmount || 0),
      pendingAmount: Number(session.pendingAmount || 0),
    })),
    totals: {
      totalRevenue,
      totalPendingAmount,
    },
  };
}

import { prisma } from "@/lib/prisma";

export type DashboardPeriod = "day" | "week" | "month";

type DashboardRow = {
  totalCustomers: number;
  totalPendingAmount: number;
  totalRevenue: number;
  totalExpense: number;
  completedSessions: number;
  revenueEvents: Array<{ occurredAt: string; amount: number }>;
};

export async function getDashboardAnalytics(
  ownerId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  const rows = await prisma.$queryRaw<DashboardRow[]>`
    WITH revenue_events AS (
      SELECT payment."createdAt" AS "occurredAt", payment.amount
      FROM payment_records payment
      WHERE payment."ownerId" = ${ownerId}
        AND payment.mode <> 'PENDING'
        AND payment."createdAt" >= ${dateFrom}
        AND payment."createdAt" < ${dateTo}

      UNION ALL

      SELECT ledger."createdAt" AS "occurredAt", ledger.amount
      FROM pending_ledger ledger
      WHERE ledger."ownerId" = ${ownerId}
        AND ledger.type = 'PAID'
        AND ledger."createdAt" >= ${dateFrom}
        AND ledger."createdAt" < ${dateTo}
    ),
    revenue_summary AS (
      SELECT COALESCE(SUM(amount), 0)::integer AS amount
      FROM revenue_events
    ),
    expense_summary AS (
      SELECT
        COALESCE(SUM(session."calculatedAmount"), 0)::integer AS amount,
        COUNT(*)::integer AS "completedSessions"
      FROM game_sessions session
      WHERE session."ownerId" = ${ownerId}
        AND session.status = 'COMPLETED'
        AND session."finalizedAt" >= ${dateFrom}
        AND session."finalizedAt" < ${dateTo}
        AND session."ownerPlaying" = TRUE
        AND session."ownerResult" = 'OWNER_LOST'
    ),
    session_summary AS (
      SELECT COUNT(*)::integer AS count
      FROM game_sessions session
      WHERE session."ownerId" = ${ownerId}
        AND session.status = 'COMPLETED'
        AND session."finalizedAt" >= ${dateFrom}
        AND session."finalizedAt" < ${dateTo}
    ),
    customer_summary AS (
      SELECT
        COUNT(*)::integer AS count,
        COALESCE(SUM(customer."pendingAmount"), 0)::integer AS pending
      FROM customers customer
      WHERE customer."ownerId" = ${ownerId}
    )
    SELECT
      customer_summary.count AS "totalCustomers",
      customer_summary.pending AS "totalPendingAmount",
      revenue_summary.amount AS "totalRevenue",
      expense_summary.amount AS "totalExpense",
      session_summary.count AS "completedSessions",
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'occurredAt', events."occurredAt",
              'amount', events.amount
            )
            ORDER BY events."occurredAt"
          )
          FROM revenue_events events
        ),
        '[]'::jsonb
      ) AS "revenueEvents"
    FROM customer_summary, revenue_summary, expense_summary, session_summary
  `;

  return rows[0];
}

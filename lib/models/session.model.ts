import { prisma } from "@/lib/prisma";

export type StartSessionPayload = {
  customerName: string;
  customerMobileNumber: string;
  tableId: string;
  durationMinutes?: number | null;
  gameCount?: number | null;
  ownerPlaying: boolean;
};

export type SessionPaymentInput = {
  customerId?: string;
  customerName?: string;
  customerMobileNumber?: string;
  mode: "CASH" | "UPI" | "WALLET" | "PENDING";
  amount: number;
};

type SessionStatusValue = "ACTIVE" | "PAUSED" | "ENDED" | "COMPLETED" | "CANCELLED";

function isSessionStatus(value: string | null | undefined): value is SessionStatusValue {
  return (
    value === "ACTIVE" ||
    value === "PAUSED" ||
    value === "ENDED" ||
    value === "COMPLETED" ||
    value === "CANCELLED"
  );
}

export type SessionPlayerInput = {
  customerId?: string;
  customerName?: string;
  customerMobileNumber?: string;
  splitAmount: number;
};

export type FinalizeSessionPayload = {
  ownerResult?: "OWNER_WON" | "OWNER_LOST" | null;
  players: SessionPlayerInput[];
  payments: SessionPaymentInput[];
  extraPaymentAction?: "RETURN" | "WALLET" | null;
  extraAmount?: number;
};

export class SessionModelError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SessionModelError";
    this.status = status;
  }
}

function calculateAmount(
  pricingMode: "PER_HOUR" | "PER_GAME",
  price: number,
  durationMinutes: number,
  gameCount: number,
) {
  if (pricingMode === "PER_GAME") {
    return price * gameCount;
  }

  return Math.round((price * durationMinutes) / 60);
}

function calculateProratedAmount(
  fullAmount: number,
  plannedDurationMinutes: number,
  elapsedSeconds: number,
) {
  const plannedSeconds = Math.max(1, plannedDurationMinutes * 60);
  const billableSeconds = Math.min(Math.max(0, elapsedSeconds), plannedSeconds);

  if (billableSeconds === 0) {
    return 0;
  }

  return Math.min(fullAmount, Math.max(1, Math.round((fullAmount * billableSeconds) / plannedSeconds)));
}

function sessionSummarySelect() {
  return {
    id: true,
    tableId: true,
    primaryCustomerId: true,
    pricingMode: true,
    tablePrice: true,
    gameCount: true,
    plannedDurationMinutes: true,
    calculatedAmount: true,
    finalAmount: true,
    status: true,
    ownerPlaying: true,
    ownerResult: true,
    startedAt: true,
    pauseStartedAt: true,
    totalPausedSeconds: true,
    endedAt: true,
    finalizedAt: true,
    table: {
      select: {
        id: true,
        name: true,
        pricingMode: true,
        price: true,
        durationMinutes: true,
      },
    },
    primaryCustomer: {
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        pendingAmount: true,
        walletBalance: true,
      },
    },
  };
}

export function listSessions(ownerId: string, status?: string | null) {
  const normalizedStatus = isSessionStatus(status) ? status : undefined;

  return prisma.gameSession.findMany({
    where: {
      ownerId,
      ...(normalizedStatus
        ? { status: normalizedStatus }
        : { status: { notIn: ["COMPLETED", "CANCELLED"] } }),
    },
    select: sessionSummarySelect(),
    orderBy: { createdAt: "desc" },
  });
}

export type SessionHistoryFilters = {
  customerName?: string;
  mobileNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export function listSessionHistory(ownerId: string, filters: SessionHistoryFilters) {
  return prisma.gameSession.findMany({
    where: {
      ownerId,
      status: "COMPLETED",
      ...(filters.dateFrom || filters.dateTo
        ? {
            finalizedAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lt: filters.dateTo } : {}),
            },
          }
        : {}),
      ...(filters.customerName || filters.mobileNumber
        ? {
            primaryCustomer: {
              ...(filters.customerName
                ? {
                    name: {
                      contains: filters.customerName,
                      mode: "insensitive" as const,
                    },
                  }
                : {}),
              ...(filters.mobileNumber
                ? { mobileNumber: { contains: filters.mobileNumber } }
                : {}),
            },
          }
        : {}),
    },
    select: {
      ...sessionSummarySelect(),
      payments: {
        select: {
          id: true,
          mode: true,
          amount: true,
          customer: {
            select: {
              id: true,
              name: true,
              mobileNumber: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { finalizedAt: "desc" },
    take: 500,
  });
}

export function getSession(ownerId: string, id: string) {
  return prisma.gameSession.findUnique({
    where: {
      id_ownerId: { id, ownerId },
    },
    select: sessionSummarySelect(),
  });
}

export async function startSession(ownerId: string, data: StartSessionPayload) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.venueTable.findFirst({
      where: {
        id: data.tableId,
        ownerId,
        status: "AVAILABLE",
      },
    });

    if (!table) {
      throw new SessionModelError("Table is not available.", 409);
    }

    const customer = await tx.customer.upsert({
      where: {
        ownerId_mobileNumber: {
          ownerId,
          mobileNumber: data.customerMobileNumber,
        },
      },
      update: {
        name: data.customerName,
      },
      create: {
        ownerId,
        name: data.customerName,
        mobileNumber: data.customerMobileNumber,
      },
    });

    const gameCount = table.pricingMode === "PER_GAME" ? Number(data.gameCount || 1) : 1;
    const defaultDurationMinutes = table.durationMinutes || 45;
    const plannedDurationMinutes =
      table.pricingMode === "PER_GAME"
        ? defaultDurationMinutes * gameCount
        : Number(data.durationMinutes || table.durationMinutes || 60);
    const calculatedAmount = calculateAmount(
      table.pricingMode,
      table.price,
      plannedDurationMinutes,
      gameCount,
    );

    const updatedTable = await tx.venueTable.updateMany({
      where: {
        id: table.id,
        ownerId,
        status: "AVAILABLE",
      },
      data: {
        status: "OCCUPIED",
      },
    });

    if (updatedTable.count !== 1) {
      throw new SessionModelError("Table is already occupied.", 409);
    }

    const session = await tx.gameSession.create({
      data: {
        ownerId,
        tableId: table.id,
        primaryCustomerId: customer.id,
        pricingMode: table.pricingMode,
        tablePrice: table.price,
        gameCount,
        plannedDurationMinutes,
        defaultDurationMinutes,
        calculatedAmount,
        ownerPlaying: data.ownerPlaying,
        players: {
          create: {
            ownerId,
            customerId: customer.id,
            splitAmount: calculatedAmount,
          },
        },
      },
      select: sessionSummarySelect(),
    });

    return session;
  });
}

export async function updateSession(
  ownerId: string,
  id: string,
  data: StartSessionPayload,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.gameSession.findUnique({
      where: { id_ownerId: { id, ownerId } },
    });

    if (!current) {
      throw new SessionModelError("Session not found.", 404);
    }

    if (!["ACTIVE", "PAUSED"].includes(current.status)) {
      throw new SessionModelError("Only running sessions can be edited.");
    }

    const table = await tx.venueTable.findFirst({
      where: {
        id: data.tableId,
        ownerId,
        ...(data.tableId === current.tableId ? {} : { status: "AVAILABLE" }),
      },
    });

    if (!table) {
      throw new SessionModelError("Selected table is not available.", 409);
    }

    const customer = await tx.customer.upsert({
      where: {
        ownerId_mobileNumber: {
          ownerId,
          mobileNumber: data.customerMobileNumber,
        },
      },
      update: { name: data.customerName },
      create: {
        ownerId,
        name: data.customerName,
        mobileNumber: data.customerMobileNumber,
      },
    });

    if (table.id !== current.tableId) {
      const occupied = await tx.venueTable.updateMany({
        where: { id: table.id, ownerId, status: "AVAILABLE" },
        data: { status: "OCCUPIED" },
      });

      if (occupied.count !== 1) {
        throw new SessionModelError("Selected table is already occupied.", 409);
      }

      await tx.venueTable.update({
        where: { id_ownerId: { id: current.tableId, ownerId } },
        data: { status: "AVAILABLE" },
      });
    }

    const gameCount = table.pricingMode === "PER_GAME" ? Number(data.gameCount || 1) : 1;
    const defaultDurationMinutes = table.durationMinutes || 45;
    const plannedDurationMinutes =
      table.pricingMode === "PER_GAME"
        ? defaultDurationMinutes * gameCount
        : Number(data.durationMinutes || table.durationMinutes || 60);
    const calculatedAmount = calculateAmount(
      table.pricingMode,
      table.price,
      plannedDurationMinutes,
      gameCount,
    );

    await tx.sessionPlayer.deleteMany({ where: { ownerId, sessionId: id } });

    return tx.gameSession.update({
      where: { id_ownerId: { id, ownerId } },
      data: {
        tableId: table.id,
        primaryCustomerId: customer.id,
        pricingMode: table.pricingMode,
        tablePrice: table.price,
        gameCount,
        plannedDurationMinutes,
        defaultDurationMinutes,
        calculatedAmount,
        ownerPlaying: data.ownerPlaying,
        players: {
          create: {
            ownerId,
            customerId: customer.id,
            splitAmount: calculatedAmount,
          },
        },
      },
      select: sessionSummarySelect(),
    });
  });
}

export async function deleteSession(ownerId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findUnique({
      where: { id_ownerId: { id, ownerId } },
    });

    if (!session) {
      throw new SessionModelError("Session not found.", 404);
    }

    if (session.status === "COMPLETED") {
      throw new SessionModelError("Completed sessions cannot be deleted.", 409);
    }

    await tx.gameSession.delete({ where: { id_ownerId: { id, ownerId } } });
    await tx.venueTable.update({
      where: { id_ownerId: { id: session.tableId, ownerId } },
      data: { status: "AVAILABLE" },
    });
  });
}

export async function pauseSession(ownerId: string, id: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id_ownerId: { id, ownerId } },
  });

  if (!session) {
    throw new SessionModelError("Session not found.", 404);
  }

  if (session.status !== "ACTIVE") {
    throw new SessionModelError("Only active sessions can be paused.");
  }

  return prisma.gameSession.update({
    where: { id_ownerId: { id, ownerId } },
    data: {
      status: "PAUSED",
      pauseStartedAt: new Date(),
    },
    select: sessionSummarySelect(),
  });
}

export async function resumeSession(ownerId: string, id: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id_ownerId: { id, ownerId } },
  });

  if (!session) {
    throw new SessionModelError("Session not found.", 404);
  }

  if (session.status !== "PAUSED" || !session.pauseStartedAt) {
    throw new SessionModelError("Only paused sessions can be resumed.");
  }

  const pausedSeconds = Math.max(
    0,
    Math.floor((Date.now() - session.pauseStartedAt.getTime()) / 1000),
  );

  return prisma.gameSession.update({
    where: { id_ownerId: { id, ownerId } },
    data: {
      status: "ACTIVE",
      pauseStartedAt: null,
      totalPausedSeconds: session.totalPausedSeconds + pausedSeconds,
    },
    select: sessionSummarySelect(),
  });
}

export async function endSession(ownerId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findUnique({
      where: { id_ownerId: { id, ownerId } },
    });

    if (!session) {
      throw new SessionModelError("Session not found.", 404);
    }

    if (!["ACTIVE", "PAUSED"].includes(session.status)) {
      throw new SessionModelError("Only running sessions can be ended.");
    }

    const now = new Date();
    const pausedSeconds =
      session.status === "PAUSED" && session.pauseStartedAt
        ? Math.max(0, Math.floor((now.getTime() - session.pauseStartedAt.getTime()) / 1000))
        : 0;
    const totalPausedSeconds = session.totalPausedSeconds + pausedSeconds;
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) - totalPausedSeconds,
    );
    const calculatedAmount = calculateProratedAmount(
      session.calculatedAmount,
      session.plannedDurationMinutes,
      elapsedSeconds,
    );

    return tx.gameSession.update({
      where: { id_ownerId: { id, ownerId } },
      data: {
        status: "ENDED",
        endedAt: now,
        pauseStartedAt: null,
        totalPausedSeconds,
        calculatedAmount,
      },
      select: sessionSummarySelect(),
    });
  });
}

export async function finalizeSession(ownerId: string, id: string, data: FinalizeSessionPayload) {
  const playersJson = JSON.stringify(data.players);
  const paymentsJson = JSON.stringify(data.payments);
  const ownerResult = data.ownerResult || null;
  const extraPaymentAction = data.extraPaymentAction || null;
  const extraAmount = Number(data.extraAmount || 0);

  type FinalizedRow = {
    id: string;
    tableId: string;
    primaryCustomerId: string;
    pricingMode: "PER_HOUR" | "PER_GAME";
    tablePrice: number;
    gameCount: number;
    plannedDurationMinutes: number;
    calculatedAmount: number;
    finalAmount: number;
    status: SessionStatusValue;
    ownerPlaying: boolean;
    ownerResult: "OWNER_WON" | "OWNER_LOST" | null;
    startedAt: Date;
    pauseStartedAt: Date | null;
    totalPausedSeconds: number;
    endedAt: Date;
    finalizedAt: Date;
    tableName: string;
    tablePricingMode: "PER_HOUR" | "PER_GAME";
    tablePriceCurrent: number;
    tableDurationMinutes: number | null;
    customerName: string;
    customerMobileNumber: string;
    customerPendingAmount: number;
    customerWalletBalance: number;
  };

  const rows = await prisma.$queryRaw<FinalizedRow[]>`
    WITH
    input_players AS (
      SELECT *
      FROM jsonb_to_recordset(${playersJson}::jsonb) AS player(
        "customerId" text,
        "customerName" text,
        "customerMobileNumber" text,
        "splitAmount" integer
      )
    ),
    input_payments AS (
      SELECT *
      FROM jsonb_to_recordset(${paymentsJson}::jsonb) AS payment(
        "customerId" text,
        "customerName" text,
        "customerMobileNumber" text,
        mode text,
        amount integer
      )
    ),
    locked_session AS (
      SELECT session.*
      FROM "game_sessions" session
      WHERE session.id = ${id}
        AND session."ownerId" = ${ownerId}
        AND session.status IN ('ACTIVE', 'PAUSED', 'ENDED')
      FOR UPDATE
    ),
    upserted_customers AS (
      INSERT INTO customers (
        id, "ownerId", name, "mobileNumber", "walletBalance",
        "pendingAmount", "createdAt", "updatedAt"
      )
      SELECT
        'c' || md5(random()::text || clock_timestamp()::text || player."customerMobileNumber"),
        ${ownerId},
        player."customerName",
        player."customerMobileNumber",
        0,
        0,
        NOW(),
        NOW()
      FROM input_players player
      CROSS JOIN locked_session
      WHERE NULLIF(player."customerId", '') IS NULL
      ON CONFLICT ("ownerId", "mobileNumber")
      DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW()
      RETURNING id, "mobileNumber"
    ),
    resolved_players AS (
      SELECT
        COALESCE(
          NULLIF(player."customerId", ''),
          upserted.id,
          existing.id
        ) AS "customerId",
        player."customerMobileNumber",
        player."splitAmount"
      FROM input_players player
      LEFT JOIN upserted_customers upserted
        ON upserted."mobileNumber" = player."customerMobileNumber"
      LEFT JOIN customers existing
        ON existing."ownerId" = ${ownerId}
       AND (
         existing.id = NULLIF(player."customerId", '')
         OR existing."mobileNumber" = player."customerMobileNumber"
       )
    ),
    resolved_payments AS (
      SELECT
        COALESCE(
          NULLIF(payment."customerId", ''),
          player."customerId"
        ) AS "customerId",
        payment.mode,
        payment.amount
      FROM input_payments payment
      LEFT JOIN resolved_players player
        ON player."customerId" = NULLIF(payment."customerId", '')
        OR (
          NULLIF(payment."customerId", '') IS NULL
          AND player."customerMobileNumber" = payment."customerMobileNumber"
        )
    ),
    bill AS (
      SELECT
        session.*,
        CASE
          WHEN session."ownerPlaying" = TRUE AND ${ownerResult}::text = 'OWNER_LOST'
            THEN 0
          ELSE session."calculatedAmount"
        END AS "computedFinalAmount",
        (SELECT COUNT(*) FROM input_players) AS "inputPlayerCount",
        (SELECT COUNT("customerId") FROM resolved_players) AS "resolvedPlayerCount",
        COALESCE((SELECT SUM("splitAmount") FROM resolved_players), 0) AS "splitTotal",
        COALESCE((SELECT SUM(amount) FROM resolved_payments), 0) AS "paymentTotal",
        (SELECT COUNT(*) FROM resolved_players) AS "playerCount",
        (SELECT COUNT(DISTINCT "customerId") FROM resolved_players) AS "uniquePlayerCount",
        (SELECT COUNT(*) FROM resolved_payments WHERE "customerId" IS NULL) AS "invalidPaymentCount"
      FROM locked_session session
    ),
    valid_bill AS (
      SELECT *
      FROM bill
      WHERE ("ownerPlaying" = FALSE OR ${ownerResult}::text IS NOT NULL)
        AND "inputPlayerCount" = "resolvedPlayerCount"
        AND "playerCount" = "uniquePlayerCount"
        AND "invalidPaymentCount" = 0
        AND "splitTotal" = "computedFinalAmount"
        AND "paymentTotal" = (
          "computedFinalAmount" +
          CASE
            WHEN ${extraPaymentAction}::text = 'WALLET'
              THEN ${extraAmount}::integer
            ELSE 0
          END
        )
    ),
    updated_session AS (
      UPDATE "game_sessions" session
      SET
        status = 'COMPLETED',
        "ownerResult" = ${ownerResult}::text::"OwnerGameResult",
        "finalAmount" = bill."computedFinalAmount",
        "endedAt" = COALESCE(session."endedAt", NOW()),
        "finalizedAt" = NOW(),
        "pauseStartedAt" = NULL,
        "updatedAt" = NOW()
      FROM valid_bill bill
      WHERE session.id = bill.id
      RETURNING session.*
    ),
    deleted_payments AS (
      DELETE FROM payment_records payment
      USING updated_session session
      WHERE payment."sessionId" = session.id
        AND payment."ownerId" = ${ownerId}
      RETURNING payment.id
    ),
    deleted_players AS (
      DELETE FROM session_players player
      USING updated_session session
      WHERE player."sessionId" = session.id
        AND player."ownerId" = ${ownerId}
        AND (SELECT COUNT(*) FROM deleted_payments) >= 0
      RETURNING player.id
    ),
    inserted_players AS (
      INSERT INTO session_players (
        id, "ownerId", "sessionId", "customerId", "splitAmount", "createdAt"
      )
      SELECT
        'p' || md5(random()::text || clock_timestamp()::text || player."customerId"),
        ${ownerId},
        session.id,
        player."customerId",
        player."splitAmount",
        NOW()
      FROM resolved_players player
      CROSS JOIN updated_session session
      WHERE player."customerId" IS NOT NULL
        AND (SELECT COUNT(*) FROM deleted_players) >= 0
      RETURNING id
    ),
    inserted_payments AS (
      INSERT INTO payment_records (
        id, "ownerId", "sessionId", "customerId", "playerId",
        mode, amount, "createdAt"
      )
      SELECT
        'r' || md5(random()::text || clock_timestamp()::text || payment."customerId"),
        ${ownerId},
        session.id,
        payment."customerId",
        NULL,
        payment.mode::"PaymentMode",
        payment.amount,
        NOW()
      FROM resolved_payments payment
      CROSS JOIN updated_session session
      WHERE payment."customerId" IS NOT NULL
        AND (SELECT COUNT(*) FROM inserted_players) >= 0
      RETURNING id
    ),
    pending_totals AS (
      SELECT "customerId", SUM(amount)::integer AS amount
      FROM resolved_payments
      WHERE mode = 'PENDING'
      GROUP BY "customerId"
    ),
    updated_pending AS (
      UPDATE customers customer
      SET
        "pendingAmount" = customer."pendingAmount" + totals.amount,
        "updatedAt" = NOW()
      FROM pending_totals totals
      CROSS JOIN updated_session session
      WHERE customer.id = totals."customerId"
        AND customer."ownerId" = ${ownerId}
        AND (SELECT COUNT(*) FROM inserted_payments) >= 0
      RETURNING customer.id
    ),
    inserted_pending_ledger AS (
      INSERT INTO pending_ledger (
        id, "ownerId", "customerId", "sessionId",
        type, amount, note, "createdAt"
      )
      SELECT
        'l' || md5(random()::text || clock_timestamp()::text || totals."customerId"),
        ${ownerId},
        totals."customerId",
        session.id,
        'CREATED',
        totals.amount,
        'Session pending amount',
        NOW()
      FROM pending_totals totals
      CROSS JOIN updated_session session
      WHERE (SELECT COUNT(*) FROM updated_pending) >= 0
      RETURNING id
    ),
    wallet_changes AS (
      SELECT "customerId", (-SUM(amount))::integer AS amount, 'DEBIT'::text AS type
      FROM resolved_payments
      WHERE mode = 'WALLET'
      GROUP BY "customerId"
      UNION ALL
      SELECT session."primaryCustomerId", ${extraAmount}::integer, 'CREDIT'
      FROM updated_session session
      WHERE ${extraPaymentAction}::text = 'WALLET' AND ${extraAmount}::integer > 0
    ),
    updated_wallet AS (
      UPDATE customers customer
      SET
        "walletBalance" = customer."walletBalance" + changes.amount,
        "updatedAt" = NOW()
      FROM (
        SELECT "customerId", SUM(amount)::integer AS amount
        FROM wallet_changes
        GROUP BY "customerId"
      ) changes
      CROSS JOIN updated_session session
      WHERE customer.id = changes."customerId"
        AND customer."ownerId" = ${ownerId}
      RETURNING customer.id
    ),
    inserted_wallet_ledger AS (
      INSERT INTO wallet_ledger (
        id, "ownerId", "customerId", "sessionId",
        type, amount, note, "createdAt"
      )
      SELECT
        'w' || md5(random()::text || clock_timestamp()::text || changes."customerId" || changes.type),
        ${ownerId},
        changes."customerId",
        session.id,
        changes.type::"WalletLedgerType",
        ABS(changes.amount),
        CASE WHEN changes.type = 'CREDIT'
          THEN 'Extra payment added to wallet'
          ELSE 'Session payment'
        END,
        NOW()
      FROM wallet_changes changes
      CROSS JOIN updated_session session
      WHERE (SELECT COUNT(*) FROM updated_wallet) >= 0
      RETURNING id
    ),
    released_table AS (
      UPDATE tables venue
      SET status = 'AVAILABLE', "updatedAt" = NOW()
      FROM updated_session session
      WHERE venue.id = session."tableId"
        AND venue."ownerId" = ${ownerId}
        AND (SELECT COUNT(*) FROM inserted_pending_ledger) >= 0
        AND (SELECT COUNT(*) FROM inserted_wallet_ledger) >= 0
      RETURNING venue.id
    )
    SELECT
      session.id,
      session."tableId",
      session."primaryCustomerId",
      session."pricingMode",
      session."tablePrice",
      session."gameCount",
      session."plannedDurationMinutes",
      session."calculatedAmount",
      session."finalAmount",
      session.status,
      session."ownerPlaying",
      session."ownerResult",
      session."startedAt",
      session."pauseStartedAt",
      session."totalPausedSeconds",
      session."endedAt",
      session."finalizedAt",
      venue.name AS "tableName",
      venue."pricingMode" AS "tablePricingMode",
      venue.price AS "tablePriceCurrent",
      venue."durationMinutes" AS "tableDurationMinutes",
      customer.name AS "customerName",
      customer."mobileNumber" AS "customerMobileNumber",
      customer."pendingAmount" AS "customerPendingAmount",
      customer."walletBalance" AS "customerWalletBalance"
    FROM updated_session session
    JOIN tables venue ON venue.id = session."tableId"
    JOIN customers customer ON customer.id = session."primaryCustomerId"
    WHERE (SELECT COUNT(*) FROM released_table) = 1
  `;

  const row = rows[0];

  if (!row) {
    const session = await prisma.gameSession.findUnique({
      where: { id_ownerId: { id, ownerId } },
      select: { status: true, ownerPlaying: true },
    });

    if (!session) {
      throw new SessionModelError("Session not found.", 404);
    }
    if (!["ACTIVE", "PAUSED", "ENDED"].includes(session.status)) {
      throw new SessionModelError("Session is already finalized.", 409);
    }
    if (session.ownerPlaying && !data.ownerResult) {
      throw new SessionModelError("Select owner result before finalizing.");
    }
    throw new SessionModelError("Final bill or split payment details are invalid.");
  }

  return {
    id: row.id,
    tableId: row.tableId,
    primaryCustomerId: row.primaryCustomerId,
    pricingMode: row.pricingMode,
    tablePrice: row.tablePrice,
    gameCount: row.gameCount,
    plannedDurationMinutes: row.plannedDurationMinutes,
    calculatedAmount: row.calculatedAmount,
    finalAmount: row.finalAmount,
    status: row.status,
    ownerPlaying: row.ownerPlaying,
    ownerResult: row.ownerResult,
    startedAt: row.startedAt,
    pauseStartedAt: row.pauseStartedAt,
    totalPausedSeconds: row.totalPausedSeconds,
    endedAt: row.endedAt,
    finalizedAt: row.finalizedAt,
    table: {
      id: row.tableId,
      name: row.tableName,
      pricingMode: row.tablePricingMode,
      price: row.tablePriceCurrent,
      durationMinutes: row.tableDurationMinutes,
    },
    primaryCustomer: {
      id: row.primaryCustomerId,
      name: row.customerName,
      mobileNumber: row.customerMobileNumber,
      pendingAmount: row.customerPendingAmount,
      walletBalance: row.customerWalletBalance,
    },
  };
}

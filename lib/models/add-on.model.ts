import { prisma } from "@/lib/prisma";

export type AddOnAmountRow = {
  id: string;
  ownerId: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function listAddOnAmounts(ownerId: string) {
  return prisma.$queryRaw<AddOnAmountRow[]>`
    SELECT
      id,
      "ownerId",
      amount,
      "createdAt",
      "updatedAt"
    FROM add_on_amounts
    WHERE "ownerId" = ${ownerId}
    ORDER BY amount ASC, "createdAt" DESC
  `;
}

export function createAddOnAmount(ownerId: string, amount: number) {
  return prisma.$queryRaw<AddOnAmountRow[]>`
    INSERT INTO add_on_amounts (
      id, "ownerId", amount, "createdAt", "updatedAt"
    )
    VALUES (
      'a' || md5(random()::text || clock_timestamp()::text || ${ownerId} || ${amount}::text),
      ${ownerId},
      ${amount},
      NOW(),
      NOW()
    )
    ON CONFLICT ("ownerId", amount) DO NOTHING
    RETURNING id, "ownerId", amount, "createdAt", "updatedAt"
  `;
}

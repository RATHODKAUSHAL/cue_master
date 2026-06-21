import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export const ADMIN_COOKIE_NAME = "cuedesk_admin_session";
const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function loginAdmin(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password) {
    return { ok: false as const, status: 400, message: "Email and password are required." };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return { ok: false as const, status: 401, message: "Invalid admin email or password." };
  }

  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000);
  await prisma.$transaction([
    prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.adminSession.create({
      data: { adminId: admin.id, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  return {
    ok: true as const,
    token,
    expiresAt,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };
}

export function setAdminCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function findAdminSession(token?: string | null) {
  if (!token) return null;
  return prisma.adminSession.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    include: { admin: { select: { id: true, name: true, email: true } } },
  });
}

export async function getCurrentAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  const session = await findAdminSession(token);
  return session?.admin ?? null;
}

export async function requireAdminToken(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const session = await findAdminSession(token);
  return session ? { ok: true as const, session } : { ok: false as const };
}

export async function revokeAdminToken(token?: string | null) {
  if (!token) return;
  await prisma.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

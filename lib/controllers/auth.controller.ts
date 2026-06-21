import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createUser, findUserByEmail, findUserById } from "@/lib/models/user.model";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerUser(input: RegisterInput) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const mobileNumber = input.mobileNumber.trim();
  const password = input.password;

  if (!name || !email || !mobileNumber || !password) {
    return { ok: false as const, status: 400, message: "All fields are required." };
  }

  if (!validateEmail(email)) {
    return { ok: false as const, status: 400, message: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { ok: false as const, status: 400, message: "Password must be at least 8 characters." };
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return { ok: false as const, status: 409, message: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, mobileNumber, passwordHash });

  return {
    ok: true as const,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
    },
  };
}

export async function loginUser(input: LoginInput) {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!email || !password) {
    return { ok: false as const, status: 400, message: "Email and password are required." };
  }

  const user = await findUserByEmail(email);

  if (!user) {
    return { ok: false as const, status: 401, message: "Invalid email or password." };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    return { ok: false as const, status: 401, message: "Invalid email or password." };
  }

  return {
    ok: true as const,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function getAuthenticatedUser(userId: string) {
  return findUserById(userId);
}

import { prisma } from "@/lib/prisma";

export type RegisterUserInput = {
  name: string;
  email: string;
  mobileNumber: string;
  passwordHash: string;
};

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      mobileNumber: true,
      createdAt: true,
    },
  });
}

export function createUser(input: RegisterUserInput) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      mobileNumber: input.mobileNumber,
      passwordHash: input.passwordHash,
    },
  });
}

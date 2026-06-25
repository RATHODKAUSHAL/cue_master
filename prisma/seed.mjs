import bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg(process.env.DIRECT_URL ?? process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const users = [
  {
    name: "Arjun Patel",
    email: "arjun@cuedesk.com",
    mobileNumber: "9876543210",
    password: "Password@123",
  },
  {
    name: "Riya Shah",
    email: "riya@cuedesk.com",
    mobileNumber: "9123456789",
    password: "Password@123",
  },
];

const admins = [
  {
    name: "Super Admin",
    email: "admin@cuedesk.com",
    password: "Admin@123",
  },
  {
    name: "Operations Admin",
    email: "operations@cuedesk.com",
    password: "Admin@123",
  },
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        mobileNumber: user.mobileNumber,
        passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        passwordHash,
      },
    });
  }

  for (const admin of admins) {
    const passwordHash = await bcrypt.hash(admin.password, 12);

    await prisma.admin.upsert({
      where: { email: admin.email },
      update: {
        name: admin.name,
        passwordHash,
      },
      create: {
        name: admin.name,
        email: admin.email,
        passwordHash,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

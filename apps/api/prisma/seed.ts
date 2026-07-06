import { scryptSync } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "@prisma/client";

const localDatabaseUrl =
  "postgresql://leopard:leopard@localhost:5432/leopard?schema=public";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? localDatabaseUrl
});

const prisma = new PrismaClient({ adapter });

const demoPassword = process.env.LEOPARD_DEMO_PASSWORD ?? "Password123!";
const passwordHash = `scrypt$leopard-demo-v1$${scryptSync(
  demoPassword,
  "leopard-demo-v1",
  64
).toString("hex")}`;

const demoAccounts: Array<{
  email: string;
  name: string;
  role: Role;
}> = [
  {
    email: "customer@leopard.demo",
    name: "Demo Customer",
    role: "CUSTOMER"
  },
  {
    email: "driver@leopard.demo",
    name: "Demo Driver",
    role: "DRIVER"
  },
  {
    email: "admin@leopard.demo",
    name: "Demo Admin",
    role: "ADMIN"
  }
];

async function main() {
  for (const account of demoAccounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        role: account.role,
        passwordHash
      },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash
      }
    });
  }

  const driver = await prisma.user.findUniqueOrThrow({
    where: { email: "driver@leopard.demo" }
  });

  await prisma.driverProfile.upsert({
    where: { userId: driver.id },
    update: {
      vehicleType: "SMALL_TRUCK",
      availability: "AVAILABLE",
      licensePlate: "43C-12345"
    },
    create: {
      userId: driver.id,
      vehicleType: "SMALL_TRUCK",
      availability: "AVAILABLE",
      licensePlate: "43C-12345"
    }
  });

  console.info("Seeded demo customer, driver, admin, and driver profile.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });

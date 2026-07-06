import { defineConfig } from "prisma/config";

const localDatabaseUrl =
  "postgresql://leopard:leopard@localhost:5432/leopard?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl
  }
});

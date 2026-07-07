import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const localDatabaseUrl =
  "postgresql://leopard:leopard@localhost:5432/leopard?schema=public";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL ?? localDatabaseUrl
      })
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

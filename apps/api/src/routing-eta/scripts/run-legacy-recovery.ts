import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../database/prisma.service.js';
import { EtaService } from '../eta.service.js';
import { runLegacyRouteRecovery } from '../legacy-recovery.job.js';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const result = await runLegacyRouteRecovery(
    app.get(PrismaService), app.get(EtaService), `legacy-recovery-${new Date().toISOString()}`,
  );
  console.log(JSON.stringify(result));
  await app.close();
}

void main();

import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { pathToFileURL } from 'node:url';

import { AppModule } from './app.module.js';
import { parseEnv } from './config/env.schema.js';
import type { AppEnv } from './config/env.schema.js';

export async function createApplication(env: AppEnv): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { rawBody: false });

  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'), false);
    },
  });

  return app;
}

export async function bootstrap(source: NodeJS.ProcessEnv = process.env): Promise<void> {
  const env = parseEnv(source);
  const app = await createApplication(env);

  await app.listen(env.PORT);
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  void bootstrap();
}

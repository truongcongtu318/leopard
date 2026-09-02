import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { AppModule } from './app.module.js';
import { DocsModule } from './docs/docs.module.js';
import { parseEnv } from './config/env.schema.js';
import type { AppEnv } from './config/env.schema.js';

export async function createApplication(env: AppEnv): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: false,
  });

  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');

  // Serve locally-stored uploads (KYC docs, cargo/proof media) at /files when
  // not using S3. In production with S3, signed absolute URLs are used instead.
  if ((env.STORAGE_PROVIDER ?? 'local').toLowerCase() !== 's3') {
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/files' });
  }
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

      if (env.NODE_ENV === 'development') {
        try {
          const url = new URL(origin);
          if (
            url.hostname === 'localhost' ||
            url.hostname === '127.0.0.1' ||
            url.hostname === '[::1]'
          ) {
            callback(null, true);
            return;
          }
        } catch {
          // ignore invalid url
        }
      }

      callback(null, false);
    },
    credentials: true,
  });

  DocsModule.setupSwagger(app);

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

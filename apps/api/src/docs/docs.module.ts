import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { OpenAPIObject, SwaggerCustomOptions } from '@nestjs/swagger';
import * as yaml from 'js-yaml';

/**
 * Swagger/OpenAPI documentation module.
 *
 * This module is always importable (it is a no-op container).
 * Swagger UI is only mounted when {@link setupSwagger} is called and
 * `ENABLE_API_DOCS=true`.
 *
 * In production or when `ENABLE_API_DOCS` is unset / any value other than
 * `"true"`, the module is a pure no-op — no Swagger imports are resolved.
 */
@Module({})
export class DocsModule {
  /**
   * Mount Swagger UI at `/docs` if `ENABLE_API_DOCS === "true"`.
   * Safe to call unconditionally — the guard returns early in production.
   */
  static setupSwagger(app: INestApplication): void {
    if (process.env.ENABLE_API_DOCS !== 'true') return;

    // Resolve relative to the module location when running via ts-node/jest
    const resolvedPath = resolve(import.meta.dirname, '..', '..', 'openapi', 'openapi.yaml');
    const raw = readFileSync(resolvedPath, 'utf-8');
    const document = yaml.load(raw) as OpenAPIObject;

    const { SwaggerModule } = require('@nestjs/swagger') as typeof import('@nestjs/swagger');

    const swaggerOptions: SwaggerCustomOptions = {
      customSiteTitle: 'LEOPARD API Docs',
      swaggerOptions: { persistAuthorization: true },
    };

    SwaggerModule.setup('docs', app, document, swaggerOptions);
  }
}

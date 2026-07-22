/// <reference types="jest" />

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from './app.module.js';

describe('API runtime shell', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('accepts requests after the application module is bootstrapped', async () => {
    if (!app) {
      throw new Error('Nest application did not bootstrap');
    }

    await request(app.getHttpServer()).get('/api/v1/runtime-shell').expect(404);
  });
});

import { SwaggerModule } from '@nestjs/swagger';

import { DocsModule } from './docs.module.js';

/**
 * The enabled path is the one that matters here: it is the only branch that
 * loads @nestjs/swagger, and under the compiled ES module output a bad loader
 * call in that branch crashes the process at boot rather than failing a request.
 * Jest transpiles to CommonJS, so this suite cannot reproduce that failure mode —
 * the container smoke test against `/api/docs` is what covers it end to end.
 */
describe('DocsModule.setupSwagger', () => {
  const originalFlag = process.env.ENABLE_API_DOCS;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.ENABLE_API_DOCS;
    } else {
      process.env.ENABLE_API_DOCS = originalFlag;
    }
    jest.restoreAllMocks();
  });

  it('mounts Swagger UI at /docs when ENABLE_API_DOCS=true', () => {
    process.env.ENABLE_API_DOCS = 'true';
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);
    const app = {} as never;

    expect(() => DocsModule.setupSwagger(app)).not.toThrow();
    expect(setup).toHaveBeenCalledWith('docs', app, expect.anything(), expect.anything());
  });

  it.each(['false', '1', 'yes', 'True'])(
    'does not load Swagger when ENABLE_API_DOCS=%s',
    (value) => {
      process.env.ENABLE_API_DOCS = value;
      const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);

      expect(() => DocsModule.setupSwagger({} as never)).not.toThrow();
      expect(setup).not.toHaveBeenCalled();
    },
  );

  it('does not load Swagger when ENABLE_API_DOCS is unset', () => {
    delete process.env.ENABLE_API_DOCS;
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);

    expect(() => DocsModule.setupSwagger({} as never)).not.toThrow();
    expect(setup).not.toHaveBeenCalled();
  });
});

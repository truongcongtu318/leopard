import { describe, expect, it } from '@jest/globals';

import { validateStopProgressBody, validateStopProgressVoidBody } from './stop-progress.dto.js';

describe('stop-progress DTO validation', () => {
  it('rejects a step outside the known enum', () => {
    expect(() =>
      validateStopProgressBody({ step: 'TELEPORTED', clientRequestId: 'req-1', occurredAt: new Date().toISOString() }),
    ).toThrow(/step/);
  });

  it('rejects an occurredAt more than 5 minutes in the future', () => {
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    expect(() => validateStopProgressBody({ step: 'ARRIVED', clientRequestId: 'req-1', occurredAt: future })).toThrow(
      /occurredAt/,
    );
  });

  it('accepts a valid void body', () => {
    const body = validateStopProgressVoidBody({
      supersedesEventId: '11111111-1111-1111-1111-111111111111',
      clientRequestId: 'req-2',
      reason: 'Ghi nhầm bước',
      occurredAt: new Date().toISOString(),
    });
    expect(body.reason).toBe('Ghi nhầm bước');
  });
});

import {
  REAL_DB_RACE_DATABASE_NAME,
  resolveRealDbRaceGate,
} from './real-db-race-gate.js';

describe('real database race gate', () => {
  it('skips with an actionable reason unless explicitly opted in', () => {
    expect(resolveRealDbRaceGate({})).toEqual({
      enabled: false,
      skipReason: expect.stringContaining('LEOPARD_REAL_DB_RACE_TEST=true'),
    });
  });

  it('fails fast after opt-in when DATABASE_URL is missing', () => {
    expect(() =>
      resolveRealDbRaceGate({ LEOPARD_REAL_DB_RACE_TEST: 'true' }),
    ).toThrow('DATABASE_URL is required');
  });

  it('fails fast after opt-in when the database is not disposable', () => {
    expect(() =>
      resolveRealDbRaceGate({
        LEOPARD_REAL_DB_RACE_TEST: 'true',
        DATABASE_URL: 'postgresql://localhost/leopard',
      }),
    ).toThrow(REAL_DB_RACE_DATABASE_NAME);
  });

  it('enables the suite only for the dedicated disposable database', () => {
    expect(
      resolveRealDbRaceGate({
        LEOPARD_REAL_DB_RACE_TEST: 'true',
        DATABASE_URL: `postgresql://localhost/${REAL_DB_RACE_DATABASE_NAME}`,
      }),
    ).toEqual({ enabled: true, skipReason: null });
  });
});

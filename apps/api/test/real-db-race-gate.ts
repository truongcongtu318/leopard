const OPT_IN_ENV_NAME = 'LEOPARD_REAL_DB_RACE_TEST';
export const REAL_DB_RACE_DATABASE_NAME = 'leopard_real_db_race_test';

export interface RealDbRaceGate {
  readonly enabled: boolean;
  readonly skipReason: string | null;
}

export function resolveRealDbRaceGate(
  source: NodeJS.ProcessEnv = process.env,
): RealDbRaceGate {
  if (source[OPT_IN_ENV_NAME] !== 'true') {
    return {
      enabled: false,
      skipReason: `set ${OPT_IN_ENV_NAME}=true and DATABASE_URL to a disposable ${REAL_DB_RACE_DATABASE_NAME} database`,
    };
  }

  const databaseUrl = source.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the opted-in real database race suite');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL for the real database race suite');
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres or postgresql for the real database race suite');
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
  if (databaseName !== REAL_DB_RACE_DATABASE_NAME) {
    throw new Error(
      `DATABASE_URL must point to disposable database ${REAL_DB_RACE_DATABASE_NAME}; got ${databaseName || '<empty>'}`,
    );
  }

  return { enabled: true, skipReason: null };
}

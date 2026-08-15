const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeDriverRouteParam(
  value: string | readonly string[] | undefined,
): string | null {
  if (typeof value === 'string') return value;
  return value?.[0] ?? null;
}

export function parseDriverOrderId(value: string | readonly string[] | undefined): string | null {
  const normalized = normalizeDriverRouteParam(value);
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

// Wave 3 handoff will add validated REST/Socket mappings behind Driver ports.

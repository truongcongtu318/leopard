import { createHash } from 'node:crypto';

export function computeInputHash(normalizedInput: unknown): string {
  return createHash('sha256').update(canonicalJson(normalizedInput)).digest('hex');
}

export function computeRouteHash(geometry: string): string {
  return createHash('sha256').update(geometry).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
    .join(',');
  return `{${body}}`;
}

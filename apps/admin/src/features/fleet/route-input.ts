import type { FleetSearchParams } from './adapter';

function first(value: string | readonly string[] | undefined): string | null {
  if (typeof value === 'string') return value;
  return value?.[0] ?? null;
}

export function readFleetPreviewInput(search: FleetSearchParams) {
  return Object.freeze({
    localFlag: first(search.preview),
    scenario: first(search.scenario),
  });
}

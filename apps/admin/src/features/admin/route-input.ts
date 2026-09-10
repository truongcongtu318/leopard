import { parseAdminCommandKind, type AdminSearchParams } from './adapter';

function first(value: string | readonly string[] | undefined): string | null {
  if (typeof value === 'string') return value;
  return value?.[0] ?? null;
}

export function readAdminPreviewInput(search: AdminSearchParams) {
  return Object.freeze({
    localFlag: first(search.preview),
    scenario: first(search.scenario),
    commandKind: parseAdminCommandKind(search.command),
  });
}

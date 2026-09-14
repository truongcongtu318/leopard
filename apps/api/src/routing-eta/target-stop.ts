export type StopProgressStatus = 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';

export function deriveTargetStop(
  stops: readonly { id: string; sequence: number; progress: StopProgressStatus }[],
): string | null {
  const pending = stops
    .filter((s) => s.progress !== 'COMPLETED')
    .sort((a, b) => a.sequence - b.sequence);
  return pending[0]?.id ?? null;
}

const ROUTE_ETA_STALE_AFTER_S = 90;
// Defined for parity with spec §4.3 and used once GPS-point join is added.
// Leave in place even though this mapper's tests don't exercise it yet, so
// Task 16's Driver contract types match the field name exactly.
const GPS_STALE_AFTER_S = 120;

interface EstimateRow {
  inputRevision: number;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  kind: 'NEXT_STOP' | 'COMPLETION';
  targetStopId: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  arrivalAt: Date | null;
  calculatedAt: Date;
  validUntil: Date;
  unavailableReason: string | null;
}

export function mapRouteEtaResponse(input: {
  orderId: string;
  now: Date;
  order: { routeEtaInputRevision: number };
  currentNextStop: EstimateRow | null;
  currentCompletion: EstimateRow | null;
  activeRoute: unknown;
  quotedRoute: unknown;
  pendingDeadLetterInputRevision: number | null;
}) {
  const currentInputRevision =
    input.currentNextStop?.inputRevision ?? input.currentCompletion?.inputRevision ?? null;
  const isCurrent = currentInputRevision === input.order.routeEtaInputRevision;

  const recompute = isCurrent
    ? { state: 'CURRENT' as const, failedReason: null, failedInputRevision: null, nextRetryAt: null }
    : input.pendingDeadLetterInputRevision === input.order.routeEtaInputRevision
      ? {
          state: 'FAILED' as const,
          failedReason: null,
          failedInputRevision: input.pendingDeadLetterInputRevision,
          nextRetryAt: null,
        }
      : { state: 'PENDING' as const, failedReason: null, failedInputRevision: null, nextRetryAt: null };

  return {
    orderId: input.orderId,
    serverTime: input.now.toISOString(),
    desiredInputRevision: input.order.routeEtaInputRevision,
    currentInputRevision,
    recompute,
    quotedRoute: input.quotedRoute,
    activeRoute: input.activeRoute,
    estimates: {
      nextStop: toEstimateView(input.currentNextStop, input.now),
      completion: toEstimateView(input.currentCompletion, input.now),
    },
  };
}

function toEstimateView(row: EstimateRow | null, now: Date) {
  if (!row) {
    return null;
  }

  const isStale =
    now.getTime() - row.calculatedAt.getTime() > ROUTE_ETA_STALE_AFTER_S * 1000 ||
    row.validUntil < now;

  return {
    kind: row.kind,
    outcome: row.status === 'AVAILABLE' ? ('AVAILABLE' as const) : ('UNAVAILABLE' as const),
    targetStopId: row.targetStopId,
    remainingDistanceM: row.remainingDistanceM,
    remainingDurationS: row.remainingDurationS,
    arrivalAt: row.arrivalAt?.toISOString() ?? null,
    unavailableReason: row.unavailableReason,
    calculatedAt: row.calculatedAt.toISOString(),
    validUntil: row.validUntil.toISOString(),
    isStale,
    staleSinceAt: isStale ? row.validUntil.toISOString() : null,
  };
}

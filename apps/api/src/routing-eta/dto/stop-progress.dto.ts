import { DomainError } from '../../common/domain-error.js';

const STEPS = ['ARRIVED', 'SERVICE_STARTED', 'SERVICE_COMPLETED'] as const;
const MAX_FUTURE_SKEW_MS = 5 * 60_000;
const MAX_PAST_SKEW_MS = 24 * 60 * 60_000;

export interface StopProgressBody {
  step: (typeof STEPS)[number];
  clientRequestId: string;
  occurredAt: Date;
}

export interface StopProgressVoidBody {
  supersedesEventId: string;
  clientRequestId: string;
  reason: string;
  occurredAt: Date;
}

export function validateStopProgressBody(raw: unknown): StopProgressBody {
  const body = raw as Record<string, unknown>;
  if (typeof body.step !== 'string' || !STEPS.includes(body.step as never)) {
    throw new DomainError('BAD_REQUEST', 400, 'step không hợp lệ');
  }
  if (typeof body.clientRequestId !== 'string' || !body.clientRequestId) {
    throw new DomainError('BAD_REQUEST', 400, 'clientRequestId là bắt buộc');
  }
  const occurredAt = parseOccurredAt(body.occurredAt);
  return { step: body.step as never, clientRequestId: body.clientRequestId, occurredAt };
}

export function validateStopProgressVoidBody(raw: unknown): StopProgressVoidBody {
  const body = raw as Record<string, unknown>;
  if (typeof body.supersedesEventId !== 'string' || !body.supersedesEventId) {
    throw new DomainError('BAD_REQUEST', 400, 'supersedesEventId là bắt buộc');
  }
  if (typeof body.clientRequestId !== 'string' || !body.clientRequestId) {
    throw new DomainError('BAD_REQUEST', 400, 'clientRequestId là bắt buộc');
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    throw new DomainError('BAD_REQUEST', 400, 'reason là bắt buộc');
  }
  const occurredAt = parseOccurredAt(body.occurredAt);
  return {
    supersedesEventId: body.supersedesEventId,
    clientRequestId: body.clientRequestId,
    reason: body.reason,
    occurredAt,
  };
}

function parseOccurredAt(raw: unknown): Date {
  if (typeof raw !== 'string') {
    throw new DomainError('BAD_REQUEST', 400, 'occurredAt là bắt buộc');
  }
  const parsed = new Date(raw);
  const now = Date.now();
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getTime() - now > MAX_FUTURE_SKEW_MS ||
    now - parsed.getTime() > MAX_PAST_SKEW_MS
  ) {
    throw new DomainError('BAD_REQUEST', 400, 'occurredAt vượt giới hạn cho phép');
  }
  return parsed;
}

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// NOTE: no hoisting in this toolchain – register the mock, import dynamically.
const mockedPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockedPatch = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('../../lib/api/browser-client', () => ({
  browserClient: {
    post: (...args: unknown[]) => mockedPost(...args),
    patch: (...args: unknown[]) => mockedPatch(...args),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { ApiError } from '../../lib/api/api-error';
import { createAdminPreviewView } from './fixtures';
import type { AdminCommandView } from './model';

type ExecutorModule = typeof import('./execute-command');

let executeAdminCommand: ExecutorModule['executeAdminCommand'];

function disableUserCommand(): AdminCommandView {
  const view = createAdminPreviewView('users', 'ADM-USR-DENSE');
  if (view.kind !== 'list') throw new TypeError('expected list view');
  const row = view.result.items.find(
    (item): item is Extract<typeof item, { entity: 'user' }> =>
      item.entity === 'user' &&
      item.availableCommands.some((candidate) => candidate.kind === 'DISABLE_USER'),
  );
  const command = row?.availableCommands.find((candidate) => candidate.kind === 'DISABLE_USER');
  if (!command) throw new TypeError('expected a DISABLE_USER command in fixtures');
  return command;
}

function confirmPaymentCommand(): AdminCommandView {
  const view = createAdminPreviewView('order-detail', 'ADM-ORD-DETAIL');
  if (view.kind !== 'order-detail') throw new TypeError('expected order detail view');
  const command = view.availableCommands.find(
    (candidate) => candidate.kind === 'CONFIRM_MANUAL_PAYMENT',
  );
  if (!command) throw new TypeError('expected CONFIRM_MANUAL_PAYMENT in fixtures');
  return command;
}

beforeEach(async () => {
  mockedPost.mockReset();
  mockedPatch.mockReset();
  ({ executeAdminCommand } = await import('./execute-command'));
});

describe('executeAdminCommand', () => {
  it('patches user status through the BFF proxy with reason and idempotency key', async () => {
    mockedPatch.mockResolvedValue({ success: true });
    const command = disableUserCommand();

    const result = await executeAdminCommand(command, 'Vi phạm chính sách vận hành');

    expect(result).toMatchObject({ state: 'success' });
    expect(mockedPatch).toHaveBeenCalledTimes(1);
    const [path, body] = mockedPatch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe(`/admin/users/${command.targetId}/status`);
    expect(body.status).toBe('DISABLED');
    expect(body.reason).toBe('Vi phạm chính sách vận hành');
    expect(typeof body.clientRequestId).toBe('string');
    expect((body.clientRequestId as string).length).toBeGreaterThan(10);
  });

  it('maps a 422 validation error to the invalid dialog state', async () => {
    mockedPatch.mockRejectedValue(
      new ApiError(422, 'VALIDATION_ERROR', 'Lý do phải từ 5 đến 500 ký tự'),
    );
    const command = disableUserCommand();

    const result = await executeAdminCommand(command, 'abc');

    expect(result).toMatchObject({ state: 'invalid' });
  });

  it('maps a 409 conflict without treating it as generic failure', async () => {
    mockedPost.mockRejectedValue(new ApiError(409, 'PAYMENT_ALREADY_CONFIRMED', 'Đã xác nhận'));
    const command = confirmPaymentCommand();

    const result = await executeAdminCommand(command, 'Đối soát chuyển khoản VietQR');

    expect(result).toMatchObject({ state: 'conflict' });
  });
});

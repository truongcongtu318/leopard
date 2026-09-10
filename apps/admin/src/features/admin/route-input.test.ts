import { describe, expect, it } from '@jest/globals';

import { readAdminPreviewInput } from './route-input';

describe('Admin route preview input', () => {
  it('normalizes scalar, array and missing preview parameters', () => {
    expect(
      readAdminPreviewInput({
        preview: ['enabled', 'ignored'],
        scenario: 'ADM-ORD-DENSE',
        command: ['CONFIRM_MANUAL_PAYMENT', 'DELETE_FLEET'],
      }),
    ).toEqual({
      localFlag: 'enabled',
      scenario: 'ADM-ORD-DENSE',
      commandKind: 'CONFIRM_MANUAL_PAYMENT',
    });
    expect(readAdminPreviewInput({ command: 'DELETE_FLEET' })).toEqual({
      localFlag: null,
      scenario: null,
      commandKind: null,
    });
  });
});

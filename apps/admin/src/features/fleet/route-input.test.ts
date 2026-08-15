import { describe, expect, it } from '@jest/globals';

import { readFleetPreviewInput } from './route-input';

describe('Fleet route preview input', () => {
  it('normalizes scalar, array and missing search params', () => {
    expect(
      readFleetPreviewInput({ preview: ['enabled', 'ignored'], scenario: 'fleet-orders-mixed' }),
    ).toEqual({ localFlag: 'enabled', scenario: 'fleet-orders-mixed' });
    expect(readFleetPreviewInput({})).toEqual({ localFlag: null, scenario: null });
  });
});

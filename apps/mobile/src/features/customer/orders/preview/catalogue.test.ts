import { describe, expect, it } from '@jest/globals';

import { createCustomerPreviewView } from './catalogue';

describe('Customer preview catalogue', () => {
  it('selects deterministic defaults per route', () => {
    expect(createCustomerPreviewView('list', null).scenarioId).toBe('C-LIST-SUCCESS');
    expect(createCustomerPreviewView('create', null).scenarioId).toBe('C-NEW-ESTIMATE-DEMO');
    expect(createCustomerPreviewView('detail', null).scenarioId).toBe('C-DETAIL-SUCCESS');
  });

  it('rejects a scenario from another screen or unknown input', () => {
    expect(() => createCustomerPreviewView('list', 'C-DETAIL-SUCCESS')).toThrow(
      'Unsupported Customer preview scenario',
    );
    expect(() => createCustomerPreviewView('detail', '__proto__')).toThrow(
      'Unsupported Customer preview scenario',
    );
  });
});

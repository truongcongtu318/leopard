import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { searchVietmapWithCoords } from './vietmap-search';

describe('vietmap-search', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns empty array when query less than 2 chars', async () => {
    const results = await searchVietmapWithCoords('a');
    expect(results).toEqual([]);
  });

  it('resolves place coords via ref_id when lat/lng missing', async () => {
    const mockAutocomplete = [{ ref_id: 'ref-danang-123', display: '12 Duong Hoang Cong Chat, Ngu Hanh Son, Da Nang', name: '12 Hoang Cong Chat' }];
    const mockPlace = { display: '12 Duong Hoang Cong Chat', lat: 16.03512, lng: 108.24315 };
    globalThis.fetch = jest.fn<typeof fetch>()
      .mockResolvedValueOnce({ ok: true, json: async () => mockAutocomplete } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => mockPlace } as Response);
    const results = await searchVietmapWithCoords('12 Hoang Cong Chat', 'test-key');
    expect(results).toHaveLength(1);
    expect(results[0].coords).toEqual({ lat: 16.03512, lng: 108.24315 });
  });

  it('uses item lat/lng directly if provided', async () => {
    const mockAutocomplete = [{ ref_id: 'ref-hcm-456', display: 'Cho Ben Thanh, Quan 1', lat: 10.7725, lng: 106.698 }];
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValueOnce({ ok: true, json: async () => mockAutocomplete } as Response);
    const results = await searchVietmapWithCoords('Ben Thanh', 'test-key');
    expect(results).toHaveLength(1);
    expect(results[0].coords).toEqual({ lat: 10.7725, lng: 106.698 });
  });

  it('keeps house number from display when address only has ward/city', async () => {
    const mockAutocomplete = [
      {
        ref_id: 'ref-danang-400',
        display: '400 Duong Le Van Hien, Phuong Ngu Hanh Son, Da Nang',
        name: '400 Duong Le Van Hien',
        address: 'Phuong Ngu Hanh Son, Da Nang',
      },
    ];
    const mockPlace = { display: '400 Duong Le Van Hien, Phuong Ngu Hanh Son, Da Nang', lat: 16.024, lng: 108.24 };
    globalThis.fetch = jest.fn<typeof fetch>()
      .mockResolvedValueOnce({ ok: true, json: async () => mockAutocomplete } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => mockPlace } as Response);
    const results = await searchVietmapWithCoords('400 Le Van Hien', 'test-key');
    expect(results).toHaveLength(1);
    expect(results[0].address).toContain('400');
    expect(results[0].address).toContain('Le Van Hien');
  });
});

# Nationwide Accurate Address Search & Real GPS Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure searching any address nationwide resolves precise GPS coordinates via Vietmap Autocomplete v4 + Place v4 API, and pins map directly at exact GPS without text guessing.

**Architecture:** Unify Vietmap Autocomplete v4 + Place v4 geocoding in shared service vietmap-search.ts. Wire searchPlacesLive in HomeDashboardScreen to return coords for every suggestion. Store pickupCoords/dropoffCoords and pass into RealInteractiveMap.

**Tech Stack:** React Native, Expo, Leaflet / RealInteractiveMap (@leopard/mobile-core), Vietmap API v4, Jest, React Native Testing Library.

**Spec:** docs/requirements/01-srs.md (FR-CUST-001), docs/architecture/01-system-architecture.md

## Global Constraints

- Never use fake or random coordinates for real user addresses.
- All GPS coordinates conform to { lat: number, lng: number }.
- Leaflet map pins use origin.coords and destination.coords directly when available.
- Keep pre-push verification clean: pnpm --filter mobile test, typecheck, lint.

---

### Task 1: Extract & Test Shared Vietmap Geocoding Service

**Files:**
- Create: `apps/mobile/src/features/home/services/vietmap-search.ts`
- Test: `apps/mobile/src/features/home/services/vietmap-search.test.ts`

**Interfaces:**
- Consumes: Vietmap Autocomplete v4 + Place v4 REST endpoints
- Produces:
  - searchVietmapWithCoords(query, apiKey?): Promise<readonly GeocodedSuggestion[]>
  - fetchPlaceCoordsByRefId(refId, apiKey?): Promise<{lat,lng} | null>

- [ ] **Step 1: Write the failing test**

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/home/services/vietmap-search.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
export interface GeocodedSuggestion {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly address: string;
  readonly coords?: { lat: number; lng: number };
}

const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || 'c5a816dc04e0e2ad232a6bc91da9ae183a11b6e4b61cc646';

export async function fetchPlaceCoordsByRefId(refId: string, apiKey: string = DEFAULT_API_KEY): Promise<{ lat: number; lng: number } | null> {
  if (!refId || !apiKey) return null;
  try {
    const url = `https://maps.vietmap.vn/api/place/v4?refid=${encodeURIComponent(refId)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: unknown; lng?: unknown };
    const lat = typeof data.lat === 'number' ? data.lat : null;
    const lng = typeof data.lng === 'number' ? data.lng : null;
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) return { lat, lng };
    return null;
  } catch { return null; }
}

export async function searchVietmapWithCoords(query: string, apiKey: string = DEFAULT_API_KEY): Promise<readonly GeocodedSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2 || !apiKey) return [];
  try {
    const autoUrl = `https://maps.vietmap.vn/api/autocomplete/v4?apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(trimmed)}&display_type=5`;
    const res = await fetch(autoUrl);
    if (!res.ok) return [];
    const list = (await res.json()) as Array<{ ref_id?: string; display?: string; name?: string; address?: string; lat?: unknown; lng?: unknown }>;
    if (!Array.isArray(list) || list.length === 0) return [];
    const top = list.slice(0, 5);
    const resolved = await Promise.all(top.map(async (item, idx): Promise<GeocodedSuggestion> => {
      const placeId = item.ref_id || `sugg-${idx}-${Date.now()}`;
      const title = item.display || item.name || trimmed;
      const address = item.address || item.display || item.name || trimmed;
      const subtitle = item.display && item.address ? item.address : '';
      const directLat = typeof item.lat === 'number' ? item.lat : null;
      const directLng = typeof item.lng === 'number' ? item.lng : null;
      if (directLat !== null && directLng !== null) return { id: placeId, title, subtitle, address, coords: { lat: directLat, lng: directLng } };
      if (item.ref_id) {
        const placeCoords = await fetchPlaceCoordsByRefId(item.ref_id, apiKey);
        if (placeCoords) return { id: placeId, title, subtitle, address, coords: placeCoords };
      }
      return { id: placeId, title, subtitle, address };
    }));
    return resolved;
  } catch { return []; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test -- src/features/home/services/vietmap-search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/home/services/vietmap-search.ts apps/mobile/src/features/home/services/vietmap-search.test.ts
git commit -m "feat(home): add shared vietmap search service with exact GPS coords"
```

### Task 2: Wire searchPlacesLive to Return Real GPS Coords

**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx:215-250`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: searchVietmapWithCoords from Task 1
- Produces: LocationSuggestionItem.coords populated with real lat/lng

- [ ] **Step 1: Update searchPlacesLive to delegate to shared service**

```ts
import { searchVietmapWithCoords } from './services/vietmap-search';

export async function searchPlacesLive(query: string, apiKey?: string): Promise<readonly LocationSuggestionItem[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];
  const liveResults = await searchVietmapWithCoords(trimmed, apiKey);
  if (liveResults.length > 0) return liveResults;
  return searchPlacesDirect(trimmed);
}
```

- [ ] **Step 2: Verify selection handler saves coords (HomeDashboardScreen.tsx:765-780)**

```tsx
onPress={() => {
  haptic.selection();
  if (focusedField === 'pickup') {
    setPickupText(item.address);
    setPickupLabel(item.title);
    setPickupCoords(item.coords || null);
  } else if (focusedField === 'dropoff') {
    setDropoffText(item.address);
    setDropoffCoords(item.coords || null);
  } else if (focusedField?.startsWith('stop:')) {
    const stopId = focusedField.slice('stop:'.length);
    handleUpdateStop(stopId, item.address, item.coords);
  }
  setFocusedField(null);
}}
```

- [ ] **Step 3: Run HomeDashboardScreen tests**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: 27 PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/home/HomeDashboardScreen.tsx apps/mobile/src/features/home/HomeDashboardScreen.test.tsx
git commit -m "fix(home): integrate real GPS coords into live address search"
```

### Task 3: Sort Dict Keys by Specificity + Verify Direct GPS Pinning

**Files:**
- Modify: `packages/mobile-core/src/ui/RealInteractiveMap.tsx:99-104`
- Test: `packages/mobile-core/src/ui/RealInteractiveMap.test.tsx`

**Interfaces:**
- Consumes: origin.coords, destination.coords
- Produces: preview mode centers on origin.coords zoom 16 when present; fallback dict matches longest keys first

- [ ] **Step 1: Sort dictionary keys by length descending**

```ts
const sortedEntries = Object.entries(VIETNAM_LOCATION_DICT).sort((a, b) => b[0].length - a[0].length);
for (const [key, coords] of sortedEntries) {
  if (query.includes(key)) return coords;
}
```

- [ ] **Step 2: Run mobile-core tests**

Run: `pnpm --filter @leopard/mobile-core test`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add packages/mobile-core/src/ui/RealInteractiveMap.tsx packages/mobile-core/src/ui/RealInteractiveMap.test.tsx
git commit -m "fix(map): sort dict keys by specificity, prioritize direct GPS coords"
```

### Task 4: Full Verification

- [ ] **Step 1: Run mobile typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: 0 errors

- [ ] **Step 2: Run mobile lint**

Run: `pnpm --filter mobile lint`
Expected: 0 errors

- [ ] **Step 3: Run all mobile tests**

Run: `pnpm --filter mobile test`
Expected: 48 suites PASS

- [ ] **Step 4: Merge to develop and push**

```bash
git checkout develop
git merge fix/nationwide-accurate-address-search
git push origin develop
```

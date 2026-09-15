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
    if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
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

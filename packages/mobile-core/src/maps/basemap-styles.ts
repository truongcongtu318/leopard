import type { StyleSpecification } from 'maplibre-gl';

export const VIETMAP_DEFAULT_STYLE_ENDPOINT = 'https://maps.vietmap.vn/api/maps/light/styles.json?apikey=';

/**
 * High-availability Vietnam raster basemap specification for MapLibre GL.
 * Uses Google Vietnamese-labeled tiles (`&hl=vi`) with zero external API key requirement.
 * Guarantees instantaneous style initialization without network roundtrips for style JSON,
 * completely preventing white screens if Vietmap credentials expire, lock (423), or return 401.
 */
export const DEFAULT_FALLBACK_BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'vietnam-basemap': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
        'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
        'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'vietnam-basemap-layer',
      type: 'raster',
      source: 'vietnam-basemap',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

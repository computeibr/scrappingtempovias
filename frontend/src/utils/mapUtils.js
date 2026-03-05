/**
 * Extrai origin, destination e waypoints de uma URL do Google Maps Directions.
 * Suporta os formatos:
 *   /maps/dir/Origem/Destino/@lat,lng,zoom
 *   /maps/dir/?api=1&origin=...&destination=...&waypoints=...
 */
export function parseGoogleMapsUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);

    // Formato: /maps/dir/Ponto1/Ponto2/.../@lat,lng
    const dirMatch = urlObj.pathname.match(/\/maps\/dir\/(.+)/);
    if (dirMatch) {
      const parts = dirMatch[1]
        .split('/')
        .map((p) => decodeURIComponent(p).replace(/\+/g, ' ').trim())
        .filter((p) => {
          if (!p) return false;
          if (p.startsWith('@')) return false;     // coordenadas de zoom (@lat,lng,zoom)
          if (p.startsWith('data=')) return false; // metadados do Maps
          return true;
        });

      if (parts.length >= 2) {
        return {
          origin: parts[0],
          destination: parts[parts.length - 1],
          waypoints: parts.slice(1, -1).map((p) => ({ location: p, stopover: false })),
        };
      }
    }

    // Formato: ?api=1&origin=...&destination=...
    const origin = urlObj.searchParams.get('origin');
    const destination = urlObj.searchParams.get('destination');
    if (origin && destination) {
      const waypointsRaw = urlObj.searchParams.get('waypoints');
      return {
        origin,
        destination,
        waypoints: waypointsRaw
          ? waypointsRaw.split('|').map((p) => ({ location: p.trim(), stopover: false }))
          : [],
      };
    }
  } catch {
    // URL inválida
  }
  return null;
}

/** Gera uma cor distinta para cada rota (baseada no índice) */
export const ROUTE_COLORS = [
  '#004A80',
  '#E95F3E',
  '#34973B',
  '#F9C600',
  '#E51B23',
  '#00C0F3',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#2C678C',
];

export function routeColor(index) {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}

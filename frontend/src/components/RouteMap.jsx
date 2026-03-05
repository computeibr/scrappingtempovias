import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
import { parseGoogleMapsUrl, routeColor } from '../utils/mapUtils';

const MAPA_CENTER = { lat: -22.9068, lng: -43.1729 }; // Rio de Janeiro
const MAPA_ZOOM = 12;
const LIBRARIES = ['geometry', 'places'];

const MAP_STYLES = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#a2c9e8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f2' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#c9d3dd' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#b4bcc4' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
];

function RouteRenderer({ rota, index, map }) {
  const [directions, setDirections] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!map || !rota.url) return;

    const parsed = parseGoogleMapsUrl(rota.url);
    if (!parsed) {
      setErro(true);
      return;
    }

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: parsed.origin,
        destination: parsed.destination,
        waypoints: parsed.waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        region: 'BR',
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        } else {
          setErro(true);
          console.warn(`Rota "${rota.name}" não pôde ser renderizada: ${status}`);
        }
      },
    );
  }, [map, rota]);

  if (!directions) return null;

  return (
    <DirectionsRenderer
      directions={directions}
      options={{
        polylineOptions: {
          strokeColor: routeColor(index),
          strokeWeight: 5,
          strokeOpacity: 0.9,
        },
        suppressMarkers: false,
        markerOptions: {
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: routeColor(index),
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        },
      }}
    />
  );
}

export default function RouteMap({ rotasSelecionadas, rotas }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
  const [mapInstance, setMapInstance] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'pt-BR',
    region: 'BR',
  });

  const onLoad = useCallback((map) => {
    setMapInstance(map);
  }, []);

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-navy-900 rounded-xl">
        <div className="text-center p-8">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-white font-semibold">Chave do Google Maps não configurada</p>
          <p className="text-white/50 text-sm mt-2">
            Adicione <code className="bg-white/10 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> no
            arquivo <code className="bg-white/10 px-1 rounded">frontend/.env</code>
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 rounded-xl">
        <p className="text-red-600 text-sm">Erro ao carregar Google Maps.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-gray rounded-xl">
        <div className="w-8 h-8 border-3 border-navy/30 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  const rotasVisiveis = rotas.filter((r) => rotasSelecionadas.includes(r.id));

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full rounded-xl"
      center={MAPA_CENTER}
      zoom={MAPA_ZOOM}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
      onLoad={onLoad}
    >
      {mapInstance &&
        rotasVisiveis.map((rota, idx) => (
          <RouteRenderer
            key={rota.id}
            rota={rota}
            index={rotas.findIndex((r) => r.id === rota.id)}
            map={mapInstance}
          />
        ))}
    </GoogleMap>
  );
}

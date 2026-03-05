import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, InfoWindow } from '@react-google-maps/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { routeColor } from '../utils/mapUtils';

const MAPA_CENTER = { lat: -22.940754, lng: -43.440870 };
const LIBRARIES = ['geometry', 'places'];

const MAP_STYLES = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#a2c9e8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f2' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#c9d3dd' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#b4bcc4' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
];

function RotaPolyline({ rota, index, isActive, onPolylineClick }) {
  const [path, setPath] = useState(null);

  useEffect(() => {
    if (!rota.geometry || !window.google) return;
    try {
      const decoded = window.google.maps.geometry.encoding.decodePath(rota.geometry);
      setPath(decoded);
    } catch (e) {
      console.warn(`Erro ao decodificar geometry da rota "${rota.name}":`, e);
    }
  }, [rota.geometry]);

  if (!path) return null;

  return (
    <Polyline
      path={path}
      options={{
        strokeColor: routeColor(index),
        strokeWeight: isActive ? 7 : 3,
        strokeOpacity: isActive ? 1.0 : 0.45,
        zIndex: isActive ? 10 : 1,
      }}
      onClick={(e) => onPolylineClick(e, rota)}
    />
  );
}

export default function RouteMap({ rotas, rotaAtiva, snapshot = {}, onRotaClick }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
  const [popup, setPopup] = useState(null); // { position, rota }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'pt-BR',
    region: 'BR',
  });

  const onLoad = useCallback(() => {}, []);

  function handlePolylineClick(e, rota) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPopup({ position: { lat, lng }, rota });
    if (onRotaClick) onRotaClick(rota);
  }

  function handlePopupClose() {
    setPopup(null);
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-navy-900">
        <div className="text-center p-8">
          <p className="text-white font-semibold">Chave do Google Maps não configurada</p>
          <p className="text-white/50 text-sm mt-2">
            Adicione <code className="bg-white/10 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> nas variáveis de ambiente
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50">
        <p className="text-red-600 text-sm">Erro ao carregar Google Maps.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-gray">
        <div className="w-8 h-8 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={MAPA_CENTER}
      zoom={11}
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
      {rotas.map((rota, idx) => (
        <RotaPolyline
          key={rota.id}
          rota={rota}
          index={idx}
          isActive={rotaAtiva?.id === rota.id}
          onPolylineClick={handlePolylineClick}
        />
      ))}

      {popup && (
        <InfoWindow
          position={popup.position}
          onCloseClick={handlePopupClose}
          options={{ pixelOffset: new window.google.maps.Size(0, -5) }}
        >
          <PopupContent
            rota={popup.rota}
            leitura={snapshot[popup.rota.id]}
            isActive={rotaAtiva?.id === popup.rota.id}
            rotaIdx={rotas.findIndex((r) => r.id === popup.rota.id)}
          />
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

function PopupContent({ rota, leitura, isActive, rotaIdx }) {
  const color = routeColor(rotaIdx);

  return (
    <div style={{ minWidth: 200, maxWidth: 260, fontFamily: 'inherit' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 13, color: '#13335A', lineHeight: 1.3 }}>
          {rota.name}
        </span>
      </div>

      {leitura ? (
        <>
          {/* Última leitura */}
          <div
            style={{
              background: '#F0F0F0',
              borderRadius: 6,
              padding: '6px 10px',
              marginBottom: 6,
            }}
          >
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Última leitura</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#004A80', margin: '2px 0 0' }}>
              {leitura.tempo}
            </p>
            <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
              {leitura.km} &nbsp;·&nbsp;{' '}
              {format(new Date(leitura.leitura), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0' }}>
          Sem leituras registradas ainda.
        </p>
      )}

      {!isActive && (
        <p style={{ fontSize: 11, color: '#00C0F3', marginTop: 4 }}>
          Clique na rota na lista para ver o histórico completo
        </p>
      )}
    </div>
  );
}

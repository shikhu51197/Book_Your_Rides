"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const carIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3204/3204121.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface MapProps {
  center: [number, number];
  zoom?: number;
  readOnly?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  markers?: Array<{ id: string; lat: number; lng: number; title?: string; type?: "default" | "car" | "pickup" | "drop" }>;
  routePoints?: [number, number][];
}

function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function Map({ center, zoom = 13, readOnly = true, onLocationSelect, markers = [], routePoints = [] }: MapProps) {
  const [position, setPosition] = useState<[number, number]>(center);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ height: "100%", width: "100%", background: "#1a1a2e" }} />;

  const handleSelect = (lat: number, lng: number) => {
    if (readOnly) return;
    setPosition([lat, lng]);
    if (onLocationSelect) onLocationSelect(lat, lng);
  };

  return (
    <MapContainer 
      center={position} 
      zoom={zoom} 
      style={{ height: "100%", width: "100%", borderRadius: "inherit", zIndex: 0 }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      
      <MapUpdater center={position} zoom={zoom} />

      {!readOnly && (
        <>
          <LocationSelector onSelect={handleSelect} />
          <Marker position={position}>
            <Popup>Selected Pickup Location</Popup>
          </Marker>
        </>
      )}

      {routePoints.length > 1 && (
        <Polyline positions={routePoints} color="#3b82f6" weight={5} opacity={0.7} dashArray="10, 10" />
      )}

      {markers.map(m => (
        <Marker 
          key={m.id} 
          position={[m.lat, m.lng]} 
          icon={m.type === 'car' ? carIcon : new L.Icon.Default()}
        >
          {m.title && <Popup>{m.title}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}

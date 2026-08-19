'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { markerIcon } from '../lib/leafletIcon';

interface WarehouseMapProps {
  warehouses: { id: string; name: string; location: string; latitude?: number | null; longitude?: number | null }[];
  onMarkerClick?: (id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [24.5, 51];
const DEFAULT_ZOOM = 5;

export default function WarehouseMap({ warehouses, onMarkerClick }: WarehouseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    }
    const map = mapInstance.current;

    const located = warehouses.filter((w) => w.latitude != null && w.longitude != null);
    const markers = located.map((w) => {
      const marker = L.marker([w.latitude as number, w.longitude as number], { icon: markerIcon }).addTo(map);
      marker.bindPopup(`<strong>${w.name}</strong><br/>${w.location}`);
      if (onMarkerClick) marker.on('click', () => onMarkerClick(w.id));
      return marker;
    });

    if (located.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 10 });
    }

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouses]);

  useEffect(() => () => { mapInstance.current?.remove(); mapInstance.current = null; }, []);

  return <div ref={mapRef} style={{ height: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }} />;
}

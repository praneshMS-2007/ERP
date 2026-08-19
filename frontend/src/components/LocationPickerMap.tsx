'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Search } from 'lucide-react';
import { inventoryApi } from '../services/api';
import { markerIcon } from '../lib/leafletIcon';

interface LocationPickerMapProps {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number, lng: number, label?: string) => void;
}

// Centered on the Gulf, matching where this company's warehouses already are.
const DEFAULT_CENTER: [number, number] = [24.5, 51];
const DEFAULT_ZOOM = 5;

export default function LocationPickerMap({ latitude, longitude, onChange }: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Resolves the full address for wherever the pin just landed — drag,
  // click, and "My Location" all go through this, not just the search box,
  // so the location text field always reflects where the pin actually is.
  async function resolveAndEmit(lat: number, lng: number) {
    onChange(lat, lng);
    try {
      const result = await inventoryApi.reverseGeocode(lat, lng);
      onChange(lat, lng, result.displayName);
    } catch {
      // Reverse lookup failing (offline, no match) shouldn't block placing
      // the pin — the coordinates are already set, just without a label.
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initialCenter: [number, number] = latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER;
    const map = L.map(mapRef.current).setView(initialCenter, latitude != null ? 13 : DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker(initialCenter, { icon: markerIcon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      resolveAndEmit(pos.lat, pos.lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      resolveAndEmit(e.latlng.lat, e.latlng.lng);
    });

    mapInstance.current = map;
    markerInstance.current = marker;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the pin in sync when the parent sets lat/lng from outside (e.g.
  // after a successful address search or "My Location").
  useEffect(() => {
    if (latitude == null || longitude == null || !mapInstance.current || !markerInstance.current) return;
    const pos: [number, number] = [latitude, longitude];
    markerInstance.current.setLatLng(pos);
    mapInstance.current.setView(pos, 13);
  }, [latitude, longitude]);

  function handleUseMyLocation() {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Your browser does not support location access.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolveAndEmit(pos.coords.latitude, pos.coords.longitude),
      () => setGeoError('Could not access your location — check your browser/device permission.'),
    );
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const result = await inventoryApi.geocode(searchQuery);
      onChange(result.latitude, result.longitude, result.displayName);
    } catch (e: any) {
      setSearchError(e.message || 'Location not found.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
        Pin Location <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="Search an address or place..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '13px' }}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleSearch} disabled={searching}>
          <Search size={13} /> {searching ? 'Searching…' : 'Search'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleUseMyLocation}>
          <Crosshair size={13} /> My Location
        </button>
      </div>
      {searchError && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>{searchError}</div>}
      {geoError && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>{geoError}</div>}
      <div ref={mapRef} style={{ height: '260px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }} />
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
        Drag the pin, click the map, search an address, or use your device location.
      </div>
    </div>
  );
}

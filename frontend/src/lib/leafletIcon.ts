import L from 'leaflet';

// Leaflet's default marker icon breaks under most bundlers (it resolves
// image paths relative to the JS bundle, not the public folder) — pointing
// straight at the same version's images on unpkg sidesteps that entirely.
// Shared by every map component so there's one place to update the version.
export const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

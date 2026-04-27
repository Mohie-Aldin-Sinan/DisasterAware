"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix generic Leaflet icon missing in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

function MapUpdater({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 10);
  }, [lat, lon, map]);
  return null;
}

export default function MiniMap({ lat, lon }) {
  return (
    <MapContainer center={[lat, lon]} zoom={10} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; <a href='https://carto.com/'>carto.com</a>"
      />
      <MapUpdater lat={lat} lon={lon} />
      <Marker position={[lat, lon]}>
        <Popup>Target Location</Popup>
      </Marker>
    </MapContainer>
  );
}

"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchJson } from "../lib/api";

// Fix generic Leaflet icon missing in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// Custom Red Icon for High Mag Events
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function LiveMap() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUSGS() {
      try {
        const data = await fetchJson("/api/usgs-proxy/");
        setEvents(data.data || []);
      } catch (err) {
        console.error("Failed to load map data", err);
        setError(err.message || "Live seismic feed is temporarily unavailable.");
      }
      setLoading(false);
    }
    fetchUSGS();
  }, []);

  return (
    <div className="relative h-[600px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xl z-0">
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      {!loading && error ? (
        <div className="absolute inset-x-4 top-4 z-50 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-lg">
          {error}
        </div>
      ) : null}
      {!loading && !error && events.length === 0 ? (
        <div className="absolute inset-x-4 top-4 z-50 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg">
          No live seismic events are available right now.
        </div>
      ) : null}
      <MapContainer center={[22.0, 79.0]} zoom={4.5} style={{ height: "100%", width: "100%", backgroundColor: "#060b18" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; <a href='https://carto.com/'>carto.com</a>"
        />
        {events.map((ev) => (
          <Marker 
            key={ev.id} 
            position={[ev.lat, ev.lon]}
            icon={ev.magnitude >= 5.0 ? redIcon : new L.Icon.Default()}
          >
            <Popup className="bg-white text-slate-900 border-0">
              <div className="p-1">
                <h4 className="font-bold text-sm mb-1 text-slate-900">{ev.place}</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-600 block uppercase scale-90 origin-left">Magnitude</span>
                    <span className={`font-mono text-sm ${ev.magnitude >= 5.0 ? 'text-red-400 font-bold' : 'text-amber-400'}`}>M {ev.magnitude.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block uppercase scale-90 origin-left">Depth</span>
                    <span className="font-mono text-slate-800">{Math.round(ev.depth_km)} km</span>
                  </div>
                  <div className="col-span-2 mt-1 pt-1 border-t border-slate-300">
                    <span className="text-slate-700">Updated {ev.time_ago}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

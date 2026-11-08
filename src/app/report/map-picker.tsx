"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { PAVLODAR_CENTER } from "@/lib/constants";

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html:
      `<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;` +
      `transform:rotate(-45deg);background:#2563eb;border:2px solid #ffffff;` +
      `box-shadow:0 2px 8px rgba(23,43,77,0.35);"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 19],
  });
}

function ClickPicker({
  onChange,
}: {
  onChange: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    },
  });
  return null;
}

function Recentre({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude, map]);
  return null;
}

export default function MapPicker({
  lat,
  lon,
  onChange,
}: {
  lat: number | null;
  lon: number | null;
  onChange: (lat: number, lon: number) => void;
}) {
  return (
    <div className="h-[300px] overflow-hidden rounded-xl outline outline-line sm:h-[340px]">
      <MapContainer
        center={[PAVLODAR_CENTER.lat, PAVLODAR_CENTER.lon]}
        zoom={12}
        minZoom={10}
        maxZoom={18}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickPicker onChange={onChange} />
        <Recentre latitude={lat} longitude={lon} />
        {lat !== null && lon !== null && (
          <Marker position={[lat, lon]} icon={pinIcon()} />
        )}
      </MapContainer>
    </div>
  );
}

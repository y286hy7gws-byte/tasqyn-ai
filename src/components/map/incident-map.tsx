"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import type { FloodReport, Severity } from "@/lib/types";
import { PAVLODAR_CENTER, SEVERITY_META } from "@/lib/constants";
import { relativeTime, idToNum } from "@/lib/format";
import { computeZones, type Zone } from "@/lib/zones";

export type { Zone };

// ---------------------------------------------------------------- markers

function makeIcon(severity: Severity, focused: boolean): L.DivIcon {
  const meta = SEVERITY_META[severity];
  const s = focused ? 22 : 16;
  return L.divIcon({
    className: "",
    html:
      `<span class="marker-pin" style="display:block;width:${s}px;height:${s}px;` +
      `border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
      `background:${meta.color};border:2px solid #ffffff;` +
      `box-shadow:0 2px 8px rgba(23,43,77,0.35);"></span>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s - 1],
    popupAnchor: [0, -(s - 4)],
  });
}

// ---------------------------------------------------------------- focus controller

function MapController({ focus }: { focus: FloodReport | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => {
      map.flyTo([focus.latitude, focus.longitude], 15, { duration: 0.9 });
    }, 150);
    return () => clearTimeout(t);
  }, [focus, map]);
  return null;
}

// ---------------------------------------------------------------- popup

function ReportPopup({ r }: { r: FloodReport }) {
  const meta = SEVERITY_META[r.severity];
  return (
    <div className="space-y-1.5">
      {r.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.photo_url}
          alt=""
          className="mb-2 -mx-1 mt-0 h-24 w-full object-cover"
          style={{ borderRadius: 8 }}
        />
      )}
      <div className="flex items-center gap-1.5 text-[10px]">
        <span
          className="rounded px-1.5 py-0.5 font-bold"
          style={{ color: meta.color, background: meta.dim }}
        >
          {meta.label.toUpperCase()}
        </span>
        <span className="text-fg-mute">риск {r.risk_score}</span>
        {r.is_demo && (
          <span className="rounded bg-[#fffbeb] px-1.5 py-0.5 font-bold text-[#92400e] border border-[#fcd34d]">
            DEMO
          </span>
        )}
      </div>
      <div className="font-semibold leading-snug text-fg">{r.title}</div>
      <div className="text-[11px] text-fg-mute">
        {r.district ? (
          <>
            {r.district}
            <br />
          </>
        ) : null}
        {relativeTime(r.created_at)} · {idToNum(r.id)}
      </div>
      <Link
        href={`/incidents/${r.id}`}
        className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
      >
        Подробнее <ChevronRight size={12} />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------- markers

function ReportMarkers({
  reports,
  focusId,
  refs,
  faded,
}: {
  reports: FloodReport[];
  focusId: string | null;
  refs: React.RefObject<Map<string, L.Marker>>;
  faded: boolean;
}) {
  return (
    <>
      {reports.map((r) => (
        <Marker
          key={r.id}
          position={[r.latitude, r.longitude]}
          icon={makeIcon(faded ? "low" : r.severity, r.id === focusId)}
          opacity={faded ? 0.4 : 1}
          eventHandlers={{
            add: (e) => {
              refs.current?.set(r.id, e.target as L.Marker);
            },
            remove: () => {
              refs.current?.delete(r.id);
            },
          }}
        >
          <Popup>
            <ReportPopup r={r} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- main

interface IncidentMapProps {
  reports: FloodReport[];
  focusId: string | null;
  showZones: boolean;
}

export default function IncidentMap({ reports, focusId, showZones }: IncidentMapProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  const focus = useMemo(
    () => reports.find((r) => r.id === focusId) ?? null,
    [reports, focusId],
  );

  const zones = useMemo(
    () => (showZones ? computeZones(reports) : []),
    [reports, showZones],
  );

  // Открыть popup перед маркером-фокусом
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => {
      markerRefs.current?.get(focus.id)?.openPopup();
    }, 1100);
    return () => clearTimeout(t);
  }, [focus]);

  const active = reports.filter((r) => r.status !== "resolved");
  const resolved = reports.filter((r) => r.status === "resolved");

  return (
    <MapContainer
      center={[PAVLODAR_CENTER.lat, PAVLODAR_CENTER.lon]}
      zoom={12}
      minZoom={10}
      maxZoom={18}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {zones.map((z, i) => (
        <Circle
          key={`zone-${i}`}
          center={[z.lat, z.lon]}
          radius={300 + z.count * 120}
          pathOptions={{
            color: SEVERITY_META[z.severity].color,
            weight: 1,
            opacity: 0.5,
            fillColor: SEVERITY_META[z.severity].color,
            fillOpacity: z.count >= 4 ? 0.15 : 0.09,
            dashArray: "4 6",
          }}
        >
          <Popup>
            <b>Зона концентрации</b>
            <br />
            {z.count} активн. инцидент{z.count === 1 ? "" : "а"} в зонной ячейке сетки (~1,5–2 км)
          </Popup>
        </Circle>
      ))}

      <ReportMarkers reports={active} focusId={focusId} refs={markerRefs} faded={false} />
      <ReportMarkers reports={resolved} focusId={focusId} refs={markerRefs} faded />

      <MapController focus={focus} />
    </MapContainer>
  );
}

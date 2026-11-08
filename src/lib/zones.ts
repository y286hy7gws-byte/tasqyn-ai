import type { FloodReport, Severity } from "@/lib/types";
import { SEVERITY_META } from "@/lib/constants";

export interface Zone {
  lat: number;
  lon: number;
  count: number;
  severity: Severity;
}

/**
 * Сеточная кластеризация инцидентов: ячейка ≈ 2 км × 1.7 км (масштаб района).
 * Возвращает зоны концентрации активных инцидентов (≥ 2 в ячейке).
 * includeResolved — учитывать и устранённые (для исторической повторяемости).
 */
export function computeZones(
  reports: FloodReport[],
  cellLat = 0.02,
  cellLon = 0.025,
  includeResolved = false,
): Zone[] {
  const active = reports.filter((r) => includeResolved || r.status !== "resolved");
  const cells = new Map<
    string,
    { lat: number; lon: number; count: number; maxSeverity: Severity }
  >();
  for (const r of active) {
    const key = `${Math.round(r.latitude / cellLat)}_${Math.round(r.longitude / cellLon)}`;
    const cur = cells.get(key) ?? {
      lat: 0,
      lon: 0,
      count: 0,
      maxSeverity: "low" as Severity,
    };
    cur.lat += r.latitude;
    cur.lon += r.longitude;
    cur.count += 1;
    if (SEVERITY_META[r.severity].order > SEVERITY_META[cur.maxSeverity].order) {
      cur.maxSeverity = r.severity;
    }
    cells.set(key, cur);
  }
  const zones: Zone[] = [];
  for (const c of cells.values()) {
    if (c.count >= 2) {
      zones.push({
        lat: c.lat / c.count,
        lon: c.lon / c.count,
        count: c.count,
        severity: c.maxSeverity,
      });
    }
  }
  return zones;
}

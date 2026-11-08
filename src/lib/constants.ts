import type { IncidentStatus, Severity } from "./types";

/** Центр Павлодара */
export const PAVLODAR_CENTER = {
  lat: 52.2856,
  lon: 76.9616,
} as const;

/** Границы городской территории для проверки координат */
export const PAVLODAR_BOUNDS = {
  minLat: 52.22,
  maxLat: 52.36,
  minLon: 76.83,
  maxLon: 77.06,
} as const;

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; dim: string; order: number }
> = {
  low: { label: "Низкий", color: "#16a34a", dim: "rgba(22,163,74,0.1)", order: 0 },
  medium: { label: "Средний", color: "#eab308", dim: "rgba(234,179,8,0.12)", order: 1 },
  high: { label: "Высокий", color: "#f97316", dim: "rgba(249,115,22,0.12)", order: 2 },
  critical: { label: "Критический", color: "#dc2626", dim: "rgba(220,38,38,0.1)", order: 3 },
};

export const STATUS_META: Record<
  IncidentStatus,
  { label: string; color: string; dim: string }
> = {
  new: { label: "Новый", color: "#7c3aed", dim: "rgba(124,58,237,0.09)" },
  reviewing: { label: "На проверке", color: "#0891b2", dim: "rgba(8,145,178,0.09)" },
  confirmed: { label: "Подтверждён", color: "#2563eb", dim: "rgba(37,99,235,0.09)" },
  resolved: { label: "Устранён", color: "#16a34a", dim: "rgba(22,163,74,0.1)" },
};

export const ADMIN_PASSWORD_DEFAULT = "tasqyn-admin";

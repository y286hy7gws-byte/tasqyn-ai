// Доменные типы TASQYN AI

export type Severity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "new" | "reviewing" | "confirmed" | "resolved";

export type WaterVisibility = "none" | "minor" | "significant" | "extensive";

export type PedestrianAccessibility = "free" | "limited" | "blocked";

export interface AIAnalysis {
  flood_detected: boolean;
  severity: Severity;
  confidence: number; // 0..1
  water_visibility: WaterVisibility;
  pedestrian_accessibility: PedestrianAccessibility;
  summary: string;
  recommended_action: string;
  /** Кто выполнил анализ: провайдер модели или "demo-heuristic" */
  provider: string;
  /** true = анализ выполнен демонстрационным алгоритмом, а не настоящей моделью */
  is_demo: boolean;
  analyzed_at: string; // ISO
}

export interface FloodReport {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  /** Примерная глубина воды, см (оценка свидетеля, не измерение) */
  water_depth: number | null;
  accessibility: PedestrianAccessibility | null;
  severity: Severity;
  risk_score: number; // 0..100
  confidence: number; // 0..1
  status: IncidentStatus;
  ai_analysis: AIAnalysis | null;
  /** Расширенное поле TASQYN: район/ориентир (необязательно) */
  district: string | null;
  /** Факторы индекса риска — расшифровка для интерфейса */
  risk_factors: RiskFactor[] | null;
  /** true = синтетическая демо-запись */
  is_demo: boolean;
  reporter_contact: string | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface RiskFactor {
  label: string;
  /** Вклад фактора в индекс (0..weight) */
  points: number;
  weight: number;
  note: string;
}

export interface ReportComment {
  id: string;
  report_id: string;
  author: string;
  text: string;
  is_demo: boolean;
  created_at: string;
}

export interface RiskAssessment {
  score: number;
  level: Severity;
  factors: RiskFactor[];
}

export interface CreateReportInput {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  water_depth: number | null;
  accessibility: PedestrianAccessibility;
  ai_analysis: AIAnalysis | null;
  reporter_contact: string | null;
}

export const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
export const STATUSES: IncidentStatus[] = ["new", "reviewing", "confirmed", "resolved"];
export const ACCESSIBILITIES: PedestrianAccessibility[] = ["free", "limited", "blocked"];

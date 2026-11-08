import type { AIAnalysis, RiskAssessment, RiskFactor } from "./types";
import type { CreateReportInput } from "./types";
import { haversineDistance, clamp } from "./format";

/**
 * Risk Scoring Engine TASQYN AI.
 *
 * Формирует индекс риска 0..100 для ОТЧЁТА О ПОДТОПЛЕНИИ на основе данных,
 * доступных системе в момент обработки инцидента.
 *
 * ВАЖНО: это индекс срочности реагирования на сообщения жителей, а НЕ прогноз
 * наводнения и не гидрологическая модель.
 */

interface NearbyContext {
  /** Подтверждённые (status confirmed) или новые инциденты ближе `radiusKm` */
  count: number;
  /** Сколько инцидентов в этой же точке фиксировалось за последние дни (повторяемость) */
  recurrence: number;
  /** Возраст самого свежего соседнего инцидента в часах */
  nearestAgeHours: number | null;
}

export const NEARBY_RADIUS_KM = 0.8;
export const RECURRENCE_RADIUS_KM = 0.35;

export function computeNearbyContext(
  draft: Pick<CreateReportInput, "latitude" | "longitude">,
  existing: ReadonlyArray<{
    latitude: number;
    longitude: number;
    status: string;
    created_at: string;
  }>,
): NearbyContext {
  let count = 0;
  let recurrence = 0;
  let nearestAgeHours: number | null = null;

  for (const r of existing) {
    if (r.status === "resolved" || r.status === "reviewing") continue;
    const d = haversineDistance(
      draft.latitude,
      draft.longitude,
      r.latitude,
      r.longitude,
    );
    const ageHours = (Date.now() - new Date(r.created_at).getTime()) / 3_600_000;
    if (d < NEARBY_RADIUS_KM && ageHours < 72) {
      count += 1;
      if (nearestAgeHours === null || ageHours < nearestAgeHours) nearestAgeHours = ageHours;
    }
    if (d < RECURRENCE_RADIUS_KM && ageHours < 30 * 24) {
      recurrence += 1;
    }
  }
  return { count, recurrence, nearestAgeHours };
}

function severityPoints(ai: AIAnalysis | null): { points: number; note: string } {
  if (!ai || !ai.flood_detected) {
    return { points: 0, note: "AI не подтвердил признаки подтопления" };
  }
  const base: Record<string, number> = { low: 3, medium: 8, high: 14, critical: 20 };
  const p = base[ai.severity] ?? 0;
  return {
    points: Math.round(p * clamp(ai.confidence, 0.2, 1)),
    note: `Визуальные признаки: ${severityRu(ai.severity)} (уверенность ${(ai.confidence * 100).toFixed(0)}%)`,
  };
}

function severityRu(s: AIAnalysis["severity"]): string {
  return { low: "низкие", medium: "умеренные", high: "значительные", critical: "тяжёлые" }[s];
}

function depthPoints(depthCm: number | null): { points: number; note: string } {
  if (depthCm === null) return { points: 0, note: "Оценка глубины не указана" };
  if (depthCm <= 0) return { points: 0, note: "Лужи практически отсутствуют" };
  const p = clamp((depthCm / 40) * 28, 0, 28); // 40+ см → максимум
  return {
    points: Math.round(p),
    note: `Оценка глубины: ~${depthCm} см`,
  };
}

function accessPoints(access: CreateReportInput["accessibility"]): { points: number; note: string } {
  switch (access) {
    case "blocked":
      return { points: 14, note: "Проход/проезд невозможен" };
    case "limited":
      return { points: 9, note: "Проход затруднён" };
    case "free":
      return { points: 3, note: "Участок проходим" };
  }
}

function densityPoints(ctx: NearbyContext): { points: number; note: string } {
  if (ctx.count === 0)
    return { points: 0, note: "Соседних активных инцидентов нет" };
  const p = clamp(ctx.count * 5, 0, 15);
  return {
    points: Math.round(p),
    note: `${ctx.count} ${plural(ctx.count, "соседний", "соседних", "соседних")} инцидент${ctx.count === 1 ? "" : "а"} в радиусе ${(NEARBY_RADIUS_KM * 1000).toFixed(0)} м`,
  };
}

function recencyPoints(ctx: NearbyContext): { points: number; note: string } {
  if (ctx.nearestAgeHours === null)
    return { points: 0, note: "Информация не свежая" };
  const p = clamp(10 * (1 - ctx.nearestAgeHours / 48), 0, 10);
  return {
    points: Math.round(p),
    note:
      ctx.nearestAgeHours < 1
        ? "Данные только что поступили"
        : `Свежесть данных: ~${Math.round(ctx.nearestAgeHours)} ч`,
  };
}

function recurrencePoints(ctx: NearbyContext): { points: number; note: string } {
  if (ctx.recurrence === 0)
    return { points: 0, note: "Первый инцидент в этой точке" };
  const p = clamp(4 + ctx.recurrence * 2, 0, 10);
  return {
    points: Math.round(p),
    note: `Повторяемость: ${ctx.recurrence} ${plural(ctx.recurrence, "ранее", "ранее", "ранее")} зафиксированн${ctx.recurrence === 1 ? "ый" : "ых"} инцидент${ctx.recurrence === 1 ? "" : "а"} на этой территории`,
  };
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/**
 * Возвращает индекс риска 0..100 и расшифровку факторов.
 * Индекс — производная от данных инцидента и контекста; значения факторов
 * подтверждаются именами и числами, показанными в интерфейсе.
 */
export function computeRiskScore(
  draft: Pick<CreateReportInput, "latitude" | "longitude" | "water_depth" | "accessibility"> & {
    ai: AIAnalysis | null;
  },
  existing: ReadonlyArray<{
    latitude: number;
    longitude: number;
    status: string;
    created_at: string;
  }>,
): RiskAssessment {
  const ctx = computeNearbyContext(draft, existing);
  const factors: RiskFactor[] = [
    { label: "Оценка глубины воды", ...depthPoints(draft.water_depth), weight: 28 },
    { label: "Проходимость участка", ...accessPoints(draft.accessibility), weight: 14 },
    { label: "AI-признаки подтопления", ...severityPoints(draft.ai), weight: 20 },
    { label: "Плотность соседних инцидентов", ...densityPoints(ctx), weight: 15 },
    { label: "Свежесть данных", ...recencyPoints(ctx), weight: 10 },
    { label: "Повторяемость точки", ...recurrencePoints(ctx), weight: 13 },
  ];
  const score = clamp(
    factors.reduce((s, f) => s + f.points, 0),
    0,
    100,
  );
  return { score, level: scoreToLevel(score), factors };
}

export function scoreToLevel(score: number): RiskAssessment["level"] {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function riskLevelRu(level: RiskAssessment["level"]): string {
  switch (level) {
    case "low":
      return "Низкий";
    case "medium":
      return "Умеренный";
    case "high":
      return "Высокий";
    case "critical":
      return "Критический";
  }
}

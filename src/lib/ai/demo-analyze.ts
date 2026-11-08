import type { AIAnalysis } from "@/lib/types";

export interface DemoImageStats {
  /** Доля пикселей, похожих на воду / мокрую поверхность */
  waterRatio: number;
  /** Доля пикселей со "стеклянным" (отражающим) блеском */
  glossyRatio: number;
  /** Средняя яркость */
  brightness: number;
  /** Насыщенность холодных оттенков */
  blueBias: number;
}

/**
 * ДЕМО-анализатор фотографий. НЕ является моделью компьютерного зрения.
 * Работает полностью на клиенте и анализирует статистику пикселей:
 * долю пикселей синевато-серых оттенков (характерных для воды), блеск
 * (высококонтрастные светлые пятна) и общую яркость.
 *
 * Результат всегда помечается is_demo = true и provider = "demo-heuristic".
 */
export function analyzeImageDemo(img: HTMLImageElement): DemoImageStats {
  const size = 320;
  const canvas = document.createElement("canvas");
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight, 1);
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { waterRatio: 0, glossyRatio: 0, brightness: 0.5, blueBias: 0 };
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let water = 0;
  let glossy = 0;
  let blue = 0;
  let lum = 0;
  const n = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    lum += y;

    // Вода: холодный/серый цвет, низкая насыщенность, средняя яркость
    const saturation = max === 0 ? 0 : (max - min) / max;
    const isWaterish =
      b >= r && // не тёплый
      saturation < 0.45 &&
      y > 0.18 &&
      y < 0.78 &&
      !(r > 180 && g > 180 && b > 200); // не асфальт/небо на светлом фото
    if (isWaterish) water += 1;

    // Блеск: очень светлые кластеры (отражение неба на мокрой поверхности)
    if (max > 215 && saturation < 0.3) glossy += 1;
    if (b > r + 12 && b > g + 8) blue += 1;
  }

  return {
    waterRatio: water / n,
    glossyRatio: glossy / n,
    brightness: lum / n,
    blueBias: blue / n,
  };
}

export interface DemoAnalysisResult extends AIAnalysis {
  stats: DemoImageStats;
}

export function buildDemoAnalysis(
  stats: DemoImageStats,
  description: string,
  waterDepthCm: number | null,
): DemoAnalysisResult {
  const hasPhotoSignal =
    stats.waterRatio > 0.18 || (stats.waterRatio > 0.1 && stats.glossyRatio > 0.06);
  const described = /подтоп|наводн|вод[аы] |луж|залит|прудк|болот|поток|стекая|level|уровень воды/i.test(
    description,
  );

  const flood_detected = hasPhotoSignal || described || (waterDepthCm ?? 0) >= 5;

  // Оценка выраженности из трёх независимых индикаторов
  let weight = stats.waterRatio * 100;
  if (stats.glossyRatio > 0.05) weight += 15;
  if (described) weight += 12;
  if ((waterDepthCm ?? 0) > 0) weight += Math.min(30, (waterDepthCm ?? 0) * 1.1);

  const severity: AIAnalysis["severity"] =
    weight >= 58 ? "critical" : weight >= 38 ? "high" : weight >= 20 ? "medium" : "low";

  const water_visibility: AIAnalysis["water_visibility"] =
    stats.waterRatio >= 0.45
      ? "extensive"
      : stats.waterRatio >= 0.25
        ? "significant"
        : stats.waterRatio >= 0.1
          ? "minor"
          : "none";

  const pedestrian_accessibility: AIAnalysis["pedestrian_accessibility"] =
    stats.waterRatio >= 0.4 ? "blocked" : stats.waterRatio >= 0.18 ? "limited" : "free";

  const confidence = Math.min(
    0.92,
    0.4 +
      (flood_detected
        ? clamp01((stats.waterRatio - 0.08) * 2.2) * 0.35 +
          clamp01(stats.glossyRatio * 8) * 0.15
        : 0.15),
  );

  const depthRu =
    waterDepthCm === null ? "оценка глубины не указана" : `оценка глубины ~${waterDepthCm} см`;

  const summary =
    `ДЕМО-АНАЛИЗ (статистика пикселей, без модели CV): доля водоподобных пикселей ` +
    `${(stats.waterRatio * 100).toFixed(0)}%, блеск ${(stats.glossyRatio * 100).toFixed(0)}%. ` +
    (flood_detected
      ? `Признаки ${severityRu(severity)} подтопления, ${depthRu}.`
      : "Уверенных признаков подтопления не обнаружено.");

  const recommended_action =
    !flood_detected
      ? "Наблюдение; повторная проверка при новых сообщениях"
      : severity === "critical"
        ? "Немедленная проверка участка; требуется ограждение зоны"
        : severity === "high"
          ? "Приоритетная проверка в течение суток"
          : "Плановый осмотр при ближайшем обходе";

  return {
    flood_detected,
    severity: flood_detected ? severity : "low",
    confidence,
    water_visibility,
    pedestrian_accessibility,
    summary,
    recommended_action,
    provider: "demo-heuristic",
    is_demo: true,
    analyzed_at: new Date().toISOString(),
    stats,
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function severityRu(s: AIAnalysis["severity"]): string {
  return { low: "слабого", medium: "умеренного", high: "значительного", critical: "явного" }[s];
}

/**
 * Загружает файл в HTMLImageElement для анализа.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("IMAGE_LOAD"));
    img.src = src;
  });
}

import type { AIAnalysis } from "@/lib/types";
import { analyzeImageDemo, buildDemoAnalysis, loadImage } from "./demo-analyze";

export interface AIProviderResult {
  analysis: AIAnalysis;
  /** Каким способом получен результат */
  mode: "real" | "demo";
  error?: string;
}

/**
 * AI Provider Adapter (клиентская часть).
 *
 * Порядок: реальный провайдер через серверный маршрут → при отсутствии
 * ключей, ошибке сети или таймауте — прозрачный демо-анализ.
 * Никогда не бросает исключений наружу: отсутствие AI не должно ломать
 * отправку инцидента.
 */
export async function analyzeIncident(input: {
  imageDataUrl: string | null;
  description: string;
  waterDepthCm: number | null;
  accessibility: "free" | "limited" | "blocked";
  signal?: AbortSignal;
}): Promise<AIProviderResult> {
  // 1. Пытаемся получить реальный анализ через провайдера
  if (input.imageDataUrl) {
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: input.imageDataUrl,
          text: input.description,
          waterDepthCm: input.waterDepthCm,
          accessibility: input.accessibility,
        }),
        signal: input.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          mode: string;
          provider?: string;
          analysis?: AIAnalysis | null;
        };
        if (data.mode === "real" && data.analysis) {
          return { mode: "real", analysis: data.analysis };
        }
      }
      // ответ {mode:"demo"} или ошибка → падаем в демо-режим ниже
    } catch (e) {
      console.warn(
        "[TASQYN AI] Провайдер AI недоступен, используется демо-анализ:",
        e instanceof Error ? e.message : e,
      );
    }
  }

  // 2. Демо-анализ (если есть фото)
  if (input.imageDataUrl) {
    try {
      const img = await loadImage(input.imageDataUrl);
      const stats = analyzeImageDemo(img);
      return {
        mode: "demo",
        analysis: buildDemoAnalysis(stats, input.description, input.waterDepthCm),
      };
    } catch {
      // fallthrough: не смогли декодировать изображение
    }
  }

  // 3. Без фотографии — только текстовая эвристика
  const described =
    /подтоп|наводн|вод[аы,\.]|луж|зал[иі]т|болото|поток|cierp|уровень воды/i.test(input.description);
  const severity: AIAnalysis["severity"] = described ? "medium" : "low";
  return {
    mode: "demo",
    analysis: {
      flood_detected: described,
      severity: described ? severity : "low",
      confidence: described ? 0.5 : 0.3,
      water_visibility: described ? "minor" : "none",
      pedestrian_accessibility: input.accessibility,
      summary: described
        ? "ДЕМО-АНАЛИЗ: только текст описания (фото отсутствует). Обнаружены ключевые слова о воде."
        : "ДЕМО-АНАЛИЗ: фото отсутствует, результат основан только на описании. Признаки не определены.",
      recommended_action: described
        ? "Проверить участок вручную; фото повысит точность анализа"
        : "Запросить фотографию участка",
      provider: "demo-text-only",
      is_demo: true,
      analyzed_at: new Date().toISOString(),
    },
  };
}

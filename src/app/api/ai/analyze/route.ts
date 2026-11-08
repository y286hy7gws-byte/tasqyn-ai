// Серверный AI Provider Adapter TASQYN AI.
//
// Поддерживаемые провайдеры (выбираются автоматически по наличию ключей):
//  1. OPENAI_API_KEY        — OpenAI vision (gpt-4o-mini)
//  2. GEMINI_API_KEY        — Google Gemini (gemini-2.5-flash)
//  3. без ключей            — демо-анализ выполняется на клиенте; маршрут
//    честно сообщает об этом ({ mode: "demo", reason: "NO_PROVIDER_KEY" }).
//
// Никогда не выдаёт демо-анализ за реальный: в каждом ответе есть поле is_demo.

import { NextResponse } from "next/server";
import { z } from "zod";
import type { AIAnalysis } from "@/lib/types";

const bodySchema = z.object({
  // data:image/jpeg;base64,...
  image: z.string().max(4_000_000),
  text: z.string().max(2000).optional(),
  waterDepth: z.number().min(0).max(300).nullable().optional(),
  accessibility: z.enum(["free", "limited", "blocked"]).nullable().optional(),
});

const analysisSchema = z.object({
  flood_detected: z.boolean(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  water_visibility: z.enum(["none", "minor", "significant", "extensive"]),
  pedestrian_accessibility: z.enum(["free", "limited", "blocked"]),
  summary: z.string(),
  recommended_action: z.string(),
});

type RawAnalysis = z.infer<typeof analysisSchema>;

const SYSTEM_PROMPT = `Ты — система визуального анализа фото городских территорий для платформы мониторинга подтоплений (TASQYN AI, г. Павлодар).
Проанализируй фотографию и описание. Отвечай СТРОГО JSON по схеме:
{"flood_detected": boolean, "severity": "low"|"medium"|"high"|"critical", "confidence": number 0..1, "water_visibility": "none"|"minor"|"significant"|"extensive", "pedestrian_accessibility": "free"|"limited"|"blocked", "summary": string, "recommended_action": string}
Правила:
- flood_detected=false, если признаков воды/подтопления нет.
- severity оценивает выраженность проблемы (лужа на тротуаре — low/medium; вода на проезжей части или у домов — high/critical).
- summary и recommended_action пиши по-русски, кратко и по делу.
- confidence отражает уверенность в оценке. Не придумывай детали, которых не видно.`;

interface ProviderResult {
  provider: string;
  analysis: RawAnalysis;
}

export function hasRealProvider(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

function normalizeRating(raw: RawAnalysis, provider: string): AIAnalysis {
  return {
    ...raw,
    provider,
    is_demo: false,
    analyzed_at: new Date().toISOString(),
  };
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("AI_TIMEOUT")), ms)),
  ]);
}

async function callOpenAI(image: string, text: string): Promise<ProviderResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: text || "Описание отсутствует. Проанализируй фотографию.",
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`OPENAI_HTTP_${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OPENAI_EMPTY");
  return { provider: "openai:gpt-4o-mini", analysis: analysisSchema.parse(JSON.parse(content)) };
}

async function callGemini(image: string, text: string): Promise<ProviderResult> {
  const key =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(image);
  if (!m) throw new Error("BAD_IMAGE");
  const [, mime, b64] = m;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        contents: [
          {
            parts: [
              { text: `${SYSTEM_PROMPT}\n\nОписание пользователя: ${text || "нет описания"}` },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!res.ok) throw new Error(`GEMINI_HTTP_${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!content) throw new Error("GEMINI_EMPTY");
  return {
    provider: "google:gemini-2.5-flash",
    analysis: analysisSchema.parse(JSON.parse(content)),
  };
}

export async function POST(req: Request) {
  let payloadUnknown: unknown;
  try {
    payloadUnknown = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payloadUnknown);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", details: z.flattenError(parsed.error) },
      { status: 422 },
    );
  }
  const { image, text } = parsed.data;

  if (!hasRealProvider()) {
    return NextResponse.json({
      mode: "demo",
      reason: "NO_PROVIDER_KEY",
      analysis: null,
      message:
        "AI-провайдер не настроен. Клиент использует прозрачный демонстрационный алгоритм (DEMO MODE).",
    });
  }

  try {
    const result =
      process.env.OPENAI_API_KEY
        ? await withTimeout(callOpenAI(image, text ?? ""), 45_000)
        : await withTimeout(callGemini(image, text ?? ""), 45_000);
    return NextResponse.json({
      mode: "real",
      provider: result.provider,
      analysis: normalizeRating(result.analysis, result.provider),
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json(
      { mode: "real", error: code, analysis: null, fallback: "demo" },
      { status: 200 },
    );
  }
}

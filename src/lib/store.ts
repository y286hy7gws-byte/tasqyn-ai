import type { FloodReport, ReportComment, CreateReportInput } from "./types";
import { buildDemoReports } from "./demo-data";
import { isSupabaseConfigured, getSupabase } from "./supabase";

export type BackendMode = "supabase" | "demo";

/**
 * Единый слой данных TASQYN AI.
 *
 * Компоненты не знают, откуда данные: режим SUPABASE (если ключи настроены)
 * или DEMO (localStorage браузера + синтетические демо-записи).
 * При недоступности Supabase автоматически включается локальный режим,
 * чтобы приложение не падало во время демонстрации.
 */

const LS_REPORTS = "tasqyn.reports.v2";
const LS_COMMENTS = "tasqyn.comments.v1";

export function currentBackendMode(): BackendMode {
  return typeof window !== "undefined" && isSupabaseConfigured() ? "supabase" : "demo";
}

// ---------------------------------------------------------------- local

function localLoad(): FloodReport[] {
  if (typeof window === "undefined") return [];
  try {
    const user = parseReports(window.localStorage.getItem(LS_REPORTS));
    const demo = parseReports(window.localStorage.getItem(LS_REPORTS + ".demo"));
    return [...user, ...demo];
  } catch {
    return [];
  }
}

function parseReports(raw: string | null): FloodReport[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as FloodReport[];
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.title === "string" &&
        typeof r.latitude === "number" &&
        typeof r.longitude === "number",
    );
  } catch {
    return [];
  }
}

function localSaveDisabledNote(): void {
  // localStorage может быть недоступен (private mode) — тихо работаем in-memory
}

let memoryReports: FloodReport[] | null = null;

function localStore(all: FloodReport[]): void {
  memoryReports = all.filter((r) => r.is_demo);
  if (typeof window === "undefined") return;
  try {
    const user = all.filter((r) => !r.is_demo);
    const demo = all.filter((r) => r.is_demo);
    window.localStorage.setItem(LS_REPORTS, JSON.stringify(user));
    window.localStorage.setItem(LS_REPORTS + ".demo", JSON.stringify(demo));
  } catch {
    localSaveDisabledNote();
  }
}

function localComments(): ReportComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_COMMENTS);
    return raw ? (JSON.parse(raw) as ReportComment[]) : [];
  } catch {
    return [];
  }
}

function saveCommentsLocal(list: ReportComment[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_COMMENTS, JSON.stringify(list));
  } catch {
    /* in-memory fallback */
  }
}

function mergeReports(a: FloodReport[], b: FloodReport[]): FloodReport[] {
  const map = new Map<string, FloodReport>();
  for (const r of a) map.set(r.id, r);
  for (const r of b) map.set(r.id, r);
  return [...map.values()];
}

// ---------------------------------------------------------------- supabase

type DBReport = Partial<FloodReport> & { id: string };

function fromDb(row: DBReport): FloodReport {
  // Приводим снапшот строки к доменному типу
  const createdAt = typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
  const updatedAtRaw = typeof row.updated_at === "string" ? row.updated_at : createdAt;
  return {
    id: row.id,
    title: row.title ?? "Без названия",
    description: row.description ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    photo_url: row.photo_url ?? null,
    water_depth: row.water_depth === null || row.water_depth === undefined ? null : Number(row.water_depth),
    accessibility: row.accessibility ?? null,
    severity: row.severity ?? "low",
    risk_score: typeof row.risk_score === "number" ? row.risk_score : 0,
    confidence: typeof row.confidence === "number" ? row.confidence : 0,
    status: row.status ?? "new",
    ai_analysis: row.ai_analysis && typeof row.ai_analysis === "object" ? (row.ai_analysis as FloodReport["ai_analysis"]) : null,
    district: row.district ?? null,
    risk_factors: Array.isArray(row.risk_factors) ? (row.risk_factors as FloodReport["risk_factors"]) : null,
    is_demo: Boolean(row.is_demo),
    reporter_contact: row.reporter_contact ?? null,
    created_at: createdAt,
    updated_at: updatedAtRaw,
  };
}

async function supabaseList(): Promise<FloodReport[]> {
  const sb = getSupabase();
  if (!sb) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await sb
    .from("flood_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDb);
}

async function supabaseUpsert(report: FloodReport): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { error } = await sb.from("flood_reports").upsert(report);
  if (error) throw new Error(error.message);
}

/**
 * Загружает фото: в SUPABASE-режиме — в Storage bucket flood-photos;
 * при ошибке загрузки фото сохраняется как dataURL (photo_url),
 * чтобы инцидент не потерялся.
 */
export async function uploadPhoto(
  file: File,
  dataUrl: string,
): Promise<{ url: string | null; mode: "storage" | "inline" }> {
  const sb = getSupabase();
  if (!sb) return { url: dataUrl, mode: "inline" };
  try {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const path = `reports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext ?? "jpg"}`;
    // Конвертируем dataURL → Blob
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await sb.storage
      .from("flood-photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from("flood-photos").getPublicUrl(path);
    return { url: data.publicUrl, mode: "storage" };
  } catch {
    return { url: dataUrl, mode: "inline" };
  }
}

export async function uploadDataUrl(dataUrl: string): Promise<string | null> {
  const f = new File([], "photo.jpg");
  const res = await uploadPhoto(f, dataUrl);
  return res.url;
}

// ---------------------------------------------------------------- API

export interface ReportsResult {
  reports: FloodReport[];
  mode: BackendMode;
  degraded: boolean; // true, если Supabase недоступен и сработал локальный фолбэк
}

export async function listReports(): Promise<ReportsResult> {
  const mode = currentBackendMode();
  if (mode === "supabase") {
    try {
      const fromDbList = await supabaseList();
      return { reports: fromDbList, mode, degraded: false };
    } catch {
      // фолбэк: локальные данные + демо-набор
      const local = localLoad();
      const demo = await seedDemo();
      return { reports: mergeReports(local, demo), mode: "demo", degraded: true };
    }
  }
  const local = localLoad();
  const demo = await seedDemo();
  return { reports: mergeReports(local, demo), mode: "demo", degraded: false };
}

/** Гарантирует наличие демо-данных (изменения демо-статусов сохраняются локально) */
async function seedDemo(): Promise<FloodReport[]> {
  if (memoryReports) return memoryReports;
  let demo: FloodReport[] | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LS_REPORTS + ".demo");
      if (raw && raw.length > 10) demo = parseReports(raw);
    } catch {
      /* пересоздадим */
    }
  }
  if (!demo || demo.length === 0) {
    demo = buildDemoReports();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LS_REPORTS + ".demo", JSON.stringify(demo));
      } catch {
        /* ок */
      }
    }
  }
  memoryReports = demo;
  return demo;
}

export async function getReport(id: string): Promise<FloodReport | null> {
  const { reports } = await listReports();
  return reports.find((r) => r.id === id) ?? null;
}

export async function createReport(input: CreateReportInput): Promise<FloodReport> {
  const { reports } = await listReports();
  const risk = (await import("./risk")).computeRiskScore(
    {
      latitude: input.latitude,
      longitude: input.longitude,
      water_depth: input.water_depth,
      accessibility: input.accessibility,
      ai: input.ai_analysis,
    },
    reports,
  );
  const now = new Date().toISOString();
  const report: FloodReport = {
    ...input,
    id: `f_${crypto.randomUUID().slice(0, 8)}`,
    severity: input.ai_analysis && input.ai_analysis.flood_detected
      ? input.ai_analysis.severity
      : "low",
    risk_score: risk.score,
    risk_factors: risk.factors,
    confidence: input.ai_analysis?.confidence ?? 0.4,
    status: "new",
    district: null,
    is_demo: false, // is_demo = синтетические данные; пользовательские сообщения — реальные записи
    created_at: now,
    updated_at: now,
  };
  if (isSupabaseConfigured()) {
    try {
      await supabaseUpsert(report);
      return report;
    } catch (e) {
      console.error("[TASQYN AI] Supabase недоступен, сохранено локально:", e);
    }
  }
  const all = mergeReports(localLoad().concat([report]), await seedDemo());
  localStore(all);
  return report;
}

export async function updateReport(id: string, patch: Partial<FloodReport>): Promise<FloodReport | null> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from("flood_reports")
        .update({ ...patch, updated_at: now })
        .eq("id", id)
        .select();
      if (!error && data && data.length > 0) return fromDb(data[0]);
      if (error) console.error("[TASQYN AI] update fallback:", error.message);
    }
  }
  const { reports } = await listReports();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: FloodReport = { ...reports[idx], ...patch, updated_at: now };
  const all = [...reports];
  all[idx] = updated;
  if (!isSupabaseConfigured()) localStore(all);
  return updated;
}

export async function listComments(reportId: string): Promise<ReportComment[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from("report_comments")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });
      if (!error && data) {
        return data.map((c: Record<string, unknown>) => ({
          id: String(c.id),
          report_id: String(c.report_id),
          author: String(c.author ?? "Служба"),
          text: String(c.text ?? ""),
          is_demo: Boolean(c.is_demo),
          created_at: String(c.created_at),
        }));
      }
    }
  }
  return localComments().filter((c) => c.report_id === reportId);
}

export async function addComment(
  reportId: string,
  author: string,
  text: string,
): Promise<ReportComment> {
  const comment: ReportComment = {
    id: `c_${crypto.randomUUID().slice(0, 8)}`,
    report_id: reportId,
    author,
    text,
    is_demo: !isSupabaseConfigured(),
    created_at: new Date().toISOString(),
  };
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("report_comments").insert(comment);
      if (!error) return comment;
      console.error("[TASQYN AI] comment fallback:", error.message);
    }
  }
  const all = localComments().concat([comment]);
  saveCommentsLocal(all);
  return comment;
}

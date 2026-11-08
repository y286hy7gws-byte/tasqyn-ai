"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  MapPin,
  LocateFixed,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Trash2,
  Send,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  ClipboardCheck,
  PencilLine,
} from "lucide-react";
import { z } from "zod";
import type { AIAnalysis, RiskAssessment } from "@/lib/types";
import { analyzeIncident } from "@/lib/ai/provider";
import { compressImage } from "@/lib/image";
import { computeRiskScore, computeNearbyContext, NEARBY_RADIUS_KM } from "@/lib/risk";
import { createReport, listReports } from "@/lib/store";
import { PAVLODAR_BOUNDS } from "@/lib/constants";
import { cn } from "@/lib/format";
import MapPicker from "./map-picker-client";
import { RiskGauge, RiskFactorList } from "@/components/risk-gauge";
import { DemoBadge } from "@/components/badges";
import Link from "next/link";

const formSchema = z.object({
  title: z.string().trim().min(5, "Название — минимум 5 символов").max(120),
  description: z.string().trim().min(10, "Опишите проблему подробнее (минимум 10 символов)").max(2000),
  latitude: z
    .number({ message: "Укажите местоположение" })
    .min(PAVLODAR_BOUNDS.minLat, "Координаты за пределами Павлодара")
    .max(PAVLODAR_BOUNDS.maxLat, "Координаты за пределами Павлодара"),
  longitude: z
    .number()
    .min(PAVLODAR_BOUNDS.minLon, "Координаты за пределами Павлодара")
    .max(PAVLODAR_BOUNDS.maxLon, "Координаты за пределами Павлодара"),
  water_depth: z.number().min(0).max(300).nullable(),
  accessibility: z.enum(["free", "limited", "blocked"]),
  reporter_contact: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || /^\+?[\d ()-]{10,20}$/.test(v), {
      message: "Введите телефон или e-mail, либо оставьте поле пустым",
    })
    .optional(),
});

type ModelState = {
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  water_depth: string;
  accessibility: "free" | "limited" | "blocked";
  reporter_contact: string;
};

const initialState: ModelState = {
  title: "",
  description: "",
  latitude: null,
  longitude: null,
  water_depth: "",
  accessibility: "limited",
  reporter_contact: "",
};

const STEPS = [
  { icon: MapPin, title: "Где произошло?" },
  { icon: Camera, title: "Что произошло?" },
  { icon: ClipboardCheck, title: "Проверка и отправка" },
] as const;

export default function ReportForm() {
  const [state, setState] = useState<ModelState>(initialState);
  const [photo, setPhoto] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<{ count: number; radius: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Живой пересчёт индекса риска при изменении полей формы
  useEffect(() => {
    const t = setTimeout(async () => {
      if (state.latitude === null || state.longitude === null) {
        setRisk(null);
        setNearby(null);
        return;
      }
      const depthRaw = state.water_depth.trim();
      const depth = depthRaw === "" ? null : Number(depthRaw);
      const draft = {
        latitude: state.latitude,
        longitude: state.longitude,
        water_depth: depth !== null && Number.isFinite(depth) ? depth : null,
        accessibility: state.accessibility,
      };
      const existing = await listReports().then((r) => r.reports).catch(() => []);
      const ctx = computeRiskScore({ ...draft, ai: analysis }, existing);
      setRisk(ctx);
      const nctx = computeNearbyContext(draft, existing);
      setNearby({ count: nctx.count, radius: Math.round(NEARBY_RADIUS_KM * 1000) });
    }, 350);
    return () => clearTimeout(t);
  }, [state.latitude, state.longitude, state.water_depth, state.accessibility, analysis]);

  function set<K extends keyof ModelState>(key: K, value: ModelState[K]) {
    setState((s) => ({ ...s, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: "" }));
  }

  async function loadPhotoFile(f: File) {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const dataUrl = await compressImage(f);
      setPhoto({ dataUrl, fileName: f.name });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Не удалось загрузить фото");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await loadPhotoFile(f);
    e.target.value = "";
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoError(null);
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (state.latitude === null || state.longitude === null) {
        errs.latitude = "Отметьте точку на карте или используйте геолокацию";
      } else if (
        state.latitude < PAVLODAR_BOUNDS.minLat ||
        state.latitude > PAVLODAR_BOUNDS.maxLat ||
        state.longitude < PAVLODAR_BOUNDS.minLon ||
        state.longitude > PAVLODAR_BOUNDS.maxLon
      ) {
        errs.latitude = "Координаты за пределами Павлодара";
      }
    }
    if (s === 1) {
      if (state.title.trim().length < 5) errs.title = "Название — минимум 5 символов";
      if (state.description.trim().length < 10)
        errs.description = "Опишите проблему подробнее (минимум 10 символов)";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function nextStep() {
    if (validateStep(step)) setStep((v) => Math.min(2, v + 1));
  }

  async function handleSubmit() {
    // финальная валидация всех полей через Zod-схему
    const depthRaw = state.water_depth.trim();
    const depth = depthRaw === "" ? null : Number(depthRaw);
    const parsed = formSchema.safeParse({
      title: state.title,
      description: state.description,
      latitude: state.latitude,
      longitude: state.longitude,
      water_depth: depth,
      accessibility: state.accessibility,
      reporter_contact: state.reporter_contact,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_");
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setStep(errs.latitude && !errs.title ? 0 : 1);
      return;
    }

    setErrorText(null);
    setSubmitting(true);
    try {
      const result = await analyzeIncident({
        imageDataUrl: photo?.dataUrl ?? null,
        description: state.description,
        waterDepthCm: depth,
        accessibility: state.accessibility,
      });
      setAnalysis(result.analysis);

      const report = await createReport({
        title: state.title.trim(),
        description: state.description.trim(),
        latitude: state.latitude!,
        longitude: state.longitude!,
        photo_url: photo?.dataUrl ?? null,
        water_depth: depth,
        accessibility: state.accessibility,
        ai_analysis: result.analysis,
        reporter_contact: state.reporter_contact.trim() || null,
      });
      setCreatedId(report.id);
    } catch (err) {
      console.error(err);
      setErrorText(
        err instanceof Error ? err.message : "Не удалось сохранить инцидент. Попробуйте ещё раз.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (createdId) {
    return <SuccessScreen id={createdId} analysis={analysis} />;
  }

  const busy = submitting;

  return (
    <div className="space-y-4">
      {/* ---------- индикатор шагов ---------- */}
      <ol className="surface flex items-center gap-1 p-2 sm:gap-2 sm:p-2.5">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={i} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (i < step && !busy) setStep(i);
                }}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                  current ? "bg-accent-soft" : done ? "hover:bg-panel-2 cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                    current
                      ? "bg-accent text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.6)]"
                      : done
                        ? "bg-sev-low/12 text-sev-low"
                        : "bg-[#eef1f7] text-fg-mute",
                  )}
                >
                  {done ? <CheckCircle2 size={14} /> : <s.icon size={13} />}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span
                    className={cn(
                      "block truncate text-[12.5px] font-semibold",
                      current ? "text-accent" : done ? "text-fg" : "text-fg-mute",
                    )}
                  >
                    {s.title}
                  </span>
                  <span className="block text-[10px] text-fg-mute">
                    Шаг {i + 1} из 3
                  </span>
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px w-3 shrink-0 rounded sm:w-5",
                    done ? "bg-sev-low/40" : "bg-line",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* ================= ШАГ 1: местоположение ================= */}
      {step === 0 && (
        <section className="fade-up surface p-4 sm:p-5">
          <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
            <MapPin size={16} className="text-accent" /> Где произошло подтопление?
          </h2>
          <p className="mb-3 text-[12.5px] text-fg-mute">
            Отметьте точку на карте, нажмите и удерживайте для уточнения, или используйте
            геолокацию устройства.
          </p>
          <MapPicker
            lat={state.latitude}
            lon={state.longitude}
            onChange={(lat, lon) => setState((s) => ({ ...s, latitude: lat, longitude: lon }))}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost !py-2 text-[13px]"
              onClick={() =>
                navigator.geolocation?.getCurrentPosition(
                  (p) =>
                    setState((s) => ({
                      ...s,
                      latitude: Number(p.coords.latitude.toFixed(6)),
                      longitude: Number(p.coords.longitude.toFixed(6)),
                    })),
                  () =>
                    setFieldErrors((e) => ({
                      ...e,
                      latitude: "Доступ к геолокации запрещён. Отметьте точку на карте.",
                    })),
                  { enableHighAccuracy: false, timeout: 10000 },
                )
              }
              disabled={busy}
            >
              <LocateFixed size={14} />
              Моё местоположение
            </button>
            {state.latitude !== null && state.longitude !== null && (
              <span className="rounded-lg bg-[#f0fdf4] px-2.5 py-1.5 font-mono text-[12px] text-sev-low">
                {state.latitude.toFixed(5)}, {state.longitude.toFixed(5)}
              </span>
            )}
          </div>
          {fieldErrors.latitude && <FormError text={fieldErrors.latitude} />}
          {nearby && nearby.count > 0 && (
            <p className="mt-3 rounded-xl border border-[#fcd34d] bg-[#fffbeb] px-3 py-2.5 text-[12px] text-[#92400e]">
              <AlertTriangle size={13} className="mr-1.5 inline" />
              В радиусе {nearby.radius} м уже есть {nearby.count} соседних
              инцидент{nearby.count === 1 ? "" : "а"} — они увеличат индекс риска.
            </p>
          )}
        </section>
      )}

      {/* ================= ШАГ 2: что произошло ================= */}
      {step === 1 && (
        <section className="fade-up space-y-4">
          {/* фото */}
          <div className="surface p-4 sm:p-5">
            <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
              <Camera size={16} className="text-accent" /> Фотография участка
              <span className="text-[11px] font-normal text-fg-mute">(необязательно)</span>
            </h2>
            <p className="mb-3 text-[12.5px] text-fg-mute">
              Фото позволяет AI определить признаки подтопления. JPG/PNG/WebP до 20 МБ.
            </p>
            {photo ? (
              <div className="relative overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt="Предпросмотр фото подтопления"
                  className="max-h-64 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="btn btn-danger absolute right-2 top-2 !px-2.5 !py-1.5"
                  title="Удалить фото"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void loadPhotoFile(f);
                }}
                className={cn(
                  "rounded-xl border-2 border-dashed transition-colors",
                  dragOver ? "border-accent bg-accent-soft" : "border-line-strong bg-panel-2",
                )}
              >
                <label
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 px-4 py-8 text-center",
                    dragOver && "pointer-events-none",
                  )}
                >
                  {photoBusy ? (
                    <Loader2 className="spinner text-accent" size={22} />
                  ) : (
                    <ImagePlus size={22} className="text-fg-mute" />
                  )}
                  <span className="text-[13px] font-medium text-fg-dim">
                    {photoBusy
                      ? "Обработка изображения…"
                      : dragOver
                        ? "Отпустите файл здесь"
                        : "Перетащите фото или выберите файл"}
                  </span>
                  <span className="text-[11px] text-fg-mute">
                    Файлы не покидают устройство до отправки формы
                  </span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onPhotoChange}
                    disabled={photoBusy}
                  />
                </label>
              </div>
            )}
            {photoError && <FormError text={photoError} />}
          </div>

          {/* описание */}
          <div className="surface p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
              <PencilLine size={15} className="text-accent" /> Опишите проблему
            </h2>
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="rf-title">
                  Название *
                </label>
                <input
                  id="rf-title"
                  className="field"
                  placeholder="Например: Вода у пешеходного перехода"
                  value={state.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={120}
                  disabled={busy}
                />
                {fieldErrors.title && <FormError text={fieldErrors.title} />}
              </div>
              <div>
                <label className="field-label" htmlFor="rf-desc">
                  Что происходит? *
                </label>
                <textarea
                  id="rf-desc"
                  className="field min-h-[96px] resize-y"
                  placeholder="Опишите участок: где именно вода, как давно, что перекрыто…"
                  value={state.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={2000}
                  disabled={busy}
                />
                {fieldErrors.description && <FormError text={fieldErrors.description} />}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="rf-depth">
                    Примерная глубина воды, см
                    <span className="ml-1 font-normal text-fg-mute">(необязательно)</span>
                  </label>
                  <input
                    id="rf-depth"
                    type="number"
                    min={0}
                    max={300}
                    className="field"
                    placeholder="Например: 15"
                    value={state.water_depth}
                    onChange={(e) => set("water_depth", e.target.value)}
                    disabled={busy}
                  />
                  <p className="mt-1 text-[11px] text-fg-mute">
                    Оценка на глаз — измерений не требуется
                  </p>
                </div>
                <div>
                  <label className="field-label" htmlFor="rf-access">
                    Проходимость участка *
                  </label>
                  <select
                    id="rf-access"
                    className="field"
                    value={state.accessibility}
                    onChange={(e) => set("accessibility", e.target.value as ModelState["accessibility"])}
                    disabled={busy}
                  >
                    <option value="free">Свободно — можно пройти/проехать</option>
                    <option value="limited">Затруднено — вода мешает</option>
                    <option value="blocked">Невозможно — участок заблокирован</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="rf-contact">
                  Контакт для обратной связи{" "}
                  <span className="font-normal text-fg-mute">(необязательно)</span>
                </label>
                <input
                  id="rf-contact"
                  className="field"
                  placeholder="Телефон или e-mail"
                  value={state.reporter_contact}
                  onChange={(e) => set("reporter_contact", e.target.value)}
                  maxLength={120}
                  disabled={busy}
                />
                {fieldErrors.reporter_contact && (
                  <FormError text={fieldErrors.reporter_contact} />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= ШАГ 3: проверка ================= */}
      {step === 2 && (
        <section className="fade-up space-y-4">
          <div className="surface p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
              <ClipboardCheck size={16} className="text-accent" /> Проверьте данные
            </h2>

            <div className="space-y-3 text-[13px]">
              <SummaryRow label="Местоположение">
                <span className="font-mono text-[12.5px] text-fg-dim">
                  {state.latitude?.toFixed(5)}, {state.longitude?.toFixed(5)}
                </span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${state.latitude}&mlon=${state.longitude}#map=17/${state.latitude}/${state.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11.5px] text-accent hover:underline"
                >
                  посмотреть на карте
                </a>
              </SummaryRow>
              <SummaryRow label="Название">{state.title}</SummaryRow>
              <SummaryRow label="Описание">
                <span className="line-clamp-3 text-fg-dim">{state.description}</span>
              </SummaryRow>
              <SummaryRow label="Глубина воды">
                {state.water_depth.trim() ? `~${state.water_depth} см` : "не указана"}
              </SummaryRow>
              <SummaryRow label="Проходимость">
                {{ free: "Свободно", limited: "Затруднено", blocked: "Невозможно" }[
                  state.accessibility
                ]}
              </SummaryRow>
              <SummaryRow label="Фотография">
                {photo ? (
                  <span className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.dataUrl}
                      alt=""
                      className="h-10 w-14 rounded-md border border-line object-cover"
                    />
                    <span className="max-w-[160px] truncate text-[11.5px] text-fg-mute">
                      {photo.fileName}
                    </span>
                  </span>
                ) : (
                  <span className="text-fg-mute">не приложена</span>
                )}
              </SummaryRow>
              <SummaryRow label="Контакт">
                {state.reporter_contact.trim() || (
                  <span className="text-fg-mute">не указан</span>
                )}
              </SummaryRow>
            </div>

            <button
              type="button"
              onClick={() => setStep(0)}
              className="btn btn-ghost mt-4 !py-1.5 text-[12.5px]"
              disabled={busy}
            >
              <ArrowLeft size={13} />
              Изменить данные
            </button>
          </div>

          {/* предпросмотр риска */}
          {risk && (
            <div className="surface p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                <BrainCircuit size={16} className="text-accent" />
                Предварительный индекс риска
                <DemoBadge className="ml-1">предварительный</DemoBadge>
              </h2>
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="flex items-center gap-4">
                  <RiskGauge score={risk.score} />
                  <div className="text-[12px] leading-relaxed text-fg-mute">
                    Индекс пересчитывается автоматически на основе данных формы.
                    <br />
                    <span className="text-fg-dim">Точная оценка — после AI-анализа.</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <RiskFactorList factors={risk.factors} />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {errorText && <FormError text={errorText} />}

      {/* ---------- навигация ---------- */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          disabled={step === 0 || busy}
        >
          <ArrowLeft size={15} />
          Назад
        </button>

        {step < 2 ? (
          <button type="button" className="btn btn-primary min-w-[150px]" onClick={nextStep} disabled={busy}>
            Далее
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary min-w-[210px] !py-2.5"
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="spinner" size={16} />
                AI-анализ и сохранение…
              </>
            ) : (
              <>
                <Send size={16} />
                Отправить инцидент
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-center text-[11px] leading-relaxed text-fg-mute">
        Отправляя форму, вы соглашаетесь на обработку указанных данных платформой
        TASQYN AI в целях мониторинга подтоплений. Контактные данные
        необязательны.
      </p>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-panel-2 px-3 py-2.5">
      <span className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-mute">
        {label}
      </span>
      <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 text-right text-fg">
        {children}
      </span>
    </div>
  );
}

function FormError({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-[12px] text-sev-critical">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      {text}
    </p>
  );
}

function SuccessScreen({ id, analysis }: { id: string; analysis: AIAnalysis | null }) {
  return (
    <div className="fade-up surface flex flex-col items-center p-8 text-center sm:p-10">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0fdf4]">
        <CheckCircle2 size={30} className="text-sev-low" />
      </span>
      <h2 className="text-lg font-bold">Сообщение отправлено</h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-fg-mute">
        Инцидент добавлен в систему и уже отображается на карте. Статус «Новый» —
        городские службы увидят его в очереди.
      </p>
      {analysis && (
        <p className="mt-4 max-w-md rounded-xl bg-panel-2 px-4 py-3 text-[12px] leading-relaxed text-fg-mute">
          AI-анализ:{" "}
          {analysis.is_demo ? (
            <span className="font-semibold text-[#92400e]">DEMO-режим (эвристика)</span>
          ) : (
            <span className="font-semibold text-sev-low">модель {analysis.provider}</span>
          )}{" "}
          · выраженность: {analysis.severity}, уверенность{" "}
          {(analysis.confidence * 100).toFixed(0)}%
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Link href={`/incidents/${id}`} className="btn btn-primary">
          Открыть карточку инцидента
        </Link>
        <Link href="/map" className="btn btn-ghost">
          Посмотреть на карте
        </Link>
        <Link href="/report" className="btn btn-ghost">
          Новое сообщение
        </Link>
      </div>
    </div>
  );
}

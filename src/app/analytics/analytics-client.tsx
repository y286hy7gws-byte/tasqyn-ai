"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, Split, MapPinned, Gauge, RefreshCcwDot, ChevronRight } from "lucide-react";
import type { FloodReport } from "@/lib/types";
import { listReports, type BackendMode } from "@/lib/store";
import { SEVERITIES } from "@/lib/types";
import { SEVERITY_META, STATUS_META } from "@/lib/constants";

const RISK_LEVEL_RU: Record<string, string> = {
  low: "низкий",
  medium: "умеренный",
  high: "высокий",
  critical: "критический",
};

function riskLevelLabel(score: number): string {
  const l = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";
  return RISK_LEVEL_RU[l];
}
import { relativeTime, cn } from "@/lib/format";
import {
  IncidentsTrendChart,
  DistributionPie,
  TopZonesBar,
  type DayPoint,
  type Slice,
} from "@/components/charts";
import { DemoBadge, SeverityBadge, RiskChip } from "@/components/badges";
import { computeZones } from "@/lib/zones";

const PERIODS = [
  { key: 7, label: "7 дней" },
  { key: 30, label: "30 дней" },
  { key: 90, label: "90 дней" },
  { key: -1, label: "Всё время" },
] as const;

export default function AnalyticsClient() {
  const [reports, setReports] = useState<FloodReport[] | null>(null);
  const [mode, setMode] = useState<BackendMode>("demo");
  const [period, setPeriod] = useState<number>(30);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    listReports().then((res) => {
      setReports(res.reports);
      setMode(res.mode);
    });
    // снапшот «текущего времени» — чтобы период-фильтр был нестабильным только между загрузками
    const t = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const scoped = useMemo(() => {
    if (!reports || now === null) return [];
    if (period === -1) {
      return [...reports];
    }
    const cutoff = now - period * 86_400_000;
    return reports.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [reports, period, now]);

  if (reports === null || now === null) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="spinner text-accent" size={26} />
      </div>
    );
  }

  const trend = buildTrend(scoped, period);
  const avgRisk = scoped.length
    ? Math.round(scoped.reduce((s, r) => s + r.risk_score, 0) / scoped.length)
    : 0;
  const resolvedRate = scoped.length
    ? Math.round((scoped.filter((r) => r.status === "resolved").length / scoped.length) * 100)
    : 0;
  const zones = computeZones(scoped, 0.02, 0.025).sort((a, b) => b.count - a.count);
  const repeats = buildRepeatedZones(scoped);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Аналитика подтоплений
          </h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-fg-mute">
            Показатели построены на {scoped.length} записях системы
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                mode === "supabase" ? "bg-[#f0fdf4] text-sev-low" : "bg-accent-soft text-accent",
              )}
            >
              {mode === "supabase" ? "SUPABASE" : "DEMO"}
            </span>
            <DemoBadge className="!py-0">демо-набор</DemoBadge>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                period === p.key
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line text-fg-dim hover:border-line-strong hover:text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label={`Инцидентов за период (${PERIODS.find((p) => p.key === period)?.label.toLowerCase()})`} value={String(scoped.length)} accent="#2563eb" />
        <Kpi icon={Gauge} label="Средний индекс риска" value={String(avgRisk)} accent="#f97316" hint={riskLevelLabel(avgRisk)} />
        <Kpi icon={MapPinned} label="Проблемных зон (кластеры)" value={String(zones.length)} accent="#eab308" />
        <Kpi icon={RefreshCcwDot} label="Доля устранённых" value={`${resolvedRate}%`} accent="#16a34a" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface p-4 lg:col-span-2">
          <h2 className="mb-3 text-[13px] font-semibold text-fg-dim">
            Динамика сообщений
          </h2>
          <IncidentsTrendChart data={trend} />
        </section>

        <section className="surface p-4">
          <h2 className="mb-1 text-[13px] font-semibold text-fg-dim">
            Уровни опасности
          </h2>
          <DistributionPie data={severitySlices(scoped)} />
          <ul className="mt-1 space-y-1 text-[11px]">
            {severitySlices(scoped).map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-fg-mute">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-mono text-fg-dim">{s.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-4 lg:col-span-2">
          <h2 className="mb-3 text-[13px] font-semibold text-fg-dim">
            Проблемные территории
          </h2>
          <TopZonesBar data={zoneData(scoped)} />
          <p className="mt-2 text-[11px] text-fg-mute">
            Название территории берётся из ориентира ближайшего инцидента в зоне;
            зоны без ориентира обозначены координатами центра кластера.
          </p>
        </section>

        <section className="surface p-4">
          <h2 className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-fg-dim">
            <Split size={14} className="text-accent" />
            Статусы устранения
          </h2>
          <DistributionPie data={statusSlices(scoped)} />
          <ul className="mt-1 space-y-1 text-[11px]">
            {statusSlices(scoped).map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-fg-mute">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-mono text-fg-dim">{s.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* повторяющиеся зоны */}
      <section className="surface overflow-hidden">
        <div className="border-b border-line px-4 py-3 text-[13px] font-semibold text-fg-dim">
          Повторяющиеся проблемные зоны
        </div>
        {repeats.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-fg-mute">
            В выбранном периоде нет зон с несколькими инцидентами
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {repeats.map((z, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-mono text-[11px] text-fg-mute">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-fg">
                    {z.name}
                  </div>
                  <div className="text-[11px] text-fg-mute">
                    {z.count} инцидента за период · последнее {relativeTime(z.last.created_at)}
                  </div>
                </div>
                <SeverityBadge severity={z.maxSeverity} size="xs" />
                <RiskChip score={z.maxRisk} />
                <Link
                  href={`/map?focus=${z.last.id}`}
                  className="btn btn-ghost !px-2 !py-1 text-[11px]"
                >
                  На карте <ChevronRight size={11} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: accent + "14", color: accent }}
        >
          <Icon size={14} />
        </span>
        <span className="font-mono text-xl font-bold" style={{ color: accent }}>
          {value}
        </span>
        {hint && <span className="text-[10px] uppercase text-fg-mute">{hint}</span>}
      </div>
      <div className="mt-1.5 text-[11px] leading-tight text-fg-mute">{label}</div>
    </div>
  );
}

function buildTrend(reports: FloodReport[], period: number): DayPoint[] {
  const days = period === -1 ? 90 : Math.max(period, 14);
  const out: DayPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    out.push({
      date: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      count: reports.filter((r) => r.created_at.slice(0, 10) === key).length,
    });
  }
  return out;
}

function severitySlices(reports: FloodReport[]): Slice[] {
  return SEVERITIES.map((s) => ({
    name: SEVERITY_META[s].label,
    value: reports.filter((r) => r.severity === s).length,
    color: SEVERITY_META[s].color,
  })).filter((d) => d.value > 0);
}

function statusSlices(reports: FloodReport[]): Slice[] {
  return (["new", "reviewing", "confirmed", "resolved"] as const).map((st) => ({
    name: STATUS_META[st].label,
    value: reports.filter((r) => r.status === st).length,
    color: STATUS_META[st].color,
  })).filter((d) => d.value > 0);
}

function zoneData(reports: FloodReport[]) {
  const zones = computeZones(reports, 0.02, 0.025);
  const rows = zones
    .slice(0, 6)
    .map((z) => {
      const near = reports.find(
        (r) =>
          Math.abs(r.latitude - z.lat) < 0.02 &&
          Math.abs(r.longitude - z.lon) < 0.025 &&
          r.district,
      );
      return {
        name: near?.district ?? z.lat.toFixed(3) + ", " + z.lon.toFixed(3),
        value: z.count,
        color: SEVERITY_META[z.severity].color,
      };
    })
    .sort((a, b) => b.value - a.value);
  return rows.length ? rows : [{ name: "Нет кластеров", value: 0, color: "#2563eb" }];
}

interface RepeatRow {
  name: string;
  count: number;
  maxSeverity: FloodReport["severity"];
  maxRisk: number;
  last: FloodReport;
}

/** Зоны повторяемости: кластеры не только активных, но и устранённых инцидентов */
function buildRepeatedZones(reports: FloodReport[]): RepeatRow[] {
  const zones = computeZones(
    reports,
    0.008,
    0.011,
    true, // повторяемость учитывает и устранённые инциденты
  );
  const rows: RepeatRow[] = [];
  for (const z of zones) {
    const members = reports.filter(
      (r) =>
        Math.abs(r.latitude - z.lat) < 0.02 &&
        Math.abs(r.longitude - z.lon) < 0.011,
    );
    const last = members.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    const near = members.find((r) => r.district);
    rows.push({
      name: near?.district ?? `${z.lat.toFixed(3)}, ${z.lon.toFixed(3)}`,
      count: members.length,
      maxSeverity: z.severity,
      maxRisk: members.reduce((m, r) => Math.max(m, r.risk_score), 0),
      last,
    });
  }
  return rows.sort((a, b) => b.count - a.count).slice(0, 8);
}

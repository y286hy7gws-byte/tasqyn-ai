"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  BellPlus,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  Map as MapIcon,
  ListFilter,
  X,
  Loader2,
} from "lucide-react";
import type { FloodReport } from "@/lib/types";
import { listReports, type BackendMode } from "@/lib/store";
import { SEVERITY_META, STATUS_META } from "@/lib/constants";
import { cn, relativeTime } from "@/lib/format";
import { computeZones } from "@/lib/zones";
import IncidentMap from "@/components/map/incident-map-client";
import { DemoBadge } from "@/components/badges";
import { DistributionPie, IncidentsTrendChart, type Slice, type DayPoint } from "@/components/charts";

export default function DashboardClient() {
  const [reports, setReports] = useState<FloodReport[] | null>(null);
  const [mode, setMode] = useState<BackendMode>("demo");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listReports()
      .then((res) => {
        if (!alive) return;
        setReports(res.reports);
        setMode(res.mode);
      })
      .catch(() => alive && setError("Не удалось загрузить данные"));
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (!reports) return null;
    const active = reports.filter((r) => r.status !== "resolved");
    return {
      total: reports.length,
      newCount: reports.filter((r) => r.status === "new").length,
      highCount: active.filter((r) => r.severity === "high" || r.severity === "critical").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
    };
  }, [reports]);

  const recent = useMemo(() => {
    if (!reports) return [];
    return [...reports]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 6);
  }, [reports]);

  const trend = useMemo(() => buildTrend(reports ?? []), [reports]);
  const severitySlices = useMemo(() => slices(reports ?? []), [reports]);
  const maxSevCell = useMemo(() => {
    if (!reports) return null;
    const zones = computeZones(reports);
    return zones.sort((a, b) => b.count - a.count)[0] ?? null;
  }, [reports]);
  const maxSevDistrict = useMemo(() => {
    if (!maxSevCell) return null;
    const near = reports?.find(
      (r) =>
        r.district &&
        Math.abs(r.latitude - maxSevCell.lat) < 0.021 &&
        Math.abs(r.longitude - maxSevCell.lon) < 0.026,
    );
    return near?.district ?? null;
  }, [maxSevCell, reports]);

  if (error) {
    return (
      <div className="surface mx-4 my-10 flex flex-col items-center justify-center gap-3 p-10 text-center">
        <X className="text-sev-critical" size={28} />
        <p className="text-sm text-fg-dim">{error}</p>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---------- Заголовок ---------- */}
      <section className="hero-wash -mx-4 px-4 pb-1 pt-2 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-bold tracking-tight text-fg sm:text-[22px]">
              Мониторинг городской водной безопасности
            </h1>
            <p className="mt-1 text-[13px] text-fg-mute">
              Актуальная информация о проблемных участках Павлодара
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 font-bold uppercase tracking-wider",
                mode === "supabase"
                  ? "border-sev-low/30 bg-[#f0fdf4] text-sev-low"
                  : "border-accent/25 bg-accent-soft text-accent",
              )}
            >
              {mode === "supabase" ? "SUPABASE" : "DEMO MODE"}
            </span>
            <DemoBadge>данные для демонстрации</DemoBadge>
          </div>
        </div>

        {/* ---------- KPI ---------- */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={Inbox}
            label="Всего инцидентов"
            value={stats?.total}
            accent="#2563eb"
            href="/incidents"
          />
          <Kpi
            icon={BellPlus}
            label="Новых сообщений"
            value={stats?.newCount}
            accent="#7c3aed"
            href="/incidents?status=new"
          />
          <Kpi
            icon={AlertOctagon}
            label="Высокого риска активны"
            value={stats?.highCount}
            accent="#dc2626"
            href="/map"
          />
          <Kpi
            icon={CheckCircle2}
            label="Устранённых проблем"
            value={stats?.resolved}
            accent="#16a34a"
            href="/analytics"
          />
        </div>
      </section>

      {/* ---------- Карта + последние инциденты ---------- */}
      <section className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <div className="surface overflow-hidden !rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-fg-dim">
              <MapIcon size={14} className="text-accent" />
              Карта проблемных участков
            </h2>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
            >
              Открыть полностью <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-[340px] sm:h-[420px] lg:h-[460px]">
            {reports === null ? (
              <div className="flex h-full items-center justify-center bg-[#e4eaf2]">
                <Loader2 className="spinner text-accent" size={24} />
              </div>
            ) : (
              <IncidentMap reports={reports} focusId={null} showZones />
            )}
          </div>
        </div>

        {/* Последние инциденты */}
        <div className="surface overflow-hidden !rounded-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-fg-dim">Последние инциденты</h2>
            <Link
              href="/incidents"
              className="text-[12px] font-semibold text-accent hover:underline"
            >
              Все
            </Link>
          </div>
          {reports === null ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-fg-mute">
              Пока нет инцидентов
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => {
                const meta = SEVERITY_META[r.severity];
                return (
                  <li key={r.id}>
                    <Link
                      href={`/incidents/${r.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-panel-2"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-fg">
                          {r.title}
                        </span>
                        <span className="text-[11px] text-fg-mute">
                          {relativeTime(r.created_at)} · {STATUS_META[r.status].label}
                        </span>
                      </span>
                      <span
                        className="font-mono text-[12px] font-bold"
                        style={{ color: meta.color }}
                        title={`Индекс риска · ${meta.label.toLowerCase()}`}
                      >
                        {r.risk_score}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {maxSevCell && (
            <p className="border-t border-line bg-panel-2 px-4 py-2.5 text-[11px] leading-snug text-fg-mute">
              <strong className="text-fg-dim">Зона концентрации:</strong>{" "}
              {maxSevDistrict ?? maxSevCell.lat.toFixed(3) + ", " + maxSevCell.lon.toFixed(3)} —{" "}
              {maxSevCell.count} активных инцидент{maxSevCell.count === 1 ? "" : "а"}
            </p>
          )}
        </div>
      </section>

      {/* ---------- Распределение + динамика ---------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface !rounded-2xl p-4">
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-fg-dim">
            <ListFilter size={14} className="text-accent" />
            Уровень опасности
          </h2>
          {reports === null ? (
            <div className="skeleton h-[210px] w-full" />
          ) : (
            <>
              <DistributionPie data={severitySlices} />
              <ul className="mt-1 space-y-1 text-[11.5px]">
                {severitySlices.map((s) => (
                  <li key={s.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-fg-mute">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-mono text-fg-dim">{s.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="surface !rounded-2xl p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-fg-dim">Динамика сообщений</h2>
            <Link
              href="/analytics"
              className="text-[12px] font-semibold text-accent hover:underline"
            >
              Полная аналитика
            </Link>
          </div>
          {reports === null ? (
            <div className="skeleton h-[210px] w-full" />
          ) : (
            <IncidentsTrendChart data={trend} />
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: number;
  accent: string;
  href: string;
}) {
  return (
    <Link href={href} className="surface surface-hover !rounded-2xl block p-3.5">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: accent + "10", color: accent }}
        >
          <Icon size={15} />
        </span>
        <span className="truncate text-[12px] leading-tight text-fg-mute">{label}</span>
      </div>
      <div className="mt-2 text-[24px] font-bold leading-none tracking-tight text-fg">
        {value === undefined ? <span className="skeleton inline-block h-6 w-12" /> : value}
      </div>
    </Link>
  );
}

function buildTrend(reports: FloodReport[]): DayPoint[] {
  const out: DayPoint[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    out.push({
      date: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      count: reports.filter((r) => r.created_at.slice(0, 10) === key).length,
    });
  }
  return out;
}

function slices(reports: FloodReport[]): Slice[] {
  const all: Array<FloodReport["severity"]> = ["low", "medium", "high", "critical"];
  return all
    .map((s) => ({
      name: SEVERITY_META[s].label,
      value: reports.filter((r) => r.severity === s).length,
      color: SEVERITY_META[s].color,
    }))
    .filter((d) => d.value > 0);
}

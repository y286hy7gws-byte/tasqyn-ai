"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  X,
  Layers,
  ListFilter,
  Loader2,
  MapPinned,
  Search,
  Crosshair,
} from "lucide-react";
import { listReports, type BackendMode } from "@/lib/store";
import type { FloodReport, IncidentStatus, Severity } from "@/lib/types";
import { SEVERITIES, STATUSES } from "@/lib/types";
import { SEVERITY_META, STATUS_META } from "@/lib/constants";
import { cn, relativeTime } from "@/lib/format";
import IncidentMap from "@/components/map/incident-map-client";
import { DemoBadge, RiskChip } from "@/components/badges";
import { ChevronRight } from "lucide-react";

export default function MapPageClient() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const [reports, setReports] = useState<FloodReport[] | null>(null);
  const [mode, setMode] = useState<BackendMode>("demo");
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sevFilter, setSevFilter] = useState<Set<Severity>>(new Set(SEVERITIES));
  const [statusFilter, setStatusFilter] = useState<Set<IncidentStatus>>(new Set(STATUSES));
  const [showZones, setShowZones] = useState(true);
  const [query, setQuery] = useState("");
  const [localFocus, setLocalFocus] = useState<string | null>(null);

  useEffect(() => {
    listReports()
      .then((res) => {
        setReports(res.reports);
        setMode(res.mode);
        setDegraded(res.degraded);
      })
      .catch(() => setError("Не удалось загрузить инциденты"));
  }, []);

  const filtered = useMemo(() => {
    if (!reports) return [];
    return reports.filter(
      (r) => sevFilter.has(r.severity) && statusFilter.has(r.status),
    );
  }, [reports, sevFilter, statusFilter]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!reports || q.length < 2) return [];
    return reports
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.district ?? "").toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [reports, query]);

  function toggleSet<T>(set: Set<T>, v: T, apply: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    apply(next);
  }

  if (error) {
    return (
      <div className="surface flex flex-col items-center justify-center gap-3 p-16 text-center">
        <X className="text-sev-critical" size={28} />
        <p className="text-sm text-fg-dim">{error}</p>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          Повторить
        </button>
      </div>
    );
  }

  const activeFocus = localFocus ?? focusId;

  return (
    <div className="space-y-4">
      {/* Статус источника данных */}
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
        {degraded && (
          <span className="rounded-md border border-[#fcd34d] bg-[#fffbeb] px-2 py-0.5 text-[#92400e]">
            Supabase недоступен — локальные данные
          </span>
        )}
        {reports && (
          <span className="flex items-center gap-1.5 text-fg-mute">
            {filtered.length} из {reports.length} инцидентов
            <DemoBadge className="!px-1.5">демо-набор</DemoBadge>
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* ---- Панель фильтров и список ---- */}
        <aside className="order-2 space-y-4 lg:order-1">
          <div className="surface p-4">
            {/* поиск */}
            <div className="relative mb-4">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск: адрес, участок…"
                className="field !py-2 pl-8 pr-3 text-[13px]"
                aria-label="Поиск по инцидентам на карте"
              />
              {query.length >= 2 && (
                <div
                  className={cn(
                    "mt-2 overflow-hidden rounded-xl border",
                    searchResults.length > 0 ? "border-line bg-panel-2" : "",
                  )}
                >
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-3 text-[12px] text-fg-mute">Ничего не найдено</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {searchResults.map((r) => (
                        <li key={r.id}>
                          <button
                            onClick={() => {
                              setLocalFocus(r.id);
                              setQuery("");
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent-soft"
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: SEVERITY_META[r.severity].color }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg">
                              {r.title}
                            </span>
                            <Crosshair size={12} className="text-fg-mute" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              <ListFilter size={13} className="text-accent" />
              Уровень опасности
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITIES.map((s) => {
                const meta = SEVERITY_META[s];
                const on = sevFilter.has(s);
                const count = reports?.filter((r) => r.severity === s).length ?? 0;
                return (
                  <button
                    key={s}
                    onClick={() => toggleSet(sevFilter, s, setSevFilter)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition-all",
                      on ? "" : "opacity-30 saturate-0",
                    )}
                    style={{
                      color: meta.color,
                      background: meta.dim,
                      borderColor: meta.color + "40",
                    }}
                  >
                    {meta.label}
                    <span className="font-mono text-[10px] opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>

            <h3 className="mb-2.5 mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              <MapPinned size={13} className="text-accent" />
              Статусы
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((st) => {
                const meta = STATUS_META[st];
                const on = statusFilter.has(st);
                const count = reports?.filter((r) => r.status === st).length ?? 0;
                return (
                  <button
                    key={st}
                    onClick={() => toggleSet(statusFilter, st, setStatusFilter)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition-all",
                      on ? "" : "opacity-30 saturate-0",
                    )}
                    style={{
                      color: meta.color,
                      background: meta.dim,
                      borderColor: meta.color + "40",
                    }}
                  >
                    {meta.label}
                    <span className="font-mono text-[10px] opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>

            <h3 className="mb-2 mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              <Layers size={13} className="text-accent" />
              Слои
            </h3>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-panel-2 px-3 py-2 text-[13px]">
              <span className="text-fg-dim">Зоны концентрации</span>
              <input
                type="checkbox"
                checked={showZones}
                onChange={(e) => setShowZones(e.target.checked)}
                className="h-4 w-4 accent-[#2563eb]"
              />
            </label>
            <p className="mt-2 text-[11px] leading-snug text-fg-mute">
              Полупрозрачные области — сеточная кластеризация активных инцидентов
              (≥ 2 сообщения в ячейке ~1,5–2 км).
            </p>

            {/* Легенда */}
            <div className="mt-4 rounded-xl border border-line bg-panel-2 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
                Легенда
              </p>
              <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-fg-mute">
                {SEVERITIES.map((s) => (
                  <li key={"lg-" + s} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full border-2 border-white shadow-[0_1px_2px_rgba(23,43,77,0.3)]"
                      style={{ background: SEVERITY_META[s].color }}
                    />
                    {SEVERITY_META[s].label.toLowerCase()}
                  </li>
                ))}
                <li className="col-span-2 flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-6 rounded border border-dashed"
                    style={{
                      background: "rgba(37,99,235,0.12)",
                      borderColor: "#2563eb",
                    }}
                  />
                  зона концентрации
                </li>
              </ul>
            </div>
          </div>

          {/* Список инцидентов */}
          <IncidentShortList reports={filtered} onPick={(id) => setLocalFocus(id)} />
        </aside>

        {/* ---- Карта ---- */}
        <div className="order-1 lg:order-2">
          <div className="surface overflow-hidden !rounded-2xl p-0">
            <div className="h-[52vh] lg:h-[calc(100vh-11rem)] lg:min-h-[560px]">
              {reports === null ? (
                <div className="flex h-full items-center justify-center bg-[#e4eaf2]">
                  <Loader2 className="spinner text-accent" size={26} />
                </div>
              ) : (
                <IncidentMap reports={filtered} focusId={activeFocus} showZones={showZones} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentShortList({
  reports,
  onPick,
}: {
  reports: FloodReport[];
  onPick: (id: string) => void;
}) {
  if (reports.length === 0) {
    return (
      <div className="surface p-4 text-center text-[13px] text-fg-mute">
        Нет инцидентов по выбранным фильтрам
      </div>
    );
  }
  const sorted = [...reports].sort(
    (a, b) => b.risk_score - a.risk_score || +new Date(b.created_at) - +new Date(a.created_at),
  );
  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-line px-4 py-2.5 text-[12px] font-semibold text-fg-dim">
        Инциденты по индексу риска
      </div>
      <ul className="max-h-[320px] divide-y divide-line overflow-y-auto lg:max-h-[420px]">
        {sorted.map((r) => (
          <li key={r.id}>
            <Link
              href={`/incidents/${r.id}`}
              onMouseEnter={() => onPick(r.id)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-panel-2"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: SEVERITY_META[r.severity].color }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-fg">{r.title}</div>
                <div className="text-[11px] text-fg-mute">
                  {r.district ? `${r.district} · ` : ""}
                  {relativeTime(r.created_at)}
                </div>
              </div>
              <RiskChip score={r.risk_score} />
              <ChevronRight size={14} className="shrink-0 text-fg-mute" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

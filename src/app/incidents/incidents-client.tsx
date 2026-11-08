"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ListFilter,
  ChevronRight,
  Inbox,
} from "lucide-react";
import type { FloodReport, IncidentStatus, Severity } from "@/lib/types";
import { SEVERITIES, STATUSES } from "@/lib/types";
import { listReports, type BackendMode } from "@/lib/store";
import { SEVERITY_META, STATUS_META } from "@/lib/constants";
import { cn, relativeTime, idToNum } from "@/lib/format";
import { DemoBadge, SeverityBadge, StatusBadge, RiskChip } from "@/components/badges";

export default function IncidentsClient() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") as IncidentStatus | null;

  const [reports, setReports] = useState<FloodReport[] | null>(null);
  const [mode, setMode] = useState<BackendMode>("demo");
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(initialQ);
  const [sev, setSev] = useState<Severity | null>(null);
  const [status, setStatus] = useState<IncidentStatus | null>(
    initialStatus && STATUSES.includes(initialStatus) ? initialStatus : null,
  );

  useEffect(() => {
    listReports()
      .then((res) => {
        setReports(res.reports);
        setMode(res.mode);
      })
      .catch(() => setError("Не удалось загрузить список инцидентов"));
  }, []);

  const filtered = useMemo(() => {
    if (!reports) return [];
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => {
        if (sev && r.severity !== sev) return false;
        if (status && r.status !== status) return false;
        if (q) {
          return (
            r.title.toLowerCase().includes(q) ||
            (r.district ?? "").toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort(
        (a, b) =>
          b.risk_score - a.risk_score || +new Date(b.created_at) - +new Date(a.created_at),
      );
  }, [reports, query, sev, status]);

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

  return (
    <div className="space-y-4">
      {/* поиск + фильтры */}
      <div className="surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по описанию, участку, ориентиру…"
              className="field !py-2 pl-8 pr-8 text-[13.5px]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-mute hover:text-fg"
                aria-label="Очистить поиск"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sev ?? ""}
              onChange={(e) => setSev((e.target.value || null) as Severity | null)}
              className="field !w-auto !py-2 text-[13px]"
              aria-label="Фильтр по уровню опасности"
            >
              <option value="">Любая опасность</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_META[s].label}
                </option>
              ))}
            </select>
            <select
              value={status ?? ""}
              onChange={(e) => setStatus((e.target.value || null) as IncidentStatus | null)}
              className="field !w-auto !py-2 text-[13px]"
              aria-label="Фильтр по статусу"
            >
              <option value="">Любой статус</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_META[st].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-fg-mute">
          <ListFilter size={12} className="text-accent" />
          {reports === null
            ? "Загрузка…"
            : `Показано ${filtered.length} из ${reports.length} инцидентов`}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
              mode === "supabase" ? "bg-[#f0fdf4] text-sev-low" : "bg-accent-soft text-accent",
            )}
          >
            {mode === "supabase" ? "SUPABASE" : "DEMO"}
          </span>
          <DemoBadge className="!px-1.5 !py-0">демо-набор</DemoBadge>
        </p>
      </div>

      {/* список */}
      <div className="surface overflow-hidden">
        {reports === null ? (
          <div className="space-y-2.5 p-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-[68px] w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <Inbox size={26} className="text-fg-mute" />
            <p className="text-[13.5px] text-fg-dim">По запросу ничего не найдено</p>
            <p className="text-[12px] text-fg-mute">
              Попробуйте изменить запрос или сбросить фильтры
            </p>
            <button
              className="btn btn-ghost !py-1.5 text-[13px]"
              onClick={() => {
                setQuery("");
                setSev(null);
                setStatus(null);
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/incidents/${r.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-panel-2 sm:gap-4 sm:px-5"
                >
                  {/* мини-превью */}
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.photo_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover max-sm:hidden"
                    />
                  ) : null}
                  <span className="hidden w-[74px] shrink-0 font-mono text-[11px] text-fg-mute xl:block">
                    {idToNum(r.id)}
                  </span>
                  <span className="h-2 w-2 shrink-0 rounded-full xl:hidden" style={{ background: SEVERITY_META[r.severity].color }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-fg">
                        {r.title}
                      </span>
                      {r.is_demo && (
                        <span className="hidden shrink-0 rounded border border-[#fcd34d] bg-[#fffbeb] px-1 text-[9px] font-bold text-[#92400e] sm:inline">
                          DEMO
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-fg-mute">
                      {r.district ? `${r.district} · ` : ""}
                      {relativeTime(r.created_at)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 gap-2 sm:flex">
                    <SeverityBadge severity={r.severity} size="xs" />
                    <StatusBadge status={r.status} />
                  </span>
                  <RiskChip score={r.risk_score} />
                  <ChevronRight size={15} className="shrink-0 text-fg-mute" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

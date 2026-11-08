"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Lock,
  ShieldAlert,
  Building2,
  Inbox,
  AlertOctagon,
  CheckCircle2,
  BadgeCheck,
  ExternalLink,
  RefreshCw,
  LogOut,
} from "lucide-react";
import type { FloodReport, IncidentStatus, ReportComment } from "@/lib/types";
import { STATUSES, SEVERITIES } from "@/lib/types";
import { listReports, updateReport, addComment, listComments, type BackendMode } from "@/lib/store";
import { SEVERITY_META, STATUS_META, ADMIN_PASSWORD_DEFAULT } from "@/lib/constants";
import { cn, formatCoords, formatDateShort, idToNum } from "@/lib/format";
import { SeverityBadge, DemoBadge, RiskChip } from "@/components/badges";
import {
  IncidentsTrendChart,
  DistributionPie,
  TopZonesBar,
  type DayPoint,
  type Slice,
} from "@/components/charts";
import { computeZones, type Zone } from "@/lib/zones";

const SESSION_KEY = "tasqyn.admin.session.v1";

export default function AdminClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [reports, setReports] = useState<FloodReport[] | null>(null);
  const [mode, setMode] = useState<BackendMode>("demo");
  const [degraded, setDegraded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<{ id: string; author: string; text: string; open: boolean }>({ id: "", author: "", text: "", open: false });
  const [comments, setComments] = useState<ReportComment[]>([]);

  useEffect(() => {
    // отложенно читаем sessionStorage, чтобы не рассинхронизировать гидратацию
    Promise.resolve().then(() => {
      setAuthed(window.sessionStorage.getItem(SESSION_KEY) === "1");
    });
  }, []);

  function refresh() {
    setRefreshing(true);
    listReports()
      .then((res) => {
        setReports(res.reports);
        setMode(res.mode);
        setDegraded(res.degraded);
      })
      .finally(() => setRefreshing(false));
  }

  useEffect(() => {
    if (!authed) return;
    let alive = true;
    listReports()
      .then((res) => {
        if (!alive) return;
        setReports(res.reports);
        setMode(res.mode);
        setDegraded(res.degraded);
      })
      .catch(() => {
        if (alive) setReports([]);
      });
    return () => {
      alive = false;
    };
  }, [authed]);

  function login(e: React.FormEvent) {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ADMIN_PASSWORD_DEFAULT;
    if (password === expected) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setLoginError("Неверный пароль. Для демонстрации пароль по умолчанию: " + ADMIN_PASSWORD_DEFAULT);
    }
  }

  // ------------------------------ LOGIN SCREEN ------------------------------
  if (authed === null) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="spinner text-accent" size={24} />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm">
        <form onSubmit={login} className="surface p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
              <Lock size={18} />
            </span>
            <div>
              <h1 className="text-[16px] font-bold">Доступ для служб города</h1>
              <p className="text-[12px] text-fg-mute">
                Панель управления инцидентами
              </p>
            </div>
          </div>
          <label className="field-label" htmlFor="admin-pass">
            Пароль
          </label>
          <input
            id="admin-pass"
            type="password"
            className="field"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError(null);
            }}
            autoFocus
          />
          {loginError && <p className="mt-2 text-[12px] text-sev-critical">{loginError}</p>}
          <button type="submit" className="btn btn-primary mt-4 w-full">
            Войти
          </button>
          <p className="mt-4 flex items-start gap-1.5 rounded-lg border border-[#fcd34d] bg-[#fffbeb] p-2.5 text-[11px] leading-relaxed text-[#92400e]">
            <ShieldAlert size={13} className="mt-0.5 shrink-0" />
            ДЕМО-АВТОРИЗАЦИЯ: проверка пароля происходит на клиенте и не является
            production-аутентификацией. Подключите Supabase Auth для реальной
            защиты.
          </p>
        </form>
      </div>
    );
  }

  // ------------------------------ DASHBOARD ------------------------------
  if (reports === null) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="spinner text-accent" size={26} />
      </div>
    );
  }

  const total = reports.length;
  const newCount = reports.filter((r) => r.status === "new").length;
  const highCount = reports.filter(
    (r) => (r.severity === "high" || r.severity === "critical") && r.status !== "resolved",
  ).length;
  const confirmedCount = reports.filter((r) => r.status === "confirmed").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  async function changeStatus(id: string, status: IncidentStatus) {
    setRowError(null);
    try {
      const updated = await updateReport(id, { status });
      if (updated) setReports((prev) => (prev ? prev.map((r) => (r.id === id ? updated : r)) : prev));
    } catch {
      setRowError("Не удалось изменить статус инцидента " + id);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentDraft.open || commentDraft.text.trim().length < 3) return;
    try {
      const c = await addComment(
        commentDraft.id,
        commentDraft.author.trim() || "Дежурный смены",
        commentDraft.text.trim(),
      );
      setComments((prev) => [...prev, c]);
      setCommentDraft({ id: "", author: "", text: "", open: false });
    } catch {
      setRowError("Не удалось добавить комментарий");
    }
  }

  async function openComments(id: string) {
    if (commentDraft.open && commentDraft.id === id) {
      setCommentDraft({ id: "", author: "", text: "", open: false });
      return;
    }
    const list = await listComments(id);
    setComments(list);
    setCommentDraft({ id, author: "", text: "", open: true });
  }

  return (
    <div className="space-y-5">
      {/* header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Building2 size={18} />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">
              Панель городских служб
            </h1>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-mute">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-bold uppercase",
                  mode === "supabase"
                    ? "bg-[#f0fdf4] text-sev-low"
                    : "bg-accent-soft text-accent",
                )}
              >
                {mode === "supabase" ? "SUPABASE" : "DEMO"}
              </span>
              данных: {total}
              {degraded && " (офлайн-фолбэк)"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost !py-2" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="spinner" size={14} /> : <RefreshCw size={14} />}
            Обновить
          </button>
          <button
            className="btn btn-ghost !py-2"
            onClick={() => {
              window.sessionStorage.removeItem(SESSION_KEY);
              setAuthed(false);
            }}
          >
            <LogOut size={14} />
            Выйти
          </button>
        </div>
      </div>

      {rowError && (
        <p className="rounded-lg border border-sev-critical/25 bg-[#fef2f2] px-3 py-2 text-[12px] text-sev-critical">
          {rowError}
        </p>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Inbox} label="Всего инцидентов" value={total} accent="#2563eb" />
        <StatCard icon={Inbox} label="Новые сообщения" value={newCount} accent="#7c3aed" />
        <StatCard icon={AlertOctagon} label="Высокая опасность" value={highCount} accent="#f97316" />
        <StatCard icon={BadgeCheck} label="Подтверждённые" value={confirmedCount} accent="#2563eb" />
        <StatCard icon={CheckCircle2} label="Устранённые" value={resolvedCount} accent="#16a34a" />
      </div>

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface p-4 lg:col-span-2">
          <h2 className="mb-3 text-[13px] font-semibold text-fg-dim">
            Динамика инцидентов (14 дней)
          </h2>
          <TrendChart reports={reports} />
        </section>
        <section className="surface p-4">
          <h2 className="mb-1 text-[13px] font-semibold text-fg-dim">
            Распределение по опасности
          </h2>
          <DistributionPie data={severitySlices(reports)} />
          <ul className="mt-1 space-y-1 text-[11px]">
            {severitySlices(reports).map((s) => (
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
            Проблемные территории (сеточные зоны кластеризации)
          </h2>
          <TopZonesBar data={zoneBars(reports)} />
        </section>
        <section className="surface p-4">
          <h2 className="mb-1 text-[13px] font-semibold text-fg-dim">
            Распределение по статусам
          </h2>
          <DistributionPie data={statusSlices(reports)} />
          <ul className="mt-1 space-y-1 text-[11px]">
            {statusSlices(reports).map((s) => (
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

      {/* table */}
      <section className="surface overflow-hidden">
        <div className="border-b border-line px-4 py-3 text-[13px] font-semibold text-fg-dim">
          Очередь инцидентов
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-fg-mute">
                <th className="px-4 py-2.5 font-semibold">ID</th>
                <th className="px-4 py-2.5 font-semibold">Дата</th>
                <th className="px-4 py-2.5 font-semibold">Местоположение</th>
                <th className="px-4 py-2.5 font-semibold">Опасность</th>
                <th className="px-4 py-2.5 font-semibold">Риск</th>
                <th className="px-4 py-2.5 font-semibold">Статус</th>
                <th className="px-4 py-2.5 font-semibold">AI</th>
                <th className="px-4 py-2.5 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...reports]
                .sort((a, b) => {
                  const rank = { new: 0, reviewing: 1, confirmed: 2, resolved: 3 } as const;
                  return (
                    rank[a.status] - rank[b.status] ||
                    b.risk_score - a.risk_score
                  );
                })
                .map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-panel-2">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/incidents/${r.id}`}
                        className="font-mono text-[12px] text-accent hover:underline"
                      >
                        {idToNum(r.id)}
                      </Link>
                      {r.is_demo && (
                        <span className="ml-1.5 rounded border border-[#fcd34d] bg-[#fffbeb] px-1 py-0.5 text-[9px] font-bold text-[#92400e]">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-fg-dim">
                      {formatDateShort(r.created_at)}
                    </td>
                    <td className="max-w-[220px] px-4 py-2.5">
                      <div className="truncate text-fg">{r.title}</div>
                      <div className="font-mono text-[10px] text-fg-mute">
                        {formatCoords(r.latitude, r.longitude)}
                        {r.district ? ` · ${r.district}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <SeverityBadge severity={r.severity} size="xs" />
                    </td>
                    <td className="px-4 py-2.5">
                      <RiskChip score={r.risk_score} />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        className="field !w-auto !py-1 text-[12px]"
                        value={r.status}
                        onChange={(e) => changeStatus(r.id, e.target.value as IncidentStatus)}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {STATUS_META[st].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.ai_analysis ? (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold",
                            r.ai_analysis.is_demo
                              ? "border border-[#fcd34d] bg-[#fffbeb] text-[#92400e]"
                              : "border border-sev-low/25 bg-[#f0fdf4] text-sev-low",
                          )}
                        >
                          {r.ai_analysis.is_demo ? "DEMO" : "REAL"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-fg-mute">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/incidents/${r.id}`}
                          className="btn btn-ghost !px-2 !py-1 text-[11px]"
                        >
                          <ExternalLink size={12} />
                          Открыть
                        </Link>
                        <button
                          className="btn btn-ghost !px-2 !py-1 text-[11px]"
                          onClick={() => openComments(r.id)}
                        >
                          Комментарий
                        </button>
                        {r.status !== "resolved" && (
                          <button
                            className="btn btn-primary !px-2 !py-1 text-[11px]"
                            onClick={() => changeStatus(r.id, "resolved")}
                          >
                            <CheckCircle2 size={12} />
                            Устранён
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* comment form */}
      {commentDraft.open && (
        <form onSubmit={submitComment} className="surface space-y-2 p-4">
          <h3 className="text-[13px] font-semibold">
            Комментарий к инциденту {idToNum(commentDraft.id)}
          </h3>
          {comments.length > 0 && (
            <ul className="space-y-1.5">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-line bg-panel-2 p-2.5 text-[12px]"
                >
                  <span className="font-semibold text-fg-dim">{c.author}</span>
                  <span className="text-fg-mute"> · {formatDateShort(c.created_at)}</span>
                  <p className="mt-1 leading-relaxed text-fg-dim">{c.text}</p>
                </li>
              ))}
            </ul>
          )}
          <input
            className="field"
            placeholder="Автор (по умолчанию: Дежурный смены)"
            value={commentDraft.author}
            onChange={(e) => setCommentDraft((d) => ({ ...d, author: e.target.value }))}
            maxLength={60}
          />
          <textarea
            className="field min-h-[70px]"
            placeholder="Текст комментария службы…"
            value={commentDraft.text}
            onChange={(e) => setCommentDraft((d) => ({ ...d, text: e.target.value }))}
            maxLength={500}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary !py-1.5 text-[13px]">
              Добавить
            </button>
            <button
              type="button"
              className="btn btn-ghost !py-1.5 text-[13px]"
              onClick={() => setCommentDraft({ id: "", author: "", text: "", open: false })}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <p className="text-[11px] leading-relaxed text-fg-mute">
        <DemoBadge className="mr-2" />
        Демо-авторизация и часть записи — синтетические. Для production используйте
        Supabase Auth и RLS-политики из миграции.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  accent: string;
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
      </div>
      <div className="mt-1.5 text-[11px] leading-tight text-fg-mute">{label}</div>
    </div>
  );
}

function severitySlices(reports: FloodReport[]): Slice[] {
  return SEVERITIES.map((s) => ({
    name: SEVERITY_META[s].label,
    value: reports.filter((r) => r.severity === s).length,
    color: SEVERITY_META[s].color,
  })).filter((d) => d.value > 0);
}

function statusSlices(reports: FloodReport[]): Slice[] {
  return (["new", "reviewing", "confirmed", "resolved"] as IncidentStatus[]).map((st) => ({
    name: STATUS_META[st].label,
    value: reports.filter((r) => r.status === st).length,
    color: STATUS_META[st].color,
  })).filter((d) => d.value > 0);
}

function zoneBars(reports: FloodReport[]) {
  const zones: Zone[] = computeZones(reports, 0.02, 0.025);
  const named = zones
    .slice(0, 6)
    .map((z) => ({
      name: zoneName(z, reports),
      value: z.count,
      color: SEVERITY_META[z.severity].color,
    }))
    .sort((a, b) => b.value - a.value);
  return named.length > 0
    ? named
    : [{ name: "Нет кластеров", value: 0, color: "#2563eb" }];
}

function zoneName(z: Zone, reports: FloodReport[]): string {
  const near = reports
    .filter((r) => {
      const dLat = Math.abs(r.latitude - z.lat);
      const dLon = Math.abs(r.longitude - z.lon);
      return dLat < 0.02 && dLon < 0.011;
    })
    .find((r) => r.district);
  const label = near?.district ?? null;
  return label ? `${label}` : `${z.lat.toFixed(3)}, ${z.lon.toFixed(3)}`;
}

function TrendChart({ reports }: { reports: FloodReport[] }) {
  const data: DayPoint[] = useMemo(() => {
    const days: DayPoint[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        count: reports.filter((r) => r.created_at.slice(0, 10) === key).length,
      });
    }
    return days;
  }, [reports]);
  return <IncidentsTrendChart data={data} />;
}

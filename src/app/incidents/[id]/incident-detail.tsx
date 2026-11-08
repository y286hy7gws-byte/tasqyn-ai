"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  ExternalLink,
  Loader2,
  MapPinned,
  BrainCircuit,
  MessageSquarePlus,
  SearchX,
  Droplets,
  Footprints,
  Clock,
} from "lucide-react";
import type { FloodReport, ReportComment } from "@/lib/types";
import { getReport, listComments, addComment } from "@/lib/store";
import { formatDate, formatCoords, relativeTime, idToNum, cn } from "@/lib/format";
import { IncidentMap } from "@/components/map/incident-map-client";
import { SeverityBadge, StatusBadge, DemoBadge } from "@/components/badges";
import { RiskGauge, RiskFactorList } from "@/components/risk-gauge";

export default function IncidentDetail({ id }: { id: string }) {
  const [report, setReport] = useState<FloodReport | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getReport(id)
      .then((r) => {
        if (!alive) return;
        if (!r) {
          setNotFound(true);
        } else {
          setReport(r);
          listComments(r.id).then((c) => alive && setComments(c));
        }
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;
    const text = commentText.trim();
    if (text.length < 3 || text.length > 500) {
      setCommentError("Комментарий: от 3 до 500 символов");
      return;
    }
    setCommentError(null);
    setSendingComment(true);
    try {
      const c = await addComment(report.id, commentAuthor.trim() || "Житель", text);
      setComments((prev) => [...prev, c]);
      setCommentText("");
      setCommentAuthor("");
    } catch {
      setCommentError("Не удалось добавить комментарий");
    } finally {
      setSendingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="spinner text-accent" size={26} />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="surface flex flex-col items-center gap-4 p-12 text-center">
        <SearchX size={30} className="text-fg-mute" />
        <div>
          <h1 className="text-lg font-bold">Инцидент не найден</h1>
          <p className="mt-1 text-[13px] text-fg-mute">
            Возможно, запись существует только в другом хранилище (Supabase/локальные
            данные браузера), или ссылка устарела.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/map" className="btn btn-ghost">
            К карте инцидентов
          </Link>
          <Link href="/report" className="btn btn-primary">
            Сообщить о подтоплении
          </Link>
        </div>
      </div>
    );
  }

  const ai = report.ai_analysis;

  return (
    <div className="space-y-4">
      {/* верхняя строка */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-dim transition-colors hover:text-accent"
        >
          <ArrowLeft size={15} />
          Все инциденты
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {report.is_demo && <DemoBadge />}
          <StatusBadge status={report.status} />
          <SeverityBadge severity={report.severity} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* левая колонка */}
        <div className="space-y-4">
          {/* заголовок + фото */}
          <div className="surface overflow-hidden">
            <div className="p-5 pb-4">
              <div className="font-mono text-[11px] text-fg-mute">{idToNum(report.id)}</div>
              <h1 className="text-lg font-bold leading-snug sm:text-xl">{report.title}</h1>
              <p className="mt-1 text-[12px] text-fg-mute">
                Создан {formatDate(report.created_at)} ({relativeTime(report.created_at)})
                · Обновлён {relativeTime(report.updated_at)}
              </p>
            </div>
            {report.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.photo_url}
                alt={`Фото подтопления: ${report.title}`}
                className="max-h-[420px] w-full border-y border-line object-cover"
              />
            )}
            <div className="p-5">
              <p className="text-[14px] leading-relaxed text-fg-dim">{report.description}</p>

              {/* мета-плитки */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <InfoTile
                  icon={Droplets}
                  label="Глубина"
                  value={
                    report.water_depth !== null ? `~${report.water_depth} см` : "не оценена"
                  }
                />
                <InfoTile
                  icon={Footprints}
                  label="Проходимость"
                  value={
                    { free: "Свободно", limited: "Затруднена", blocked: "Невозможна" }[
                      report.accessibility ?? "limited"
                    ]
                  }
                />
                <InfoTile icon={Clock} label="Регистрация" value={formatDate(report.created_at)} />
                <InfoTile
                  icon={MapPin}
                  label="Район"
                  value={report.district ?? "не указан"}
                />
              </div>

              {/* локация */}
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-panel-2 p-3 text-[12px]">
                <MapPin size={15} className="shrink-0 text-accent" />
                <span className="font-mono text-fg-dim">
                  {formatCoords(report.latitude, report.longitude)}
                </span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent hover:underline"
                >
                  <ExternalLink size={12} /> Открыть в OSM
                </a>
              </div>
            </div>
          </div>

          {/* мини-карта */}
          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-fg-dim">
                <MapPinned size={14} className="text-accent" />
                Местоположение на карте
              </h2>
              <Link
                href={`/map?focus=${report.id}`}
                className="text-[12px] font-semibold text-accent hover:underline"
              >
                Открыть карту
              </Link>
            </div>
            <div className="h-[240px]">
              <IncidentMap reports={[report]} focusId={report.id} showZones={false} />
            </div>
          </div>

          {/* комментарии */}
          <div className="surface p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <MessageSquarePlus size={15} className="text-accent" />
              Обсуждение
              <span className="font-mono text-[11px] font-normal text-fg-mute">
                ({comments.length})
              </span>
            </h2>
            {comments.length === 0 ? (
              <p className="mb-3 text-[12px] text-fg-mute">
                Пока нет комментариев. Уточните ситуацию или добавьте своё фото.
              </p>
            ) : (
              <ul className="mb-4 space-y-2.5">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-xl bg-panel-2 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
                        {c.author.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="text-[12px] font-semibold text-fg-dim">{c.author}</span>
                      <span className="text-[11px] text-fg-mute">
                        · {relativeTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-fg-dim">{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={submitComment} className="space-y-2">
              <div className="flex gap-2">
                <input
                  className="field"
                  placeholder="Имя (необязательно)"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  maxLength={60}
                />
              </div>
              <textarea
                className="field min-h-[70px]"
                placeholder="Ваш комментарий…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={500}
              />
              {commentError && (
                <p className="text-[12px] text-sev-critical">{commentError}</p>
              )}
              <button type="submit" className="btn btn-ghost" disabled={sendingComment}>
                {sendingComment ? (
                  <Loader2 className="spinner" size={14} />
                ) : (
                  <MessageSquarePlus size={14} />
                )}
                Добавить комментарий
              </button>
            </form>
          </div>
        </div>

        {/* правая колонка */}
        <div className="space-y-4">
          {/* индекс риска */}
          <div className="surface p-5">
            <h2 className="mb-4 flex items-center justify-between text-[14px] font-semibold">
              <span className="flex items-center gap-2">
                <BrainCircuit size={15} className="text-accent" />
                Индекс риска
              </span>
              <span className="font-mono text-[11px] font-normal text-fg-mute">0–100</span>
            </h2>
            <div className="flex items-center gap-4">
              <RiskGauge score={report.risk_score} size={104} />
              {report.risk_factors && report.risk_factors.length > 0 && (
                <div className="min-w-0 flex-1">
                  <RiskFactorList factors={report.risk_factors} />
                </div>
              )}
            </div>
            {(!report.risk_factors || report.risk_factors.length === 0) && (
              <p className="mt-3 text-[12px] leading-relaxed text-fg-mute">
                Расшифровка факторов недоступна для этой записи
                ({report.is_demo
                  ? "демо-запись создана со значением индекса"
                  : "запись добавлена без пересчёта факторов"}).
              </p>
            )}
            <p className="mt-4 rounded-xl bg-panel-2 p-2.5 text-[11px] leading-relaxed text-fg-mute">
              Индекс риска — производная данных инцидента и соседнего контекста
              (глубина, проходимость, плотность и повторяемость). Это не прогноз
              наводнения и не гидрологическая модель.
            </p>
          </div>

          {/* AI-анализ */}
          <div className="surface p-5">
            <h2 className="mb-3 flex items-center justify-between text-[14px] font-semibold">
              <span className="flex items-center gap-2">
                <BrainCircuit size={15} className="text-accent" />
                AI-анализ
              </span>
              {ai && (
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    ai.is_demo
                      ? "border-[#fcd34d] bg-[#fffbeb] text-[#92400e]"
                      : "border-sev-low/25 bg-[#f0fdf4] text-sev-low",
                  )}
                >
                  {ai.is_demo ? "DEMO" : "REAL"}
                </span>
              )}
            </h2>
            {ai ? (
              <div className="space-y-2.5 text-[13px]">
                <Row k="Признаки подтопления">
                  <b className={ai.flood_detected ? "text-sev-low" : "text-fg-dim"}>
                    {ai.flood_detected ? "Обнаружены" : "Не обнаружены"}
                  </b>
                </Row>
                <Row k="Выраженность">
                  <SeverityBadge severity={ai.severity} size="xs" />
                </Row>
                <Row k="Уверенность">
                  <span className="font-mono">{(ai.confidence * 100).toFixed(0)}%</span>
                </Row>
                <Row k="Водная поверхность">
                  {
                    {
                      none: "нет",
                      minor: "незначительно",
                      significant: "значительно",
                      extensive: "обширно",
                    }[ai.water_visibility]
                  }
                </Row>
                <Row k="Проходимость (AI)">
                  {
                    {
                      free: "свободно",
                      limited: "ограничена",
                      blocked: "блокирована",
                    }[ai.pedestrian_accessibility]
                  }
                </Row>
                <div className="rounded-xl bg-panel-2 p-3 text-[12px] leading-relaxed text-fg-dim">
                  {ai.summary}
                </div>
                <div className="rounded-xl bg-accent-soft p-3 text-[12px] leading-relaxed">
                  <span className="font-semibold text-accent">Действие: </span>
                  <span className="text-fg-dim">{ai.recommended_action}</span>
                </div>
                <p className="font-mono text-[10px] text-fg-mute">
                  provider: {ai.provider} · analyzed_at: {formatDate(ai.analyzed_at)}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-fg-mute">
                Инцидент был добавлен без AI-анализа. Запустите проверку через форму
                повторного сообщения или настроенный AI-провайдер.
              </p>
            )}
          </div>

          {/* жизненный цикл */}
          <div className="surface p-5">
            <h2 className="mb-4 text-[14px] font-semibold">История изменений</h2>
            <ol className="space-y-0">
              {(["new", "reviewing", "confirmed", "resolved"] as const).map((st, i, arr) => {
                const passed = report.status === st || arr.indexOf(report.status) > i;
                const isLast = i === arr.length - 1;
                return (
                  <li key={st} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                          passed
                            ? "border-accent/30 bg-accent-soft text-accent"
                            : "border-line bg-panel-2 text-fg-mute",
                        )}
                      >
                        {i + 1}
                      </span>
                      {!isLast && (
                        <span
                          className={cn(
                            "h-7 w-px",
                            passed ? "bg-accent/30" : "bg-line",
                          )}
                        />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <div
                        className={cn(
                          "text-[13px] font-medium",
                          passed ? "text-fg" : "text-fg-mute",
                        )}
                      >
                        {
                          {
                            new: "Новый",
                            reviewing: "На проверке",
                            confirmed: "Подтверждён",
                            resolved: "Устранён",
                          }[st]
                        }
                      </div>
                      {report.status === st && (
                        <span className="text-[10.5px] text-fg-mute">
                          текущий статус · обновлено {relativeTime(report.updated_at)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <Link href={`/map?focus=${report.id}`} className="btn btn-ghost mt-4 w-full">
              <MapPinned size={14} />
              Показать на карте
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-panel-2 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-mute">
        <Icon size={11} className="text-accent" />
        {label}
      </div>
      <div className="mt-1 text-[12.5px] font-medium text-fg-dim">{value}</div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
      <span className="text-[12px] text-fg-mute">{k}</span>
      <span className="text-fg-dim">{children}</span>
    </div>
  );
}

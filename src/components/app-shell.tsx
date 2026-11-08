"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Droplets,
  LayoutDashboard,
  Map as MapIcon,
  Camera,
  ClipboardList,
  BarChart3,
  Building2,
  Info,
  Search,
  Bell,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn, relativeTime } from "@/lib/format";
import { listReports } from "@/lib/store";
import type { FloodReport } from "@/lib/types";
import { SEVERITY_META } from "@/lib/constants";

const NAV = [
  { href: "/", label: "Главный экран", icon: LayoutDashboard },
  { href: "/map", label: "Карта", icon: MapIcon },
  { href: "/report", label: "Сообщить о подтоплении", icon: Camera },
  { href: "/incidents", label: "Инциденты", icon: ClipboardList },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/admin", label: "Администрирование", icon: Building2 },
  { href: "/about", label: "О проекте", icon: Info },
];

// нижняя мобильная навигация: Главное / Карта / [Сообщить] / Аналитика / Инциденты
const BOTTOM_NAV = [
  { href: "/", label: "Главное", icon: LayoutDashboard },
  { href: "/map", label: "Карта", icon: MapIcon },
  { href: "/report", label: "Сообщить", icon: Camera, primary: true },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/incidents", label: "Инциденты", icon: ClipboardList },
];

const TITLES: Array<[string, string]> = [
  ["/incidents/", "Карточка инцидента"],
  ["/incidents", "Инциденты"],
  ["/map", "Карта подтоплений"],
  ["/report", "Сохранить сообщение"],
  ["/analytics", "Городская аналитика"],
  ["/admin", "Администрирование"],
  ["/about", "О проекте"],
  ["/", "Главный экран"],
];

function activePathname(pathname: string) {
  for (const [prefix, title] of TITLES) {
    if (prefix.endsWith("/") ? pathname === prefix : pathname.startsWith(prefix)) {
      return { prefix, title };
    }
  }
  return { prefix: "/", title: "TASQYN AI" };
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { title } = activePathname(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState<FloodReport[] | null>(null);
  const [query, setQuery] = useState("");
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  // список свежих критических инцидентов для «уведомлений»
  useEffect(() => {
    let alive = true;
    listReports()
      .then(({ reports }) => {
        if (!alive) return;
        setAlerts(
          reports
            .filter(
              (r) =>
                r.status !== "resolved" && (r.severity === "critical" || r.severity === "high"),
            )
            .sort((a, b) => b.risk_score - a.risk_score)
            .slice(0, 5),
        );
      })
      .catch(() => alive && setAlerts([]));
    return () => {
      alive = false;
    };
  }, []);

  // закрытие всплывающих панелей по клику мимо
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length === 0) return;
    setQuery("");
    router.push("/incidents?q=" + encodeURIComponent(q));
  }

  const closePopovers = () => {
    setMenuOpen(false);
    setBellOpen(false);
  };

  const alertCount = alerts?.length ?? 0;

  return (
    <div className="min-h-dvh">
      {/* ================= SIDEBAR (desktop) ================= */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-line bg-panel lg:flex">
        <Link href="/" className="flex h-14 items-center gap-2.5 border-b border-line px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-cyan-500 shadow-[0_4px_10px_-2px_rgba(37,99,235,0.5)]">
            <Droplets size={16} className="text-white" />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-fg">
            TASQYN<span className="text-accent">&nbsp;AI</span>
          </span>
          <DemoTag />
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const primary = item.href === "/report";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closePopovers}
                className={cn(
                  "group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-fg-dim hover:bg-panel-2 hover:text-fg",
                )}
              >
                <item.icon
                  size={16.5}
                  className={cn(
                    active ? "text-accent" : primary ? "text-water" : "text-fg-mute group-hover:text-fg-dim",
                    "shrink-0 transition-colors",
                  )}
                />
                <span className="leading-tight">{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <p className="px-3 text-[10.5px] leading-relaxed text-fg-mute">
            Павлодар · Smart City MVP
            <br />
            Демо-данные не являются реальными подтоплениями
          </p>
        </div>
      </aside>

      {/* ================= TOP BAR ================= */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            {/* мобильный логотип + гамбургер */}
            <div ref={menuRef} className="relative flex items-center lg:hidden">
              <button
                className="rounded-[10px] p-2 text-fg-dim hover:bg-panel-2"
                onClick={() => {
                  setMenuOpen((v) => !v);
                  setBellOpen(false);
                }}
                aria-label="Меню"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
                <Droplets size={13} className="text-white" />
              </span>
              <span className="text-[13.5px] font-bold tracking-tight">
                TASQYN<span className="text-accent"> AI</span>
              </span>
            </Link>

            {/* заголовок раздела (desktop) */}
            <h2 className="hidden pl-1 text-[15px] font-semibold tracking-tight text-fg lg:block">
              {title}
            </h2>

            {/* поиск */}
            <form onSubmit={submitSearch} className="ml-auto w-full max-w-[210px] sm:max-w-xs">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск инцидентов…"
                  className="field !py-1.5 pl-8 pr-3 text-[13px]"
                  aria-label="Поиск по инцидентам"
                />
              </div>
            </form>

            {/* уведомления */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => {
                  setBellOpen((v) => !v);
                  setMenuOpen(false);
                }}
                className="relative rounded-[10px] p-2 text-fg-dim transition-colors hover:bg-panel-2"
                aria-label="Уведомления"
                aria-expanded={bellOpen}
              >
                <Bell size={17} />
                {alertCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sev-critical px-0.5 text-[8.5px] font-bold text-white">
                    {alertCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="toast-in absolute right-0 top-11 w-[300px] overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_16px_40px_-12px_rgba(23,43,77,0.25)] sm:w-[340px]">
                  <div className="border-b border-line px-4 py-2.5 text-[12px] font-semibold text-fg-dim">
                    Требуют внимания
                    <span className="ml-1.5 font-mono text-[10.5px] font-normal text-fg-mute">
                      {alertCount}
                    </span>
                  </div>
                  {alerts === null ? (
                    <div className="space-y-2 p-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="skeleton h-9 w-full" />
                      ))}
                    </div>
                  ) : alerts.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[12.5px] text-fg-mute">
                      Высоких активных инцидентов нет
                    </p>
                  ) : (
                    <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
                      {alerts.map((r) => (
                        <li key={r.id}>
                          <Link
                            href={`/incidents/${r.id}`}
                            className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-panel-2"
                          >
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full"
                              style={{ background: SEVERITY_META[r.severity].color }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-fg">
                                {r.title}
                              </span>
                              <span className="text-[11px] text-fg-mute">
                                {r.district ? `${r.district} · ` : ""}
                                {relativeTime(r.created_at)}
                              </span>
                            </span>
                            <span
                              className="mt-0.5 font-mono text-[11px] font-bold"
                              style={{ color: SEVERITY_META[r.severity].color }}
                            >
                              {r.risk_score}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/map"
                    className="block border-t border-line bg-panel-2 px-4 py-2 text-center text-[12px] font-semibold text-accent hover:underline"
                  >
                    Открыть карту инцидентов
                  </Link>
                </div>
              )}
            </div>

            {/* профиль (плейсхолдер демо) */}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent"
              title="Гость · демо-профиль"
            >
              Ж
            </span>
          </div>

          {/* мобильное меню */}
          {menuOpen && (
            <nav className="toast-in border-t border-line bg-panel px-3 py-2 lg:hidden">
              {[NAV[5], NAV[6]].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closePopovers}
                  className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-fg-dim hover:bg-panel-2"
                >
                  <item.icon size={16} className="text-fg-mute" />
                  {item.label}
                </Link>
              ))}
              <p className="mb-1 mt-2 flex items-center gap-1.5 rounded-lg bg-[#fffbeb] px-3 py-2 text-[11px] leading-snug text-[#92400e]">
                <AlertTriangle size={12} className="shrink-0" />
                В демо-режиме показаны синтетические данные
              </p>
            </nav>
          )}
        </header>

        <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
        <SiteFooterWithShell />
      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
          {BOTTOM_NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closePopovers}
                  className="flex flex-col items-center justify-center py-1.5"
                  aria-label={item.label}
                >
                  <span
                    className={cn(
                      "-mt-3.5 flex h-11 w-11 items-center justify-center rounded-2xl text-white transition-transform active:scale-95",
                      active
                        ? "bg-gradient-to-br from-blue-600 to-blue-500 shadow-[0_8px_18px_-6px_rgba(37,99,235,0.65)]"
                        : "bg-gradient-to-br from-accent to-water shadow-[0_8px_18px_-6px_rgba(37,99,235,0.5)]",
                    )}
                  >
                    <item.icon size={20} />
                  </span>
                  <span
                    className={cn(
                      "text-[9.5px] font-semibold",
                      active ? "text-accent" : "text-fg-mute",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closePopovers}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                  active ? "text-accent" : "text-fg-mute hover:text-fg-dim",
                )}
              >
                <item.icon size={19} />
                <span className="text-[9.5px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function DemoTag() {
  return (
    <span className="ml-auto rounded-md border border-[#fcd34d] bg-[#fffbeb] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#92400e]">
      DEMO
    </span>
  );
}

/** Подвал, чуть ужатый под shell */
function SiteFooterWithShell() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="flex flex-col items-center justify-between gap-2 px-6 py-5 text-center text-[11.5px] text-fg-mute sm:flex-row sm:text-left">
        <p>
          © 2026 TASQYN AI — MVP для Idea Battle. Демонстрационный продукт, не является
          официальным сервисом акимата.
        </p>
        <p>
          OpenStreetMap · Leaflet · Next.js · Supabase
        </p>
      </div>
    </footer>
  );
}

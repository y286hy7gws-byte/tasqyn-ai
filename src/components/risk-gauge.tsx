"use client";

import type { RiskFactor } from "@/lib/types";
import { scoreToLevel, riskLevelRu } from "@/lib/risk";
import { SEVERITY_META } from "@/lib/constants";

/** Компактный круговой индикатор индекса риска 0..100 */
export function RiskGauge({ score, size = 92 }: { score: number; size?: number }) {
  const level = scoreToLevel(score);
  const color = SEVERITY_META[level].color;
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Индекс риска ${score} из 100, ${riskLevelRu(level)}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e8edf4"
          strokeWidth={7}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          style={{ transition: "stroke-dasharray .8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-fg-mute">
          риск
        </span>
      </div>
    </div>
  );
}

/** Расшифровка факторов индекса риска */
export function RiskFactorList({ factors }: { factors: RiskFactor[] }) {
  const total = factors.reduce((s, f) => s + f.weight, 0) || 100;
  return (
    <ul className="space-y-2.5">
      {factors.map((f, i) => {
        const pct = Math.round((f.points / (f.weight || 1)) * 100);
        const share = Math.round((f.points / total) * 100);
        return (
          <li key={i} className="text-[12px]">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-fg-dim">{f.label}</span>
              <span className="font-mono text-[11px] text-fg-mute">
                {f.points}/{f.weight} · {share}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e8edf4]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #2563eb, #06b6d4)",
                  transition: "width .6s ease",
                }}
              />
            </div>
            {f.note && (
              <p className="mt-1 text-[11px] leading-snug text-fg-mute">{f.note}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

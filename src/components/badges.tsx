import { AlertTriangle } from "lucide-react";
import type { IncidentStatus, Severity } from "@/lib/types";
import { SEVERITY_META, STATUS_META } from "@/lib/constants";
import { scoreToLevel, riskLevelRu } from "@/lib/risk";
import { cn } from "@/lib/format";

export function SeverityBadge({
  severity,
  size = "sm",
}: {
  severity: Severity;
  size?: "sm" | "xs";
}) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-[10px]",
      )}
      style={{ color: m.color, background: m.dim, borderColor: m.color + "33" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: m.color, background: m.dim, borderColor: m.color + "33" }}
    >
      {m.label}
    </span>
  );
}

export function RiskChip({ score }: { score: number }) {
  const level = scoreToLevel(score);
  const color = SEVERITY_META[level].color;
  return (
    <span
      className="inline-flex items-baseline gap-1 rounded-md border px-2 py-0.5 font-mono text-[12px] font-bold"
      style={{ color, borderColor: color + "40", background: SEVERITY_META[level].dim }}
      title={`Индекс риска: ${riskLevelRu(level)}`}
    >
      {score}
      <span className="text-[9px] font-medium opacity-70">РИСК</span>
    </span>
  );
}

export function DemoBadge({
  children = "DEMO DATA",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        "border-[#fcd34d] bg-[#fffbeb] text-[#92400e]",
        className,
      )}
    >
      <AlertTriangle size={11} />
      {children}
    </span>
  );
}

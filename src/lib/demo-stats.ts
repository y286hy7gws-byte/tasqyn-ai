/** Средний индекс риска по демо-набору (для полосы Live Stats) */
export function demoAvgRisk(reports: Array<{ risk_score: number }>): number {
  if (reports.length === 0) return 0;
  const sum = reports.reduce((s, r) => s + r.risk_score, 0);
  return Math.round(sum / reports.length);
}

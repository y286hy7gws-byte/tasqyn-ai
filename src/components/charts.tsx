"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = {
  stroke: "#718096",
  fontSize: 11,
  fontFamily: "var(--font-sans)",
} as const;

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #e8edf4",
  borderRadius: 10,
  fontSize: 12,
  color: "#172b4d",
  boxShadow: "0 10px 28px -10px rgba(23,43,77,0.22)",
} as const;

export interface DayPoint {
  date: string;
  count: number;
}

export function IncidentsTrendChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e8edf4" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "rgba(37,99,235,0.25)" }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#gradTrend)"
          name="Инциденты"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface Slice {
  name: string;
  value: number;
  color: string;
}

export function DistributionPie({ data }: { data: Slice[] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopZonesBar({
  data,
}: {
  data: Array<{ name: string; value: number; color?: string }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40 + 30)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
      >
        <CartesianGrid stroke="#e8edf4" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(37,99,235,0.05)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Инциденты" fill="#2563eb" barSize={16}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? "#2563eb"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

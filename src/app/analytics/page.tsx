import type { Metadata } from "next";
import AnalyticsClient from "./analytics-client";

export const metadata: Metadata = {
  title: "Аналитика",
  description:
    "Аналитика подтоплений Павлодара: динамика, повторяющиеся проблемные зоны, статусы устранения.",
};

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AnalyticsClient />
    </div>
  );
}

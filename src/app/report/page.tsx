import type { Metadata } from "next";
import ReportForm from "./report-form";
import { DemoBadge } from "@/components/badges";

export const metadata: Metadata = {
  title: "Сообщить о подтоплении",
  description:
    "Сообщите о подтоплении в Павлодаре: фото, геолокация, оценка глубины. AI проанализирует и добавит инцидент на карту.",
};

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-bold tracking-tight sm:text-xl">
            Новое сообщение о подтоплении
          </h1>
          <p className="mt-1 text-[13px] text-fg-mute">
            Три коротких шага — и инцидент появится на карте города
          </p>
        </div>
        <DemoBadge>демо-приём данных</DemoBadge>
      </div>
      <ReportForm />
    </div>
  );
}

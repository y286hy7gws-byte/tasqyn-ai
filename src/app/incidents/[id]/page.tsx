import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import IncidentDetail from "./incident-detail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Инцидент",
  description:
    "Карточка инцидента подтопления TASQYN AI: фото, координаты, AI-анализ и индекс риска.",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function IncidentPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="spinner text-accent" size={26} />
          </div>
        }
      >
        <IncidentRoute params={params} />
      </Suspense>
    </div>
  );
}

async function IncidentRoute({ params }: Props) {
  const { id } = await params;
  return <IncidentDetail id={id} />;
}

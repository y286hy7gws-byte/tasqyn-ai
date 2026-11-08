import type { Metadata } from "next";
import { Suspense } from "react";
import MapPageClient from "./map-page-client";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Карта подтоплений",
  description:
    "Интерактивная GIS-карта подтоплений Павлодара: маркеры инцидентов, фильтры, зоны концентрации.",
};

export default function MapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
      <Suspense
        fallback={
          <div className="flex h-[60vh] items-center justify-center text-fg-mute">
            <Loader2 className="spinner" />
          </div>
        }
      >
        <MapPageClient />
      </Suspense>
    </div>
  );
}

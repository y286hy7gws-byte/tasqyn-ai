import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import IncidentsClient from "./incidents-client";

export const metadata: Metadata = {
  title: "Инциденты",
  description: "Полный список инцидентов подтоплений TASQYN AI с поиском и фильтрами.",
};

export default function IncidentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
      <Suspense
        fallback={
          <div className="flex h-[50vh] items-center justify-center text-fg-mute">
            <Loader2 className="spinner" />
          </div>
        }
      >
        <IncidentsClient />
      </Suspense>
    </div>
  );
}

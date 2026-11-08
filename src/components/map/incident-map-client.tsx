"use client";

import dynamic from "next/dynamic";
import type IncidentMapType from "./incident-map";

/** Leaflet несовместим с SSR — грузим карту только на клиенте. */
const IncidentMap = dynamic(() => import("./incident-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#dfe6ef]">
      <div className="flex items-center gap-3 text-sm text-fg-mute">
        <span className="spinner inline-block h-4 w-4 rounded-full border-2 border-accent border-t-transparent" />
        Загрузка карты…
      </div>
    </div>
  ),
});

export default IncidentMap;
export { IncidentMap };
export type { IncidentMapType };

"use client";

import dynamic from "next/dynamic";

/** Leaflet требует браузер — грузим пикер только на клиенте. */
const MapPicker = dynamic(() => import("./map-picker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl bg-[#e4eaf2] text-sm text-fg-mute sm:h-[340px]">
      <span className="spinner mr-3 inline-block h-4 w-4 rounded-full border-2 border-accent border-t-transparent" />
      Загрузка карты…
    </div>
  ),
});

export default MapPicker;

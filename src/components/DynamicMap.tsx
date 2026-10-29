
"use client";

import dynamic from "next/dynamic";
import type { BoundingBox } from "@/types/map";

interface DynamicMapProps {
    onAOIChange?: (aoi: BoundingBox | null) => void;
    onPlaceNameChange?: (name: string | null) => void;
}

const MapView = dynamic(
    () => import("./MapView"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900 text-slate-400">
                Loading map...
            </div>
        ),
    }
);

export default function DynamicMap({
    onAOIChange,
    onPlaceNameChange,
}: DynamicMapProps) {
    return (
        <div className="h-full w-full">
            <MapView
                onAOIChange={onAOIChange}
                onPlaceNameChange={onPlaceNameChange}
            />
        </div>
    );
}

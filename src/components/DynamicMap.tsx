"use client";

import dynamic from "next/dynamic";
import type { BoundingBox } from "@/types/map";

interface DynamicMapProps {
    onAOIChange?: (aoi: BoundingBox | null) => void;
}

const MapView = dynamic(
    () => import("./MapView"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

                    <p className="text-sm font-medium text-white">
                        Loading Satellite Map
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Fetching satellite imagery...
                    </p>
                </div>
            </div>
        ),
    }
);

export default function DynamicMap({
    onAOIChange,
}: DynamicMapProps) {
    return (
        <div className="h-full w-full">
            <MapView onAOIChange={onAOIChange} />
        </div>
    );
}
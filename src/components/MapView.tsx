"use client";

import { useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    ZoomControl,
    Rectangle,
    useMap,
    useMapEvents,
} from "react-leaflet";
import type { LatLng, LeafletMouseEvent } from "leaflet";
import type { BoundingBox } from "@/types/map";

const SATELLITE_TILE_URL =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const INDIA_CENTER: [number, number] = [22.9734, 78.6569];

interface MapViewProps {
    onAOIChange?: (aoi: BoundingBox | null) => void;
}

interface DrawControllerProps {
    enabled: boolean;
    onComplete: (aoi: BoundingBox) => void;
}

function MapResizeHandler() {
    const map = useMap();

    useEffect(() => {
        const resize = () => map.invalidateSize();

        resize();

        const timer = window.setTimeout(resize, 150);

        window.addEventListener("resize", resize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", resize);
        };
    }, [map]);

    return null;
}

function DrawController({
    enabled,
    onComplete,
}: DrawControllerProps) {
    const startPoint = useRef<LatLng | null>(null);
    const [bounds, setBounds] = useState<
        [[number, number], [number, number]] | null
    >(null);

    useMapEvents({
        mousedown(event: LeafletMouseEvent) {
            if (!enabled) return;

            startPoint.current = event.latlng;
        },

        mousemove(event: LeafletMouseEvent) {
            if (!enabled || !startPoint.current) return;

            const start = startPoint.current;
            const current = event.latlng;

            setBounds([
                [start.lat, start.lng],
                [current.lat, current.lng],
            ]);
        },

        mouseup(event: LeafletMouseEvent) {
            if (!enabled || !startPoint.current) return;

            const start = startPoint.current;
            const end = event.latlng;

            const west = Math.min(start.lng, end.lng);
            const east = Math.max(start.lng, end.lng);
            const south = Math.min(start.lat, end.lat);
            const north = Math.max(start.lat, end.lat);

            if (
                Math.abs(east - west) < 0.001 ||
                Math.abs(north - south) < 0.001
            ) {
                startPoint.current = null;
                setBounds(null);
                return;
            }

            const aoi: BoundingBox = {
                west: Number(west.toFixed(6)),
                south: Number(south.toFixed(6)),
                east: Number(east.toFixed(6)),
                north: Number(north.toFixed(6)),
            };

            onComplete(aoi);

            startPoint.current = null;
        },
    });

    return bounds ? <Rectangle bounds={bounds} /> : null;
}

export default function MapView({
    onAOIChange,
}: MapViewProps) {
    const [drawing, setDrawing] = useState(false);
    const [aoi, setAOI] = useState<BoundingBox | null>(null);

    const handleAOIComplete = (nextAOI: BoundingBox) => {
        setAOI(nextAOI);
        setDrawing(false);
        onAOIChange?.(nextAOI);
    };

    const clearAOI = () => {
        setAOI(null);
        setDrawing(false);
        onAOIChange?.(null);
    };

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={INDIA_CENTER}
                zoom={5}
                minZoom={3}
                maxZoom={18}
                scrollWheelZoom={!drawing}
                zoomControl={false}
                style={{
                    width: "100%",
                    height: "100%",
                }}
            >
                <MapResizeHandler />

                <ZoomControl position="topright" />

                <TileLayer
                    url={SATELLITE_TILE_URL}
                    attribution="Tiles © Esri"
                    maxZoom={18}
                    maxNativeZoom={18}
                />

                <DrawController
                    enabled={drawing}
                    onComplete={handleAOIComplete}
                />

                {aoi && !drawing && (
                    <Rectangle
                        bounds={[
                            [aoi.south, aoi.west],
                            [aoi.north, aoi.east],
                        ]}
                    />
                )}
            </MapContainer>

            <div className="absolute left-4 top-4 z-[1000] flex gap-2">
                <button
                    type="button"
                    onClick={() => setDrawing((value) => !value)}
                    className="rounded-lg bg-slate-950/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition hover:bg-slate-800"
                >
                    {drawing ? "Drawing..." : "Draw AOI"}
                </button>

                {aoi && (
                    <button
                        type="button"
                        onClick={clearAOI}
                        className="rounded-lg bg-red-950/90 px-4 py-2 text-sm font-medium text-red-200 shadow-lg backdrop-blur transition hover:bg-red-900"
                    >
                        Clear
                    </button>
                )}
            </div>

            {drawing && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-slate-950/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
                    Click and drag to select an analysis area
                </div>
            )}
        </div>
    );
}
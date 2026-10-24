
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

const LABELS_TILE_URL =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

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

            startPoint.current = null;
            setBounds(null);

            if (
                Math.abs(east - west) < 0.001 ||
                Math.abs(north - south) < 0.001
            ) {
                return;
            }

            onComplete({
                west: Number(west.toFixed(6)),
                south: Number(south.toFixed(6)),
                east: Number(east.toFixed(6)),
                north: Number(north.toFixed(6)),
            });
        },
    });

    return bounds ? <Rectangle bounds={bounds} /> : null;
}

function CoordinateNavigator() {
    const map = useMap();
    const [coordinates, setCoordinates] = useState("");
    const [error, setError] = useState("");

    function goToCoordinates(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const parts = coordinates.split(",").map((part) => part.trim());
        const lat = Number(parts[0]);
        const lng = Number(parts[1]);

        if (
            parts.length !== 2 ||
            parts[0] === "" ||
            parts[1] === "" ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            setError("Enter coordinates as latitude, longitude.");
            return;
        }

        setError("");
        map.flyTo([lat, lng], 11, { duration: 1.2 });
    }

    return (
        <form
            onSubmit={goToCoordinates}
            className="absolute left-4 top-[4.25rem] z-[1000] w-[min(320px,calc(100%-2rem))] rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl backdrop-blur"
        >
            <label
                htmlFor="map-coordinates"
                className="mb-2 block text-xs font-medium text-slate-300"
            >
                Go to coordinates
            </label>

            <div className="flex gap-2">
                <input
                    id="map-coordinates"
                    value={coordinates}
                    onChange={(event) => setCoordinates(event.target.value)}
                    placeholder="27.7172, 85.3240"
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                    aria-describedby="coordinate-help"
                />

                <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                    Go
                </button>
            </div>

            <p id="coordinate-help" className="mt-2 text-xs text-slate-400">
                Example: Kathmandu, Nepal
            </p>

            {error && (
                <p role="alert" className="mt-2 text-xs text-red-300">
                    {error}
                </p>
            )}
        </form>
    );
}

export default function MapView({ onAOIChange }: MapViewProps) {
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
                style={{ width: "100%", height: "100%" }}
            >
                <MapResizeHandler />
                <ZoomControl position="topright" />

                <TileLayer
                    url={SATELLITE_TILE_URL}
                    attribution="Imagery © Esri and its imagery providers"
                    maxZoom={18}
                    maxNativeZoom={18}
                />

                <TileLayer
                    url={LABELS_TILE_URL}
                    attribution="Labels © Esri"
                    maxZoom={18}
                    maxNativeZoom={18}
                    opacity={1}
                />

                <CoordinateNavigator />

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
                        pathOptions={{
                            color: "#38bdf8",
                            weight: 2,
                            fillColor: "#38bdf8",
                            fillOpacity: 0.15,
                        }}
                    />
                )}
            </MapContainer>

            <div className="absolute left-4 top-4 z-[1000] flex gap-2">
                <button
                    type="button"
                    onClick={() => setDrawing((value) => !value)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition ${drawing
                            ? "bg-blue-600 hover:bg-blue-500"
                            : "bg-slate-950/90 hover:bg-slate-800"
                        }`}
                >
                    {drawing ? "Cancel drawing" : "Draw AOI"}
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
                <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-slate-950/90 px-4 py-2 text-center text-sm text-white shadow-lg backdrop-blur">
                    Click and drag to select an analysis area
                </div>
            )}
        </div>
    );
}

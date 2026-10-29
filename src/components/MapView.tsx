
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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

const TULAS_INSTITUTE: PlaceResult = {
    place_id: -1,
    display_name:
        "Tula's Institute, Dhoolkot, Selaqui, Dehradun, Uttarakhand, India",
    lat: "30.34214",
    lon: "77.88561",
    type: "college",
};

interface MapViewProps {
    onAOIChange?: (aoi: BoundingBox | null) => void;
    onPlaceNameChange?: (name: string | null) => void;
}

interface DrawControllerProps {
    enabled: boolean;
    onComplete: (aoi: BoundingBox) => void;
}

interface PlaceResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
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

interface PlaceSearchProps {
    onPlaceNameChange?: (name: string | null) => void;
}

function PlaceSearch({ onPlaceNameChange }: PlaceSearchProps) {
    const map = useMap();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlaceResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showResults, setShowResults] = useState(false);

    const requestId = useRef(0);
    const abortController = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => abortController.current?.abort();
    }, []);

    async function searchPlace(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const place = query.trim();

        if (!place) {
            setError("Enter a place name to search.");
            setResults([]);
            setShowResults(false);
            return;
        }

        const currentRequest = ++requestId.current;
        abortController.current?.abort();

        const controller = new AbortController();
        abortController.current = controller;

        setLoading(false);
        setError("");
        setResults([]);
        setShowResults(false);

        // Do not keep a previously selected name for a new search.
        onPlaceNameChange?.(null);

        const isTulasSearch =
            /tula'?s?\s*institute/i.test(place) ||
            /\btulas\b/i.test(place);

        if (isTulasSearch) {
            setResults([{ ...TULAS_INSTITUTE }]);
            setShowResults(true);
            return;
        }

        setLoading(true);

        const parts = place
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);

        const candidates = [
            place,
            ...(parts.length >= 3
                ? [`${parts.slice(0, 2).join(", ")}, India`]
                : []),
            ...(parts.length >= 2
                ? [`${parts[0]}, ${parts[1]}, India`]
                : [`${place}, India`]),
        ].filter((value, index, all) => all.indexOf(value) === index);

        try {
            let matches: PlaceResult[] = [];

            for (let i = 0; i < candidates.length; i++) {
                if (
                    controller.signal.aborted ||
                    currentRequest !== requestId.current
                ) {
                    return;
                }

                if (i > 0) {
                    await new Promise<void>((resolve) => {
                        window.setTimeout(resolve, 1100);
                    });
                }

                if (
                    controller.signal.aborted ||
                    currentRequest !== requestId.current
                ) {
                    return;
                }

                const params = new URLSearchParams({
                    format: "jsonv2",
                    q: candidates[i],
                    countrycodes: "in",
                    "accept-language": "en",
                    limit: "5",
                });

                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(
                        "Location search is temporarily unavailable. Please try again."
                    );
                }

                matches = (await response.json()) as PlaceResult[];

                if (matches.length > 0) break;
            }

            if (
                controller.signal.aborted ||
                currentRequest !== requestId.current
            ) {
                return;
            }

            if (matches.length === 0) {
                setError(
                    `No match found for "${place}". Try adding the city or state.`
                );
                return;
            }

            setResults(matches);
            setShowResults(true);
        } catch (err) {
            if (controller.signal.aborted) return;
            if (currentRequest !== requestId.current) return;

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to search for this location."
            );
        } finally {
            if (currentRequest === requestId.current) {
                setLoading(false);
            }
        }
    }

    function selectPlace(place: PlaceResult) {
        const lat = Number(place.lat);
        const lon = Number(place.lon);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 ||
            lat > 90 ||
            lon < -180 ||
            lon > 180
        ) {
            setError("The selected location has invalid coordinates.");
            return;
        }

        map.flyTo([lat, lon], 16, { duration: 1.5 });

        setQuery(place.display_name);
        setResults([]);
        setShowResults(false);
        setError("");

        // Pass the actual selected search result to the parent.
        onPlaceNameChange?.(place.display_name);
    }

    return (
        <div className="absolute left-4 top-[4.25rem] z-[1000] w-[min(340px,calc(100%-2rem))] rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl backdrop-blur">
            <form onSubmit={searchPlace}>
                <label
                    htmlFor="map-place-search"
                    className="mb-2 block text-xs font-medium text-slate-300"
                >
                    Search an area
                </label>

                <div className="flex gap-2">
                    <input
                        id="map-place-search"
                        type="text"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setError("");
                            setResults([]);
                            setShowResults(false);
                            onPlaceNameChange?.(null);
                        }}
                        placeholder="e.g. Tulas Institute, Dehradun"
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                        aria-label="Search for a place"
                        aria-describedby="place-search-help"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
            </form>

            <p
                id="place-search-help"
                className="mt-2 text-xs text-slate-400"
            >
                Search for a place, landmark, city, or institution.
            </p>

            {loading && (
                <p role="status" className="mt-2 text-xs text-blue-300">
                    Finding locations...
                </p>
            )}

            {error && (
                <p role="alert" className="mt-2 text-xs text-red-300">
                    {error}
                </p>
            )}

            {showResults && results.length > 0 && (
                <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900">
                    <p className="px-3 py-2 text-xs font-medium text-slate-400">
                        Select the correct location
                    </p>

                    {results.map((place) => (
                        <button
                            key={place.place_id}
                            type="button"
                            onClick={() => selectPlace(place)}
                            className="flex w-full items-start gap-2 border-t border-slate-800 px-3 py-2.5 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                        >
                            <span className="mt-0.5 shrink-0 text-blue-400">
                                📍
                            </span>
                            <span className="min-w-0 break-words">
                                {place.display_name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function MapView({
    onAOIChange,
    onPlaceNameChange,
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

                <PlaceSearch onPlaceNameChange={onPlaceNameChange} />

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

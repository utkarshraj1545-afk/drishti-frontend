"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import type { BoundingBox } from "@/types/map";
import {
    analyzeArea,
    type AnalysisRequest,
    type AnalysisResponse,
} from "@/lib/api";

interface AnalysisFormProps {
    onResult: (
        result: AnalysisResponse,
        request: AnalysisRequest,
    ) => void;
    aoi: BoundingBox | null;
}

interface FormData {
    west: string;
    south: string;
    east: string;
    north: string;
    beforeStart: string;
    beforeEnd: string;
    afterStart: string;
    afterEnd: string;
    language: "en" | "hi";
}

const INITIAL_FORM: FormData = {
    west: "",
    south: "",
    east: "",
    north: "",
    beforeStart: "2018-01-01",
    beforeEnd: "2018-03-01",
    afterStart: "2024-01-01",
    afterEnd: "2024-03-01",
    language: "en",
};

export default function AnalysisForm({
    onResult,
    aoi,
}: AnalysisFormProps) {
    const [form, setForm] = useState<FormData>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!aoi) return;

        setForm((current) => ({
            ...current,
            west: String(aoi.west),
            south: String(aoi.south),
            east: String(aoi.east),
            north: String(aoi.north),
        }));

        setError(null);
    }, [aoi]);

    const updateField = (field: keyof FormData, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const validateCoordinates = (): string | null => {
        const west = Number(form.west);
        const south = Number(form.south);
        const east = Number(form.east);
        const north = Number(form.north);

        if (
            !form.west.trim() ||
            !form.south.trim() ||
            !form.east.trim() ||
            !form.north.trim() ||
            !Number.isFinite(west) ||
            !Number.isFinite(south) ||
            !Number.isFinite(east) ||
            !Number.isFinite(north)
        ) {
            return "Please select an area on the map or enter valid coordinates.";
        }

        if (west < -180 || west > 180) {
            return "West longitude must be between -180 and 180.";
        }

        if (east < -180 || east > 180) {
            return "East longitude must be between -180 and 180.";
        }

        if (south < -90 || south > 90) {
            return "South latitude must be between -90 and 90.";
        }

        if (north < -90 || north > 90) {
            return "North latitude must be between -90 and 90.";
        }

        if (west >= east) {
            return "West longitude must be less than East longitude.";
        }

        if (south >= north) {
            return "South latitude must be less than North latitude.";
        }

        return null;
    };

    const validateDates = (): string | null => {
        if (
            !form.beforeStart ||
            !form.beforeEnd ||
            !form.afterStart ||
            !form.afterEnd
        ) {
            return "All analysis dates are required.";
        }

        if (form.beforeStart >= form.beforeEnd) {
            return "Before-start date must be earlier than before-end date.";
        }

        if (form.afterStart >= form.afterEnd) {
            return "After-start date must be earlier than after-end date.";
        }

        return null;
    };

    const handleSubmit = async () => {
        if (loading) return;

        const coordinateError = validateCoordinates();
        if (coordinateError) {
            setError(coordinateError);
            return;
        }

        const dateError = validateDates();
        if (dateError) {
            setError(dateError);
            return;
        }

        const request: AnalysisRequest = {
            west: Number(form.west),
            south: Number(form.south),
            east: Number(form.east),
            north: Number(form.north),
            before_start: form.beforeStart,
            before_end: form.beforeEnd,
            after_start: form.afterStart,
            after_end: form.afterEnd,
            language: form.language,
        };

        try {
            setLoading(true);
            setError(null);

            const result = await analyzeArea(request);
            onResult(result, request);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Analysis failed. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">
                    NDVI Analysis
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Select an area and compare vegetation changes.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm text-slate-400">
                        West Longitude
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={form.west}
                        onChange={(event) => updateField("west", event.target.value)}
                        placeholder="e.g. 77.87"
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm text-slate-400">
                        South Latitude
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={form.south}
                        onChange={(event) => updateField("south", event.target.value)}
                        placeholder="e.g. 30.15"
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm text-slate-400">
                        East Longitude
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={form.east}
                        onChange={(event) => updateField("east", event.target.value)}
                        placeholder="e.g. 77.93"
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm text-slate-400">
                        North Latitude
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={form.north}
                        onChange={(event) => updateField("north", event.target.value)}
                        placeholder="e.g. 30.21"
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <p className="mb-2 text-sm font-medium text-slate-300">
                        Before Period
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            aria-label="Before period start"
                            type="date"
                            value={form.beforeStart}
                            onChange={(event) =>
                                updateField("beforeStart", event.target.value)
                            }
                            className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            aria-label="Before period end"
                            type="date"
                            value={form.beforeEnd}
                            onChange={(event) =>
                                updateField("beforeEnd", event.target.value)
                            }
                            className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-sm font-medium text-slate-300">
                        After Period
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            aria-label="After period start"
                            type="date"
                            value={form.afterStart}
                            onChange={(event) =>
                                updateField("afterStart", event.target.value)
                            }
                            className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            aria-label="After period end"
                            type="date"
                            value={form.afterEnd}
                            onChange={(event) =>
                                updateField("afterEnd", event.target.value)
                            }
                            className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm text-slate-400">
                        Report Language
                    </label>
                    <select
                        value={form.language}
                        onChange={(event) =>
                            updateField("language", event.target.value as "en" | "hi")
                        }
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="en">English</option>
                        <option value="hi">हिंदी</option>
                    </select>
                </div>

                {aoi && (
                    <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-3 text-sm text-blue-300">
                        <p className="font-medium">AOI selected</p>
                        <p className="mt-1 text-xs text-blue-400">
                            Coordinates were populated from the satellite map.
                        </p>
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950 p-3 text-sm text-red-300"
                    >
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        "Analyze Area"
                    )}
                </button>
            </div>
        </div>
    );
}
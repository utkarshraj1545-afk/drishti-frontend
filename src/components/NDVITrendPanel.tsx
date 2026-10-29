
"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    BarChart3,
    Loader2,
    RefreshCw,
    Satellite,
} from "lucide-react";

import {
    analyzeTrend,
    type NDVITrendObservation,
    type NDVITrendResponse,
    type TrendInterval,
} from "@/lib/api";
import type { BoundingBox } from "@/types/map";

interface NDVITrendPanelProps {
    aoi: BoundingBox | null;
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 300;
const PAD_LEFT = 54;
const PAD_RIGHT = 20;
const PAD_TOP = 24;
const PAD_BOTTOM = 48;

function formatNDVI(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value)
        ? value.toFixed(3)
        : "N/A";
}

function formatPeriod(
    observation: NDVITrendObservation,
    interval: TrendInterval
) {
    const parsed = new Date(`${observation.period_start}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return observation.period_start;
    }

    return interval === "yearly"
        ? String(parsed.getFullYear())
        : parsed.toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
        });
}

function TrendChart({
    observations,
    interval,
}: {
    observations: NDVITrendObservation[];
    interval: TrendInterval;
}) {
    const valid = observations
        .map((item, index) => ({
            index,
            value: item.mean_ndvi,
        }))
        .filter(
            (item): item is { index: number; value: number } =>
                typeof item.value === "number" &&
                Number.isFinite(item.value)
        );

    if (valid.length === 0) {
        return (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center">
                <div>
                    <BarChart3 className="mx-auto h-8 w-8 text-slate-600" />
                    <p className="mt-3 font-medium text-slate-300">
                        No usable NDVI observations
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        Try another date range or a different area.
                    </p>
                </div>
            </div>
        );
    }

    const values = valid.map((item) => item.value);
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(1, ...values);
    const range = maxValue - minValue || 1;

    const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const x = (index: number) =>
        PAD_LEFT +
        (observations.length <= 1
            ? plotWidth / 2
            : (index / (observations.length - 1)) * plotWidth);

    const y = (value: number) =>
        PAD_TOP + ((maxValue - value) / range) * plotHeight;

    // Split the line at missing values so null observations are never
    // displayed as zero or connected across missing periods.
    const segments: { x: number; y: number }[][] = [];
    let currentSegment: { x: number; y: number }[] = [];

    observations.forEach((observation, index) => {
        const value = observation.mean_ndvi;

        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            currentSegment.push({ x: x(index), y: y(value) });
        } else {
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
        }
    });

    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    const yTicks = Array.from(
        { length: 5 },
        (_, index) => maxValue - (index / 4) * range
    );

    const labelIndexes = Array.from(
        new Set(
            [
                0,
                Math.floor((observations.length - 1) / 3),
                Math.floor(((observations.length - 1) * 2) / 3),
                observations.length - 1,
            ].filter((index) => index >= 0)
        )
    );

    return (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2 sm:p-4">
            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                role="img"
                aria-label="Historical mean NDVI line chart"
                className="block w-full min-w-[520px]"
            >
                {yTicks.map((tick, index) => (
                    <g key={`tick-${index}`}>
                        <line
                            x1={PAD_LEFT}
                            x2={CHART_WIDTH - PAD_RIGHT}
                            y1={y(tick)}
                            y2={y(tick)}
                            stroke="#334155"
                            strokeDasharray="4 5"
                        />
                        <text
                            x={PAD_LEFT - 10}
                            y={y(tick) + 4}
                            fill="#94a3b8"
                            fontSize="11"
                            textAnchor="end"
                        >
                            {tick.toFixed(2)}
                        </text>
                    </g>
                ))}

                <line
                    x1={PAD_LEFT}
                    x2={PAD_LEFT}
                    y1={PAD_TOP}
                    y2={CHART_HEIGHT - PAD_BOTTOM}
                    stroke="#475569"
                />

                <line
                    x1={PAD_LEFT}
                    x2={CHART_WIDTH - PAD_RIGHT}
                    y1={CHART_HEIGHT - PAD_BOTTOM}
                    y2={CHART_HEIGHT - PAD_BOTTOM}
                    stroke="#475569"
                />

                {segments.map((segment, segmentIndex) => (
                    <g key={`segment-${segmentIndex}`}>
                        {segment.length > 1 && (
                            <polyline
                                points={segment
                                    .map((point) => `${point.x},${point.y}`)
                                    .join(" ")}
                                fill="none"
                                stroke="#34d399"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}

                        {segment.map((point, pointIndex) => (
                            <circle
                                key={`${segmentIndex}-${pointIndex}`}
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#34d399"
                                stroke="#052e25"
                                strokeWidth="2"
                            />
                        ))}
                    </g>
                ))}

                {labelIndexes.map((index) => (
                    <text
                        key={`label-${index}`}
                        x={x(index)}
                        y={CHART_HEIGHT - 18}
                        fill="#94a3b8"
                        fontSize="11"
                        textAnchor="middle"
                    >
                        {formatPeriod(observations[index], interval)}
                    </text>
                ))}
            </svg>

            <div className="flex items-center gap-2 px-3 pb-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Mean NDVI
                <span className="ml-auto">
                    {valid.length} of {observations.length} periods available
                </span>
            </div>
        </div>
    );
}

export default function NDVITrendPanel({
    aoi,
}: NDVITrendPanelProps) {
    const [startDate, setStartDate] = useState("2020-01-01");
    const [endDate, setEndDate] = useState("2025-12-31");
    const [interval, setInterval] =
        useState<TrendInterval>("yearly");
    const [data, setData] = useState<NDVITrendResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validObservationCount = useMemo(
        () =>
            data?.observations.filter(
                (item) =>
                    typeof item.mean_ndvi === "number" &&
                    Number.isFinite(item.mean_ndvi)
            ).length ?? 0,
        [data]
    );

    useEffect(() => {
        setData(null);
        setError(null);
    }, [aoi]);

    const runTrend = async () => {
        if (loading) return;

        if (!aoi) {
            setError("Select an area on the satellite map first.");
            return;
        }

        if (!startDate || !endDate || startDate > endDate) {
            setError("Choose a valid date range.");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await analyzeTrend({
                west: aoi.west,
                south: aoi.south,
                east: aoi.east,
                north: aoi.north,
                start_date: startDate,
                end_date: endDate,
                interval,
                max_cloud_pct: 80,
            });

            setData(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Historical NDVI analysis failed."
            );
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const validMeans =
        data?.observations
            .map((item) => item.mean_ndvi)
            .filter(
                (value): value is number =>
                    typeof value === "number" &&
                    Number.isFinite(value)
            ) ?? [];

    const averageNDVI =
        validMeans.length > 0
            ? validMeans.reduce((sum, value) => sum + value, 0) /
            validMeans.length
            : null;

    const averageCoverageValues =
        data?.observations
            .map((item) => item.coverage_percent)
            .filter(
                (value): value is number =>
                    typeof value === "number" &&
                    Number.isFinite(value)
            ) ?? [];

    const averageCoverage =
        averageCoverageValues.length > 0
            ? averageCoverageValues.reduce(
                (sum, value) => sum + value,
                0
            ) / averageCoverageValues.length
            : null;

    const totalScenes =
        data?.observations.reduce(
            (sum, item) => sum + (item.scene_count || 0),
            0
        ) ?? 0;

    return (
        <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                    <BarChart3 className="h-6 w-6 text-emerald-400" />
                </div>

                <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                        Historical Satellite Analysis
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                        Vegetation Trends Over Time
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        Explore mean NDVI from Sentinel-2 imagery for
                        the selected area. Missing observations remain
                        gaps rather than being treated as zero.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <label
                        htmlFor="trend-start-date"
                        className="mb-2 block text-sm text-slate-400"
                    >
                        Start date
                    </label>
                    <input
                        id="trend-start-date"
                        type="date"
                        value={startDate}
                        max={endDate}
                        onChange={(event) =>
                            setStartDate(event.target.value)
                        }
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="trend-end-date"
                        className="mb-2 block text-sm text-slate-400"
                    >
                        End date
                    </label>
                    <input
                        id="trend-end-date"
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(event) =>
                            setEndDate(event.target.value)
                        }
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="trend-interval"
                        className="mb-2 block text-sm text-slate-400"
                    >
                        Time interval
                    </label>
                    <select
                        id="trend-interval"
                        value={interval}
                        onChange={(event) =>
                            setInterval(
                                event.target.value as TrendInterval
                            )
                        }
                        className="w-full rounded-xl bg-slate-800 p-3 text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={runTrend}
                        disabled={loading || !aoi}
                        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : data ? (
                            <RefreshCw className="h-4 w-4" />
                        ) : (
                            <Satellite className="h-4 w-4" />
                        )}
                        {loading ? "Analyzing..." : "Load Trend"}
                    </button>
                </div>
            </div>

            {!aoi && (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
                    Select an area on the map to run historical analysis.
                </p>
            )}

            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
                >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loading && (
                <div
                    role="status"
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-300"
                >
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                    Processing satellite observations. Monthly analysis
                    may take longer than yearly analysis.
                </div>
            )}

            {data && !loading && (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-500">
                                Valid observations
                            </p>
                            <p className="mt-2 text-2xl font-bold text-white">
                                {validObservationCount}
                                <span className="ml-1 text-sm font-normal text-slate-500">
                                    / {data.observations.length}
                                </span>
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-500">
                                Average NDVI
                            </p>
                            <p className="mt-2 text-2xl font-bold text-emerald-300">
                                {formatNDVI(averageNDVI)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-500">
                                Satellite scenes
                            </p>
                            <p className="mt-2 text-2xl font-bold text-white">
                                {totalScenes.toLocaleString("en-IN")}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-500">
                                Average valid coverage
                            </p>
                            <p className="mt-2 text-2xl font-bold text-white">
                                {averageCoverage === null
                                    ? "N/A"
                                    : `${averageCoverage.toFixed(1)}%`}
                            </p>
                        </div>
                    </div>

                    <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold text-white">
                                Mean NDVI by {interval === "yearly" ? "year" : "month"}
                            </h3>
                            <span className="text-xs text-slate-500">
                                {data.start_date} — {data.end_date}
                            </span>
                        </div>

                        <TrendChart
                            observations={data.observations}
                            interval={interval}
                        />
                    </div>

                    {data.observations.some(
                        (item) =>
                            item.coverage_warning ||
                            (typeof item.coverage_percent === "number" &&
                                item.coverage_percent <
                                data.coverage_warning_threshold)
                    ) && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                <p className="font-medium text-amber-200">
                                    Data coverage warning
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-300">
                                    Some periods have low valid-pixel coverage
                                    or backend warnings. Interpret those
                                    observations cautiously.
                                </p>
                            </div>
                        )}

                    <p className="text-xs leading-5 text-slate-500">
                        NDVI measures vegetation greenness, not biodiversity
                        directly. Seasonal variation, cloud masking, and
                        image availability may affect the trend. A missing
                        observation does not mean NDVI was zero.
                    </p>
                </>
            )}
        </section>
    );
}


"use client";

import { useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    Leaf,
    Loader2,
    Minus,
    TrendingDown,
    TrendingUp,
    Waves,
} from "lucide-react";

import {
    downloadPdf,
    type AnalysisRequest,
    type AnalysisResponse,
} from "@/lib/api";

interface ResultsPanelProps {
    result: AnalysisResponse | null;
    analysisRequest: AnalysisRequest | null;
}

function formatNdvi(value: number | null | undefined): string {
    return typeof value === "number" && Number.isFinite(value)
        ? value.toFixed(4)
        : "N/A";
}

function formatChange(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "N/A";
    }

    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatWaterArea(value: number | null | undefined): string {
    return typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
        ? `${value.toFixed(3)} km²`
        : "N/A";
}

function formatWaterPercentage(
    value: number | null | undefined
): string {
    return typeof value === "number" && Number.isFinite(value)
        ? `${value.toFixed(2)}%`
        : "N/A";
}

function formatCount(value: number | undefined): string {
    return typeof value === "number" && Number.isFinite(value)
        ? value.toLocaleString("en-IN")
        : "N/A";
}

function getClassificationMeta(classification: string) {
    const normalized = classification.toLowerCase();

    if (
        normalized.includes("provisional") ||
        normalized.includes("low valid-pixel coverage")
    ) {
        return {
            icon: AlertTriangle,
            label: "Provisional Result",
            iconClass: "text-amber-400",
            badgeClass:
                "border-amber-500/20 bg-amber-500/10 text-amber-300",
        };
    }

    if (
        normalized.includes("gain") ||
        normalized.includes("increase")
    ) {
        return {
            icon: TrendingUp,
            label: "Vegetation Gain",
            iconClass: "text-emerald-400",
            badgeClass:
                "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        };
    }

    if (
        normalized.includes("loss") ||
        normalized.includes("decrease")
    ) {
        return {
            icon: TrendingDown,
            label: "Vegetation Loss",
            iconClass: "text-red-400",
            badgeClass:
                "border-red-500/20 bg-red-500/10 text-red-300",
        };
    }

    if (
        normalized.includes("stable") ||
        normalized.includes("no significant change")
    ) {
        return {
            icon: Minus,
            label: "No Significant Change",
            iconClass: "text-sky-400",
            badgeClass:
                "border-sky-500/20 bg-sky-500/10 text-sky-300",
        };
    }

    return {
        icon: Minus,
        label: classification || "Unclassified",
        iconClass: "text-sky-400",
        badgeClass:
            "border-sky-500/20 bg-sky-500/10 text-sky-300",
    };
}

function CoverageCard({
    label,
    period,
    threshold,
}: {
    label: string;
    period: AnalysisResponse["before"];
    threshold: number;
}) {
    const rawCoverage = period.coverage_percent;

    const coverage =
        typeof rawCoverage === "number" &&
            Number.isFinite(rawCoverage) &&
            rawCoverage >= 0 &&
            rawCoverage <= 100
            ? rawCoverage
            : null;

    const lowCoverage =
        coverage !== null && coverage < threshold;

    const validPixels = period.valid_pixel_count;
    const totalPixels = period.total_pixel_count;

    const hasPixelCounts =
        typeof validPixels === "number" &&
        Number.isFinite(validPixels) &&
        typeof totalPixels === "number" &&
        Number.isFinite(totalPixels) &&
        validPixels >= 0 &&
        totalPixels > 0 &&
        validPixels <= totalPixels;

    const barColor =
        coverage === null
            ? "bg-slate-700"
            : lowCoverage
                ? "bg-amber-400"
                : "bg-emerald-400";

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-300">
                    {label}
                </p>

                <span
                    className={`text-lg font-bold tabular-nums ${coverage === null
                            ? "text-slate-400"
                            : lowCoverage
                                ? "text-amber-300"
                                : "text-emerald-300"
                        }`}
                >
                    {coverage === null
                        ? "N/A"
                        : `${coverage.toFixed(2)}%`}
                </span>
            </div>

            <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-label={`${label} valid-pixel coverage`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={coverage ?? 0}
            >
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${coverage ?? 0}%` }}
                />
            </div>

            <p className="mt-3 text-xs text-slate-400">
                {hasPixelCounts ? (
                    <>
                        {formatCount(validPixels)} valid
                        {" / "}
                        {formatCount(totalPixels)} total pixels
                    </>
                ) : (
                    "Pixel counts unavailable"
                )}
            </p>

            {lowCoverage && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />

                    <p className="text-xs leading-5 text-amber-200">
                        Low data coverage. Interpret this period&apos;s
                        NDVI cautiously.
                    </p>
                </div>
            )}

            {!lowCoverage && period.coverage_warning && (
                <p className="mt-3 text-xs leading-5 text-amber-300">
                    {period.coverage_warning}
                </p>
            )}

            {coverage === null && (
                <p className="mt-3 text-xs text-slate-500">
                    Coverage was not provided by the backend.
                </p>
            )}
        </div>
    );
}

function WaterPeriodCard({
    label,
    data,
}: {
    label: string;
    data: NonNullable<AnalysisResponse["water"]>["before"];
}) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                {formatWaterArea(data?.water_area_km2)}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                <span className="text-xs text-slate-500">
                    Water-like area
                </span>

                <span className="text-sm font-medium text-sky-300">
                    {formatWaterPercentage(data?.water_percent_valid)}
                </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
                Percentage of valid analysed area
            </p>
        </div>
    );
}

export default function ResultsPanel({
    result,
    analysisRequest,
}: ResultsPanelProps) {
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    if (!result) {
        return null;
    }

    const {
        before,
        after,
        change_percent,
        classification,
        report,
        note,
    } = result;

    const classificationMeta =
        getClassificationMeta(classification ?? "");

    const ClassificationIcon = classificationMeta.icon;

    const beforeScenes = before.scene_count ?? before.scenes;
    const afterScenes = after.scene_count ?? after.scenes;

    const thresholdValue = result.coverage_warning_threshold;

    const coverageThreshold =
        typeof thresholdValue === "number" &&
            Number.isFinite(thresholdValue) &&
            thresholdValue >= 0 &&
            thresholdValue <= 100
            ? thresholdValue
            : 70;

    const beforeCoverage = before.coverage_percent;
    const afterCoverage = after.coverage_percent;

    const hasCoverage =
        typeof beforeCoverage === "number" &&
        Number.isFinite(beforeCoverage) &&
        typeof afterCoverage === "number" &&
        Number.isFinite(afterCoverage);

    const lowCoverage =
        !hasCoverage ||
        beforeCoverage < coverageThreshold ||
        afterCoverage < coverageThreshold;

    const confidenceLabel = !hasCoverage
        ? "Unknown"
        : lowCoverage
            ? "Low confidence"
            : "Coverage acceptable";

    const confidenceDescription = !hasCoverage
        ? "Valid-pixel coverage is unavailable, so confidence cannot be assessed."
        : lowCoverage
            ? "At least one period has low valid-pixel coverage. Interpret the NDVI comparison cautiously."
            : "Both periods meet the configured coverage threshold. This does not independently confirm environmental risk.";

    const changeIsPositive =
        typeof change_percent === "number" &&
        change_percent > 0;

    const changeIsNegative =
        typeof change_percent === "number" &&
        change_percent < 0;

    const reportTitle =
        report?.report_title ?? "NDVI Change Analysis";

    const reportSummary =
        report?.simple_summary ??
        note ??
        "Review the NDVI measurements and data coverage before drawing conclusions.";

    const technicalSummary =
        report?.technical_summary ??
        "The backend returned NDVI values, percentage change, and coverage measurements. Additional technical interpretation was not included.";

    const recommendations = report?.recommendations ?? [];
    const generatedAt = report?.generated_at;

    // Keep the water section independent from the NDVI before/after
    // values. NDVI periods are not water measurements.
    const water = result.water ?? null;
    const hasWaterData = Boolean(
        water && (water.before || water.after)
    );

    const handleDownloadPdf = async () => {
        if (pdfLoading) return;

        if (!analysisRequest) {
            setPdfError(
                "The analysis request is missing. Run the analysis again and retry."
            );
            return;
        }

        let objectUrl: string | null = null;

        try {
            setPdfLoading(true);
            setPdfError(null);

            const blob = await downloadPdf(analysisRequest);

            if (blob.size === 0) {
                throw new Error("The server returned an empty file.");
            }

            if (
                blob.type &&
                !blob.type.toLowerCase().includes("application/pdf")
            ) {
                throw new Error(
                    `Expected a PDF, but received ${blob.type}.`
                );
            }

            objectUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = `drishti-ndvi-report-${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`;
            link.style.display = "none";

            document.body.appendChild(link);
            link.click();
            link.remove();

            const urlToRevoke = objectUrl;

            window.setTimeout(() => {
                URL.revokeObjectURL(urlToRevoke);
            }, 1000);
        } catch (error) {
            setPdfError(
                error instanceof Error
                    ? error.message
                    : "PDF download failed. Please try again."
            );
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <section className="space-y-6 text-white">
            {/* Results header */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <Leaf className="h-5 w-5 text-emerald-400" />
                        Analysis Results
                    </div>

                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        Vegetation Change Assessment
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        Satellite-derived NDVI comparison between the
                        selected before and after periods.
                    </p>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={pdfLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {pdfLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}

                        {pdfLoading
                            ? "Preparing PDF..."
                            : "Download PDF Report"}
                    </button>

                    {pdfError && (
                        <p
                            role="alert"
                            className="max-w-xs text-sm text-red-300 sm:text-right"
                        >
                            {pdfError}
                        </p>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-400">
                        NDVI Before
                    </p>

                    <p className="mt-3 text-3xl font-bold tracking-tight">
                        {formatNdvi(before.mean_ndvi)}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                        {formatCount(beforeScenes)} satellite scenes
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-400">
                        NDVI After
                    </p>

                    <p className="mt-3 text-3xl font-bold tracking-tight">
                        {formatNdvi(after.mean_ndvi)}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                        {formatCount(afterScenes)} satellite scenes
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-400">
                        NDVI Change
                    </p>

                    <p
                        className={`mt-3 text-3xl font-bold tracking-tight ${changeIsPositive
                                ? "text-emerald-400"
                                : changeIsNegative
                                    ? "text-red-400"
                                    : "text-white"
                            }`}
                    >
                        {formatChange(change_percent)}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                        Relative change between periods
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-400">
                        Classification
                    </p>

                    <div
                        className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${classificationMeta.badgeClass}`}
                    >
                        <ClassificationIcon
                            className={`h-4 w-4 ${classificationMeta.iconClass}`}
                        />
                        {classificationMeta.label}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                        Based on the backend&apos;s NDVI classification
                    </p>
                </div>
            </div>

            {/* Data coverage */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10 sm:p-6">
                <div className="mb-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Data Quality
                    </p>

                    <h3 className="mt-1 text-xl font-semibold text-white">
                        Valid-pixel coverage
                    </h3>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        Percentage of sampled pixels with usable NDVI after
                        masking. Low coverage means results should be
                        interpreted cautiously.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <CoverageCard
                        label="Before period"
                        period={before}
                        threshold={coverageThreshold}
                    />

                    <CoverageCard
                        label="After period"
                        period={after}
                        threshold={coverageThreshold}
                    />
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-sm font-semibold text-slate-200">
                        Data confidence: {confidenceLabel}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                        {confidenceDescription}
                    </p>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                    Warning threshold: {coverageThreshold}%. Coverage
                    measures data availability; it does not independently
                    establish analysis accuracy.
                </p>
            </section>

            {/* Estimated water extent */}
            <section
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10 sm:p-6"
                aria-labelledby="water-analysis-heading"
            >
                <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-xl bg-sky-500/10 p-3">
                        <Waves className="h-6 w-6 text-sky-400" />
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Satellite Water Analysis
                        </p>

                        <h3
                            id="water-analysis-heading"
                            className="mt-1 text-xl font-semibold text-white"
                        >
                            Estimated Water Extent
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                            Compares water-like surface area detected
                            from satellite imagery during the two
                            selected periods.
                        </p>
                    </div>
                </div>

                {hasWaterData && water ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <WaterPeriodCard
                                label="Before period"
                                data={water.before}
                            />

                            <WaterPeriodCard
                                label="After period"
                                data={water.after}
                            />
                        </div>

                        {water.note && (
                            <div className="mt-4 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />

                                <p className="text-xs leading-5 text-slate-300">
                                    {water.note}
                                </p>
                            </div>
                        )}

                        <p className="mt-3 text-xs leading-5 text-slate-500">
                            Water extent is an estimate based on the MNDWI
                            water-index threshold. Seasonal conditions,
                            shadows, and image quality can affect the result.
                            It does not independently prove flooding,
                            drought, or encroachment.
                        </p>
                    </>
                ) : (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

                            <div>
                                <p className="font-medium text-amber-200">
                                    Water data was not included in this response
                                </p>

                                <p className="mt-1 text-sm leading-6 text-slate-400">
                                    The NDVI results are available, but the
                                    analysis response did not include usable
                                    water-extent measurements for the selected
                                    periods. Check the API response before
                                    interpreting water conditions.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Report summary */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-500/10 p-3">
                        <Leaf className="h-6 w-6 text-emerald-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Analysis Report
                        </p>

                        <h3 className="mt-1 text-xl font-semibold text-white">
                            {reportTitle}
                        </h3>

                        <p className="mt-3 text-sm leading-7 text-slate-300">
                            {reportSummary}
                        </p>

                        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <p className="text-sm font-semibold text-slate-200">
                                Technical Summary
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                {technicalSummary}
                            </p>
                        </div>

                        {generatedAt && (
                            <p className="mt-4 text-xs text-slate-500">
                                Report generated: {generatedAt}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Recommendations */}
            {recommendations.length > 0 && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
                    <h3 className="text-xl font-semibold text-white">
                        Recommendations
                    </h3>

                    <ul className="mt-4 space-y-3">
                        {recommendations.map((recommendation, index) => (
                            <li
                                key={`${index}-${recommendation}`}
                                className="flex items-start gap-3 text-sm leading-6 text-slate-300"
                            >
                                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
                                <span>{recommendation}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Interpretation disclaimer */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

                    <div>
                        <p className="text-sm font-semibold text-slate-200">
                            Important interpretation note
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            NDVI change alone does not confirm flooding,
                            vegetation damage, or whether an area is safe.
                            Seasonal variation, cloud masking, and image
                            availability may affect the comparison. Use
                            independent evidence for environmental risk
                            decisions.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

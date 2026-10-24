
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

    const hasCoverage =
        typeof rawCoverage === "number" &&
        Number.isFinite(rawCoverage) &&
        rawCoverage >= 0 &&
        rawCoverage <= 100;

    const coverage = hasCoverage ? rawCoverage : null;
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
                        {formatCount(validPixels)} valid /{" "}
                        {formatCount(totalPixels)} total pixels
                    </>
                ) : (
                    "Pixel counts unavailable"
                )}
            </p>

            {/* Show only one warning when coverage is low. */}
            {lowCoverage && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />

                    <p className="text-xs leading-5 text-amber-200">
                        Low data coverage. Interpret this period&apos;s
                        NDVI cautiously.
                    </p>
                </div>
            )}

            {/* Show the backend's warning only if the standard
                low-coverage warning is not already being displayed. */}
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

    const classificationMeta =
        getClassificationMeta(classification ?? "");

    const ClassificationIcon = classificationMeta.icon;

    const changeIsPositive =
        typeof change_percent === "number" &&
        change_percent > 0;

    const changeIsNegative =
        typeof change_percent === "number" &&
        change_percent < 0;

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
            {/* Header */}
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

                <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {pdfLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    {pdfLoading ? "Generating PDF..." : "Download PDF"}
                </button>
            </div>

            {pdfError && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
                >
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <div>
                        <p className="font-semibold">
                            PDF download failed
                        </p>
                        <p className="mt-1 leading-5">{pdfError}</p>
                    </div>
                </div>
            )}


            {/* Status badge — keep a single classification warning */}
            <div className="flex flex-wrap items-center gap-3">
                <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${classificationMeta.badgeClass}`}
                >
                    <ClassificationIcon
                        className={`h-4 w-4 ${classificationMeta.iconClass}`}
                    />
                    {classificationMeta.label}
                </span>
            </div>


            {/* Metric cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Before NDVI
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-3xl font-bold tracking-tight text-white">
                            {formatNdvi(before.mean_ndvi)}
                        </p>
                        <div className="rounded-xl bg-slate-800 p-2.5">
                            <Leaf className="h-5 w-5 text-emerald-400" />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        {beforeScenes ?? "N/A"} satellite scenes
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        After NDVI
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-3xl font-bold tracking-tight text-white">
                            {formatNdvi(after.mean_ndvi)}
                        </p>
                        <div className="rounded-xl bg-slate-800 p-2.5">
                            <Leaf className="h-5 w-5 text-sky-400" />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        {afterScenes ?? "N/A"} satellite scenes
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        NDVI Change
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p
                            className={`text-3xl font-bold tracking-tight ${changeIsNegative
                                ? "text-red-400"
                                : changeIsPositive
                                    ? "text-emerald-400"
                                    : "text-white"
                                }`}
                        >
                            {formatChange(change_percent)}
                        </p>
                        <div className="rounded-xl bg-slate-800 p-2.5">
                            {changeIsNegative ? (
                                <TrendingDown className="h-5 w-5 text-red-400" />
                            ) : changeIsPositive ? (
                                <TrendingUp className="h-5 w-5 text-emerald-400" />
                            ) : (
                                <Minus className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Relative vegetation change
                    </p>
                </div>

                {/* Data confidence, not environmental risk */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Assessment Confidence
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p
                            className={`text-xl font-bold tracking-tight ${!hasCoverage
                                ? "text-slate-300"
                                : lowCoverage
                                    ? "text-amber-300"
                                    : "text-emerald-300"
                                }`}
                        >
                            {confidenceLabel}
                        </p>
                        <div
                            className={`rounded-xl p-2.5 ${!hasCoverage
                                ? "bg-slate-800 text-slate-300"
                                : lowCoverage
                                    ? "bg-amber-500/10 text-amber-300"
                                    : "bg-emerald-500/10 text-emerald-300"
                                }`}
                        >
                            {lowCoverage || !hasCoverage ? (
                                <AlertTriangle className="h-5 w-5" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5" />
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        {confidenceDescription}
                    </p>
                </div>
            </div>

            {/* Coverage section */}
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

                <p className="mt-4 text-xs leading-5 text-slate-500">
                    Warning threshold: {coverageThreshold}%. Coverage measures
                    data availability; it does not independently establish
                    analysis accuracy.
                </p>
            </section>

            {/* Classification and summary */}
            <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Classification
                    </p>
                    <div className="mt-4 flex items-start gap-4">
                        <div
                            className={`rounded-xl border p-3 ${classificationMeta.badgeClass}`}
                        >
                            <ClassificationIcon
                                className={`h-6 w-6 ${classificationMeta.iconClass}`}
                            />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                {classificationMeta.label}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                {lowCoverage
                                    ? "The observed change is provisional because at least one period has low valid-pixel coverage."
                                    : "Review both NDVI measurements and the selected periods when interpreting the change."}
                            </p>
                        </div>
                    </div>
                    {classification && (
                        <p className="mt-4 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
                            Backend classification: {classification}
                        </p>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 lg:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        {reportTitle}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-white">
                        Analysis Summary
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        {reportSummary}
                    </p>

                    <div className="mt-5 border-t border-slate-800 pt-4">
                        <h4 className="text-sm font-semibold text-slate-200">
                            Technical Notes
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            {technicalSummary}
                        </p>
                    </div>

                    {report?.generated_at && (
                        <p className="mt-4 text-xs text-slate-500">
                            Report generated: {report.generated_at}
                        </p>
                    )}
                </section>
            </div>

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

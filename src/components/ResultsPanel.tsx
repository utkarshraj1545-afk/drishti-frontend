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

function formatNdvi(value: number | null): string {
    return value === null ? "N/A" : value.toFixed(4);
}

function formatChange(value: number | null): string {
    if (value === null) return "N/A";

    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getClassificationMeta(classification: string) {
    const normalized = classification.toLowerCase();

    if (normalized.includes("gain")) {
        return {
            icon: TrendingUp,
            label: "Vegetation Gain",
            description: "Vegetation health has improved.",
            iconClass: "text-emerald-400",
            badgeClass:
                "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        };
    }

    if (normalized.includes("loss")) {
        return {
            icon: TrendingDown,
            label: "Vegetation Loss",
            description: "Vegetation health has declined.",
            iconClass: "text-red-400",
            badgeClass:
                "border-red-500/20 bg-red-500/10 text-red-300",
        };
    }

    return {
        icon: Minus,
        label: "No Significant Change",
        description: "Vegetation conditions remain relatively stable.",
        iconClass: "text-sky-400",
        badgeClass:
            "border-sky-500/20 bg-sky-500/10 text-sky-300",
    };
}

function getRiskMeta(riskLevel: string) {
    const normalized = riskLevel.toLowerCase();

    if (normalized === "high" || normalized === "उच्च") {
        return {
            icon: AlertTriangle,
            label: riskLevel,
            className: "text-red-400",
            badgeClass:
                "border-red-500/20 bg-red-500/10 text-red-300",
        };
    }

    if (
        normalized === "moderate" ||
        normalized === "medium" ||
        normalized === "मध्यम"
    ) {
        return {
            icon: AlertTriangle,
            label: riskLevel,
            className: "text-amber-400",
            badgeClass:
                "border-amber-500/20 bg-amber-500/10 text-amber-300",
        };
    }

    return {
        icon: CheckCircle2,
        label: riskLevel,
        className: "text-emerald-400",
        badgeClass:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
}

export default function ResultsPanel({
    result,
    analysisRequest,
}: ResultsPanelProps) {
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    if (!result) return null;

    const {
        before,
        after,
        change_percent,
        classification,
        report,
    } = result.analysis;

    const classificationMeta =
        getClassificationMeta(classification);

    const riskMeta = getRiskMeta(report.risk_level);

    const ClassificationIcon = classificationMeta.icon;
    const RiskIcon = riskMeta.icon;

    const changeIsPositive =
        change_percent !== null && change_percent > 0;

    const changeIsNegative =
        change_percent !== null && change_percent < 0;

    const handleDownloadPdf = async () => {
        if (!analysisRequest || pdfLoading) return;

        try {
            setPdfLoading(true);
            setPdfError(null);

            const blob = await downloadPdf(analysisRequest);

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `drishti-ndvi-report-${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
        } catch (error) {
            setPdfError(
                error instanceof Error
                    ? error.message
                    : "Failed to generate PDF report."
            );
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <section
            id="reports"
            className="mt-10 space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-emerald-400" />

                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Analysis Results
                        </span>
                    </div>

                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        Vegetation Change Assessment
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        Satellite-derived NDVI comparison between the selected
                        before and after periods.
                    </p>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={!analysisRequest || pdfLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {pdfLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}

                        {pdfLoading ? "Generating PDF..." : "Download PDF"}
                    </button>

                    {pdfError && (
                        <p className="max-w-xs text-right text-xs text-red-400">
                            {pdfError}
                        </p>
                    )}
                </div>
            </div>

            {/* Classification */}
            <div className="flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
                <ClassificationIcon className="h-4 w-4" />
                {classificationMeta.label}
            </div>

            {/* NDVI Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Before NDVI
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-3xl font-bold tracking-tight text-white">
                            {formatNdvi(before.mean_ndvi)}
                        </p>

                        <div className="rounded-xl bg-slate-800 p-2">
                            <Leaf className="h-5 w-5 text-emerald-400" />
                        </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                        {before.scene_count} satellite scenes
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        After NDVI
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-3xl font-bold tracking-tight text-white">
                            {formatNdvi(after.mean_ndvi)}
                        </p>

                        <div className="rounded-xl bg-slate-800 p-2">
                            <Leaf className="h-5 w-5 text-sky-400" />
                        </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                        {after.scene_count} satellite scenes
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        NDVI Change
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-3">
                        <p
                            className={`text-3xl font-bold tracking-tight ${changeIsNegative
                                    ? "text-red-400"
                                    : changeIsPositive
                                        ? "text-emerald-400"
                                        : "text-sky-400"
                                }`}
                        >
                            {formatChange(change_percent)}
                        </p>

                        <div className="rounded-xl bg-slate-800 p-2">
                            {changeIsNegative ? (
                                <TrendingDown className="h-5 w-5 text-red-400" />
                            ) : changeIsPositive ? (
                                <TrendingUp className="h-5 w-5 text-emerald-400" />
                            ) : (
                                <Minus className="h-5 w-5 text-sky-400" />
                            )}
                        </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                        Relative vegetation change
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Risk Level
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-3">
                        <p
                            className={`text-3xl font-bold tracking-tight ${riskMeta.className}`}
                        >
                            {riskMeta.label}
                        </p>

                        <div className="rounded-xl bg-slate-800 p-2">
                            <RiskIcon
                                className={`h-5 w-5 ${riskMeta.className}`}
                            />
                        </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                        Assessment from detected change
                    </p>
                </div>
            </div>

            {/* Classification + Summary */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                    <div className="flex items-start gap-4">
                        <div
                            className={`rounded-xl border p-3 ${classificationMeta.badgeClass}`}
                        >
                            <ClassificationIcon
                                className={`h-6 w-6 ${classificationMeta.iconClass}`}
                            />
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                Classification
                            </p>

                            <h3 className="mt-2 text-xl font-semibold text-white">
                                {classificationMeta.label}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                {classificationMeta.description}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 lg:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        AI Report Summary
                    </p>

                    <h3 className="mt-2 text-xl font-semibold text-white">
                        {report.report_title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-slate-300">
                        {report.simple_summary}
                    </p>
                </div>
            </div>

            {/* Technical Analysis */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Technical Analysis
                        </p>

                        <h3 className="mt-1 text-lg font-semibold text-white">
                            NDVI Change Interpretation
                        </h3>
                    </div>

                    <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${riskMeta.badgeClass}`}
                    >
                        {report.risk_level} Risk
                    </span>
                </div>

                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                    <p className="text-sm leading-7 text-slate-300">
                        {report.technical_summary}
                    </p>
                </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Recommended Actions
                        </p>

                        <h3 className="mt-1 text-lg font-semibold text-white">
                            Next Steps
                        </h3>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {report.recommendations.map(
                        (recommendation, index) => (
                            <div
                                key={`${recommendation}-${index}`}
                                className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                            >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                                    {String(index + 1).padStart(2, "0")}
                                </span>

                                <p className="text-sm leading-6 text-slate-300">
                                    {recommendation}
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                    Satellite vegetation analysis · NDVI
                </span>

                <span>
                    Generated{" "}
                    {new Date(report.generated_at).toLocaleString()}
                </span>
            </div>
        </section>
    );
}

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ============================================
// EXISTING: BEFORE / AFTER NDVI CHANGE ANALYSIS
// ============================================

export interface AnalysisRequest {
    west: number;
    south: number;
    east: number;
    north: number;
    before_start: string;
    before_end: string;
    after_start: string;
    after_end: string;
    language?: "en" | "hi";
    max_cloud_pct?: number;

    // NEW: Selected location name for analysis and PDF report.
    location_name?: string;
}

export interface AnalysisPeriod {
    mean_ndvi: number | null;
    scenes?: number;
    scene_count?: number;

    // Valid-pixel coverage metrics returned by FastAPI.
    valid_pixel_count?: number;
    total_pixel_count?: number;
    coverage_percent?: number;
    coverage_warning?: string | null;
}

export interface AnalysisReport {
    report_title?: string;
    generated_at?: string;
    risk_level?: string;
    technical_summary?: string;
    simple_summary?: string;
    recommendations?: string[];
}

export interface WaterPeriod {
    water_area_km2: number | null;
    valid_area_km2: number | null;
    water_percent_valid: number | null;
}

export interface WaterAnalysis {
    before: WaterPeriod | null;
    after: WaterPeriod | null;
    note: string;
}

export interface AnalysisData {
    before: AnalysisPeriod;
    after: AnalysisPeriod;
    change_percent: number | null;
    classification: string;
    report?: AnalysisReport | null;
    note: string | null;

    // Coverage configuration and warnings from FastAPI.
    max_cloud_pct?: number;
    coverage_warning_threshold?: number;
    coverage_warnings?: string[];

    // MNDWI-based estimated water extent.
    water?: WaterAnalysis | null;
}

export type AnalysisResponse = AnalysisData;

// ============================================
// NEW: HISTORICAL NDVI TREND ANALYSIS
// ============================================

export type TrendInterval = "yearly" | "monthly";

export interface TrendRequest {
    west: number;
    south: number;
    east: number;
    north: number;
    start_date: string;
    end_date: string;
    interval: TrendInterval;
    max_cloud_pct?: number;
}

export interface NDVITrendObservation {
    period_start: string;
    period_end: string;
    mean_ndvi: number | null;
    scene_count: number;
    valid_pixel_count: number | null;
    total_pixel_count: number | null;
    coverage_percent: number | null;
    coverage_warning: string | null;
}

export interface NDVITrendResponse {
    success: boolean;
    interval: TrendInterval;
    start_date: string;
    end_date: string;
    max_cloud_pct: number;
    coverage_warning_threshold: number;
    observations: NDVITrendObservation[];
}

// ============================================
// SHARED: API RESPONSE HANDLING
// ============================================

async function handleResponse<T>(
    response: Response
): Promise<T> {
    if (!response.ok) {
        let message = "Request failed";

        try {
            const errorData = await response.json();

            message =
                typeof errorData.detail === "string"
                    ? errorData.detail
                    : JSON.stringify(errorData);
        } catch {
            message = await response
                .text()
                .catch(() => message);
        }

        throw new Error(message || "Request failed");
    }

    return response.json() as Promise<T>;
}

// ============================================
// EXISTING: BEFORE / AFTER CHANGE ANALYSIS
// ============================================

export async function analyzeArea(
    payload: AnalysisRequest
): Promise<AnalysisResponse> {
    const response = await fetch(
        `${API_BASE_URL}/analyze/change`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // Includes location_name when provided.
            body: JSON.stringify(payload),
        }
    );

    return handleResponse<AnalysisResponse>(response);
}

// ============================================
// NEW: HISTORICAL NDVI TREND REQUEST
// ============================================

export async function analyzeTrend(
    payload: TrendRequest
): Promise<NDVITrendResponse> {
    const response = await fetch(
        `${API_BASE_URL}/analyze/trend`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }
    );

    return handleResponse<NDVITrendResponse>(response);
}

// ============================================
// EXISTING: PDF REPORT DOWNLOAD
// ============================================

export async function downloadPdf(
    payload: AnalysisRequest
): Promise<Blob> {
    const response = await fetch(
        `${API_BASE_URL}/analyze/change/pdf`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // Includes location_name when provided.
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) {
        let message = "Failed to generate PDF";

        try {
            const errorData = await response.json();

            message =
                typeof errorData.detail === "string"
                    ? errorData.detail
                    : JSON.stringify(errorData);
        } catch {
            message = await response
                .text()
                .catch(() => message);
        }

        throw new Error(
            message || "Failed to generate PDF"
        );
    }

    return response.blob();
}

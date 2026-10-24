
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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

export interface AnalysisData {
    before: AnalysisPeriod;
    after: AnalysisPeriod;
    change_percent: number | null;
    classification: string;
    report?: AnalysisReport | null;
    note: string | null;

    // Coverage configuration and warnings from the backend.
    max_cloud_pct?: number;
    coverage_warning_threshold?: number;
    coverage_warnings?: string[];
}

export type AnalysisResponse = AnalysisData;

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
            message = await response.text().catch(() => message);
        }

        throw new Error(message || "Request failed");
    }

    return response.json() as Promise<T>;
}

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
            body: JSON.stringify(payload),
        }
    );

    return handleResponse<AnalysisResponse>(response);
}

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
            message = await response.text().catch(() => message);
        }

        throw new Error(message || "Failed to generate PDF");
    }

    return response.blob();
}

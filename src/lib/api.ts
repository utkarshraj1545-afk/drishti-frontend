const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

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
}

export interface AnalysisData {
    before: {
        mean_ndvi: number | null;
        scene_count: number;
    };
    after: {
        mean_ndvi: number | null;
        scene_count: number;
    };
    change_percent: number | null;
    classification: string;
    report: {
        report_title: string;
        generated_at: string;
        risk_level: string;
        technical_summary: string;
        simple_summary: string;
        recommendations: string[];
    };
    note: string | null;
}

export interface AnalysisResponse {
    analysis: AnalysisData;
}

async function handleResponse<T>(
    response: Response
): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Request failed");
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
        throw new Error("Failed to generate PDF");
    }

    return response.blob();
}
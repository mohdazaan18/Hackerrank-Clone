import api from "@/lib/axios";
import type { ApiResponse, AiReport, AiRecommendation } from "@/types/api.types";

export const aiReportService = {
    /**
     * GET /ai-report/:submissionId
     */
    getAiReport: async (submissionId: string) => {
        const { data } = await api.get<ApiResponse<AiReport>>(
            `/ai-report/${submissionId}`
        );
        return data;
    },

    /**
     * GET /ai-report/recommendation/:submissionId
     */
    getAiRecommendation: async (submissionId: string) => {
        const { data } = await api.get<ApiResponse<AiRecommendation>>(
            `/ai-report/recommendation/${submissionId}`
        );
        return data;
    },
};


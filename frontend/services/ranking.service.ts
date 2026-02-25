import api from "@/lib/axios";
import type { ApiResponse, RankedSubmission } from "@/types/api.types";

export const rankingService = {
    /**
     * GET /ranking/:testId
     */
    getRanking: async (testId: string) => {
        const { data } = await api.get<ApiResponse<RankedSubmission[]>>(
            `/ranking/${testId}`
        );
        return data;
    },
};

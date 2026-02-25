import api from "@/lib/axios";
import type {
    ApiResponse,
    Submission,
    SubmissionPayload,
} from "@/types/api.types";

export const submissionService = {
    /**
     * POST /submissions
     */
    submitCode: async (payload: SubmissionPayload) => {
        const { data } = await api.post<ApiResponse<Submission>>(
            "/submissions",
            payload
        );
        return data;
    },

    /**
     * GET /submissions/:id
     */
    getSubmissionById: async (id: string) => {
        const { data } = await api.get<ApiResponse<Submission>>(
            `/submissions/${id}`
        );
        return data;
    },
};

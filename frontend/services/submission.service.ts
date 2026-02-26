import api from "@/lib/axios";
import type {
    ApiResponse,
    Submission,
    SubmissionPayload,
} from "@/types/api.types";

export interface SessionInfo {
    startedAt: number;
    expiresAt: number;
    serverTime: number;
    alreadySubmitted: boolean;
}

export const submissionService = {
    /**
     * GET /submissions/session/:testId — server-authoritative timer info
     */
    getSession: async (testId: string) => {
        const { data } = await api.get<ApiResponse<SessionInfo>>(
            `/submissions/session/${testId}`
        );
        return data;
    },

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

import api from "@/lib/axios";
import type {
    ApiResponse,
    CodeSnapshot,
    SnapshotPayload,
} from "@/types/api.types";

export const replayService = {
    /**
     * POST /replay/snapshot
     */
    saveSnapshot: async (payload: SnapshotPayload) => {
        const { data } = await api.post<ApiResponse<CodeSnapshot>>(
            "/replay/snapshot",
            payload
        );
        return data;
    },

    /**
     * GET /replay/:submissionId
     */
    getReplay: async (submissionId: string) => {
        const { data } = await api.get<ApiResponse<CodeSnapshot>>(
            `/replay/${submissionId}`
        );
        return data;
    },
};

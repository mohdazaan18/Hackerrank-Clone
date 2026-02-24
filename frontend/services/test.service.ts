import api from "@/lib/axios";
import type {
    ApiResponse,
    Test,
    CreateTestPayload,
    UpdateTestPayload,
} from "@/types/api.types";

export const testService = {
    /**
     * POST /tests
     */
    createTest: async (payload: CreateTestPayload) => {
        const { data } = await api.post<ApiResponse<Test>>("/tests", payload);
        return data;
    },

    /**
     * GET /tests
     */
    getAllTests: async () => {
        const { data } = await api.get<ApiResponse<Test[]>>("/tests");
        return data;
    },

    /**
     * GET /tests/:id
     */
    getTestById: async (id: string) => {
        const { data } = await api.get<ApiResponse<Test>>(`/tests/${id}`);
        return data;
    },

    /**
     * PUT /tests/:id
     */
    updateTest: async (id: string, payload: UpdateTestPayload) => {
        const { data } = await api.put<ApiResponse<Test>>(
            `/tests/${id}`,
            payload
        );
        return data;
    },

    /**
     * DELETE /tests/:id
     */
    deleteTest: async (id: string) => {
        const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(
            `/tests/${id}`
        );
        return data;
    },
};

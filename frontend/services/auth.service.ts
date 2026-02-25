import api from "@/lib/axios";
import type {
    ApiResponse,
    AdminLoginPayload,
    CandidateLoginPayload,
    AdminLoginResponse,
    CandidateLoginResponse,
} from "@/types/api.types";

export const authService = {
    /**
     * POST /auth/admin/login
     */
    adminLogin: async (payload: AdminLoginPayload) => {
        const { data } = await api.post<ApiResponse<AdminLoginResponse>>(
            "/auth/admin/login",
            payload
        );
        return data;
    },

    /**
     * POST /auth/candidate/login
     */
    candidateLogin: async (payload: CandidateLoginPayload) => {
        const { data } = await api.post<ApiResponse<CandidateLoginResponse>>(
            "/auth/candidate/login",
            payload
        );
        return data;
    },

    /**
     * POST /auth/admin/signup
     */
    adminSignup: async (payload: { name: string; email: string; password: string; confirmPassword: string }) => {
        const { data } = await api.post<ApiResponse<{ message: string }>>(
            "/auth/admin/signup",
            payload
        );
        return data;
    },

    /**
     * POST /auth/logout
     */
    logout: async () => {
        const { data } = await api.post<ApiResponse<{ message: string }>>(
            "/auth/logout"
        );
        return data;
    },
};

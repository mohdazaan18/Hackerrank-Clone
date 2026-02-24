import api from "@/lib/axios";
import type {
    ApiResponse,
    Invitation,
    InvitationPayload,
} from "@/types/api.types";

export const invitationService = {
    /**
     * POST /invitations
     */
    sendInvitations: async (payload: InvitationPayload) => {
        const { data } = await api.post<ApiResponse<Invitation[]>>(
            "/invitations",
            payload
        );
        return data;
    },

    /**
     * GET /invitations/:testId
     */
    getInvitationsByTestId: async (testId: string) => {
        const { data } = await api.get<ApiResponse<Invitation[]>>(
            `/invitations/${testId}`
        );
        return data;
    },

    /**
     * DELETE /invitations/:id
     */
    deleteInvitation: async (id: string) => {
        const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(
            `/invitations/${id}`
        );
        return data;
    },

    /**
     * POST /invitations/:id/resend
     */
    resendInvitation: async (id: string) => {
        const { data } = await api.post<ApiResponse<{ resent: boolean }>>(
            `/invitations/${id}/resend`
        );
        return data;
    },
};

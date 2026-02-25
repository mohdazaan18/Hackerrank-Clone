import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// ─── Response Interceptor ────────────────────────────────────────
// Handle 401 responses by clearing auth state and redirecting
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (typeof window !== "undefined" && error.response?.status === 401) {
            const currentPath = window.location.pathname;

            // Don't redirect if already on login or public pages
            const publicPaths = ["/login", "/invite", "/"];
            const isPublic = publicPaths.some(
                (path) => currentPath === path || currentPath.startsWith("/invite/")
            );

            if (!isPublic) {
                // Clear stored auth on 401
                localStorage.removeItem("codeai_auth");
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default api;

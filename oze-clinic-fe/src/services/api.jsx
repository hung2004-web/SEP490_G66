import axios from "axios";
import { ERROR_PAGE_STATUSES, REQUEST_TIMEOUT_MS, getErrorStatus, showErrorPage } from "../utils/errorHandler";
import { clearSession, getSessionToken } from "./sessionStore";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = getSessionToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Page-level errors open the global error page; the error is still rejected so the caller can stop loading.
// Pass { skipErrorPage: true } in the request config to handle every status in the screen instead.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isCancel(error)) return Promise.reject(error);

        const status = getErrorStatus(error);

        if (status === 401) {
            clearSession();
        }

        if (!error.config?.skipErrorPage && ERROR_PAGE_STATUSES.includes(status)) {
            showErrorPage(status);
        }

        return Promise.reject(error);
    }
);

export default api;

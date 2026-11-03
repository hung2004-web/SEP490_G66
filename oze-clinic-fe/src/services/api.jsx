import axios from "axios";
import { ERROR_PAGE_STATUSES, REQUEST_TIMEOUT_MS, getErrorStatus, showErrorPage, showSessionExpired } from "../utils/errorHandler";
import { getSessionRefreshToken, getSessionToken, isSameSessionUser, saveSession, sessionFromAuthResult } from "./sessionStore";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = getSessionToken();

    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

const REFRESH_LOCK_NAME = "oze-auth-refresh";

const REFRESH_OUTCOME = { RETRY: "retry", EXPIRED: "expired", SIGNED_OUT: "signedOut", FAILED: "failed" };

let refreshPromise = null;

const outcomeAfterRefresh = (sentRefreshToken) => {
    const storedRefreshToken = getSessionRefreshToken();
    if (!storedRefreshToken) return { outcome: REFRESH_OUTCOME.SIGNED_OUT };
    if (storedRefreshToken !== sentRefreshToken) return { outcome: REFRESH_OUTCOME.RETRY };
    return null;
};

const withRefreshLock = (task) => (navigator.locks ? navigator.locks.request(REFRESH_LOCK_NAME, task) : task());

const runRefresh = (seenRefreshToken) => withRefreshLock(async () => {
    const sentRefreshToken = getSessionRefreshToken();
    if (!sentRefreshToken) return { outcome: REFRESH_OUTCOME.SIGNED_OUT };
    if (sentRefreshToken !== seenRefreshToken) return { outcome: REFRESH_OUTCOME.RETRY };
    try {
        const response = await api.post("/api/Auth/refresh-token", { refreshToken: sentRefreshToken }, { skipAuthRefresh: true });
        const changed = outcomeAfterRefresh(sentRefreshToken);
        if (changed) return changed;
        const session = response.data?.success === true ? sessionFromAuthResult(response.data.data) : null;
        if (!session) return { outcome: REFRESH_OUTCOME.EXPIRED };
        saveSession(session);
        return { outcome: REFRESH_OUTCOME.RETRY };
    } catch (error) {
        const changed = outcomeAfterRefresh(sentRefreshToken);
        if (changed) return changed;
        if (error.response?.status === 400 && typeof error.response.data?.success === "boolean") {
            return { outcome: REFRESH_OUTCOME.EXPIRED, code: error.response.data.code };
        }
        return { outcome: REFRESH_OUTCOME.FAILED, error, errorPageShown: false };
    }
});

const bearerToken = (config) => config.headers?.Authorization?.replace(/^Bearer /, "");

const retryRequest = (config, error) => {
    const token = getSessionToken();
    if (!token || !isSameSessionUser(bearerToken(config), token)) return Promise.reject(error);
    config.authRetried = true;
    config.headers.Authorization = `Bearer ${token}`;
    return api.request(config);
};

const expireSession = (error, code) => {
    showSessionExpired(code);
    return Promise.reject(error);
};

const handleUnauthorized = async (error) => {
    const config = error.config;
    if (!config || config.authRetried) return expireSession(error);
    if (bearerToken(config) !== getSessionToken()) return retryRequest(config, error);
    const seenRefreshToken = getSessionRefreshToken();
    if (!seenRefreshToken) return expireSession(error);

    refreshPromise ??= runRefresh(seenRefreshToken).finally(() => {
        refreshPromise = null;
    });
    const result = await refreshPromise;

    if (result.outcome === REFRESH_OUTCOME.RETRY) return retryRequest(config, error);
    if (result.outcome === REFRESH_OUTCOME.EXPIRED) return expireSession(error, result.code);
    if (result.outcome === REFRESH_OUTCOME.FAILED) {
        const status = getErrorStatus(result.error);
        if (!config.skipErrorPage && !result.errorPageShown && ERROR_PAGE_STATUSES.includes(status)) {
            result.errorPageShown = true;
            showErrorPage(status);
        }
        return Promise.reject(result.error);
    }
    return Promise.reject(error);
};

// Page-level errors open the global error page; the error is still rejected so the caller can stop loading.
// Pass { skipErrorPage: true } in the request config to handle every status in the screen instead.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isCancel(error)) return Promise.reject(error);
        if (error.config?.skipAuthRefresh) return Promise.reject(error);

        const status = getErrorStatus(error);

        if (status === 401 && getSessionToken()) return handleUnauthorized(error);
        if (status === 401 && error.config?.headers?.Authorization) return Promise.reject(error);

        if (!error.config?.skipErrorPage && ERROR_PAGE_STATUSES.includes(status)) {
            showErrorPage(status);
        }

        return Promise.reject(error);
    }
);

export default api;

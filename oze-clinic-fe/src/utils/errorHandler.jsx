// Bridge between non-React code (axios interceptor, services) and the router:
// showErrorPage() fires an event, GlobalErrorListener (inside BrowserRouter) navigates to /error/:code.
export const ERROR_PAGE_EVENT = "app:show-error-page";

// API statuses that leave the current screen for the error page.
// 400/404/409/422 stay with the screen so forms can show the message next to the fields.
export const ERROR_PAGE_STATUSES = [401, 403, 408, 429, 500, 502, 503, 504];

export const REQUEST_TIMEOUT_MS = 15000;

export const showErrorPage = (code) => {
    window.dispatchEvent(new CustomEvent(ERROR_PAGE_EVENT, { detail: { code } }));
};

// Maps an axios error to an HTTP code: timeout -> 408, no response (server down/offline) -> 503.
export const getErrorStatus = (error) => {
    if (error.response) return error.response.status;
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return 408;
    return 503;
};

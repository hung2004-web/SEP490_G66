import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearSession, getSessionToken } from "../../services/sessionStore";
import { ERROR_PAGE_EVENT, SESSION_EXPIRED_EVENT } from "../../utils/errorHandler";
import { BACKEND_LOGIN_CODES, MESSAGES } from "../../utils/messages";
import { ROUTES, getErrorRoute } from "../../utils/routes";

const sessionEndMessage = (code) => {
    if (code === BACKEND_LOGIN_CODES.ACCOUNT_DISABLED) return MESSAGES.MSG80;
    if (code === BACKEND_LOGIN_CODES.LOCKED_OUT) return MESSAGES.MSG26;
    return MESSAGES.MSG84;
};

// Mount once inside BrowserRouter. Navigates to /error/:code when showErrorPage() is called.
// replace: true so "Quay lại" returns to the page before the one that failed, not into it again.
const GlobalErrorListener = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleError = (event) => {
            navigate(getErrorRoute(event.detail.code), { replace: true });
        };

        const handleSessionExpired = (event) => {
            if (!getSessionToken()) return;
            clearSession();
            toast.error(sessionEndMessage(event.detail?.code));
            navigate(ROUTES.SIGN_IN, { replace: true });
        };

        window.addEventListener(ERROR_PAGE_EVENT, handleError);
        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        return () => {
            window.removeEventListener(ERROR_PAGE_EVENT, handleError);
            window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        };
    }, [navigate]);

    return null;
};

export default GlobalErrorListener;

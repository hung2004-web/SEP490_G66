import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearSession, getSessionToken } from "../../services/sessionStore";
import { ERROR_PAGE_EVENT, SESSION_EXPIRED_EVENT } from "../../utils/errorHandler";
import { MESSAGES } from "../../utils/messages";
import { ROUTES, getErrorRoute } from "../../utils/routes";

// Mount once inside BrowserRouter. Navigates to /error/:code when showErrorPage() is called.
// replace: true so "Quay lại" returns to the page before the one that failed, not into it again.
const GlobalErrorListener = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleError = (event) => {
            navigate(getErrorRoute(event.detail.code), { replace: true });
        };

        const handleSessionExpired = () => {
            if (!getSessionToken()) return;
            clearSession();
            toast.error(MESSAGES.MSG84);
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

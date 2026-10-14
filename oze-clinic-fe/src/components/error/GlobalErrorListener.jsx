import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ERROR_PAGE_EVENT } from "../../utils/errorHandler";
import { getErrorRoute } from "../../utils/routes";

// Mount once inside BrowserRouter. Navigates to /error/:code when showErrorPage() is called.
// replace: true so "Quay lại" returns to the page before the one that failed, not into it again.
const GlobalErrorListener = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleError = (event) => {
            navigate(getErrorRoute(event.detail.code), { replace: true });
        };

        window.addEventListener(ERROR_PAGE_EVENT, handleError);
        return () => window.removeEventListener(ERROR_PAGE_EVENT, handleError);
    }, [navigate]);

    return null;
};

export default GlobalErrorListener;

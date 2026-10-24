import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "./Header/Header.jsx";
import Footer from "./Footer/Footer.jsx";
import AppLayout from "./AppLayout.jsx";
import ErrorBoundary from "../components/error/ErrorBoundary.jsx";
import useSession from "../hooks/useSession";
import { USER_ROLES } from "../utils/messages";
import { getPostLoginRoute } from "../utils/routes";

const MainLayout = () => {
    const { pathname } = useLocation();
    const { token, role } = useSession();

    if (token && role === USER_ROLES.PATIENT) return <AppLayout publicPage />;

    if (token) return <Navigate to={getPostLoginRoute()} replace />;

    return (
        <div className="flex flex-col min-h-screen">
            <Header/>
            <main className="flex-grow">
                {/* key resets the boundary after a crash when the user goes to another page */}
                <ErrorBoundary key={pathname}>
                    <Outlet />
                </ErrorBoundary>
            </main>
            <Footer/>
        </div>
    );
};

export default MainLayout;

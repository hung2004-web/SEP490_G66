import { Outlet, useLocation } from "react-router-dom";
import GuestHeader from "./Header/GuestHeader.jsx";
import Footer from "./Footer/Footer.jsx";
import ErrorBoundary from "../components/error/ErrorBoundary.jsx";

const MainLayout = () => {
    const { pathname } = useLocation();

    return (
        <div className="flex flex-col min-h-screen">
            <GuestHeader/>        
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

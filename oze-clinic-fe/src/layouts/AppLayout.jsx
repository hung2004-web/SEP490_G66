import { useRef, useState, useSyncExternalStore } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header/Header.jsx";
import Sidebar from "./Sidebar/Sidebar.jsx";
import ErrorBoundary from "../components/error/ErrorBoundary.jsx";

const SIDEBAR_ID = "app-sidebar";
const DESKTOP_QUERY = "(min-width: 64rem)";

const subscribeToDesktop = (onChange) => {
    const query = window.matchMedia(DESKTOP_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};

const getIsDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

const AppLayout = () => {
    const location = useLocation();
    const isDesktop = useSyncExternalStore(subscribeToDesktop, getIsDesktop);
    const toggleRef = useRef(null);
    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLocationKey, setDrawerLocationKey] = useState(location.key);

    if (drawerLocationKey !== location.key || (isDesktop && drawerOpen)) {
        setDrawerLocationKey(location.key);
        setDrawerOpen(false);
    }

    const sidebarOpen = isDesktop ? !collapsed : drawerOpen;
    const sidebarInDom = isDesktop || drawerOpen;

    const handleToggle = () => {
        if (isDesktop) setCollapsed((current) => !current);
        else setDrawerOpen((current) => !current);
    };

    return (
        <div className="flex min-h-dvh">
            {isDesktop && <Sidebar id={SIDEBAR_ID} collapsed={collapsed} />}
            <div className="flex min-w-0 flex-1 flex-col">
                <Header
                    onToggleSidebar={handleToggle}
                    sidebarOpen={sidebarOpen}
                    sidebarId={sidebarInDom ? SIDEBAR_ID : undefined}
                    sidebarToggleRef={toggleRef}
                />
                <main className="app-content flex-1">
                    <ErrorBoundary key={location.pathname}>
                        <Outlet />
                    </ErrorBoundary>
                </main>
            </div>
            {drawerOpen && (
                <Sidebar id={SIDEBAR_ID} drawer onClose={() => setDrawerOpen(false)} returnFocusRef={toggleRef} />
            )}
        </div>
    );
};

export default AppLayout;

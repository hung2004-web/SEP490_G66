import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/common/HomePage";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<HomePage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;

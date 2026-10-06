import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/common/HomePage";
import SignInPage from "../pages/auth/SignInPage";
import { ROUTES } from "../utils/constant";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path={ROUTES.HOME} element={<MainLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;

import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ForgotPasswordPage from "../pages/common/ForgotPasswordPage";
import HomePage from "../pages/common/HomePage";
import Register from "../pages/common/Register";
import SignInPage from "../pages/common/SignInPage";
import { ROUTES } from "../utils/constant";

const routes = [
    {
        path: ROUTES.HOME,
        element: <HomePage />
    },
    {
        path: ROUTES.SIGN_IN,
        element: <SignInPage />
    },
    {
        path: ROUTES.REGISTER,
        element: <Register />
    },
    {
        path: ROUTES.FORGOT_PASSWORD,
        element: <ForgotPasswordPage />
    }
]

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<MainLayout />}>
                    {routes.map((route, index) => (
                        <Route
                            key={index}
                            path={route.path}
                            element={route.element}
                        />
                    ))}
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;

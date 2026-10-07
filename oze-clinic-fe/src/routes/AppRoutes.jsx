import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/common/HomePage";
import Register from "../pages/common/Register";
import SignInPage from "../pages/auth/SignInPage";
import { ROUTES } from "../utils/constant";

const routes = [
    {
        path: "/",
        element: <HomePage />
    },
    {
        path: ROUTES.SIGN_IN,
        element: <SignInPage />
    },
    {
        path: "/register",
        element: <Register />
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

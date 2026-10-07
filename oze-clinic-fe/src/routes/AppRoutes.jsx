import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/common/HomePage";
<<<<<<< HEAD
import Register from "../pages/common/Register";

const routes = [
    {
        path: "/",
        element: <HomePage />
    },
    {
        path: "/register",
        element: <Register />
    }
]
=======
>>>>>>> origin/main

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
<<<<<<< HEAD
                <Route element={<MainLayout />}>
                    {routes.map((route, index) => (
                        <Route
                            key={index}
                            path={route.path}
                            element={route.element}
                        />
                    ))}
=======
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<HomePage />} />
>>>>>>> origin/main
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;

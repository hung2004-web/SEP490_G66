import { BrowserRouter, Routes, Route } from "react-router-dom";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<h1>Oze Clinic</h1>} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
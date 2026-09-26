import { Outlet } from "react-router-dom";
import Header from "./Header/Header.jsx";
import Footer from "./Footer/Footer.jsx";

const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <Header/>        
            <main className="flex-grow p-4">
                <Outlet />
            </main>      
            <Footer/>
        </div>
    );
};

export default MainLayout;

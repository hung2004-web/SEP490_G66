import DoctorsSection from "./DoctorsSection.jsx";
import HeroSection from "./HeroSection.jsx";
import KnowledgeSection from "./KnowledgeSection.jsx";
import ServicesSection from "./ServicesSection.jsx";

const HomePage = () => {
    return (
        <>
            <HeroSection />
            <ServicesSection />
            <DoctorsSection />
            <KnowledgeSection />
        </>
    );
};

export default HomePage;

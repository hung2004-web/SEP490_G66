import { MOCK_HOME_HERO } from "@/utils/mockHomeHero";

const TITLE_ID = "home-hero-title";

const HeroSection = () => {
    return (
        <section aria-labelledby={TITLE_ID} className="container-public pt-6 md:pt-8">
            <h1 id={TITLE_ID} className="sr-only">
                {MOCK_HOME_HERO.title}
            </h1>
            <img
                src={MOCK_HOME_HERO.imageUrl}
                alt={MOCK_HOME_HERO.alt}
                fetchPriority="high"
                className="hero-image aspect-4/3 w-full object-left md:aspect-8/3"
            />
        </section>
    );
};

export default HeroSection;

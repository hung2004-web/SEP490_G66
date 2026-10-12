import { Inbox } from "lucide-react";
import Carousel from "@/components/ui/Carousel";
import ImageCard from "@/components/ui/ImageCard";
import SectionHeading from "@/components/ui/SectionHeading";
import useAsync from "@/hooks/useAsync";
import { getDentalServices } from "@/services/dentalService";

const TITLE_ID = "home-services-title";

const SKELETON_VISIBILITY = ["block", "hidden md:block", "hidden lg:block", "hidden lg:block"];

const ServicesSection = () => {
    const { loading, value } = useAsync(getDentalServices, []);
    const services = value?.success ? value.data : [];

    return (
        <section
            aria-labelledby={TITLE_ID}
            aria-busy={loading || undefined}
            className="container-public flex flex-col gap-10 py-12 md:py-16"
        >
            <SectionHeading id={TITLE_ID}>Dịch vụ</SectionHeading>
            {loading && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
                    {SKELETON_VISIBILITY.map((visibility, index) => (
                        <div key={index} className={`skeleton aspect-square ${visibility}`} />
                    ))}
                </div>
            )}
            {!loading && services.length === 0 && (
                <div className="empty-state">
                    <Inbox className="empty-state-icon" aria-hidden="true" />
                    <p className="empty-state-title">Chưa có dịch vụ nào.</p>
                </div>
            )}
            {!loading && services.length > 0 && (
                <Carousel label="Danh sách dịch vụ" previousLabel="Dịch vụ trước" nextLabel="Dịch vụ tiếp theo">
                    {services.map((service) => (
                        <ImageCard
                            key={service.id}
                            imageUrl={service.imageUrl}
                            imageAlt={service.name}
                            title={service.name}
                            description={service.description}
                            className="w-full"
                        />
                    ))}
                </Carousel>
            )}
        </section>
    );
};

export default ServicesSection;

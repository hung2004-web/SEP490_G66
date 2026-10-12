import { useEffect, useRef, useState } from "react";
import { Inbox } from "lucide-react";
import Carousel from "@/components/ui/Carousel";
import SectionHeading from "@/components/ui/SectionHeading";
import useAsync from "@/hooks/useAsync";
import { getDoctors } from "@/services/doctorService";
import DoctorIntro from "./DoctorIntro.jsx";
import DoctorPortraitCard from "./DoctorPortraitCard.jsx";

const TITLE_ID = "home-doctors-title";

const SKELETON_VISIBILITY = ["block", "hidden md:block", "hidden lg:block", "hidden lg:block"];

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scrollToIntro = (intro) => {
    if (!intro) return;
    const navOffset = parseFloat(getComputedStyle(intro).scrollMarginTop) || 0;
    if (intro.getBoundingClientRect().top >= navOffset) return;
    intro.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
};

const DoctorsSection = () => {
    const { loading, value } = useAsync(getDoctors, []);
    const doctors = value?.success ? value.data : [];
    const [selectedId, setSelectedId] = useState(null);
    const introRef = useRef(null);
    const scrollPendingRef = useRef(false);
    const selected = doctors.find((doctor) => doctor.id === selectedId) ?? doctors[0];

    useEffect(() => {
        if (!scrollPendingRef.current) return;
        scrollPendingRef.current = false;
        const frame = requestAnimationFrame(() => scrollToIntro(introRef.current));
        return () => cancelAnimationFrame(frame);
    }, [selectedId]);

    const handleSelect = (doctorId) => {
        if (doctorId === selected?.id) {
            scrollToIntro(introRef.current);
            return;
        }
        scrollPendingRef.current = true;
        setSelectedId(doctorId);
    };

    return (
        <section
            aria-labelledby={TITLE_ID}
            aria-busy={loading || undefined}
            className="container-public flex flex-col gap-10 py-12 md:py-16"
        >
            <SectionHeading id={TITLE_ID}>Đội ngũ bác sĩ</SectionHeading>
            {loading && (
                <>
                    <div className="card-public grid overflow-hidden p-0 md:grid-cols-3" aria-hidden="true">
                        <div className="skeleton aspect-2/3 w-full rounded-none" />
                        <div className="flex flex-col gap-4 p-6 md:col-span-2 md:p-8">
                            <div className="skeleton h-9 w-2/3" />
                            <div className="skeleton h-5 w-40" />
                            <div className="skeleton h-24 w-full" />
                            <div className="skeleton h-24 w-full" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-4" aria-hidden="true">
                        {SKELETON_VISIBILITY.map((visibility, index) => (
                            <div key={index} className={`skeleton aspect-2/3 rounded-xl ${visibility}`} />
                        ))}
                    </div>
                </>
            )}
            {!loading && doctors.length === 0 && (
                <div className="empty-state">
                    <Inbox className="empty-state-icon" aria-hidden="true" />
                    <p className="empty-state-title">Chưa có thông tin bác sĩ.</p>
                </div>
            )}
            {!loading && doctors.length > 0 && (
                <>
                    <DoctorIntro ref={introRef} doctor={selected} />
                    <Carousel
                        label="Danh sách bác sĩ"
                        previousLabel="Bác sĩ trước"
                        nextLabel="Bác sĩ tiếp theo"
                        gap="wide"
                    >
                        {doctors.map((doctor) => (
                            <DoctorPortraitCard
                                key={doctor.id}
                                doctor={doctor}
                                selected={doctor.id === selected.id}
                                onSelect={handleSelect}
                            />
                        ))}
                    </Carousel>
                </>
            )}
        </section>
    );
};

export default DoctorsSection;

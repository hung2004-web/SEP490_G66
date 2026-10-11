import { useEffect, useRef, useState } from "react";
import { Inbox } from "lucide-react";
import Carousel from "@/components/ui/Carousel";
import ImageCard from "@/components/ui/ImageCard";
import useAsync from "@/hooks/useAsync";
import { getDoctors } from "@/services/doctorService";
import { cx } from "@/utils/cx";
import DoctorIntro from "./DoctorIntro.jsx";

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

    const title = (
        <h2 id={TITLE_ID} className="section-title">
            Đội ngũ bác sĩ
        </h2>
    );

    return (
        <div className="container-public flex flex-col gap-12 py-12 md:gap-16 md:py-16">
            {loading && (
                <section aria-labelledby={TITLE_ID} aria-busy="true" className="flex flex-col gap-12 md:gap-16">
                    <div className="grid gap-8 md:grid-cols-3" aria-hidden="true">
                        <div className="skeleton mx-auto aspect-2/3 w-full max-w-xs rounded-2xl md:max-w-none" />
                        <div className="flex flex-col gap-4 md:col-span-2">
                            <div className="skeleton h-6 w-40" />
                            <div className="skeleton h-9 w-2/3" />
                            <div className="skeleton h-24 w-full" />
                            <div className="skeleton h-24 w-full" />
                        </div>
                    </div>
                    <div>
                        <div className="mb-6">{title}</div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
                            {SKELETON_VISIBILITY.map((visibility, index) => (
                                <div key={index} className={`skeleton aspect-2/3 ${visibility}`} />
                            ))}
                        </div>
                    </div>
                </section>
            )}
            {!loading && doctors.length === 0 && (
                <section aria-labelledby={TITLE_ID}>
                    <div className="mb-6">{title}</div>
                    <div className="empty-state">
                        <Inbox className="empty-state-icon" aria-hidden="true" />
                        <p className="empty-state-title">Chưa có thông tin bác sĩ.</p>
                    </div>
                </section>
            )}
            {!loading && doctors.length > 0 && (
                <>
                    <DoctorIntro ref={introRef} doctor={selected} />
                    <section aria-labelledby={TITLE_ID}>
                        <Carousel
                            label="Danh sách bác sĩ"
                            previousLabel="Bác sĩ trước"
                            nextLabel="Bác sĩ tiếp theo"
                            header={title}
                        >
                            {doctors.map((doctor) => {
                                const isSelected = doctor.id === selected.id;
                                return (
                                    <div key={doctor.id} className="relative w-full">
                                        <ImageCard
                                            imageUrl={doctor.imageUrl}
                                            imageAlt={doctor.fullName}
                                            ratio="portrait"
                                            fit="contain"
                                            imagePosition="object-top"
                                            imageBackground="bg-primary-soft"
                                            label={doctor.displayTitle}
                                            title={doctor.fullName}
                                            description={doctor.introduction}
                                            className="h-full"
                                        />
                                        <button
                                            type="button"
                                            aria-pressed={isSelected}
                                            aria-label={`${doctor.displayTitle} ${doctor.fullName}`}
                                            onClick={() => handleSelect(doctor.id)}
                                            className={cx(
                                                "absolute inset-0 cursor-pointer rounded-xl",
                                                isSelected && "ring-2 ring-primary",
                                            )}
                                        />
                                    </div>
                                );
                            })}
                        </Carousel>
                    </section>
                </>
            )}
        </div>
    );
};

export default DoctorsSection;

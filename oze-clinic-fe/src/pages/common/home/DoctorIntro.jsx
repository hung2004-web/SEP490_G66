import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/routes";

const NAME_ID = "home-doctor-intro-name";

const DoctorIntro = ({ doctor, ref }) => {
    return (
        <section ref={ref} aria-labelledby={NAME_ID} className="grid scroll-mt-20 gap-8 md:grid-cols-3">
            <div className="mx-auto aspect-2/3 w-full max-w-xs overflow-hidden rounded-2xl bg-primary-soft md:max-w-none">
                <img src={doctor.imageUrl} alt={doctor.fullName} className="size-full object-contain object-top" />
            </div>
            <div className="flex flex-col gap-5 md:col-span-2">
                <div className="flex flex-col items-start gap-2">
                    <span className="badge badge-info">{doctor.displayTitle}</span>
                    <div aria-live="polite" className="flex flex-col gap-1">
                        <h2 id={NAME_ID} className="font-heading text-heading-1 text-ink md:text-display-md">
                            {doctor.fullName}
                        </h2>
                        <p className="text-body-lg font-medium text-primary">{doctor.position}</p>
                    </div>
                </div>
                <p className="text-body-md text-body">{doctor.introduction}</p>
                <ul className="flex flex-col gap-3">
                    {doctor.certificateLines.map((line) => (
                        <li key={line} className="flex gap-3 text-body-md text-body">
                            <Check className="mt-0.5 size-5 shrink-0 text-success-solid" aria-hidden="true" />
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link to={ROUTES.DOCTORS} className="btn btn-secondary btn-lg rounded-full">
                        Xem thêm
                    </Link>
                    <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-cta">
                        Đặt lịch hẹn
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default DoctorIntro;

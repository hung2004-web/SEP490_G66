import { Check, IdCard, User } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/routes";

const DoctorIntro = ({ doctor, ref }) => {
    return (
        <div ref={ref} className="card-public grid scroll-mt-20 overflow-hidden p-0 md:grid-cols-3">
            <div className="flex items-end bg-primary-soft">
                <img
                    src={doctor.imageUrl}
                    alt={doctor.fullName}
                    className="aspect-2/3 w-full object-contain object-bottom"
                />
            </div>
            <div className="flex flex-col gap-5 p-6 md:col-span-2 md:p-8">
                <div aria-live="polite" className="flex flex-col gap-2">
                    <h3 className="font-heading text-heading-1 font-bold uppercase text-primary lg:text-display-md">
                        {`${doctor.displayTitle} ${doctor.fullName}`}
                    </h3>
                    <p className="flex items-center gap-2 text-title text-primary">
                        <User className="size-4 shrink-0" aria-hidden="true" />
                        {doctor.position}
                    </p>
                </div>
                <p className="text-body-md text-body">{doctor.introduction}</p>
                <div className="flex flex-col gap-3">
                    <p className="flex items-center gap-2 text-title text-primary">
                        <IdCard className="size-4 shrink-0" aria-hidden="true" />
                        Chứng chỉ chuyên môn
                    </p>
                    <ul className="flex flex-col gap-3">
                        {doctor.certificateLines.map((line) => (
                            <li key={line} className="flex gap-3 text-body-md text-body">
                                <Check className="mt-0.5 size-5 shrink-0 text-success-solid" aria-hidden="true" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link to={ROUTES.DOCTORS} className="btn btn-secondary btn-lg rounded-full">
                        Xem thêm
                    </Link>
                    <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-cta">
                        Đặt lịch hẹn
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DoctorIntro;

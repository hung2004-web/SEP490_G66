import { displayText } from "@/utils/medicalRecord";
import { Printer } from "lucide-react";
import RecordStatusBadge from "./RecordStatusBadge";
import { MEDICAL_RECORD_FILM_PLACE, MEDICAL_RECORD_FILM_STATUS } from "@/utils/messages";

const ToothIcon = () => (
    <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7.5 3.5c-2.5 0-4 2-4 4.5 0 3 1.2 4.5 2 7.5.6 2.4 1 5 2.3 5 1.6 0 1.6-4.5 4.2-4.5s2.6 4.5 4.2 4.5c1.3 0 1.7-2.6 2.3-5 .8-3 2-4.5 2-7.5 0-2.5-1.5-4.5-4-4.5-1.8 0-2.7 1-4.5 1s-2.7-1-4.5-1Z" />
    </svg>
);

const FilmCard = ({ film }) => (
    <section className="card-app p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
                <h2 className="card-title">
                    {displayText(film.type)} · {displayText(film.area)}
                </h2>
                <p className="text-caption text-muted">
                    {displayText(film.date)} · Chỉ định: {displayText(film.doctor)}
                </p>
            </div>
            <RecordStatusBadge status={film.status} labels={MEDICAL_RECORD_FILM_STATUS} />
        </div>
        <div className="p-5">
            <div className="flex h-55 flex-col items-center justify-center gap-2 rounded-lg bg-surface-navy text-caption text-on-navy-soft">
                <ToothIcon />
                <span>Ảnh phim</span>
            </div>
            <dl className="mt-3.5 flex flex-col gap-1.5 text-body-sm">
                {[
                    ["Nơi chụp", MEDICAL_RECORD_FILM_PLACE[film.place] ?? displayText(film.place)],
                    ["Cách nhận", Array.isArray(film.receive) ? film.receive.map(displayText).join(", ") : "—"],
                    ["Kết luận bác sĩ", displayText(film.result)],
                ].map(([label, value]) => (
                    <div key={label} className="flex gap-2.5">
                        <dt className="w-24 shrink-0 text-muted sm:w-30">{label}</dt>
                        <dd className="min-w-0 font-medium text-ink">{value}</dd>
                    </div>
                ))}
            </dl>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-secondary h-8 px-3">
                    <Printer className="size-4" aria-hidden="true" />
                    Tải ảnh
                </button>
                {film.place === "partner" && <span className="text-caption text-muted">Bản in đã giao tại trung tâm chụp phim</span>}
            </div>
        </div>
    </section>
);

const ImagingPanel = ({ films }) => (
    <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-2">
            {films.map((film, index) => (
                <FilmCard key={film.id ?? index} film={film} />
            ))}
        </div>
    </div>
);

export default ImagingPanel;

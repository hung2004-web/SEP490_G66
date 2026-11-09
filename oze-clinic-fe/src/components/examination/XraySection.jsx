import { Plus } from "lucide-react";
import ClinicalExamSection from "./ClinicalExamSection";
import XrayItem from "./XrayItem";

// "Chụp X-quang & chẩn đoán hình ảnh": X-ray orders of this visit. onRequest opens the order form (owned by the parent).
const XraySection = ({ films = [], onRequest, onView }) => (
    <ClinicalExamSection
        title="Chụp X-quang & chẩn đoán hình ảnh"
        action={
            onRequest && (
                <button type="button" className="btn btn-secondary h-8 px-3 text-caption" onClick={onRequest}>
                    <Plus className="size-4" aria-hidden="true" />
                    Chỉ định chụp X-quang
                </button>
            )
        }
    >
        {films.length === 0 ? (
            <p className="py-2 text-center text-muted">Chưa có chỉ định chụp X-quang trong buổi này.</p>
        ) : (
            <ul className="flex flex-col gap-3">
                {films.map((film) => (
                    <XrayItem key={film.id} film={film} onView={onView} />
                ))}
            </ul>
        )}
    </ClinicalExamSection>
);

export default XraySection;

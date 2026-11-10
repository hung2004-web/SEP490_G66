import ClinicalExamSection from "./ClinicalExamSection";
import XrayItem from "./XrayItem";

// "Chụp X-quang & chẩn đoán" › "Chẩn đoán hình ảnh": X-ray orders of this visit and older images.
// onRequest opens the order form (owned by the parent).
const XraySection = ({ films = [], onRequest, onView }) => (
    <div className="flex flex-col gap-3">
        <h3 className="pt-1 font-heading text-heading-3 text-ink">Chụp X-quang & chẩn đoán</h3>
        <ClinicalExamSection
            title="Chẩn đoán hình ảnh"
            action={
                onRequest && (
                    <button type="button" className="btn btn-secondary" onClick={onRequest}>
                        + Chỉ định chụp X-quang
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
    </div>
);

export default XraySection;

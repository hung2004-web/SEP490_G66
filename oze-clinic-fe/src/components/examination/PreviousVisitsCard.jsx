import ClinicalExamSection from "./ClinicalExamSection";

// "Các lần khám trước". visits: [{ id, date, doctor, summary }].
// onSupplement: copy what was found in that visit into this visit's history; onView: open the visit.
const PreviousVisitsCard = ({ visits = [], onSupplement, onView }) => (
    <ClinicalExamSection title="Các lần khám trước" divided={false} flush>
        {visits.length === 0 ? (
            <p className="border-t border-border px-5 py-6 text-center text-muted">Bệnh nhân khám lần đầu tại phòng khám.</p>
        ) : (
            <ul>
                {visits.map((visit) => (
                    <li key={visit.id} className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-caption font-semibold text-ink">
                                {visit.date} · {visit.doctor}
                            </p>
                            <p className="text-caption text-muted">{visit.summary}</p>
                        </div>
                        {onSupplement && (
                            <button type="button" className="btn btn-link text-caption font-semibold no-underline" onClick={() => onSupplement(visit)}>
                                Bổ sung
                            </button>
                        )}
                        {onView && (
                            <button type="button" className="btn btn-secondary" onClick={() => onView(visit)}>
                                Xem chi tiết
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        )}
    </ClinicalExamSection>
);

export default PreviousVisitsCard;

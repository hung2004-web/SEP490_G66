import { useState } from "react";
import ClinicalExamSection from "./ClinicalExamSection";
import VisitDetailDialog from "./VisitDetailDialog";

// "Các lần khám trước". visits: [{ id, date, doctor, summary }].
// queueId: patient in the queue; "Xem chi tiết" opens the visit's diagnoses, plan, progress and prescription.
const PreviousVisitsCard = ({ queueId, visits = [] }) => {
    const [openVisit, setOpenVisit] = useState(null);

    return (
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
                            <button type="button" className="btn btn-secondary" onClick={() => setOpenVisit(visit)}>
                                Xem chi tiết
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {openVisit && <VisitDetailDialog queueId={queueId} visit={openVisit} onClose={() => setOpenVisit(null)} />}
        </ClinicalExamSection>
    );
};

export default PreviousVisitsCard;

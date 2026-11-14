import useHistoryAutosave from "@/hooks/useHistoryAutosave";
import MedicalHistoryCard from "@/components/examination/MedicalHistoryCard";
import PatientInfoCard from "@/components/examination/PatientInfoCard";
import PreviousVisitsCard from "@/components/examination/PreviousVisitsCard";
import StepActionBar from "@/components/examination/StepActionBar";

// Step 1 "Lập hồ sơ bệnh án": read-only identity, medical history the doctor completes (saved as a draft
// shortly after each change), previous visits. onHistoryChange gets every edit; onNext / onEnd receive the latest history.
const PatientRecordTab = ({ queueId, record, busy = false, onHistoryChange, onNext, onEnd }) => {
    const { history, setHistory, statusText } = useHistoryAutosave(queueId, record.history, onHistoryChange);

    return (
        <>
            <PatientInfoCard patient={record.patient} reason={record.intake.reason} />
            <MedicalHistoryCard history={history} gender={record.patient.gender} onChange={setHistory} />
            <PreviousVisitsCard queueId={queueId} visits={record.visits} />
            <StepActionBar status={statusText}>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onEnd?.(history)}>
                    Kết thúc lượt khám
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onNext?.(history)}>
                    Chuyển sang Khám
                </button>
            </StepActionBar>
        </>
    );
};

export default PatientRecordTab;

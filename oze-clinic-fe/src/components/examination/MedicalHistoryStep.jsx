import { toast } from "react-toastify";
import useHistoryAutosave from "@/hooks/useHistoryAutosave";
import { normalizeText } from "@/utils/format";
import MedicalHistoryCard from "./MedicalHistoryCard";
import PatientInfoCard from "./PatientInfoCard";
import PreviousVisitsCard from "./PreviousVisitsCard";
import StepActionBar from "./StepActionBar";

const mergeItems = (current, extra) => [...current, ...extra.filter((item) => !current.some((entry) => normalizeText(entry) === normalizeText(item)))];

// Step 1 "Lập hồ sơ bệnh án": read-only identity, medical history the doctor completes (saved as a draft
// shortly after each change), previous visits. onHistoryChange gets every edit; onNext / onEnd receive the latest history.
const MedicalHistoryStep = ({ queueId, record, busy = false, onHistoryChange, onNext, onEnd }) => {
    const { history, setHistory, statusText } = useHistoryAutosave(queueId, record.history, onHistoryChange);

    const handleSupplement = (visit) => {
        const items = visit.historyItems ?? [];
        const merged = mergeItems(history.dental, items);
        if (merged.length === history.dental.length) {
            toast.info(`Lần khám ${visit.date} không có mục tiền sử mới.`);
            return;
        }
        setHistory({ ...history, dental: merged });
        toast.success(`Đã bổ sung tiền sử từ lần khám ${visit.date}.`);
    };

    return (
        <>
            <PatientInfoCard patient={record.patient} reason={record.intake.reason} />
            <MedicalHistoryCard history={history} gender={record.patient.gender} onChange={setHistory} />
            <PreviousVisitsCard queueId={queueId} visits={record.visits} onSupplement={handleSupplement} />
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

export default MedicalHistoryStep;

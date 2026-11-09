import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { saveMedicalHistory } from "@/services/examinationService";
import { formatClockTime } from "@/utils/examination";
import { normalizeText } from "@/utils/format";
import MedicalHistoryCard from "./MedicalHistoryCard";
import PatientInfoCard from "./PatientInfoCard";
import PreviousVisitsCard from "./PreviousVisitsCard";
import StepActionBar from "./StepActionBar";

const AUTOSAVE_DELAY_MS = 800;

const saveStatusText = ({ saving, savedAt, failed }) => {
    if (saving) return "Đang lưu nháp…";
    if (failed) return "Chưa lưu được nháp, hệ thống sẽ thử lại khi bạn sửa tiếp.";
    return savedAt ? `Đã tự động lưu nháp lúc ${formatClockTime(savedAt)}` : "Tự động lưu nháp";
};

const mergeItems = (current, extra) => [...current, ...extra.filter((item) => !current.some((entry) => normalizeText(entry) === normalizeText(item)))];

// Step 1 "Lập hồ sơ bệnh án": read-only identity, medical history the doctor completes (saved as a draft
// shortly after each change), previous visits. onNext / onEnd receive the latest history.
const MedicalHistoryStep = ({ queueId, record, busy = false, onNext, onEnd }) => {
    const [history, setHistory] = useState(record.history);
    const [save, setSave] = useState({ saving: false, savedAt: null, failed: false });
    const lastSavedRef = useRef(JSON.stringify(record.history));

    useEffect(() => {
        const json = JSON.stringify(history);
        if (json === lastSavedRef.current) return undefined;
        const timer = setTimeout(async () => {
            setSave((current) => ({ ...current, saving: true }));
            const response = await saveMedicalHistory(queueId, history);
            if (response.success) {
                lastSavedRef.current = json;
                setSave({ saving: false, savedAt: response.data.savedAt, failed: false });
            } else {
                setSave((current) => ({ ...current, saving: false, failed: true }));
            }
        }, AUTOSAVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [history, queueId]);

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
            <PreviousVisitsCard
                visits={record.visits}
                onSupplement={handleSupplement}
                onView={(visit) => toast.info(`Chi tiết lần khám ${visit.date} sẽ mở ở trang Bệnh nhân (đang xây dựng).`)}
            />
            <StepActionBar status={saveStatusText(save)}>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onNext?.(history)}>
                    Chuyển sang Khám
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onEnd?.(history)}>
                    Kết thúc lượt khám
                </button>
            </StepActionBar>
        </>
    );
};

export default MedicalHistoryStep;

import { useEffect, useRef, useState } from "react";
import { saveMedicalHistory } from "@/services/examinationService";
import { formatClockTime } from "@/utils/examination";

const AUTOSAVE_DELAY_MS = 800;

const statusTextOf = ({ saving, savedAt, failed }) => {
    if (saving) return "Đang lưu nháp…";
    if (failed) return "Chưa lưu được nháp, hệ thống sẽ thử lại khi bạn sửa tiếp.";
    return savedAt ? `Đã tự động lưu nháp lúc ${formatClockTime(savedAt)}` : "Tự động lưu nháp";
};

// Medical history edited by the doctor, saved as a draft shortly after each change.
// onChange gets every new value so the page keeps its copy in sync. A change still waiting to be saved
// is saved right away when the component unmounts (e.g. the doctor starts the exam meanwhile).
export default function useHistoryAutosave(queueId, initialHistory, onChange) {
    const [history, setHistoryState] = useState(initialHistory);
    const [save, setSave] = useState({ saving: false, savedAt: null, failed: false });
    const lastSavedRef = useRef(JSON.stringify(initialHistory));
    const latestRef = useRef(initialHistory);

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

    useEffect(() => {
        const saved = lastSavedRef;
        const latest = latestRef;
        return () => {
            if (JSON.stringify(latest.current) !== saved.current) saveMedicalHistory(queueId, latest.current);
        };
    }, [queueId]);

    const setHistory = (next) => {
        latestRef.current = next;
        setHistoryState(next);
        onChange?.(next);
    };

    return { history, setHistory, statusText: statusTextOf(save) };
}

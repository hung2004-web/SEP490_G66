import { useEffect, useRef, useState } from "react";
import { formatClockTime } from "@/utils/examination";

const AUTOSAVE_DELAY_MS = 800;

const statusTextOf = ({ saving, savedAt, failed }) => {
    if (saving) return "Đang lưu nháp…";
    if (failed) return "Chưa lưu được nháp, hệ thống sẽ thử lại khi bạn sửa tiếp.";
    return savedAt ? `Đã lưu nháp lúc ${formatClockTime(savedAt)} · tự động lưu` : "Tự động lưu nháp";
};

// A draft the doctor edits, saved shortly after each change with save(value) -> { success, data: { savedAt } }.
// onChange gets every new value so the page keeps its copy in sync. A change still waiting to be saved
// is saved right away when the component unmounts. saveNow() saves at once (the "Lưu nháp" button).
export default function useAutosave(save, initialValue, onChange) {
    const [value, setValueState] = useState(initialValue);
    const [status, setStatus] = useState({ saving: false, savedAt: null, failed: false });
    const lastSavedRef = useRef(JSON.stringify(initialValue));
    const latestRef = useRef(initialValue);
    const saveRef = useRef(save);

    useEffect(() => {
        saveRef.current = save;
    });

    const persist = async (next) => {
        const json = JSON.stringify(next);
        setStatus((current) => ({ ...current, saving: true }));
        const response = await saveRef.current(next);
        if (response.success) {
            lastSavedRef.current = json;
            setStatus({ saving: false, savedAt: response.data.savedAt, failed: false });
        } else {
            setStatus((current) => ({ ...current, saving: false, failed: true }));
        }
        return response;
    };

    useEffect(() => {
        if (JSON.stringify(value) === lastSavedRef.current) return undefined;
        const timer = setTimeout(() => persist(value), AUTOSAVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [value]);

    useEffect(() => {
        const saved = lastSavedRef;
        const latest = latestRef;
        const saveFn = saveRef;
        return () => {
            if (JSON.stringify(latest.current) !== saved.current) saveFn.current(latest.current);
        };
    }, []);

    const setValue = (next) => {
        latestRef.current = next;
        setValueState(next);
        onChange?.(next);
    };

    return { value, setValue, saving: status.saving, statusText: statusTextOf(status), saveNow: () => persist(latestRef.current) };
}

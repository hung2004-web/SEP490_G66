import { saveMedicalHistory } from "@/services/examinationService";
import useAutosave from "./useAutosave";

// Medical history edited by the doctor (step 1 and the "Hồ sơ bệnh nhân" tab), saved as a draft after each change.
export default function useHistoryAutosave(queueId, initialHistory, onChange) {
    const { value, setValue, statusText } = useAutosave((history) => saveMedicalHistory(queueId, history), initialHistory, onChange);
    return { history: value, setHistory: setValue, statusText };
}

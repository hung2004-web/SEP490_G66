import { useState } from "react";
import { toast } from "react-toastify";
import { formatClockTime } from "@/utils/examination";
import { toToothCode } from "@/utils/medicalRecord";
import AllergyAlert from "./AllergyAlert";
import DiagnosisSection from "./DiagnosisSection";
import ExamDentalChart from "./ExamDentalChart";
import ExamFooterBar from "./ExamFooterBar";
import SymptomSection from "./SymptomSection";
import ToothConditionTable from "./ToothConditionTable";
import ToothEditor from "./ToothEditor";
import XraySection from "./XraySection";

// Step 2 "Khám & Chẩn đoán". initial: { symptoms, note, entries, films, diagnoses } (sample data until the API exists).
// The X-ray order and diagnosis picker dialogs come with their own task, so their buttons are not shown yet.
const ClinicalExamStep = ({ allergies = [], initial, busy = false, onComplete, onEnd }) => {
    const [symptoms, setSymptoms] = useState(initial.symptoms);
    const [note, setNote] = useState(initial.note);
    const [entries, setEntries] = useState(initial.entries);
    const [diagnoses, setDiagnoses] = useState(initial.diagnoses);
    const [selectedTooth, setSelectedTooth] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [savedAt, setSavedAt] = useState(null);

    const editingEntry = entries.find((entry) => entry.id === editingId) ?? null;

    const selectTooth = (tooth) => {
        setSelectedTooth(tooth);
        setEditingId(entries.find((entry) => toToothCode(entry.tooth) === tooth)?.id ?? null);
    };

    const selectEntry = (entry) => {
        setSelectedTooth(toToothCode(entry.tooth));
        setEditingId(entry.id);
    };

    const saveEntry = (entry) => {
        if (entry.id != null) {
            setEntries(entries.map((item) => (item.id === entry.id ? entry : item)));
            toast.success(`Đã cập nhật ghi nhận răng ${entry.tooth}.`);
            return;
        }
        const added = { ...entry, id: Date.now() };
        setEntries([...entries, added]);
        setEditingId(added.id);
        toast.success(`Đã thêm ghi nhận răng ${entry.tooth}.`);
    };

    const removeEntry = (entry) => {
        setEntries(entries.filter((item) => item.id !== entry.id));
        setEditingId(null);
        toast.success(`Đã xoá ghi nhận răng ${entry.tooth}.`);
    };

    const exam = () => ({ symptoms, note, entries, diagnoses });

    return (
        <>
            <AllergyAlert allergies={allergies} />
            <SymptomSection value={symptoms} note={note} onChange={setSymptoms} onNoteChange={setNote} />
            <ExamDentalChart
                entries={entries}
                selectedTooth={selectedTooth}
                onSelectTooth={selectTooth}
                action={
                    selectedTooth &&
                    editingId != null && (
                        <button type="button" className="btn btn-secondary h-8 px-3 text-caption" onClick={() => setEditingId(null)}>
                            + Ghi nhận mới cho răng {selectedTooth}
                        </button>
                    )
                }
            >
                <ToothEditor tooth={selectedTooth} entry={editingEntry} onSave={saveEntry} onRemove={removeEntry} onClose={() => setSelectedTooth(null)} />
            </ExamDentalChart>
            <ToothConditionTable entries={entries} selectedTooth={selectedTooth} onSelectEntry={selectEntry} />
            <XraySection films={initial.films} />
            <DiagnosisSection items={diagnoses} onRemove={(id) => setDiagnoses(diagnoses.filter((item) => item.id !== id))} />
            <ExamFooterBar
                saving={busy}
                savedAt={savedAt && formatClockTime(savedAt)}
                onSaveDraft={() => {
                    setSavedAt(Date.now());
                    toast.success("Đã lưu nháp.");
                }}
                onEnd={() => onEnd?.(exam())}
                onComplete={() => onComplete?.(exam())}
            />
        </>
    );
};

export default ClinicalExamStep;

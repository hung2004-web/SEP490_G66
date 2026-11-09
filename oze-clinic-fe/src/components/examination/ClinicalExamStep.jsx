import { useState } from "react";
import { toast } from "react-toastify";
import useAutosave from "@/hooks/useAutosave";
import useSession from "@/hooks/useSession";
import { requestXray, saveExamDraft } from "@/services/examinationService";
import { CHART_TYPE, CHILD_CHART_MAX_AGE, isPrimaryTooth } from "@/utils/examination";
import AllergyAlert from "./AllergyAlert";
import DiagnosisDialog from "./DiagnosisDialog";
import DiagnosisSection from "./DiagnosisSection";
import ExamDentalChart from "./ExamDentalChart";
import StepActionBar from "./StepActionBar";
import SymptomSection from "./SymptomSection";
import ToothConditionTable from "./ToothConditionTable";
import ToothEntryDialog from "./ToothEntryDialog";
import ToothPanel from "./ToothPanel";
import XrayRequestDialog from "./XrayRequestDialog";
import XraySection from "./XraySection";

const COMPLETE_HINT = "Cần ít nhất một chẩn đoán xác định để chuyển sang lập kế hoạch điều trị.";

const newId = (prefix) => `${prefix}-${Date.now()}`;

// Step 2 "Khám & Chẩn đoán": symptoms, dental chart findings, X-ray orders and final diagnoses.
// record.exam is the saved draft ({ symptoms, note, entries, films, diagnoses }); every change is saved
// automatically and passed to onExamChange so the page keeps it when the doctor moves between steps.
const ClinicalExamStep = ({ queueId, record, busy = false, onExamChange, onComplete, onEnd }) => {
    const { userName } = useSession();
    const { value: exam, setValue: setExam, statusText, saving, saveNow } = useAutosave((draft) => saveExamDraft(queueId, draft), record.exam, onExamChange);
    const [chartType, setChartType] = useState(record.patient.age <= CHILD_CHART_MAX_AGE ? CHART_TYPE.CHILD : CHART_TYPE.ADULT);
    const [selectedTooth, setSelectedTooth] = useState(null);
    const [editingEntry, setEditingEntry] = useState(null);
    const [diagnosisDialog, setDiagnosisDialog] = useState(null); // { diagnosis } while open
    const [xrayOpen, setXrayOpen] = useState(false);
    const [sendingXray, setSendingXray] = useState(false);

    const set = (key, value) => setExam({ ...exam, [key]: value });
    const recordedTeeth = [...new Set(exam.entries.map((entry) => Number(entry.tooth)))].sort((a, b) => a - b);

    const changeChartType = (type) => {
        setChartType(type);
        if (selectedTooth && isPrimaryTooth(selectedTooth) !== (type === CHART_TYPE.CHILD)) setSelectedTooth(null);
    };

    const addEntry = (entry) => {
        set("entries", [...exam.entries, { ...entry, id: newId("tooth") }]);
        toast.success(`Đã thêm ghi nhận răng ${entry.tooth}.`);
    };

    const saveEntry = (entry) => {
        set("entries", exam.entries.map((item) => (item.id === entry.id ? entry : item)));
        setEditingEntry(null);
        toast.success(`Đã cập nhật ghi nhận răng ${entry.tooth}.`);
    };

    const removeEntry = (entry) => {
        set("entries", exam.entries.filter((item) => item.id !== entry.id));
        toast.success(`Đã xoá "${entry.condition}" của răng ${entry.tooth}.`);
    };

    const selectToothFromTable = (tooth) => {
        changeChartType(isPrimaryTooth(tooth) ? CHART_TYPE.CHILD : CHART_TYPE.ADULT);
        setSelectedTooth(tooth);
    };

    const saveDiagnosis = (diagnosis) => {
        const exists = diagnosis.id != null;
        set("diagnoses", exists ? exam.diagnoses.map((item) => (item.id === diagnosis.id ? diagnosis : item)) : [...exam.diagnoses, { ...diagnosis, id: newId("diag") }]);
        setDiagnosisDialog(null);
        toast.success(exists ? `Đã cập nhật chẩn đoán ${diagnosis.code}.` : `Đã thêm chẩn đoán ${diagnosis.code}.`);
    };

    const sendXray = async (request) => {
        setSendingXray(true);
        const response = await requestXray(queueId, request);
        setSendingXray(false);
        if (!response.success) {
            toast.error(response.message);
            return;
        }
        set("films", [...response.data, ...exam.films]);
        setXrayOpen(false);
        toast.success(response.message);
    };

    const saveDraft = async () => {
        const response = await saveNow();
        if (response.success) toast.success("Đã lưu nháp.");
        else toast.error("Chưa lưu được nháp, thử lại sau.");
    };

    const complete = async () => {
        const response = await saveNow();
        if (response.success) onComplete?.(exam);
        else toast.error("Chưa lưu được nháp, thử lại sau.");
    };

    const birthYear = record.patient.birthdate?.slice(0, 4);
    const canComplete = exam.diagnoses.length > 0;

    return (
        <>
            <AllergyAlert allergies={record.history.allergies} />
            <SymptomSection value={exam.symptoms} note={exam.note} onChange={(symptoms) => set("symptoms", symptoms)} onNoteChange={(note) => set("note", note)} />
            <ExamDentalChart
                entries={exam.entries}
                chartType={chartType}
                onChartTypeChange={changeChartType}
                selectedTooth={selectedTooth}
                onSelectTooth={(tooth) => setSelectedTooth(tooth === selectedTooth ? null : tooth)}
            >
                {selectedTooth && (
                    <ToothPanel
                        key={selectedTooth}
                        tooth={selectedTooth}
                        entries={exam.entries.filter((entry) => Number(entry.tooth) === selectedTooth)}
                        onAdd={addEntry}
                        onEdit={setEditingEntry}
                        onRemove={removeEntry}
                        onClose={() => setSelectedTooth(null)}
                    />
                )}
            </ExamDentalChart>
            <ToothConditionTable entries={exam.entries} selectedTooth={selectedTooth} onSelectTooth={selectToothFromTable} onEdit={setEditingEntry} onRemove={removeEntry} />
            <XraySection
                films={exam.films}
                onRequest={() => setXrayOpen(true)}
                onView={(film) => toast.info(`Màn xem & duyệt ảnh ${film.code} sẽ làm ở phần "Xem & duyệt ảnh".`)}
            />
            <DiagnosisSection
                items={exam.diagnoses}
                onAdd={() => setDiagnosisDialog({ diagnosis: null })}
                onEdit={(diagnosis) => setDiagnosisDialog({ diagnosis })}
                onRemove={(diagnosis) => {
                    set("diagnoses", exam.diagnoses.filter((item) => item.id !== diagnosis.id));
                    toast.success(`Đã xoá chẩn đoán ${diagnosis.code}.`);
                }}
            />
            <StepActionBar status={canComplete ? statusText : `${statusText} · ${COMPLETE_HINT}`}>
                <button type="button" className="btn btn-secondary" disabled={busy || saving} onClick={saveDraft}>
                    Lưu nháp
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onEnd?.(exam)}>
                    Kết thúc lượt khám
                </button>
                <button
                    type="button"
                    className="btn btn-primary h-auto min-h-control py-2 text-center whitespace-normal"
                    disabled={busy || !canComplete}
                    onClick={complete}
                >
                    Hoàn thành & chuyển sang Lập kế hoạch điều trị
                </button>
            </StepActionBar>

            {editingEntry && <ToothEntryDialog entry={editingEntry} onSave={saveEntry} onClose={() => setEditingEntry(null)} />}
            {diagnosisDialog && (
                <DiagnosisDialog
                    diagnosis={diagnosisDialog.diagnosis}
                    recordedTeeth={recordedTeeth}
                    usedCodes={exam.diagnoses.map((item) => item.code)}
                    onSave={saveDiagnosis}
                    onClose={() => setDiagnosisDialog(null)}
                />
            )}
            {xrayOpen && (
                <XrayRequestDialog
                    subtitle={[record.patient.name, birthYear && `sinh ${birthYear}`, userName && `BS. ${userName}`].filter(Boolean).join(" · ")}
                    defaultArea={selectedTooth ? `Răng ${selectedTooth}` : ""}
                    busy={sendingXray}
                    onSubmit={sendXray}
                    onClose={() => setXrayOpen(false)}
                />
            )}
        </>
    );
};

export default ClinicalExamStep;

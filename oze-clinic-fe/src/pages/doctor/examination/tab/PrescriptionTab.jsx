import { useState } from "react";
import { toast } from "react-toastify";
import useAutosave from "@/hooks/useAutosave";
import { savePrescriptionDraft } from "@/services/examinationService";
import { GENERIC_ERROR_MESSAGE } from "@/utils/messages";
import AllergyAlert from "@/components/examination/AllergyAlert";
import PrescriptionErrorAlert from "@/components/examination/PrescriptionErrorAlert";
import PrescriptionItemDeleteDialog from "@/components/examination/PrescriptionItemDeleteDialog";
import PrescriptionItemDialog from "@/components/examination/PrescriptionItemDialog";
import PrescriptionNoteCard from "@/components/examination/PrescriptionNoteCard";
import PrescriptionTable from "@/components/examination/PrescriptionTable";
import StepActionBar from "@/components/examination/StepActionBar";

// TODO(api): contraindication warnings come from the AI check ({ [itemId]: message }); none until it is connected.
const NO_WARNINGS = {};

// Step 5 "Kê đơn thuốc", the last step: the medicines of this visit and the prescription's note.
// record.prescription is the saved draft ({ items, notes, status }); changes are saved automatically and passed to
// onPrescriptionChange. "Hoàn tất & kết thúc lượt khám" saves, then onEnd (the page confirms, the visit's end finalizes
// the prescription). A visit without medicine can be completed too.
const PrescriptionTab = ({ queueId, record, busy = false, onPrescriptionChange, onEnd }) => {
    const { value: prescription, setValue: setPrescription, statusText, saveNow } = useAutosave(
        (value) => savePrescriptionDraft(queueId, value),
        record.prescription,
        onPrescriptionChange
    );
    const [dialog, setDialog] = useState(null); // { type: "add" | "edit" | "delete", item? }
    const [saveError, setSaveError] = useState("");
    const [working, setWorking] = useState(false);

    const setItems = (items) => setPrescription({ ...prescription, items });

    const saveItem = (item) => {
        if (dialog.type === "add") {
            setItems([...prescription.items, { ...item, id: `rx-${Date.now()}` }]);
            toast.success("Đã thêm thuốc vào đơn.");
        } else {
            setItems(prescription.items.map((entry) => (entry.id === item.id ? item : entry)));
            toast.success("Đã lưu thay đổi.");
        }
        setDialog(null);
    };

    const removeItem = () => {
        setItems(prescription.items.filter((entry) => entry.id !== dialog.item.id));
        toast.success("Đã xoá thuốc khỏi đơn.");
        setDialog(null);
    };

    const save = async () => {
        const response = await saveNow();
        setSaveError(response.success ? "" : (response.message ?? GENERIC_ERROR_MESSAGE));
        return response.success;
    };

    const finish = async () => {
        setWorking(true);
        const saved = await save();
        setWorking(false);
        if (saved) onEnd();
    };

    const disabled = busy || working;

    return (
        <>
            <PrescriptionErrorAlert message={saveError} />
            <AllergyAlert allergies={record.history.allergies} />
            <PrescriptionTable
                items={prescription.items}
                warnings={NO_WARNINGS}
                onAdd={() => setDialog({ type: "add" })}
                onEdit={(item) => setDialog({ type: "edit", item })}
                onRemove={(item) => setDialog({ type: "delete", item })}
            />
            <PrescriptionNoteCard value={prescription.notes} onChange={(notes) => setPrescription({ ...prescription, notes })} />
            <StepActionBar status={statusText}>
                <button type="button" className="btn btn-secondary" disabled={disabled} onClick={save}>
                    Lưu nháp
                </button>
                <button type="button" className="btn btn-primary" disabled={disabled} onClick={finish}>
                    {working && <span className="btn-spinner" aria-hidden="true" />}
                    Hoàn tất & kết thúc lượt khám
                </button>
            </StepActionBar>

            {(dialog?.type === "add" || dialog?.type === "edit") && <PrescriptionItemDialog item={dialog.item ?? null} onSave={saveItem} onClose={() => setDialog(null)} />}
            {dialog?.type === "delete" && <PrescriptionItemDeleteDialog item={dialog.item} onConfirm={removeItem} onClose={() => setDialog(null)} />}
        </>
    );
};

export default PrescriptionTab;

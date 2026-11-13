import { quantityText } from "@/utils/examination";
import ConfirmExamDialog from "./ConfirmExamDialog";

// "Xoá thuốc khỏi đơn?": names the medicine (with its strength) and its quantity.
const PrescriptionItemDeleteDialog = ({ item, busy = false, onConfirm, onClose }) => {
    const name = [item.medicationName, item.dosage].filter(Boolean).join(" ");
    const quantity = item.quantity ? ` · số lượng ${quantityText(item)}` : "";

    return (
        <ConfirmExamDialog
            title="Xoá thuốc khỏi đơn?"
            description={`${name}${quantity} sẽ bị xoá khỏi đơn thuốc của lượt khám này.`}
            confirmLabel="Xoá thuốc"
            danger
            busy={busy}
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
};

export default PrescriptionItemDeleteDialog;

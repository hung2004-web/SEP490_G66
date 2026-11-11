import { formatNumber } from "@/utils/format";
import ConfirmExamDialog from "./ConfirmExamDialog";

// "Xoá nội dung điều trị?": names the item and its price, which leaves this session's invoice.
const TreatmentItemDeleteDialog = ({ item, busy = false, onConfirm, onClose }) => (
    <ConfirmExamDialog
        title="Xoá nội dung điều trị?"
        description={`${item.content.replace(/[.\s]+$/, "")} · ${formatNumber(item.price)} ₫ sẽ bị xoá khỏi hoá đơn buổi khám này.`}
        confirmLabel="Xoá nội dung"
        danger
        busy={busy}
        onConfirm={onConfirm}
        onClose={onClose}
    />
);

export default TreatmentItemDeleteDialog;

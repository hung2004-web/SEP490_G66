import { CircleAlert } from "lucide-react";
import { cx } from "@/utils/cx";

// "Không thể lưu đơn thuốc" above the prescription: why the API refused to save it (e.g. no medicine to finalize).
// AI warnings do not go here: they are advice and never block saving.
// Renders nothing without a message.
const PrescriptionErrorAlert = ({ title = "Không thể lưu đơn thuốc", message, className }) => {
    if (!message) return null;

    return (
        <div role="alert" className={cx("alert alert-danger", className)}>
            <CircleAlert className="mt-px size-4.5 shrink-0" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-semibold">{title}</p>
                <p className="text-body">{message}</p>
            </div>
        </div>
    );
};

export default PrescriptionErrorAlert;

import { useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "react-toastify";
import AppointmentSummary from "@/components/appointment/AppointmentSummary";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { cancelMyAppointment } from "@/services/patientDashboardService";
import { formatDate, formatTime } from "@/utils/format";
import { APPOINTMENT_CHANGE_DEADLINE_HOURS, CANCEL_REASON_MAX_LENGTH, CLINIC_HOTLINE, GENERIC_ERROR_MESSAGE, MESSAGES } from "@/utils/messages";

const REASON_ID = "cancel-reason";

const BLOCK_MESSAGES = {
    status: MESSAGES.MSG31.replace("[số điện thoại]", CLINIC_HOTLINE.DISPLAY),
    deadline: MESSAGES.MSG13.replace("[số giờ]", String(APPOINTMENT_CHANGE_DEADLINE_HOURS)),
};

const BLOCK_BY_CODE = { NOT_ALLOWED: "status", DEADLINE: "deadline" };

const getSuccessMessage = (appointment) =>
    MESSAGES.MSG29.replace("[ngày]", formatDate(appointment.appointmentDate)).replace("[giờ]", formatTime(appointment.timeSlotStart));

const CancelAppointmentModal = ({ appointment, blocked, recheck, onClose, onCancelled, onNotFound }) => {
    const closeRef = useRef(null);
    const reasonRef = useRef(null);
    const [reason, setReason] = useState("");
    const [reasonError, setReasonError] = useState(null);
    const [formAlert, setFormAlert] = useState(null);
    const [sending, setSending] = useState(false);

    const close = () => onClose({ refetch: Boolean(blocked || formAlert?.refetch) });

    if (blocked) {
        return (
            <Modal title="Hủy lịch hẹn" onClose={close} initialFocusRef={closeRef}>
                <div className="mt-6 flex flex-col gap-4">
                    <AppointmentSummary appointment={appointment} />
                    <div role="alert" className="alert alert-danger">
                        {BLOCK_MESSAGES[blocked]}
                    </div>
                </div>
                <div className="modal-actions">
                    <button ref={closeRef} type="button" className="btn btn-secondary" onClick={close}>
                        Đóng
                    </button>
                </div>
            </Modal>
        );
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!reason.trim()) {
            setReasonError(MESSAGES.MSG30);
            reasonRef.current?.focus();
            return;
        }
        const block = recheck();
        if (block) {
            setFormAlert({ message: BLOCK_MESSAGES[block], refetch: true });
            return;
        }

        setFormAlert(null);
        setSending(true);
        const result = await cancelMyAppointment(appointment.id, { reason });
        if (result.success) {
            toast.success(getSuccessMessage(appointment));
            onCancelled(result.data);
            return;
        }
        setSending(false);
        if (result.code === "NOT_FOUND") {
            onNotFound();
            return;
        }
        const resultBlock = BLOCK_BY_CODE[result.code];
        setFormAlert(resultBlock ? { message: BLOCK_MESSAGES[resultBlock], refetch: true } : { message: result.message || GENERIC_ERROR_MESSAGE, refetch: false });
    };

    return (
        <Modal title="Hủy lịch hẹn" onClose={close} closeDisabled={sending}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <AppointmentSummary appointment={appointment} />
                {formAlert && (
                    <div role="alert" className="alert alert-danger">
                        {formAlert.message}
                    </div>
                )}
                <FormField id={REASON_ID} label="Lý do hủy" required error={reasonError}>
                    <textarea
                        ref={reasonRef}
                        id={REASON_ID}
                        name="reason"
                        className="input"
                        rows={3}
                        placeholder="Nhập lý do hủy lịch"
                        maxLength={CANCEL_REASON_MAX_LENGTH}
                        value={reason}
                        disabled={sending}
                        aria-invalid={Boolean(reasonError)}
                        aria-describedby={reasonError ? `${REASON_ID}-error` : undefined}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setReasonError(null);
                        }}
                    />
                </FormField>
                <div className="alert alert-warning">
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                    <p>{"Sau khi hủy, ca khám sẽ được trả lại cho bệnh nhân khác. Lịch hẹn vẫn được lưu với trạng thái \"Đã hủy\"."}</p>
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={sending} onClick={close}>
                        Giữ lịch hẹn
                    </button>
                    <button type="submit" className="btn btn-danger" disabled={sending}>
                        {sending && <span className="btn-spinner" aria-hidden="true" />}
                        {sending ? "Đang gửi..." : "Xác nhận hủy lịch"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CancelAppointmentModal;

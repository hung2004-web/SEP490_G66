import { useRef, useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { LEAVE_REQUEST_STATUSES, LEAVE_REQUEST_STATUS_LABELS, LEAVE_SLOT_OPTIONS } from "@/utils/data/mockShifts";
import { formatDateTime } from "@/utils/format";
import RejectLeaveRequestPopup from "./RejectLeaveRequestPopup";

const AffectedAppointments = ({ request, pending }) => (
    <section aria-labelledby="leave-affected-title" className="field">
        <h3 id="leave-affected-title" className="label">
            Lịch hẹn bị ảnh hưởng
        </h3>
        {pending && (
            <p className="alert alert-warning border-0">
                {request.affectedAppointments.length} lịch hẹn của {request.senderName} trong ngày nghỉ. Khi duyệt, lịch hẹn chuyển sang người thay và lễ
                tân báo lại cho bệnh nhân.
            </p>
        )}
        <div className="table-wrap mt-2">
            <table className="table">
                <thead>
                    <tr>
                        <th scope="col">Giờ</th>
                        <th scope="col">Bệnh nhân</th>
                        <th scope="col">Dịch vụ</th>
                    </tr>
                </thead>
                <tbody>
                    {request.affectedAppointments.map((appointment) => (
                        <tr key={appointment.id}>
                            <td className="num whitespace-nowrap">{appointment.time}</td>
                            <td className="font-semibold text-ink">{appointment.patientName}</td>
                            <td>{appointment.serviceName}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </section>
);

// "Đơn xin nghỉ" popup: what was requested is read only. A pending request needs a substitute to approve, or a reason to reject.
// request: { senderName, senderRole, submittedAt, date, slot, reason, status, substituteName, rejectReason,
// affectedAppointments: [{ id, time, patientName, serviceName }] }. substituteOptions: [{ value, label }].
// onApprove(substituteId) and onReject(reason) save the decision; the parent closes the popup when that succeeds.
const LeaveRequestDetailPopup = ({ request, substituteOptions, onClose, onApprove, onReject }) => {
    const [substituteId, setSubstituteId] = useState("");
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    // Modal would pick the first field, which is disabled here and cannot take focus.
    const focusRef = useRef(null);

    const pending = request.status === LEAVE_REQUEST_STATUSES.PENDING;
    const rejected = request.status === LEAVE_REQUEST_STATUSES.REJECTED;

    const handleApprove = async (event) => {
        event.preventDefault();
        if (!substituteId) {
            setError("Vui lòng chọn người thay.");
            focusRef.current?.focus();
            return;
        }

        setSaving(true);
        await onApprove(substituteId);
        setSaving(false);
    };

    return (
        <Modal
            title={
                <span className="flex flex-wrap items-center gap-2">
                    Đơn xin nghỉ
                    {!pending && <StatusBadge status={request.status} labels={LEAVE_REQUEST_STATUS_LABELS} />}
                </span>
            }
            description={`Gửi lúc ${formatDateTime(request.submittedAt)}`}
            onClose={onClose}
            initialFocusRef={focusRef}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleApprove} className="mt-6 flex flex-col gap-4">
                <FormField id="leave-sender" label="Người gửi">
                    <input id="leave-sender" className="input" disabled value={`${request.senderName} · ${request.senderRole}`} />
                </FormField>

                <div className="field">
                    <FormField id="leave-date" label="Ngày nghỉ">
                        <input id="leave-date" type="date" className="input" disabled value={request.date} />
                    </FormField>
                    <div role="group" aria-label="Buổi nghỉ" className="mt-2 flex flex-wrap items-center gap-6">
                        {LEAVE_SLOT_OPTIONS.map((option) => (
                            <label key={option.label} className="flex items-center gap-2 text-body-sm text-ink">
                                <input type="radio" name="leave-slot" className="size-4" disabled readOnly checked={request.slot === option.value} />
                                {option.label}
                            </label>
                        ))}
                    </div>
                </div>

                <FormField id="leave-reason" label="Lý do">
                    <textarea id="leave-reason" className="input" rows={3} disabled value={request.reason} />
                </FormField>

                {pending && (
                    <FormField id="leave-substitute" label="Người thay" required error={error}>
                        <select
                            ref={focusRef}
                            id="leave-substitute"
                            className="input"
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? "leave-substitute-error" : undefined}
                            value={substituteId}
                            onChange={(event) => {
                                setSubstituteId(event.target.value);
                                setError(null);
                            }}
                        >
                            <option value="">Chọn người thay</option>
                            {substituteOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </FormField>
                )}
                {request.status === LEAVE_REQUEST_STATUSES.APPROVED && (
                    <FormField id="leave-substitute" label="Người thay">
                        <input id="leave-substitute" className="input" disabled value={request.substituteName ?? "—"} />
                    </FormField>
                )}
                {rejected && (
                    <FormField id="leave-reject-reason-view" label="Lý do từ chối">
                        <textarea id="leave-reject-reason-view" className="input" rows={3} disabled value={request.rejectReason} />
                    </FormField>
                )}

                {!rejected && request.affectedAppointments.length > 0 && <AffectedAppointments request={request} pending={pending} />}

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    {pending ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-secondary border-danger-solid text-danger"
                                disabled={saving}
                                onClick={() => setRejecting(true)}
                            >
                                Từ chối
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving && <span className="btn-spinner" aria-hidden="true" />}
                                Duyệt đơn
                            </button>
                        </>
                    ) : (
                        <button ref={focusRef} type="button" className="btn btn-secondary" onClick={onClose}>
                            Đóng
                        </button>
                    )}
                </div>
            </form>

            {rejecting && <RejectLeaveRequestPopup request={request} onClose={() => setRejecting(false)} onSubmit={onReject} />}
        </Modal>
    );
};

export default LeaveRequestDetailPopup;

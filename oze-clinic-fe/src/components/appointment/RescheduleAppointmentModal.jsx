import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import AppointmentSummary from "@/components/appointment/AppointmentSummary";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import useAsync from "@/hooks/useAsync";
import { getAvailableSlots, getDoctorOptions, getRescheduleDates, rescheduleMyAppointment } from "@/services/patientDashboardService";
import { cx } from "@/utils/cx";
import { formatDate, formatDateTime, formatTime, toClinicDateTime } from "@/utils/format";
import { CLINIC_HOTLINE, GENERIC_ERROR_MESSAGE, MESSAGES, PATIENT_APPOINTMENT_STATUS, RESCHEDULE_REASON_MAX_LENGTH, VALIDATION_MESSAGES } from "@/utils/messages";
import { invalidMessage, requiredMessage } from "@/utils/validation";

const DATE_ID = "reschedule-date";
const DOCTOR_ID = "reschedule-doctor";
const SLOTS_ID = "reschedule-slots";
const REASON_ID = "reschedule-reason";
const SLOT_SKELETON_COUNT = 6;

const formatSlotStart = (date, time) => formatDateTime(toClinicDateTime(date, time));

const getBlockMessage = (block, appointment, status = appointment.status) => {
    if (block === "deadline") return MESSAGES.MSG33.replace("[số điện thoại]", CLINIC_HOTLINE.DISPLAY);
    const label = Object.hasOwn(PATIENT_APPOINTMENT_STATUS, status) ? PATIENT_APPOINTMENT_STATUS[status].label : "";
    return MESSAGES.MSG01.replace("[trạng thái]", label).replace("[thời gian]", formatSlotStart(appointment.appointmentDate, appointment.timeSlotStart));
};

const BLOCK_BY_CODE = { NOT_ALLOWED: "status", DEADLINE: "deadline" };

const getDateError = (value, dates) => {
    if (!value) return requiredMessage("ngày khám mới");
    return value < dates.min || value > dates.max ? invalidMessage("Ngày khám mới") : null;
};

const getSuccessMessage = (appointment) =>
    MESSAGES.MSG32.replace("[ngày]", formatDate(appointment.appointmentDate))
        .replace("[giờ]", formatTime(appointment.timeSlotStart))
        .replace("[bác sĩ]", appointment.doctorName);

const RescheduleAppointmentModal = ({ appointment, blocked, recheck, onClose, onRescheduled, onNotFound }) => {
    const closeRef = useRef(null);
    const dateRef = useRef(null);
    const slotsRef = useRef(null);
    const focusSlotRef = useRef(false);
    const [dates] = useState(() => getRescheduleDates(appointment));
    const [date, setDate] = useState(dates.initial);
    const [doctorId, setDoctorId] = useState("");
    const [slot, setSlot] = useState(null);
    const [reason, setReason] = useState("");
    const [dateError, setDateError] = useState(null);
    const [slotError, setSlotError] = useState(null);
    const [formAlert, setFormAlert] = useState(null);
    const [sending, setSending] = useState(false);
    const [slotsVersion, setSlotsVersion] = useState(0);

    const dateValid = !blocked && !getDateError(date, dates);
    const slotsKey = `${date}|${doctorId}|${slotsVersion}`;
    const slotsState = useAsync(
        () =>
            dateValid
                ? getAvailableSlots({ date, doctorId, appointmentId: appointment.id }).then((result) => ({ key: slotsKey, result }))
                : Promise.resolve({ key: slotsKey, result: null }),
        [slotsKey, dateValid],
    );
    const slotsResult = slotsState.value?.key === slotsKey ? slotsState.value.result : undefined;
    const slotsLoading = dateValid && (slotsState.loading || (!slotsState.error && slotsResult === undefined));
    const slotsLoaded = slotsResult?.success === true && Array.isArray(slotsResult.data);
    const slots = slotsLoaded ? slotsResult.data : [];
    const hasFreeSlot = slots.some((item) => item.available);

    const focusFirstSlot = () => (slotsRef.current?.querySelector("button:not([disabled])") ?? dateRef.current)?.focus();

    useEffect(() => {
        if (!focusSlotRef.current || slotsLoading) return;
        focusSlotRef.current = false;
        focusFirstSlot();
    });

    const close = () => onClose({ refetch: Boolean(blocked || formAlert?.refetch) });

    if (blocked) {
        return (
            <Modal title="Đổi lịch hẹn" onClose={close} initialFocusRef={closeRef}>
                <div className="mt-6 flex flex-col gap-4">
                    <AppointmentSummary appointment={appointment} />
                    <div role="alert" className="alert alert-danger">
                        {getBlockMessage(blocked, appointment)}
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

    const changeDate = (event) => {
        const value = event.target.value;
        setDate(value);
        setSlot(null);
        setSlotError(null);
        setDateError(value ? getDateError(value, dates) : null);
    };

    const changeDoctor = (event) => {
        setDoctorId(event.target.value);
        setSlot(null);
        setSlotError(null);
    };

    const chooseSlot = (item) => {
        setSlot(item);
        setSlotError(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const error = getDateError(date, dates);
        if (error) {
            setDateError(error);
            dateRef.current?.focus();
            return;
        }
        if (!slot) {
            setSlotError(VALIDATION_MESSAGES.SLOT_REQUIRED);
            focusFirstSlot();
            return;
        }
        const block = recheck();
        if (block) {
            setFormAlert({ message: getBlockMessage(block, appointment), refetch: true });
            return;
        }

        setFormAlert(null);
        setSlotError(null);
        setSending(true);
        const result = await rescheduleMyAppointment(appointment.id, { date, timeSlotStart: slot.slotStart, doctorId, reason: reason.trim() });
        if (result.success) {
            toast.success(getSuccessMessage(result.data.appointment));
            onRescheduled(result.data);
            return;
        }
        setSending(false);
        if (result.code === "NOT_FOUND") {
            onNotFound();
            return;
        }
        if (result.code === "OVERLAP") {
            setSlotError(MESSAGES.MSG76.replace("[Mục]", "Khung giờ này").replace("[thời gian]", formatSlotStart(date, slot.slotStart)));
            return;
        }
        if (result.code === "SLOT_TAKEN") {
            setSlot(null);
            setSlotError(MESSAGES.MSG34);
            focusSlotRef.current = true;
            setSlotsVersion((version) => version + 1);
            return;
        }
        const resultBlock = BLOCK_BY_CODE[result.code];
        setFormAlert(
            resultBlock
                ? { message: getBlockMessage(resultBlock, appointment, result.data?.status), refetch: true }
                : { message: result.message || GENERIC_ERROR_MESSAGE, refetch: false },
        );
    };

    const renderSlots = () => {
        if (!dateValid) return null;
        if (slotsLoading) {
            return (
                <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({ length: SLOT_SKELETON_COUNT }, (_, index) => (
                        <div key={index} className="skeleton h-12" />
                    ))}
                </div>
            );
        }
        if (!slotsLoaded) {
            return (
                <div role="alert" className="alert alert-danger">
                    {GENERIC_ERROR_MESSAGE}
                </div>
            );
        }
        if (!hasFreeSlot) {
            return <p className="help-text">{MESSAGES.MSG76.replace("[Mục]", "Ca khám").replace("[thời gian]", `ngày ${formatDate(date)}`)}</p>;
        }
        return (
            <div
                ref={slotsRef}
                role="group"
                aria-labelledby={`${SLOTS_ID}-label`}
                aria-describedby={slotError ? `${SLOTS_ID}-error` : undefined}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
                {slots.map((item) => {
                    const selected = slot?.slotStart === item.slotStart;
                    return (
                        <button
                            key={item.slotStart}
                            type="button"
                            aria-pressed={selected}
                            disabled={!item.available || sending}
                            onClick={() => chooseSlot(item)}
                            className={cx("btn btn-lg", selected ? "btn-primary" : "btn-secondary")}
                        >
                            <span className="num">{formatTime(item.slotStart)}</span>
                            {!item.available && (
                                <>
                                    {" "}
                                    <span className="text-caption">Hết chỗ</span>
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <Modal title="Đổi lịch hẹn" onClose={close} closeDisabled={sending}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <AppointmentSummary
                    appointment={appointment}
                    next={slot && { appointmentDate: date, timeSlotStart: slot.slotStart, timeSlotEnd: slot.slotEnd }}
                />
                {formAlert && (
                    <div role="alert" className="alert alert-danger">
                        {formAlert.message}
                    </div>
                )}
                <FormField id={DATE_ID} label="Ngày khám mới" required error={dateError}>
                    <input
                        ref={dateRef}
                        id={DATE_ID}
                        name="date"
                        type="date"
                        className="input"
                        min={dates.min}
                        max={dates.max}
                        value={date}
                        disabled={sending}
                        aria-invalid={Boolean(dateError)}
                        aria-describedby={dateError ? `${DATE_ID}-error` : undefined}
                        onChange={changeDate}
                    />
                </FormField>
                <FormField id={DOCTOR_ID} label="Bác sĩ">
                    <select id={DOCTOR_ID} name="doctorId" className="input" value={doctorId} disabled={sending} onChange={changeDoctor}>
                        <option value="">Phòng khám sắp xếp</option>
                        {getDoctorOptions().map((doctor) => (
                            <option key={doctor.doctorId} value={String(doctor.doctorId)}>
                                {doctor.doctorName}
                            </option>
                        ))}
                    </select>
                </FormField>
                <div className="field">
                    <p id={`${SLOTS_ID}-label`} className="label label-required">
                        Ca khám mới
                    </p>
                    {renderSlots()}
                    {slotError && (
                        <p id={`${SLOTS_ID}-error`} className="error-text">
                            {slotError}
                        </p>
                    )}
                </div>
                <FormField id={REASON_ID} label="Lý do đổi lịch">
                    <textarea
                        id={REASON_ID}
                        name="reason"
                        className="input"
                        rows={3}
                        placeholder="Nhập lý do (không bắt buộc)"
                        maxLength={RESCHEDULE_REASON_MAX_LENGTH}
                        value={reason}
                        disabled={sending}
                        onChange={(event) => setReason(event.target.value)}
                    />
                </FormField>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={sending} onClick={close}>
                        Hủy bỏ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={sending}>
                        {sending && <span className="btn-spinner" aria-hidden="true" />}
                        {sending ? "Đang gửi..." : "Xác nhận đổi lịch"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RescheduleAppointmentModal;

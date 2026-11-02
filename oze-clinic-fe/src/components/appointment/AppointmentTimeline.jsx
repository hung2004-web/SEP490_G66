import { Check, X } from "lucide-react";
import { cx } from "@/utils/cx";
import { formatClock, formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import { APPOINTMENT_STATUS, PAYMENT_STATUS } from "@/utils/messages";

const STEP_LABELS = ["Đặt lịch thành công", "Phòng khám xác nhận lịch", "Check-in tại quầy lễ tân", "Khám bệnh", "Thanh toán"];

const STATE_WORDS = { done: "Đã xong: ", current: "Đang thực hiện: ", upcoming: "Chưa tới: ", terminal: "Kết thúc: " };

const UNPAID_STATUSES = [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIALLY_PAID];

const joinParts = (...parts) => parts.filter(Boolean).join(" · ");

const getDoneLines = (appointment, invoice, queueNumber) => [
    formatDateTime(appointment.createdAt),
    formatDateTime(appointment.confirmedAt),
    joinParts(formatDateTime(appointment.checkInAt), queueNumber && `Số ${queueNumber}`, appointment.queue?.roomName),
    joinParts([formatClock(appointment.startedAt), formatClock(appointment.completedAt)].filter(Boolean).join(" – "), appointment.doctorName),
    joinParts(formatDateTime(invoice?.payment?.paidAt), invoice?.invoiceNumber, formatCurrency(invoice?.finalAmount)),
];

const getPlan = (appointment, invoice) => {
    const confirmedSteps = appointment.confirmedAt ? 2 : 1;
    switch (appointment.status) {
        case APPOINTMENT_STATUS.PENDING:
            return { done: 1, current: "Đang chờ phòng khám xác nhận" };
        case APPOINTMENT_STATUS.CONFIRMED:
            return { done: 2, current: "Vào ngày khám" };
        case APPOINTMENT_STATUS.CHECKED_IN:
            return { done: 3, current: "Vui lòng chờ gọi số" };
        case APPOINTMENT_STATUS.IN_SERVICE:
            return { done: 3, current: appointment.startedAt ? `Bắt đầu ${formatClock(appointment.startedAt)}` : "Đang khám" };
        case APPOINTMENT_STATUS.COMPLETED:
            if (invoice?.paymentStatus === PAYMENT_STATUS.PAID) return { done: 5 };
            if (UNPAID_STATUSES.includes(invoice?.paymentStatus)) return { done: 4, current: "Vui lòng thanh toán tại quầy lễ tân" };
            return { done: 4 };
        case APPOINTMENT_STATUS.CANCELLED: {
            const cancelledAt = formatDateTime(appointment.cancelledAt);
            return { done: confirmedSteps, terminal: { label: joinParts("Đã hủy lịch", cancelledAt), marker: "bg-neutral" } };
        }
        case APPOINTMENT_STATUS.NO_SHOW:
            return { done: confirmedSteps, terminal: { label: joinParts("Không đến khám", formatDate(appointment.appointmentDate)), marker: "bg-danger-solid" } };
        default:
            return { done: 1 };
    }
};

const buildSteps = (appointment, invoice, queueNumber) => {
    const plan = getPlan(appointment, invoice);
    const lines = getDoneLines(appointment, invoice, queueNumber);
    const steps = STEP_LABELS.map((label, index) => {
        if (index < plan.done) return { label, state: "done", line: lines[index] };
        if (index === plan.done && plan.current) return { label, state: "current", line: plan.current };
        return { label, state: "upcoming", line: "" };
    });
    if (!plan.terminal) return steps;
    return [...steps.slice(0, plan.done), { label: plan.terminal.label, state: "terminal", marker: plan.terminal.marker, line: "" }];
};

const MARKER_CLASSES = {
    done: "bg-success-solid text-on-primary",
    current: "border-2 border-primary bg-canvas",
    upcoming: "border-2 border-border-strong bg-canvas",
};

const LABEL_CLASSES = {
    done: "text-title text-ink",
    terminal: "text-title text-ink",
    current: "text-title font-semibold text-ink",
    upcoming: "text-title text-muted",
};

const AppointmentTimeline = ({ appointment, invoice, queueNumber }) => {
    const steps = buildSteps(appointment, invoice, queueNumber);

    return (
        <ol>
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                const nextDone = steps[index + 1]?.state === "done";
                return (
                    <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className={cx("relative flex gap-3", !isLast && "pb-6")}>
                        {!isLast && (
                            <span
                                aria-hidden="true"
                                className={cx("absolute bottom-0 left-3 top-6 w-0.5 -translate-x-1/2", step.state === "done" && nextDone ? "bg-success-solid" : "bg-border")}
                            />
                        )}
                        <span
                            aria-hidden="true"
                            className={cx("flex size-6 shrink-0 items-center justify-center rounded-full", step.state === "terminal" ? cx(step.marker, "text-on-primary") : MARKER_CLASSES[step.state])}
                        >
                            {step.state === "done" && <Check className="size-4" />}
                            {step.state === "terminal" && <X className="size-4" />}
                        </span>
                        <div className="min-w-0">
                            <p className={cx("num", LABEL_CLASSES[step.state])}>
                                <span className="sr-only">{STATE_WORDS[step.state]}</span>
                                {step.label}
                            </p>
                            {step.line && <p className="num text-caption text-muted">{step.line}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

export default AppointmentTimeline;

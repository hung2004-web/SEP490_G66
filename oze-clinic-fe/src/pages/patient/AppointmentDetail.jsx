import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Phone, RefreshCw } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AppointmentNextStep from "@/components/appointment/AppointmentNextStep";
import CancelAppointmentModal from "@/components/appointment/CancelAppointmentModal";
import DashboardSection from "@/components/dashboard/DashboardSection";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import StatusBadge from "@/components/ui/StatusBadge";
import useAsync from "@/hooks/useAsync";
import { cx } from "@/utils/cx";
import { getChangeDeadline, getMyAppointmentDetail, isChangeAllowed } from "@/services/patientDashboardService";
import { formatClock, formatDate, formatDateTime, formatTime, formatWeekday } from "@/utils/format";
import { APPOINTMENT_STATUS, CLINIC_ADDRESS, CLINIC_HOTLINE, EXAMINATION_STATUS, GENERIC_ERROR_MESSAGE, MESSAGES, PATIENT_APPOINTMENT_STATUS, QUEUE_STATUS } from "@/utils/messages";
import {
    IMAGING_QUEUE_BADGE,
    PATIENT_QUEUE_BADGE,
    PATIENT_QUEUE_STATE,
    formatQueueNumber,
    getPatientQueueState,
    getPeopleAheadText,
    isInClinic,
} from "@/utils/patientQueue";
import { ROUTES, getMedicalRecordDetailRoute } from "@/utils/routes";

const APPOINTMENT_ID_PATTERN = /^[1-9]\d{0,17}$/;
const NOT_FOUND_TOAST_ID = "appointment-not-found";
const DEFAULT_TITLE = "Chi tiết lịch hẹn";
const EMPTY_VALUE = "—";
const BACK_LABEL = "Quay lại Lịch hẹn của tôi";
const FINISHED_EXAMINATION_STATUSES = [EXAMINATION_STATUS.COMPLETED, EXAMINATION_STATUS.LOCKED];
const CLOSED_STATUSES = [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW];
const MOBILE_ACTION_CLASS = "col-span-2 min-h-11 md:min-h-0";

const TEXT = {
    CHANGE_TITLE: "Đổi hoặc hủy lịch",
    DEADLINE_LABEL: "Hạn hủy trực tuyến",
    DEADLINE_PASSED: "Đã quá hạn",
    AFTER_TITLE: "Sau buổi khám",
    RESULT_TITLE: "Kết quả khám",
    RESULT_TEXT: "Chẩn đoán, đơn thuốc, hẹn tái khám",
    PAYMENT_TITLE: "Thanh toán",
    PAYMENT_TEXT: "Hóa đơn và số tiền còn lại",
    SUPPORT_TITLE: "Cần hỗ trợ?",
    SUPPORT_IN_CLINIC: "Đang ở phòng khám: hỏi trực tiếp lễ tân tại quầy.",
    SUPPORT_CLOSED: "Gọi hotline nếu bạn cần hỏi về lịch hẹn này.",
    CALL: `Gọi ${CLINIC_HOTLINE.DISPLAY}`,
    QUEUE_NUMBER: "Số thứ tự",
    ROOM: "Phòng",
    QUEUE_STATE: "Trạng thái",
    PEOPLE_AHEAD: "Người trước bạn",
    NO_QUEUE_VALUE: "Chưa có – hỏi lễ tân",
    NO_ROOM_VALUE: "Chưa xếp phòng – bạn sẽ được báo khi gọi số",
    IMAGING_NUMBER: "Số chụp phim",
    IMAGING_NUMBER_PENDING: "Lễ tân sẽ báo khi gọi",
    IMAGING_ROOM: "Phòng chụp phim",
    IMAGING_ROOM_PENDING: "Lễ tân sẽ chỉ phòng khi gọi số",
    EXAM_NUMBER: "Số khám",
    EXAM_NUMBER_NOTE: "Dùng lại sau khi chụp",
    UPDATED_AT: (time) => `Cập nhật lúc ${time}`,
    UPDATE_FAILED: "Chưa cập nhật được",
    REFRESH_LABEL: "Cập nhật số thứ tự",
};

const PEOPLE_AHEAD_STATES = [PATIENT_QUEUE_STATE.WAITING, PATIENT_QUEUE_STATE.SKIPPED];

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const toDetailResource = ({ loading, error, value }) => {
    if (loading) return { loading: true, failed: false, notFound: false, detail: null };
    if (!error && value?.success === true && value.data === null) return { loading: false, failed: false, notFound: true, detail: null };
    const failed = Boolean(error) || value?.success !== true || !isPlainObject(value.data) || !isPlainObject(value.data.appointment);
    return { loading: false, failed, notFound: false, detail: failed ? null : value.data };
};

const getInfoItems = (appointment) => {
    const items = [
        { label: "Dịch vụ", value: appointment.serviceName },
        { label: "Bác sĩ", value: appointment.doctorName || "Phòng khám sắp xếp" },
        { label: "Ngày khám", value: [formatWeekday(appointment.appointmentDate), formatDate(appointment.appointmentDate)].filter(Boolean).join(", "), numeric: true },
        { label: "Giờ khám", value: formatTime(appointment.timeSlotStart), numeric: true },
        { label: "Cơ sở", value: CLINIC_ADDRESS },
    ];
    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) items.push({ label: "Lý do hủy", value: appointment.cancellationReason });
    const checkInAt = isInClinic(appointment) ? formatClock(appointment.checkInAt) : "";
    if (checkInAt) items.push({ label: "Báo có mặt lúc", value: checkInAt, numeric: true });
    return items;
};

const getResultRoute = (appointment) =>
    appointment.examinationId != null && FINISHED_EXAMINATION_STATUSES.includes(appointment.examinationStatus)
        ? getMedicalRecordDetailRoute(appointment.examinationId)
        : ROUTES.MEDICAL_RECORD;

const getDeadlineText = (appointment, now) => {
    const deadline = getChangeDeadline(appointment);
    if (!deadline) return EMPTY_VALUE;
    return now < deadline ? formatDateTime(deadline) : TEXT.DEADLINE_PASSED;
};

const BigNumber = ({ value, success = false }) => (
    <span className={cx("num font-heading text-heading-2 font-bold", success ? "text-success" : "text-primary")}>{value}</span>
);

const Pending = ({ children }) => <span className="text-muted">{children}</span>;

const getQueueCells = (appointment, state) => {
    const queue = appointment.queue;
    const queueNumber = formatQueueNumber(queue?.queueNumber);
    if (state === PATIENT_QUEUE_STATE.NO_QUEUE) return [{ label: TEXT.QUEUE_NUMBER, value: <span className="text-warning">{TEXT.NO_QUEUE_VALUE}</span> }];
    const stateCell = { label: TEXT.QUEUE_STATE, value: <StatusBadge status={state} labels={PATIENT_QUEUE_BADGE} /> };
    if (!queueNumber) return [stateCell];
    if (state === PATIENT_QUEUE_STATE.IMAGING) {
        const imaging = queue.imaging;
        const imagingNumber = formatQueueNumber(imaging.queueNumber);
        return [
            { label: TEXT.IMAGING_NUMBER, value: imagingNumber ? <BigNumber value={imagingNumber} /> : <Pending>{TEXT.IMAGING_NUMBER_PENDING}</Pending> },
            { label: TEXT.IMAGING_ROOM, value: imaging.roomName || <Pending>{TEXT.IMAGING_ROOM_PENDING}</Pending> },
            {
                label: TEXT.QUEUE_STATE,
                value: <StatusBadge status={imaging.status === QUEUE_STATUS.CALLED ? QUEUE_STATUS.CALLED : QUEUE_STATUS.WAITING} labels={IMAGING_QUEUE_BADGE} />,
            },
            {
                label: TEXT.EXAM_NUMBER,
                value: (
                    <>
                        <span className="num">{queueNumber}</span>
                        <span className="block text-caption text-muted">{TEXT.EXAM_NUMBER_NOTE}</span>
                    </>
                ),
            },
        ];
    }
    const cells = [
        { label: TEXT.QUEUE_NUMBER, value: <BigNumber value={queueNumber} success={state === PATIENT_QUEUE_STATE.CALLED} /> },
        { label: TEXT.ROOM, value: queue.roomName || <Pending>{TEXT.NO_ROOM_VALUE}</Pending> },
        stateCell,
    ];
    const peopleAhead = PEOPLE_AHEAD_STATES.includes(state) ? getPeopleAheadText(queue.peopleAhead) : null;
    if (peopleAhead) cells.push({ label: TEXT.PEOPLE_AHEAD, value: <span className="num">{peopleAhead}</span> });
    return cells;
};

const QueueStrip = ({ appointment }) => {
    const state = getPatientQueueState(appointment);
    if (!state) return null;
    const cells = getQueueCells(appointment, state);
    return (
        <div className="rounded-md bg-surface-tint px-4 py-4">
            <dl className={cx("grid gap-x-6 gap-y-4", cells.length > 2 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2")}>
                {cells.map((cell) => (
                    <div key={cell.label} className="min-w-0">
                        <dt className="text-caption text-muted">{cell.label}</dt>
                        <dd className="mt-1 text-body-md text-ink">{cell.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
};

const RefreshStatus = ({ updatedAt, refreshError, onRefresh }) => (
    <span className={cx("num inline-flex items-center gap-1 text-caption", refreshError ? "text-warning" : "text-muted")}>
        {refreshError ? TEXT.UPDATE_FAILED : TEXT.UPDATED_AT(updatedAt)}
        <button type="button" className="btn btn-secondary btn-icon size-8" aria-label={TEXT.REFRESH_LABEL} onClick={onRefresh}>
            <RefreshCw aria-hidden="true" className="size-4" />
        </button>
    </span>
);

const LoadingState = () => (
    <div aria-busy="true">
        <div aria-hidden="true" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="skeleton h-8 w-64" />
                <div className="skeleton h-6 w-24" />
            </div>
            <div className="skeleton h-16 w-full" />
            <div className="grid items-start gap-6 lg:grid-cols-3">
                <div className="skeleton h-72 lg:col-span-2" />
                <div className="skeleton h-40" />
            </div>
        </div>
    </div>
);

const ErrorState = ({ onRetry }) => (
    <div className="card-app empty-state py-16">
        <p className="empty-state-title">Không thể tải lịch hẹn</p>
        <p className="empty-state-text">{GENERIC_ERROR_MESSAGE}</p>
        <button type="button" className="btn btn-primary mt-4" onClick={onRetry}>
            Thử lại
        </button>
    </div>
);

const getChangeBlock = (appointment, now = new Date()) => {
    if (appointment.status !== APPOINTMENT_STATUS.PENDING) return "status";
    return isChangeAllowed(appointment, now) ? null : "deadline";
};

const getHeaderActions = (appointment, changeAllowed, onCancel) => {
    if (changeAllowed) {
        return (
            <button type="button" className={`btn btn-secondary text-danger hover:border-danger-solid hover:text-danger ${MOBILE_ACTION_CLASS}`} onClick={onCancel}>
                Hủy lịch
            </button>
        );
    }
    if (CLOSED_STATUSES.includes(appointment.status)) {
        return (
            <Link to={ROUTES.BOOK_APPOINTMENT} className={`btn btn-primary ${MOBILE_ACTION_CLASS}`}>
                Đặt lịch mới
            </Link>
        );
    }
    return null;
};

const HotlineButton = () => (
    <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="btn btn-secondary w-full">
        <Phone aria-hidden="true" className="size-4" />
        <span className="num">{TEXT.CALL}</span>
    </a>
);

const LinkRow = ({ to, title, text }) => (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 hover:border-primary hover:bg-surface-tint">
        <span>
            <span className="block text-body-md font-semibold text-ink">{title}</span>
            <span className="block text-body-sm text-muted">{text}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
    </Link>
);

const SidePanel = ({ appointment, now }) => {
    switch (appointment.status) {
        case APPOINTMENT_STATUS.PENDING:
            return (
                <DashboardSection id="appointment-change" title={TEXT.CHANGE_TITLE}>
                    <div className="rounded-md bg-warning-soft px-4 py-3">
                        <p className="text-caption text-warning">{TEXT.DEADLINE_LABEL}</p>
                        <p className="num text-title text-ink">{getDeadlineText(appointment, now)}</p>
                    </div>
                    <HotlineButton />
                </DashboardSection>
            );
        case APPOINTMENT_STATUS.CONFIRMED:
            return (
                <DashboardSection id="appointment-change" title={TEXT.CHANGE_TITLE}>
                    <HotlineButton />
                </DashboardSection>
            );
        case APPOINTMENT_STATUS.COMPLETED:
            return (
                <DashboardSection id="appointment-after" title={TEXT.AFTER_TITLE}>
                    <LinkRow to={getResultRoute(appointment)} title={TEXT.RESULT_TITLE} text={TEXT.RESULT_TEXT} />
                    <LinkRow to={ROUTES.PAYMENT_HISTORY} title={TEXT.PAYMENT_TITLE} text={TEXT.PAYMENT_TEXT} />
                </DashboardSection>
            );
        default:
            return (
                <DashboardSection id="appointment-support" title={TEXT.SUPPORT_TITLE}>
                    <p className="text-body-sm">{isInClinic(appointment) ? TEXT.SUPPORT_IN_CLINIC : TEXT.SUPPORT_CLOSED}</p>
                    <HotlineButton />
                </DashboardSection>
            );
    }
};

const LoadedState = ({ detail, titleRef, now, updatedAt, refreshError, onRefresh, onCancel }) => {
    const { appointment } = detail;
    const showRefresh = isInClinic(appointment) && Boolean(formatQueueNumber(appointment.queue?.queueNumber)) && Boolean(updatedAt);
    const actions = getHeaderActions(appointment, isChangeAllowed(appointment, now), onCancel);

    return (
        <>
            <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <h1 ref={titleRef} tabIndex={-1} className="page-title">
                        {appointment.appointmentCode ? `Lịch hẹn ${appointment.appointmentCode}` : DEFAULT_TITLE}
                    </h1>
                    <StatusBadge status={appointment.status} labels={PATIENT_APPOINTMENT_STATUS} />
                </div>
                {actions && <div className="grid grid-cols-2 gap-3 md:flex md:shrink-0">{actions}</div>}
            </header>
            <AppointmentNextStep appointment={appointment} refreshError={refreshError} updatedAt={updatedAt} className="mb-6" />
            <div className="grid items-start gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                    <DashboardSection
                        id="appointment-info"
                        title="Thông tin lịch hẹn"
                        badge={showRefresh && <RefreshStatus updatedAt={updatedAt} refreshError={refreshError} onRefresh={onRefresh} />}
                    >
                        <QueueStrip appointment={appointment} />
                        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                            {getInfoItems(appointment).map((item) => (
                                <div key={item.label} className="min-w-0">
                                    <dt className="text-caption text-muted">{item.label}</dt>
                                    <dd className={cx("mt-1 text-body-md text-ink", item.numeric && "num")}>{item.value || EMPTY_VALUE}</dd>
                                </div>
                            ))}
                        </dl>
                    </DashboardSection>
                </div>
                <SidePanel appointment={appointment} now={now} />
            </div>
        </>
    );
};

const AppointmentDetail = () => {
    const { appointmentId = "" } = useParams();
    const navigate = useNavigate();
    const validId = APPOINTMENT_ID_PATTERN.test(appointmentId);
    const [retryCount, setRetryCount] = useState(0);
    const [localDetail, setLocalDetail] = useState(null);
    const [popup, setPopup] = useState(null);
    const [actionNotFound, setActionNotFound] = useState(false);
    const titleRef = useRef(null);
    const focusRequestRef = useRef(null);
    const redirectedRef = useRef(false);
    const asyncState = useAsync(
        () => (validId ? getMyAppointmentDetail(appointmentId).then((value) => ({ ...value, receivedAt: new Date() })) : Promise.resolve(null)),
        [appointmentId, validId, retryCount],
    );
    const resource = toDetailResource(asyncState);
    const notFound = !validId || resource.notFound || actionNotFound;
    const detail = localDetail ?? resource.detail;

    useEffect(() => {
        if (!notFound) return;
        toast.error(MESSAGES.MSG23, { toastId: NOT_FOUND_TOAST_ID });
        if (redirectedRef.current) return;
        redirectedRef.current = true;
        navigate(ROUTES.APPOINTMENTS, { replace: true });
    }, [notFound, navigate]);

    useEffect(() => {
        const request = focusRequestRef.current;
        if (!request || popup || asyncState.loading) return;
        if (request.refetch && asyncState.value === request.value && asyncState.error === request.error) return;
        focusRequestRef.current = null;
        const active = document.activeElement;
        if (titleRef.current && (!active || active === document.body || !active.isConnected)) titleRef.current.focus();
    });

    const requestTitleFocus = (refetch) => {
        focusRequestRef.current = refetch ? { refetch, value: asyncState.value, error: asyncState.error } : { refetch };
        if (!refetch) return;
        setLocalDetail(null);
        setRetryCount((count) => count + 1);
    };

    const openCancel = () => setPopup({ blocked: getChangeBlock(detail.appointment) });

    const closePopup = ({ refetch }) => {
        setPopup(null);
        requestTitleFocus(refetch);
    };

    const handleChanged = (nextDetail) => {
        setPopup(null);
        setLocalDetail(nextDetail);
        requestTitleFocus(false);
    };

    const handleActionNotFound = () => {
        setPopup(null);
        setActionNotFound(true);
    };

    const crumb = detail?.appointment.appointmentCode || DEFAULT_TITLE;

    return (
        <>
            <div className="mb-6 flex items-center gap-3">
                <Link to={ROUTES.APPOINTMENTS} aria-label={BACK_LABEL} title={BACK_LABEL} className="btn btn-secondary btn-icon">
                    <ChevronLeft aria-hidden="true" className="size-4" />
                </Link>
                <Breadcrumb items={[{ label: "Lịch hẹn của tôi", href: ROUTES.APPOINTMENTS }, { label: crumb }]} />
            </div>
            {resource.failed && !localDetail && !notFound && <ErrorState onRetry={() => requestTitleFocus(true)} />}
            {detail && !notFound && (
                <LoadedState detail={detail} titleRef={titleRef} now={new Date()} updatedAt={formatClock(asyncState.value?.receivedAt)} refreshError={false} onCancel={openCancel} />
            )}
            {(resource.loading || notFound) && <LoadingState />}
            {popup && detail && !notFound && (
                <CancelAppointmentModal
                    appointment={detail.appointment}
                    blocked={popup.blocked}
                    recheck={() => getChangeBlock(detail.appointment)}
                    onClose={closePopup}
                    onCancelled={handleChanged}
                    onNotFound={handleActionNotFound}
                />
            )}
        </>
    );
};

export default AppointmentDetail;

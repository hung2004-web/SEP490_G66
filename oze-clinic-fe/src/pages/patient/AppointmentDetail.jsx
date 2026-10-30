import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AppointmentNextStep from "@/components/appointment/AppointmentNextStep";
import AppointmentPayment from "@/components/appointment/AppointmentPayment";
import AppointmentPolicy from "@/components/appointment/AppointmentPolicy";
import AppointmentQueueCard from "@/components/appointment/AppointmentQueueCard";
import AppointmentResult from "@/components/appointment/AppointmentResult";
import AppointmentSupportCard from "@/components/appointment/AppointmentSupportCard";
import AppointmentTimeline from "@/components/appointment/AppointmentTimeline";
import CancelAppointmentModal from "@/components/appointment/CancelAppointmentModal";
import DashboardSection from "@/components/dashboard/DashboardSection";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import StatusBadge from "@/components/ui/StatusBadge";
import useAsync from "@/hooks/useAsync";
import { getMyAppointmentDetail, isChangeAllowed } from "@/services/patientDashboardService";
import { formatDate, formatDateTime, formatTimeRange, formatWeekday } from "@/utils/format";
import { APPOINTMENT_STATUS, CLINIC_ADDRESS, EXAMINATION_STATUS, GENERIC_ERROR_MESSAGE, MESSAGES, PATIENT_APPOINTMENT_STATUS } from "@/utils/messages";
import { ROUTES, getMedicalRecordDetailRoute } from "@/utils/routes";

const APPOINTMENT_ID_PATTERN = /^[1-9]\d{0,17}$/;
const NOT_FOUND_TOAST_ID = "appointment-not-found";
const DEFAULT_TITLE = "Chi tiết lịch hẹn";
const EMPTY_VALUE = "—";
const BACK_LABEL = "Quay lại Lịch hẹn của tôi";
const FINISHED_EXAMINATION_STATUSES = [EXAMINATION_STATUS.COMPLETED, EXAMINATION_STATUS.LOCKED];
const IN_CLINIC_STATUSES = [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_SERVICE];
const CHANGE_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED];
const CLOSED_STATUSES = [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW];

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const toDetailResource = ({ loading, error, value }) => {
    if (loading) return { loading: true, failed: false, notFound: false, detail: null };
    if (!error && value?.success === true && value.data === null) return { loading: false, failed: false, notFound: true, detail: null };
    const failed = Boolean(error) || value?.success !== true || !isPlainObject(value.data) || !isPlainObject(value.data.appointment);
    return { loading: false, failed, notFound: false, detail: failed ? null : value.data };
};

const padQueueNumber = (value) => String(value).padStart(2, "0");

const joinParts = (...parts) => parts.filter(Boolean).join(" · ");

const getInfoItems = (appointment, queueNumber) => {
    const inClinic = IN_CLINIC_STATUSES.includes(appointment.status);
    const items = [
        { label: "Dịch vụ", value: appointment.serviceName },
        { label: "Bác sĩ", value: appointment.doctorName || "Phòng khám sắp xếp" },
        { label: "Ngày khám", value: [formatWeekday(appointment.appointmentDate), formatDate(appointment.appointmentDate)].filter(Boolean).join(", ") },
        { label: "Ca khám", value: formatTimeRange(appointment.timeSlotStart, appointment.timeSlotEnd) },
        inClinic
            ? { label: "Phòng · Số thứ tự", value: joinParts(appointment.queue?.roomName, queueNumber && `Số ${queueNumber}`) }
            : { label: "Cơ sở", value: CLINIC_ADDRESS },
        { label: "Bệnh nhân", value: joinParts(appointment.patientName, appointment.patientCode) },
    ];
    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) items.push({ label: "Lý do hủy", value: appointment.cancellationReason, wide: true });
    return items;
};

const LoadingState = () => (
    <div aria-busy="true">
        <div aria-hidden="true" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="skeleton h-8 w-64" />
                <div className="skeleton h-6 w-24" />
            </div>
            <div className="skeleton h-16 w-full" />
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="flex flex-col gap-6 xl:col-span-2">
                    <div className="skeleton h-56" />
                    <div className="skeleton h-72" />
                </div>
                <div className="flex flex-col gap-6">
                    <div className="skeleton h-48" />
                    <div className="skeleton h-32" />
                </div>
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
            <>
                <button
                    type="button"
                    className="btn btn-secondary min-h-11 text-danger hover:border-danger-solid hover:text-danger md:min-h-0"
                    onClick={onCancel}
                >
                    Hủy lịch
                </button>
                <button type="button" className="btn btn-primary min-h-11 md:min-h-0">
                    Đổi lịch
                </button>
            </>
        );
    }
    if (
        appointment.status === APPOINTMENT_STATUS.COMPLETED &&
        appointment.examinationId != null &&
        FINISHED_EXAMINATION_STATUSES.includes(appointment.examinationStatus)
    ) {
        return (
            <Link to={getMedicalRecordDetailRoute(appointment.examinationId)} className="btn btn-primary col-span-2 min-h-11 md:min-h-0">
                Xem chi tiết lần khám
            </Link>
        );
    }
    if (CLOSED_STATUSES.includes(appointment.status)) {
        return (
            <Link to={ROUTES.BOOK_APPOINTMENT} className="btn btn-primary col-span-2 min-h-11 md:min-h-0">
                Đặt lịch mới
            </Link>
        );
    }
    return null;
};

const LoadedState = ({ detail, titleRef, now, onCancel }) => {
    const { appointment, invoice, examination, followUp } = detail;
    const queueNumber = appointment.queue?.queueNumber != null ? padQueueNumber(appointment.queue.queueNumber) : null;
    const changeAllowed = isChangeAllowed(appointment, now);
    const summary =
        appointment.status === APPOINTMENT_STATUS.COMPLETED && FINISHED_EXAMINATION_STATUSES.includes(appointment.examinationStatus) ? examination : null;
    const actions = getHeaderActions(appointment, changeAllowed, onCancel);
    const createdAt = formatDateTime(appointment.createdAt);
    const inClinic = IN_CLINIC_STATUSES.includes(appointment.status);

    return (
        <>
            <div className="mb-6 flex flex-wrap items-start gap-4">
                <div className="order-1 w-full md:order-1 md:w-auto md:flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 ref={titleRef} tabIndex={-1} className="page-title">
                            {appointment.appointmentCode ? `Lịch hẹn ${appointment.appointmentCode}` : DEFAULT_TITLE}
                        </h1>
                        <StatusBadge status={appointment.status} labels={PATIENT_APPOINTMENT_STATUS} />
                    </div>
                    {createdAt && <p className="page-description num">Đặt lúc {createdAt}</p>}
                </div>
                {actions && <div className="order-3 grid w-full grid-cols-2 gap-3 md:order-2 md:flex md:w-auto">{actions}</div>}
                <AppointmentNextStep
                    appointment={appointment}
                    changeAllowed={changeAllowed}
                    hasResult={Boolean(summary || invoice)}
                    queueNumber={queueNumber}
                    className="order-2 w-full md:order-3"
                />
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="flex flex-col gap-6 xl:col-span-2">
                    <DashboardSection id="appointment-info" title="Thông tin lịch hẹn">
                        <dl className="grid gap-4 sm:grid-cols-2">
                            {getInfoItems(appointment, queueNumber).map((item) => (
                                <div key={item.label} className={item.wide ? "sm:col-span-2" : undefined}>
                                    <dt className="text-caption text-muted">{item.label}</dt>
                                    <dd className="mt-1 text-body-md text-ink">{item.value || EMPTY_VALUE}</dd>
                                </div>
                            ))}
                        </dl>
                    </DashboardSection>
                    <DashboardSection id="appointment-timeline" title="Tiến trình lịch hẹn">
                        <AppointmentTimeline appointment={appointment} invoice={invoice} queueNumber={queueNumber} />
                    </DashboardSection>
                    {!CLOSED_STATUSES.includes(appointment.status) && <AppointmentResult summary={summary} followUp={followUp} now={now} />}
                </div>
                <div className="flex flex-col gap-6">
                    {CHANGE_STATUSES.includes(appointment.status) && <AppointmentPolicy appointment={appointment} now={now} />}
                    {inClinic && queueNumber && <AppointmentQueueCard queueNumber={queueNumber} roomName={appointment.queue.roomName} />}
                    {appointment.status === APPOINTMENT_STATUS.COMPLETED && invoice && <AppointmentPayment invoice={invoice} />}
                    <AppointmentSupportCard />
                </div>
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
        () => (validId ? getMyAppointmentDetail(appointmentId) : Promise.resolve(null)),
        [appointmentId, validId, retryCount],
    );
    const resource = toDetailResource(asyncState);
    const notFound = !validId || resource.notFound || actionNotFound;
    const detail = localDetail ?? resource.detail;

    useEffect(() => {
        if (!notFound || redirectedRef.current) return;
        redirectedRef.current = true;
        toast.error(MESSAGES.MSG23, { toastId: NOT_FOUND_TOAST_ID });
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

    const openCancel = () => setPopup({ kind: "cancel", blocked: getChangeBlock(detail.appointment) });

    const closePopup = ({ refetch }) => {
        setPopup(null);
        requestTitleFocus(refetch);
    };

    const handleCancelled = (nextDetail) => {
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
            {detail && !notFound && <LoadedState detail={detail} titleRef={titleRef} now={new Date()} onCancel={openCancel} />}
            {(resource.loading || notFound) && <LoadingState />}
            {popup?.kind === "cancel" && detail && !notFound && (
                <CancelAppointmentModal
                    appointment={detail.appointment}
                    blocked={popup.blocked}
                    recheck={() => getChangeBlock(detail.appointment)}
                    onClose={closePopup}
                    onCancelled={handleCancelled}
                    onNotFound={handleActionNotFound}
                />
            )}
        </>
    );
};

export default AppointmentDetail;

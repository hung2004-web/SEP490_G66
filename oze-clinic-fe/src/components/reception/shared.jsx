import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { PRIORITY, clinicToday, findPatientsByKeyword, getAvailableSlots } from "@/services/receptionService";
import { PRIORITY_LABEL, ddmm, dmy, hhmm, servicesOf, slotText, useSubmit } from "./receptionUtils";
import { cx } from "@/utils/cx";

// Shared pieces of the receptionist pages: formatting, status labels, page and card frames, and the dialogs.

export const Badge = ({ map, value }) => {
    const [label, badge] = map[value] ?? [value, "badge-neutral"];
    return <span className={cx("badge", badge)}>{label}</span>;
};

export const PageHeader = ({ title, description, children }) => (
    <header className="page-header">
        <div>
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-description first-letter:uppercase">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
);

// White card with a title row; link = { to, label } opens the full page of that list
export const Card = ({ title, link, actions, children, className }) => (
    <section className={cx("rounded-xl border border-border bg-canvas", className)}>
        {(title || link || actions) && (
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
                {title && <h2 className="mr-auto font-heading text-title text-ink">{title}</h2>}
                {actions}
                {link && (
                    <Link to={link.to} className="text-label font-semibold text-primary hover:underline">
                        {link.label}
                    </Link>
                )}
            </div>
        )}
        {children}
    </section>
);

export const FilterBar = ({ children }) => <div className="flex flex-wrap items-center gap-3 px-5 py-4">{children}</div>;

export const EmptyState = ({ text }) => <p className="px-6 py-10 text-center text-body-sm text-muted">{text}</p>;

export const ErrorLine = ({ message }) =>
    message ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger-solid/40 bg-danger-soft px-4 py-3 text-body-sm text-danger">
            Không tải được dữ liệu: {message}
        </p>
    ) : null;

// Pick a new day and free slot of the same doctor; services stay the same (backend rule)
export const RescheduleDialog = ({ appointment, onClose, onSubmit }) => {
    const [date, setDate] = useState(appointment.appointmentDate >= clinicToday() ? appointment.appointmentDate : clinicToday());
    const [slots, setSlots] = useState({ loading: true, items: [] });
    const [slotStart, setSlotStart] = useState("");
    const [busy, submit] = useSubmit(onSubmit);

    useEffect(() => {
        let active = true;
        getAvailableSlots({
            date,
            doctorId: appointment.doctorId,
            serviceIds: (appointment.services ?? []).map((s) => s.serviceId),
            variantIds: (appointment.services ?? []).flatMap((s) => (s.variantId ? [s.variantId] : [])),
        }).then((result) => active && setSlots({ loading: false, items: result.success ? result.data : [] }));
        return () => {
            active = false;
        };
    }, [date, appointment]);

    return (
        <Modal
            title={`Đổi lịch của ${appointment.patientName}`}
            description={`Đang hẹn ${slotText(appointment)} ngày ${dmy(appointment.appointmentDate)} với ${appointment.doctorName ?? "bác sĩ"}.`}
            onClose={onClose}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit({ date, slotStart, doctorId: appointment.doctorId });
                }}
                className="space-y-4"
            >
                <div className="field">
                    <label className="label label-required" htmlFor="rs-date">
                        Ngày mới
                    </label>
                    <input
                        id="rs-date"
                        type="date"
                        className="input"
                        min={clinicToday()}
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            setSlotStart("");
                            setSlots({ loading: true, items: [] });
                        }}
                    />
                </div>
                <fieldset className="field">
                    <legend className="label label-required">Giờ còn trống</legend>
                    {slots.loading ? (
                        <p className="text-body-sm text-muted">Đang tìm giờ trống…</p>
                    ) : slots.items.length === 0 ? (
                        <p className="text-body-sm text-muted">Bác sĩ không còn giờ trống ngày này. Chọn ngày khác.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {slots.items.map((s) => (
                                <button
                                    key={s.slotStart}
                                    type="button"
                                    aria-pressed={slotStart === s.slotStart}
                                    onClick={() => setSlotStart(s.slotStart)}
                                    className={cx(
                                        "num rounded-full border px-3 py-1 text-body-sm",
                                        slotStart === s.slotStart ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-body",
                                    )}
                                >
                                    {hhmm(s.slotStart)}
                                </button>
                            ))}
                        </div>
                    )}
                </fieldset>
                <p className="text-caption text-muted">Lễ tân đổi lịch thì lịch được xác nhận luôn và bệnh nhân nhận tin báo giờ mới.</p>
                <DialogActions onClose={onClose} submitLabel="Đổi lịch" busy={busy} disabled={!slotStart} />
            </form>
        </Modal>
    );
};

export const DialogActions = ({ onClose, submitLabel, disabled, danger, busy }) => (
    <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
        </button>
        <button type="submit" className={cx("btn", danger ? "btn-danger" : "btn-primary")} disabled={disabled || busy}>
            {busy && <span className="btn-spinner" aria-hidden />}
            {submitLabel}
        </button>
    </div>
);

const PRIORITY_REASONS = ["Đau cấp, sưng", "Chảy máu sau nhổ răng", "Trẻ nhỏ", "Người cao tuổi", "Phụ nữ mang thai", "Người khuyết tật"];

export const PriorityFields = ({ priority, setPriority, reason, setReason, idPrefix }) => (
    <>
        <fieldset className="field">
            <legend className="label">Mức ưu tiên</legend>
            <div className="flex flex-wrap gap-4 pt-1">
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-body-sm">
                        <input type="radio" name={`${idPrefix}-priority`} checked={priority === Number(value)} onChange={() => setPriority(Number(value))} />
                        {label}
                    </label>
                ))}
            </div>
        </fieldset>
        {priority > PRIORITY.NORMAL && (
            <div className="field">
                <label className="label label-required" htmlFor={`${idPrefix}-reason`}>
                    Lý do ưu tiên
                </label>
                {/* The usual reasons in one tap; anything else is typed */}
                <div className="flex flex-wrap gap-1.5">
                    {PRIORITY_REASONS.map((r) => (
                        <button
                            key={r}
                            type="button"
                            aria-pressed={reason === r}
                            onClick={() => setReason(r)}
                            className={cx(
                                "rounded-full border px-3 py-1 text-caption",
                                reason === r ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-body hover:text-ink",
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>
                <input
                    id={`${idPrefix}-reason`}
                    className="input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Hoặc ghi lý do khác"
                />
            </div>
        )}
    </>
);

export const ConfirmDialog = ({ appointment, onClose, onSubmit }) => {
    const [busy, submit] = useSubmit(onSubmit);
    return (
        <Modal title={`Xác nhận lịch của ${appointment.patientName}`} description="Gọi cho khách để kiểm tra thông tin trước khi xác nhận." onClose={onClose}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
                    <dt className="text-muted">Số điện thoại</dt>
                    <dd className="num text-ink">
                        <a className="btn-link" href={`tel:${appointment.patientPhoneNumber}`}>
                            {appointment.patientPhoneNumber}
                        </a>
                    </dd>
                    <dt className="text-muted">Mã bệnh nhân</dt>
                    <dd className="text-ink">{appointment.patientCode}</dd>
                    <dt className="text-muted">Giờ hẹn</dt>
                    <dd className="text-ink">
                        {hhmm(appointment.timeSlotStart)} · {ddmm(appointment.appointmentDate)}
                    </dd>
                    <dt className="text-muted">Bác sĩ</dt>
                    <dd className="text-ink">{appointment.doctorName ?? "Chưa gán"}</dd>
                    <dt className="text-muted">Dịch vụ</dt>
                    <dd className="text-ink">{servicesOf(appointment)}</dd>
                </dl>
                <p className="mt-4 text-body-sm text-muted">
                    Khách không nghe máy thì để lịch ở trạng thái chờ và gọi lại sau. Sai số hoặc khách báo hủy thì đóng hộp này và bấm Hủy.
                </p>
                <DialogActions onClose={onClose} submitLabel="Xác nhận lịch" busy={busy} />
            </form>
        </Modal>
    );
};

export const CheckInDialog = ({ appointment, onClose, onSubmit }) => {
    const [priority, setPriorityValue] = useState(PRIORITY.NORMAL);
    const [reason, setReason] = useState("");
    const [busy, submit] = useSubmit(onSubmit);
    return (
        <Modal
            title={`Check-in ${appointment.patientName}`}
            description={`Lịch ${hhmm(appointment.timeSlotStart)}. Sau check-in, bệnh nhân vào hàng chờ của ${appointment.doctorName ?? "bác sĩ được gán"}.`}
            onClose={onClose}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit({ priority, reason: reason.trim() });
                }}
                className="space-y-4"
            >
                <PriorityFields priority={priority} setPriority={setPriorityValue} reason={reason} setReason={setReason} idPrefix="ci" />
                <DialogActions onClose={onClose} submitLabel="Check-in" busy={busy} disabled={priority > PRIORITY.NORMAL && !reason.trim()} />
            </form>
        </Modal>
    );
};

export const CancelDialog = ({ appointment, onClose, onSubmit }) => {
    const [reason, setReason] = useState("");
    const [busy, submit] = useSubmit(onSubmit);
    return (
        <Modal
            title={`Hủy lịch của ${appointment.patientName}`}
            description="Khung giờ được trả lại cho người khác đặt. Không hoàn tác được."
            onClose={onClose}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(reason.trim());
                }}
            >
                <div className="field">
                    <label className="label label-required" htmlFor="cancel-reason">
                        Lý do hủy
                    </label>
                    <textarea
                        id="cancel-reason"
                        className="input h-24 py-2"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ví dụ: khách gọi báo bận việc"
                    />
                </div>
                <DialogActions onClose={onClose} submitLabel="Hủy lịch" disabled={!reason.trim()} danger busy={busy} />
            </form>
        </Modal>
    );
};

export const NoShowDialog = ({ appointment, onClose, onSubmit }) => {
    const [busy, submit] = useSubmit(onSubmit);
    return (
        <Modal
            title={`${appointment.patientName} không đến khám?`}
            description="Dùng khi bệnh nhân đã check-in nhưng rời phòng khám trước khi được khám. Lịch chuyển sang Vắng mặt."
            onClose={onClose}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <DialogActions onClose={onClose} submitLabel="Ghi bỏ về" danger busy={busy} />
            </form>
        </Modal>
    );
};

export const WalkInDialog = ({ doctors, onClose, onSubmit }) => {
    const [phone, setPhone] = useState("");
    const [fullName, setFullName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("");
    const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
    const [priority, setPriorityValue] = useState(PRIORITY.NORMAL);
    const [reason, setReason] = useState("");
    const [found, setFound] = useState(null);
    const [busy, submit] = useSubmit(onSubmit);

    // Look the phone number up so an existing patient is not created twice
    const lookUp = async () => {
        const digits = phone.replace(/\s/g, "");
        if (digits.length < 10) return;
        const result = await findPatientsByKeyword(digits);
        const patient = result.success ? result.data?.items?.[0] : null;
        setFound(patient ?? false);
        if (patient) {
            setFullName(patient.fullName);
            setDateOfBirth(patient.dateOfBirth ?? "");
            setGender(patient.gender ?? "");
        }
    };

    const needsReason = priority > PRIORITY.NORMAL && !reason.trim();
    return (
        <Modal title="Tiếp nhận khách vãng lai" description="Khách đến không hẹn trước được check-in ngay và vào nhóm vãng lai của hàng chờ." onClose={onClose}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit({
                        fullName: fullName.trim(),
                        phoneNumber: phone.replace(/\s/g, ""),
                        dateOfBirth: dateOfBirth || null,
                        gender: gender || null,
                        doctorId: Number(doctorId),
                        serviceId: [],
                        variantId: [],
                        priority,
                        reason: reason.trim() || null,
                    });
                }}
                className="space-y-4"
            >
                <div className="field">
                    <label className="label label-required" htmlFor="wi-phone">
                        Số điện thoại
                    </label>
                    <input
                        id="wi-phone"
                        className="input"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => {
                            setPhone(e.target.value);
                            setFound(null);
                        }}
                        onBlur={lookUp}
                    />
                    {found ? (
                        <p className="help-text text-success">
                            Đã có hồ sơ: {found.fullName} · {found.patientCode}
                        </p>
                    ) : found === false ? (
                        <p className="help-text">Chưa có hồ sơ với số này, hệ thống sẽ tạo hồ sơ mới.</p>
                    ) : (
                        <p className="help-text">Nhập số rồi rời ô để tìm hồ sơ có sẵn.</p>
                    )}
                </div>
                <div className="field">
                    <label className="label label-required" htmlFor="wi-name">
                        Họ tên
                    </label>
                    <input id="wi-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="field">
                        <label className="label" htmlFor="wi-dob">
                            Ngày sinh
                        </label>
                        <input
                            id="wi-dob"
                            className="input"
                            type="date"
                            value={dateOfBirth}
                            max={clinicToday()}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label className="label" htmlFor="wi-gender">
                            Giới tính
                        </label>
                        <select id="wi-gender" className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                            <option value="">Không ghi</option>
                            <option value="Male">Nam</option>
                            <option value="Female">Nữ</option>
                        </select>
                    </div>
                </div>
                <div className="field">
                    <label className="label label-required" htmlFor="wi-doctor">
                        Bác sĩ khám
                    </label>
                    <select id="wi-doctor" className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                        {doctors.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                                {d.room ? ` · ${d.room}` : ""}
                            </option>
                        ))}
                    </select>
                    <p className="help-text">Bác sĩ phải đang trong ca hôm nay; nếu không, hệ thống sẽ báo lỗi.</p>
                </div>
                <PriorityFields priority={priority} setPriority={setPriorityValue} reason={reason} setReason={setReason} idPrefix="wi" />
                <DialogActions
                    onClose={onClose}
                    submitLabel="Tiếp nhận và check-in"
                    busy={busy}
                    disabled={!phone.trim() || !fullName.trim() || !doctorId || needsReason}
                />
            </form>
        </Modal>
    );
};

export const PriorityDialog = ({ entry, onClose, onSubmit }) => {
    const [priority, setPriorityValue] = useState(entry.priority);
    const [reason, setReason] = useState("");
    const [busy, submit] = useSubmit(onSubmit);
    return (
        <Modal title={`Đổi mức ưu tiên của ${entry.patientName}`} description="Bác sĩ gọi người có mức ưu tiên cao hơn trước." onClose={onClose}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit({ priority, reason: reason.trim() });
                }}
                className="space-y-4"
            >
                <PriorityFields priority={priority} setPriority={setPriorityValue} reason={reason} setReason={setReason} idPrefix="pr" />
                <DialogActions
                    onClose={onClose}
                    submitLabel="Lưu mức ưu tiên"
                    busy={busy}
                    disabled={priority === entry.priority || (priority > PRIORITY.NORMAL && !reason.trim())}
                />
            </form>
        </Modal>
    );
};

export const ReassignDialog = ({ item, doctors, onClose, onSubmit }) => {
    const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
    const [busy, submit] = useSubmit(onSubmit);
    return (
        <Modal
            title={`Chuyển ${item.patientName} sang bác sĩ khác`}
            description="Chỉ chuyển được sang bác sĩ đang trong ca; nếu không, hệ thống sẽ báo lỗi."
            onClose={onClose}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(Number(doctorId));
                }}
            >
                {doctors.length === 0 ? (
                    <p className="text-body-sm text-muted">Hôm nay không có bác sĩ nào khác có lịch.</p>
                ) : (
                    <div className="field">
                        <label className="label" htmlFor="ra-doctor">
                            Bác sĩ nhận
                        </label>
                        <select id="ra-doctor" className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                    {d.room ? ` · ${d.room}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <DialogActions onClose={onClose} submitLabel="Chuyển bác sĩ" busy={busy} disabled={!doctorId} />
            </form>
        </Modal>
    );
};

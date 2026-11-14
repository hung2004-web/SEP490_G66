import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { DialogActions } from "./shared";
import { hhmm, money, useSubmit } from "./receptionUtils";
import { bookForPatient, clinicToday, findPatientsByKeyword, getAvailableSlots, getBookableServices } from "@/services/receptionService";
import { cx } from "@/utils/cx";

// "Đặt lịch hộ" (F-APT-09): the receptionist books for a patient on the phone or at the counter.
// 1) find the patient by phone (or type a new one), 2) pick services, 3) pick a day and a free slot.
// The booking is CONFIRMED at once and the patient gets a message. Same rules as online booking (BR-APT-01..04).

// patient: an existing record to book for; initial: { fullName, phoneNumber, date } to start from
const BookingDialog = ({ patient: givenPatient = null, initial = {}, onClose, onBooked }) => {
    const [phone, setPhone] = useState(initial.phoneNumber ?? givenPatient?.phoneNumber ?? "");
    const [patient, setPatient] = useState(givenPatient);
    const [lookedUp, setLookedUp] = useState(Boolean(givenPatient));
    const [fullName, setFullName] = useState(initial.fullName ?? "");
    const [email, setEmail] = useState("");
    const [services, setServices] = useState([]);
    const [picked, setPicked] = useState({ serviceIds: [], variantIds: [] });
    const [date, setDate] = useState(initial.date && initial.date >= clinicToday() ? initial.date : clinicToday(1));
    const [slots, setSlots] = useState({ loading: true, items: [] });
    const [slot, setSlot] = useState(null);
    const [note, setNote] = useState("");
    const [error, setError] = useState(null);
    const [busy, submit] = useSubmit(async () => {
        const result = await bookForPatient({
            patientId: patient?.id ?? null,
            fullName: patient ? null : fullName.trim(),
            phoneNumber: patient ? null : phone.replace(/\s/g, ""),
            email: patient ? null : email.trim() || null,
            serviceId: picked.serviceIds,
            variantId: picked.variantIds,
            date,
            slotStart: slot.slotStart,
            doctorId: slot.doctorId,
            note: note.trim() || null,
        });
        if (result.success) onBooked(result.data);
        else setError(result.message);
    });

    useEffect(() => {
        let active = true;
        getBookableServices().then((result) => active && result.success && setServices(result.data));
        return () => {
            active = false;
        };
    }, []);

    // Free slots for the chosen services, all doctors; re-asked whenever the day or the services change
    useEffect(() => {
        let active = true;
        getAvailableSlots({ date, serviceIds: picked.serviceIds, variantIds: picked.variantIds }).then(
            (result) => active && setSlots({ loading: false, items: result.success ? result.data : [], error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [date, picked]);

    const lookUp = async () => {
        const digits = phone.replace(/\s/g, "");
        if (digits.length < 10) return;
        const result = await findPatientsByKeyword(digits);
        const found = result.success ? result.data?.items?.[0] : null;
        setPatient(found ?? null);
        setLookedUp(true);
    };

    const change = (update) => {
        setPicked(update);
        setSlot(null);
        setSlots((s) => ({ ...s, loading: true }));
    };

    // A service without variants is ticked on its own
    const toggleService = (id) =>
        change((current) => ({ ...current, serviceIds: current.serviceIds.includes(id) ? current.serviceIds.filter((x) => x !== id) : [...current.serviceIds, id] }));

    // A service with variants is booked through exactly one of them: picking one replaces the other, picking it again clears it
    const pickVariant = (service, id) =>
        change((current) => {
            const others = current.variantIds.filter((x) => !service.variants.some((v) => v.variantId === x));
            return { ...current, variantIds: current.variantIds.includes(id) ? others : [...others, id] };
        });

    const total = useMemo(
        () =>
            services.reduce((sum, s) => {
                const variantSum = s.variants.filter((v) => picked.variantIds.includes(v.variantId)).reduce((a, v) => a + Number(v.referencePrice), 0);
                const serviceSum = s.isMandatory || picked.serviceIds.includes(s.serviceId) ? Number(s.referencePrice) : 0;
                return sum + variantSum + serviceSum;
            }, 0),
        [services, picked],
    );

    // Slots grouped by time, each with the doctors free then
    const times = [...new Set(slots.items.map((s) => s.slotStart))];
    const canSubmit = (patient || (lookedUp && fullName.trim() && phone.trim())) && slot;

    return (
        <Modal title="Đặt lịch hộ" description="Lịch do lễ tân đặt được xác nhận ngay và bệnh nhân nhận tin báo." size="lg" onClose={onClose}>
            <form
                className="space-y-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    setError(null);
                    submit();
                }}
            >
                <fieldset className="space-y-3">
                    <legend className="label">1. Bệnh nhân</legend>
                    {givenPatient ? (
                        <p className="rounded-lg bg-surface-muted px-3 py-2 text-body-sm text-ink">
                            {givenPatient.fullName} · {givenPatient.patientCode} · {givenPatient.phoneNumber}
                        </p>
                    ) : (
                        <>
                            <div className="field">
                                <label className="label label-required" htmlFor="bk-phone">
                                    Số điện thoại
                                </label>
                                <input
                                    id="bk-phone"
                                    className="input"
                                    inputMode="tel"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        setLookedUp(false);
                                        setPatient(null);
                                    }}
                                    onBlur={lookUp}
                                />
                                {lookedUp && patient && (
                                    <p className="help-text text-success">
                                        Đã có hồ sơ: {patient.fullName} · {patient.patientCode}
                                    </p>
                                )}
                                {lookedUp && !patient && <p className="help-text">Chưa có hồ sơ với số này; điền họ tên để tạo mới.</p>}
                                {!lookedUp && <p className="help-text">Nhập số rồi rời ô để tìm hồ sơ có sẵn.</p>}
                            </div>
                            {lookedUp && !patient && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="field">
                                        <label className="label label-required" htmlFor="bk-name">
                                            Họ tên
                                        </label>
                                        <input id="bk-name" className="input" maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                    </div>
                                    <div className="field">
                                        <label className="label" htmlFor="bk-email">
                                            Email
                                        </label>
                                        <input id="bk-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="label">2. Dịch vụ</legend>
                    <p className="help-text">Khám tổng quát luôn có. Chọn thêm dịch vụ cùng loại phòng.</p>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                        {services.map((s) => (
                            <div key={s.serviceId}>
                                {s.variants.length > 0 && !s.isMandatory ? (
                                    <p className="flex items-center gap-2 text-body-sm">
                                        <span className="flex-1 text-ink">{s.serviceName}</span>
                                        <span className="text-caption text-muted">Chọn một loại</span>
                                    </p>
                                ) : (
                                    <label className="flex items-center gap-2 text-body-sm">
                                        <input
                                            type="checkbox"
                                            checked={s.isMandatory || picked.serviceIds.includes(s.serviceId)}
                                            disabled={s.isMandatory}
                                            onChange={() => toggleService(s.serviceId)}
                                        />
                                        <span className="flex-1 text-ink">{s.serviceName}</span>
                                        <span className="num text-muted">{money(s.referencePrice)}</span>
                                    </label>
                                )}
                                {s.variants.length > 0 && !s.isMandatory && (
                                    <div className="mt-1 ml-6 grid gap-1 sm:grid-cols-2">
                                        {s.variants.map((v) => (
                                            <label key={v.variantId} className="flex items-center gap-2 text-caption">
                                                <input
                                                    type="checkbox"
                                                    checked={picked.variantIds.includes(v.variantId)}
                                                    onChange={() => pickVariant(s, v.variantId)}
                                                />
                                                <span className="flex-1">{v.variantName}</span>
                                                <span className="num text-muted">{money(v.referencePrice)}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-body-sm text-muted">
                        Tạm tính <span className="num font-semibold text-ink">{money(total)}</span>
                    </p>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="label">3. Ngày và giờ</legend>
                    <input
                        type="date"
                        className="input w-auto"
                        aria-label="Ngày khám"
                        min={clinicToday()}
                        max={clinicToday(30)}
                        value={date}
                        onChange={(e) => {
                            if (e.target.value) {
                                setDate(e.target.value);
                                setSlot(null);
                                setSlots((s) => ({ ...s, loading: true }));
                            }
                        }}
                    />
                    {slots.loading ? (
                        <p className="text-body-sm text-muted">Đang tìm giờ trống…</p>
                    ) : slots.error ? (
                        <p className="text-body-sm text-danger">{slots.error}</p>
                    ) : times.length === 0 ? (
                        <p className="text-body-sm text-muted">
                            Ngày này không còn giờ trống cho các dịch vụ đã chọn (đặt trước ít nhất 2 giờ). Chọn ngày khác.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {times.map((time) => (
                                <div key={time} className="flex flex-wrap items-center gap-2">
                                    <span className="num w-12 text-body-sm font-semibold text-ink">{hhmm(time)}</span>
                                    {slots.items
                                        .filter((s) => s.slotStart === time)
                                        .map((s) => {
                                            const on = slot?.slotStart === s.slotStart && slot?.doctorId === s.doctorId;
                                            return (
                                                <button
                                                    key={`${s.doctorId}-${s.slotStart}`}
                                                    type="button"
                                                    aria-pressed={on}
                                                    onClick={() => setSlot(s)}
                                                    className={cx(
                                                        "rounded-full border px-3 py-1 text-caption",
                                                        on ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-body",
                                                    )}
                                                >
                                                    {s.doctorName}
                                                </button>
                                            );
                                        })}
                                </div>
                            ))}
                        </div>
                    )}
                </fieldset>

                <div className="field">
                    <label className="label" htmlFor="bk-note">
                        Ghi chú
                    </label>
                    <input
                        id="bk-note"
                        className="input"
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ví dụ: đau răng hàm dưới bên trái"
                    />
                </div>

                {error && (
                    <p role="alert" className="error-text">
                        {error}
                    </p>
                )}
                <DialogActions onClose={onClose} submitLabel="Đặt lịch" busy={busy} disabled={!canSubmit} />
            </form>
        </Modal>
    );
};

export default BookingDialog;

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import Modal from "@/components/ui/Modal";
import SearchInput from "@/components/ui/SearchInput";
import { Card, DialogActions, EmptyState, ErrorLine, FilterBar, PageHeader } from "@/components/reception/shared";
import { ddmm, hhmm, phoneText, report, usePaging, useSubmit } from "@/components/reception/receptionUtils";
import {
    clinicToday,
    getAvailableSlots,
    getFollowUpContacts,
    getFollowUpList,
    recordFollowUpContact,
    remindDueFollowUps,
    remindFollowUp,
    scheduleFollowUpAppointment,
} from "@/services/receptionService";
import { cx } from "@/utils/cx";

// "Nhắc tái khám" (customer care, receptionist only). A follow-up comes from the doctor, or from the service's
// periodic recall (e.g. scaling every 6 months) when the doctor set none. The receptionist reminds, calls,
// records how the call went, and books the visit. "Từ chối" closes the follow-up: no more reminders.

const TABS = [
    { value: "due", label: "Sắp đến hạn", query: () => ({ fromDate: clinicToday(), toDate: clinicToday(14), hasAppointment: false }), empty: "Không có ai đến hạn tái khám trong 14 ngày tới." },
    { value: "overdue", label: "Quá hạn chưa đặt", query: () => ({ fromDate: clinicToday(-180), toDate: clinicToday(-1), hasAppointment: false }), empty: "Không có ai quá hạn mà chưa đặt lịch." },
    { value: "booked", label: "Đã đặt lịch", query: () => ({ fromDate: clinicToday(-30), toDate: clinicToday(60), hasAppointment: true }), empty: "Chưa có lịch tái khám nào được đặt." },
];

const OUTCOMES = {
    Booked: ["Đã đặt lịch", "badge-success"],
    CallBack: ["Hẹn gọi lại", "badge-info"],
    Unreachable: ["Không liên lạc được", "badge-warning"],
    Declined: ["Không quay lại", "badge-neutral"],
};

const dateTime = (moment) =>
    new Date(moment).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

const ReceptionFollowUps = () => {
    const [tab, setTab] = useState("due");
    const [keyword, setKeyword] = useState("");
    const [state, setState] = useState({ loading: true, items: [], error: null });
    const [version, setVersion] = useState(0);
    const [dialog, setDialog] = useState(null);

    useEffect(() => {
        let active = true;
        getFollowUpList(TABS.find((t) => t.value === tab).query()).then(
            (result) => active && setState({ loading: false, items: result.success ? result.data.items : [], error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [tab, version]);

    const reload = () => setVersion((v) => v + 1);
    const act = async (request, text) => {
        if (report(await request, text)) {
            setDialog(null);
            reload();
            return true;
        }
        return false;
    };

    const q = keyword.trim().toLowerCase();
    const shown = state.items.filter((f) => !q || `${f.patientName} ${f.patientPhoneNumber} ${f.patientCode}`.toLowerCase().includes(q));
    const { pageItems, footer, setPage } = usePaging(shown, 10);
    const current = TABS.find((t) => t.value === tab);

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Nhắc tái khám" description="Bệnh nhân cần quay lại: theo hẹn của bác sĩ, hoặc định kỳ theo dịch vụ. Hệ thống tự gửi nhắc lúc 8 giờ sáng hôm trước.">
                <button type="button" className="btn btn-secondary" onClick={() => act(remindDueFollowUps())}>
                    <BellRing className="size-4" aria-hidden /> Nhắc người tái khám ngày mai
                </button>
            </PageHeader>
            <ErrorLine message={state.error} />

            <Card>
                <nav role="tablist" aria-label="Nhóm tái khám" className="flex gap-1 overflow-x-auto border-b border-border px-3">
                    {TABS.map((t) => (
                        <button
                            key={t.value}
                            role="tab"
                            type="button"
                            aria-selected={tab === t.value}
                            onClick={() => { setTab(t.value); setPage(1); setState((s) => ({ ...s, loading: true })); }}
                            className={cx("-mb-px h-11 shrink-0 border-b-2 px-4 text-label", tab === t.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
                <FilterBar>
                    <SearchInput id="fu-search" label="Tìm bệnh nhân" placeholder="Tên, mã hoặc số điện thoại" value={keyword} onChange={setKeyword} className="min-w-64 flex-1" />
                </FilterBar>
                {state.loading ? (
                    <EmptyState text="Đang tải…" />
                ) : shown.length === 0 ? (
                    <EmptyState text={current.empty} />
                ) : (
                    <div className="table-wrap rounded-none border-x-0">
                        <table className="table table-stack">
                            <thead>
                                <tr>
                                    <th>Bệnh nhân</th>
                                    <th>Tái khám</th>
                                    <th>Bác sĩ</th>
                                    <th>Lần gọi gần nhất</th>
                                    <th>Đã nhắc</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((f) => (
                                    <tr key={f.examinationId}>
                                        <td data-primary>
                                            <div className="cell-primary">{f.patientName}</div>
                                            <a className="btn-link text-caption" href={`tel:${f.patientPhoneNumber}`}>{phoneText(f.patientPhoneNumber)}</a>
                                        </td>
                                        <td data-label="Tái khám">
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className="num text-ink">{f.followUpAppointmentId ? `${ddmm(f.followUpAppointmentDate)} ${hhmm(f.followUpTimeSlotStart) ?? ""}` : ddmm(f.followUpDate)}</span>
                                                {f.isRecall && <span className="badge badge-info">Định kỳ</span>}
                                                {f.isOverdue && !f.followUpAppointmentId && <span className="badge badge-danger">Quá hạn</span>}
                                            </div>
                                            {f.followUpNotes && <div className="text-caption text-muted">{f.followUpNotes}</div>}
                                        </td>
                                        <td data-label="Bác sĩ">{f.doctorName}</td>
                                        <td data-label="Lần gọi gần nhất">
                                            {f.lastContactOutcome ? (
                                                <button type="button" className="text-left" onClick={() => setDialog({ type: "history", item: f })}>
                                                    <span className={cx("badge", OUTCOMES[f.lastContactOutcome]?.[1])}>{OUTCOMES[f.lastContactOutcome]?.[0]}</span>
                                                    <span className="block text-caption text-muted">
                                                        {dateTime(f.lastContactAt)}
                                                        {f.callBackDate && ` · gọi lại ${ddmm(f.callBackDate)}`}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className="text-body-sm text-muted">Chưa gọi</span>
                                            )}
                                        </td>
                                        <td data-label="Đã nhắc" className="num">{f.reminderCount} lần</td>
                                        <td data-actions>
                                            {f.followUpAppointmentId ? (
                                                <span className="badge badge-success">Đã đặt lịch</span>
                                            ) : (
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button type="button" className="btn btn-primary h-9" onClick={() => setDialog({ type: "schedule", item: f })}>Đặt lịch</button>
                                                    <button type="button" className="btn btn-secondary h-9" onClick={() => setDialog({ type: "contact", item: f })}>Ghi kết quả gọi</button>
                                                    <button type="button" className="btn btn-link h-9" onClick={() => act(remindFollowUp(f.examinationId), `Đã gửi nhắc cho ${f.patientName}.`)}>Gửi nhắc</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {footer}
            </Card>

            {dialog?.type === "contact" && (
                <ContactDialog
                    item={dialog.item}
                    onClose={() => setDialog(null)}
                    onSubmit={(values) => act(recordFollowUpContact(dialog.item.examinationId, values), "Đã ghi kết quả cuộc gọi.")}
                />
            )}
            {dialog?.type === "schedule" && (
                <ScheduleDialog
                    item={dialog.item}
                    onClose={() => setDialog(null)}
                    onSubmit={async (values) => {
                        const ok = await act(scheduleFollowUpAppointment(dialog.item.examinationId, values), `Đã đặt lịch tái khám cho ${dialog.item.patientName}.`);
                        // The booking is also a call result, so the history shows how the patient came back
                        if (ok) await recordFollowUpContact(dialog.item.examinationId, { outcome: "Booked", note: `Đặt lịch ${ddmm(values.date)} ${hhmm(values.slotStart)}` });
                    }}
                />
            )}
            {dialog?.type === "history" && <ContactHistory item={dialog.item} onClose={() => setDialog(null)} />}
        </div>
    );
};

const ContactDialog = ({ item, onClose, onSubmit }) => {
    const [outcome, setOutcome] = useState("CallBack");
    const [note, setNote] = useState("");
    const [callBackDate, setCallBackDate] = useState(clinicToday(1));
    const [busy, submit] = useSubmit(onSubmit);
    const choices = Object.entries(OUTCOMES).filter(([value]) => value !== "Booked");
    return (
        <Modal title={`Kết quả gọi ${item.patientName}`} description={`Số ${phoneText(item.patientPhoneNumber)} · tái khám ${ddmm(item.followUpDate)}`} onClose={onClose}>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit({ outcome, note: note.trim(), callBackDate: outcome === "CallBack" ? callBackDate : null }); }}>
                <fieldset className="field">
                    <legend className="label">Kết quả</legend>
                    <div className="flex flex-wrap gap-4 pt-1">
                        {choices.map(([value, [label]]) => (
                            <label key={value} className="flex items-center gap-2 text-body-sm">
                                <input type="radio" name="fu-outcome" checked={outcome === value} onChange={() => setOutcome(value)} />
                                {label}
                            </label>
                        ))}
                    </div>
                    <p className="help-text">Đặt được lịch thì đóng hộp này và bấm Đặt lịch. "Không quay lại" sẽ dừng mọi tin nhắc.</p>
                </fieldset>
                {outcome === "CallBack" && (
                    <div className="field">
                        <label className="label label-required" htmlFor="fu-callback">Gọi lại ngày</label>
                        <input id="fu-callback" type="date" className="input" min={clinicToday()} value={callBackDate} onChange={(e) => setCallBackDate(e.target.value)} />
                    </div>
                )}
                <div className="field">
                    <label className="label" htmlFor="fu-note">Ghi chú</label>
                    <textarea id="fu-note" className="input py-2" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: khách bận công tác, hẹn gọi lại cuối tuần" />
                </div>
                <DialogActions onClose={onClose} submitLabel="Lưu kết quả" busy={busy} disabled={outcome === "CallBack" && !callBackDate} />
            </form>
        </Modal>
    );
};

// The follow-up visit with the same doctor; the backend checks the slot and that the date is not before the follow-up date
const ScheduleDialog = ({ item, onClose, onSubmit }) => {
    const first = item.followUpDate && item.followUpDate > clinicToday() ? item.followUpDate : clinicToday(1);
    const [date, setDate] = useState(first);
    const [slots, setSlots] = useState({ loading: true, items: [] });
    const [slotStart, setSlotStart] = useState("");
    const [busy, submit] = useSubmit(onSubmit);

    useEffect(() => {
        let active = true;
        getAvailableSlots({ date, doctorId: item.doctorId }).then((result) => active && setSlots({ loading: false, items: result.success ? result.data : [] }));
        return () => {
            active = false;
        };
    }, [date, item.doctorId]);

    return (
        <Modal title={`Đặt lịch tái khám cho ${item.patientName}`} description={`Với ${item.doctorName}. Hẹn tái khám từ ngày ${ddmm(item.followUpDate)}.`} onClose={onClose}>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit({ date, slotStart, doctorId: item.doctorId }); }}>
                <div className="field">
                    <label className="label label-required" htmlFor="fu-date">Ngày khám</label>
                    <input id="fu-date" type="date" className="input" min={clinicToday()} value={date} onChange={(e) => { setDate(e.target.value); setSlotStart(""); setSlots({ loading: true, items: [] }); }} />
                </div>
                <fieldset className="field">
                    <legend className="label label-required">Giờ còn trống</legend>
                    {slots.loading ? (
                        <p className="text-body-sm text-muted">Đang tìm giờ trống…</p>
                    ) : slots.items.length === 0 ? (
                        <p className="text-body-sm text-muted">Bác sĩ không có giờ trống ngày này. Chọn ngày khác.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {slots.items.map((s) => (
                                <button
                                    key={s.slotStart}
                                    type="button"
                                    aria-pressed={slotStart === s.slotStart}
                                    onClick={() => setSlotStart(s.slotStart)}
                                    className={cx("num rounded-full border px-3 py-1 text-body-sm", slotStart === s.slotStart ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-body")}
                                >
                                    {hhmm(s.slotStart)}
                                </button>
                            ))}
                        </div>
                    )}
                </fieldset>
                <DialogActions onClose={onClose} submitLabel="Đặt lịch tái khám" busy={busy} disabled={!slotStart} />
            </form>
        </Modal>
    );
};

const ContactHistory = ({ item, onClose }) => {
    const [contacts, setContacts] = useState(null);
    useEffect(() => {
        let active = true;
        getFollowUpContacts(item.examinationId).then((result) => active && setContacts(result.success ? result.data : []));
        return () => {
            active = false;
        };
    }, [item.examinationId]);

    return (
        <Modal title={`Lịch sử chăm sóc · ${item.patientName}`} description={`Tái khám ${ddmm(item.followUpDate)} · đã nhắc ${item.reminderCount} lần`} onClose={onClose}>
            {!contacts ? (
                <p className="text-body-sm text-muted">Đang tải…</p>
            ) : (
                <ol className="space-y-3">
                    {contacts.map((c) => (
                        <li key={c.id} className="rounded-lg border border-border px-4 py-3 text-body-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={cx("badge", OUTCOMES[c.outcome]?.[1])}>{OUTCOMES[c.outcome]?.[0]}</span>
                                <span className="text-caption text-muted">{dateTime(c.createdAt)} · {c.createdByName ?? "Lễ tân"}</span>
                            </div>
                            {c.note && <p className="mt-1 text-ink">{c.note}</p>}
                            {c.callBackDate && <p className="mt-1 text-caption text-muted">Gọi lại ngày {ddmm(c.callBackDate)}</p>}
                        </li>
                    ))}
                </ol>
            )}
        </Modal>
    );
};

export default ReceptionFollowUps;

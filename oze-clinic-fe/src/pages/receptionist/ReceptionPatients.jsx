import { useEffect, useState } from "react";
import { CalendarPlus, UserPlus } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import FilterSelect from "@/components/ui/FilterSelect";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import BookingDialog from "@/components/reception/BookingDialog";
import { Badge, Card, DialogActions, EmptyState, ErrorLine, FilterBar, PageHeader } from "@/components/reception/shared";
import { INVOICE_LABEL, STATUS_LABEL, ddmm, dmy, money, phoneText, report, servicesOf, slotText, useSubmit } from "@/components/reception/receptionUtils";
import {
    approveTreatmentPlan,
    clinicToday,
    createPatient,
    getPatient,
    getPatientAppointments,
    getPatientInvoices,
    getPatientTreatmentPlans,
    getPatients,
    updatePatient,
} from "@/services/receptionService";
import { cx } from "@/utils/cx";

// "Hồ sơ bệnh nhân": find a patient, create or correct a record, and see their visits, treatment plans and invoices.
// A plan the doctor proposed is approved here once the patient agrees (the receptionist and the doctor both can).
// Phone and email of a patient with an account belong to the account and are changed by the patient (BR-PAT).

const PAGE_SIZE = 10;
const GENDERS = [
    { value: "Male", label: "Nam" },
    { value: "Female", label: "Nữ" },
];
const genderText = (g) => GENDERS.find((x) => x.value === g)?.label ?? "—";
const PLAN_STATUS = {
    Draft: ["Nháp của bác sĩ", "badge-neutral"],
    Proposed: ["Chờ bệnh nhân đồng ý", "badge-warning"],
    Approved: ["Đã duyệt", "badge-success"],
    InProgress: ["Đang điều trị", "badge-info"],
    Completed: ["Hoàn tất", "badge-success"],
    Cancelled: ["Đã hủy", "badge-neutral"],
    Superseded: ["Đã thay bằng kế hoạch mới", "badge-neutral"],
};

const ReceptionPatients = () => {
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const [gender, setGender] = useState("");
    const [page, setPage] = useState(1);
    const [version, setVersion] = useState(0);
    const [state, setState] = useState({ loading: true, data: null, error: null });
    const [openId, setOpenId] = useState(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(keyword.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        let active = true;
        getPatients({ keyword: search, gender, page, pageSize: PAGE_SIZE }).then(
            (result) => active && setState({ loading: false, data: result.success ? result.data : null, error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [search, gender, page, version]);

    const data = state.data;
    return (
        <div className="app-content min-h-full">
            <PageHeader title="Hồ sơ bệnh nhân" description="Tìm theo tên, mã, số điện thoại hoặc email. Bấm một bệnh nhân để xem lịch hẹn, kế hoạch điều trị và hóa đơn.">
                <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                    <UserPlus className="size-4" aria-hidden /> Tạo hồ sơ
                </button>
            </PageHeader>
            <ErrorLine message={state.error} />

            <Card>
                <FilterBar>
                    <SearchInput id="pt-search" label="Tìm bệnh nhân" placeholder="Tên, mã, số điện thoại hoặc email" value={keyword} onChange={setKeyword} className="min-w-64 flex-1" />
                    <FilterSelect id="pt-gender" label="Giới tính" options={GENDERS} value={gender} onChange={(v) => { setGender(v); setPage(1); }} />
                </FilterBar>
                {state.loading ? (
                    <EmptyState text="Đang tải…" />
                ) : !data || data.items.length === 0 ? (
                    <EmptyState text={search || gender ? "Không có hồ sơ nào khớp. Kiểm tra lại số điện thoại hoặc tạo hồ sơ mới." : "Chưa có hồ sơ bệnh nhân nào."} />
                ) : (
                    <div className="table-wrap rounded-none border-x-0">
                        <table className="table table-stack">
                            <thead>
                                <tr><th>Mã BN</th><th>Bệnh nhân</th><th>Số điện thoại</th><th>Giới tính</th><th>Ngày sinh</th><th>Tài khoản</th><th className="text-right">Thao tác</th></tr>
                            </thead>
                            <tbody>
                                {data.items.map((p) => (
                                    <tr key={p.id}>
                                        <td data-label="Mã BN" className="num whitespace-nowrap">{p.patientCode}</td>
                                        <td data-primary className="cell-primary">{p.fullName}</td>
                                        <td data-label="Số điện thoại" className="num">{p.phoneNumber ? phoneText(p.phoneNumber) : "—"}</td>
                                        <td data-label="Giới tính">{genderText(p.gender)}</td>
                                        <td data-label="Ngày sinh" className="num">{p.dateOfBirth ? dmy(p.dateOfBirth) : "—"}</td>
                                        <td data-label="Tài khoản">{p.userId ? <span className="badge badge-info">Có tài khoản</span> : <span className="text-muted">Không</span>}</td>
                                        <td data-actions className="text-right">
                                            <button type="button" className="btn btn-secondary h-9" onClick={() => setOpenId(p.id)}>Xem hồ sơ</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {data && data.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-5 py-3">
                        <p className="num text-body-sm text-muted">{data.totalCount} hồ sơ</p>
                        <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
                    </div>
                )}
            </Card>

            {openId && <PatientDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => setVersion((v) => v + 1)} />}
            {creating && (
                <PatientForm
                    title="Tạo hồ sơ bệnh nhân"
                    onClose={() => setCreating(false)}
                    onSubmit={async (values) => {
                        const result = await createPatient(values);
                        if (report(result, `Đã tạo hồ sơ ${result.data?.patientCode ?? ""}.`)) {
                            setCreating(false);
                            setVersion((v) => v + 1);
                            setOpenId(result.data.id);
                        }
                    }}
                />
            )}
        </div>
    );
};

const TABS = [
    { value: "info", label: "Thông tin" },
    { value: "visits", label: "Lịch hẹn" },
    { value: "plans", label: "Kế hoạch điều trị" },
    { value: "invoices", label: "Hóa đơn" },
];

const PatientDrawer = ({ id, onClose, onChanged }) => {
    const [patient, setPatient] = useState(null);
    const [tab, setTab] = useState("info");
    const [version, setVersion] = useState(0);
    const [editing, setEditing] = useState(false);
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        let active = true;
        getPatient(id).then((result) => active && setPatient(result.success ? result.data : null));
        return () => {
            active = false;
        };
    }, [id, version]);

    if (!patient) return <Drawer title="Hồ sơ bệnh nhân" onClose={onClose}><EmptyState text="Đang tải…" /></Drawer>;

    return (
        <Drawer title={patient.fullName} description={`${patient.patientCode}${patient.phoneNumber ? ` · ${phoneText(patient.phoneNumber)}` : ""}`} onClose={onClose}>
            <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary h-9" onClick={() => setBooking(true)}>
                    <CalendarPlus className="size-4" aria-hidden /> Đặt lịch
                </button>
                <button type="button" className="btn btn-secondary h-9" onClick={() => setEditing(true)}>Sửa thông tin</button>
            </div>
            <nav role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
                {TABS.map((t) => (
                    <button key={t.value} role="tab" type="button" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
                        className={cx("-mb-px h-10 shrink-0 border-b-2 px-3 text-label", tab === t.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}>
                        {t.label}
                    </button>
                ))}
            </nav>
            {tab === "info" && <PatientInfo patient={patient} />}
            {tab === "visits" && <PatientVisits patientId={id} key={version} />}
            {tab === "plans" && <PatientPlans patientId={id} />}
            {tab === "invoices" && <PatientInvoices patientId={id} />}

            {editing && (
                <PatientForm
                    title={`Sửa hồ sơ ${patient.patientCode}`}
                    patient={patient}
                    onClose={() => setEditing(false)}
                    onSubmit={async (values) => {
                        if (report(await updatePatient(id, values), "Đã lưu hồ sơ.")) {
                            setEditing(false);
                            setVersion((v) => v + 1);
                            onChanged();
                        }
                    }}
                />
            )}
            {booking && (
                <BookingDialog
                    patient={patient}
                    onClose={() => setBooking(false)}
                    onBooked={(a) => {
                        report({ success: true }, `Đã đặt lịch ${slotText(a)} ngày ${ddmm(a.appointmentDate)}.`);
                        setBooking(false);
                        setTab("visits");
                        setVersion((v) => v + 1);
                    }}
                />
            )}
        </Drawer>
    );
};

const PatientInfo = ({ patient: p }) => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
        {[
            ["Ngày sinh", p.dateOfBirth ? dmy(p.dateOfBirth) : "—"],
            ["Giới tính", genderText(p.gender)],
            ["Email", p.email ?? "—"],
            ["Địa chỉ", p.address ?? "—"],
            ["Số bảo hiểm", p.insuranceNumber ?? "—"],
            ["Nhóm máu", p.bloodType ?? "—"],
            ["Người liên hệ khẩn", p.emergencyContactName ? `${p.emergencyContactName} · ${p.emergencyContactPhone ?? ""}` : "—"],
            ["Ghi chú", p.notes ?? "—"],
            ["Số lần hẹn", p.totalAppointments ?? 0],
            ["Tài khoản", p.userId ? "Có tài khoản (số điện thoại, email do bệnh nhân tự đổi)" : "Không có tài khoản"],
        ].map(([label, value]) => (
            <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="m-0 text-ink">{value}</dd>
            </div>
        ))}
        {p.medicalProfiles?.length > 0 && (
            <>
                <dt className="text-muted">Tiền sử, dị ứng</dt>
                <dd className="m-0 flex flex-wrap gap-1">
                    {p.medicalProfiles.map((m) => <span key={m.id} className="badge badge-warning">{m.title}</span>)}
                </dd>
            </>
        )}
    </dl>
);

const useLoad = (loader, deps) => {
    const [state, setState] = useState({ loading: true, items: [] });
    useEffect(() => {
        let active = true;
        loader().then((result) => active && setState({ loading: false, items: result.success ? (Array.isArray(result.data) ? result.data : result.data.items) : [], error: result.success ? null : result.message }));
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return [state, setState];
};

const PatientVisits = ({ patientId }) => {
    const [state] = useLoad(() => getPatientAppointments(patientId), [patientId]);
    if (state.loading) return <EmptyState text="Đang tải…" />;
    if (state.items.length === 0) return <EmptyState text="Bệnh nhân chưa có lịch hẹn nào." />;
    return (
        <ul className="space-y-2">
            {state.items.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start gap-2 rounded-lg border border-border px-3 py-2 text-body-sm">
                    <span className="num w-24 text-ink">{dmy(a.appointmentDate)}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-ink">{slotText(a)} · {a.doctorName ?? "—"}</span>
                        <span className="block text-caption text-muted">{servicesOf(a)}</span>
                    </span>
                    <Badge map={STATUS_LABEL} value={a.status} />
                </li>
            ))}
        </ul>
    );
};

const PatientPlans = ({ patientId }) => {
    const [version, setVersion] = useState(0);
    const [state] = useLoad(() => getPatientTreatmentPlans(patientId), [patientId, version]);
    const approve = async (plan) => {
        if (!window.confirm(`Bệnh nhân đã đồng ý kế hoạch "${plan.planName ?? ""}" (${money(plan.estimatedTotalCost)})?`)) return;
        if (report(await approveTreatmentPlan(plan.id), "Đã duyệt kế hoạch điều trị.")) setVersion((v) => v + 1);
    };
    if (state.loading) return <EmptyState text="Đang tải…" />;
    if (state.error) return <EmptyState text={state.error} />;
    if (state.items.length === 0) return <EmptyState text="Bệnh nhân chưa có kế hoạch điều trị." />;
    return (
        <ul className="space-y-3">
            {state.items.map((plan) => (
                <li key={plan.id} className="rounded-lg border border-border p-3 text-body-sm">
                    <div className="flex flex-wrap items-start gap-2">
                        <span className="min-w-0 flex-1 font-semibold text-ink">{plan.planName ?? `Kế hoạch #${plan.id}`}</span>
                        <Badge map={PLAN_STATUS} value={plan.status} />
                    </div>
                    <p className="mt-1 text-muted">
                        {plan.totalStages} giai đoạn · dự kiến {money(plan.estimatedTotalCost)} · đã xong {plan.completedStages}
                        {plan.createdByDoctorName && ` · ${plan.createdByDoctorName}`}
                    </p>
                    {plan.nextStageName && <p className="text-caption text-muted">Tiếp theo: {plan.nextStageName}{plan.nextStageScheduledDate && ` · ${dmy(plan.nextStageScheduledDate)}`}</p>}
                    {plan.status === "Proposed" && (
                        <div className="mt-2 flex justify-end">
                            <button type="button" className="btn btn-primary h-9" onClick={() => approve(plan)}>Bệnh nhân đồng ý, duyệt kế hoạch</button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};

const PatientInvoices = ({ patientId }) => {
    const [state] = useLoad(() => getPatientInvoices(patientId), [patientId]);
    if (state.loading) return <EmptyState text="Đang tải…" />;
    if (state.items.length === 0) return <EmptyState text="Bệnh nhân chưa có hóa đơn." />;
    return (
        <ul className="space-y-2">
            {state.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-body-sm">
                    <span className="min-w-0 flex-1 text-ink">{i.invoiceNumber}</span>
                    <span className="num text-ink">{money(i.finalAmount)}</span>
                    {Number(i.remainingAmount) > 0 && <span className="num text-danger">còn {money(i.remainingAmount)}</span>}
                    <Badge map={INVOICE_LABEL} value={i.paymentStatus} />
                </li>
            ))}
        </ul>
    );
};

const PatientForm = ({ title, patient, onClose, onSubmit }) => {
    const hasAccount = Boolean(patient?.userId);
    const [values, setValues] = useState({
        fullName: patient?.fullName ?? "",
        phoneNumber: patient?.phoneNumber ?? "",
        email: patient?.email ?? "",
        dateOfBirth: patient?.dateOfBirth ?? "",
        gender: patient?.gender ?? "",
        address: patient?.address ?? "",
        notes: patient?.notes ?? "",
    });
    const [busy, submit] = useSubmit(onSubmit);
    const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

    return (
        <Modal title={title} onClose={onClose}>
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    submit({
                        ...values,
                        fullName: values.fullName.trim(),
                        phoneNumber: values.phoneNumber.replace(/\s/g, "") || null,
                        email: values.email.trim() || null,
                        dateOfBirth: values.dateOfBirth || null,
                        gender: values.gender || null,
                        address: values.address.trim() || null,
                        notes: values.notes.trim() || null,
                    });
                }}
            >
                <div className="field">
                    <label className="label label-required" htmlFor="pf-name">Họ tên</label>
                    <input id="pf-name" className="input" maxLength={200} required value={values.fullName} onChange={set("fullName")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="field">
                        <label className="label" htmlFor="pf-phone">Số điện thoại</label>
                        <input id="pf-phone" className="input" inputMode="tel" disabled={hasAccount} value={values.phoneNumber} onChange={set("phoneNumber")} />
                    </div>
                    <div className="field">
                        <label className="label" htmlFor="pf-email">Email</label>
                        <input id="pf-email" type="email" className="input" disabled={hasAccount} value={values.email} onChange={set("email")} />
                    </div>
                    <div className="field">
                        <label className="label" htmlFor="pf-dob">Ngày sinh</label>
                        <input id="pf-dob" type="date" className="input" max={clinicToday()} value={values.dateOfBirth} onChange={set("dateOfBirth")} />
                    </div>
                    <div className="field">
                        <label className="label" htmlFor="pf-gender">Giới tính</label>
                        <select id="pf-gender" className="input" value={values.gender} onChange={set("gender")}>
                            <option value="">Không ghi</option>
                            {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </div>
                </div>
                {hasAccount && <p className="help-text">Bệnh nhân có tài khoản: số điện thoại và email do bệnh nhân tự đổi trong ứng dụng.</p>}
                <div className="field">
                    <label className="label" htmlFor="pf-address">Địa chỉ</label>
                    <input id="pf-address" className="input" value={values.address} onChange={set("address")} />
                </div>
                <div className="field">
                    <label className="label" htmlFor="pf-notes">Ghi chú</label>
                    <textarea id="pf-notes" className="input py-2" rows={2} value={values.notes} onChange={set("notes")} />
                </div>
                <DialogActions onClose={onClose} submitLabel="Lưu hồ sơ" busy={busy} disabled={!values.fullName.trim()} />
            </form>
        </Modal>
    );
};

export default ReceptionPatients;

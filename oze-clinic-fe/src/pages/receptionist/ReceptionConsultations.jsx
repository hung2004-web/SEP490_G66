import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import BookingDialog from "@/components/reception/BookingDialog";
import { Card, DialogActions, EmptyState, ErrorLine, FilterBar, PageHeader } from "@/components/reception/shared";
import { ddmm, phoneText, report, slotText, useSubmit } from "@/components/reception/receptionUtils";
import { getConsultations, handleConsultation } from "@/services/receptionService";
import { cx } from "@/utils/cx";

// "Yêu cầu tư vấn": visitors who left a name and phone on the public site. The receptionist calls back, then books
// a visit (Đặt lịch) or records how the call went. New requests come first.

const STATUS = {
    New: ["Mới", "badge-warning"],
    Contacted: ["Đã liên hệ", "badge-info"],
    Booked: ["Đã đặt lịch", "badge-success"],
    Closed: ["Đã đóng", "badge-neutral"],
};
const TABS = [{ value: "New", label: "Mới" }, { value: "", label: "Tất cả" }];
const PAGE_SIZE = 10;
const dateTime = (moment) => new Date(moment).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

const ReceptionConsultations = () => {
    const [status, setStatus] = useState("New");
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [version, setVersion] = useState(0);
    const [state, setState] = useState({ loading: true, data: null, error: null });
    const [dialog, setDialog] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(keyword.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        let active = true;
        getConsultations({ status, keyword: search, page, pageSize: PAGE_SIZE }).then(
            (result) => active && setState({ loading: false, data: result.success ? result.data : null, error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [status, search, page, version]);

    const reload = () => setVersion((v) => v + 1);
    const data = state.data;

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Yêu cầu tư vấn" description="Khách để lại số điện thoại trên trang web. Gọi lại tư vấn, rồi đặt lịch hoặc ghi kết quả." />
            <ErrorLine message={state.error} />
            <Card>
                <nav role="tablist" className="flex gap-1 border-b border-border px-3">
                    {TABS.map((t) => (
                        <button key={t.value || "all"} role="tab" type="button" aria-selected={status === t.value} onClick={() => { setStatus(t.value); setPage(1); }}
                            className={cx("-mb-px h-11 border-b-2 px-4 text-label", status === t.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}>
                            {t.label}
                        </button>
                    ))}
                </nav>
                <FilterBar>
                    <SearchInput id="cs-search" label="Tìm" placeholder="Tên hoặc số điện thoại" value={keyword} onChange={setKeyword} className="min-w-64 flex-1" />
                </FilterBar>
                {state.loading ? (
                    <EmptyState text="Đang tải…" />
                ) : !data || data.items.length === 0 ? (
                    <EmptyState text={status === "New" ? "Không còn yêu cầu tư vấn mới." : "Chưa có yêu cầu tư vấn nào."} />
                ) : (
                    <div className="table-wrap rounded-none border-x-0">
                        <table className="table table-stack">
                            <thead><tr><th>Gửi lúc</th><th>Khách</th><th>Nội dung</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
                            <tbody>
                                {data.items.map((c) => (
                                    <tr key={c.id}>
                                        <td data-label="Gửi lúc" className="num whitespace-nowrap">{dateTime(c.createdAt)}</td>
                                        <td data-primary>
                                            <div className="cell-primary">{c.fullName}</div>
                                            <a className="btn-link text-caption" href={`tel:${c.phoneNumber}`}>{phoneText(c.phoneNumber)}</a>
                                            {c.email && <div className="text-caption text-muted">{c.email}</div>}
                                        </td>
                                        <td data-label="Nội dung" className="max-w-72">{c.note ?? <span className="text-muted">Không ghi</span>}</td>
                                        <td data-label="Trạng thái">
                                            <span className={cx("badge", STATUS[c.status]?.[1])}>{STATUS[c.status]?.[0]}</span>
                                            {c.handledAt && <div className="text-caption text-muted">{c.handledByName ?? "Lễ tân"} · {dateTime(c.handledAt)}</div>}
                                            {c.handleNote && <div className="text-caption text-muted">{c.handleNote}</div>}
                                        </td>
                                        <td data-actions>
                                            {c.status !== "Booked" && c.status !== "Closed" && (
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button type="button" className="btn btn-primary h-9" onClick={() => setDialog({ type: "book", item: c })}>Đặt lịch</button>
                                                    <button type="button" className="btn btn-secondary h-9" onClick={() => setDialog({ type: "handle", item: c })}>Ghi kết quả</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {data && data.totalPages > 1 && (
                    <div className="flex justify-end border-t border-border px-5 py-3">
                        <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
                    </div>
                )}
            </Card>

            {dialog?.type === "handle" && (
                <HandleDialog
                    item={dialog.item}
                    onClose={() => setDialog(null)}
                    onSubmit={async (values) => {
                        if (report(await handleConsultation(dialog.item.id, values), "Đã ghi kết quả.")) {
                            setDialog(null);
                            reload();
                        }
                    }}
                />
            )}
            {dialog?.type === "book" && (
                <BookingDialog
                    initial={{ fullName: dialog.item.fullName, phoneNumber: dialog.item.phoneNumber }}
                    onClose={() => setDialog(null)}
                    onBooked={async (a) => {
                        await handleConsultation(dialog.item.id, { status: "Booked", note: `Đặt lịch ${slotText(a)} ngày ${ddmm(a.appointmentDate)}` });
                        report({ success: true }, `Đã đặt lịch cho ${a.patientName}.`);
                        setDialog(null);
                        reload();
                    }}
                />
            )}
        </div>
    );
};

const HandleDialog = ({ item, onClose, onSubmit }) => {
    const [status, setStatus] = useState("Contacted");
    const [note, setNote] = useState("");
    const [busy, submit] = useSubmit(onSubmit);
    return (
        <Modal title={`Kết quả gọi ${item.fullName}`} description={phoneText(item.phoneNumber)} onClose={onClose}>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit({ status, note: note.trim() }); }}>
                <fieldset className="field">
                    <legend className="label">Kết quả</legend>
                    <div className="flex flex-wrap gap-4 pt-1">
                        {[["Contacted", "Đã tư vấn, khách cân nhắc"], ["Closed", "Không có nhu cầu / không liên lạc được"]].map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 text-body-sm">
                                <input type="radio" name="cs-status" checked={status === value} onChange={() => setStatus(value)} />
                                {label}
                            </label>
                        ))}
                    </div>
                    <p className="help-text">Khách muốn đến khám thì đóng hộp này và bấm Đặt lịch.</p>
                </fieldset>
                <div className="field">
                    <label className="label" htmlFor="cs-note">Ghi chú</label>
                    <textarea id="cs-note" className="input py-2" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <DialogActions onClose={onClose} submitLabel="Lưu kết quả" busy={busy} />
            </form>
        </Modal>
    );
};

export default ReceptionConsultations;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import { Badge, Card, EmptyState, ErrorLine, FilterBar, PageHeader } from "@/components/reception/shared";
import { INVOICE_LABEL, ddmm, money, phoneText, report } from "@/components/reception/receptionUtils";
import { getDebts, getPaymentReminders, remindPayment } from "@/services/receptionService";
import { ROUTES } from "@/utils/routes";
import { cx } from "@/utils/cx";

// "Công nợ": every invoice still owing money, overdue installments first. A late installment is only reminded,
// never fined (BR-PAY-08). Reminders go by SMS and email; the daily job also reminds installments due tomorrow.

const PAGE_SIZE = 10;
const dateTime = (moment) =>
    new Date(moment).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

// forManager: the manager's "Công nợ" page shows the same list without the receptionist's buttons
const ReceptionDebts = ({ forManager = false }) => {
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [version, setVersion] = useState(0);
    const [state, setState] = useState({ loading: true, data: null, error: null });
    const [history, setHistory] = useState(null);

    // Search when the receptionist stops typing
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(keyword.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        let active = true;
        getDebts({ keyword: search, overdueOnly, page, pageSize: PAGE_SIZE }).then(
            (result) => active && setState({ loading: false, data: result.success ? result.data : null, error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [search, overdueOnly, page, version]);

    const remind = async (debt, force = false) => {
        const result = await remindPayment(debt.invoiceId, force);
        // Sent less than 4 hours ago: ask before sending again
        if (!result.success && !force && result.message?.includes("4 hours")) {
            if (window.confirm(`Đã nhắc ${debt.patientName} trong 4 giờ qua. Vẫn gửi lại?`)) await remind(debt, true);
            return;
        }
        if (report(result, `Đã gửi nhắc thanh toán cho ${debt.patientName} (${result.data?.channels || ""}).`)) setVersion((v) => v + 1);
    };

    const data = state.data;
    return (
        <div className="app-content min-h-full">
            <PageHeader title="Công nợ bệnh nhân" description="Hóa đơn còn nợ và kỳ trả góp. Kỳ đến hạn ngày mai được hệ thống tự nhắc lúc 8 giờ; quá hạn thì nhắc lại mỗi tuần." />
            <ErrorLine message={state.error} />

            {data && (
                <dl className="mb-5 grid gap-4 sm:grid-cols-3">
                    <Stat label="Tổng còn nợ" value={money(data.totalRemaining)} />
                    <Stat label="Hóa đơn còn nợ" value={data.totalCount} />
                    <Stat label="Có kỳ góp quá hạn" value={data.overdueInvoiceCount} danger={data.overdueInvoiceCount > 0} />
                </dl>
            )}

            <Card>
                <FilterBar>
                    <SearchInput id="debt-search" label="Tìm" placeholder="Tên, mã bệnh nhân, số điện thoại hoặc số hóa đơn" value={keyword} onChange={setKeyword} className="min-w-64 flex-1" />
                    <label className="flex items-center gap-2 text-body-sm text-ink">
                        <input type="checkbox" className="size-4" checked={overdueOnly} onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }} />
                        Chỉ hóa đơn có kỳ quá hạn
                    </label>
                </FilterBar>
                {state.loading ? (
                    <EmptyState text="Đang tải…" />
                ) : !data || data.items.length === 0 ? (
                    <EmptyState text={search || overdueOnly ? "Không có hóa đơn nào khớp bộ lọc." : "Không có bệnh nhân nào còn nợ."} />
                ) : (
                    <div className="table-wrap rounded-none border-x-0">
                        <table className="table table-stack">
                            <thead>
                                <tr>
                                    <th>Bệnh nhân</th>
                                    <th>Hóa đơn</th>
                                    <th className="text-right">Còn nợ</th>
                                    <th>Kỳ góp</th>
                                    <th>Đã nhắc</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((d) => (
                                    <tr key={d.invoiceId} className={cx(d.overdueCount > 0 && "bg-danger-soft/40")}>
                                        <td data-primary>
                                            <div className="cell-primary">{d.patientName}</div>
                                            <div className="text-caption text-muted">{d.patientPhoneNumber ? phoneText(d.patientPhoneNumber) : "Không có số điện thoại"}</div>
                                        </td>
                                        <td data-label="Hóa đơn">
                                            <div className="text-ink">{d.invoiceNumber}</div>
                                            <div className="flex flex-wrap items-center gap-1 text-caption text-muted">
                                                <Badge map={INVOICE_LABEL} value={d.paymentStatus} /> {d.ageDays} ngày
                                            </div>
                                        </td>
                                        <td data-label="Còn nợ" className="num text-right font-semibold text-ink">{money(d.remainingAmount)}</td>
                                        <td data-label="Kỳ góp">
                                            {d.overdueCount > 0 ? (
                                                <span className="badge badge-danger">Quá hạn {d.overdueCount} kỳ · {money(d.overdueAmount)}</span>
                                            ) : d.nextDueDate ? (
                                                <span className="text-body-sm">Kỳ tới {ddmm(d.nextDueDate)} · {money(d.nextDueAmount)}</span>
                                            ) : (
                                                <span className="text-body-sm text-muted">{d.hasInstallmentPlan ? "Đã hết kỳ" : "Không trả góp"}</span>
                                            )}
                                        </td>
                                        <td data-label="Đã nhắc">
                                            {d.reminderCount > 0 ? (
                                                <button type="button" className="btn-link text-body-sm" onClick={() => setHistory(d)}>
                                                    {d.reminderCount} lần · {dateTime(d.lastRemindedAt)}
                                                </button>
                                            ) : (
                                                <span className="text-body-sm text-muted">Chưa nhắc</span>
                                            )}
                                        </td>
                                        <td data-actions>
                                            {!forManager && (
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <button type="button" className="btn btn-secondary h-9" onClick={() => remind(d)}>Nhắc thanh toán</button>
                                                <Link className="btn btn-primary h-9" to={`${ROUTES.RECEPTION_INVOICES}?invoice=${d.invoiceId}`}>Thu tiền</Link>
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

            {history && <ReminderHistory debt={history} onClose={() => setHistory(null)} />}
        </div>
    );
};

const Stat = ({ label, value, danger }) => (
    <div className="rounded-xl border border-border bg-canvas px-5 py-4">
        <dt className="text-body-sm text-muted">{label}</dt>
        <dd className={cx("num m-0 font-heading text-heading-2 font-bold", danger ? "text-danger" : "text-ink")}>{value}</dd>
    </div>
);

const ReminderHistory = ({ debt, onClose }) => {
    const [items, setItems] = useState(null);
    useEffect(() => {
        let active = true;
        getPaymentReminders(debt.invoiceId).then((result) => active && setItems(result.success ? result.data : []));
        return () => {
            active = false;
        };
    }, [debt.invoiceId]);

    return (
        <Modal title={`Lịch sử nhắc thanh toán · ${debt.invoiceNumber}`} description={debt.patientName} onClose={onClose}>
            {!items ? (
                <p className="text-body-sm text-muted">Đang tải…</p>
            ) : (
                <ul className="space-y-3">
                    {items.map((r) => (
                        <li key={r.id} className="rounded-lg border border-border px-4 py-3 text-body-sm">
                            <p className="text-caption text-muted">
                                {dateTime(r.sentAt)} · {r.isAutomatic ? "Hệ thống tự gửi" : r.sentByName ?? "Lễ tân"} · {r.channels || "không gửi được"}
                            </p>
                            <p className="mt-1 text-ink">{r.message}</p>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
};

export default ReceptionDebts;

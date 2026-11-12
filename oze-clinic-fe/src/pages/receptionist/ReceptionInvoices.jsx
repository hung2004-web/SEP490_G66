import { useEffect, useState } from "react";
import StatusTabs from "@/components/ui/StatusTabs";
import { Link } from "react-router-dom";
import FilterSelect from "@/components/ui/FilterSelect";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import { Badge, Card, EmptyState, ErrorLine, FilterBar, PageHeader } from "@/components/reception/shared";
import { INVOICE_LABEL, money } from "@/components/reception/receptionUtils";
import { clinicToday, getPaymentHistory, searchInvoices } from "@/services/receptionService";
import { ROUTES } from "@/utils/routes";
import { cx } from "@/utils/cx";

// "Hóa đơn": find any invoice by the day it was made, status, patient (name, code, phone) or number, and see every
// payment ever taken: when, how, by whom, with the bank reference. Opening an invoice goes to "Thu tiền".

const PAGE_SIZE = 15;
const QUICK_RANGES = [
    { label: "Hôm nay", from: () => clinicToday(), to: () => clinicToday() },
    { label: "7 ngày", from: () => clinicToday(-6), to: () => clinicToday() },
    { label: "30 ngày", from: () => clinicToday(-29), to: () => clinicToday() },
];
const INVOICE_STATUS_OPTIONS = Object.entries(INVOICE_LABEL).map(([value, [label, tone]]) => ({ value, label, tone }));
const METHODS = [
    { value: "CASH", label: "Tiền mặt" },
    { value: "BANK_TRANSFER", label: "Chuyển khoản" },
    { value: "QR_TRANSFER", label: "Quét QR" },
];
const METHOD_LABEL = Object.fromEntries(METHODS.map((m) => [m.value, m.label]));
const PAYMENT_STATUS = {
    CONFIRMED: ["Đã nhận", "badge-success"],
    PENDING: ["Chờ xác nhận", "badge-warning"],
    FAILED: ["Đã hủy", "badge-neutral"],
    REFUNDED: ["Đã hoàn", "badge-neutral"],
};
const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS).map(([value, [label, tone]]) => ({ value, label, tone }));
const PURPOSE = { Regular: "Thanh toán", Deposit: "Đặt cọc", Installment: "Trả góp" };
const dateTime = (moment) =>
    moment
        ? new Date(moment).toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "Asia/Ho_Chi_Minh",
          })
        : "—";

const ReceptionInvoices = () => {
    const [tab, setTab] = useState("invoices");
    const [range, setRange] = useState({ from: clinicToday(-6), to: clinicToday() });
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setSearch(keyword.trim()), 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Hóa đơn" description="Tìm hóa đơn theo ngày, trạng thái hoặc bệnh nhân, và xem lại mọi lần thu tiền." />

            <Card>
                <nav role="tablist" className="flex gap-1 border-b border-border px-3">
                    {[
                        ["invoices", "Hóa đơn"],
                        ["payments", "Lịch sử thanh toán"],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            role="tab"
                            type="button"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={cx(
                                "-mb-px h-11 border-b-2 px-4 text-label",
                                tab === value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
                <FilterBar>
                    <SearchInput
                        id="inv-search"
                        label="Tìm"
                        placeholder="Tên, mã, số điện thoại bệnh nhân, số hóa đơn"
                        value={keyword}
                        onChange={setKeyword}
                        className="min-w-64 flex-1"
                    />
                    <label className="flex items-center gap-2 text-body-sm text-muted">
                        Từ
                        <input
                            type="date"
                            className="input w-auto"
                            value={range.from}
                            max={range.to}
                            onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-body-sm text-muted">
                        đến
                        <input
                            type="date"
                            className="input w-auto"
                            value={range.to}
                            min={range.from}
                            max={clinicToday()}
                            onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
                        />
                    </label>
                    <div className="flex gap-1">
                        {QUICK_RANGES.map((q) => {
                            const on = range.from === q.from() && range.to === q.to();
                            return (
                                <button
                                    key={q.label}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setRange({ from: q.from(), to: q.to() })}
                                    className={cx(
                                        "rounded-full border px-3 py-1 text-caption",
                                        on ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-body hover:text-ink",
                                    )}
                                >
                                    {q.label}
                                </button>
                            );
                        })}
                    </div>
                </FilterBar>
                {tab === "invoices" ? <InvoiceList search={search} range={range} /> : <PaymentList search={search} range={range} />}
            </Card>
        </div>
    );
};

const InvoiceList = ({ search, range }) => {
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [state, setState] = useState({ loading: true, data: null, error: null });

    useEffect(() => {
        let active = true;
        searchInvoices({ keyword: search, status, fromDate: range.from, toDate: range.to, page, pageSize: PAGE_SIZE }).then(
            (result) => active && setState({ loading: false, data: result.success ? result.data : null, error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [search, status, range, page]);

    const data = state.data;
    return (
        <>
            <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
                <StatusTabs
                    className="w-full"
                    label="Trạng thái"
                    options={INVOICE_STATUS_OPTIONS}
                    value={status}
                    onChange={(v) => {
                        setStatus(v);
                        setPage(1);
                    }}
                />
                {data && <p className="num text-body-sm text-muted">{data.totalCount} hóa đơn</p>}
            </div>
            <ErrorLine message={state.error} />
            {state.loading ? (
                <EmptyState text="Đang tải…" />
            ) : !data || data.items.length === 0 ? (
                <EmptyState text="Không có hóa đơn nào trong khoảng ngày và bộ lọc này." />
            ) : (
                <div className="table-wrap rounded-none border-x-0">
                    <table className="table table-stack">
                        <thead>
                            <tr>
                                <th>Ngày lập</th>
                                <th>Số hóa đơn</th>
                                <th>Bệnh nhân</th>
                                <th className="text-right">Phải trả</th>
                                <th className="text-right">Đã thu</th>
                                <th className="text-right">Còn nợ</th>
                                <th>Trạng thái</th>
                                <th className="text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((i) => (
                                <tr key={i.id}>
                                    <td data-label="Ngày lập" className="num whitespace-nowrap">
                                        {dateTime(i.createdAt)}
                                    </td>
                                    <td data-label="Số hóa đơn" className="whitespace-nowrap">
                                        {i.invoiceNumber}
                                    </td>
                                    <td data-primary className="cell-primary">
                                        {i.patientName}
                                    </td>
                                    <td data-label="Phải trả" className="num text-right">
                                        {money(i.finalAmount)}
                                    </td>
                                    <td data-label="Đã thu" className="num text-right">
                                        {money(i.paidAmount)}
                                    </td>
                                    <td data-label="Còn nợ" className={cx("num text-right", Number(i.remainingAmount) > 0 && "font-semibold text-danger")}>
                                        {money(i.remainingAmount)}
                                    </td>
                                    <td data-label="Trạng thái">
                                        <Badge map={INVOICE_LABEL} value={i.paymentStatus} />
                                    </td>
                                    <td data-actions className="text-right">
                                        <Link className="btn btn-secondary h-9" to={`${ROUTES.RECEPTION_INVOICES}?invoice=${i.id}`}>
                                            Mở hóa đơn
                                        </Link>
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
        </>
    );
};

const PaymentList = ({ search, range }) => {
    const [method, setMethod] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [state, setState] = useState({ loading: true, data: null, error: null });

    useEffect(() => {
        let active = true;
        getPaymentHistory({ keyword: search, method, status, fromDate: range.from, toDate: range.to, page, pageSize: PAGE_SIZE }).then(
            (result) => active && setState({ loading: false, data: result.success ? result.data : null, error: result.success ? null : result.message }),
        );
        return () => {
            active = false;
        };
    }, [search, method, status, range, page]);

    const data = state.data;
    return (
        <>
            <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
                <FilterSelect
                    id="pay-method"
                    label="Phương thức"
                    options={METHODS}
                    value={method}
                    onChange={(v) => {
                        setMethod(v);
                        setPage(1);
                    }}
                />
                <StatusTabs
                    className="w-full"
                    label="Trạng thái"
                    options={PAYMENT_STATUS_OPTIONS}
                    value={status}
                    onChange={(v) => {
                        setStatus(v);
                        setPage(1);
                    }}
                />
            </div>
            {data && (
                <dl className="grid gap-4 border-y border-border bg-surface-muted/50 px-5 py-4 sm:grid-cols-4">
                    <Total label="Tiền mặt đã nhận" value={data.confirmedCash} />
                    <Total label="Chuyển khoản đã nhận" value={data.confirmedTransfer} />
                    <Total label="Tổng đã nhận" value={data.confirmedCash + data.confirmedTransfer} strong />
                    <Total label="Chờ xác nhận" value={data.pendingAmount} warn={data.pendingAmount > 0} />
                </dl>
            )}
            <ErrorLine message={state.error} />
            {state.loading ? (
                <EmptyState text="Đang tải…" />
            ) : !data || data.items.length === 0 ? (
                <EmptyState text="Không có lần thu tiền nào trong khoảng ngày và bộ lọc này." />
            ) : (
                <div className="table-wrap rounded-none border-x-0">
                    <table className="table table-stack">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Bệnh nhân</th>
                                <th>Hóa đơn</th>
                                <th>Phương thức</th>
                                <th className="text-right">Số tiền</th>
                                <th>Trạng thái</th>
                                <th>Người thu / xác nhận</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((p) => (
                                <tr key={p.id}>
                                    <td data-label="Thời gian" className="num whitespace-nowrap">
                                        {dateTime(p.paidAt ?? p.createdAt)}
                                    </td>
                                    <td data-primary>
                                        <div className="cell-primary">{p.patientName}</div>
                                        <div className="text-caption text-muted">{p.patientCode}</div>
                                    </td>
                                    <td data-label="Hóa đơn">
                                        <Link className="btn-link" to={`${ROUTES.RECEPTION_INVOICES}?invoice=${p.invoiceId}`}>
                                            {p.invoiceNumber}
                                        </Link>
                                        <div className="text-caption text-muted">{PURPOSE[p.purpose] ?? p.purpose}</div>
                                    </td>
                                    <td data-label="Phương thức">
                                        {METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}
                                        {p.transactionReference && <div className="text-caption text-muted">mã {p.transactionReference}</div>}
                                    </td>
                                    <td data-label="Số tiền" className="num text-right font-semibold text-ink">
                                        {money(p.amount)}
                                    </td>
                                    <td data-label="Trạng thái">
                                        <Badge map={PAYMENT_STATUS} value={p.paymentStatus} />
                                    </td>
                                    <td data-label="Người thu">{p.confirmedByName ?? (p.paymentStatus === "PENDING" ? "Chưa xác nhận" : "—")}</td>
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
        </>
    );
};

const Total = ({ label, value, strong, warn }) => (
    <div>
        <dt className="text-caption text-muted">{label}</dt>
        <dd className={cx("num m-0 font-heading", strong ? "text-heading-3 font-bold text-ink" : "text-title text-ink", warn && "text-warning")}>
            {money(value)}
        </dd>
    </div>
);

export default ReceptionInvoices;

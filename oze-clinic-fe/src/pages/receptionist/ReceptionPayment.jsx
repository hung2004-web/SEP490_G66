import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchInput from "@/components/ui/SearchInput";
import { WithQueuePanel } from "@/components/reception/QueueSidePanel";
import { Badge, Card, EmptyState, ErrorLine, PageHeader } from "@/components/reception/shared";
import { INVOICE_LABEL, clockOf, ddmm, money, report } from "@/components/reception/receptionUtils";
import {
    clinicToday,
    confirmPayment,
    createInvoice,
    getAppointments,
    getInvoice,
    getOpenInvoices,
    getPaidInvoices,
    getRecentInvoices,
    recordPayment,
    requestRefund,
} from "@/services/receptionService";
import { cx } from "@/utils/cx";

// "Thu tiền": three lists on the left, the chosen item on the right.
// - Chưa lập hóa đơn: visits completed in the last 7 days without an invoice. The invoice holds exactly the services
//   done in the visit, at the price saved at booking (BR-PAY-03 "làm cái gì trả cái đó").
// - Chờ thu: invoices still owing. Cash is confirmed at once; a transfer waits until the money is seen (BR-PAY-04).
// - Đã thu: paid invoices, where the receptionist can ask the manager for a refund (BR-PAY-07).

const OPEN = ["UNPAID", "PARTIALLY_PAID", "PENDING_CONFIRMATION"];
const METHODS = [
    { value: "CASH", label: "Tiền mặt" },
    { value: "BANK_TRANSFER", label: "Chuyển khoản" },
    { value: "QR_TRANSFER", label: "Quét QR" },
];
const METHOD_LABEL = Object.fromEntries(METHODS.map((m) => [m.value, m.label]));
const PAYMENT_STATUS = {
    PENDING: ["Chờ xác nhận", "badge-warning"],
    CONFIRMED: ["Đã nhận", "badge-success"],
    FAILED: ["Đã hủy", "badge-neutral"],
    REFUNDED: ["Đã hoàn", "badge-neutral"],
};
const LISTS = [
    { value: "visits", label: "Chưa lập hóa đơn" },
    { value: "open", label: "Chờ thu" },
    { value: "paid", label: "Đã thu" },
];

const fetchLists = async () => {
    const [visits, invoices, open, paid] = await Promise.all([
        getAppointments({ fromDate: clinicToday(-7), toDate: clinicToday(), status: "COMPLETED" }),
        getRecentInvoices(),
        getOpenInvoices(),
        getPaidInvoices(),
    ]);
    const failed = [visits, invoices, open, paid].find((r) => !r.success);
    const invoiced = new Set((invoices.data?.items ?? []).filter((i) => i.paymentStatus !== "CANCELLED" && i.appointmentId).map((i) => i.appointmentId));
    return {
        error: failed?.message ?? null,
        visits: (visits.data?.items ?? []).filter((a) => !invoiced.has(a.id)),
        open: (open.data?.items ?? []).filter((i) => OPEN.includes(i.paymentStatus)),
        paid: paid.data?.items ?? [],
    };
};

const ReceptionPayment = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [lists, setLists] = useState({ loading: true, visits: [], open: [], paid: [], error: null });
    const [list, setList] = useState("open");
    const [selected, setSelected] = useState(() => (searchParams.get("invoice") ? { kind: "invoice", id: Number(searchParams.get("invoice")) } : null));
    const [keyword, setKeyword] = useState("");
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let active = true;
        fetchLists().then((next) => {
            if (!active) return;
            setLists({ loading: false, ...next });
            // Open the first item of the list when nothing (still) chosen
            setSelected((current) => {
                if (current) return current;
                if (next.visits.length > 0) {
                    setList("visits");
                    return { kind: "visit", id: next.visits[0].id };
                }
                return next.open[0] ? { kind: "invoice", id: next.open[0].id } : null;
            });
        });
        return () => {
            active = false;
        };
    }, [version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const select = (item) => {
        setSelected(item);
        setSearchParams({}, { replace: true });
    };

    const q = keyword.trim().toLowerCase();
    const visits = lists.visits.filter((a) => !q || `${a.patientName} ${a.patientCode}`.toLowerCase().includes(q));
    const invoices = (list === "paid" ? lists.paid : lists.open).filter((i) => !q || `${i.patientName} ${i.invoiceNumber}`.toLowerCase().includes(q));
    const visit = selected?.kind === "visit" ? lists.visits.find((a) => a.id === selected.id) : null;

    return (
        <div className="app-content min-h-full">
            <PageHeader title="Thu tiền" description="Lập hóa đơn cho lượt khám xong, thu tiền, hoặc gửi yêu cầu hoàn tiền cho hóa đơn đã thu." />
            <ErrorLine message={lists.error} />

            {/* The queue beside: who is still being seen and will come to the counter next */}
            <WithQueuePanel>
                <div className="grid items-start gap-5 2xl:grid-cols-[320px_minmax(0,1fr)]">
                    <Card className="2xl:sticky 2xl:top-20">
                        <div role="tablist" aria-label="Danh sách" className="flex gap-1 border-b border-border px-3">
                            {LISTS.map((item) => {
                                const count = { visits: lists.visits.length, open: lists.open.length, paid: lists.paid.length }[item.value];
                                return (
                                    <button
                                        key={item.value}
                                        role="tab"
                                        type="button"
                                        aria-selected={list === item.value}
                                        onClick={() => setList(item.value)}
                                        className={cx(
                                            "-mb-px flex h-11 items-center gap-1.5 border-b-2 px-2 text-label",
                                            list === item.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
                                        )}
                                    >
                                        {item.label}
                                        {count > 0 && item.value !== "paid" && (
                                            <span className="num rounded-full bg-surface-muted px-1.5 text-caption text-ink">{count}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-4 pt-4">
                            <SearchInput id="pay-search" label="Tìm" placeholder="Tên bệnh nhân hoặc số hóa đơn" value={keyword} onChange={setKeyword} />
                        </div>
                        {lists.loading ? (
                            <EmptyState text="Đang tải…" />
                        ) : list === "visits" ? (
                            visits.length === 0 ? (
                                <EmptyState text="Mọi lượt khám xong trong 7 ngày qua đều đã có hóa đơn." />
                            ) : (
                                <ul className="mt-3 max-h-[60vh] overflow-y-auto border-t border-border">
                                    {visits.map((a) => (
                                        <ListRow
                                            key={a.id}
                                            active={visit?.id === a.id}
                                            onClick={() => select({ kind: "visit", id: a.id })}
                                            name={a.patientName}
                                            detail={`Khám ${ddmm(a.appointmentDate)} · ${a.doctorName ?? ""}`}
                                        >
                                            <span className="badge badge-warning">Chưa lập</span>
                                        </ListRow>
                                    ))}
                                </ul>
                            )
                        ) : invoices.length === 0 ? (
                            <EmptyState text={list === "open" ? "Không còn hóa đơn nào chờ thu." : "Chưa có hóa đơn đã thu."} />
                        ) : (
                            <ul className="mt-3 max-h-[60vh] overflow-y-auto border-t border-border">
                                {invoices.map((i) => (
                                    <ListRow
                                        key={i.id}
                                        active={selected?.kind === "invoice" && selected.id === i.id}
                                        onClick={() => select({ kind: "invoice", id: i.id })}
                                        name={i.patientName}
                                        detail={i.invoiceNumber}
                                    >
                                        <span className="num block font-semibold text-ink">{money(list === "paid" ? i.paidAmount : i.remainingAmount)}</span>
                                        <Badge map={INVOICE_LABEL} value={i.paymentStatus} />
                                    </ListRow>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {visit ? (
                        <CreateInvoicePanel
                            key={visit.id}
                            appointment={visit}
                            onCreated={(invoice) => {
                                setList("open");
                                setSelected({ kind: "invoice", id: invoice.id });
                                reload();
                            }}
                        />
                    ) : selected?.kind === "invoice" ? (
                        <InvoicePanel key={`${selected.id}-${version}`} invoiceId={selected.id} onChanged={reload} />
                    ) : (
                        !lists.loading && (
                            <Card>
                                <EmptyState text="Chọn một lượt khám hoặc một hóa đơn trong danh sách." />
                            </Card>
                        )
                    )}
                </div>
            </WithQueuePanel>
        </div>
    );
};

const ListRow = ({ active, onClick, name, detail, children }) => (
    <li>
        <button
            type="button"
            onClick={onClick}
            aria-current={active}
            className={cx(
                "flex w-full items-start gap-3 border-b border-l-4 border-b-border px-4 py-3 text-left",
                active ? "border-l-primary bg-primary-softer" : "border-l-transparent hover:bg-surface-muted",
            )}
        >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary" aria-hidden>
                {(name ?? "?").trim().split(" ").at(-1)[0]}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{name}</span>
                <span className="block truncate text-caption text-muted">{detail}</span>
            </span>
            <span className="text-right">{children}</span>
        </button>
    </li>
);

// The invoice of one visit: the services done, at the price saved for the visit; only the discount and notes are typed
const CreateInvoicePanel = ({ appointment, onCreated }) => {
    const items = (appointment.services ?? []).map((s, index) => ({
        serviceId: s.serviceId,
        serviceName: s.variantName ? `${s.serviceName} · ${s.variantName}` : s.serviceName,
        unitPrice: Number(s.priceAtBooking),
        quantity: 1,
        sortOrder: index + 1,
    }));
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const tooMuch = discount > total;

    const create = async (event) => {
        event.preventDefault();
        setBusy(true);
        const result = await createInvoice({
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            discountAmount: discount,
            notes: notes.trim() || null,
            items,
        });
        setBusy(false);
        if (report(result, `Đã lập hóa đơn ${result.data?.invoiceNumber ?? ""}.`)) onCreated(result.data);
    };

    return (
        <Card>
            <div className="px-5 py-4">
                <h2 className="font-heading text-heading-3 text-ink">{appointment.patientName}</h2>
                <p className="text-body-sm text-muted">
                    Khám xong ngày {ddmm(appointment.appointmentDate)} với {appointment.doctorName} · {appointment.patientCode}
                </p>
            </div>
            {items.length === 0 ? (
                <EmptyState text="Lượt khám này chưa có dịch vụ nào. Nhờ bác sĩ ghi dịch vụ đã làm rồi lập hóa đơn." />
            ) : (
                <form onSubmit={create}>
                    <div className="table-wrap rounded-none border-x-0">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Dịch vụ đã làm</th>
                                    <th className="text-right">SL</th>
                                    <th className="text-right">Đơn giá</th>
                                    <th className="text-right">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.sortOrder}>
                                        <td className="text-ink">{item.serviceName}</td>
                                        <td className="num text-right">{item.quantity}</td>
                                        <td className="num text-right">{money(item.unitPrice)}</td>
                                        <td className="num text-right text-ink">{money(item.unitPrice * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                        <div className="field">
                            <label className="label" htmlFor="inv-discount">
                                Giảm giá
                            </label>
                            <input
                                id="inv-discount"
                                className="input num"
                                type="number"
                                min={0}
                                step={1000}
                                value={discount}
                                aria-invalid={tooMuch}
                                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                            />
                            {tooMuch && <p className="error-text">Giảm giá không lớn hơn tổng tiền.</p>}
                        </div>
                        <div className="field">
                            <label className="label" htmlFor="inv-notes">
                                Ghi chú
                            </label>
                            <input id="inv-notes" className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-4 border-t border-border px-5 py-4">
                        <p className="text-body-sm text-muted">
                            Phải thu <span className="num text-title font-semibold text-ink">{money(Math.max(0, total - discount))}</span>
                        </p>
                        <button type="submit" className="btn btn-primary" disabled={busy || tooMuch}>
                            {busy && <span className="btn-spinner" aria-hidden />}
                            Lập hóa đơn
                        </button>
                    </div>
                </form>
            )}
        </Card>
    );
};

const InvoicePanel = ({ invoiceId, onChanged }) => {
    const [invoice, setInvoice] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        getInvoice(invoiceId).then((result) => {
            if (!active) return;
            if (result.success) setInvoice(result.data);
            else setError(result.message);
        });
        return () => {
            active = false;
        };
    }, [invoiceId]);

    if (error)
        return (
            <Card>
                <EmptyState text={error} />
            </Card>
        );
    if (!invoice)
        return (
            <Card>
                <EmptyState text="Đang tải hóa đơn…" />
            </Card>
        );

    const remaining = Number(invoice.remainingAmount);
    const waiting = invoice.payments.filter((p) => p.paymentStatus === "PENDING").reduce((sum, p) => sum + Number(p.amount), 0);
    const collectable = OPEN.includes(invoice.paymentStatus) ? Math.max(0, remaining - waiting) : 0;
    const refundable = Number(invoice.paidAmount) > 0 && ["PAID", "PARTIALLY_PAID", "PARTIALLY_REFUNDED"].includes(invoice.paymentStatus);

    const confirm = async (payment) => {
        if (report(await confirmPayment(payment.id), `Đã xác nhận nhận ${money(payment.amount)}.`)) onChanged();
    };

    return (
        <div className="space-y-5">
            <Card>
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="mr-auto">
                        <h2 className="font-heading text-heading-3 text-ink">{invoice.patientName}</h2>
                        <p className="text-body-sm text-muted">
                            {invoice.invoiceNumber} · lập ngày {new Date(invoice.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                        </p>
                    </div>
                    <Badge map={INVOICE_LABEL} value={invoice.paymentStatus} />
                </div>
                <div className="table-wrap rounded-none border-x-0">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nội dung điều trị</th>
                                <th className="text-right">SL</th>
                                <th className="text-right">Đơn giá</th>
                                <th className="text-right">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="text-ink">{item.serviceName}</div>
                                        {item.description && <div className="text-caption text-muted">{item.description}</div>}
                                    </td>
                                    <td className="num text-right">{item.quantity}</td>
                                    <td className="num text-right">{money(item.unitPrice)}</td>
                                    <td className="num text-right text-ink">{money(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <dl className="grid gap-1 px-5 py-4 text-body-sm sm:ml-auto sm:max-w-sm">
                    <Row label="Tổng cộng" value={money(invoice.totalAmount)} />
                    {Number(invoice.discountAmount) > 0 && <Row label="Giảm giá" value={`− ${money(invoice.discountAmount)}`} />}
                    {Number(invoice.paidAmount) > 0 && <Row label="Đã thu" value={money(invoice.paidAmount)} />}
                    <Row label="Còn phải thu" value={money(remaining)} strong />
                </dl>
            </Card>

            {invoice.payments.length > 0 && (
                <Card title="Lịch sử thu tiền">
                    <ul className="divide-y divide-border">
                        {invoice.payments.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-body-sm">
                                <span className="num w-14 text-muted">{clockOf(p.paidAt ?? p.createdAt)}</span>
                                <span className="flex-1 text-ink">
                                    {METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}
                                    {p.transactionReference && <span className="text-muted"> · mã {p.transactionReference}</span>}
                                </span>
                                <span className="num text-ink">{money(p.amount)}</span>
                                <Badge map={PAYMENT_STATUS} value={p.paymentStatus} />
                                {p.paymentStatus === "PENDING" && (
                                    <button type="button" className="btn btn-secondary h-9" onClick={() => confirm(p)}>
                                        Đã nhận tiền
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {collectable > 0 && <PayForm invoice={invoice} collectable={collectable} waiting={waiting} onChanged={onChanged} />}
            {refundable && <RefundForm invoice={invoice} onChanged={onChanged} />}
        </div>
    );
};

const PayForm = ({ invoice, collectable, waiting, onChanged }) => {
    const [method, setMethod] = useState("CASH");
    const [amount, setAmount] = useState(collectable);
    const [reference, setReference] = useState("");
    const [busy, setBusy] = useState(false);
    const tooMuch = amount > collectable;
    const needsReference = method !== "CASH" && !reference.trim();

    const pay = async (event) => {
        event.preventDefault();
        setBusy(true);
        const ok = report(
            await recordPayment(invoice.id, { amount, paymentMethod: method, purpose: "Regular", transactionReference: reference.trim() || null }),
            method === "CASH" ? `Đã thu ${money(amount)} tiền mặt.` : `Đã ghi nhận ${money(amount)}, chờ xác nhận khi tiền về tài khoản.`,
        );
        setBusy(false);
        if (ok) onChanged();
    };

    return (
        <Card title="Thu tiền">
            <form onSubmit={pay} className="space-y-4 px-5 py-4">
                <fieldset className="field">
                    <legend className="label">Phương thức thanh toán</legend>
                    <div role="radiogroup" className="flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
                        {METHODS.map((m) => (
                            <button
                                key={m.value}
                                type="button"
                                role="radio"
                                aria-checked={method === m.value}
                                onClick={() => setMethod(m.value)}
                                className={cx(
                                    "rounded-md px-4 py-1.5 text-label",
                                    method === m.value ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink",
                                )}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="field">
                        <label className="label label-required" htmlFor="pay-amount">
                            Số tiền thu
                        </label>
                        <input
                            id="pay-amount"
                            className="input num"
                            type="number"
                            min={1000}
                            step={1000}
                            max={collectable}
                            value={amount}
                            aria-invalid={tooMuch}
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                        {tooMuch ? (
                            <p className="error-text">Không thu quá {money(collectable)}.</p>
                        ) : (
                            <p className="help-text">
                                {waiting > 0 ? `Đã trừ ${money(waiting)} chuyển khoản đang chờ xác nhận. ` : ""}Thu ít hơn thì hóa đơn thành Thu một phần.
                            </p>
                        )}
                    </div>
                    {method !== "CASH" && (
                        <div className="field">
                            <label className="label label-required" htmlFor="pay-ref">
                                Mã giao dịch ngân hàng
                            </label>
                            <input id="pay-ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
                            <p className="help-text">Khoản này chờ xác nhận đến khi thấy tiền về tài khoản.</p>
                        </div>
                    )}
                </div>
                <div className="flex justify-end">
                    <button type="submit" className="btn btn-primary" disabled={busy || amount <= 0 || tooMuch || needsReference}>
                        {busy && <span className="btn-spinner" aria-hidden />}
                        {method === "CASH" ? `Thu ${money(amount)}` : "Ghi nhận chuyển khoản"}
                    </button>
                </div>
            </form>
        </Card>
    );
};

// The amount is worked out by the system (paid minus work done) and the manager decides (BR-PAY-07)
const RefundForm = ({ invoice, onChanged }) => {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        const ok = report(await requestRefund(invoice.id, reason.trim()), "Đã gửi yêu cầu hoàn tiền. Quản lý sẽ duyệt.");
        setBusy(false);
        if (ok) {
            setOpen(false);
            onChanged();
        }
    };

    return (
        <Card
            title="Hoàn tiền"
            actions={
                !open && (
                    <button type="button" className="btn btn-secondary h-9" onClick={() => setOpen(true)}>
                        Yêu cầu hoàn tiền
                    </button>
                )
            }
        >
            {open ? (
                <form onSubmit={submit} className="space-y-4 px-5 py-4">
                    <p className="text-body-sm text-muted">
                        Số tiền hoàn do hệ thống tính: tiền đã thu {money(invoice.paidAmount)} trừ phần việc đã làm (quản lý nhập khi duyệt).
                    </p>
                    <div className="field">
                        <label className="label label-required" htmlFor="refund-reason">
                            Lý do hoàn tiền
                        </label>
                        <textarea
                            id="refund-reason"
                            className="input py-2"
                            rows={3}
                            maxLength={500}
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ví dụ: thu trùng, bệnh nhân không làm dịch vụ"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                            Đóng
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={busy || !reason.trim()}>
                            Gửi yêu cầu
                        </button>
                    </div>
                </form>
            ) : (
                <p className="px-5 py-4 text-body-sm text-muted">Thu sai hoặc bệnh nhân không làm dịch vụ thì gửi yêu cầu, quản lý duyệt rồi mới hoàn.</p>
            )}
        </Card>
    );
};

const Row = ({ label, value, strong }) => (
    <div className={cx("flex justify-between gap-6", strong && "border-t border-border pt-2 text-title font-semibold text-ink")}>
        <dt className={strong ? "" : "text-muted"}>{label}</dt>
        <dd className="num m-0">{value}</dd>
    </div>
);

export default ReceptionPayment;

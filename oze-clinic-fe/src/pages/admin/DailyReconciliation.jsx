import { useEffect, useState } from "react";
import { Card, EmptyState, ErrorLine, PageHeader } from "@/components/reception/shared";
import { clockOf, money, report } from "@/components/reception/receptionUtils";
import api from "@/services/api";
import { call, clinicToday } from "@/services/receptionService";
import { cx } from "@/utils/cx";

// "Đối soát cuối ngày" (manager): every cash drawer of the day, money received by method, transfers still waiting
// for the bank, refunds paid back. Confirming closes the day with a fixed record; it is refused while a drawer of
// that day is still open, and needs notes when something does not add up.

const getDaily = (date) => call(() => api.get("/api/reconciliations/daily", { params: { date } }));
const confirmDaily = (date, notes) => call(() => api.post(`/api/reconciliations/daily/${date}/confirm`, { notes: notes || null }));
const METHOD_LABEL = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", QR_TRANSFER: "Quét QR" };

const DailyReconciliation = () => {
    const [date, setDate] = useState(clinicToday());
    const [state, setState] = useState({ loading: true, data: null, error: null });
    const [version, setVersion] = useState(0);
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let active = true;
        getDaily(date).then((result) => active && setState({ loading: false, data: result.success ? result.data : null, error: result.success ? null : result.message }));
        return () => {
            active = false;
        };
    }, [date, version]);

    const d = state.data;
    const needsNote = d && (d.cashDifference !== 0 || d.cashOutsideSessions > 0 || d.pendingTransfers.length > 0);
    const blocked = d && d.openSessionCount > 0;

    const confirm = async (event) => {
        event.preventDefault();
        setBusy(true);
        const ok = report(await confirmDaily(date, notes.trim()), `Đã chốt đối soát ngày ${date.split("-").reverse().join("/")}.`);
        setBusy(false);
        if (ok) {
            setNotes("");
            setVersion((v) => v + 1);
        }
    };

    return (
        <div className="app-content min-h-full space-y-5">
            <PageHeader title="Đối soát cuối ngày" description="Kiểm các két tiền mặt của lễ tân, tiền chuyển khoản và hoàn tiền trong ngày, rồi chốt sổ.">
                <input type="date" className="input w-auto" max={clinicToday()} value={date} aria-label="Ngày đối soát" onChange={(e) => { if (e.target.value) { setDate(e.target.value); setState((s) => ({ ...s, loading: true })); } }} />
            </PageHeader>
            <ErrorLine message={state.error} />

            {state.loading || !d ? (
                <Card><EmptyState text="Đang tải…" /></Card>
            ) : (
                <>
                    {d.isConfirmed ? (
                        <p className="rounded-xl border border-success/40 bg-success-soft px-5 py-4 text-body-sm text-success">
                            Đã chốt lúc {new Date(d.confirmedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} bởi {d.confirmedByName ?? "quản lý"}.
                            {d.notes && <span className="block text-ink">Ghi chú: {d.notes}</span>}
                        </p>
                    ) : blocked ? (
                        <p role="alert" className="rounded-xl border border-warning/40 bg-warning-soft px-5 py-4 text-body-sm text-warning">
                            Còn {d.openSessionCount} két chưa bàn giao. Lễ tân cần đếm tiền và chốt két trước khi đối soát.
                        </p>
                    ) : null}

                    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat label="Tiền mặt thu trong ngày" value={money(d.cashCollected)} hint={d.cashOutsideSessions > 0 ? `${money(d.cashOutsideSessions)} thu khi không mở két` : null} warn={d.cashOutsideSessions > 0} />
                        <Stat label="Chênh lệch két" value={money(d.cashDifference)} hint={`Phải có ${money(d.cashExpected)} · đếm được ${money(d.cashCounted)}`} warn={d.cashDifference !== 0} />
                        <Stat label="Chuyển khoản đã nhận" value={money(d.transferConfirmed)} hint={d.pendingTransfers.length ? `${d.pendingTransfers.length} khoản chờ đối soát · ${money(d.pendingTransferAmount)}` : "Không còn khoản chờ"} warn={d.pendingTransfers.length > 0} />
                        <Stat label="Đã hoàn tiền" value={money(d.refundTotal)} hint={`${d.refunds.length} yêu cầu`} />
                    </dl>

                    <Card title={`Két tiền mặt trong ngày (${d.sessions.length})`}>
                        {d.sessions.length === 0 ? (
                            <EmptyState text="Không có két nào được mở trong ngày này." />
                        ) : (
                            <div className="table-wrap rounded-none border-x-0 border-b-0">
                                <table className="table table-stack">
                                    <thead>
                                        <tr><th>Lễ tân</th><th>Ca</th><th className="text-right">Đầu ca</th><th className="text-right">Thu tiền mặt</th><th className="text-right">Đã chi</th><th className="text-right">Phải có</th><th className="text-right">Đếm được</th><th className="text-right">Chênh lệch</th><th>Bàn giao cho</th></tr>
                                    </thead>
                                    <tbody>
                                        {d.sessions.map((s) => (
                                            <tr key={s.id}>
                                                <td data-primary className="cell-primary">{s.openedByName}</td>
                                                <td data-label="Ca" className="num">{clockOf(s.openedAt)} – {s.closedAt ? clockOf(s.closedAt) : <span className="badge badge-warning">Đang mở</span>}</td>
                                                <td data-label="Đầu ca" className="num text-right">{money(s.openingCash)}</td>
                                                <td data-label="Thu" className="num text-right">{s.cashCollected == null ? "—" : money(s.cashCollected)}</td>
                                                <td data-label="Đã chi" className="num text-right">{s.expenseTotal == null ? "—" : money(s.expenseTotal)}</td>
                                                <td data-label="Phải có" className="num text-right">{s.expectedCash == null ? "—" : money(s.expectedCash)}</td>
                                                <td data-label="Đếm được" className="num text-right">{s.countedCash == null ? "—" : money(s.countedCash)}</td>
                                                <td data-label="Chênh lệch" className={cx("num text-right", s.difference ? "text-danger" : "")}>{s.difference == null ? "—" : money(s.difference)}</td>
                                                <td data-label="Bàn giao cho">{s.status === "Closed" ? s.handoverToName ?? "Chốt cuối ngày" : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {d.pendingTransfers.length > 0 && (
                        <Card title="Chuyển khoản chờ đối soát với ngân hàng">
                            <ul className="divide-y divide-border">
                                {d.pendingTransfers.map((p) => (
                                    <li key={p.paymentId} className="flex flex-wrap items-center gap-3 px-5 py-3 text-body-sm">
                                        <span className="flex-1 text-ink">{p.patientName} · {p.invoiceNumber}</span>
                                        <span className="text-muted">{METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}{p.transactionReference && ` · mã ${p.transactionReference}`}</span>
                                        <span className="num text-ink">{money(p.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {d.refunds.length > 0 && (
                        <Card title="Hoàn tiền trong ngày">
                            <ul className="divide-y divide-border">
                                {d.refunds.map((r) => (
                                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-body-sm">
                                        <span className="flex-1 text-ink">{r.patientName} · {r.invoiceNumber}</span>
                                        <span className="num text-ink">{money(r.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {!d.isConfirmed && (
                        <Card title="Chốt đối soát">
                            <form className="space-y-4 px-5 py-4" onSubmit={confirm}>
                                <div className="field">
                                    <label className={cx("label", needsNote && "label-required")} htmlFor="rec-notes">Ghi chú</label>
                                    <textarea id="rec-notes" className="input py-2" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={needsNote ? "Giải thích chênh lệch, khoản thu ngoài két hoặc chuyển khoản còn chờ" : ""} />
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" className="btn btn-primary" disabled={busy || blocked || (needsNote && !notes.trim())}>Chốt đối soát ngày</button>
                                </div>
                            </form>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

const Stat = ({ label, value, hint, warn }) => (
    <div className={cx("rounded-xl border bg-canvas px-5 py-4", warn ? "border-warning/60" : "border-border")}>
        <dt className="text-body-sm text-muted">{label}</dt>
        <dd className="num m-0 font-heading text-heading-2 font-bold text-ink">{value}</dd>
        {hint && <p className={cx("text-caption", warn ? "text-warning" : "text-muted")}>{hint}</p>}
    </div>
);

export default DailyReconciliation;

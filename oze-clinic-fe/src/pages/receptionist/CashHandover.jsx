import { useCallback, useEffect, useState } from "react";
import { Trash2, Wallet } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Card, EmptyState, ErrorLine, PageHeader } from "@/components/reception/shared";
import { clockOf, money, report } from "@/components/reception/receptionUtils";
import {
    EXPENSE_CATEGORIES,
    addCashExpense,
    closeCashSession,
    expenseCategoryLabel,
    getCashSessions,
    getCurrentCashSession,
    getHandoverCandidates,
    openCashSession,
    removeCashExpense,
} from "@/services/cashSessionService";
import { cx } from "@/utils/cx";

// "Bàn giao ca" (F-PAY-06, BR-PAY-09..10): open the drawer with the starting cash, money in and out during the
// shift, then count and hand over. Cash taken in "Thu tiền" counts by itself (payments this receptionist confirmed
// while the drawer is open); transfers are listed but are not in the drawer. The steps are a real sequence.

const METHOD_LABEL = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", QR_TRANSFER: "Quét QR" };
const toNumber = (text) => Number(String(text).replace(/[^\d]/g, ""));
const dateTime = (moment) =>
    moment ? new Date(moment).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "";

const fetchAll = () => Promise.all([getCurrentCashSession(), getCashSessions({ pageSize: 5 })]);

const CashHandover = () => {
    const [state, setState] = useState({ loading: true, session: null, history: [], error: null });
    const [version, setVersion] = useState(0);
    const [expenseOpen, setExpenseOpen] = useState(false);

    useEffect(() => {
        let active = true;
        fetchAll().then(([current, past]) => {
            if (!active) return;
            setState({
                loading: false,
                session: current.success ? current.data : null,
                history: past.success ? past.data.items.filter((x) => x.status === "Closed") : [],
                error: current.success ? null : current.message,
            });
        });
        return () => {
            active = false;
        };
    }, [version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const act = async (request, successText) => {
        const ok = report(await request, successText);
        if (ok) {
            setExpenseOpen(false);
            reload();
        }
        return ok;
    };

    const { session } = state;

    return (
        <div className="app-content min-h-full space-y-5">
            <PageHeader
                title="Bàn giao ca"
                description={session ? `Mở két lúc ${clockOf(session.openedAt)} · ${session.openedByName}` : "Mở két đầu ca, ghi khoản chi, cuối ca đếm tiền và bàn giao cho ca sau."}
            />
            <ErrorLine message={state.error} />

            {state.loading ? (
                <Card><EmptyState text="Đang tải…" /></Card>
            ) : session ? (
                <>
                    <Step number={1} title={`Khoản thu trong ca (${session.payments.length})`}>
                        {session.payments.length === 0 ? (
                            <EmptyState text="Chưa thu khoản nào. Thu ở trang Thu tiền, số tiền tự cộng vào đây." />
                        ) : (
                            <div className="table-wrap rounded-none border-x-0 border-b-0">
                                <table className="table">
                                    <thead><tr><th>Giờ</th><th>Số hóa đơn</th><th>Bệnh nhân</th><th>Phương thức</th><th className="text-right">Số tiền</th></tr></thead>
                                    <tbody>
                                        {session.payments.map((p) => (
                                            <tr key={p.paymentId}>
                                                <td className="num">{clockOf(p.paidAt)}</td>
                                                <td>{p.invoiceNumber}</td>
                                                <td className="cell-primary">{p.patientName}</td>
                                                <td>{METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}</td>
                                                <td className="num text-right">{money(p.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <dl className="grid gap-x-8 gap-y-1 border-t border-border px-5 py-4 text-body-sm sm:grid-cols-2">
                            <Line label="Tiền mặt đã thu" value={money(session.cashCollected)} />
                            <Line label="Chuyển khoản đã xác nhận (không ở két)" value={money(session.transferConfirmed)} />
                        </dl>
                    </Step>

                    <Step
                        number={2}
                        title={`Tiền đã chi trong ca (${session.expenses.length})`}
                        actions={<button type="button" className="btn btn-secondary h-9" onClick={() => setExpenseOpen(true)}>Ghi khoản chi</button>}
                    >
                        {session.expenses.length === 0 ? (
                            <EmptyState text="Chưa chi khoản nào. Mua vật tư, gửi xe… thì bấm Ghi khoản chi." />
                        ) : (
                            <div className="table-wrap rounded-none border-x-0 border-b-0">
                                <table className="table">
                                    <thead><tr><th>Giờ</th><th>Nội dung</th><th>Loại</th><th className="text-right">Số tiền</th><th /></tr></thead>
                                    <tbody>
                                        {session.expenses.map((x) => (
                                            <tr key={x.id}>
                                                <td className="num">{clockOf(x.createdAt)}</td>
                                                <td className="cell-primary">{x.description}</td>
                                                <td>{expenseCategoryLabel(x.category)}</td>
                                                <td className="num text-right">{money(x.amount)}</td>
                                                <td className="text-right">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-icon h-9"
                                                        aria-label={`Xóa khoản chi ${x.description}`}
                                                        onClick={() => act(removeCashExpense(x.id), `Đã xóa khoản chi "${x.description}".`)}
                                                    >
                                                        <Trash2 className="size-4" aria-hidden />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <dl className="border-t border-border px-5 py-4 text-body-sm">
                            <Line label="Tổng đã chi" value={money(session.expenseTotal)} />
                        </dl>
                    </Step>

                    <Step number={3} title="Chốt số tiền">
                        <CloseForm session={session} onSubmit={(values) => act(closeCashSession(values), "Đã chốt két và bàn giao.")} />
                    </Step>
                </>
            ) : (
                <OpenForm onSubmit={(values) => act(openCashSession(values), "Đã mở két. Tiền mặt thu từ giờ được cộng vào ca này.")} />
            )}

            <HistoryTable sessions={state.history} />

            {expenseOpen && session && (
                <ExpenseDialog available={session.expectedCash} onClose={() => setExpenseOpen(false)} onSubmit={(values) => act(addCashExpense(values), `Đã ghi khoản chi ${money(values.amount)}.`)} />
            )}
        </div>
    );
};

// A numbered card: the hand-over goes 1 → 2 → 3
const Step = ({ number, title, actions, children }) => (
    <Card
        title={
            <span className="flex items-center gap-3">
                <span className="num grid size-7 place-items-center rounded-full bg-primary text-caption font-bold text-on-primary">{number}</span>
                {title}
            </span>
        }
        actions={actions}
    >
        {children}
    </Card>
);

const Line = ({ label, value, strong }) => (
    <div className={cx("flex justify-between gap-6 py-0.5", strong && "text-title font-semibold text-ink")}>
        <dt className={strong ? "" : "text-muted"}>{label}</dt>
        <dd className="num m-0">{value}</dd>
    </div>
);

const MoneyInput = ({ id, value, onChange, required }) => (
    <input id={id} className="input num" inputMode="numeric" required={required} value={value === "" ? "" : toNumber(value).toLocaleString("vi-VN")} onChange={(e) => onChange(e.target.value)} />
);

const OpenForm = ({ onSubmit }) => {
    const [opening, setOpening] = useState("");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <Card>
            <form
                className="max-w-xl space-y-4 px-6 py-6"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    await onSubmit({ openingCash: toNumber(opening), notes });
                    setBusy(false);
                }}
            >
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary"><Wallet className="size-5" aria-hidden /></span>
                    <div>
                        <h2 className="font-heading text-heading-3 text-ink">Bạn chưa mở két</h2>
                        <p className="text-body-sm text-muted">Đếm tiền mặt đang có trong két rồi nhập vào đây.</p>
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="opening-cash" className="label label-required">Tiền đầu ca</label>
                    <MoneyInput id="opening-cash" value={opening} onChange={setOpening} required />
                </div>
                <div className="field">
                    <label htmlFor="opening-notes" className="label">Ghi chú</label>
                    <input id="opening-notes" className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy || opening === ""}>Mở két</button>
            </form>
        </Card>
    );
};

const CloseForm = ({ session, onSubmit }) => {
    const [counted, setCounted] = useState("");
    const [handoverTo, setHandoverTo] = useState("");
    const [notes, setNotes] = useState("");
    const [candidates, setCandidates] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let active = true;
        getHandoverCandidates().then((result) => active && result.success && setCandidates(result.data));
        return () => {
            active = false;
        };
    }, []);

    const value = toNumber(counted);
    const difference = counted === "" ? null : value - session.expectedCash;
    const needsNote = difference !== null && difference !== 0;

    return (
        <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
            <dl className="text-body-sm">
                <Line label="Tiền đầu ca" value={money(session.openingCash)} />
                <Line label="+ Tiền mặt thu trong ca" value={money(session.cashCollected)} />
                <Line label="− Tiền đã chi" value={money(session.expenseTotal)} />
                <div className="mt-2 border-t border-border pt-2">
                    <Line label="Tiền mặt phải có" value={money(session.expectedCash)} strong />
                </div>
            </dl>
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    await onSubmit({ countedCash: value, handoverToUserId: handoverTo, notes: notes.trim() });
                    setBusy(false);
                }}
            >
                <div className="field">
                    <label htmlFor="counted-cash" className="label label-required">Tiền mặt đếm được</label>
                    <MoneyInput id="counted-cash" value={counted} onChange={setCounted} required />
                    {difference !== null && (
                        <p role="status" className={cx("text-body-sm", difference === 0 ? "text-success" : "text-danger")}>
                            {difference === 0 ? "Khớp với số phải có." : `Chênh lệch: ${difference > 0 ? "thừa" : "thiếu"} ${money(Math.abs(difference))}.`}
                        </p>
                    )}
                </div>
                <div className="field">
                    <label htmlFor="handover-to" className="label">Người nhận bàn giao</label>
                    <select id="handover-to" className="input" value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)}>
                        <option value="">Không có ai, chốt cuối ngày</option>
                        {candidates.map((c) => <option key={c.userId} value={c.userId}>{c.fullName}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="close-notes" className={cx("label", needsNote && "label-required")}>Ghi chú</label>
                    <textarea id="close-notes" className="input py-2" rows={3} maxLength={500} required={needsNote} placeholder={needsNote ? "Giải thích vì sao tiền đếm được khác số phải có" : ""} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="flex justify-end">
                    <button type="submit" className="btn btn-primary" disabled={busy || counted === "" || (needsNote && !notes.trim())}>
                        {busy && <span className="btn-spinner" aria-hidden />}
                        {handoverTo ? "Chốt và bàn giao" : "Chốt cuối ngày"}
                    </button>
                </div>
            </form>
        </div>
    );
};

const ExpenseDialog = ({ available, onClose, onSubmit }) => {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Other");
    const [description, setDescription] = useState("");
    const [busy, setBusy] = useState(false);
    const value = toNumber(amount);
    const tooMuch = value > available;
    return (
        <Modal title="Ghi khoản chi" description={`Trong két đang có ${money(available)}.`} onClose={onClose}>
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    await onSubmit({ amount: value, category, description: description.trim() });
                    setBusy(false);
                }}
            >
                <div className="field">
                    <label htmlFor="expense-amount" className="label label-required">Số tiền</label>
                    <MoneyInput id="expense-amount" value={amount} onChange={setAmount} required />
                    {tooMuch && <p className="error-text">Không chi quá số tiền đang có trong két.</p>}
                </div>
                <div className="field">
                    <label htmlFor="expense-category" className="label">Loại</label>
                    <select id="expense-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {EXPENSE_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="expense-description" className="label label-required">Chi cho việc gì</label>
                    <input id="expense-description" className="input" required maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || value <= 0 || tooMuch || !description.trim()}>Ghi khoản chi</button>
                </div>
            </form>
        </Modal>
    );
};

const HistoryTable = ({ sessions }) =>
    sessions.length === 0 ? null : (
        <Card title="Các ca đã bàn giao gần đây">
            <div className="table-wrap rounded-none border-x-0 border-b-0">
                <table className="table table-stack">
                    <thead>
                        <tr><th>Ca</th><th className="text-right">Phải có</th><th className="text-right">Đếm được</th><th className="text-right">Chênh lệch</th><th>Bàn giao cho</th></tr>
                    </thead>
                    <tbody>
                        {sessions.map((s) => (
                            <tr key={s.id}>
                                <td data-primary className="num">{dateTime(s.openedAt)} – {clockOf(s.closedAt)}</td>
                                <td data-label="Phải có" className="num text-right">{money(s.expectedCash)}</td>
                                <td data-label="Đếm được" className="num text-right">{money(s.countedCash)}</td>
                                <td data-label="Chênh lệch" className={cx("num text-right", s.difference ? "text-danger" : "text-success")}>{money(s.difference)}</td>
                                <td data-label="Bàn giao cho">{s.handoverToName ?? "Chốt cuối ngày"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

export default CashHandover;

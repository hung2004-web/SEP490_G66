import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";
import { isPlainClick } from "@/utils/medicalRecord";
import { PAYMENT_HISTORY_STATUS, PAYMENT_HISTORY_TEXT } from "@/utils/messages";
import { HISTORY_NAV_FLAG, HISTORY_PAGE_SIZE, XL_QUERY, buildHistorySearch, receiptTotals } from "@/utils/paymentHistory";
import { ROUTES } from "@/utils/routes";

const LABEL_ROW = "flex justify-between gap-3";

const PickLink = ({ item, current, query, page, onFocusReceipt, className }) => {
    const handleClick = (event) => {
        if (!isPlainClick(event) || !current) return;
        event.preventDefault();
        if (window.matchMedia(XL_QUERY).matches) event.currentTarget.focus();
        else onFocusReceipt();
    };
    return (
        <Link
            to={ROUTES.PAYMENT_HISTORY + buildHistorySearch({ ...query, invoice: item.id, page })}
            state={{ [HISTORY_NAV_FLAG]: true, pick: item.id }}
            data-history-pick={item.id}
            aria-current={current ? "true" : undefined}
            className={cx("inline-flex items-center text-body-sm text-primary hover:underline", current && "font-semibold", className)}
            onClick={handleClick}
        >
            {current ? PAYMENT_HISTORY_TEXT.VIEWING(item.no) : PAYMENT_HISTORY_TEXT.VIEW(item.no)}
            <span className="sr-only">{PAYMENT_HISTORY_TEXT.VIEW_CONTEXT(item.date)}</span>
        </Link>
    );
};

const LabeledAmounts = ({ net, paid, left, strong }) => (
    <dl className="mt-1.5 flex flex-col gap-0.5 text-caption">
        <div className={LABEL_ROW}>
            <dt>{PAYMENT_HISTORY_TEXT.COST}</dt>
            <dd className={cx("num text-right", strong && "font-semibold text-ink")}>{formatCurrency(net)}</dd>
        </div>
        <div className={LABEL_ROW}>
            <dt>{PAYMENT_HISTORY_TEXT.PAID}</dt>
            <dd className="num text-right text-success">{formatCurrency(paid)}</dd>
        </div>
        <div className={LABEL_ROW}>
            <dt>{PAYMENT_HISTORY_TEXT.LEFT}</dt>
            <dd className="num text-right font-semibold text-ink">{formatCurrency(left)}</dd>
        </div>
    </dl>
);

const procedures = (item) => item.lines.map((line) => line.name).join(", ");

const PaymentHistoryTable = ({ view, onFocusReceipt, onPageChange, onClearAll }) => {
    const pagerRef = useRef(null);
    const pendingPage = useRef(false);

    useLayoutEffect(() => {
        if (!pendingPage.current) return;
        pendingPage.current = false;
        const active = document.activeElement;
        if (!active || active === document.body || active.disabled) pagerRef.current?.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
    });

    const { list, rows, page, pages, query, current } = view;

    if (!list.length) {
        return (
            <div className="empty-state">
                <Search className="empty-state-icon" aria-hidden="true" />
                <p className="empty-state-title" aria-hidden="true">
                    {PAYMENT_HISTORY_TEXT.NO_RESULT}
                </p>
                <p className="empty-state-text">{PAYMENT_HISTORY_TEXT.NO_RESULT_TEXT}</p>
                <button type="button" className="btn btn-secondary mt-3 h-8 px-3" onClick={onClearAll}>
                    {PAYMENT_HISTORY_TEXT.CLEAR_QUERY}
                </button>
            </div>
        );
    }

    const totals = receiptTotals(list);
    const from = (page - 1) * HISTORY_PAGE_SIZE;
    const isCurrent = (item) => current?.id === item.id;
    const linkProps = { query, page, onFocusReceipt };

    const changePage = (next) => {
        if (next === page) return;
        pendingPage.current = true;
        onPageChange(next);
    };

    return (
        <>
            <div className="hidden overflow-x-auto md:block">
                <table className="table">
                    <caption className="sr-only">{PAYMENT_HISTORY_TEXT.TABLE_CAPTION}</caption>
                    <thead>
                        <tr>
                            <th scope="col">{PAYMENT_HISTORY_TEXT.COL_RECEIPT}</th>
                            <th scope="col" className="text-right">
                                {PAYMENT_HISTORY_TEXT.COL_COST}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item) => (
                            <tr key={item.id} className={cx(isCurrent(item) && "bg-primary-softer")}>
                                <td className={cx("py-2.5 align-top", isCurrent(item) && "border-l-4 border-l-primary")}>
                                    <b className="num font-semibold text-ink">{item.date}</b> <span className="text-caption">{PAYMENT_HISTORY_TEXT.RECEIPT_NO(item.no)}</span>
                                    <p className="text-ink">{procedures(item)}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <StatusBadge status={item.status} labels={PAYMENT_HISTORY_STATUS} />
                                        <PickLink item={item} current={isCurrent(item)} className="min-h-6" {...linkProps} />
                                    </div>
                                </td>
                                <td className="whitespace-nowrap py-2.5 text-right align-top">
                                    <span className="num text-ink">{formatCurrency(item.net)}</span>
                                    <p className="num text-caption text-success">{PAYMENT_HISTORY_TEXT.PAID_LINE(formatCurrency(item.paid))}</p>
                                    <p className="num text-caption font-semibold text-ink">{PAYMENT_HISTORY_TEXT.LEFT_LINE(formatCurrency(item.left))}</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-surface-tint">
                            <td className="py-2.5 text-caption">{PAYMENT_HISTORY_TEXT.TOTAL(list.length)}</td>
                            <td className="whitespace-nowrap py-2.5 text-right">
                                <span className="num font-semibold text-ink">{formatCurrency(totals.net)}</span>
                                <p className="num text-caption text-success">{PAYMENT_HISTORY_TEXT.PAID_LINE(formatCurrency(totals.paid))}</p>
                                <p className="num text-caption text-ink">{PAYMENT_HISTORY_TEXT.LEFT_LINE(formatCurrency(totals.left))}</p>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
                {rows.map((item) => (
                    <li key={item.id} className={cx("px-5 py-3.5", isCurrent(item) && "border-l-4 border-l-primary bg-primary-softer")}>
                        <p>
                            <b className="num font-semibold text-ink">{item.date}</b> <span className="text-caption">{PAYMENT_HISTORY_TEXT.RECEIPT_NO(item.no)}</span>
                        </p>
                        <div className="mt-1">
                            <StatusBadge status={item.status} labels={PAYMENT_HISTORY_STATUS} />
                        </div>
                        <p className="mt-1 text-ink">{procedures(item)}</p>
                        <LabeledAmounts net={item.net} paid={item.paid} left={item.left} />
                        <PickLink item={item} current={isCurrent(item)} className="min-h-11" {...linkProps} />
                    </li>
                ))}
                <li className="px-5 py-3.5">
                    <p className="text-caption">{PAYMENT_HISTORY_TEXT.TOTAL(list.length)}</p>
                    <LabeledAmounts net={totals.net} paid={totals.paid} left={totals.left} strong />
                </li>
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                <span className="num text-caption text-muted">{PAYMENT_HISTORY_TEXT.RANGE(from + 1, Math.min(from + HISTORY_PAGE_SIZE, list.length), list.length)}</span>
                {pages > 1 && (
                    <div ref={pagerRef} className="-m-1 max-w-full overflow-x-auto p-1">
                        <Pagination page={page} totalPages={pages} onChange={changePage} label={PAYMENT_HISTORY_TEXT.PAGINATION} />
                    </div>
                )}
            </div>
        </>
    );
};

export default PaymentHistoryTable;

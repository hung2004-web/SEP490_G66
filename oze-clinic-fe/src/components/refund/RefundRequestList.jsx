import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Eye, Search } from "lucide-react";
import DetailLink from "@/components/ui/DetailLink";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { REFUND_REQUEST_STATUS_LABELS } from "@/utils/data/mockRefundRequests";
import { formatCurrency } from "@/utils/format";
import { REFUND_REQUEST_TEXT } from "@/utils/messages";
import { REFUND_PAGE_SIZE, clinicDate } from "@/utils/refundRequest";

const ForWhat = ({ request }) => {
    const items = request.itemNames.join(", ");
    if (!request.stageLabel) return <span className="text-ink">{items || REFUND_REQUEST_TEXT.NO_VALUE}</span>;
    return (
        <>
            <b className="font-semibold text-ink">{request.stageLabel}</b>
            {items && <span className="block text-caption">{items}</span>}
        </>
    );
};

const RefundRequestList = ({ view, pickUrl, pickState, onPageChange, onClearAll }) => {
    const pagerRef = useRef(null);
    const pendingPage = useRef(false);

    useLayoutEffect(() => {
        if (!pendingPage.current) return;
        pendingPage.current = false;
        const active = document.activeElement;
        if (!active || active === document.body || active.disabled) pagerRef.current?.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
    });

    const { list, rows, page, pages, current } = view;

    if (!list.length) {
        return (
            <div className="empty-state">
                <Search className="empty-state-icon" aria-hidden="true" />
                <p className="empty-state-title" aria-hidden="true">
                    {REFUND_REQUEST_TEXT.NO_RESULT}
                </p>
                <p className="empty-state-text">{REFUND_REQUEST_TEXT.NO_RESULT_TEXT}</p>
                <button type="button" className="btn btn-secondary mt-3 h-8 px-3" onClick={onClearAll}>
                    {REFUND_REQUEST_TEXT.CLEAR_QUERY}
                </button>
            </div>
        );
    }

    const from = (page - 1) * REFUND_PAGE_SIZE;
    const isCurrent = (request) => current?.code === request.code;
    const doctor = (request) => request.doctorName ?? REFUND_REQUEST_TEXT.NO_VALUE;

    const changePage = (next) => {
        if (next === page) return;
        pendingPage.current = true;
        onPageChange(next);
    };

    return (
        <>
            <div className="hidden xl:block">
                <table className="table">
                    <caption className="sr-only">{REFUND_REQUEST_TEXT.TABLE_CAPTION}</caption>
                    <thead>
                        <tr>
                            <th scope="col">{REFUND_REQUEST_TEXT.COL_CODE}</th>
                            <th scope="col">{REFUND_REQUEST_TEXT.COL_CREATED}</th>
                            <th scope="col">{REFUND_REQUEST_TEXT.COL_FOR}</th>
                            <th scope="col">{REFUND_REQUEST_TEXT.COL_PAID_AT}</th>
                            <th scope="col">{REFUND_REQUEST_TEXT.COL_DOCTOR}</th>
                            <th scope="col" className="text-right">
                                {REFUND_REQUEST_TEXT.COL_AMOUNT}
                            </th>
                            <th scope="col">{REFUND_REQUEST_TEXT.COL_STATUS}</th>
                            <th scope="col" className="text-center">
                                {REFUND_REQUEST_TEXT.COL_ACTION}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((request) => (
                            <tr key={request.code} className={cx(isCurrent(request) && "bg-primary-softer")}>
                                <td className={cx("whitespace-nowrap font-semibold text-ink", isCurrent(request) && "border-l-4 border-l-primary")}>{request.code}</td>
                                <td className="num whitespace-nowrap">{clinicDate(request.createdAt)}</td>
                                <td className="py-2.5">
                                    <ForWhat request={request} />
                                </td>
                                <td className="num whitespace-nowrap">{clinicDate(request.paidAt)}</td>
                                <td className="whitespace-nowrap">{doctor(request)}</td>
                                <td className="num whitespace-nowrap text-right text-ink">{formatCurrency(request.amount)}</td>
                                <td>
                                    <StatusBadge status={request.status} labels={REFUND_REQUEST_STATUS_LABELS} />
                                </td>
                                <td className="text-center">
                                    <Link
                                        to={pickUrl(request.code)}
                                        state={pickState(request.code)}
                                        data-refund-pick={request.code}
                                        className="btn btn-icon size-8 text-muted hover:bg-surface-tint hover:text-primary"
                                        aria-label={REFUND_REQUEST_TEXT.VIEW_LABEL(request.code)}
                                        title={REFUND_REQUEST_TEXT.VIEW_LABEL(request.code)}
                                    >
                                        <Eye className="size-4" aria-hidden="true" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ul className="divide-y divide-border xl:hidden">
                {rows.map((request) => (
                    <li key={request.code} className={cx("px-5 py-3.5", isCurrent(request) && "border-l-4 border-l-primary bg-primary-softer")}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <b className="num font-semibold text-ink">{request.code}</b>
                            <StatusBadge status={request.status} labels={REFUND_REQUEST_STATUS_LABELS} />
                        </div>
                        <p className="mt-1">
                            <ForWhat request={request} />
                        </p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-caption md:grid-cols-4">
                            <div>
                                <dt>{REFUND_REQUEST_TEXT.COL_CREATED}</dt>
                                <dd className="num text-ink">{clinicDate(request.createdAt)}</dd>
                            </div>
                            <div>
                                <dt>{REFUND_REQUEST_TEXT.COL_PAID_AT}</dt>
                                <dd className="num text-ink">{clinicDate(request.paidAt)}</dd>
                            </div>
                            <div>
                                <dt>{REFUND_REQUEST_TEXT.COL_DOCTOR}</dt>
                                <dd className="text-ink">{doctor(request)}</dd>
                            </div>
                            <div>
                                <dt>{REFUND_REQUEST_TEXT.COL_AMOUNT}</dt>
                                <dd className="num font-semibold text-ink">{formatCurrency(request.amount)}</dd>
                            </div>
                        </dl>
                        <DetailLink
                            to={pickUrl(request.code)}
                            state={pickState(request.code)}
                            data-refund-pick={request.code}
                            className="min-h-11"
                            context={REFUND_REQUEST_TEXT.VIEW_CONTEXT(request.code)}
                        >
                            {REFUND_REQUEST_TEXT.VIEW_DETAIL}
                        </DetailLink>
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                <span className="num text-caption text-muted">{REFUND_REQUEST_TEXT.RANGE(from + 1, Math.min(from + REFUND_PAGE_SIZE, list.length), list.length)}</span>
                {pages > 1 && (
                    <div ref={pagerRef} className="-m-1 max-w-full overflow-x-auto p-1">
                        <Pagination page={page} totalPages={pages} onChange={changePage} label={REFUND_REQUEST_TEXT.PAGINATION} />
                    </div>
                )}
            </div>
        </>
    );
};

export default RefundRequestList;

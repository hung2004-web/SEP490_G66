import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";
import { CLINIC_ADDRESS, CLINIC_HOTLINE, PAYMENT_HISTORY_TEXT } from "@/utils/messages";
import { birthYear } from "@/utils/paymentHistory";

const NO_VALUE = "—";
const SECTION_TITLE = "mt-4 mb-1 text-caption font-bold tracking-wide text-ink";
const TOTAL_ROW = "flex justify-between gap-3";

const InfoRow = ({ label, children, valueClassName }) => (
    <div className="flex gap-3 max-md:flex-col max-md:gap-0">
        <dt className="w-33 shrink-0 text-muted">{label}</dt>
        <dd className={cx("min-w-0 font-medium text-ink", valueClassName)}>{children}</dd>
    </div>
);

const TotalRow = ({ label, value, valueClassName }) => (
    <div className={TOTAL_ROW}>
        <dt className="text-muted">{label}</dt>
        <dd className={cx("num text-right", valueClassName)}>{formatCurrency(value)}</dd>
    </div>
);

const PaymentReceiptPaper = ({ receipt, profile }) => (
    <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-2.5 border-b border-dashed border-border-strong pb-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary font-bold text-on-primary" aria-hidden="true">
                {PAYMENT_HISTORY_TEXT.CLINIC_MARK}
            </span>
            <div className="min-w-0">
                <p className="font-semibold text-ink">{PAYMENT_HISTORY_TEXT.CLINIC}</p>
                <p className="text-caption text-muted">{CLINIC_ADDRESS}</p>
                <p className="num text-caption text-muted">{PAYMENT_HISTORY_TEXT.CLINIC_PHONE(CLINIC_HOTLINE.DISPLAY)}</p>
            </div>
        </div>
        <p className="mt-3 text-center font-bold tracking-wide text-ink">{PAYMENT_HISTORY_TEXT.PAPER_TITLE}</p>
        <p className="text-center text-caption">
            {PAYMENT_HISTORY_TEXT.PAPER_DATE}
            <b className="num">{receipt.date}</b>
        </p>
        <dl className="mt-3 flex flex-col gap-1.5">
            <InfoRow label={PAYMENT_HISTORY_TEXT.NAME}>{profile.name || NO_VALUE}</InfoRow>
            <InfoRow label={PAYMENT_HISTORY_TEXT.BIRTH_GENDER}>{`${birthYear(profile.dob)} · ${profile.gender || NO_VALUE}`}</InfoRow>
            <InfoRow label={PAYMENT_HISTORY_TEXT.PHONE} valueClassName="num">
                {profile.phone || NO_VALUE}
            </InfoRow>
            <InfoRow label={PAYMENT_HISTORY_TEXT.ADDRESS}>{profile.addr || NO_VALUE}</InfoRow>
            <InfoRow label={PAYMENT_HISTORY_TEXT.DIAGNOSIS}>{receipt.diag || NO_VALUE}</InfoRow>
            <InfoRow label={PAYMENT_HISTORY_TEXT.REASON}>{receipt.reason || NO_VALUE}</InfoRow>
            <InfoRow label={PAYMENT_HISTORY_TEXT.REMAIN_ALL} valueClassName="num font-semibold">
                {formatCurrency(receipt.remainAll)}
            </InfoRow>
        </dl>
        <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full text-left">
                <caption className="sr-only">{PAYMENT_HISTORY_TEXT.COL_PROCEDURE}</caption>
                <thead>
                    <tr className="border-b border-border text-caption text-muted">
                        <th scope="col" className="px-2 py-1.5 font-semibold">
                            {PAYMENT_HISTORY_TEXT.COL_PROCEDURE}
                        </th>
                        <th scope="col" className="px-2 py-1.5 font-semibold">
                            {PAYMENT_HISTORY_TEXT.COL_DETAIL}
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                            {PAYMENT_HISTORY_TEXT.COL_QUANTITY}
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                            {PAYMENT_HISTORY_TEXT.COL_UNIT_PRICE}
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                            {PAYMENT_HISTORY_TEXT.COL_DISCOUNT}
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                            {PAYMENT_HISTORY_TEXT.COL_LINE_TOTAL}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {receipt.lines.map((line) => (
                        <tr key={line.key} className="border-b border-border align-top">
                            <td className="px-2 py-1.5 font-semibold text-ink">{line.name}</td>
                            <td className="px-2 py-1.5">{line.detail}</td>
                            <td className="num px-2 py-1.5 text-right">{line.quantity}</td>
                            <td className="num whitespace-nowrap px-2 py-1.5 text-right">{formatCurrency(line.unitPrice)}</td>
                            <td className="num whitespace-nowrap px-2 py-1.5 text-right">{formatCurrency(line.discount)}</td>
                            <td className="num whitespace-nowrap px-2 py-1.5 text-right font-semibold text-ink">{formatCurrency(line.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <ul className="mt-3 divide-y divide-border border-y border-border md:hidden">
            {receipt.lines.map((line) => (
                <li key={line.key} className="py-2">
                    <div className="flex items-start justify-between gap-2">
                        <b className="font-semibold text-ink">{line.name}</b>
                        <b className="num whitespace-nowrap font-semibold text-ink">{formatCurrency(line.total)}</b>
                    </div>
                    <p className="mt-0.5">{line.detail}</p>
                    <p className="num mt-0.5 text-caption text-muted">
                        {PAYMENT_HISTORY_TEXT.LINE_META(line.quantity, formatCurrency(line.unitPrice), formatCurrency(line.discount))}
                    </p>
                </li>
            ))}
        </ul>
        <dl className="mt-3 ml-auto flex max-w-85 flex-col gap-1">
            <TotalRow label={PAYMENT_HISTORY_TEXT.GROSS} value={receipt.gross} />
            <TotalRow label={PAYMENT_HISTORY_TEXT.DISCOUNT} value={receipt.disc} />
            <TotalRow label={PAYMENT_HISTORY_TEXT.NET} value={receipt.net} valueClassName="font-semibold text-ink" />
            <TotalRow label={PAYMENT_HISTORY_TEXT.PAID_TOTAL} value={receipt.paid} valueClassName="text-success" />
            <TotalRow label={PAYMENT_HISTORY_TEXT.LEFT_TOTAL} value={receipt.left} valueClassName={cx("font-semibold", receipt.left > 0 ? "text-danger" : "text-ink")} />
        </dl>
        <p role="heading" aria-level={3} className={SECTION_TITLE}>{PAYMENT_HISTORY_TEXT.APPOINTMENT}</p>
        <p>{receipt.next}</p>
        <p role="heading" aria-level={3} className={SECTION_TITLE}>{PAYMENT_HISTORY_TEXT.PAYMENTS}</p>
        {receipt.pays.length ? (
            <>
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left">
                        <caption className="sr-only">{PAYMENT_HISTORY_TEXT.PAYMENTS}</caption>
                        <thead>
                            <tr className="border-b border-border text-caption text-muted">
                                <th scope="col" className="px-2 py-1.5 font-semibold">
                                    {PAYMENT_HISTORY_TEXT.COL_DATE}
                                </th>
                                <th scope="col" className="px-2 py-1.5 font-semibold">
                                    {PAYMENT_HISTORY_TEXT.COL_PAYER}
                                </th>
                                <th scope="col" className="px-2 py-1.5 font-semibold">
                                    {PAYMENT_HISTORY_TEXT.COL_METHOD}
                                </th>
                                <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                                    {PAYMENT_HISTORY_TEXT.COL_AMOUNT}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.pays.map((payment) => (
                                <tr key={payment.key} className="border-b border-border">
                                    <td className="num whitespace-nowrap px-2 py-1.5">{payment.date}</td>
                                    <td className="px-2 py-1.5">{payment.payer}</td>
                                    <td className="px-2 py-1.5">{payment.method}</td>
                                    <td className="num whitespace-nowrap px-2 py-1.5 text-right">{formatCurrency(payment.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul className="divide-y divide-border border-y border-border md:hidden">
                    {receipt.pays.map((payment) => (
                        <li key={payment.key} className="py-2">
                            <div className="flex justify-between gap-2">
                                <b className="num font-semibold text-ink">{payment.date}</b>
                                <b className="num whitespace-nowrap">{formatCurrency(payment.amount)}</b>
                            </div>
                            <p className="text-caption text-muted">{PAYMENT_HISTORY_TEXT.PAYER_METHOD(payment.payer, payment.method)}</p>
                        </li>
                    ))}
                </ul>
            </>
        ) : (
            <p className="text-caption text-muted">{PAYMENT_HISTORY_TEXT.NO_PAYMENT}</p>
        )}
        <div className="mt-4 text-right text-caption">
            <p className="font-semibold text-ink">{PAYMENT_HISTORY_TEXT.DOCTOR_SIGN}</p>
            <p className="mt-5">{receipt.doctor}</p>
        </div>
        <div className="mt-4 border-t border-dashed border-border-strong pt-2.5 text-center text-caption text-muted">
            <p>{PAYMENT_HISTORY_TEXT.FOOT_REVISIT}</p>
            <p>{PAYMENT_HISTORY_TEXT.FOOT_DEPOSIT}</p>
        </div>
    </div>
);

export default PaymentReceiptPaper;

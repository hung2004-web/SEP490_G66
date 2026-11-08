import { AlertCircle, Check, Clock } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";
import { MEDICAL_RECORD_PAYMENT_STATUS, PATIENT_DEBT_TEXT } from "@/utils/messages";
import { getPaymentHistoryRoute } from "@/utils/routes";
import { ArrowLink, CardNote, DebtCard, RefundLink } from "./PatientDebtCard";

const TITLE_ID = "payment-debt-schedule-title";

const ALERT_CLASS = { overdue: "alert-danger", due: "alert-warning", later: "alert-info" };

const DOT_CLASS = {
    paid: "border-success-solid bg-success-solid text-on-primary",
    due: "border-warning-solid bg-canvas text-warning",
    overdue: "border-danger-solid bg-canvas text-danger",
};

const StageBody = ({ stage }) => (
    <>
        <div className="flex items-start justify-between gap-2">
            <b className="font-semibold text-ink">{stage.label}</b>
            <b className="num whitespace-nowrap font-semibold text-ink">{formatCurrency(stage.amount)}</b>
        </div>
        <p className="mt-0.5">{stage.milestone}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={stage.status} labels={MEDICAL_RECORD_PAYMENT_STATUS} />
            <CardNote>{stage.note}</CardNote>
        </div>
        {stage.refund && (
            <p className="mt-1.5">
                <RefundLink refund={stage.refund} />
            </p>
        )}
    </>
);

const NextAlert = ({ stage }) => {
    const Icon = stage.status === "overdue" ? AlertCircle : Clock;
    return (
        <div className="px-5 pt-4">
            <div className={cx("alert", ALERT_CLASS[stage.status] ?? "alert-info")}>
                <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
                <div>
                    <p className="alert-title num">
                        {stage.label} · {formatCurrency(stage.amount)}
                    </p>
                    <p>
                        {stage.milestone} · {stage.note}
                    </p>
                </div>
            </div>
        </div>
    );
};

const Installment = ({ item }) => (
    <DebtCard
        titleId={TITLE_ID}
        title={PATIENT_DEBT_TEXT.INSTALLMENT_TITLE}
        aside={<CardNote>{PATIENT_DEBT_TEXT.INSTALLMENT_SUMMARY(item.stages.length, item.stages.filter((stage) => stage.status === "paid").length)}</CardNote>}
    >
        {item.next && <NextAlert stage={item.next} />}
        <ol aria-labelledby={TITLE_ID} className="px-5 pb-5 pt-4">
            {item.stages.map((stage, index) => {
                const isLast = index === item.stages.length - 1;
                const paid = stage.status === "paid";
                return (
                    <li key={stage.key} className={cx("relative flex gap-3", !isLast && "pb-4")}>
                        {!isLast && <span aria-hidden="true" className={cx("absolute bottom-0.5 left-3 top-6.5 w-0.5", paid ? "bg-success-solid" : "bg-border")} />}
                        <span
                            aria-hidden="true"
                            className={cx(
                                "num relative z-10 grid size-6.5 shrink-0 place-items-center rounded-full border-2 text-caption font-bold",
                                DOT_CLASS[stage.status] ?? "border-border-strong bg-canvas text-muted",
                            )}
                        >
                            {paid ? <Check className="size-3" /> : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <StageBody stage={stage} />
                        </div>
                    </li>
                );
            })}
        </ol>
    </DebtCard>
);

const Step = ({ item }) => (
    <DebtCard titleId={TITLE_ID} title={PATIENT_DEBT_TEXT.STEP_TITLE} aside={<CardNote>{PATIENT_DEBT_TEXT.STEP_SUMMARY}</CardNote>}>
        <div className="hidden overflow-x-auto md:block">
            <table className="table" aria-labelledby={TITLE_ID}>
                <thead>
                    <tr>
                        <th scope="col">{PATIENT_DEBT_TEXT.COL_STEP}</th>
                        <th scope="col">{PATIENT_DEBT_TEXT.COL_CONTENT}</th>
                        <th scope="col" className="text-right">
                            {PATIENT_DEBT_TEXT.COL_AMOUNT}
                        </th>
                        <th scope="col">{PATIENT_DEBT_TEXT.COL_STATUS}</th>
                    </tr>
                </thead>
                <tbody>
                    {item.stages.map((stage) => (
                        <tr key={stage.key}>
                            <td className="whitespace-nowrap font-semibold text-ink">{stage.label}</td>
                            <td className="py-2">
                                {stage.milestone}
                                {stage.refund && (
                                    <p>
                                        <RefundLink refund={stage.refund} />
                                    </p>
                                )}
                            </td>
                            <td className="whitespace-nowrap text-right">{formatCurrency(stage.amount)}</td>
                            <td className="py-2">
                                <StatusBadge status={stage.status} labels={MEDICAL_RECORD_PAYMENT_STATUS} />
                                <p className="text-caption text-muted">{stage.note}</p>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <ul aria-labelledby={TITLE_ID} className="divide-y divide-border md:hidden">
            {item.stages.map((stage) => (
                <li key={stage.key} className="px-5 py-3.5">
                    <StageBody stage={stage} />
                </li>
            ))}
        </ul>
    </DebtCard>
);

const Once = ({ item }) => (
    <DebtCard
        titleId={TITLE_ID}
        title={PATIENT_DEBT_TEXT.ONCE_TITLE(item.start)}
        aside={
            <div className="flex flex-wrap items-center gap-2.5">
                <ArrowLink to={getPaymentHistoryRoute(item.visitId)}>{PATIENT_DEBT_TEXT.VIEW_RECEIPT}</ArrowLink>
                <RefundLink refund={item.refunds[0]} />
            </div>
        }
    >
        <div className="hidden overflow-x-auto md:block">
            <table className="table" aria-labelledby={TITLE_ID}>
                <thead>
                    <tr>
                        <th scope="col">{PATIENT_DEBT_TEXT.COL_PROCEDURE}</th>
                        <th scope="col">{PATIENT_DEBT_TEXT.COL_CONTENT}</th>
                        <th scope="col" className="text-right">
                            {PATIENT_DEBT_TEXT.COL_LINE_TOTAL}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {item.lines.map((line) => (
                        <tr key={line.key}>
                            <td className="font-semibold text-ink">{line.name}</td>
                            <td>{line.detail}</td>
                            <td className="whitespace-nowrap text-right">{formatCurrency(line.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <ul aria-labelledby={TITLE_ID} className="divide-y divide-border md:hidden">
            {item.lines.map((line) => (
                <li key={line.key} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                        <b className="font-semibold text-ink">{line.name}</b>
                        <b className="num whitespace-nowrap font-semibold text-ink">{formatCurrency(line.total)}</b>
                    </div>
                    <p className="mt-0.5">{line.detail}</p>
                </li>
            ))}
        </ul>
    </DebtCard>
);

const SCHEDULES = { installment: Installment, step: Step, once: Once };

const PatientDebtSchedule = ({ item }) => {
    const Schedule = SCHEDULES[item.type];
    return Schedule ? <Schedule item={item} /> : null;
};

export default PatientDebtSchedule;

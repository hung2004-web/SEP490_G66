import StatusBadge from "@/components/ui/StatusBadge";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";
import { PATIENT_DEBT_PAY_TYPE, PATIENT_DEBT_STATUS, PATIENT_DEBT_TEXT } from "@/utils/messages";
import { DEBT_TITLE_ID, debtProgress } from "@/utils/patientDebt";

const CELL_COUNT = 20;

const Figure = ({ label, value, className }) => (
    <div className="rounded-md bg-surface-tint px-3 py-2.5">
        <span className="block text-caption font-medium text-body">{label}</span>
        <b className={cx("num text-heading-3", className)}>{formatCurrency(value)}</b>
    </div>
);

const PatientDebtOverview = ({ item, h1Ref }) => {
    const progress = debtProgress(item);
    const full = item.left <= 0;
    return (
        <section className="card-app p-0">
            <div className="flex flex-wrap justify-between gap-3 px-5 pt-5">
                <div className="min-w-0">
                    <h1 id={DEBT_TITLE_ID} ref={h1Ref} tabIndex={-1} className="font-heading text-heading-2 text-ink outline-none focus-visible:shadow-none">
                        {item.name}
                    </h1>
                    <p className="mt-0.5 text-muted">{item.sub}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.type} labels={PATIENT_DEBT_PAY_TYPE} />
                    <StatusBadge status={item.status} labels={PATIENT_DEBT_STATUS} />
                </div>
            </div>
            <div className="px-5 py-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <Figure label={PATIENT_DEBT_TEXT.TOTAL} value={item.total} className="text-ink" />
                    <Figure label={PATIENT_DEBT_TEXT.PAID} value={item.paid} className="text-success" />
                    <Figure label={PATIENT_DEBT_TEXT.LEFT} value={item.left} className={full ? "text-success" : "text-ink"} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress.percent}
                        aria-valuetext={PATIENT_DEBT_TEXT.PROGRESS_TEXT(formatCurrency(item.paid), formatCurrency(item.total))}
                        aria-labelledby={DEBT_TITLE_ID}
                        className="flex flex-1 gap-0.5"
                    >
                        {Array.from({ length: CELL_COUNT }, (_, index) => (
                            <span key={index} className={cx("h-2 flex-1 rounded-xs", index < progress.cells ? (full ? "bg-success-solid" : "bg-primary") : "bg-surface-muted")} />
                        ))}
                    </div>
                    <span className="num text-caption font-semibold text-ink">{progress.percent}%</span>
                </div>
                <p className="mt-2 text-muted">{PATIENT_DEBT_TEXT.PAY_RULE(item.rule)}</p>
            </div>
        </section>
    );
};

export default PatientDebtOverview;

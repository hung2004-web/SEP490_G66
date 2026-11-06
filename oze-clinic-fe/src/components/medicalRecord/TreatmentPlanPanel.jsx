import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleCheck, Clock, Info } from "lucide-react";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";
import { RECORD_NAV_FLAG, RECORD_STATUS_BUTTON_ID, SHEET_TAB, buildRecordUrl, planMoney, teethLinks, displayText, isPlainClick } from "@/utils/medicalRecord";
import { MEDICAL_RECORD_PAYMENT_STATUS, MEDICAL_RECORD_PLAN_STATUS } from "@/utils/messages";
import { MEDICAL_RECORD_TABS, ROUTES } from "@/utils/routes";
import RecordStatusBadge from "./RecordStatusBadge";
import StatusDefinitionDrawer from "./StatusDefinitionDrawer";
import TreatmentStepList from "./TreatmentStepList";

const LINK_STATE = { [RECORD_NAV_FLAG]: true, scrollTop: true, focusH1: true };
const CARD_HEADER_CLASS = "flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4";
const SMALL_LINK_CLASS = "btn h-8 px-3 text-primary hover:bg-surface-tint";

const money = (value) => (Number.isFinite(Number(value)) ? formatCurrency(Number(value)) : "—");

const PlanAlert = ({ plan }) => {
    const stages = Array.isArray(plan.stages) ? plan.stages : [];
    const log = Array.isArray(plan.log) ? plan.log : [];
    const nextStage = stages.find((stage) => stage.status === "next");
    if (plan.status === "active" && nextStage) {
        return (
            <div className="alert alert-info">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                    <p className="font-semibold">Bước tiếp theo: {displayText(nextStage.name)}</p>
                    <p>{displayText(nextStage.note)}</p>
                </div>
            </div>
        );
    }
    if (plan.status === "proposed") {
        return (
            <div className="alert alert-warning">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                    <p className="font-semibold">Bác sĩ đã đề xuất kế hoạch này</p>
                    <p>Hãy trao đổi với bác sĩ. Bạn đồng ý tại phòng khám (ký trên bệnh án), sau đó kế hoạch chuyển sang &quot;Đang điều trị&quot;.</p>
                </div>
            </div>
        );
    }
    if (plan.status === "done") {
        return (
            <div className="alert alert-success">
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                    <p className="font-semibold">Đã hoàn thành kế hoạch</p>
                    {log.length > 0 && <p>{displayText(log.at(-1).next)}</p>}
                </div>
            </div>
        );
    }
    return null;
};

const TeethText = ({ teeth, urlVisitId, onToothLink }) => {
    const links = teethLinks(teeth);
    if (!links) return displayText(teeth);
    return links.map((tooth, index) => (
        <Fragment key={`${index}-${tooth}`}>
            {index > 0 && ", "}
            <Link
                to={buildRecordUrl(urlVisitId, MEDICAL_RECORD_TABS.TEETH)}
                replace
                state={LINK_STATE}
                className="font-medium text-primary hover:underline"
                onClick={(event) => isPlainClick(event) && onToothLink(tooth)}
            >
                {tooth}
            </Link>
        </Fragment>
    ));
};

const TreatmentPlanPanel = ({ plan, visitId, visitIds, urlVisitId, drawerOpen, onOpenDrawer, onCloseDrawer, onOpenVisit, onToothLink }) => {
    const stages = Array.isArray(plan.stages) ? plan.stages : [];
    const log = Array.isArray(plan.log) ? plan.log : [];
    const pays = Array.isArray(plan.pays) ? plan.pays : [];
    const totals = planMoney({ pays });

    return (
        <div className="flex flex-col gap-4">
            <section className="card-app p-0">
                <div className={CARD_HEADER_CLASS}>
                    <div className="min-w-0">
                        <h2 className="font-heading text-heading-3 text-ink">{displayText(plan.variant)}</h2>
                        <p className="text-caption text-muted">
                            {displayText(plan.svc)} · Răng <TeethText teeth={plan.teeth} urlVisitId={urlVisitId} onToothLink={onToothLink} />
                            {` · ${displayText(plan.doctor)} · Bắt đầu ${displayText(plan.start)} · ${displayText(plan.dur)}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <RecordStatusBadge status={plan.status} labels={MEDICAL_RECORD_PLAN_STATUS} />
                        <button id={RECORD_STATUS_BUTTON_ID} type="button" className={SMALL_LINK_CLASS} onClick={onOpenDrawer}>
                            <Info className="size-4" aria-hidden="true" />
                            Trạng thái
                        </button>
                    </div>
                </div>
                <div className="grid gap-6 p-5 lg:grid-cols-2">
                    <div>
                        <p className="text-caption text-muted">Chẩn đoán</p>
                        <p className="mb-3.5 font-semibold text-ink">{displayText(plan.diag)}</p>
                        <PlanAlert plan={plan} />
                    </div>
                    <div>
                        <p className="mb-2 text-caption text-muted">Các bước</p>
                        <TreatmentStepList stages={stages} />
                    </div>
                </div>
            </section>
            <section className="card-app p-0">
                <div className={CARD_HEADER_CLASS}>
                    <h2 className="card-title">Quá trình điều trị</h2>
                </div>
                {log.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="w-32">Ngày</th>
                                    <th>Xử trí</th>
                                    <th>Hẹn điều trị</th>
                                </tr>
                            </thead>
                            <tbody>
                                {log.map((row, index) => {
                                    const current = visitId != null && row.visit === visitId;
                                    return (
                                        <tr key={`${index}-${row.date}`} className={cx(current && "bg-primary-soft")}>
                                            <td className={cx("whitespace-nowrap font-semibold text-ink", current && "border-l-3 border-l-primary")}>
                                                {current ? (
                                                    <>
                                                        {displayText(row.date)} <span className="badge badge-info">Buổi này</span>
                                                    </>
                                                ) : visitIds.has(row.visit) ? (
                                                    <Link
                                                        to={buildRecordUrl(row.visit, SHEET_TAB)}
                                                        state={LINK_STATE}
                                                        className="text-primary hover:underline"
                                                        onClick={(event) => isPlainClick(event) && onOpenVisit()}
                                                    >
                                                        {displayText(row.date)}
                                                    </Link>
                                                ) : (
                                                    <span className="font-normal text-muted">{displayText(row.date)}</span>
                                                )}
                                            </td>
                                            <td>{displayText(row.action)}</td>
                                            <td className="text-muted">{displayText(row.next)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="p-6 text-center text-body-sm text-muted">Chưa có buổi điều trị nào.</p>
                )}
            </section>
            <section className="card-app p-0">
                <div className={CARD_HEADER_CLASS}>
                    <div>
                        <h2 className="card-title">Dự kiến kinh phí</h2>
                        <p className="text-caption text-muted">{displayText(plan.payRule)}</p>
                    </div>
                    {plan.status === "active" && (
                        <Link to={ROUTES.PAYMENT_DEBTS} className={SMALL_LINK_CLASS}>
                            Công nợ
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    )}
                </div>
                <div className="@container px-5 pb-1.5 pt-4">
                    <div className="grid gap-3 @sm:grid-cols-2 @xl:grid-cols-3">
                        {[
                            ["Tổng dự kiến", totals.total, "text-ink"],
                            ["Đã thanh toán", totals.paid, "text-success"],
                            ["Còn lại", totals.left, "text-ink"],
                        ].map(([label, value, tone]) => (
                            <div key={label} className="rounded-md bg-surface-tint px-3 py-2.5">
                                <span className="block text-caption text-muted">{label}</span>
                                <b className={cx("num font-heading text-heading-3", tone)}>{money(value)}</b>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Đợt</th>
                                <th>Mốc điều trị</th>
                                <th className="text-right">Số tiền</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pays.map((item, index) => (
                                <tr key={`${index}-${item.label}`}>
                                    <td className="whitespace-nowrap font-semibold text-ink">{displayText(item.label)}</td>
                                    <td>{displayText(item.milestone)}</td>
                                    <td className="whitespace-nowrap text-right">{money(item.amount)}</td>
                                    <td className="py-2">
                                        <RecordStatusBadge status={item.status} labels={MEDICAL_RECORD_PAYMENT_STATUS} />
                                        <p className="text-caption text-muted">{displayText(item.note)}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            {drawerOpen && <StatusDefinitionDrawer onClose={onCloseDrawer} />}
        </div>
    );
};

export default TreatmentPlanPanel;

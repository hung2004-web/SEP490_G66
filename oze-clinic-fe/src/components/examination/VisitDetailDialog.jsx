import { useEffect, useId, useRef, useState } from "react";
import RecordStatusBadge from "@/components/medicalRecord/RecordStatusBadge";
import TreatmentStepList from "@/components/medicalRecord/TreatmentStepList";
import Modal from "@/components/ui/Modal";
import { getVisitDetail } from "@/services/examinationService";
import { displayText } from "@/utils/medicalRecord";
import { MEDICAL_RECORD_PLAN_STATUS } from "@/utils/messages";

const Section = ({ title, children }) => {
    const titleId = useId();
    return (
        <section aria-labelledby={titleId} className="flex flex-col gap-2">
            <h3 id={titleId} className="font-semibold text-ink">
                {title}
            </h3>
            {children}
        </section>
    );
};

const EmptyNote = ({ children }) => <p className="rounded-md bg-surface-tint px-3 py-2.5 text-muted">{children}</p>;

const TableBox = ({ children }) => <div className="overflow-x-auto rounded-lg border border-border">{children}</div>;

const PlanCard = ({ plan }) => {
    const total = plan.stages.length;
    const doneCount = plan.stages.filter((stage) => stage.status === "done").length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;
    const meta = [plan.code && `Mã ${plan.code}`, plan.teeth && `Răng ${plan.teeth}`, plan.start && `Bắt đầu ${plan.start}`, plan.duration].filter(Boolean).join(" · ");

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{plan.name}</p>
                <RecordStatusBadge status={plan.status} labels={MEDICAL_RECORD_PLAN_STATUS} />
            </div>
            <p className="-mt-2 text-caption text-muted">{meta}</p>
            <div className="flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
                    <span className="block h-full rounded-full bg-success-solid" style={{ width: `${percent}%` }} />
                </span>
                <span className="num shrink-0 text-caption font-medium text-body">
                    Tiến độ: đã xong {doneCount}/{total} bước
                </span>
            </div>
            <TreatmentStepList stages={plan.stages} />
        </div>
    );
};

const DetailBody = ({ detail }) => (
    <div className="mt-5 flex flex-col gap-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg bg-surface-tint px-4 py-3 sm:grid-cols-2">
            {[
                ["Bác sĩ", detail.doctor],
                ["Dịch vụ", detail.service],
                ["Lý do khám", detail.reason],
                ["Hẹn tái khám", detail.nextVisit],
            ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="text-caption text-muted">{label}</dt>
                    <dd className="font-medium text-ink">{displayText(value || null)}</dd>
                </div>
            ))}
        </dl>

        <Section title="Chẩn đoán">
            {detail.diagnoses.length ? (
                <TableBox>
                    <table className="table">
                        <thead>
                            <tr>
                                <th scope="col">Mã ICD</th>
                                <th scope="col">Chẩn đoán</th>
                                <th scope="col">Răng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detail.diagnoses.map((item) => (
                                <tr key={item.code}>
                                    <td className="num font-semibold text-ink">{item.code}</td>
                                    <td className="min-w-44">{item.name}</td>
                                    <td className="num whitespace-nowrap">{displayText(item.teeth || null)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableBox>
            ) : (
                <EmptyNote>Buổi này chưa ghi chẩn đoán.</EmptyNote>
            )}
        </Section>

        {detail.done.length > 0 && (
            <Section title="Việc đã làm trong buổi">
                <ul className="flex list-disc flex-col gap-1 pl-5">
                    {detail.done.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </Section>
        )}

        <Section title="Kế hoạch điều trị">
            {detail.plan ? <PlanCard plan={detail.plan} /> : <EmptyNote>Buổi này không lập kế hoạch điều trị.</EmptyNote>}
        </Section>

        <Section title="Đơn thuốc">
            {detail.prescription?.items.length ? (
                <>
                    <TableBox>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th scope="col">Thuốc</th>
                                    <th scope="col">Số lượng</th>
                                    <th scope="col">Cách dùng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.prescription.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="min-w-40">
                                            <b className="font-semibold text-ink">{item.name}</b>
                                            <p className="text-caption text-muted">{item.strength}</p>
                                        </td>
                                        <td className="whitespace-nowrap">{item.quantity}</td>
                                        <td className="min-w-56">{item.usage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableBox>
                    {detail.prescription.note && (
                        <p className="text-caption text-body">
                            <b className="font-semibold">Lời dặn:</b> {detail.prescription.note}
                        </p>
                    )}
                </>
            ) : (
                <EmptyNote>Buổi này không kê đơn thuốc.</EmptyNote>
            )}
        </Section>
    </div>
);

// Popup "Xem chi tiết" of a previous visit: diagnoses, work done, treatment plan and progress, prescription.
// visit: the row from PreviousVisitsCard ({ id, date, doctor }); the details are loaded when it opens.
const VisitDetailDialog = ({ queueId, visit, onClose }) => {
    const [result, setResult] = useState(null);
    const closeRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        getVisitDetail(queueId, visit.id).then((response) => {
            if (!cancelled) setResult(response);
        });
        return () => {
            cancelled = true;
        };
    }, [queueId, visit.id]);

    return (
        <Modal title={`Lần khám ${visit.date}`} description={visit.doctor} size="lg" onClose={onClose} initialFocusRef={closeRef}>
            {!result && (
                <div className="mt-5 flex flex-col gap-3" aria-hidden="true">
                    <div className="skeleton h-16" />
                    <div className="skeleton h-24" />
                    <div className="skeleton h-32" />
                </div>
            )}
            {result && !result.success && (
                <p role="alert" className="alert alert-danger mt-5">
                    {result.message}
                </p>
            )}
            {result?.success && <DetailBody detail={result.data} />}
            <div className="modal-actions">
                <button ref={closeRef} type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
            </div>
        </Modal>
    );
};

export default VisitDetailDialog;

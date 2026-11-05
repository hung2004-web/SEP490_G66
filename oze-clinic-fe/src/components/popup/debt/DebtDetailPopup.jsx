import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { DEBT_PAYMENT_STATUS_LABELS, DEBT_STATUS_LABELS, getDebtAgeLevel } from "@/utils/data/mockDebts";
import { cx } from "@/utils/cx";
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";

const AmountTile = ({ label, amount, className }) => (
    <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-caption text-muted">{label}</p>
        <p className={cx("num mt-1 font-heading text-heading-3", className)}>{formatCurrency(amount)}</p>
    </div>
);

// "Chi tiết công nợ" popup, read only.
// debt: { invoiceNumber, createdAt, treatmentPlanName, doctorName, patientName, totalAmount, paidAmount, remainingAmount, status,
// nextVisitDate, services: [{ id, name, quantity, unitPrice, amount }],
// payments: [{ id, paidAt, amount, methodLabel, status, confirmedByName }] }.
const DebtDetailPopup = ({ debt, onClose }) => {
    const ageLevel = getDebtAgeLevel(debt.createdAt);
    const description = [
        `Lập ${formatDate(debt.createdAt)}`,
        debt.treatmentPlanName && `Kế hoạch điều trị: ${debt.treatmentPlanName}`,
        debt.doctorName,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <Modal
            size="md"
            title={
                <span className="flex flex-wrap items-center gap-2">
                    Chi tiết công nợ · {debt.invoiceNumber}
                    <StatusBadge status={debt.status} labels={DEBT_STATUS_LABELS} />
                </span>
            }
            description={description}
            onClose={onClose}
        >
            <div className="mt-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-surface-tint px-4 py-3">
                    <Avatar fullName={debt.patientName} className="avatar-soft" />
                    <p className="font-semibold text-ink">{debt.patientName}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <AmountTile label="Phải trả" amount={debt.totalAmount} className="text-ink" />
                    <AmountTile label="Đã trả" amount={debt.paidAmount} className="text-success" />
                    <AmountTile label="Còn nợ" amount={debt.remainingAmount} className="text-danger" />
                </div>

                <section>
                    <h3 className="mb-2 text-body-sm font-semibold text-ink">Dịch vụ trong hoá đơn</h3>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th scope="col">Dịch vụ</th>
                                    <th scope="col" className="text-right">
                                        SL
                                    </th>
                                    <th scope="col" className="text-right">
                                        Đơn giá
                                    </th>
                                    <th scope="col" className="text-right">
                                        Thành tiền
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {debt.services.map((service) => (
                                    <tr key={service.id}>
                                        <td className="min-w-48">{service.name}</td>
                                        <td className="num text-right">{service.quantity}</td>
                                        <td className="num whitespace-nowrap text-right">{formatNumber(service.unitPrice)}</td>
                                        <td className="num whitespace-nowrap text-right">{formatNumber(service.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h3 className="mb-2 text-body-sm font-semibold text-ink">Lịch sử thanh toán</h3>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th scope="col">Ngày</th>
                                    <th scope="col" className="text-right">
                                        Số tiền
                                    </th>
                                    <th scope="col">Phương thức</th>
                                    <th scope="col">Trạng thái</th>
                                    <th scope="col">Xác nhận bởi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debt.payments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center text-muted">
                                            Chưa có lần thanh toán nào
                                        </td>
                                    </tr>
                                )}
                                {debt.payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="num whitespace-nowrap">{formatDate(payment.paidAt)}</td>
                                        <td className="num whitespace-nowrap text-right">{formatNumber(payment.amount)}</td>
                                        <td className="whitespace-nowrap">{payment.methodLabel}</td>
                                        <td className="whitespace-nowrap">
                                            <StatusBadge status={payment.status} labels={DEBT_PAYMENT_STATUS_LABELS} />
                                        </td>
                                        <td className="whitespace-nowrap">{payment.confirmedByName ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {ageLevel && (
                    <p className="alert alert-warning">
                        Nợ quá {ageLevel.days} ngày.
                        {debt.nextVisitDate && ` Lễ tân gọi nhắc bệnh nhân khi đến lịch tái khám ${formatDate(debt.nextVisitDate)}.`}
                    </p>
                )}

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DebtDetailPopup;

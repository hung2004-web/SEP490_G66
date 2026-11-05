import { ReceiptText } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { DEBT_STATUS_LABELS, getDebtAgeLevel } from "@/utils/data/mockDebts";
import { cx } from "@/utils/cx";
import { formatCurrency, formatDate, formatNumber, formatPhone } from "@/utils/format";

const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 10;

// "Công nợ" table; rows older than 30 and 60 days are coloured (see DebtAgeLegend).
// debts: [{ id, patientName, phone, invoiceNumber, createdAt, totalAmount, paidAmount, remainingAmount, status }].
// firstNumber: the STT of the first row on this page. filtered: a search or filter is on, which changes the empty message.
// footer: shown under the rows, e.g. the row count and Pagination.
const DebtTable = ({ debts = [], firstNumber = 1, loading = false, filtered = false, onView, footer }) => (
    <div className="table-wrap">
        <table className="table" aria-busy={loading}>
            <thead>
                <tr>
                    <th scope="col">STT</th>
                    <th scope="col">Bệnh nhân</th>
                    <th scope="col">Số điện thoại</th>
                    <th scope="col">Hoá đơn</th>
                    <th scope="col">Ngày tạo</th>
                    <th scope="col" className="text-right">
                        Phải trả
                    </th>
                    <th scope="col" className="text-right">
                        Đã trả
                    </th>
                    <th scope="col" className="text-right">
                        Còn nợ
                    </th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">
                        <span className="sr-only">Thao tác</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                {loading &&
                    Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                        <tr key={index} aria-hidden="true">
                            {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                                <td key={cell}>
                                    <div className="skeleton h-4 w-full max-w-32" />
                                </td>
                            ))}
                        </tr>
                    ))}
                {!loading && debts.length === 0 && (
                    <tr>
                        <td colSpan={COLUMN_COUNT}>
                            <div className="empty-state">
                                <ReceiptText className="empty-state-icon" aria-hidden="true" />
                                <p className="empty-state-title">{filtered ? "Không tìm thấy hoá đơn phù hợp" : "Không có hoá đơn còn nợ"}</p>
                                {filtered && <p className="empty-state-text">Thử đổi từ khóa hoặc bộ lọc.</p>}
                            </div>
                        </td>
                    </tr>
                )}
                {!loading &&
                    debts.map((debt, index) => {
                        const ageLevel = getDebtAgeLevel(debt.createdAt);
                        return (
                            <tr key={debt.id} className={ageLevel?.row}>
                                <td className={cx("num", ageLevel?.edge)}>{firstNumber + index}</td>
                                <td className="min-w-40 font-semibold text-ink">{debt.patientName}</td>
                                <td className="num whitespace-nowrap">{formatPhone(debt.phone)}</td>
                                <td className="num font-semibold whitespace-nowrap text-ink">{debt.invoiceNumber}</td>
                                <td className={cx("num whitespace-nowrap", ageLevel?.date)}>{formatDate(debt.createdAt)}</td>
                                <td className="num whitespace-nowrap text-right">{formatNumber(debt.totalAmount)}</td>
                                <td className="num whitespace-nowrap text-right">{formatNumber(debt.paidAmount)}</td>
                                <td className="num whitespace-nowrap text-right font-semibold text-danger">{formatCurrency(debt.remainingAmount)}</td>
                                <td className="whitespace-nowrap">
                                    <StatusBadge status={debt.status} labels={DEBT_STATUS_LABELS} />
                                </td>
                                <td>
                                    <div className="flex items-center justify-end">
                                        <button type="button" className="btn btn-secondary whitespace-nowrap" onClick={() => onView(debt.id)}>
                                            Chi tiết
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
            </tbody>
        </table>
        {footer && <div className="table-footer">{footer}</div>}
    </div>
);

export default DebtTable;

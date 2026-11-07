import { ReceiptText } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { REFUND_REQUEST_STATUS_LABELS } from "@/utils/data/mockRefundRequests";
import { formatCurrency } from "@/utils/format";

const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 6;

// "Duyệt hoàn tiền" table. requests: [{ id, patientName, patientCode, invoiceNumber, paidAmount, status }].
// firstNumber: the STT of the first row on this page. filtered: a search or filter is on, which changes the empty message.
const RefundRequestTable = ({ requests = [], firstNumber = 1, loading = false, filtered = false, onView }) => (
    <div className="table-wrap">
        <table className="table" aria-busy={loading}>
            <thead>
                <tr>
                    <th scope="col">STT</th>
                    <th scope="col">Bệnh nhân</th>
                    <th scope="col">Hoá đơn</th>
                    <th scope="col" className="text-right">
                        Số tiền đã thanh toán
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
                {!loading && requests.length === 0 && (
                    <tr>
                        <td colSpan={COLUMN_COUNT}>
                            <div className="empty-state">
                                <ReceiptText className="empty-state-icon" aria-hidden="true" />
                                <p className="empty-state-title">{filtered ? "Không tìm thấy yêu cầu phù hợp" : "Chưa có yêu cầu hoàn tiền nào"}</p>
                                {filtered && <p className="empty-state-text">Thử đổi từ khóa hoặc bộ lọc.</p>}
                            </div>
                        </td>
                    </tr>
                )}
                {!loading &&
                    requests.map((request, index) => (
                        <tr key={request.id}>
                            <td className="num">{firstNumber + index}</td>
                            <td className="min-w-40">
                                <p className="font-semibold text-ink">{request.patientName}</p>
                                <p className="num text-caption text-muted">{request.patientCode}</p>
                            </td>
                            <td className="num whitespace-nowrap">{request.invoiceNumber}</td>
                            <td className="num whitespace-nowrap text-right font-semibold text-ink">{formatCurrency(request.paidAmount)}</td>
                            <td>
                                <StatusBadge status={request.status} labels={REFUND_REQUEST_STATUS_LABELS} />
                            </td>
                            <td>
                                <div className="flex items-center justify-end">
                                    <button type="button" className="btn btn-secondary whitespace-nowrap" onClick={() => onView(request.id)}>
                                        Xem chi tiết
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
            </tbody>
        </table>
    </div>
);

export default RefundRequestTable;

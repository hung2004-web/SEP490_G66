import DashboardSection from "@/components/dashboard/DashboardSection";
import DetailLink from "@/components/ui/DetailLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { INVOICE_PAYMENT_STATUS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS } from "@/utils/messages";
import { getInvoiceDetailRoute } from "@/utils/routes";

const KNOWN_STATUSES = [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIALLY_PAID, PAYMENT_STATUS.PAID];

const getPaymentLine = (payment) => {
    if (!payment) return "";
    const method = Object.hasOwn(PAYMENT_METHOD_LABELS, payment.paymentMethod) ? PAYMENT_METHOD_LABELS[payment.paymentMethod] : null;
    return [method, formatDateTime(payment.paidAt), payment.cashierName].filter(Boolean).join(" · ");
};

const AppointmentPayment = ({ invoice }) => {
    const known = KNOWN_STATUSES.includes(invoice.paymentStatus);
    const paid = invoice.paymentStatus === PAYMENT_STATUS.PAID;
    const amount = paid ? invoice.finalAmount : invoice.finalAmount - invoice.paidAmount;
    const paymentLine = paid ? getPaymentLine(invoice.payment) : "";
    const lines = Array.isArray(invoice.lines) ? invoice.lines : [];

    return (
        <DashboardSection id="appointment-payment" title="Thanh toán">
            {known && <p className="text-body-sm text-muted">{paid ? "Đã thanh toán đủ cho lịch hẹn này." : "Vui lòng thanh toán tại quầy lễ tân."}</p>}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-title text-ink">Hóa đơn {invoice.invoiceNumber}</p>
                    <StatusBadge status={invoice.paymentStatus} labels={INVOICE_PAYMENT_STATUS} />
                </div>
                {lines.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2">
                        {lines.map((line, index) => (
                            <li key={index} className="flex justify-between gap-4 text-body-sm">
                                <span className="text-body">{line.serviceName}</span>
                                <span className="num shrink-0 text-ink">{formatCurrency(line.amount)}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {known && (
                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                        <span className="text-title text-ink">{paid ? "Đã thanh toán" : "Cần thanh toán"}</span>
                        <span className="num font-heading text-heading-3 text-ink">{formatCurrency(amount)}</span>
                    </div>
                )}
                {paymentLine && <p className="num mt-2 text-caption text-muted">{paymentLine}</p>}
            </div>
            <DetailLink to={getInvoiceDetailRoute(invoice.id)} context={`hóa đơn ${invoice.invoiceNumber}`} className="self-start">
                Xem hóa đơn
            </DetailLink>
        </DashboardSection>
    );
};

export default AppointmentPayment;

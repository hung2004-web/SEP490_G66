# F-PAY-05 Hủy hóa đơn, hoàn tiền

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, câu hỏi Q5. Mã quy tắc `BR-...` lấy từ đó.
> **Chưa làm.** Mọi nội dung API/luồng dưới đây là **ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | ĐỀ XUẤT: `Receptionist` (tạo yêu cầu, thực hiện), `ClinicManager` (duyệt) |
| API | ĐỀ XUẤT: `POST api/invoices/{id}/cancel`, `POST api/invoices/{id}/refund-requests`, `POST api/refund-requests/{id}/approve`, `.../reject`, `.../process` |
| Code chính | ĐỀ XUẤT: `InvoicesController` / `RefundRequestsController` → `InvoiceService` / `RefundService` → `InvoiceRepository` |

## 1. Chức năng này làm gì

- **Hủy hóa đơn**: bỏ một hóa đơn lập sai khi chưa thu tiền.
- **Hoàn tiền**: khi đã thu (ví dụ hủy kế hoạch sau khi ứng trước), lễ tân tạo yêu cầu hoàn, chủ phòng khám duyệt, lễ tân thực hiện và ghi phương thức.

## 2. Tiền điều kiện

- Đã có trong code: `Invoice.CancelledAt`, trạng thái `CANCELLED`, `PARTIALLY_REFUNDED`, `REFUNDED` (`InvoiceConstants.cs`); `Payment.PaymentStatus = REFUNDED`; entity `RefundAdjustmentRequest` (`InvoiceId`, `PaymentId?`, `RequestType ∈ {Refund, Adjustment}`, `Amount > 0`, `Reason` bắt buộc, `Status ∈ {Pending, Approved, Rejected, Processed}`, `RequestedByUserId`, `ApprovedByUserId`, `ApprovedAt`, `RejectionReason`, `ProcessedAt`) — `RefundAdjustmentRequestConfiguration.cs:11-50`.
- ĐỀ XUẤT: hủy chỉ khi `PaidAmount = 0` và không có `Payment` `PENDING`; hoàn tiền chỉ khi `PaidAmount > 0`.

## 3. API

ĐỀ XUẤT:

| API | Body | Kết quả |
|---|---|---|
| `POST api/invoices/{id}/cancel` | `{ "reason": "..." }` | `PaymentStatus = CANCELLED`, `CancelledAt` |
| `POST api/invoices/{id}/refund-requests` | `{ "amount", "reason", "paymentId?" }` | `RefundAdjustmentRequest` `Pending`, `RequestType = Refund` |
| `POST api/refund-requests/{id}/approve` (`ClinicManager`) | — | `Approved`, `ApprovedByUserId`, `ApprovedAt` |
| `POST api/refund-requests/{id}/reject` (`ClinicManager`) | `{ "rejectionReason" }` | `Rejected` |
| `POST api/refund-requests/{id}/process` | `{ "refundMethod" }` | `Processed`, `ProcessedAt`; hóa đơn `PARTIALLY_REFUNDED`/`REFUNDED` |

ĐỀ XUẤT **Lỗi**: 404 `InvoiceNotFound`; 400 hóa đơn đã thu không hủy được (phải hoàn); 400 số hoàn > số đã thu − số đã hoàn; 400 thiếu lý do; 403 lễ tân tự duyệt; 409 `RowVersion`.

## 4. Luồng xử lý trong code

Chưa có code. ĐỀ XUẤT:
1. Hủy: kiểm điều kiện, đặt `CANCELLED`, `CancelledAt`, `UpdatedAt`, ghi `AuditLog`. Hóa đơn hủy không còn tính trong BR-PAY-02 (giai đoạn được lập hóa đơn lại). Lưu ý `IsInvoicedAsync` của M7 hiện **vẫn tính** hóa đơn hủy.
2. Hoàn tiền: số hoàn đề xuất = tiền ứng trước − giá trị phần đã làm (BR-PAY-07); tạo yêu cầu `Pending` → quản lý duyệt → lễ tân thực hiện.
3. Khi `Processed`: tính lại trạng thái hóa đơn (hoàn một phần → `PARTIALLY_REFUNDED`, hoàn hết → `REFUNDED`); nếu hoàn trọn một `Payment` thì `Payment.PaymentStatus = REFUNDED`. Lưu cùng một `SaveChanges`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-07 | Hoàn tiền = ứng trước − phần đã làm; chủ phòng khám duyệt qua `RefundAdjustmentRequest` | Chưa có (chỉ có bảng) |
| BR-PAY-02 | Hóa đơn đã hủy không tính khi kiểm giai đoạn trùng | Chưa có |
| BR-C11 | Hoàn tiền ghi `AuditLog` | Chưa có |
| Q5 | Mặc định tạm: quản lý duyệt, lễ tân thực hiện, ghi phương thức | Chưa có |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Invoices` (hủy) | `UNPAID` | `CANCELLED` | `CancelledAt` |
| `RefundAdjustmentRequests` | — | `Pending` → `Approved`/`Rejected` → `Processed` | |
| `Invoices` (hoàn) | `PAID` / `PARTIALLY_PAID` | `PARTIALLY_REFUNDED` / `REFUNDED` | |
| `Payments` | `CONFIRMED` | `REFUNDED` | Khi hoàn trọn khoản |

## 7. Liên quan

- Trước đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md), [F-PAY-03](F-PAY-03_thu-tien.md), [F-TP-08](../M7-ke-hoach-dieu-tri/F-TP-08_huy-ke-hoach.md) hủy kế hoạch.
- Sau đó: [F-PAY-06](F-PAY-06_chot-ca.md) (số tiền hoàn trong ca).

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa có code).

## 9. Còn thiếu / câu hỏi mở

- `RefundAdjustmentRequest` không có cột phương thức hoàn tiền (Q5 yêu cầu ghi phương thức) — cần thêm cột hoặc dùng `Payment` âm.
- Không có cột lý do hủy trên `Invoices` (chỉ có `CancelledAt`, `Notes`).
- Hủy kế hoạch ([F-TP-08](../M7-ke-hoach-dieu-tri/F-TP-08_huy-ke-hoach.md)) hiện không tạo yêu cầu hoàn tiền tự động.
- Giá trị "phần đã làm" lấy `ActualCost ?? EstimatedCost` của giai đoạn `Completed` (như `CompletedCost` ở M7) hay tổng dòng hóa đơn: chưa xác định.

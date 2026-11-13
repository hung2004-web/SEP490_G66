# F-PAY-05 Hủy hóa đơn, hoàn tiền

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, câu hỏi Q5. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist` (hủy hóa đơn, tạo yêu cầu hoàn), `ClinicManager` (xem, nhập phần đã làm, duyệt, từ chối) |
| API | `POST api/invoices/{id}/cancel`, `POST api/invoices/{id}/refund-requests`, `GET api/refund-requests`, `PUT api/refund-requests/{id}/work-done`, `POST api/refund-requests/{id}/approve`, `POST api/refund-requests/{id}/reject` |
| Code chính | `InvoicesController.CancelAsync` / `CreateRefundRequestAsync`, `RefundRequestsController` → `InvoiceService.CancelAsync`, `RefundService.RequestAsync` / `GetListAsync` / `SetWorkDoneAsync` / `ApproveAsync` / `RejectAsync` → `InvoiceRepository`, `RefundRepository`, `InvoiceMoneyHelper` |

## 1. Chức năng này làm gì

- **Hủy hóa đơn**: lễ tân bỏ một hóa đơn lập sai khi chưa có khoản thu `CONFIRMED`. Các khoản chuyển khoản đang `PENDING` tự thành `FAILED`.
- **Hoàn tiền** (ví dụ bệnh nhân bỏ dở kế hoạch đã ứng trước): lễ tân tạo yêu cầu kèm lý do; quản lý nhập giá trị phần đã làm (`workDoneAmount`) rồi duyệt. Số hoàn = số đã thu ròng − phần đã làm. Duyệt xong yêu cầu thành `Processed` ngay và hóa đơn thành `PARTIALLY_REFUNDED`/`REFUNDED`. Quản lý cũng có thể từ chối kèm lý do.

## 2. Tiền điều kiện

- Hủy: role `Receptionist` (`InvoicesController.cs:93-94`); hóa đơn chưa `CANCELLED`, không có khoản `CONFIRMED`.
- Tạo yêu cầu hoàn: role `Receptionist` (`InvoicesController.cs:141-142`); hóa đơn không `CANCELLED`/`REFUNDED`; số đã thu ròng > 0; chưa có yêu cầu `Pending` khác của hóa đơn.
- Xem, nhập phần đã làm, duyệt, từ chối: role `ClinicManager` (`RefundRequestsController.cs:21-22`, `:34-35`, `:48-49`, `:58-59`); yêu cầu đang `Pending`.

## 3. API

**Request** `POST api/invoices/{id:long}/cancel`, quyền `[Authorize(Roles = "Receptionist")]`. Không có body. Response `ApiResponse<InvoiceResponse>` ([F-PAY-02](F-PAY-02_xem-hoa-don-cong-no.md)), message `InvoiceCancelled` = "Invoice has been cancelled.", `paymentStatus = "CANCELLED"`, có `cancelledAt`.

**Request** `POST api/invoices/{id:long}/refund-requests`, quyền `[Authorize(Roles = "Receptionist")]`. Body `CreateRefundRequest` (`RefundModels.cs:5-12`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `reason` | string | Có | `[Required]`, `MaxLength(1000)`, không rỗng sau trim | Lý do hoàn |
| `paymentId` | long? | Không | Khoản `CONFIRMED` của hóa đơn | Khoản liên quan (chỉ lưu tham chiếu) |

```json
{ "reason": "Bệnh nhân dừng niềng sau 2 tháng", "paymentId": 88 }
```

**Request** `GET api/refund-requests?status=&invoiceId=`, quyền `[Authorize(Roles = "ClinicManager")]`. `status` ∈ `Pending`, `Approved`, `Rejected`, `Processed` (không phân biệt hoa thường). Không phân trang; mới nhất trước.

**Request** `PUT api/refund-requests/{id:long}/work-done`, quyền `ClinicManager`. Body `SetWorkDoneAmountRequest`: `workDoneAmount` (decimal, `[Range(0, max)]`, phải < số đã thu ròng). Gọi lại được nhiều lần khi còn `Pending`.

**Request** `POST api/refund-requests/{id:long}/approve`, quyền `ClinicManager`. Không có body.

**Request** `POST api/refund-requests/{id:long}/reject`, quyền `ClinicManager`. Body `RejectRefundRequest`: `rejectionReason` (`[Required]`, `MaxLength(500)`).

**Response thành công** (`ApiResponse<RefundRequestResponse>` hoặc danh sách, HTTP 200; message `RequestCreated` / `WorkDoneUpdated` / `RequestApproved` / `RequestRejected`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `invoiceId`, `invoiceNumber`, `paymentId` | | |
| `requestType` | string | Luôn `Refund` |
| `amount` | decimal | Khi `Pending`: tạm bằng số đã thu ròng; sau duyệt: số hoàn thật |
| `workDoneAmount` | decimal? | Phần đã làm do quản lý nhập |
| `reason`, `status` | string | `status`: `Pending`, `Processed`, `Rejected` |
| `requestedByUserId`, `approvedByUserId`, `approvedAt` | | `approvedBy/At` cũng được ghi khi từ chối |
| `rejectionReason`, `processedAt`, `createdAt` | | |
| `invoicePaidAmount`, `invoicePaymentStatus` | | Hóa đơn sau thao tác |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Body sai annotation (thiếu `reason`, `rejectionReason`, `workDoneAmount` âm) | ProblemDetails mặc định |
| 404 | (Hủy) Không có hóa đơn | `InvoiceMessage.InvoiceNotFound` |
| 400 | (Hủy) Đã hủy | `InvoiceMessage.InvoiceAlreadyCancelled` |
| 400 | (Hủy) Có khoản `CONFIRMED` | `InvoiceMessage.InvoiceNotCancellable`: "Invoice cannot be cancelled because a confirmed payment exists." |
| 400 | (Yêu cầu) Lý do rỗng | `RefundMessage.ReasonRequired` |
| 404 | (Yêu cầu) Không có hóa đơn | `RefundMessage.InvoiceNotFound` |
| 400 | (Yêu cầu) Hóa đơn `CANCELLED`/`REFUNDED` | `RefundMessage.InvoiceNotRefundable` |
| 400 | (Yêu cầu) Đã có yêu cầu `Pending` | `RefundMessage.PendingRequestExists` |
| 400 | (Yêu cầu) Số đã thu ròng = 0 | `RefundMessage.NoConfirmedPayments` |
| 400 | (Yêu cầu) `paymentId` không thuộc hóa đơn / không `CONFIRMED` | `RefundMessage.PaymentInvalid` |
| 400 | (Danh sách) `status` sai | `RefundMessage.StatusInvalid` |
| 404 | Không có yêu cầu | `RefundMessage.RequestNotFound` |
| 400 | Yêu cầu không `Pending` | `RefundMessage.RequestNotPending` |
| 400 | (Duyệt) Chưa nhập phần đã làm | `RefundMessage.WorkDoneAmountRequired`: "Work-done amount is required before approval." |
| 400 | Phần đã làm âm / ≥ số đã thu ròng | `RefundMessage.WorkDoneAmountInvalid` / `WorkDoneExceedsPaid` |
| 400 | (Từ chối) Lý do rỗng | `RefundMessage.RejectionReasonRequired` |
| 409 | Hóa đơn bị lưu cùng lúc (`RowVersion`) | `AppointmentMessage.RecordChangedMeanwhile` |

## 4. Luồng xử lý trong code

**Hủy hóa đơn** (`InvoiceService.CancelAsync`):
1. Controller — `InvoicesController.cs:93-101`.
2. Đọc hóa đơn có tracking (404), chưa `CANCELLED` — `InvoiceService.cs:237-241`.
3. Không có khoản `CONFIRMED` — `InvoiceService.cs:243-246`.
4. Mọi khoản `PENDING` → `FAILED` — `InvoiceService.cs:248-251`.
5. `CANCELLED`, `CancelledAt = UpdatedAt = UtcNow`, lưu — `InvoiceService.cs:253-258`.
6. Audit `INVOICE_CANCELLED` (không có lý do) — `InvoiceService.cs:260-264`.

**Tạo yêu cầu** (`RefundService.RequestAsync`, transaction `RefundRepository.cs:69-89`):
1. Lý do không rỗng — `RefundService.cs:35-36`.
2. Đọc hóa đơn (404), không `CANCELLED`/`REFUNDED` — `RefundService.cs:38-40`, `:264-270`.
3. Không có yêu cầu `Pending` — `RefundService.cs:42-44`, `RefundRepository.cs:61-67`.
4. `netPaid = max(0, Σ CONFIRMED − Σ hoàn Approved/Processed) > 0` — `RefundService.cs:46-47`, `InvoiceMoneyHelper.cs:27-28`.
5. `paymentId` (nếu có) phải là khoản `CONFIRMED` của hóa đơn — `RefundService.cs:49-57`.
6. Tạo `RefundAdjustmentRequest` `Refund`, `Pending`, `Amount = netPaid` (tạm) — `RefundService.cs:59-71`.
7. Lưu, audit `REFUND_REQUESTED` — `RefundService.cs:73-89`.

**Danh sách**: chuẩn hóa `status`, lọc theo `status`, `invoiceId` — `RefundService.cs:95-107`, `RefundRepository.cs:34-59`.

**Nhập phần đã làm** (`SetWorkDoneAsync`, transaction): đọc yêu cầu kèm hóa đơn (404), `Pending`, `0 ≤ workDone < netPaid`, lưu `WorkDoneAmount`, audit `REFUND_WORK_DONE_SET` — `RefundService.cs:117-143`.

**Duyệt** (`ApproveAsync`, transaction):
1. Đọc yêu cầu (404), `Pending`, đã có `WorkDoneAmount` — `RefundService.cs:156-167`.
2. Tính lại `netPaid` (yêu cầu đang `Pending` chưa bị trừ), kiểm `0 ≤ workDone < netPaid` — `RefundService.cs:169-174`.
3. `Amount = netPaid − workDone`; `Status = Processed`; `ApprovedByUserId`, `ApprovedAt = ProcessedAt = UpdatedAt = UtcNow` — `RefundService.cs:176-184`.
4. Tính lại hóa đơn: `PaidAmount` giảm, `PARTIALLY_REFUNDED` hoặc `REFUNDED` — `RefundService.cs:186-189`, `InvoiceMoneyHelper.cs:36-56`.
5. Audit `REFUND_APPROVED` và `REFUND_PROCESSED` — `RefundService.cs:191-209`.

**Từ chối** (`RejectAsync`, transaction): lý do không rỗng; yêu cầu `Pending`; `Rejected`, `RejectionReason`, `ApprovedByUserId`/`ApprovedAt` = người/giờ từ chối; audit `REFUND_REJECTED` — `RefundService.cs:223-258`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-07 | Hoàn tiền = ứng trước − phần đã làm; chủ phòng khám duyệt qua `RefundAdjustmentRequest` | `RefundService.cs:176` (số đã thu ròng − `WorkDoneAmount` quản lý nhập); duyệt chỉ `ClinicManager` (`RefundRequestsController.cs:49`) |
| BR-C11 | Hủy, hoàn tiền ghi `AuditLog` | `InvoiceService.cs:260-264`; `RefundService.cs:79-89`, `:139-143`, `:191-209` |
| BR-C10 | Thao tác đồng thời trên hóa đơn → 409 | `Invoice.RowVersion` + transaction |
| (code) | Đã có khoản `CONFIRMED` thì không hủy, phải hoàn | `InvoiceService.cs:243-246` |
| (code) | Mỗi hóa đơn tối đa một yêu cầu `Pending` | `RefundService.cs:42-44` |
| (code) | Phải nhập phần đã làm trước khi duyệt; số hoàn > 0 | `RefundService.cs:165-174` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Invoices` (hủy) | `UNPAID` / `PENDING_CONFIRMATION` (không có `CONFIRMED`) | `CANCELLED` | `CancelledAt` |
| `Payments` (hủy) | `PENDING` | `FAILED` | |
| `RefundAdjustmentRequests` | — | `Pending` | `Amount` tạm = số đã thu ròng |
| `RefundAdjustmentRequests` | `Pending` | `Processed` (duyệt) / `Rejected` | `Approved` không được dùng |
| `Invoices` (hoàn) | `PAID` / `PARTIALLY_PAID` / `PARTIALLY_REFUNDED` | `PARTIALLY_REFUNDED` / `REFUNDED` | `PaidAmount` = đã thu − đã hoàn |
| `Payments` (hoàn) | `CONFIRMED` | Không đổi | Trạng thái `REFUNDED` của `Payment` không được dùng |
| `AuditLogs` | — | `INVOICE_CANCELLED`, `REFUND_REQUESTED`, `REFUND_WORK_DONE_SET`, `REFUND_APPROVED`, `REFUND_PROCESSED`, `REFUND_REJECTED` | |

## 7. Liên quan

- Trước đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md), [F-PAY-03](F-PAY-03_thu-tien.md), [F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md), [F-TP-08](../M7-ke-hoach-dieu-tri/F-TP-08_huy-ke-hoach.md) hủy kế hoạch.
- Sau đó: [F-PAY-06](F-PAY-06_chot-ca.md) báo cáo; hóa đơn hủy cho phép lập lại hóa đơn cho lịch hẹn/kế hoạch đó ([F-PAY-01](F-PAY-01_lap-hoa-don.md)).

## 8. Kiểm thử

- Test hiện có: Chưa có (`OZE.UnitTest` không có test cho `RefundService`, `InvoiceService`).
- Ca cần test: hủy hóa đơn `UNPAID` → `CANCELLED`; hủy khi có khoản `PENDING` → khoản `FAILED`; hủy khi có `CONFIRMED` → 400; tạo yêu cầu khi chưa thu → 400; hai yêu cầu `Pending` → 400; duyệt khi chưa nhập phần đã làm → 400; phần đã làm ≥ đã thu → 400; duyệt một phần → `PARTIALLY_REFUNDED`, `PaidAmount` giảm đúng; duyệt hết (phần đã làm = 0) → `REFUNDED`; từ chối → hóa đơn không đổi; lễ tân gọi `approve` → 403.

## 9. Còn thiếu / câu hỏi mở

Phát hiện review 11/11/2026, kiểm lại với code:
- **Hủy hóa đơn không cần lý do** (không có body, không có cột lý do trên `Invoices`; audit không có lý do — BR-C11), và **khoản CK `PENDING` tự thành `FAILED`** (`InvoiceService.cs:232-267`): mất dấu để đối soát ngân hàng nếu khách đã chuyển.
- **Số hoàn = số đã thu ròng − `WorkDoneAmount` do quản lý tự gõ** (`RefundService.cs:128-131`, `:176`); server không gợi ý phần đã làm từ giai đoạn `Completed`. BR-PAY-07 nói "tiền ứng trước − phần đã làm", code lấy toàn bộ số đã thu.
- **Duyệt xong là `Processed` ngay** (`RefundService.cs:180-183`), không có bước lễ tân chi tiền, không ghi phương thức hoàn (`RefundAdjustmentRequest` không có cột phương thức). Q5 (mặc định tạm "quản lý duyệt, lễ tân thực hiện, ghi phương thức") được code quyết khác.
- `paymentId` chỉ lưu tham chiếu, số hoàn vẫn tính theo cả hóa đơn (`RefundService.cs:49-57`, `:176`); khoản đó không chuyển `REFUNDED`.
- Duyệt hoàn tiền khi hóa đơn còn khoản `PENDING`: sau đó khoản này không xác nhận được (hóa đơn đã `PARTIALLY_REFUNDED`/`REFUNDED`) → kẹt ([F-PAY-03](F-PAY-03_thu-tien.md) mục 9).
- Sau khi hoàn một phần, hóa đơn không thu tiếp được; khoản đã `CONFIRMED` vẫn void được sau hoàn tiền ([F-PAY-03](F-PAY-03_thu-tien.md)).
- Hóa đơn `REFUNDED` vẫn tính là "mở" ở `HasOpenInvoiceForTreatmentPlanAsync`, nên kế hoạch đó không lập được hóa đơn mới ([F-PAY-01](F-PAY-01_lap-hoa-don.md)).
- Hủy kế hoạch ([F-TP-08](../M7-ke-hoach-dieu-tri/F-TP-08_huy-ke-hoach.md)) không tự tạo yêu cầu hoàn tiền; hủy hóa đơn không đụng lịch trả góp.
- Lễ tân không xem được danh sách yêu cầu hoàn (`GET api/refund-requests` chỉ `ClinicManager`); danh sách không phân trang.
- Loại `Adjustment` (điều chỉnh, có thể dùng cho giảm giá cần duyệt — Q4) có trong DB nhưng chưa có API. Message `RequestProcessed`, `AmountInvalid`, `TypeInvalid` khai báo nhưng không dùng.
- Báo cáo thu ngày không trừ tiền hoàn ([F-PAY-06](F-PAY-06_chot-ca.md)).
- Thiết kế đề xuất trước đây có bước `POST api/refund-requests/{id}/process` và body `reason` cho hủy hóa đơn: không được làm theo.

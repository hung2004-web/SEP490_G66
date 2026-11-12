# F-PAY-03 Thu tiền, xác nhận chuyển khoản, hủy khoản thu

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist` |
| API | `POST api/invoices/{id}/payments`, `POST api/payments/{id}/confirm`, `POST api/payments/{id}/void` |
| Code chính | `InvoicesController.RecordPaymentAsync`, `PaymentsController.ConfirmAsync` / `VoidAsync` → `PaymentService.RecordAsync` / `ConfirmAsync` / `VoidAsync` → `PaymentRepository`, `InvoiceRepository`, `InvoiceMoneyHelper` |

## 1. Chức năng này làm gì

Lễ tân ghi một khoản bệnh nhân trả cho hóa đơn. Tiền mặt (`CASH`) được xác nhận ngay; chuyển khoản (`BANK_TRANSFER`) và QR (`QR_TRANSFER`) ở `PENDING` đến khi lễ tân đối chiếu và bấm xác nhận. Mỗi khoản có mục đích `Regular` (thu thường), `Deposit` (ứng trước) hoặc `Installment` (trả một kỳ góp). Lễ tân hủy (void) được một khoản đã xác nhận. Sau mỗi thao tác, server tính lại `PaidAmount` và `PaymentStatus` của hóa đơn trong cùng giao dịch.

## 2. Tiền điều kiện

- Role `Receptionist` — `InvoicesController.cs:106-107`, `PaymentsController.cs:21-22`, `:31-32`.
- Ghi khoản / xác nhận: hóa đơn không `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED` — `PaymentService.cs:188-195`.
- `Installment`: hóa đơn đã có lịch trả góp ([F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md)), kỳ chọn đang `Pending`/`Overdue` và chưa gắn khoản nào.
- Xác nhận: khoản đang `PENDING`. Void: khoản đang `CONFIRMED`, hóa đơn không `CANCELLED`.

## 3. API

**Request** `POST api/invoices/{id:long}/payments`, quyền `[Authorize(Roles = "Receptionist")]`

Body `RecordPaymentRequest` (`RecordPaymentRequest.cs:5-25`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `amount` | decimal | Có | `[Range(0.01, max)]`; làm tròn 2 số; tiền mặt ≤ số còn nợ | Số tiền |
| `paymentMethod` | string | Có | `CASH`, `BANK_TRANSFER`, `QR_TRANSFER` (không phân biệt hoa thường) | Phương thức |
| `purpose` | string | Có (mặc định `Regular`) | `Deposit`, `Regular`, `Installment` (không phân biệt hoa thường) | Mục đích |
| `transactionReference` | string? | Không (kể cả CK/QR) | `MaxLength(100)`, unique khi có | Mã giao dịch ngân hàng |
| `installmentPeriodId` | long? | Bắt buộc khi `Installment`, cấm khi khác | Kỳ thuộc hóa đơn, `Pending`/`Overdue`, chưa gắn khoản | Kỳ trả góp |
| `notes` | string? | Không | `MaxLength(500)` | Ghi chú |

```json
{ "amount": 500000, "paymentMethod": "CASH", "purpose": "Regular" }
```

```json
{ "amount": 3000000, "paymentMethod": "BANK_TRANSFER", "purpose": "Installment", "installmentPeriodId": 31, "transactionReference": "FT2631501234" }
```

**Request** `POST api/payments/{id:long}/confirm` và `POST api/payments/{id:long}/void`, quyền `[Authorize(Roles = "Receptionist")]`. Không có body.

**Response thành công** (`ApiResponse<PaymentResponse>`, HTTP 200, message `PaymentRecorded` = "Payment has been recorded." / `PaymentConfirmed` = "Payment has been confirmed." / `PaymentVoided` = "Payment has been voided.")

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `invoiceId`, `amount`, `paymentMethod`, `purpose` | | Khoản thu |
| `paymentStatus` | string | `CONFIRMED` (tiền mặt, sau xác nhận), `PENDING` (CK/QR mới ghi), `FAILED` (sau void hoặc hóa đơn bị hủy) |
| `transactionReference`, `installmentPeriodId`, `notes` | | |
| `createdAt`, `paidAt`, `confirmedByUserId` | | `paidAt`, `confirmedByUserId` chỉ có khi `CONFIRMED` |
| `invoicePaidAmount`, `invoiceRemainingAmount`, `invoicePaymentStatus` | | Hóa đơn sau cập nhật |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants.PaymentMessage`) |
|---|---|---|
| 400 | Body sai annotation | ProblemDetails mặc định |
| 404 | Không có hóa đơn / không có khoản thu | `InvoiceNotFound` / `PaymentNotFound`: "Payment not found." |
| 400 | Hóa đơn `CANCELLED`/`REFUNDED`/`PARTIALLY_REFUNDED` (void: chỉ `CANCELLED`) | `InvoiceNotPayable`: "Payments cannot be recorded on this invoice." |
| 400 | Phương thức / mục đích sai | `MethodInvalid` / `PurposeInvalid` |
| 400 | `amount` ≤ 0 sau làm tròn | `AmountInvalid` |
| 400 | `Installment` thiếu kỳ | `InstallmentPeriodRequired` |
| 400 / 404 | Gửi kỳ cho mục đích khác; kỳ không thuộc hóa đơn (404); kỳ đã `Paid` hoặc đã gắn khoản | `InstallmentPeriodInvalid`: "Installment period is invalid for this invoice." |
| 400 | Tiền mặt hoặc xác nhận vượt số còn nợ | `AmountExceedsRemaining`: "Payment amount exceeds the remaining balance." |
| 400 | Xác nhận khoản không `PENDING` | `PaymentNotPending`: "Only pending payments can be confirmed." |
| 400 | Void khoản không `CONFIRMED` | `PaymentNotVoidable`: "Payment cannot be voided." |
| 409 | Trùng `transactionReference`, hoặc kỳ trả góp đã có khoản (unique index) | "This record already exists" (`GlobalExceptionMiddleware.cs:61-66`) |
| 409 | Hai người cùng lưu hóa đơn (`RowVersion`) | `AppointmentMessage.RecordChangedMeanwhile` (`GlobalExceptionMiddleware.cs:55-60`) |

## 4. Luồng xử lý trong code

**Ghi khoản** (`PaymentService.RecordAsync`, chạy trong transaction `PaymentRepository.cs:37-57`):
1. Đọc hóa đơn có tracking kèm khoản thu, hoàn tiền, trả góp (404) — `PaymentService.cs:35-36`, `InvoiceRepository.cs:30-50`.
2. Hóa đơn thu được — `PaymentService.cs:38`, `:188-195`.
3. Chuẩn hóa phương thức, mục đích; `amount = Round(Amount, 2) > 0` — `PaymentService.cs:40-43`, `:197-214`.
4. `Installment`: bắt buộc kỳ, kỳ thuộc hóa đơn, `Pending`/`Overdue`, `PaymentId == null`; mục đích khác mà gửi kỳ → 400 — `PaymentService.cs:45-57`, `:224-235`.
5. `CASH` → `CONFIRMED`, còn lại → `PENDING`; chỉ khoản `CONFIRMED` bị kiểm `amount ≤ remaining` (`remaining = FinalAmount − (Σ CONFIRMED − Σ hoàn tiền Approved/Processed)`) — `PaymentService.cs:59-66`, `:216-222`, `InvoiceMoneyHelper.cs:8-31`.
6. Tạo `Payment` (`PaidAt`, `ConfirmedByUserId` chỉ với tiền mặt), thêm vào hóa đơn — `PaymentService.cs:68-89`.
7. Tiền mặt + `Installment`: kỳ → `Paid`, `PaidAt`, gắn khoản — `PaymentService.cs:91-94`, `:237-256`.
8. Tính lại hóa đơn (`InvoiceMoneyHelper.Recalculate`), `UpdatedAt`, một `SaveChanges` — `PaymentService.cs:96-99`.
9. Audit `PAYMENT_RECORDED` — `PaymentService.cs:101-105`.

**Xác nhận** (`ConfirmAsync`, transaction):
1. Đọc khoản kèm hóa đơn, khoản thu, hoàn tiền, trả góp (404) — `PaymentService.cs:118-121`, `PaymentRepository.cs:22-35`.
2. Hóa đơn thu được, khoản `PENDING`, `amount ≤ remaining` — `PaymentService.cs:122-128`.
3. `CONFIRMED`, `PaidAt = UtcNow`, `ConfirmedByUserId`; nếu là kỳ góp → kỳ `Paid` — `PaymentService.cs:130-135`.
4. Tính lại hóa đơn, lưu, audit `PAYMENT_CONFIRMED` — `PaymentService.cs:136-145`.

**Void** (`VoidAsync`, transaction):
1. Đọc khoản (404); hóa đơn không `CANCELLED`; khoản `CONFIRMED` — `PaymentService.cs:158-168`.
2. Khoản → `FAILED`; nếu gắn kỳ góp: kỳ bỏ `PaymentId`, `PaidAt`, về `Overdue` (hạn < hôm nay UTC) hoặc `Pending` — `PaymentService.cs:170-171`, `:258-283`.
3. Tính lại hóa đơn, lưu, audit `PAYMENT_VOIDED` — `PaymentService.cs:173-182`.

**Tính lại trạng thái hóa đơn** (`InvoiceMoneyHelper.Recalculate`, `InvoiceMoneyHelper.cs:36-73`): bỏ qua hóa đơn `CANCELLED`; `PaidAmount = max(0, Σ CONFIRMED − Σ hoàn tiền)`; có hoàn tiền → `REFUNDED` (ròng ≤ 0) hoặc `PARTIALLY_REFUNDED`; ròng ≤ 0 → `PENDING_CONFIRMATION` nếu có khoản `PENDING`, không thì `UNPAID`; ròng ≥ `FinalAmount` → `PAID`; còn lại `PARTIALLY_PAID` (kể cả khi còn khoản `PENDING`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-04 | Tiền mặt `CONFIRMED` ngay; CK/QR `PENDING` đến khi lễ tân xác nhận | `PaymentService.cs:59-61`, `:111-149` |
| BR-PAY-05 | Không thu vượt nợ; `PaidAmount`, `PaymentStatus` cập nhật cùng giao dịch | `PaymentService.cs:63-66`, `:128` (chỉ khi `CONFIRMED`); `:96-99` |
| BR-C04 | Tiền `decimal` | `PaymentService.cs:42` (làm tròn 2 số lẻ) |
| BR-C10 | Hai người thu cùng hóa đơn → 409 | `Invoice.RowVersion` + transaction |
| BR-C11 | Thu, xác nhận, void ghi `AuditLog` | `PaymentService.cs:101-105`, `:141-145`, `:178-182` (không có lý do) |
| (DB) | `Amount > 0`; phương thức, trạng thái, mục đích hợp lệ; `Installment` phải có kỳ; unique `TransactionReference`, unique `InstallmentPeriodId` | `PaymentConfiguration.cs:11-57` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Payments` (ghi) | — | `CONFIRMED` (tiền mặt) / `PENDING` (CK, QR) | |
| `Payments` (xác nhận) | `PENDING` | `CONFIRMED` | `PaidAt`, `ConfirmedByUserId` |
| `Payments` (void) | `CONFIRMED` | `FAILED` | `InstallmentPeriodId` giữ nguyên |
| `Invoices` | `UNPAID` / `PENDING_CONFIRMATION` / `PARTIALLY_PAID` / `PAID` | Tính lại theo mục 4 | `PaidAmount`, `UpdatedAt` |
| `InstallmentPeriods` | `Pending` / `Overdue` ↔ `Paid` | | Khi khoản `Installment` được xác nhận / bị void |
| `AuditLogs` | — | `PAYMENT_RECORDED` / `PAYMENT_CONFIRMED` / `PAYMENT_VOIDED` | |

## 7. Liên quan

- Trước đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md), [F-PAY-02](F-PAY-02_xem-hoa-don-cong-no.md), [F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md) (lịch trả góp).
- Sau đó: [F-PAY-06](F-PAY-06_chot-ca.md) báo cáo thu, [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md) hoàn tiền.

## 8. Kiểm thử

- Test hiện có: Chưa có (`OZE.UnitTest` không có test cho `PaymentService`).
- Ca cần test: tiền mặt đủ → `PAID`; một phần → `PARTIALLY_PAID`; tiền mặt vượt nợ → 400; CK → `PENDING_CONFIRMATION`, xác nhận → `PAID`; CK xác nhận vượt nợ → 400; void khoản tiền mặt → hóa đơn về `UNPAID`; void khoản `PENDING` → 400; thu trên hóa đơn `CANCELLED`/`PARTIALLY_REFUNDED` → 400; trùng mã giao dịch → 409; `Installment` thiếu kỳ / kỳ đã `Paid` → 400; tiền mặt `Installment` → kỳ `Paid`; void khoản góp → kỳ về `Pending`/`Overdue`.

## 9. Còn thiếu / câu hỏi mở

Phát hiện review 11/11/2026, kiểm lại với code:
- **Void không cần lý do, không cần duyệt**, áp cho cả tiền mặt, không giới hạn thời gian; void được cả khi hóa đơn đã `PARTIALLY_REFUNDED`/`REFUNDED` (chỉ chặn `CANCELLED`) — `PaymentService.cs:151-186`, `:162-168`.
- **Không có thao tác từ chối khoản `PENDING`** (khách không chuyển / chuyển sai): void chỉ nhận `CONFIRMED`; cách duy nhất là hủy cả hóa đơn ([F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md)), khi đó khoản `PENDING` thành `FAILED`.
- **Khoản `PENDING` không bị kiểm số còn nợ** khi ghi (`PaymentService.cs:63-66`), nên ghi được khoản CK vượt nợ hoặc nhiều khoản CK cộng lại vượt nợ; đến lúc xác nhận thì bị 400 `AmountExceedsRemaining` (`:128`) và khoản kẹt ở `PENDING`.
- **`PARTIALLY_REFUNDED` chặn mọi khoản thu tiếp** (`PaymentService.cs:188-195`): hóa đơn hoàn một phần mà còn nợ thì không thu phần còn lại được.
- Sau khi duyệt hoàn tiền, khoản `PENDING` còn lại không xác nhận được (hóa đơn đã `PARTIALLY_REFUNDED`/`REFUNDED`) và cũng không void được → kẹt.
- Hóa đơn giảm giá 100% (`FinalAmount = 0`) luôn ở `UNPAID` (`InvoiceMoneyHelper.cs:58-63` xét `netPaid ≤ 0` trước `≥ FinalAmount`).
- Tiền làm tròn 2 số lẻ (`PaymentService.cs:42`), nhận được 100.50 đ, trái BR-C04.
- CK/QR không bắt buộc `transactionReference`; trùng mã chỉ báo 409 chung, `TransactionReferenceDuplicate` khai báo mà không dùng.
- `Payment` không có `CreatedByUserId`: khoản `PENDING` chỉ biết ai ghi qua `AuditLog`.
- Ma trận quyền ghi quản lý được thu tiền; code chỉ cho `Receptionist`.
- Lỗi riêng của khoản trả góp (thu bao nhiêu cũng đánh dấu kỳ `Paid`, void rồi thu lại cùng kỳ bị 409, ngày dùng UTC): xem [F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md) mục 9.
- Thiết kế đề xuất trước đây (`POST api/invoices/{id}/payments/{paymentId}/confirm|reject`) không được làm theo; code dùng `api/payments/{id}/confirm|void`, không có `reject`.

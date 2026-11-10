# F-PAY-03 Thu tiền

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8. Mã quy tắc `BR-...` lấy từ đó.
> **Chưa làm.** Mọi nội dung API/luồng dưới đây là **ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | ĐỀ XUẤT: `Receptionist`, `ClinicManager` |
| API | ĐỀ XUẤT: `POST api/invoices/{id}/payments`, `POST api/invoices/{id}/payments/{paymentId}/confirm`, `POST api/invoices/{id}/payments/{paymentId}/reject` |
| Code chính | ĐỀ XUẤT: `InvoicesController.AddPaymentAsync` / `ConfirmPaymentAsync` / `RejectPaymentAsync` → `InvoiceService` → `InvoiceRepository` |

## 1. Chức năng này làm gì

Lễ tân ghi nhận một khoản bệnh nhân trả cho hóa đơn. Tiền mặt được xác nhận ngay; chuyển khoản/QR chờ lễ tân đối chiếu rồi xác nhận. Hóa đơn cập nhật số đã trả và trạng thái thanh toán.

## 2. Tiền điều kiện

- Đã có trong code: entity `Payment` (`Amount`, `PaymentMethod`, `TransactionReference`, `PaymentStatus`, `PaidAt`, `ConfirmedByUserId`, `Notes`); check constraint `Amount > 0`, `PaymentMethod ∈ {CASH, BANK_TRANSFER, QR_TRANSFER}`, `PaymentStatus ∈ {PENDING, CONFIRMED, FAILED, REFUNDED}`; unique index `TransactionReference` (khi không null) (`PaymentConfiguration.cs:11-41`); `Invoice.RowVersion` (`InvoiceConfiguration.cs:26`).
- ĐỀ XUẤT: hóa đơn tồn tại, không `CANCELLED`/`PAID`/`REFUNDED`.

## 3. API

ĐỀ XUẤT **Request** `POST api/invoices/{id}/payments`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `amount` | decimal | Có | > 0, ≤ số còn nợ | Số tiền |
| `paymentMethod` | string | Có | `CASH`, `BANK_TRANSFER`, `QR_TRANSFER` | Phương thức |
| `transactionReference` | string? | Bắt buộc với `BANK_TRANSFER`/`QR_TRANSFER` | `MaxLength(100)`, không trùng | Mã giao dịch ngân hàng |
| `notes` | string? | Không | `MaxLength(500)` | Ghi chú |

```json
{ "amount": 500000, "paymentMethod": "CASH" }
```

ĐỀ XUẤT **Response**: `InvoiceResponse` sau cập nhật kèm khoản vừa tạo.

ĐỀ XUẤT **Lỗi** (cần thêm vào `ErrorConstants.InvoiceMessage`): 404 `InvoiceNotFound` (đã có); 400 hóa đơn đã hủy / đã trả đủ; 400 số tiền ≤ 0; 400 **số tiền vượt số còn nợ**; 400 thiếu mã giao dịch; 409 trùng `TransactionReference` (unique index → "This record already exists"); 409 hai người thu cùng lúc (`RowVersion`).

## 4. Luồng xử lý trong code

Chưa có code. ĐỀ XUẤT:
1. Đọc hóa đơn **có tracking** kèm `Payments`.
2. `remaining = FinalAmount − PaidAmount − Σ(Payment PENDING.Amount)`; chặn `amount > remaining` (không thu vượt nợ, tính cả khoản đang chờ để tránh hai khoản chuyển khoản cùng vượt).
3. `CASH` → `Payment.PaymentStatus = CONFIRMED`, `PaidAt = now`, `ConfirmedByUserId = userId`; cộng `Invoice.PaidAmount += amount`.
4. `BANK_TRANSFER`/`QR_TRANSFER` → `Payment.PaymentStatus = PENDING`; hóa đơn chuyển `PENDING_CONFIRMATION` nếu chưa có khoản xác nhận nào.
5. Tính lại `Invoice.PaymentStatus`: `PaidAmount = 0` → `UNPAID` (hoặc `PENDING_CONFIRMATION` nếu có khoản chờ); `0 < PaidAmount < FinalAmount` → `PARTIALLY_PAID`; `PaidAmount = FinalAmount` → `PAID`.
6. `Invoice.UpdatedAt = now`; lưu `Payment` và `Invoice` **trong cùng một `SaveChanges`** — `RowVersion` của hóa đơn bảo vệ thu đồng thời (409).
7. Ghi `AuditLog` (BR-C11).
8. `confirm`: khoản `PENDING` → `CONFIRMED`, `PaidAt`, `ConfirmedByUserId`, cộng `PaidAmount`, tính lại trạng thái (bước 5–7). `reject`: → `FAILED`, không đổi `PaidAmount`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-04 | Tiền mặt `CONFIRMED` ngay; chuyển khoản/QR `PENDING` đến khi lễ tân xác nhận | Chưa có |
| BR-PAY-05 | Không thu vượt nợ; `PaidAmount`, `PaymentStatus` cập nhật cùng giao dịch | Chưa có (chỉ có `RowVersion` và check `Amount > 0` ở DB) |
| BR-C10 | Hai người thu cùng hóa đơn → 409 | `Invoice.RowVersion` sẵn có |
| BR-C11 | Thu tiền ghi `AuditLog` | Chưa có |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Payments` | — | `CONFIRMED` (tiền mặt) / `PENDING` (CK, QR) | ĐỀ XUẤT |
| `Invoices` | `UNPAID` / `PARTIALLY_PAID` / `PENDING_CONFIRMATION` | `PARTIALLY_PAID` / `PAID` / `PENDING_CONFIRMATION` | `PaidAmount`, `UpdatedAt` |

## 7. Liên quan

- Trước đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md), [F-PAY-02](F-PAY-02_xem-hoa-don-cong-no.md).
- Sau đó: [F-PAY-06](F-PAY-06_chot-ca.md) chốt ca, [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md) hoàn tiền.

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa có code).
- Ca cần test khi làm: tiền mặt đủ → `PAID`; tiền mặt một phần → `PARTIALLY_PAID`; vượt nợ → 400; CK → `PENDING_CONFIRMATION`, xác nhận → `PAID`; hai khoản CK chờ cùng vượt nợ → khoản sau 400; trùng mã giao dịch → 409; thu đồng thời → 409.

## 9. Còn thiếu / câu hỏi mở

- Thứ tự ưu tiên trạng thái khi vừa có khoản đã xác nhận vừa có khoản chờ (`PARTIALLY_PAID` hay `PENDING_CONFIRMATION`): chưa xác định từ code / tài liệu.
- Ai được xác nhận chuyển khoản (lễ tân hay quản lý): tài liệu ghi "lễ tân xác nhận".
- Có cần thu theo giai đoạn (gắn `Payment` với giai đoạn) không: Q2, Q3 chưa chốt.

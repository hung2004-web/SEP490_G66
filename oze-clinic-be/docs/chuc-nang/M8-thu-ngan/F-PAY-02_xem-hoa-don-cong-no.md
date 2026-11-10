# F-PAY-02 Xem hóa đơn, hóa đơn theo bệnh nhân, danh sách công nợ

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8. Mã quy tắc `BR-...` lấy từ đó.
> **Chưa làm.** Mọi nội dung API/luồng dưới đây là **ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | ĐỀ XUẤT: `Receptionist`, `ClinicManager` |
| API | ĐỀ XUẤT: `GET api/invoices/{id}`, `GET api/patients/{patientId}/invoices`, `GET api/invoices/outstanding` |
| Code chính | ĐỀ XUẤT: `InvoicesController` → `InvoiceService.GetDetailAsync` / `GetByPatientAsync` / `GetOutstandingAsync` → `InvoiceRepository` |

## 1. Chức năng này làm gì

Lễ tân xem chi tiết một hóa đơn (dòng, các lần thu), lịch sử hóa đơn của một bệnh nhân, và danh sách hóa đơn còn nợ để gọi nhắc (BR-PAY-08) hoặc thu tiếp.

## 2. Tiền điều kiện

- Đã có trong code: entity `Invoice` (`Items`, `Payments`, `RefundAdjustmentRequests`), DTO `InvoiceResponse`/`InvoiceItemResponse`, `InvoiceMessage.InvoiceNotFound` = "Invoice not found." (khai báo nhưng chưa dùng), index lọc `IX_Invoices_PaymentStatus` cho `UNPAID`/`PENDING_CONFIRMATION`/`PARTIALLY_PAID` và `IX_Invoices_PatientId (PatientId, CreatedAt DESC)` (`InvoiceConfiguration.cs:51-56`) — phù hợp cho hai truy vấn danh sách.
- ĐỀ XUẤT: role `Receptionist` hoặc `ClinicManager`.

## 3. API

ĐỀ XUẤT:

| API | Trả về | Ghi chú |
|---|---|---|
| `GET api/invoices/{id}` | `InvoiceResponse` + `payments[]` (`id`, `amount`, `paymentMethod`, `paymentStatus`, `transactionReference`, `paidAt`, `confirmedByUserId`) + `remainingAmount = finalAmount − paidAmount` | 404 `InvoiceNotFound` |
| `GET api/patients/{patientId}/invoices?status=` | Danh sách tóm tắt, mới nhất trước | 404 bệnh nhân |
| `GET api/invoices/outstanding?fromDate=&toDate=&page=&pageSize=` | Hóa đơn `UNPAID`, `PENDING_CONFIRMATION`, `PARTIALLY_PAID` kèm tên, SĐT bệnh nhân, số còn nợ | Dùng cho công nợ / nhắc trả góp |

## 4. Luồng xử lý trong code

Chưa có code. ĐỀ XUẤT:
1. Repository thêm `GetByIdWithDetailsAsync` (Include `Items`, `Payments`, `Patient`), `GetByPatientAsync`, `GetOutstandingAsync` (lọc theo 3 trạng thái còn nợ, dùng index có sẵn).
2. `remainingAmount` tính ở server, chỉ cộng `Payment` `CONFIRMED` vào `PaidAmount` (xem [F-PAY-03](F-PAY-03_thu-tien.md)).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-05 | `PaidAmount` phản ánh số đã thu xác nhận | Chưa có |
| BR-PAY-08 | Danh sách công nợ dùng để nhắc qua điện thoại, không khóa điều trị | Chưa có |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| — | — | — | Chỉ đọc |

## 7. Liên quan

- Trước đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md).
- Sau đó: [F-PAY-03](F-PAY-03_thu-tien.md), [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md), [F-PAY-06](F-PAY-06_chot-ca.md).

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa có code).

## 9. Còn thiếu / câu hỏi mở

- Hiện **không có API đọc hóa đơn nào**; `POST api/invoices` là API duy nhất của `InvoicesController`.
- Bệnh nhân có được xem hóa đơn của mình trên app không: chưa xác định.

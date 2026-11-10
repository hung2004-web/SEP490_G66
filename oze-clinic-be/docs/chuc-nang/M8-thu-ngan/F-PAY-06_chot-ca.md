# F-PAY-06 Chốt ca, báo cáo cuối ngày

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, câu hỏi Q6, Q15. Mã quy tắc `BR-...` lấy từ đó.
> **Chưa làm.** Mọi nội dung API/luồng dưới đây là **ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | ĐỀ XUẤT: `Receptionist` (chốt ca của mình), `ClinicManager` (xem mọi ca, báo cáo ngày) |
| API | ĐỀ XUẤT: `GET api/cashier/shift-summary?date=&workShiftId=`, `POST api/cashier/shift-closings`, `GET api/reports/daily?date=` |
| Code chính | ĐỀ XUẤT: `CashierController` → `CashierService` → `InvoiceRepository` / repository chốt ca mới |

## 1. Chức năng này làm gì

Cuối ca, lễ tân xem tổng tiền đã thu theo từng phương thức, số hóa đơn, số tiền hoàn trong ca, đối chiếu với tiền mặt thực tế và chốt. Quản lý xem báo cáo cuối ngày.

## 2. Tiền điều kiện

- Đã có trong code: `Payment.PaidAt`, `PaymentMethod`, `PaymentStatus`, `ConfirmedByUserId`; `RefundAdjustmentRequest.ProcessedAt`; module ca làm việc (`WorkShiftMessage` trong `ErrorConstants`, có bảng ca làm việc — chi tiết liên kết ca với thu ngân chưa xác định từ code).
- ĐỀ XUẤT: chưa có bản chốt cho cùng ca/người/ngày.

## 3. API

ĐỀ XUẤT **`GET api/cashier/shift-summary`** trả: `from`, `to` (theo giờ VN, `ClinicClock`), `totalByMethod` (`CASH`, `BANK_TRANSFER`, `QR_TRANSFER` — chỉ `Payment` `CONFIRMED` có `PaidAt` trong khoảng), `invoiceCount`, `refundTotal`, `pendingTransferCount`.

ĐỀ XUẤT **`POST api/cashier/shift-closings`** body `{ "workShiftId", "date", "countedCash", "notes" }` → lưu bản chốt với số hệ thống, số đếm thực tế, chênh lệch; sau khi chốt không sửa.

ĐỀ XUẤT **`GET api/reports/daily?date=`** (`ClinicManager`): số lượt khám, `NO_SHOW`, doanh thu theo phương thức, công nợ (Q15).

## 4. Luồng xử lý trong code

Chưa có code. ĐỀ XUẤT:
1. Tính khoảng thời gian ca theo `ClinicClock` (BR-C01), đổi sang `DateTimeOffset` để lọc `Payment.PaidAt`.
2. Lọc `Payment` `CONFIRMED` theo `ConfirmedByUserId` (chốt theo người) hoặc theo ca.
3. Cộng `RefundAdjustmentRequest` `Processed` trong khoảng.
4. Lưu bản chốt vào bảng mới (cần migration), ghi `AuditLog`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| Q6 | Mặc định tạm: chốt theo ca — tổng thu theo phương thức, số hóa đơn, hoàn tiền | Chưa có |
| Q15 | Báo cáo ngày: lượt khám, `NO_SHOW`, doanh thu theo phương thức, công nợ | Chưa có |
| BR-C01 | Ngày/ca theo giờ Việt Nam | Chưa có |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| (bảng chốt ca mới) | — | 1 dòng / ca / người | ĐỀ XUẤT, chưa có entity |

## 7. Liên quan

- Trước đó: [F-PAY-03](F-PAY-03_thu-tien.md), [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md).
- Sau đó: báo cáo quản lý.

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa có code).

## 9. Còn thiếu / câu hỏi mở

- Q6, Q15 chưa chốt; chưa có entity lưu bản chốt ca.
- Khoản chuyển khoản tạo trong ca nhưng xác nhận ở ca sau tính vào ca nào: chưa xác định.
- `Payment` không có `CreatedByUserId` (chỉ `ConfirmedByUserId`), nên khoản `PENDING` chưa biết ai tạo.

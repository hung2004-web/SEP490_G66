# F-PAY-04 Ứng trước và trả góp

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, câu hỏi Q1, Q2. Mã quy tắc `BR-...` lấy từ đó.
> **Chưa làm (chờ quy tắc).** Mọi nội dung API/luồng dưới đây là **ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | ĐỀ XUẤT: `Receptionist`, `ClinicManager` |
| API | ĐỀ XUẤT: `POST api/TreatmentPlans/{id}/deposit`, `GET api/TreatmentPlans/{id}/balance` |
| Code chính | ĐỀ XUẤT: `InvoicesController` hoặc `TreatmentPlansController` → `InvoiceService.CreateDepositAsync` / `GetPlanBalanceAsync` |

## 1. Chức năng này làm gì

Với kế hoạch điều trị dài, bệnh nhân ứng trước một phần (1/3–1/2 giá kế hoạch) sau khi đồng ý, phần còn lại trả dần theo giai đoạn đã làm. Lễ tân xem được tổng đã ứng, đã dùng, còn lại của từng kế hoạch.

## 2. Tiền điều kiện

- Đã có trong code: `Invoice.TreatmentPlanId` (hóa đơn gắn kế hoạch), `InvoiceItem.TreatmentPlanStageId`, `Payment`, `TreatmentPlan.EstimatedTotalCost`.
- ĐỀ XUẤT: kế hoạch `Approved` hoặc `InProgress` (BR-PAY-01).

## 3. API

ĐỀ XUẤT **Request** `POST api/TreatmentPlans/{id}/deposit`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `amount` | decimal | Có | ≥ 1/3 `EstimatedTotalCost` (mặc định tạm Q1), ≤ `EstimatedTotalCost` | Số tiền ứng |
| `paymentMethod` | string | Có | `CASH`, `BANK_TRANSFER`, `QR_TRANSFER` | |
| `transactionReference` | string? | Với CK/QR | | |

ĐỀ XUẤT: tạo một hóa đơn "ứng trước" gắn `TreatmentPlanId` (không có dòng giai đoạn), thu tiền qua luồng [F-PAY-03](F-PAY-03_thu-tien.md). Hóa đơn giai đoạn sau đó trừ dần vào số đã ứng.

ĐỀ XUẤT **Response** `GET api/TreatmentPlans/{id}/balance`: `estimatedTotalCost`, `depositPaid`, `billedCompleted` (Σ dòng hóa đơn của giai đoạn đã làm), `remainingDeposit`, `outstanding`.

## 4. Luồng xử lý trong code

Chưa có code. ĐỀ XUẤT:
1. Kiểm kế hoạch `Approved`/`InProgress`, số tiền trong khoảng cho phép.
2. Tạo hóa đơn ứng trước + `Payment` trong một giao dịch.
3. Khi lập hóa đơn giai đoạn ([F-PAY-01](F-PAY-01_lap-hoa-don.md)), cấn trừ số dư ứng trước. Cách lưu cấn trừ (dòng âm, `Adjustment`, hay bảng riêng) chưa xác định — `RefundAdjustmentRequest.RequestType` đã có giá trị `Adjustment` (`RefundAdjustmentRequestConfiguration.cs:13`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-06 | Ứng trước 1/3 đến 1/2 giá kế hoạch (chờ chốt) | Chưa có |
| BR-PAY-08 | Trễ hạn trả góp chỉ nhắc qua điện thoại, không phạt, không khóa điều trị | Chưa có (lưu ý: [F-TP-09](../M7-ke-hoach-dieu-tri/F-TP-09_giai-doan-dieu-tri.md) hiện không kiểm công nợ — đúng với quy tắc) |
| Q1 | Mặc định tạm: lễ tân nhập số tiền, tối thiểu 1/3 | Chưa có |
| Q2 | Mặc định tạm: không chia đợt cố định, trả theo giai đoạn đã làm, không phí | Chưa có |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Invoices` | — | Hóa đơn ứng trước | ĐỀ XUẤT |
| `Payments` | — | Khoản ứng | ĐỀ XUẤT |

## 7. Liên quan

- Trước đó: [F-TP-07](../M7-ke-hoach-dieu-tri/F-TP-07_duyet-ke-hoach.md) duyệt kế hoạch.
- Sau đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md) hóa đơn giai đoạn, [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md) hoàn phần ứng thừa khi hủy kế hoạch.

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa có code).

## 9. Còn thiếu / câu hỏi mở

- Q1, Q2 chưa chốt; mô hình lưu số dư ứng trước chưa xác định.
- Hóa đơn ứng trước gắn `TreatmentPlanId` sẽ làm `IsInvoicedAsync` trả `true` (`TreatmentPlanRepository.cs:98-103`), nhưng kế hoạch lúc đó đã `Approved` nên không ảnh hưởng sửa/xóa.

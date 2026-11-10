# F-PAY-01 Lập hóa đơn

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | 🟡 Một phần (có API, thiếu kiểm tra BR-PAY-01..03) |
| Vai trò được dùng | `Receptionist`, `ClinicManager` |
| API | `POST api/invoices` |
| Code chính | `InvoicesController.CreateAsync` → `InvoiceService.CreateAsync` → `InvoiceRepository`, `PatientRepository`, `AppointmentRepository`, `TreatmentPlanRepository.GetByIdWithStagesAsync`, `ServiceRepository.GetByIdAsync` |

## 1. Chức năng này làm gì

Lễ tân (hoặc quản lý) lập một hóa đơn `UNPAID` cho bệnh nhân gồm các dòng dịch vụ, có thể gắn với một lịch hẹn và/hoặc một kế hoạch điều trị (từng dòng có thể trỏ tới một giai đoạn). Server tính thành tiền từng dòng, tổng, giảm giá và số phải trả, sinh số hóa đơn `INV-yyMMdd-xxxxxx`.

## 2. Tiền điều kiện

- Đăng nhập với role `Receptionist` hoặc `ClinicManager`.
- Bệnh nhân tồn tại và chưa bị xóa mềm (`DeletedAt == null`).
- Nếu có `appointmentId`: lịch hẹn tồn tại, thuộc bệnh nhân, chưa có hóa đơn nào khác trạng thái `CANCELLED`.
- Nếu có `treatmentPlanId`: kế hoạch tồn tại, thuộc bệnh nhân. **Không kiểm trạng thái kế hoạch** (xem mục 9).

## 3. API

**Request** `POST api/invoices`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`

Body `CreateInvoiceRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `patientId` | int | Có | `[Required]`, > 0 | Bệnh nhân |
| `appointmentId` | long? | Không | Thuộc bệnh nhân; chưa có hóa đơn không hủy | Lịch hẹn / buổi khám |
| `treatmentPlanId` | long? | Không | Thuộc bệnh nhân; bắt buộc nếu có dòng gắn giai đoạn | Kế hoạch điều trị |
| `discountAmount` | decimal | Không (mặc định 0) | `[Range(0, max)]`, ≤ tổng tiền | Giảm giá cả hóa đơn |
| `notes` | string? | Không | `MaxLength(1000)` | Ghi chú |
| `items` | `CreateInvoiceItemRequest[]` | Có | `[Required]`, `MinLength(1)` | Các dòng |
| `items[].serviceId` | int? | Không | Dịch vụ tồn tại (không kiểm `IsActive`) | Có: tên/giá mặc định lấy từ dịch vụ |
| `items[].serviceName` | string? | Bắt buộc khi không có `serviceId` | `MaxLength(200)` | Tên dòng |
| `items[].description` | string? | Không | `MaxLength(500)` | Mô tả |
| `items[].unitPrice` | decimal? | Bắt buộc khi không có `serviceId` | ≥ 0; có `serviceId` mà bỏ trống → `Service.ReferencePrice` | Đơn giá |
| `items[].quantity` | int | Không (mặc định 1) | `[Range(1, max)]` | Số lượng |
| `items[].treatmentPlanStageId` | long? | Không | Phải là giai đoạn của `treatmentPlanId` | Giai đoạn được tính tiền |
| `items[].sortOrder` | int? | Không | mặc định = vị trí trong mảng | Thứ tự hiển thị |

Ví dụ:

```json
{
  "patientId": 4,
  "appointmentId": 120,
  "treatmentPlanId": 7,
  "discountAmount": 50000,
  "items": [
    { "serviceId": 12, "treatmentPlanStageId": 14, "unitPrice": 550000 },
    { "serviceName": "Thuốc giảm đau", "unitPrice": 30000, "quantity": 2 }
  ]
}
```

**Response thành công** (`ApiResponse<InvoiceResponse>`, HTTP 200, message `ErrorConstants.InvoiceMessage.InvoiceCreated` = "Invoice has been created.")

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | long | Id hóa đơn |
| `invoiceNumber` | string | `INV-yyMMdd-######` (ngày UTC) |
| `patientId`, `appointmentId`, `treatmentPlanId` | | Liên kết |
| `totalAmount` | decimal | Σ `amount` các dòng |
| `discountAmount` | decimal | Giảm giá |
| `finalAmount` | decimal | `totalAmount − discountAmount` |
| `paidAmount` | decimal | `0` |
| `paymentStatus` | string | `"UNPAID"` |
| `notes`, `createdAt`, `createdByUserId` | | |
| `items[]` | `InvoiceItemResponse` | `id`, `serviceId`, `serviceName`, `description`, `unitPrice`, `quantity`, `amount`, `treatmentPlanStageId`, `sortOrder`; sắp theo `sortOrder` |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants.InvoiceMessage`) |
|---|---|---|
| 400 | Body sai annotation | ProblemDetails mặc định |
| 400 | `patientId` ≤ 0 | `PatientRequired`: "Please select a patient." |
| 400 | Không có dòng | `ItemsRequired`: "Please add at least one invoice item." |
| 400 | `discountAmount` < 0 | `DiscountInvalid`: "Discount amount is invalid." |
| 404 | Bệnh nhân không có / đã xóa mềm | `PatientNotFound`: "Patient not found." |
| 404 | Không có lịch hẹn | `AppointmentNotFound`: "Appointment not found." |
| 400 | Lịch hẹn của bệnh nhân khác | `AppointmentPatientMismatch`: "The appointment does not belong to this patient." |
| 400 | Lịch hẹn đã có hóa đơn không hủy | `OpenInvoiceExistsForAppointment`: "An open invoice already exists for this appointment." |
| 404 | Không có kế hoạch | `TreatmentPlanNotFound`: "Treatment plan not found." |
| 400 | Kế hoạch của bệnh nhân khác | `TreatmentPlanPatientMismatch`: "The treatment plan does not belong to this patient." |
| 400 | `quantity` ≤ 0 | `QuantityInvalid`: "Quantity must be greater than 0." |
| 404 | `serviceId` không tồn tại | `ServiceNotFound`: "Service not found." |
| 400 | Không `serviceId` và không `serviceName` | `ServiceNameRequired`: "Please enter service name." |
| 400 | Không `serviceId` và không `unitPrice`, hoặc `unitPrice` < 0 | `UnitPriceInvalid`: "Unit price must be greater than or equal to 0." |
| 400 | Dòng có `treatmentPlanStageId` mà hóa đơn không có `treatmentPlanId` | `TreatmentPlanNotFound`: "Treatment plan not found." (HTTP 400, không phải 404) |
| 404 | Giai đoạn không thuộc kế hoạch | `StageNotFound`: "Treatment plan stage not found." |
| 400 | Giảm giá > tổng | `DiscountExceedsTotal`: "Discount amount cannot exceed the invoice total." |
| 400 | Sinh số hóa đơn trùng 10 lần | "Could not generate a unique invoice number. Please try again." (chuỗi cứng, không ở `ErrorConstants`) |
| 409 | Trùng `InvoiceNumber` khi hai request lưu cùng lúc (unique index) | "This record already exists" (`GlobalExceptionMiddleware.cs:61-66`) |

## 4. Luồng xử lý trong code

1. Controller lấy `CurrentUserId` (claim `NameIdentifier`/`sub`) — `InvoicesController.cs:24-32`, `BaseApiController.cs:17-18`.
2. Kiểm `PatientId > 0`, có dòng, `DiscountAmount ≥ 0` — `InvoiceService.cs:38-41`.
3. Bệnh nhân tồn tại và chưa xóa mềm — `InvoiceService.cs:43-44`, `PatientRepository.cs:55-58`.
4. Nếu có `AppointmentId`: lịch hẹn tồn tại (404), cùng bệnh nhân (400), chưa có hóa đơn với `PaymentStatus ∈ InvoiceConstants.OpenStatuses` (mọi trạng thái trừ `CANCELLED`) — `InvoiceService.cs:46-54`, `InvoiceRepository.cs:28-34`, `InvoiceConstants.cs:15-23`.
5. Nếu có `TreatmentPlanId`: đọc kế hoạch kèm giai đoạn (AsNoTracking), tồn tại (404), cùng bệnh nhân (400) — `InvoiceService.cs:56-62`.
6. Duyệt từng dòng — `InvoiceService.cs:66-118`:
   - `Quantity > 0` (`:69`).
   - Có `ServiceId`: đọc dịch vụ (404); `serviceName = ServiceName (trim) ?? Service.ServiceName`; `unitPrice = UnitPrice ?? Service.ReferencePrice` (`:74-82`).
   - Không `ServiceId`: bắt buộc `ServiceName` và `UnitPrice` (`:83-89`).
   - `unitPrice ≥ 0`, tên không rỗng (`:91-92`).
   - Có `TreatmentPlanStageId`: phải có kế hoạch (400), giai đoạn nằm trong `treatmentPlan.Stages` (404), `stage.TreatmentPlanId == treatmentPlan.Id` (`:94-102`). **Không kiểm trạng thái giai đoạn, không kiểm đã tính tiền chưa.**
   - **Thành tiền dòng** `amount = Round(unitPrice × quantity, 2, AwayFromZero)`; cộng dồn `totalAmount` (`:104-105`).
   - Tạo `InvoiceItem`, `SortOrder = request.SortOrder ?? i` (`:107-117`).
7. **Tổng tiền**: `totalAmount = Round(Σ amount, 2)`; `discountAmount = Round(DiscountAmount, 2)`, phải ≤ `totalAmount`; `finalAmount = Round(totalAmount − discountAmount, 2)` — `InvoiceService.cs:120-123`.
8. Sinh số hóa đơn: `INV-{DateTime.UtcNow:yyMMdd}-{random 000000..999999}`, thử tối đa 10 lần đến khi không trùng — `InvoiceService.cs:127`, `:148-160`.
9. Tạo `Invoice`: `PaidAmount = 0`, `PaymentStatus = "UNPAID"`, `CreatedAt = UtcNow`, `CreatedByUserId` (rỗng → null) — `InvoiceService.cs:125-140`.
10. `AddAsync` + `SaveChangesAsync` (hóa đơn và các dòng trong một lần lưu) — `InvoiceService.cs:142-143`.
11. Map `ToResponse` — `InvoiceService.cs:145`, `:162-195`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-01 | Chỉ lập hóa đơn cho kế hoạch `Approved`/`InProgress` | **Chưa kiểm** |
| BR-PAY-02 | Một giai đoạn không tính hai lần (bỏ qua hóa đơn hủy); không tính giai đoạn đã hủy | **Chưa kiểm** |
| BR-PAY-03 | Chỉ tính dịch vụ/giai đoạn đã hoặc đang làm | **Chưa kiểm** |
| BR-C04 | Tiền `decimal` | `InvoiceService.cs:65`, `:104` (làm tròn 2 số lẻ) |
| (code) | Mỗi lịch hẹn tối đa một hóa đơn không hủy | `InvoiceService.cs:51-53` |
| (code) | Giảm giá không vượt tổng | `InvoiceService.cs:122` |
| BR-TP-04, BR-TP-05 | Khi kế hoạch đã có hóa đơn thì không sửa/xóa kế hoạch được nữa | `TreatmentPlanRepository.cs:98-103` (phía M7) |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Invoices` | — | 1 dòng `UNPAID`, `PaidAmount = 0` | `RowVersion` sinh tự động |
| `InvoiceItems` | — | n dòng | `TreatmentPlanStageId` tùy chọn |
| `TreatmentPlans` | | | Không đổi, nhưng từ đây [F-TP-04](../M7-ke-hoach-dieu-tri/F-TP-04_sua-ke-hoach.md) / [F-TP-05](../M7-ke-hoach-dieu-tri/F-TP-05_xoa-ke-hoach-nhap.md) bị chặn |

## 7. Liên quan

- Trước đó: [F-TP-07](../M7-ke-hoach-dieu-tri/F-TP-07_duyet-ke-hoach.md), [F-TP-09](../M7-ke-hoach-dieu-tri/F-TP-09_giai-doan-dieu-tri.md); M5 hoàn tất khám.
- Sau đó: [F-PAY-03](F-PAY-03_thu-tien.md) thu tiền, [F-PAY-02](F-PAY-02_xem-hoa-don-cong-no.md) xem, [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md) hủy.

## 8. Kiểm thử

- Test hiện có: Chưa có (`OZE.UnitTest` không có test cho `InvoiceService`).
- Ca cần test: tính `amount`/`total`/`final` với nhiều dòng và giảm giá; giá mặc định từ dịch vụ; dòng tự do không có giá → 400; giảm giá > tổng → 400; lịch hẹn đã có hóa đơn `PAID` → 400; lịch hẹn có hóa đơn `CANCELLED` → được; dòng gắn giai đoạn mà không có `treatmentPlanId` → 400; giai đoạn của kế hoạch khác → 404. Sau khi bổ sung: kế hoạch `Draft` → 400; giai đoạn đã tính tiền → 400; giai đoạn `Scheduled`/`Cancelled` → 400.

## 9. Còn thiếu / câu hỏi mở

Thiếu so với tài liệu:
- **BR-PAY-01**: không kiểm `treatmentPlan.Status ∈ {Approved, InProgress}` — đang lập được hóa đơn cho kế hoạch `Draft`, `Cancelled`... (`InvoiceService.cs:56-62`).
- **BR-PAY-02**: không kiểm giai đoạn đã có `InvoiceItem` trong hóa đơn không hủy; không chặn giai đoạn `Cancelled`.
- **BR-PAY-03**: không kiểm giai đoạn `InProgress`/`Completed`; không kiểm lịch hẹn đã khám (`IN_SERVICE`/`COMPLETED`).
- Đơn giá dòng gắn giai đoạn không lấy từ `ActualCost ?? EstimatedCost` của giai đoạn mà từ `unitPrice` gửi lên hoặc giá dịch vụ; cũng không kiểm `serviceId` của dòng trùng `ServiceId` của giai đoạn.
- Kiểm `stage.TreatmentPlanId == treatmentPlan.Id` (`InvoiceService.cs:99-101`) luôn đúng vì giai đoạn được tìm trong chính `treatmentPlan.Stages`, nên message `StagePlanMismatch` không bao giờ xuất hiện.

Lệch khác:
- Lễ tân được giảm giá tùy ý; Q4 (mặc định tạm) chỉ quản lý được giảm giá, có lý do.
- Q3 (mặc định tạm "hóa đơn theo lượt khám") — code gắn theo `AppointmentId`, không có `ExaminationId`.
- Dịch vụ ngừng hoạt động vẫn đưa vào hóa đơn được (không kiểm `IsActive`).
- Làm tròn 2 số lẻ trong khi BR-C04 nói VNĐ không có số lẻ.
- Số hóa đơn dùng `DateTime.UtcNow` thay vì `ClinicClock.Now` (BR-C01): hóa đơn lập 0h–7h giờ VN mang ngày hôm trước.
- Tên `InvoiceConstants.OpenStatuses` gồm cả `PAID`, `REFUNDED` (thực chất là "không hủy").
- Không ghi `AuditLog`; thành công trả 200 thay vì 201.
- Kiểm tra lịch hẹn trùng hóa đơn là "đọc rồi ghi", không khóa: hai request đồng thời có thể tạo hai hóa đơn cho cùng lịch hẹn (không có unique index trên `AppointmentId`).
- Message `TreatmentPlanNotFound` dùng cho cả trường hợp "thiếu `treatmentPlanId`" (HTTP 400) — dễ hiểu nhầm.

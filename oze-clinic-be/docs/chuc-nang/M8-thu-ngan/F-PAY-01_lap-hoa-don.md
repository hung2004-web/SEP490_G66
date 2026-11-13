# F-PAY-01 Lập hóa đơn, sửa hóa đơn

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | 🟡 Một phần (có API, chưa kiểm BR-PAY-01..03) |
| Vai trò được dùng | `Receptionist` |
| API | `POST api/invoices`, `PUT api/invoices/{id}` |
| Code chính | `InvoicesController.CreateAsync` / `UpdateAsync` → `InvoiceService.CreateAsync` / `UpdateAsync` → `InvoiceRepository`, `PatientRepository`, `AppointmentRepository`, `TreatmentPlanRepository.GetByIdWithStagesAsync`, `ServiceRepository` |

## 1. Chức năng này làm gì

Lễ tân lập hóa đơn `UNPAID` cho bệnh nhân. Có hai kiểu:
- **Hóa đơn theo dòng**: các dòng dịch vụ (có thể gắn giai đoạn kế hoạch), gắn tùy chọn với một lịch hẹn và/hoặc một kế hoạch điều trị.
- **Hóa đơn gói** (code gọi "Open-P4"): gắn kế hoạch điều trị mà không gửi dòng nào; server tự tạo một dòng "Tổng gói điều trị" bằng `totalAmount` gửi lên hoặc `EstimatedTotalCost` của kế hoạch. Đây là chứng từ để thu ứng trước/trả góp ([F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md)).

Server tính thành tiền từng dòng, tổng, giảm giá, số phải trả và sinh số `INV-yyMMdd-xxxxxx`. Khi chưa có khoản thu `CONFIRMED`, lễ tân sửa được ghi chú, giảm giá, hoặc thay toàn bộ dòng.

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist` (quản lý không lập/sửa được) — `InvoicesController.cs:42-43`, `:82-83`.
- Lập: bệnh nhân tồn tại, chưa xóa mềm (`PatientRepository.cs:55-58`).
- Có `appointmentId`: lịch hẹn tồn tại, thuộc bệnh nhân, chưa có hóa đơn nào khác `CANCELLED`.
- Có `treatmentPlanId`: kế hoạch tồn tại, thuộc bệnh nhân, **chưa có hóa đơn nào khác `CANCELLED` gắn kế hoạch đó**. Không kiểm trạng thái kế hoạch (mục 9).
- Sửa: hóa đơn không `CANCELLED` và chưa có khoản thu `CONFIRMED`.

## 3. API

**Request** `POST api/invoices`, quyền `[Authorize(Roles = "Receptionist")]`

Body `CreateInvoiceRequest` (`CreateInvoiceRequest.cs:5-54`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `patientId` | int | Có | `[Required]`, > 0 | Bệnh nhân |
| `appointmentId` | long? | Không | Thuộc bệnh nhân; chưa có hóa đơn không hủy | Lịch hẹn |
| `treatmentPlanId` | long? | Không | Thuộc bệnh nhân; chưa có hóa đơn không hủy; bắt buộc nếu có dòng gắn giai đoạn hoặc không gửi dòng | Kế hoạch |
| `totalAmount` | decimal? | Không | `[Range(0.01, max)]`; chỉ dùng khi `items` rỗng | Tổng gói tự nhập; bỏ trống → `EstimatedTotalCost` |
| `discountAmount` | decimal | Không (0) | `[Range(0, max)]`, ≤ tổng | Giảm giá cả hóa đơn |
| `notes` | string? | Không | `MaxLength(1000)` | Ghi chú |
| `items` | `CreateInvoiceItemRequest[]?` | Bắt buộc khi không có `treatmentPlanId` | Rỗng/null + có kế hoạch → hóa đơn gói | Các dòng |
| `items[].serviceId` | int? | Không | Dịch vụ tồn tại (không kiểm `IsActive`) | Tên/giá mặc định lấy từ dịch vụ |
| `items[].serviceName` | string? | Khi không có `serviceId` | `MaxLength(200)` | Tên dòng |
| `items[].description` | string? | Không | `MaxLength(500)` | Mô tả |
| `items[].unitPrice` | decimal? | Khi không có `serviceId` | ≥ 0; có `serviceId` mà bỏ trống → `Service.ReferencePrice` | Đơn giá |
| `items[].quantity` | int | Không (1) | `[Range(1, max)]` | Số lượng |
| `items[].treatmentPlanStageId` | long? | Không | Phải là giai đoạn của `treatmentPlanId` | Giai đoạn được tính tiền |
| `items[].sortOrder` | int? | Không | Mặc định = vị trí trong mảng | Thứ tự hiển thị |

Ví dụ hóa đơn theo dòng và hóa đơn gói:

```json
{
  "patientId": 4,
  "appointmentId": 120,
  "discountAmount": 50000,
  "items": [
    { "serviceId": 12, "unitPrice": 550000 },
    { "serviceName": "Thuốc giảm đau", "unitPrice": 30000, "quantity": 2 }
  ]
}
```

```json
{ "patientId": 4, "treatmentPlanId": 7, "totalAmount": 18000000 }
```

**Request** `PUT api/invoices/{id:long}`, quyền `[Authorize(Roles = "Receptionist")]`. Body `UpdateInvoiceRequest` (`UpdateInvoiceRequest.cs:5-17`): `discountAmount` (decimal?, `[Range(0, max)]`), `notes` (string?, `MaxLength(1000)`; chuỗi rỗng → xóa ghi chú), `items` (khác null → **thay toàn bộ dòng**, cùng ràng buộc như trên, không được rỗng). Phải có ít nhất một trường.

**Response thành công** (`ApiResponse<InvoiceResponse>`, HTTP 200, message `InvoiceCreated` = "Invoice has been created." / `InvoiceUpdated` = "Invoice has been updated.")

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `invoiceNumber` | | `INV-{yyMMdd theo UTC}-{6 số ngẫu nhiên}` |
| `patientId`, `patientName`, `appointmentId`, `treatmentPlanId` | | Liên kết |
| `totalAmount` | decimal | Σ `amount` các dòng |
| `discountAmount`, `finalAmount` | decimal | `finalAmount = totalAmount − discountAmount` |
| `paidAmount`, `remainingAmount` | decimal | Lúc lập: `0` và `finalAmount` |
| `paymentStatus` | string | Lúc lập: `"UNPAID"` |
| `notes`, `createdAt`, `createdByUserId`, `cancelledAt` | | |
| `items[]` | `InvoiceItemResponse` | `id`, `serviceId`, `serviceName`, `description`, `unitPrice`, `quantity`, `amount`, `treatmentPlanStageId`, `sortOrder`; sắp theo `sortOrder` |
| `payments[]` | `InvoicePaymentSummaryResponse` | Các khoản thu (rỗng lúc lập) |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants.InvoiceMessage`) |
|---|---|---|
| 400 | Body sai annotation (`[Range]`, `MaxLength`) | ProblemDetails mặc định (controller không dùng `ApiResponseValidationFilter`) |
| 400 | `patientId` ≤ 0 | `PatientRequired`: "Please select a patient." |
| 404 | Bệnh nhân không có / đã xóa mềm | `PatientNotFound`: "Patient not found." |
| 404 / 400 | Không có lịch hẹn / lịch của bệnh nhân khác | `AppointmentNotFound` / `AppointmentPatientMismatch` |
| 400 | Lịch hẹn đã có hóa đơn không hủy | `OpenInvoiceExistsForAppointment`: "An open invoice already exists for this appointment." |
| 404 / 400 | Không có kế hoạch / kế hoạch của bệnh nhân khác | `TreatmentPlanNotFound` / `TreatmentPlanPatientMismatch` |
| 400 | Kế hoạch đã có hóa đơn không hủy (kể cả `PAID`, `REFUNDED`) | `OpenInvoiceExistsForTreatmentPlan`: "An open invoice already exists for this treatment plan." |
| 400 | Không dòng, không kế hoạch, không `totalAmount` | `ItemsRequired`: "Please add at least one invoice item." |
| 400 | Không dòng, có `totalAmount` nhưng không có kế hoạch | `PlanPackageRequiresTreatmentPlan` |
| 400 | Hóa đơn gói: `totalAmount` ≤ 0 / không gửi mà `EstimatedTotalCost` ≤ 0 | `PlanPackageTotalInvalid` / `PlanPackageTotalRequired` |
| 400 | `quantity` ≤ 0 | `QuantityInvalid` |
| 404 | `serviceId` không tồn tại | `ServiceNotFound` |
| 400 | Thiếu tên dòng / thiếu hoặc âm đơn giá | `ServiceNameRequired` / `UnitPriceInvalid` |
| 400 | Dòng gắn giai đoạn mà hóa đơn không có kế hoạch | `TreatmentPlanNotFound` (HTTP 400, không phải 404) |
| 404 | Giai đoạn không thuộc kế hoạch | `StageNotFound` |
| 400 | Giảm giá âm / vượt tổng | `DiscountInvalid` / `DiscountExceedsTotal` |
| 400 | Sinh số hóa đơn trùng 10 lần | "Could not generate a unique invoice number. Please try again." (chuỗi cứng) |
| 404 | (Sửa) Không có hóa đơn | `InvoiceNotFound` |
| 400 | (Sửa) Hóa đơn `CANCELLED` hoặc đã có khoản `CONFIRMED` | `InvoiceNotUpdatable`: "Invoice cannot be updated in its current state." |
| 400 | (Sửa) Body không có trường nào | `InvoiceUpdateEmpty` |
| 409 | (Sửa) Hóa đơn bị lưu cùng lúc (`RowVersion`) | `AppointmentMessage.RecordChangedMeanwhile` (`GlobalExceptionMiddleware.cs:55-60`) |
| 409 | Trùng `InvoiceNumber` khi lưu đồng thời | "This record already exists" (`GlobalExceptionMiddleware.cs:61-66`) |

## 4. Luồng xử lý trong code

**Lập** (`InvoiceService.CreateAsync`):
1. Controller truyền `CurrentUserId` — `InvoicesController.cs:42-50`.
2. `PatientId > 0`, `Items` null → rỗng, `DiscountAmount ≥ 0` — `InvoiceService.cs:42-44`.
3. Bệnh nhân tồn tại — `InvoiceService.cs:46-47`.
4. Có `AppointmentId`: tồn tại (404), cùng bệnh nhân (400), chưa có hóa đơn `PaymentStatus ∈ OpenStatuses` (mọi trạng thái trừ `CANCELLED`) — `InvoiceService.cs:49-57`, `InvoiceRepository.cs:165-171`, `InvoiceConstants.cs:17-25`.
5. Có `TreatmentPlanId`: đọc kế hoạch kèm giai đoạn (AsNoTracking), tồn tại, cùng bệnh nhân, chưa có hóa đơn không hủy gắn kế hoạch — `InvoiceService.cs:59-68`, `InvoiceRepository.cs:173-181`, `TreatmentPlanRepository.cs:19-28`.
6. Không có dòng: bắt buộc có kế hoạch, dựng một dòng gói `ServiceName = PlanName ?? "Gói điều trị"`, `Description = "Tổng gói điều trị"`, `UnitPrice = Amount = totalAmount ?? EstimatedTotalCost` (làm tròn 2 số, phải > 0) — `InvoiceService.cs:70-81`, `:272-305`.
7. Có dòng: `BuildItemsAsync` — `InvoiceService.cs:84`, `:307-372`:
   - `Quantity > 0` (`:319`).
   - Có `ServiceId`: đọc dịch vụ (404); tên = `ServiceName` gửi lên hoặc tên dịch vụ; giá = `UnitPrice ?? Service.ReferencePrice` (`:324-332`).
   - Không `ServiceId`: bắt buộc tên và giá (`:333-339`); giá ≥ 0, tên không rỗng (`:341-342`).
   - Có `TreatmentPlanStageId`: phải có kế hoạch (400), giai đoạn nằm trong `treatmentPlan.Stages` (404), `stage.TreatmentPlanId == treatmentPlan.Id` (`:344-352`). **Không kiểm trạng thái giai đoạn, không kiểm đã tính tiền chưa, không lấy giá giai đoạn.**
   - `amount = Round(unitPrice × quantity, 2)`, cộng dồn; `SortOrder = request.SortOrder ?? i` (`:354-367`); tổng làm tròn 2 số (`:370`).
8. `discount = Round(DiscountAmount, 2)` ≤ tổng; `finalAmount = Round(total − discount, 2)` — `InvoiceService.cs:87-89`.
9. Tạo `Invoice` `UNPAID`, `PaidAmount = 0`, `CreatedAt = UtcNow`, số hóa đơn `INV-{DateTime.UtcNow:yyMMdd}-{000000..999999}` thử tối đa 10 lần — `InvoiceService.cs:91-106`, `:402-414`.
10. `AddAsync` + `SaveChangesAsync` (hóa đơn và dòng một lần lưu) — `InvoiceService.cs:108-109`.
11. Ghi `AuditLog` `INVOICE_CREATED` (lỗi audit bị nuốt) — `InvoiceService.cs:111-115`, `:390-400`.
12. Map `ToResponse` — `InvoiceService.cs:117`, `:438-489`.

**Sửa** (`InvoiceService.UpdateAsync`):
1. Controller — `InvoicesController.cs:82-91`.
2. Đọc hóa đơn có tracking kèm dòng, khoản thu, hoàn tiền, trả góp — `InvoiceService.cs:158-159`, `InvoiceRepository.cs:30-50`.
3. Không `CANCELLED`, không có khoản `CONFIRMED` — `InvoiceService.cs:160-166`, `:387-388`.
4. Có ít nhất một trường — `InvoiceService.cs:168-170`.
5. `Notes` khác null → gán (rỗng → null) — `InvoiceService.cs:181-184`.
6. `Items` khác null → đọc lại kế hoạch của hóa đơn (nếu có), `BuildItemsAsync`, xóa hết dòng cũ thêm dòng mới, tính lại tổng; giảm giá = giá trị mới hoặc giữ cũ, kiểm 0 ≤ giảm giá ≤ tổng — `InvoiceService.cs:186-209`.
7. Chỉ `DiscountAmount` → kiểm và tính lại `FinalAmount` — `InvoiceService.cs:210-217`.
8. `UpdatedAt`, lưu (`RowVersion` kiểm đồng thời), audit `INVOICE_UPDATED` có ảnh trước/sau — `InvoiceService.cs:219-227`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-01 | Chỉ lập hóa đơn cho kế hoạch `Approved`/`InProgress` | **Chưa kiểm** |
| BR-PAY-02 | Một giai đoạn không tính hai lần; không tính giai đoạn đã hủy | **Chưa kiểm** (chỉ chặn cả kế hoạch có hóa đơn thứ hai, xem mục 9) |
| BR-PAY-03 | Chỉ tính dịch vụ/giai đoạn đã hoặc đang làm, không thu lúc mới đến | **Chưa kiểm**; hóa đơn gói còn cho thu cả kế hoạch trước |
| BR-C04 | Tiền `decimal` | `InvoiceService.cs:87`, `:354` (làm tròn 2 số lẻ) |
| BR-C10 | Sửa đồng thời → 409 | `Invoice.RowVersion` (`InvoiceConfiguration.cs:26`) |
| BR-C11 | Ghi `AuditLog` | `InvoiceService.cs:111-115`, `:223-227` (không có lý do) |
| (code) | Mỗi lịch hẹn, mỗi kế hoạch tối đa một hóa đơn không hủy | `InvoiceService.cs:54-56`, `:65-67` |
| (code) | Giảm giá không âm, không vượt tổng | `InvoiceService.cs:44`, `:88`, `:205-206`, `:213-214` |
| (code) | Đã có khoản `CONFIRMED` thì không sửa hóa đơn | `InvoiceService.cs:164-166` |
| BR-TP-04, BR-TP-05 | Kế hoạch đã có hóa đơn thì không sửa/xóa được | `TreatmentPlanRepository.cs:98-103` (phía M7, tính cả hóa đơn hủy) |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Invoices` (lập) | — | 1 dòng `UNPAID`, `PaidAmount = 0` | `RowVersion` sinh tự động |
| `InvoiceItems` (lập) | — | n dòng (hóa đơn gói: 1 dòng không `ServiceId`) | `TreatmentPlanStageId` tùy chọn |
| `Invoices` (sửa) | `UNPAID` / `PENDING_CONFIRMATION` | Trạng thái không đổi | `Notes`, `DiscountAmount`, `TotalAmount`, `FinalAmount`, `UpdatedAt` |
| `InvoiceItems` (sửa có `items`) | Dòng cũ | Xóa hết, thêm dòng mới | |
| `AuditLogs` | — | `INVOICE_CREATED` / `INVOICE_UPDATED` | |
| `TreatmentPlans` | | Không đổi | Từ đây [F-TP-04](../M7-ke-hoach-dieu-tri/F-TP-04_sua-ke-hoach.md) / [F-TP-05](../M7-ke-hoach-dieu-tri/F-TP-05_xoa-ke-hoach-nhap.md) bị chặn |

## 7. Liên quan

- Trước đó: [F-TP-07](../M7-ke-hoach-dieu-tri/F-TP-07_duyet-ke-hoach.md), [F-TP-09](../M7-ke-hoach-dieu-tri/F-TP-09_giai-doan-dieu-tri.md); M5 hoàn tất khám.
- Sau đó: [F-PAY-03](F-PAY-03_thu-tien.md) thu tiền, [F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md) ứng trước/trả góp trên hóa đơn gói, [F-PAY-02](F-PAY-02_xem-hoa-don-cong-no.md) xem, [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md) hủy.

## 8. Kiểm thử

- Test hiện có: Chưa có (`OZE.UnitTest` không có test cho `InvoiceService`).
- Ca cần test: tính `amount`/`total`/`final` nhiều dòng có giảm giá; giá mặc định từ dịch vụ; dòng tự do thiếu giá → 400; giảm giá > tổng → 400; lịch hẹn đã có hóa đơn `PAID` → 400, có hóa đơn `CANCELLED` → được; dòng gắn giai đoạn không có `treatmentPlanId` → 400; giai đoạn của kế hoạch khác → 404; hóa đơn gói không `totalAmount` lấy `EstimatedTotalCost`, `EstimatedTotalCost = 0` → 400; kế hoạch đã có hóa đơn → 400; sửa khi có khoản `CONFIRMED` → 400; sửa `items` thay hết dòng cũ; sửa đồng thời → 409. Sau khi bổ sung quy tắc: kế hoạch `Draft`/`Cancelled` → 400; giai đoạn đã tính tiền / đã hủy → 400.

## 9. Còn thiếu / câu hỏi mở

Thiếu so với BR (review 11/11/2026, kiểm lại với code):
- **BR-PAY-01**: không kiểm trạng thái kế hoạch — lập được hóa đơn cho kế hoạch `Draft`, `Proposed`, `Cancelled` (`InvoiceService.cs:59-68`).
- **BR-PAY-02**: không chặn giai đoạn `Cancelled` hoặc đã có trên hóa đơn chưa hủy (`InvoiceService.cs:344-352`).
- **BR-PAY-03**: không kiểm giai đoạn đã/đang làm; hóa đơn gói (`InvoiceService.cs:70-81`, `:272-305`) thu trước cả kế hoạch, ngược với "không thu tiền lúc mới đến".
- `HasOpenInvoiceForTreatmentPlanAsync` coi cả `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED` là "mở" (`InvoiceRepository.cs:173-181`, `InvoiceConstants.cs:17-25`), nên **mỗi kế hoạch chỉ có một hóa đơn**: từ buổi thứ hai không lập được hóa đơn gắn kế hoạch hay gắn giai đoạn. Q3 (mặc định tạm "theo lượt khám") chưa được code theo.
- Đơn giá dòng gắn giai đoạn lấy từ `unitPrice` client gửi hoặc giá dịch vụ, không từ `ActualCost ?? EstimatedCost` của giai đoạn (`InvoiceService.cs:324-339`); không kiểm `serviceId` của dòng trùng dịch vụ của giai đoạn.
- Kiểm `stage.TreatmentPlanId == treatmentPlan.Id` (`InvoiceService.cs:349-351`) luôn đúng vì giai đoạn tìm trong chính `treatmentPlan.Stages`; message `StagePlanMismatch` không bao giờ xuất hiện.

Lệch khác:
- Q4 (mặc định tạm: chỉ quản lý giảm giá, có lý do): code cho lễ tân tự giảm tới 100% tổng, không lý do, không duyệt (`InvoiceService.cs:44`, `:87-88`, `:202-216`).
- Ma trận quyền ghi quản lý được làm hóa đơn; code chỉ cho `Receptionist` lập/sửa (`InvoicesController.cs:43`, `:83`).
- Không có unique index chống hai hóa đơn cho một lịch hẹn hay một kế hoạch (`InvoiceConfiguration.cs:50-56` chỉ unique `InvoiceNumber`); kiểm tra là "đọc rồi ghi" nên hai lễ tân bấm cùng lúc tạo được hai hóa đơn.
- Sửa hóa đơn vẫn được khi đã có lịch trả góp hoặc có khoản `PENDING` (chỉ chặn khi có `CONFIRMED`, `InvoiceService.cs:164-166`): `FinalAmount` mới có thể nhỏ hơn tổng các kỳ trả góp.
- Làm tròn 2 số lẻ (`InvoiceService.cs:87`, `:354`) trong khi BR-C04 nói VNĐ không có số lẻ.
- Số hóa đơn dùng `DateTime.UtcNow` (`InvoiceService.cs:406`) thay vì `ClinicClock` (BR-C01): hóa đơn lập 0h–7h giờ VN mang ngày hôm trước.
- Dịch vụ ngừng hoạt động vẫn đưa vào hóa đơn được (không kiểm `IsActive`).
- Message `TreatmentPlanNotFound` dùng cả cho "thiếu `treatmentPlanId`" (HTTP 400); `InvoiceConcurrencyConflict` khai báo nhưng không dùng (409 trả message chung).
- Thành công trả 200 thay vì 201; lỗi annotation trả ProblemDetails, không bọc `ApiResponse` (BR-C07).

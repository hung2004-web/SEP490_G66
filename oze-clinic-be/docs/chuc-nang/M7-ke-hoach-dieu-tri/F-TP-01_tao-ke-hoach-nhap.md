# F-TP-01 Tạo kế hoạch điều trị nháp từ lượt khám

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `POST api/examinations/{examinationId}/treatment-plans` |
| Code chính | `TreatmentPlansController.CreateAsync` → `TreatmentPlanService.CreateAsync` → `TreatmentPlanRepository` (+ `ServiceRepository.GetByIdsAsync`) |

## 1. Chức năng này làm gì

Bác sĩ đang khám lập một kế hoạch điều trị nháp (`Draft`) cho bệnh nhân, gồm một hoặc nhiều giai đoạn, mỗi giai đoạn gắn một dịch vụ. Server tự đánh số giai đoạn theo thứ tự gửi lên và tự tính tổng chi phí dự kiến.

## 2. Tiền điều kiện

- Đã đăng nhập, có role `Doctor` và có hồ sơ nhân viên (`StaffProfile`) gắn với tài khoản.
- Lượt khám `examinationId` tồn tại, `ExaminationStatus = "InProgress"` và `DoctorId` là bác sĩ đang gọi.
- Lượt khám chưa có kế hoạch đang mở (`Draft`, `Proposed`, `Approved`, `InProgress`).
- Mọi dịch vụ trong các giai đoạn tồn tại và `IsActive = true`.

## 3. API

**Request** `POST api/examinations/{examinationId:long}/treatment-plans`, quyền `[Authorize(Roles = "Doctor")]`

Body `CreateTreatmentPlanRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `planName` | string | Có | `[Required]`, `MaxLength(200)`, được `Trim()` | Tên kế hoạch |
| `description` | string? | Không | `MaxLength(1000)`, rỗng/khoảng trắng → `null` | Mô tả |
| `stages` | `CreateTreatmentPlanStageRequest[]` | Có | `[Required]`, `MinLength(1)` | Danh sách giai đoạn, đánh số theo thứ tự gửi |
| `stages[].serviceId` | int? | Có | `[Required]`; dịch vụ phải tồn tại và đang hoạt động | Dịch vụ của giai đoạn |
| `stages[].stageName` | string? | Không | `MaxLength(200)`; bỏ trống → lấy `ServiceName` | Tên giai đoạn |
| `stages[].description` | string? | Không | `MaxLength(1000)` | Mô tả giai đoạn |
| `stages[].estimatedCost` | decimal? | Không | ≥ 0; bỏ trống → `Service.ReferencePrice` | Chi phí dự kiến |
| `stages[].scheduledDate` | DateOnly? (`yyyy-MM-dd`) | Không | ≥ hôm nay (giờ VN) và ≥ ngày của giai đoạn có ngày gần nhất phía trước | Ngày dự kiến |

Ví dụ:

```json
{
  "planName": "Điều trị sâu răng 26",
  "description": "Trám rồi lấy cao răng",
  "stages": [
    { "serviceId": 12, "stageName": "Trám răng 26", "scheduledDate": "2026-11-10" },
    { "serviceId": 5, "estimatedCost": 300000, "scheduledDate": "2026-11-17" }
  ]
}
```

**Response thành công** (`ApiResponse<TreatmentPlanProgressResponse>`, HTTP 200, message `"Create treatment plan success!"`)

Cấu trúc `TreatmentPlanProgressResponse` xem đầy đủ ở [F-TP-02](F-TP-02_xem-chi-tiet-ke-hoach.md). Với kế hoạch vừa tạo:

| Trường | Giá trị |
|---|---|
| `status` | `"Draft"` |
| `planVersion` | `1` (mặc định entity) |
| `totalStages` | số giai đoạn gửi lên |
| `estimatedTotalCost` | tổng `estimatedCost` các giai đoạn |
| `completedStages` / `cancelledStages` / `progressPercent` / `completedCost` | `0` |
| `nextStage` | giai đoạn số 1 (`Scheduled`) |
| `stages[].stageStatus` | `"Scheduled"` |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Body sai annotation (`planName` trống, `stages` rỗng, `serviceId` null...) | ProblemDetails mặc định của ASP.NET (`[ApiController]`), không bọc `ApiResponse` |
| 401 / 403 | Chưa đăng nhập / không phải `Doctor` | Do framework trả |
| 404 | Không có hồ sơ bác sĩ | `DoctorScheduleMessage.DoctorNotFound`: "Doctor profile not found" |
| 404 | Không có lượt khám | `MedicalRecordMessage.ExaminationNotFound`: "Examination not found" |
| 403 | Không phải bác sĩ của lượt khám | `ExaminationMessage.NotExaminingDoctor`: "You can only work on the examinations you are performing" |
| 400 | Lượt khám không `InProgress` | `ExaminationMessage.AlreadyLocked`: "This examination is already completed and locked, it can no longer be edited" |
| 400 | Lượt khám đã có kế hoạch mở | `TreatmentPlanMessage.OpenPlanExists`: "This examination already has an open treatment plan." |
| 400 | Danh sách giai đoạn rỗng (nếu lọt qua annotation) | `TreatmentPlanMessage.StagesRequired`: "Please add at least one treatment stage." |
| 404 | `serviceId` null hoặc không tồn tại | `AppointmentMessage.ServiceNotFound`: "Service not found" |
| 400 | Dịch vụ ngừng hoạt động | `AppointmentMessage.ServiceInactive`: "This service is not available for booking" |
| 400 | Chi phí dự kiến < 0 | `TreatmentPlanMessage.InvalidEstimatedCost`: "Estimated cost is invalid. Please check again." |
| 400 | Ngày dự kiến ở quá khứ hoặc sớm hơn giai đoạn trước | `TreatmentPlanMessage.ScheduledDateInvalid`: "Scheduled date is invalid. Please check again." |
| 409 | Hai request tạo cùng lúc, hoặc đua với "hoàn tất khám" (RowVersion của `Examinations`) | `AppointmentMessage.RecordChangedMeanwhile`: "This record was changed by someone else. Please reload and try again" (`GlobalExceptionMiddleware.cs:55-60`) |

## 4. Luồng xử lý trong code

1. Controller nhận route + body, lấy `userId` từ claim `NameIdentifier` hoặc `sub` — `TreatmentPlansController.cs:26-35`, `:194-197`.
2. Tìm hồ sơ bác sĩ theo `userId`, không có → 404 — `TreatmentPlanService.cs:47-48`.
3. Lấy lượt khám **có tracking** (để RowVersion được kiểm khi lưu) — `TreatmentPlanService.cs:51`, `TreatmentPlanRepository.cs:41-44`.
4. Kiểm tra lượt khám tồn tại (404), `examination.DoctorId == doctor.Id` (403), `ExaminationStatus == "InProgress"` (400) — `TreatmentPlanService.cs:52-54`.
5. Kiểm tra lượt khám chưa có kế hoạch có `Status` thuộc `TreatmentPlanConstants.OpenStatuses` — `TreatmentPlanService.cs:56-57`, `TreatmentPlanRepository.cs:46-50`, `TreatmentPlanConstants.cs:20`.
6. `ValidateStagesAsync` kiểm tra toàn bộ giai đoạn trước khi đổi gì — `TreatmentPlanService.cs:513-548`:
   - Danh sách không rỗng; mọi `ServiceId` có giá trị (`:517-518`).
   - Lấy dịch vụ một lần bằng `GetByIdsAsync` (`:520-521`, `ServiceRepository.cs:31-37`).
   - Mỗi giai đoạn: dịch vụ tồn tại (404), `IsActive` (400) (`:528-530`).
   - `cost = EstimatedCost ?? service.ReferencePrice`, phải ≥ 0 (`:533-534`).
   - Nếu có `ScheduledDate`: ≥ `ClinicClock.Now` (giờ VN) và ≥ ngày của giai đoạn có ngày gần nhất phía trước (`:536-542`). Giai đoạn không có ngày được bỏ qua khi so sánh.
7. Tạo `TreatmentPlan` với `Status = "Draft"`, `PatientId` lấy từ lượt khám, `CreatedByDoctorId = doctor.Id`, `PlanName` đã trim, `CreatedAt = DateTimeOffset.UtcNow` — `TreatmentPlanService.cs:61-71`.
8. Mỗi giai đoạn hợp lệ → `TreatmentPlanStage` `Scheduled`, `ApplyStage` gán `StageNumber = vị trí + 1`, `StageName = stageName ?? ServiceName`, `ServiceId`, `EstimatedCost`, `ScheduledDate` — `TreatmentPlanService.cs:73-82`, `:550-558`.
9. `SetTotals`: `TotalStages = Stages.Count`, `EstimatedTotalCost = Σ EstimatedCost` (server tự tính, không nhận từ client) — `TreatmentPlanService.cs:84`, `:561-565`.
10. **Chống ghi đè**: gán `examination.UpdatedAt = now` để EF cập nhật dòng `Examinations` và kiểm `RowVersion`. Hai kế hoạch tạo cùng lúc, hoặc tạo kế hoạch đua với "hoàn tất khám", thì request sau nhận `DbUpdateConcurrencyException` → 409 — `TreatmentPlanService.cs:86-88`, `ExaminationConfiguration.cs:18`.
11. `AddAsync` + `SaveChangesAsync` — `TreatmentPlanService.cs:90-91`.
12. Đọc lại kế hoạch kèm `Patient`, `CreatedByDoctor`, `Stages.Service` (AsNoTracking) để có tên dịch vụ, rồi map `ToProgressResponse` — `TreatmentPlanService.cs:94-95`, `TreatmentPlanRepository.cs:19-28`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-01 | Lượt khám `InProgress`, đúng bác sĩ đang khám, mỗi lượt khám một kế hoạch mở | `TreatmentPlanService.cs:53-57` |
| BR-TP-02 | ≥ 1 giai đoạn, dịch vụ đang hoạt động, chi phí trống lấy giá tham khảo, chi phí ≥ 0 | `TreatmentPlanService.cs:517-534` |
| BR-TP-03 | Ngày dự kiến không ở quá khứ, không sớm hơn giai đoạn trước | `TreatmentPlanService.cs:536-542` |
| BR-C01 | Ngày "hôm nay" lấy theo `ClinicClock.Now` | `TreatmentPlanService.cs:523` |
| BR-C10 | Chống ghi đè bằng `RowVersion` của lượt khám | `TreatmentPlanService.cs:88` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `TreatmentPlans` | (chưa có) | 1 dòng `Status = Draft`, `PlanVersion = 1` | `TotalStages`, `EstimatedTotalCost` do server tính |
| `TreatmentPlanStages` | (chưa có) | n dòng `StageStatus = Scheduled`, `StageNumber` 1..n | |
| `Examinations` | `UpdatedAt` cũ | `UpdatedAt = now`, `RowVersion` mới | Chỉ để kích hoạt kiểm tra đồng thời |

## 7. Liên quan

- Trước đó: M5 Khám bệnh — bác sĩ bắt đầu khám (lượt khám `InProgress`).
- Sau đó: [F-TP-04](F-TP-04_sua-ke-hoach.md) sửa, [F-TP-05](F-TP-05_xoa-ke-hoach-nhap.md) xóa nháp, [F-TP-06](F-TP-06_de-xuat-ke-hoach.md) đề xuất.

## 8. Kiểm thử

- Test hiện có: Chưa có (`OZE.UnitTest` không có test cho `TreatmentPlanService`).
- Ca cần test: tạo thành công (tổng tiền, số thứ tự, tên mặc định, giá mặc định); không phải bác sĩ của lượt khám → 403; lượt khám `Completed`/`Locked` → 400; đã có kế hoạch `Draft` → 400; đã có kế hoạch `Cancelled`/`Completed` → vẫn tạo được; dịch vụ ngừng hoạt động; chi phí âm; ngày quá khứ; ngày giai đoạn 2 < giai đoạn 1; giai đoạn giữa không có ngày; hai request đồng thời → một 409.

## 9. Còn thiếu / câu hỏi mở

- Lỗi dịch vụ dùng message của đặt lịch (`AppointmentMessage.ServiceInactive` = "...not available for booking"), chưa có message riêng cho kế hoạch.
- Lỗi validate annotation trả ProblemDetails, không theo `ApiResponse` (BR-C07). Chưa xác định từ code có cấu hình chung nào bọc lại.
- Thành công trả HTTP 200, không phải 201.
- Chưa ghi `AuditLog` (BR-C11 không liệt kê tạo kế hoạch, nên chỉ ghi nhận).
- Chưa có cột `IntervalDays`, `ToothNumbers` cho giai đoạn (bảng "Dữ liệu còn thiếu" của M7).

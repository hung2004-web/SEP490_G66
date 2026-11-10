# F-TP-02 Xem chi tiết kế hoạch điều trị

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor`, `Receptionist` |
| API | `GET api/TreatmentPlans/{id}` |
| Code chính | `TreatmentPlansController.GetDetailAsync` → `TreatmentPlanService.GetDetailAsync` → `TreatmentPlanRepository.GetByIdWithStagesAsync` |

## 1. Chức năng này làm gì

Trả một kế hoạch điều trị kèm toàn bộ giai đoạn, chi phí, tiến độ % và giai đoạn kế tiếp. Lễ tân xem được mọi kế hoạch; bác sĩ chỉ xem kế hoạch của bệnh nhân mình có liên quan.

`TreatmentPlanProgressResponse` ở file này là cấu trúc trả về chung của F-TP-01, 04, 06, 07, 08, 09.

## 2. Tiền điều kiện

- Đã đăng nhập với role `Doctor` hoặc `Receptionist`.
- Nếu là bác sĩ (không có role `Receptionist`): bác sĩ là người tạo kế hoạch, **hoặc** đã từng khám bệnh nhân, **hoặc** có lịch hẹn với bệnh nhân ở trạng thái `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED` (`MedicalRecordRepository .cs:69-82`, `MedicalRecordConstants.cs:12-16`).

## 3. API

**Request** `GET api/TreatmentPlans/{id:long}`, quyền `[Authorize(Roles = "Doctor,Receptionist")]`. Không có body. Route không phân biệt hoa thường.

**Response thành công** (`ApiResponse<TreatmentPlanProgressResponse>`, HTTP 200, không có message)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `treatmentPlanId` | long | Id kế hoạch |
| `planName` | string? | Tên |
| `status` | string | `Draft`, `Proposed`, `Approved`, `InProgress`, `Completed`, `Cancelled`, `Superseded` |
| `planVersion` | int | Phiên bản (hiện luôn 1, xem F-TP-10) |
| `description` | string? | Mô tả |
| `examinationId` | long | Lượt khám tạo ra kế hoạch |
| `patientId`, `patientName` | int, string? | Bệnh nhân |
| `createdByDoctorId`, `createdByDoctorName` | int, string? | Bác sĩ lập |
| `estimatedTotalCost` | decimal | Tổng chi phí dự kiến, lưu trong DB (= Σ `estimatedCost` mọi giai đoạn, kể cả giai đoạn đã hủy) |
| `completedCost` | decimal | Σ (`actualCost ?? estimatedCost`) của giai đoạn `Completed` |
| `createdAt`, `approvedAt` | DateTimeOffset / null | Thời điểm tạo, duyệt |
| `cancellationReason`, `cancelledAt` | string? / DateTimeOffset? | Thông tin hủy (không trả `CancelledByUserId`) |
| `totalStages` | int | Số giai đoạn đếm từ danh sách |
| `completedStages`, `cancelledStages` | int | Số giai đoạn `Completed`, `Cancelled` |
| `progressPercent` | decimal (0–100, 2 số lẻ) | `completedStages / (totalStages − cancelledStages) × 100`; mẫu = 0 thì 0 |
| `nextStage` | `TreatmentPlanStageResponse?` | Giai đoạn đầu tiên (theo `stageNumber`) đang `InProgress` hoặc `Scheduled`; `null` khi hết việc |
| `stages` | `TreatmentPlanStageResponse[]` | Sắp theo `stageNumber` |

`TreatmentPlanStageResponse`: `id`, `stageNumber`, `stageName`, `description`, `serviceId`, `serviceName`, `estimatedCost`, `actualCost`, `stageStatus` (`Scheduled`, `InProgress`, `Completed`, `Cancelled`), `scheduledDate`, `actualDate`, `performedByDoctorId`, `notes`, `completedAt`.

Ví dụ `data`:

```json
{
  "treatmentPlanId": 7, "planName": "Điều trị sâu răng 26", "status": "InProgress", "planVersion": 1,
  "examinationId": 31, "patientId": 4, "patientName": "Nguyễn Văn A",
  "createdByDoctorId": 2, "createdByDoctorName": "BS. Trần B",
  "estimatedTotalCost": 800000, "completedCost": 500000,
  "totalStages": 2, "completedStages": 1, "cancelledStages": 0, "progressPercent": 50.00,
  "nextStage": { "id": 15, "stageNumber": 2, "stageStatus": "Scheduled", "scheduledDate": "2026-11-17" },
  "stages": [ { "id": 14, "stageNumber": 1, "stageStatus": "Completed", "actualCost": 500000 }, { "id": 15, "stageNumber": 2, "stageStatus": "Scheduled" } ]
}
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | Không có kế hoạch | `TreatmentPlanMessage.PlanNotFound`: "Treatment plan not found." |
| 404 | Bác sĩ không có hồ sơ nhân viên | `DoctorScheduleMessage.DoctorNotFound`: "Doctor profile not found" |
| 403 | Bác sĩ không có quyền với bệnh nhân | `TreatmentPlanMessage.NoAccess`: "You do not have access to this patient's treatment plan" |

## 4. Luồng xử lý trong code

1. Controller xác định `canViewAll = User.IsInRole("Receptionist")` — `TreatmentPlansController.cs:41-49`, `:192`.
2. Đọc kế hoạch AsNoTracking kèm `Patient`, `CreatedByDoctor`, `Stages.Service` — `TreatmentPlanService.cs:282`, `TreatmentPlanRepository.cs:19-28`.
3. Không có → 404 — `TreatmentPlanService.cs:283`.
4. Nếu không phải lễ tân: `EnsureAccessAsync` — tìm hồ sơ bác sĩ (404), cho qua khi `plan.CreatedByDoctorId == doctor.Id` hoặc `HasDoctorAccessAsync(doctor.Id, plan.PatientId)`, ngược lại 403 — `TreatmentPlanService.cs:284-287`, `:31-39`.
5. `ToProgressResponse` — `TreatmentPlanService.cs:572-616`:
   - Sắp giai đoạn theo `StageNumber` (`:574-576`).
   - Đếm `completedStages`, `cancelledStages`; `nonCancelledCount = stages.Count − cancelledStages` (`:578-582`).
   - **NextStage**: `FirstOrDefault` giai đoạn `InProgress` hoặc `Scheduled` trong danh sách đã sắp (`:584-586`).
   - **CompletedCost**: Σ `ActualCost ?? EstimatedCost` của giai đoạn `Completed` (`:587-589`).
   - **ProgressPercent**: `Math.Round(completed / nonCancelled × 100, 2)`, mẫu 0 → `0m` (`:612`, `:619-624`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-09 | Tiến độ % = hoàn thành / không bị hủy; giai đoạn kế tiếp = đầu tiên đang làm hoặc chưa làm | `TreatmentPlanService.cs:584-586`, `:619-624` |
| BR-C07 | Không thấy → 404, không có quyền → 403 | `TreatmentPlanService.cs:283`, `:37` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| — | — | — | Chỉ đọc |

## 7. Liên quan

- Trước đó: [F-TP-01](F-TP-01_tao-ke-hoach-nhap.md), [F-TP-03](F-TP-03_danh-sach-ke-hoach-benh-nhan.md) (lấy id).
- Sau đó: các thao tác F-TP-04..09, lập hóa đơn [F-PAY-01](../M8-thu-ngan/F-PAY-01_lap-hoa-don.md).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: lễ tân xem mọi kế hoạch; bác sĩ lập xem được; bác sĩ khác đã khám bệnh nhân xem được; bác sĩ không liên quan → 403; `progressPercent` khi có giai đoạn hủy; tất cả giai đoạn hủy → 0; `nextStage` null khi đã xong.

## 9. Còn thiếu / câu hỏi mở

- Quyền bác sĩ rộng hơn "bác sĩ đang khám": mọi bác sĩ đã khám bệnh nhân hoặc có lịch hẹn đã xác nhận với bệnh nhân đều xem được (theo cách mở hồ sơ bệnh án). Câu hỏi Q11 liên quan.
- `estimatedTotalCost` vẫn tính cả giai đoạn đã hủy; tài liệu chưa nói rõ có nên trừ không.
- Response không có `cancelledByUserId` dù DB có lưu.
- Comment code ghi "BR-134" cho công thức tiến độ, tài liệu tổng dùng mã BR-TP-09.
- `GET {id}/progress` (F-TP-09) trả cùng dữ liệu nhưng chỉ cho `Doctor`, trùng chức năng với API này.

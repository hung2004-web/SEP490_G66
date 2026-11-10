# F-TP-03 Danh sách kế hoạch điều trị của bệnh nhân

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor`, `Receptionist` |
| API | `GET api/patients/{patientId}/treatment-plans?includeClosed=` |
| Code chính | `TreatmentPlansController.GetByPatientAsync` → `TreatmentPlanService.GetByPatientAsync` → `TreatmentPlanRepository.GetByPatientAsync` |

## 1. Chức năng này làm gì

Liệt kê kế hoạch điều trị của một bệnh nhân, mới nhất trước, mỗi dòng có tiến độ và giai đoạn kế tiếp. Mặc định chỉ trả kế hoạch đang mở; `includeClosed=true` trả cả kế hoạch đã xong, đã hủy, đã thay thế.

## 2. Tiền điều kiện

- Đăng nhập với role `Doctor` hoặc `Receptionist`.
- Bệnh nhân tồn tại.
- Bác sĩ (không phải lễ tân): đã khám bệnh nhân hoặc có lịch hẹn `CONFIRMED`/`CHECKED_IN`/`IN_SERVICE`/`COMPLETED` với bệnh nhân. **Không** xét "người tạo kế hoạch" như F-TP-02.

## 3. API

**Request** `GET api/patients/{patientId:int}/treatment-plans`, quyền `[Authorize(Roles = "Doctor,Receptionist")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `patientId` (route) | int | Có | | Bệnh nhân |
| `includeClosed` (query) | bool | Không | mặc định `false` | `true` thì lấy cả `Completed`, `Cancelled`, `Superseded` |

**Response thành công** (`ApiResponse<List<TreatmentPlanSummaryResponse>>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | long | Id kế hoạch |
| `planName` | string? | Tên |
| `status` | string | Trạng thái kế hoạch |
| `totalStages` | int | Đếm số giai đoạn bằng SQL (không dùng cột `TotalStages`) |
| `estimatedTotalCost` | decimal | Cột `EstimatedTotalCost` |
| `completedStages`, `cancelledStages` | int | Đếm theo `StageStatus` |
| `progressPercent` | decimal | `completed / (total − cancelled) × 100`, làm tròn 2 số |
| `nextStageName`, `nextStageScheduledDate` | string?, DateOnly? | Giai đoạn `InProgress`/`Scheduled` có `stageNumber` nhỏ nhất |
| `createdByDoctorName` | string? | Bác sĩ lập |
| `createdAt` | DateTimeOffset | Thời điểm tạo, sắp giảm dần |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | Bệnh nhân không tồn tại | `MedicalRecordMessage.PatientNotFound`: "Patient not found" |
| 404 | Bác sĩ không có hồ sơ | `DoctorScheduleMessage.DoctorNotFound`: "Doctor profile not found" |
| 403 | Bác sĩ không có quyền với bệnh nhân | `TreatmentPlanMessage.NoAccess`: "You do not have access to this patient's treatment plan" |

## 4. Luồng xử lý trong code

1. Controller nhận `patientId`, `includeClosed`, tính `canViewAll` — `TreatmentPlansController.cs:54-63`.
2. Kiểm tra bệnh nhân tồn tại (`Patients.AnyAsync(Id)`) — `TreatmentPlanService.cs:299-300`, `TreatmentPlanRepository.cs:57-60`.
3. Nếu là bác sĩ: tìm hồ sơ (404), `HasDoctorAccessAsync(doctor.Id, patientId)` (403) — `TreatmentPlanService.cs:302-308`.
4. Một truy vấn SQL: lọc `PatientId`, nếu `includeClosed = false` thì chỉ `Status ∈ OpenStatuses` (`Draft`, `Proposed`, `Approved`, `InProgress`); sắp `CreatedAt` giảm dần; project sang `TreatmentPlanSummaryResponse` với các số đếm và giai đoạn kế tiếp — `TreatmentPlanRepository.cs:63-95`.
5. Tính `ProgressPercent` ở bộ nhớ: `ProgressPercent(CompletedStages, TotalStages − CancelledStages)` — `TreatmentPlanService.cs:311-314`, `:619-624`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-09 | Công thức tiến độ, giai đoạn kế tiếp | `TreatmentPlanRepository.cs:79-90`, `TreatmentPlanService.cs:313` |
| BR-TP-01 | "Kế hoạch đang mở" = `Draft`, `Proposed`, `Approved`, `InProgress` | `TreatmentPlanConstants.cs:20` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| — | — | — | Chỉ đọc |

## 7. Liên quan

- Trước đó: hồ sơ bệnh nhân / lượt khám.
- Sau đó: [F-TP-02](F-TP-02_xem-chi-tiet-ke-hoach.md) xem chi tiết; chọn kế hoạch để lập hóa đơn [F-PAY-01](../M8-thu-ngan/F-PAY-01_lap-hoa-don.md).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: mặc định không trả `Cancelled`/`Completed`; `includeClosed=true` trả đủ; thứ tự mới nhất trước; bệnh nhân không tồn tại → 404; bác sĩ không liên quan → 403; lễ tân xem được mọi bệnh nhân.

## 9. Còn thiếu / câu hỏi mở

- `PatientExistsAsync` không lọc `DeletedAt` (bệnh nhân xóa mềm vẫn được coi là tồn tại), khác với `PatientRepository.GetByIdAsync`.
- Không phân trang.
- `ExaminationDetailResponse.TreatmentPlans` (hồ sơ bệnh án, `MedicalRecordService.cs:105-112`) dùng lại `TreatmentPlanSummaryResponse` nhưng chỉ điền `Id`, `PlanName`, `Status`, `TotalStages`, `EstimatedTotalCost`; các trường tiến độ luôn 0/null ở đó.

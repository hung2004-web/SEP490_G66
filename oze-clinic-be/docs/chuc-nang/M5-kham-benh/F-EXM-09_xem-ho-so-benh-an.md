# F-EXM-09 Xem hồ sơ bệnh án

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5 và mục 1 (phạm vi dữ liệu của `Doctor`).

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `GET api/medical-records/patients/{patientId}`, `GET api/medical-records/examinations/{examinationId}` |
| Code chính | `MedicalRecordsController.GetPatientRecordAsync` / `GetExaminationDetailAsync` → `MedicalRecordService` cùng tên → `MedicalRecordRepository` (`GetPatientAsync`, `GetActiveMedicalProfilesAsync`, `GetExaminationsAsync`, `GetExaminationDetailAsync`, `HasDoctorAccessAsync`) + `StaffRepository.GetByUserIdAsync` |

## 1. Chức năng này làm gì

Bác sĩ xem hồ sơ bệnh án của một bệnh nhân: thông tin hành chính, tiền sử/dị ứng đang hiệu lực và danh sách các lượt khám (mới nhất trước). Từ danh sách, bác sĩ mở chi tiết một lượt khám: lý do khám, ghi chú, chẩn đoán, đơn thuốc, kế hoạch điều trị, ảnh chụp phim. Chỉ đọc.

## 2. Tiền điều kiện

- Role `Doctor`, tài khoản có `StaffProfile`.
- Bệnh nhân tồn tại và chưa bị xóa mềm (`DeletedAt == null`).
- Bác sĩ có quyền xem bệnh nhân (`HasDoctorAccessAsync`): đã từng có phiếu khám với bệnh nhân **hoặc** có lịch hẹn với bệnh nhân ở trạng thái `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED` (`MedicalRecordConstants.AccessAppointmentStatuses`).

## 3. API

### 3.1 Hồ sơ theo bệnh nhân

**Request** `GET api/medical-records/patients/{patientId}`, quyền `[Authorize(Roles = RoleConstants.DoctorRole)]`. `patientId` là `int`.

**Response thành công** (`ApiResponse<PatientMedicalRecordResponse>`, HTTP 200, message `"Success"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `patientId`, `patientCode`, `fullName` | | Bệnh nhân |
| `dateOfBirth` | `DateOnly?` | |
| `gender`, `phoneNumber`, `bloodType`, `notes` | `string?` | |
| `medicalProfiles[]` | `List<MedicalProfileResponse>` | Hồ sơ y tế `Status = "Active"`, sắp theo `RecordType`: `id`, `recordType` (History/Condition/Allergy/Medication), `title`, `description`, `severity` |
| `examinations[]` | `List<ExaminationSummaryResponse>` | Sắp `AppointmentDate` giảm dần rồi `CreatedAt` giảm dần: `id`, `appointmentDate`, `doctorName`, `chiefComplaint`, `primaryDiagnosis` (tên chẩn đoán chính), `examinationStatus` |

### 3.2 Chi tiết một lượt khám

**Request** `GET api/medical-records/examinations/{examinationId}`, quyền `Doctor`. `examinationId` là `long`.

**Response thành công** (`ApiResponse<ExaminationDetailResponse>`, HTTP 200, message `"Success"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `patientId` | | |
| `appointmentDate` | `DateOnly` | Ngày của lịch hẹn |
| `doctorName` | `string` | Bác sĩ khám |
| `chiefComplaint`, `clinicalNotes` | `string?` | |
| `examinationStatus` | `string` | `InProgress` / `Locked` |
| `diagnoses[]` | `List<DiagnosisResponse>` | Chẩn đoán chính lên đầu |
| `prescriptions[]` | `List<PrescriptionResponse>` | Đơn thuốc (tối đa một), dòng sắp theo `SortOrder` |
| `treatmentPlans[]` | `List<TreatmentPlanSummaryResponse>` | Chỉ điền `id`, `planName`, `status`, `totalStages`, `estimatedTotalCost` |
| `images[]` | `List<ImagingResponse>` | Kết quả chụp phim, **ẩn ảnh `ReviewStatus = "Rejected"`**, sắp theo `createdAt`: `resultId`, `imagingType`, `targetArea`, `fileName`, `filePath`, `reviewStatus`, `doctorNotes`, `createdAt` |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants.MedicalRecordMessage`) |
|---|---|---|
| 401/403 | Chưa đăng nhập / không phải `Doctor` | Do ASP.NET Core trả |
| 404 | (3.1) Bệnh nhân không có hoặc đã xóa mềm | `PatientNotFound` = "Patient not found" |
| 404 | (3.2) Không có phiếu, hoặc bệnh nhân của phiếu đã xóa mềm | `ExaminationNotFound` = "Examination not found" |
| 404 | Tài khoản không có hồ sơ nhân viên | `DoctorNotFound` = "Doctor profile not found" |
| 403 | Bác sĩ không có quyền xem bệnh nhân | `AccessDenied` = "You do not have permission to view this patient's medical record" |

## 4. Luồng xử lý trong code

**Hồ sơ theo bệnh nhân** — `MedicalRecordService.cs:25-62`

1. Controller gọi service với `CurrentUserId ?? ""` — `MedicalRecordsController.cs:23-28` (route `api/medical-records`, `[Authorize(Roles = Doctor)]` ở dòng 11-13).
2. Lấy bệnh nhân chưa xóa mềm (`AsNoTracking`) → 404 `PatientNotFound` — `MedicalRecordService.cs:27-28`, `MedicalRecordRepository .cs:22-27`.
3. **Kiểm tra quyền bác sĩ** `EnsureAccessAsync`: tìm `StaffProfile` → 404 `DoctorNotFound`; `HasDoctorAccessAsync` sai → 403 `AccessDenied` — `MedicalRecordService.cs:29`, `133-141`, `MedicalRecordRepository .cs:69-82`.
4. Lấy hồ sơ y tế `Active` — `MedicalRecordService.cs:31`, `MedicalRecordRepository .cs:29-36`.
5. Lấy các phiếu khám kèm `Appointment`, `Doctor`, `Diagnoses`, mới nhất trước — `MedicalRecordService.cs:32`, `MedicalRecordRepository .cs:38-50`.
6. Ánh xạ sang `PatientMedicalRecordResponse` — `MedicalRecordService.cs:34-61`.

**Chi tiết lượt khám** — `MedicalRecordService.cs:64-131`

1. Controller — `MedicalRecordsController.cs:30-35`.
2. Lấy phiếu (`AsNoTracking`, split query) kèm `Appointment`, `Doctor`, `Diagnoses`, `Prescriptions.Items`, `TreatmentPlans`, `ImagingRequests.Results`, chỉ khi bệnh nhân chưa xóa mềm → 404 `ExaminationNotFound` — `MedicalRecordService.cs:66-67`, `MedicalRecordRepository .cs:53-66`.
3. `EnsureAccessAsync(userId, exam.PatientId)` — `MedicalRecordService.cs:68`.
4. Ánh xạ: chẩn đoán chính lên đầu; đơn thuốc và dòng; kế hoạch tóm tắt; ảnh bỏ `Rejected` — `MedicalRecordService.cs:70-130`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| Mục 1 (`HasDoctorAccess`) | Bác sĩ chỉ xem bệnh nhân mình đang/đã khám | `MedicalRecordRepository .cs:69-82` |
| BR-C09 | Bệnh nhân xóa mềm không hiện hồ sơ | `MedicalRecordRepository .cs:26`, `65` |
| (Ảnh) | Ảnh bị từ chối vì chất lượng bị ẩn | `MedicalRecordService.cs:113-116` |
| BR-C07 | Không có quyền → 403, không thấy → 404 | `MedicalRecordService.cs:137-140` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| (không) | | | Chỉ đọc, `AsNoTracking`, không ghi audit |

## 7. Liên quan

- Trước đó: F-EXM-01..07 tạo dữ liệu phiếu; M1 hồ sơ y tế bệnh nhân; M6 kết quả chụp phim; M7 kế hoạch điều trị.
- Sau đó: bác sĩ dùng để khám, lập kế hoạch; F-EXM-08 (chưa làm) sẽ bổ sung phụ lục vào chi tiết.

## 8. Kiểm thử

- Test hiện có: Chưa có (không thấy test cho `MedicalRecordService`).
- Ca cần test thêm: bác sĩ chưa từng khám và chỉ có lịch `PENDING`/`CANCELLED`/`NO_SHOW` → 403; có lịch `CONFIRMED` → xem được; bệnh nhân xóa mềm → 404; ảnh `Rejected` bị ẩn; thứ tự lượt khám.

## 9. Còn thiếu / câu hỏi mở

- **Lệch Dac_ta mục 1**: tài liệu ghi bác sĩ xem "bệnh nhân mình đang khám hoặc đã từng khám"; code cho xem cả khi chỉ mới có lịch `CONFIRMED` hoặc `CHECKED_IN` (chưa khám).
- Dac_ta ghi xem hồ sơ "theo bệnh nhân / lượt khám" nhưng không nói vai trò; code chỉ cho `Doctor`. Lễ tân, bệnh nhân không xem được qua API này.
- Thứ tự kiểm tra ở 3.1: kiểm tra bệnh nhân tồn tại trước kiểm tra quyền, nên bác sĩ không có quyền vẫn phân biệt được "không tồn tại" (404) và "không có quyền" (403).
- Chi tiết lượt khám không có sơ đồ răng, dịch vụ trên phiếu, phụ lục, `LockedAt`.
- `TreatmentPlanSummaryResponse` có thêm `completedStages`, `cancelledStages`, `progressPercent`, `nextStageName`, `nextStageScheduledDate`, `createdByDoctorName`, `createdAt` nhưng ở đây không điền (giá trị mặc định).
- Danh sách lượt khám ở 3.1 trả cả phiếu `InProgress` của bác sĩ khác.
- Tên file repository có dấu cách: `OZE.Persistence/Repositories/MedicalRecordRepository .cs`.

# F-EXM-01 Bắt đầu khám

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5. Code là chuẩn khi lệch tài liệu cũ `Huong_dan_bat_dau_va_hoan_tat_kham.md`.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `POST api/appointments/{id}/start-examination` |
| Code chính | `AppointmentsController.StartExaminationAsync` → `AppointmentService.StartExaminationAsync` → `AppointmentRepository` (`GetStaffProfileIdByUserIdAsync`, `GetByIdWithExaminationAsync`, `HasAppointmentInServiceAsync`, `SaveStartedExaminationAsync`, `UpdateAsync`) + `QueueService` |

## 1. Chức năng này làm gì

Bác sĩ được phân công bấm "Bắt đầu khám" cho một bệnh nhân đã check-in trong ngày. Hệ thống tạo phiếu khám (`Examination`) trạng thái `InProgress`, chuyển lịch hẹn sang `IN_SERVICE` và đánh dấu số hàng chờ là `IN_PROGRESS`. Nếu bệnh nhân quay lại sau khi đi chụp phim, hệ thống **tiếp tục phiếu cũ**, không tạo phiếu mới.

## 2. Tiền điều kiện

- Đăng nhập với role `Doctor`, tài khoản có `StaffProfile`.
- Lịch hẹn tồn tại, `DoctorId` của lịch là bác sĩ đang đăng nhập.
- Lịch đang `CHECKED_IN` và `AppointmentDate` là hôm nay theo `ClinicClock.Today` (giờ Việt Nam).
- Bác sĩ không có lịch nào khác `IN_SERVICE` trong ngày hẹn.
- Nếu là lượt khám mới (chưa có phiếu): bác sĩ đang trong ca (đã bắt đầu ca, chưa kết thúc ca) — kiểm tra qua `IQueueService.IsDoctorOffDutyAsync`.

## 3. API

**Request** `POST api/appointments/{id}/start-examination`, quyền `[Authorize(Roles = RoleConstants.DoctorRole)]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | `long` | Có | `{id:long}` | Id lịch hẹn |

Không có body.

**Response thành công** (`ApiResponse<StartExaminationResponse>`, HTTP 200, message `"Examination started successfully"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `examinationId` | `long` | Id phiếu khám (mới tạo hoặc phiếu cũ được tiếp tục) |
| `appointmentId` | `long` | Id lịch hẹn |
| `patientId` | `int` | Id bệnh nhân |
| `doctorId` | `int` | `StaffProfile.Id` của bác sĩ trên phiếu |
| `examinationStatus` | `string` | `InProgress` |
| `appointmentStatus` | `string` | `IN_SERVICE` |
| `chiefComplaint` | `string?` | Lý do khám. Phiếu mới: chép từ `Appointment.Notes` |

Ví dụ:

```json
{
  "success": true,
  "message": "Examination started successfully",
  "data": {
    "examinationId": 88, "appointmentId": 300, "patientId": 66, "doctorId": 5,
    "examinationStatus": "InProgress", "appointmentStatus": "IN_SERVICE",
    "chiefComplaint": "Đau răng hàm dưới bên phải"
  }
}
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401/403 | Chưa đăng nhập / không phải role `Doctor` | Do ASP.NET Core trả |
| 404 | Tài khoản không có hồ sơ bác sĩ | `AppointmentMessage.DoctorProfileNotFound` = "No doctor profile is linked to this account" |
| 404 | Không có lịch hẹn | `AppointmentMessage.AppointmentNotFound` = "Appointment not found in system" |
| 403 | Lịch thuộc bác sĩ khác | `AppointmentMessage.NotAssignedDoctor` = "You can only examine your own appointments" |
| 400 | Lịch không ở `CHECKED_IN` | `AppointmentMessage.OnlyCheckedInCanBeStarted` = "Only a checked-in appointment can be started" |
| 400 | Lịch không phải hôm nay | `AppointmentMessage.ExaminationWrongDay` = "An examination can only be started on the day of the appointment" |
| 400 | Lượt mới, bác sĩ ngoài ca | `AppointmentMessage.DoctorNotOnShiftCannotStart` = "You are not on a shift now. Start your shift to see new patients; only patients you have already examined can still be seen" |
| 400 | Bác sĩ đang khám người khác | `AppointmentMessage.DoctorAlreadyExamining` = "You are already examining another patient. Complete that examination first" |
| 400 | Hai request cùng tạo phiếu cho một lịch (vi phạm unique `IX_Examinations_AppointmentId`) | `AppointmentMessage.ExaminationAlreadyStarted` = "This appointment already has an examination" |
| 409 | Lịch hẹn bị sửa đồng thời (`RowVersion` của `Appointment`) | `AppointmentMessage.RecordChangedMeanwhile` = "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

1. Controller lấy `CurrentUserId` (rỗng nếu thiếu, để không khớp bác sĩ nào) và gọi service — `AppointmentsController.cs:247-256`.
2. Tìm `StaffProfile.Id` theo userId; không có → 404 `DoctorProfileNotFound` — `AppointmentService.cs:1017-1018`, `AppointmentRepository.cs:254`.
3. Tải lịch kèm `Patient`, `Doctor`, `Examination`, `ServiceItems` (có tracking); nếu null thử lại `GetByIdWithDetailsAsync`; vẫn null → 404 `AppointmentNotFound` — `AppointmentService.cs:1020-1022`, `AppointmentRepository.cs:274-285`.
4. **Kiểm tra quyền bác sĩ**: `appointment.DoctorId == doctorId`, sai → `ForbiddenException` 403 `NotAssignedDoctor` — `AppointmentService.cs:1025`.
5. Lịch phải `CHECKED_IN` → `OnlyCheckedInCanBeStarted` — `AppointmentService.cs:1026`.
6. `AppointmentDate` phải bằng `ClinicClock.Today` → `ExaminationWrongDay` — `AppointmentService.cs:1027`.
7. Chỉ khi **chưa có phiếu** (lượt mới) và có `_queueService`: bác sĩ ngoài ca → `DoctorNotOnShiftCannotStart`. Bệnh nhân quay lại sau chụp phim bỏ qua kiểm tra này — `AppointmentService.cs:1031-1035`, `QueueService.cs:200-203`.
8. Một bác sĩ một bệnh nhân: còn lịch `IN_SERVICE` cùng ngày → `DoctorAlreadyExamining` — `AppointmentService.cs:1038-1039`, `AppointmentRepository.cs:302-308`.
9. Đổi lịch sang `IN_SERVICE`, `UpdatedAt = now` — `AppointmentService.cs:1041-1044`.
10. Nhánh **tiếp tục phiếu cũ** (đã có `Examination`, BR-EXM-03): cập nhật `examination.UpdatedAt`, gọi `UpdateAsync(appointment)` (`_context.Appointments.Update` + `SaveChangesAsync`, kiểm tra `RowVersion`) — `AppointmentService.cs:1047-1053`, `AppointmentRepository.cs:397-401`.
11. Nhánh **phiếu mới**: tạo `Examination` (`PatientId`, `DoctorId`, `ChiefComplaint = appointment.Notes`, `ExaminationStatus = InProgress`, `CreatedAt`) và lưu một lần cùng thay đổi trạng thái lịch — `AppointmentService.cs:1054-1067`. Repository gán `AppointmentId`, `SaveChangesAsync`; nếu trùng unique index `IX_Examinations_AppointmentId` thì detach phiếu và ném `BadRequestException(ExaminationAlreadyStarted)` — `AppointmentRepository.cs:403-425`.
12. Đổi số hàng chờ khám (`QueueType = Examination`) sang `IN_PROGRESS` — `AppointmentService.cs:1069-1072`.
13. Ghi audit `APPOINTMENT_EXAMINATION_STARTED` (cũ: `Status`; mới: `Status`, `ExaminationId`, `ExaminationStatus`) — `AppointmentService.cs:1074-1075`.
14. Trả `StartExaminationResponse` — `AppointmentService.cs:1077-1086`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-EXM-01 | Chỉ bác sĩ được phân công; lịch `CHECKED_IN`, đúng hôm nay; một bác sĩ một bệnh nhân | `AppointmentService.cs:1025-1039` |
| BR-EXM-02 | Phiếu tách khỏi lịch, tạo khi bắt đầu khám; `Appointment.Notes` chép sang `ChiefComplaint` | `AppointmentService.cs:1056-1064` |
| BR-EXM-03 | Quay lại sau chụp phim tiếp tục phiếu cũ | `AppointmentService.cs:1047-1053` |
| (Ca bác sĩ) | Lượt mới chỉ khi bác sĩ đang trong ca | `AppointmentService.cs:1031-1035` |
| BR-C01 | Ngày hôm nay lấy từ `ClinicClock.Today` | `AppointmentService.cs:1027` |
| BR-C10 | `RowVersion` của `Appointment` và `Examination` | `AppointmentConfiguration.cs:23`, `ExaminationConfiguration.cs:13`, `GlobalExceptionMiddleware.cs:55-59` |
| BR-C11 | Ghi `AuditLog` | `AppointmentService.cs:1074` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Status` | `CHECKED_IN` | `IN_SERVICE` | |
| `Examinations` | (không có) hoặc `InProgress` | `InProgress` | Phiếu mới: insert; phiếu cũ: chỉ `UpdatedAt` |
| `QueueEntries` (Examination) | `WAITING`/`CALLED` | `IN_PROGRESS` | Qua `QueueService.UpdateStatusAsync` |
| `AuditLogs` | | thêm 1 dòng | `APPOINTMENT_EXAMINATION_STARTED` |

## 7. Liên quan

- Trước đó: check-in / walk-in (M4), bác sĩ gọi số trong hàng chờ; bắt đầu ca bác sĩ (F-RCP-08).
- Sau đó: F-EXM-02..06 ghi nội dung phiếu; F-IMG-01 chỉ định chụp phim (đưa lịch về `CHECKED_IN`, `ImagingRequestService.cs:85-94`), sau đó bắt đầu khám lại để tiếp tục phiếu cũ; F-EXM-07 hoàn tất khám.

## 8. Kiểm thử

- Test hiện có (`OZE.UnitTest/Services/AppointmentStartExaminationTests.cs`):
  - `StartExaminationAsync_ShouldCreateOneExamination_WhenCheckedInForThisDoctor`
  - `StartExaminationAsync_ShouldReject_WhenNotCheckedIn` (theory: `PENDING`, `CONFIRMED`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`)
  - `StartExaminationAsync_ShouldReject_WhenTheAppointmentIsNotToday`
  - `StartExaminationAsync_ShouldReject_WhenTheDoctorIsAlreadyExamining`
  - `StartExaminationAsync_ShouldCopyTheBookingNoteToTheChiefComplaint`
  - `StartExaminationAsync_ShouldReject_WhenTheDoctorIsNotAssigned`
  - `StartExaminationAsync_ShouldReturnNotFound_WhenAppointmentDoesNotExist`
  - `StartExaminationAsync_ShouldReturnNotFound_WhenTheAccountHasNoDoctorProfile`
- `AppointmentPriorityReturnAndQueueTests.StartExaminationAsync_ShouldResumeExistingExamination_WhenReturningFromImaging`.
- Ca cần test thêm: bác sĩ ngoài ca bị chặn với lượt mới nhưng vẫn tiếp tục được phiếu cũ; trùng unique index trả `ExaminationAlreadyStarted`; hàng chờ chuyển `IN_PROGRESS`; audit được ghi.

## 9. Còn thiếu / câu hỏi mở

- Lệch tài liệu cũ `Huong_dan_bat_dau_va_hoan_tat_kham.md`: tài liệu ghi lịch của bác sĩ khác trả **404 `AppointmentNotFound`**; code trả **403 `NotAssignedDoctor`**. Message `OnlyCheckedInCanStartExamination` trong tài liệu cũ, code dùng `OnlyCheckedInCanBeStarted` với nội dung khác. `StartExaminationResponse` trong tài liệu cũ có `PatientName`, `StartedAt`; code có `DoctorId`, `AppointmentStatus`, không có hai trường kia.
- Không nhất quán với F-EXM-07: hoàn tất khám với lịch của bác sĩ khác trả 404, bắt đầu khám trả 403.
- Kiểm tra "một bác sĩ một bệnh nhân" (`HasAppointmentInServiceAsync`) không nằm trong transaction hay khóa; hai request bắt đầu khám hai lịch khác nhau cùng lúc có thể cùng qua. Chưa xác định từ code có cơ chế nào khác chặn.
- Khi `GetByIdWithExaminationAsync` trả null, service gọi thêm `GetByIdWithDetailsAsync` cùng điều kiện `Id`, kết quả luôn cũng null (truy vấn thừa).
- Hàng chờ và audit chạy sau khi đã lưu phiếu, không cùng transaction; nếu bước đó lỗi, phiếu và trạng thái lịch vẫn đã đổi.

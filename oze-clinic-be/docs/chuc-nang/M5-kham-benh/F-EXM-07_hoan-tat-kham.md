# F-EXM-07 Hoàn tất khám

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5. Code là chuẩn khi lệch tài liệu cũ `Huong_dan_bat_dau_va_hoan_tat_kham.md`.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `POST api/appointments/{id}/complete-examination` |
| Code chính | `AppointmentsController.CompleteExaminationAsync` → `AppointmentService.CompleteExaminationAsync` → `AppointmentRepository` (`GetStaffProfileIdByUserIdAsync`, `GetByIdWithExaminationAsync`, `GetExaminationCompletionCountsAsync`, `RemoveEmptyDraftPrescriptionsAsync`, `UpdateAsync`) + `QueueService` |

## 1. Chức năng này làm gì

Bác sĩ bấm "Hoàn tất" khi khám xong. Hệ thống kiểm tra phiếu đã có nội dung tối thiểu, **khóa phiếu khám** (`Locked`), chuyển lịch hẹn sang `COMPLETED` và số hàng chờ sang `COMPLETED`. Sau khi khóa, mọi API ghi ở F-EXM-02..06 bị chặn.

## 2. Tiền điều kiện

- Role `Doctor`, có `StaffProfile`, là bác sĩ của lịch hẹn.
- Lịch `IN_SERVICE`, có phiếu khám, phiếu `InProgress`.
- Phiếu có ít nhất một chẩn đoán **hoặc** `ClinicalNotes` không rỗng.
- Không còn đơn thuốc `Draft` có dòng thuốc (phải chốt hoặc xóa).

## 3. API

**Request** `POST api/appointments/{id}/complete-examination`, quyền `[Authorize(Roles = RoleConstants.DoctorRole)]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | `long` | Có | `{id:long}` | Id **lịch hẹn** (không phải Id phiếu) |

Không có body.

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, message `"Examination completed successfully"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `patientId`, `patientCode`, `patientName`, `patientPhoneNumber` | | Lịch và bệnh nhân |
| `doctorId`, `doctorName` | | Bác sĩ |
| `serviceId`, `serviceName` | | Dịch vụ đầu tiên |
| `services[]` | `List<AppointmentServiceResponse>` | `serviceId`, `serviceName`, `variantId`, `variantName`, `durationMinutes`, `priceAtBooking` |
| `appointmentType`, `appointmentDate`, `timeSlotStart`, `timeSlotEnd` | | Thông tin lịch |
| `status` | `string` | `COMPLETED` |
| `checkInAt`, `cancellationReason`, `notes`, `createdAt` | | |

(Ánh xạ ở `AppointmentService.MapToResponse`, `AppointmentService.cs:1179-1212`.)

Ví dụ:

```json
{ "success": true, "message": "Examination completed successfully", "data": { "id": 300, "status": "COMPLETED", "...": "..." } }
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401/403 | Chưa đăng nhập / không phải `Doctor` | Do ASP.NET Core trả |
| 404 | Tài khoản không có hồ sơ bác sĩ | `AppointmentMessage.DoctorProfileNotFound` = "No doctor profile is linked to this account" |
| 404 | Không có lịch **hoặc** lịch của bác sĩ khác | `AppointmentMessage.AppointmentNotFound` = "Appointment not found in system" |
| 400 | Lịch không ở `IN_SERVICE` | `AppointmentMessage.OnlyInServiceCanBeCompleted` = "Only an examination that is in progress can be completed" |
| 400 | Lịch không có phiếu | `AppointmentMessage.ExaminationNotFound` = "No examination was found for this appointment" |
| 400 | Phiếu không còn `InProgress` | `AppointmentMessage.ExaminationAlreadyLocked` = "This examination is already completed and locked" |
| 400 | Không có chẩn đoán và không có ghi chú lâm sàng | `ExaminationMessage.NothingRecorded` = "Please record at least a diagnosis or clinical notes before completing the examination" |
| 400 | Còn đơn `Draft` có dòng thuốc | `ExaminationMessage.PrescriptionNotFinalized` = "Please finalize the prescription, or delete it, before completing the examination" |
| 409 | Lịch hoặc phiếu bị sửa đồng thời (`RowVersion`) | `AppointmentMessage.RecordChangedMeanwhile` = "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

1. Controller lấy `CurrentUserId ?? ""`, gọi service — `AppointmentsController.cs:261-269`.
2. Tìm `StaffProfile.Id` → 404 `DoctorProfileNotFound` — `AppointmentService.cs:1091-1092`.
3. Tải lịch kèm `Examination`, `Patient`, `Doctor`, `ServiceItems` (có tracking) — `AppointmentService.cs:1094`, `AppointmentRepository.cs:274-285`.
4. **Kiểm tra quyền bác sĩ**: lịch null **hoặc** `DoctorId` khác → 404 `AppointmentNotFound` (không lộ lịch của bác sĩ khác) — `AppointmentService.cs:1095-1096`.
5. Lịch phải `IN_SERVICE` → `OnlyInServiceCanBeCompleted` — `AppointmentService.cs:1098-1099`.
6. Phải có phiếu → `ExaminationNotFound`; phiếu phải `InProgress` → `ExaminationAlreadyLocked` — `AppointmentService.cs:1100-1103`.
7. Đếm số chẩn đoán và số đơn `Draft` có dòng thuốc — `AppointmentService.cs:1107`, `AppointmentRepository.cs:287-293`.
8. Không chẩn đoán và `ClinicalNotes` rỗng → `NothingRecorded`; còn đơn `Draft` có dòng → `PrescriptionNotFinalized` — `AppointmentService.cs:1108-1110`.
9. Xóa ngay (`ExecuteDeleteAsync`, ngoài `SaveChanges`) các đơn `Draft` không có dòng thuốc — `AppointmentService.cs:1111`, `AppointmentRepository.cs:295-300`.
10. **Khóa phiếu**: `ExaminationStatus = "Locked"` (chuỗi viết thẳng, không dùng `ExaminationConstants.Locked`), `LockedAt = now`, `LockedByUserId = doctorUserId`, `UpdatedAt` — `AppointmentService.cs:1113-1118`.
11. Lịch → `COMPLETED`, `UpdatedAt` — `AppointmentService.cs:1120-1121`.
12. `UpdateAsync(appointment)`: `_context.Appointments.Update` + `SaveChangesAsync`; EF kiểm tra `RowVersion` của `Appointments` và `Examinations` → lệch thì 409. Vì mọi API ghi ở F-EXM-02..06 cũng cập nhật dòng phiếu (`EnsureOpen`), một thao tác ghi chạy song song với "hoàn tất" sẽ có một bên nhận 409 — `AppointmentService.cs:1123`, `AppointmentRepository.cs:397-401`, `ExaminationService.cs:571-573`.
13. Hàng chờ khám → `COMPLETED` — `AppointmentService.cs:1125-1128`.
14. Ghi audit `APPOINTMENT_COMPLETED` (cũ: `Status`; mới: `Status`, `ExaminationId`, `ExaminationStatus`) — `AppointmentService.cs:1130-1131`.
15. Trả `AppointmentResponse` — `AppointmentService.cs:1133`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-EXM-04 | Chỉ khi lịch `IN_SERVICE` và đúng bác sĩ; xong thì khóa phiếu | `AppointmentService.cs:1095-1103`, `1115-1117`; khóa được áp ở `ExaminationService.cs:570` |
| (Tối thiểu) | Cần ít nhất chẩn đoán hoặc ghi chú lâm sàng | `AppointmentService.cs:1108-1109` |
| BR-EXM-06 | Đơn có thuốc phải chốt trước khi hoàn tất; đơn rỗng tự xóa | `AppointmentService.cs:1110-1111` |
| BR-C10 | `RowVersion` lịch và phiếu | `AppointmentRepository.cs:397-401`, `GlobalExceptionMiddleware.cs:55-59` |
| BR-C11 | Ghi `AuditLog` | `AppointmentService.cs:1130` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Status` | `IN_SERVICE` | `COMPLETED` | |
| `Examinations.ExaminationStatus` | `InProgress` | `Locked` | Bỏ qua `Completed` |
| `Examinations.LockedAt`, `LockedByUserId` | `null` | thời điểm, userId bác sĩ | |
| `Prescriptions` (`Draft`, không dòng) | có | xóa | `ExecuteDeleteAsync` |
| `QueueEntries` (Examination) | `IN_PROGRESS` | `COMPLETED` | |
| `AuditLogs` | | thêm 1 dòng | `APPOINTMENT_COMPLETED` |

## 7. Liên quan

- Trước đó: F-EXM-01 bắt đầu khám; F-EXM-02/05 (nội dung tối thiểu); F-EXM-06 (chốt đơn).
- Sau đó: M8 thu ngân lập hóa đơn; F-EXM-09 xem hồ sơ; F-EXM-08 phụ lục (chưa làm) là cách duy nhất để bổ sung sau khi khóa.

## 8. Kiểm thử

- Test hiện có (`OZE.UnitTest/Services/Appointments/CompleteExaminationTests.cs`):
  - `CompleteExaminationAsync_ShouldLockExaminationAndCompleteAppointment`
  - `CompleteExaminationAsync_ShouldReject_WhenRecordIsNotReady` (theory: `NothingRecorded`, `PrescriptionNotFinalized`)
  - `CompleteExaminationAsync_ShouldReject_WhenAppointmentIsNotInService`
  - `CompleteExaminationAsync_ShouldReject_WhenDoctorIsNotAssigned` (mong đợi 404 `AppointmentNotFound`)
- Ca cần test thêm: chỉ có ghi chú (không chẩn đoán) vẫn hoàn tất; đơn rỗng bị xóa; phiếu đã `Locked` → `ExaminationAlreadyLocked`; lịch không có phiếu; hàng chờ chuyển `COMPLETED`; audit.

## 9. Còn thiếu / câu hỏi mở

- **Lệch Dac_ta mục 3**: tài liệu ghi phiếu `InProgress` → `Completed` → `Locked`; code chuyển thẳng `InProgress` → `Locked`, giá trị `Completed` (`ExaminationConstants.Completed`) không được dùng ở đâu trong luồng này.
- Code viết chuỗi `"Locked"` thay vì `ExaminationConstants.Locked` (`AppointmentService.cs:1115`).
- Bước 9 xóa đơn rỗng bằng `ExecuteDeleteAsync` chạy ngay, không cùng transaction với bước 12; nếu bước 12 lỗi 409 thì đơn rỗng vẫn đã bị xóa. Đơn chỉ có ghi chú (không dòng thuốc) cũng bị xóa (xem F-EXM-06 mục 9).
- Không kiểm tra ngày (lịch của ngày trước còn `IN_SERVICE` vẫn hoàn tất được) và không kiểm tra ca bác sĩ.
- Lịch của bác sĩ khác trả 404 ở đây nhưng 403 ở F-EXM-01.
- Tài liệu cũ `Huong_dan_bat_dau_va_hoan_tat_kham.md` ghi "điều kiện tối thiểu để hoàn tất, audit, test mới" là chưa làm; code hiện đã có cả ba.

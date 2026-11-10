# F-APT-08 Đổi lịch hẹn

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Patient` (lịch `PENDING` của mình, trong hạn), `Receptionist`, `ClinicManager` |
| API | `POST api/appointments/{id}/reschedule` |
| Code chính | `AppointmentsController.RescheduleAppointmentAsync` → `AppointmentService.RescheduleAppointmentAsync` → `FindSlotsAsync`, `PickLeastBusyAsync` → `AppointmentRepository.GetByIdWithDetailsAsync`, `ExecuteSerializableAsync`, `UpdateAsync` |

## 1. Chức năng này làm gì

Chuyển một lịch chưa bắt đầu sang ngày/giờ khác và có thể đổi bác sĩ, **sửa trên chính lịch cũ** (không tạo lịch mới), giữ nguyên danh sách dịch vụ. Bệnh nhân tự đổi thì lịch quay về `PENDING` chờ lễ tân gọi lại; lễ tân/quản lý đổi (sau khi đã nói chuyện với bệnh nhân) thì lịch thành `CONFIRMED` và bệnh nhân nhận SMS/email giờ mới. Khách vãng lai không có token nên phải gọi lễ tân đổi giúp.

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist`, `ClinicManager` hoặc `Patient` (`Doctor` không gọi được).
- Lịch đang `PENDING` hoặc `CONFIRMED` và có ít nhất một dòng dịch vụ.
- Bệnh nhân: lịch của mình, đang `PENDING`, giờ khám **hiện tại** còn ≥ `Booking.CancelCutoffHours` giờ.
- Slot mới còn trống theo F-APT-02 (không tính chính lịch đang đổi).

## 3. API

**Request** `POST api/appointments/{id}/reschedule`, quyền `[Authorize(Roles = "Receptionist,ClinicManager,Patient")]`. Body `RescheduleAppointmentRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | `{id:long}` | Id lịch |
| `date` | DateOnly? | Có | `[Required]`; trong khoảng F-APT-02 | Ngày mới |
| `slotStart` | TimeOnly? | Có | `[Required]`; khớp một slot trống | Giờ mới |
| `doctorId` | int? | Không | | `null` = giữ bác sĩ cũ nếu rảnh, không thì bác sĩ ít lịch nhất |

```json
{ "date": "2026-11-22", "slotStart": "14:00:00", "doctorId": null }
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, `message = "Appointment rescheduled successfully"`)

`AppointmentResponse` như F-APT-05 với ngày/giờ/bác sĩ mới; `status = PENDING` (bệnh nhân đổi) hoặc `CONFIRMED` (nhân viên đổi).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401 / 403 | Chưa đăng nhập / sai role | Do ASP.NET trả |
| 400 | Thiếu `date`/`slotStart` (`ValidationProblemDetails`) | Message mặc định DataAnnotations |
| 404 | Không có lịch, hoặc bệnh nhân đổi lịch người khác | `AppointmentMessage.AppointmentNotFound` "Appointment not found in system" |
| 400 | Lịch không ở `PENDING`/`CONFIRMED` | `AppointmentMessage.OnlyOpenCanBeRescheduled` "Only an appointment that is pending or confirmed can be rescheduled" |
| 400 | Bệnh nhân đổi lịch `CONFIRMED` | `AppointmentMessage.ConfirmedNeedsReceptionistToReschedule` "This appointment is already confirmed. Please call the clinic to reschedule it" |
| 400 | Bệnh nhân đổi khi giờ cũ còn < cutoff | `AppointmentMessage.RescheduleDeadlinePassed` "It is too close to the appointment time to reschedule online. Please call the clinic" |
| 400 | Lịch không có dòng dịch vụ | `AppointmentMessage.ServiceNotFound` "Service not found" (ném bằng `ConditionGuard.Ensure` thường nên là 400, không phải 404) |
| 400 | Ngày mới quá khứ / quá xa / thiếu cấu hình | `PastDate`, `TooFarAhead`, `ConfigMissing` (như F-APT-02) |
| 400 | Slot mới không trống | `AppointmentMessage.SlotNotAvailable` "This time slot is no longer available. Please choose another time" |
| 409 | Xung đột `RowVersion` | `AppointmentMessage.RecordChangedMeanwhile` |

## 4. Luồng xử lý trong code

1. Controller truyền `OwnerRestriction` (`AppointmentsController.cs:23-26`, `:192-201`).
2. Tải lịch kèm `ServiceItems.Service/Variant`; không có → 404; `EnsureOwnedBy` (`AppointmentService.cs:574-576`).
3. `IsOpen` sai → `OnlyOpenCanBeRescheduled` (`:578`).
4. Bệnh nhân (`isPatient = ownerUserId != null`): `CONFIRMED` → `ConfirmedNeedsReceptionistToReschedule`; `EnsureBeforeCutoffAsync` với giờ **cũ** và `Booking.CancelCutoffHours` → `RescheduleDeadlinePassed` (`:580-587`, `:1157-1162`).
5. Dựng `BookingLine` từ `ServiceItems` (dịch vụ + biến thể hiện tại của lịch); rỗng → `ServiceNotFound` (`:590-591`).
6. Lưu ảnh "trước" gồm `Status`, ngày, giờ, `DoctorId` cho audit (`:595`).
7. Transaction `Serializable` (`:597-621`):
   1. `FindSlotsAsync(lines, date, doctorId, excludeAppointmentId: appointment.Id)`: lịch đang đổi không chặn chính nó; lọc `SlotStart == slotStart`; rỗng → `SlotNotAvailable` (`:600-603`). Cách tính slot, loại phòng, cấu hình: xem F-APT-02 bước 4.
   2. Chọn slot: có `doctorId` → ứng viên đầu; không → ứng viên của bác sĩ hiện tại, nếu không có thì `PickLeastBusyAsync` (`:606-609`).
   3. Cập nhật `AppointmentDate`, `TimeSlotStart`, `TimeSlotEnd`, `DoctorId`; `Status = PENDING` nếu bệnh nhân, `CONFIRMED` nếu nhân viên; `UpdatedAt` (`:611-617`); `UpdateAsync` (`:619`).
8. Ghi audit `APPOINTMENT_RESCHEDULED` với giá trị trước/sau (`:623-624`).
9. Nhân viên đổi → `SendConfirmationNotificationAsync` (SMS + email "has been confirmed" với giờ mới; lỗi chỉ log) (`:626-629`, `:330-353`). Bệnh nhân đổi → không gửi.
10. Trả `MapToResponse` (`:631`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-08 | Bệnh nhân tự đổi `PENDING` trong hạn; `CONFIRMED` qua lễ tân; sửa trên lịch cũ, ghi audit | `AppointmentService.cs:580-587`, `:611-619`, `:623-624` |
| BR-APT-03 | Slot mới đủ tổng thời lượng, đúng loại phòng | `FindSlotsAsync` (`:600`) |
| BR-APT-04 | Khoảng đặt trước áp cho ngày mới | `FindSlotsAsync` `:203-209` |
| BR-C11 | Ghi audit | `AppointmentService.cs:623` |
| (trong code) | Nhân viên đổi → `CONFIRMED` + thông báo; bệnh nhân đổi → `PENDING` | `AppointmentService.cs:616`, `:626-629` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.AppointmentDate`, `TimeSlotStart`, `TimeSlotEnd`, `DoctorId` | Giá trị cũ | Giá trị mới | Cùng dòng, không tạo lịch mới |
| `Appointments.Status` | `PENDING` / `CONFIRMED` | `PENDING` (bệnh nhân) / `CONFIRMED` (nhân viên) | |
| `AppointmentServices` | | Không đổi | `DurationMinutes`, `PriceAtBooking` giữ nguyên |
| `AuditLogs` | - | `APPOINTMENT_RESCHEDULED` (trước/sau) | |

## 7. Liên quan

- Trước đó: F-APT-02 (tìm giờ trống, truyền cùng dịch vụ của lịch), F-APT-03/04/06.
- Sau đó: F-APT-06 (bệnh nhân đổi thì lễ tân xác nhận lại); M4 check-in; F-RCP-07 (`needs-attention` nhóm `UPCOMING` dẫn lễ tân tới đây khi bác sĩ kết thúc ca sớm).

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `RescheduleAppointmentAsync`.
- Ca cần test thêm:
  - Lễ tân đổi `PENDING` → `CONFIRMED`, có SMS; đổi `CONFIRMED` → vẫn `CONFIRMED`.
  - Bệnh nhân đổi `PENDING` > 24h → `PENDING`, không SMS; < 24h → `RescheduleDeadlinePassed`; `CONFIRMED` → `ConfirmedNeedsReceptionistToReschedule`; lịch người khác → 404.
  - Đổi sang giờ chồng với chính giờ cũ (dời 30 phút) → thành công nhờ `excludeAppointmentId`.
  - Không gửi `doctorId`, bác sĩ cũ rảnh → giữ bác sĩ cũ.
  - Lịch `CHECKED_IN` → `OnlyOpenCanBeRescheduled`.

## 9. Còn thiếu / câu hỏi mở

- **Lệch BR-C05**: khi đổi lịch, thời lượng slot mới tính lại từ `EstimatedMinutes` **hiện tại** của dịch vụ/biến thể (`BookingLine.GetMinutes`), không dùng `AppointmentServiceItem.DurationMinutes` đã chốt. Nếu danh mục đổi thời lượng sau khi đặt, `TimeSlotEnd` mới lệch với tổng `DurationMinutes`. Loại phòng cũng lấy theo dịch vụ hiện tại, và không kiểm tra lại dịch vụ còn `IsActive`.
- Lỗi "lịch không có dịch vụ" dùng message `ServiceNotFound` nhưng qua `ConditionGuard.Ensure` (không generic) nên HTTP 400, không phải 404.
- Hạn đổi dùng chung khóa `Booking.CancelCutoffHours` (khớp mục 7 tài liệu tổng).
- Bệnh nhân tự đổi không nhận SMS/email nào; lễ tân không được báo có lịch cần gọi lại (liên quan F-APT-10).
- Model validation trả `ValidationProblemDetails` (lệch BR-C07).

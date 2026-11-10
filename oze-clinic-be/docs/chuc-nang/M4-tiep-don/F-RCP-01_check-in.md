# F-RCP-01 Check-in kèm mức ưu tiên và lý do

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `ClinicManager` |
| API | `POST api/appointments/{id}/check-in` |
| Code chính | `AppointmentsController.CheckInAppointmentAsync` → `AppointmentService.CheckInAppointmentAsync` → `AppointmentRepository`, `QueueService.EnqueueAsync` → `QueueRepository.AddWithNextNumberAsync` |

## 1. Chức năng này làm gì

Bệnh nhân đã đặt lịch (lịch `CONFIRMED`) đến quầy trong ngày hẹn. Lễ tân check-in: lịch chuyển `CHECKED_IN`, được gán mức ưu tiên (mặc định thường), được đưa về phòng của ca bác sĩ và lấy số trong hàng chờ khám (`Examination`).

## 2. Tiền điều kiện

- Đăng nhập với role `Receptionist` hoặc `ClinicManager`.
- Lịch tồn tại, trạng thái `CONFIRMED` (lịch `PENDING` phải xác nhận trước – F-APT-06).
- `AppointmentDate` = ngày hôm nay theo `ClinicClock.Today` (giờ Việt Nam).
- Bác sĩ của lịch chưa bấm kết thúc ca hôm nay, hoặc vẫn còn một ca chưa kết thúc phù hợp (xem bước 7).

## 3. API

**Request** `POST api/appointments/{id}/check-in`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`

Body **không bắt buộc** (`[FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)]`). Không gửi body = ưu tiên thường, không lý do.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | `{id:long}` | Id lịch hẹn |
| `priority` | int? | Không | 0, 1, 2 (`PriorityConstants.AllowedLevels`); null = 0 | 0 `Normal`, 1 `High` (người già, thai phụ, trẻ nhỏ, đau nhiều), 2 `Urgent` (chảy máu, chấn thương, sưng nặng) |
| `reason` | string? | Khi `priority` > 0 | `[MaxLength(500)]` | Lý do ưu tiên. Ghi vào `QueueEntries.Notes` và `AuditLog` |

Ví dụ:

```json
{ "priority": 1, "reason": "Bệnh nhân 80 tuổi" }
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, message `"Patient checked in successfully"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `patientId`, `patientCode`, `patientName`, `patientPhoneNumber` | | Thông tin lịch và bệnh nhân (số điện thoại đầy đủ, không che) |
| `doctorId`, `doctorName` | | Bác sĩ của lịch |
| `serviceId`, `serviceName` | | Dịch vụ đầu tiên (giữ cho FE cũ) |
| `services[]` | `AppointmentServiceResponse` | `serviceId`, `serviceName`, `variantId`, `variantName`, `durationMinutes`, `priceAtBooking` |
| `appointmentType` | string | `BOOKED` |
| `appointmentDate`, `timeSlotStart`, `timeSlotEnd` | | Ngày, giờ hẹn |
| `status` | string | `CHECKED_IN` |
| `checkInAt` | DateTimeOffset | Thời điểm check-in (UTC) |
| `roomId`, `roomName` | | Phòng của ca bác sĩ; null nếu bác sĩ không có ca phù hợp hôm nay |
| `cancellationReason`, `notes`, `createdAt` | | |

Response **không** trả `priority` (chỉ ghi vào DB).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401/403 | Chưa đăng nhập / sai role | (do ASP.NET Core) |
| 400 | `reason` dài hơn 500 ký tự | ProblemDetails mặc định của `[ApiController]`, không bọc `ApiResponse` |
| 404 | Không có lịch | `AppointmentMessage.AppointmentNotFound`: "Appointment not found in system" |
| 400 | Lịch `PENDING` | `CheckInNeedsConfirmation`: "This appointment is not confirmed yet. Please confirm it before check-in" |
| 400 | Lịch không phải `CONFIRMED` (đã check-in, hủy, NO_SHOW...) | `OnlyConfirmedCanBeCheckedIn`: "Only a confirmed appointment can be checked in" |
| 400 | Không đúng ngày hẹn | `CheckInWrongDay`: "Check-in is only possible on the day of the appointment" |
| 400 | `priority` không thuộc 0/1/2 | `PriorityInvalid`: "Priority must be 0 (normal), 1 (high) or 2 (urgent)" |
| 400 | `priority` > 0 mà `reason` trống | `PriorityReasonRequired`: "A reason is required when the priority is above normal" |
| 400 | Không tìm được ca phù hợp **và** bác sĩ đã kết thúc một ca hôm nay | `CheckInDoctorShiftEnded`: "The doctor has already ended the shift today" |
| 500 | Không lấy được khóa cấp số hàng chờ trong 10 giây | SQL `THROW 50001 'Could not get the queue number lock.'` (môi trường không phải Development trả "An internal server error occurred.") |

## 4. Luồng xử lý trong code

1. `AppointmentsController.cs:219-228` nhận `id` và body tùy chọn, gọi service.
2. `AppointmentService.cs:655` tải lịch bằng `GetByIdWithDetailsAsync` (`AppointmentRepository.cs:262-272`, kèm Patient, Doctor, ServiceItems.Service/Variant). Không có → 404 (`:656`).
3. `AppointmentService.cs:659` lịch `PENDING` → 400 `CheckInNeedsConfirmation`.
4. `AppointmentService.cs:660` lịch khác `CONFIRMED` → 400 `OnlyConfirmedCanBeCheckedIn`.
5. `AppointmentService.cs:662` `AppointmentDate != DateOnly.FromDateTime(ClinicClock.Today)` → 400 `CheckInWrongDay`. Không giới hạn đến sớm hay trễ trong ngày.
6. `AppointmentService.cs:664-665` `priority = request?.Priority ?? PriorityConstants.Normal`; `EnsureValidPriority` (`:1137-1142`) kiểm tra mức hợp lệ và bắt buộc lý do khi > 0.
7. `AppointmentService.cs:668` `FindDoctorRoomAsync` (`:929-939`):
   - Lịch không có bác sĩ → phòng null.
   - Loại phòng cần = `RequiredRoomType` đầu tiên khác rỗng của các dịch vụ, mặc định `RoomTypeConstants.GeneralTreatment` (`:942-945`).
   - `FindDoctorShiftAsync` (`:949-965`) lấy ca hôm nay của bác sĩ qua `GetDoctorShiftsAsync` (`AppointmentRepository.cs:162-187`: `ScheduleDate` = ngày, `IsPresent != false`, `ActualEndTime == null`, nhân viên active, có role Doctor, phòng `Active`), lọc theo loại phòng, rồi chọn theo thứ tự: ca chứa giờ hẹn `TimeSlotStart` → ca đang chạy lúc `ClinicClock.Now` → ca kế tiếp trong ngày.
   - Không có ca nào: nếu `HasEndedShiftAsync` (bác sĩ đã có ca kết thúc hôm nay, `AppointmentRepository.cs:156-160`) → 400 `CheckInDoctorShiftEnded`; ngược lại phòng = null và vẫn check-in.
8. `AppointmentService.cs:670-676` đặt `Status = CHECKED_IN`, `Priority`, `CheckInAt = DateTimeOffset.UtcNow`, `UpdatedAt`; `UpdateAsync` lưu.
9. `AppointmentService.cs:678` `EnterExaminationQueueAsync` (`:968-974`) → `QueueService.EnqueueAsync` (`QueueService.cs:28-57`) tạo `QueueEntry` (`QueueType = Examination`, `RoomId` = phòng ca, `AssignedStaffId = DoctorId`, `Priority`, `Status = WAITING`, `Notes = request.Reason` chưa trim).
   - Số thứ tự: `QueueRepository.AddWithNextNumberAsync` (`QueueRepository.cs:24-46`) mở transaction, lấy `sp_getapplock` trên khóa `queue-number:Examination:yyyyMMdd` (timeout 10000 ms), `QueueNumber = max(QueueNumber trong ngày cùng loại) + 1`. Số đánh chung cho cả phòng khám theo loại hàng chờ, không theo bác sĩ/phòng.
10. `AppointmentService.cs:680-681` ghi audit `APPOINTMENT_CHECKED_IN` (cũ `{Status}`, mới `{Status, Priority}`, lý do đã trim).
11. `AppointmentService.cs:683-686` trả `MapToResponse` (`:1179-1212`) kèm `RoomId`, `RoomName`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-RCP-01 | Chỉ lịch `CONFIRMED`, đúng ngày hẹn; sớm hay trễ đều nhận | `AppointmentService.cs:659-662` |
| BR-RCP-02 | Mức ưu tiên lưu tại check-in, dùng để xếp danh sách chờ (F-RCP-04) | `AppointmentService.cs:664-672` |
| BR-C01 | Ngày hôm nay lấy từ `ClinicClock.Today` | `AppointmentService.cs:662` |
| BR-C11 | Ghi `AuditLog` kèm lý do | `AppointmentService.cs:680-681` |
| (code) | Ưu tiên > 0 bắt buộc lý do | `AppointmentService.cs:1137-1142` |
| (code) | Bệnh nhân vào phòng của ca bác sĩ phù hợp loại phòng dịch vụ | `AppointmentService.cs:929-965` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Status` | `CONFIRMED` | `CHECKED_IN` | |
| `Appointments.Priority` | 0 | 0/1/2 | CK `CK_Appointments_Priority` |
| `Appointments.CheckInAt`, `UpdatedAt` | null | `DateTimeOffset.UtcNow` | |
| `QueueEntries` | — | 1 dòng mới `Examination`, `WAITING`, `QueueNumber` mới | `Notes` = lý do ưu tiên |
| `AuditLogs` | — | `APPOINTMENT_CHECKED_IN` | |

## 7. Liên quan

- Trước đó: F-APT-06 xác nhận lịch (`CONFIRMED`).
- Sau đó: F-RCP-04 danh sách chờ, F-RCP-05 gọi số, F-RCP-03 đổi ưu tiên, F-RCP-06 NO_SHOW, F-RCP-07 đổi bác sĩ, F-EXM-01 bắt đầu khám.

## 8. Kiểm thử

- Test hiện có: `AppointmentsControllerTests.CheckInAppointmentAsync_ShouldReturnOk_WhenCheckedIn` (chỉ kiểm controller với service mock). Chưa có test service cho check-in.
- Ca cần test thêm: lịch `PENDING`; lịch đã `CHECKED_IN`; sai ngày; `priority` = 3; `priority` = 1 không lý do; không body; bác sĩ đã kết thúc ca; bác sĩ không có ca (phòng null); chọn đúng ca theo giờ hẹn khi bác sĩ có hai ca; hai quầy check-in cùng lúc không trùng số.

## 9. Còn thiếu / câu hỏi mở

- Cập nhật lịch (bước 8) và tạo hàng chờ (bước 9) **không cùng transaction**: nếu bước 9 lỗi, lịch đã `CHECKED_IN` mà không có số hàng chờ; gọi lại check-in sẽ bị chặn bởi `OnlyConfirmedCanBeCheckedIn`.
- `CheckIn.EarlyMinutes` (mục 7 Dac_ta, seed = 30) **không được code đọc**; đến sớm bao nhiêu cũng nhận.
- Bác sĩ không có ca hôm nay vẫn check-in được, `roomId` null; hàng chờ có `RoomId` null nên xuất hiện ở mọi phòng khi lọc theo `roomId` (`QueueRepository.cs:89-93`).
- Response không có `priority`; FE muốn hiển thị phải đọc từ `waiting-list`.
- `QueueEntries.Notes` lưu lý do chưa trim, còn audit lưu bản đã trim.

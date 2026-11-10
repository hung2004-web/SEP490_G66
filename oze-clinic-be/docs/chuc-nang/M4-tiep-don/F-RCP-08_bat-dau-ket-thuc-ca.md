# F-RCP-08 Bắt đầu / kết thúc ca bác sĩ (xử lý NO_SHOW khi hết ca)

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` (bắt đầu/kết thúc ca của mình); `ClinicManager` (mở lại ca, liên quan) |
| API | `POST api/doctor-schedules/{shiftId}/start`, `POST api/doctor-schedules/{shiftId}/end`; liên quan `POST api/work-shifts/{id}/reopen` |
| Code chính | `DoctorSchedulesController.StartShiftAsync` / `EndShiftAsync` → `DoctorScheduleService.StartShiftAsync` / `EndShiftAsync` (file `DoctorScheduleService .cs`, có dấu cách) → `WorkShiftRepository`, `AppointmentRepository`, `QueueService`, `AuditLogService`, `ISmsSender`, `IEmailSender` |

## 1. Chức năng này làm gì

Bác sĩ chấm công vào ca (bắt đầu) để được gọi bệnh nhân mới, và chấm công ra (kết thúc). Khi kết thúc ca, hệ thống tự xử lý bệnh nhân của ca chưa được khám: lịch đặt đã qua giờ mà chưa đến → `NO_SHOW`; người đang chờ trong phòng khám và người đặt giờ sau → báo SMS/email và chuyển cho lễ tân xử lý (F-RCP-07).

## 2. Tiền điều kiện

- Đăng nhập role `Doctor`, tài khoản có `StaffProfile`.
- Ca (`StaffSchedules`) thuộc về bác sĩ đang đăng nhập và là ca **hôm nay** (`ClinicClock.Today`).
- Bắt đầu: ca chưa bắt đầu; giờ hiện tại trong khoảng `[ShiftStart − 30 phút, ShiftEnd)`; phòng của ca không bị ca khác đang chạy chiếm.
- Kết thúc: ca đã bắt đầu, chưa kết thúc; bác sĩ không còn lịch `IN_SERVICE` trong ngày.

## 3. API

**Request** `POST api/doctor-schedules/{shiftId}/start` và `POST api/doctor-schedules/{shiftId}/end`, quyền `[Authorize(Roles = "Doctor")]` ở cấp controller. Không có body.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `shiftId` (route) | long | Có | `{shiftId:long}` | Id ca (`StaffSchedules.Id`) |

**Response bắt đầu ca** (`ApiResponse<DoctorShiftResponse>`, HTTP 200, message `"Shift started"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `scheduleDate`, `shiftStart`, `shiftEnd` | | Ca |
| `roomId`, `roomName`, `assignment` | | |
| `isPresent` | bool? | `true` sau khi bắt đầu |
| `absenceReason` | string? | `null` sau khi bắt đầu |
| `actualStartTime`, `actualEndTime` | TimeOnly? | Giờ chấm công (giờ Việt Nam) |
| `appointmentCount`, `appointments[]` | | Lịch (không `CANCELLED`) thuộc ca: `id`, `patientId`, `patientCode`, `patientName`, `appointmentType`, `timeSlotStart`, `timeSlotEnd`, `status`, `notes` |

**Response kết thúc ca** (`ApiResponse<EndShiftResponse>`, HTTP 200, message `"Shift ended: {n} marked NO_SHOW, {w} waiting and {u} upcoming patients were told to see the front desk"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `shiftId` | long | |
| `actualStartTime`, `actualEndTime` | TimeOnly? | |
| `noShowAppointmentIds` | long[] | Lịch vừa bị đánh `NO_SHOW` |
| `waitingAppointmentIds` | long[] | Người đã check-in còn chờ (không đánh dấu, lễ tân đổi bác sĩ) |
| `upcomingAppointmentIds` | long[] | Lịch đặt giờ sau thời điểm kết thúc (không đánh dấu, lễ tân đổi lịch) |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants.DoctorScheduleMessage`) |
|---|---|---|
| 401/403 | Không đăng nhập / không phải `Doctor` | (ASP.NET Core) |
| 404 | Tài khoản không có `StaffProfile` | `DoctorNotFound`: "Doctor profile not found" |
| 404 | Ca không tồn tại hoặc của bác sĩ khác | `ShiftNotFound`: "Work shift not found" |
| 400 | Ca không phải hôm nay | `ShiftNotToday`: "Only a shift of today can be started or ended" |
| 400 | (start) Ca đã bắt đầu | `ShiftAlreadyStarted`: "This shift has already been started" |
| 400 | (start) Đã qua giờ kết thúc ca | `ShiftOverCannotStart`: "The time of this shift is over, it cannot be started" |
| 400 | (start) Sớm hơn 30 phút trước giờ ca | `ShiftTooEarlyToStart`: "It is too early to start this shift" |
| 400 | (start) Phòng đang có ca khác chạy | `RoomInUse`: "The room is already used by another doctor's shift" |
| 400 | (end) Ca chưa bắt đầu | `ShiftNotStarted`: "Start the shift before ending it" |
| 400 | (end) Ca đã kết thúc | `ShiftAlreadyEnded`: "This shift has already been ended" |
| 400 | (end) Còn bệnh nhân `IN_SERVICE` | `ExaminationStillRunning`: "Finish the examination in progress before ending the shift" |

## 4. Luồng xử lý trong code

**Lấy ca của mình hôm nay** `GetOwnShiftOfTodayAsync` (`DoctorScheduleService .cs:300-309`): tra bác sĩ theo user id (`GetDoctorAsync`, `:344-349`, không có → 404 `DoctorNotFound`), tải ca, ca không có hoặc `StaffProfileId` khác → 404 `ShiftNotFound`, `ScheduleDate != ClinicClock.Today` → 400 `ShiftNotToday`. User id lấy từ claim `NameIdentifier`/`sub` (`DoctorSchedulesController.cs:59-62`).

### 4.1 Bắt đầu ca

1. `DoctorSchedulesController.cs:40-45` → `DoctorScheduleService .cs:84-114`.
2. `:86-87` lấy ca; `ActualStartTime != null` → `ShiftAlreadyStarted`.
3. `:90-91` `now = TimeOnly(ClinicClock.Now)`; `now >= ShiftEnd` → `ShiftOverCannotStart`.
4. `:93-94` `now < ShiftStart − WorkShiftConstants.ClockInEarlyMinutes (30)` → `ShiftTooEarlyToStart` (so sánh bằng `TimeSpan` để không quay vòng qua nửa đêm).
5. `:97-101` ca có phòng: `HasRunningShiftInRoomAsync` (`WorkShiftRepository.cs:62-70`: ca khác cùng phòng, cùng ngày, đã bắt đầu, chưa kết thúc) → `RoomInUse`.
6. `:103-108` `IsPresent = true`, `AbsenceReason = null`, `ActualStartTime = giờ hiện tại`, lưu.
7. `:110` audit `STAFF_SHIFT_STARTED` (entity `StaffSchedule`).
8. `:112-113` trả ca kèm lịch thuộc ca (`ToResponse`, `:352-388`).

Hệ quả: từ lúc này `QueueRepository.IsOffDutyAsync` trả false, bác sĩ được gọi bệnh nhân mới (F-RCP-05), thấy đủ `waiting-list` (F-RCP-04) và bắt đầu khám (`AppointmentService.cs:1031-1035`).

### 4.2 Kết thúc ca

1. `DoctorSchedulesController.cs:51-57` → `DoctorScheduleService .cs:116-179`.
2. `:118-120` lấy ca; chưa bắt đầu → `ShiftNotStarted`; đã kết thúc → `ShiftAlreadyEnded`.
3. `:122-124` `nowTime` theo `ClinicClock.Now`; `GetDoctorOpenAppointmentsAsync` (`AppointmentRepository.cs:142-154`): lịch hôm nay của bác sĩ ở `PENDING`/`CONFIRMED`/`CHECKED_IN`/`IN_SERVICE` (mọi ca trong ngày).
4. `:127-128` có lịch `IN_SERVICE` → `ExaminationStillRunning`.
5. `:135` đọc audit `STAFF_SHIFT_ENDED` gần nhất của ca (`GetLastShiftEndedAsync`, `:272-293`) để biết ai đã được báo (khi ca từng kết thúc rồi mở lại).
6. `:138-159` duyệt lịch **chưa có phiếu khám** và **thuộc ca** (`ShiftTimeHelper.IsInShift`: mốc `TimeSlotStart`, walk-in dùng giờ check-in; `ShiftStart ≤ mốc < ShiftEnd`):
   - `CHECKED_IN` → thêm vào `waitingAppointmentIds`, cần báo (`:140-145`).
   - `IsLate` (`:312-317`: `CONFIRMED` và `TimeSlotStart <= nowTime`) → ghi lại trạng thái cũ vào `restorable`, `MarkNoShowAsync` (`:319-337`: `Status = NO_SHOW`, lưu, audit `APPOINTMENT_NO_SHOW` với lý do `NoShowReason` = "The doctor ended the shift before the patient was examined"), thêm vào `noShowAppointmentIds` (`:146-152`).
   - `TimeSlotStart > nowTime` (cả `PENDING` và `CONFIRMED`) → `upcomingAppointmentIds`, cần báo (`:153-158`).
   - Còn lại (ví dụ `PENDING` đã qua giờ) → không làm gì.
7. `:162-165` cuối cùng mới đặt `ActualEndTime = nowTime` và lưu (lỗi giữa chừng thì ca còn mở, kết thúc lại sẽ làm tiếp).
8. `:168-175` audit `STAFF_SHIFT_ENDED` với `{ActualEndTime, NoShow, Restorable, Notified}`; `Notified` = người đã báo trước đó ∪ người mới báo.
9. `:177` `NotifyShiftEndedAsync` (`:182-206`) gửi SMS và email cho người **chưa từng được báo**:
   - Đang chờ: `ShiftEndedWaitingNotice` = "OZE Dental: {0} has ended the shift. Please see the front desk to be moved to another doctor."
   - Đặt giờ sau: `ShiftEndedUpcomingNotice` = "OZE Dental: {0} has ended the shift early. Your appointment at {1} on {2} needs to change. Please contact the front desk to reschedule."
   - Tiêu đề email: `ShiftEndedNoticeSubject` = "OZE Dental - Your appointment needs to change". Lỗi gửi chỉ log, không hoàn tác.

### 4.3 Mở lại ca (liên quan, quản lý)

`POST api/work-shifts/{id}/reopen`, `[Authorize(Roles = "ClinicManager")]` (`WorkShiftAttendanceController.cs:28-34`) → `DoctorScheduleService .cs:208-263`: chỉ ca đã kết thúc (`ShiftNotEnded`), hôm nay và chưa qua `ShiftEnd` (`ShiftTimeOver`), phòng không bị ca khác chiếm (`RoomInUse`). Khôi phục các lịch trong `Restorable` của lần kết thúc gần nhất nếu vẫn còn `NO_SHOW` (trạng thái cũ `CHECKED_IN` thì tạo lại số hàng chờ), audit `APPOINTMENT_NO_SHOW_REVERTED`; đặt `ActualEndTime = null`; audit `STAFF_SHIFT_REOPENED`. Message `"Shift reopened, {n} patient(s) restored"`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-RCP-05 | Hết ca: lịch quá giờ chưa đến → `NO_SHOW`, lý do ghi audit | `DoctorScheduleService .cs:146-152`, `:319-337` |
| BR-RCP-05 | Người đã check-in còn chờ không tự `NO_SHOW`, đưa vào `needs-attention` | `DoctorScheduleService .cs:140-145` |
| BR-C01 | Giờ chấm công theo `ClinicClock` | `DoctorScheduleService .cs:90`, `:122` |
| BR-C11 | Audit bắt đầu/kết thúc ca, NO_SHOW | `:110`, `:169-175`, `:334-335` |
| (code) | Bắt đầu sớm tối đa 30 phút (hằng số, không phải cấu hình) | `DoctorScheduleService .cs:93-94`, `WorkShiftConstants.cs:16` |
| (code) | Một phòng một ca đang chạy | `DoctorScheduleService .cs:97-101` |
| (code) | Không kết thúc ca khi đang khám dở | `DoctorScheduleService .cs:127-128` |
| (code) | Người đã được khám (quay về từ X-quang) không bị xử lý | `DoctorScheduleService .cs:138` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `StaffSchedules` (start) | `ActualStartTime = null` | `ActualStartTime`, `IsPresent = true`, `AbsenceReason = null` | |
| `StaffSchedules` (end) | `ActualEndTime = null` | `ActualEndTime` | |
| `Appointments.Status` (end) | `CONFIRMED`, đã qua giờ hẹn | `NO_SHOW` | Người `CHECKED_IN` không đổi |
| `QueueEntries` (end) | | Không đổi | Người chờ vẫn giữ số của bác sĩ cũ đến khi đổi bác sĩ |
| `AuditLogs` | — | `STAFF_SHIFT_STARTED` / `STAFF_SHIFT_ENDED`, `APPOINTMENT_NO_SHOW` | `STAFF_SHIFT_ENDED` chứa dữ liệu để mở lại ca |
| SMS/email | — | Gửi cho người chờ và người đặt giờ sau | |

## 7. Liên quan

- Trước đó: lịch ca do quản lý xếp (M2).
- Sau đó: F-RCP-05/F-RCP-04/F-EXM-01 (bác sĩ trong ca); F-RCP-07 needs-attention và đổi bác sĩ; F-APT-08 đổi lịch cho người `UPCOMING`; mở lại ca nếu kết thúc nhầm.

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `DoctorScheduleService`.
- Ca cần test thêm: bắt đầu sớm hơn 30 phút / đúng mốc 30 phút / sau giờ kết thúc; phòng bị chiếm; kết thúc khi có `IN_SERVICE`; phân loại `NO_SHOW` / waiting / upcoming; lịch có Examination bị bỏ qua; lịch thuộc ca khác cùng ngày không bị đụng; không gửi lại thông báo sau khi mở lại ca rồi kết thúc lần nữa; mở lại ca khôi phục `NO_SHOW`.

## 9. Còn thiếu / câu hỏi mở

- NO_SHOW áp dụng ngay khi `TimeSlotStart <= giờ kết thúc`, **không có thời gian ân hạn**; `CheckIn.LateMinutes` không được dùng ở đây dù mô tả seed (`SystemConfigurationConfiguration.cs:34`) nói "Số phút đến muộn trước khi đánh dấu NO_SHOW".
- Lịch `PENDING` đã qua giờ hẹn khi kết thúc ca không bị NO_SHOW, không vào waiting/upcoming, không ai được báo. Dac_ta chỉ nói `CONFIRMED → NO_SHOW`; chưa xác định trường hợp `PENDING`.
- Người `CHECKED_IN` giữ bản ghi hàng chờ `WAITING` của bác sĩ cũ sau khi ca kết thúc; bảng số ở sảnh vẫn hiện họ cho tới khi đổi bác sĩ.
- `ExaminationStillRunning` xét mọi lịch `IN_SERVICE` của bác sĩ trong ngày, không riêng ca đang kết thúc.
- Thời gian sớm 30 phút là hằng số `WorkShiftConstants.ClockInEarlyMinutes`, không nằm trong `SystemConfigurations` (BR-C12).
- Các bước kết thúc ca không trong một transaction: NO_SHOW được lưu từng lịch trước khi ca được đánh dấu kết thúc.
- Dac_ta bảng M4 không nhắc API mở lại ca `api/work-shifts/{id}/reopen` (quản lý).
- Thông báo SMS/email viết tiếng Anh.

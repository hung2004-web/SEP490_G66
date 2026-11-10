# F-ADM-05 Ca làm việc, lịch bác sĩ, mở lại ca

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2 (F-ADM-05) và M4 (F-RCP-08).

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Ca làm việc, mở lại ca: `ClinicManager`. Lịch của tôi, bắt đầu/kết thúc ca: `Doctor` |
| API | `POST/GET api/work-shifts`, `GET/PUT/DELETE api/work-shifts/{id}`, `POST api/work-shifts/{id}/reopen`, `GET api/doctor-schedules`, `GET api/doctor-schedules/{shiftId}`, `POST api/doctor-schedules/{shiftId}/start`, `POST api/doctor-schedules/{shiftId}/end` |
| Code chính | `WorkShiftController` → `WorkShiftService` (`IWorkShipService`) → `WorkShiftRepository`; `WorkShiftAttendanceController`, `DoctorSchedulesController` → `DoctorScheduleService` (file `DoctorScheduleService .cs`, có dấu cách) → `WorkShiftRepository`, `AppointmentRepository`, `AuditLogRepository` |

## 1. Chức năng này làm gì

Quản lý xếp ca cho nhân viên theo ngày, giờ, phòng (bảng `StaffSchedules`), sửa và xóa ca chưa bắt đầu. Bác sĩ xem lịch ca của mình kèm bệnh nhân trong ca, chấm công vào/ra ca. Nếu bác sĩ kết thúc ca nhầm, quản lý **mở lại ca** và trả các bệnh nhân bị đánh `NO_SHOW` lúc kết thúc ca về trạng thái cũ.

> Bắt đầu/kết thúc ca thuộc mã F-RCP-08 (M4) trong Dac_ta. Ghi ở đây vì cùng controller và vì mở lại ca dựa vào dữ liệu kết thúc ca ghi ra.

## 2. Tiền điều kiện

- `api/work-shifts/*`: đăng nhập, role `ClinicManager` (`WorkShiftController.cs:11`, `WorkShiftAttendanceController.cs:14`).
- `api/doctor-schedules/*`: đăng nhập, role `Doctor` (`DoctorSchedulesController.cs:12`); user phải có `StaffProfile` (nếu không 404 `DoctorNotFound`).
- Tạo/sửa ca: nhân viên tồn tại và `IsActive`; phòng (nếu chọn) tồn tại và `Status = Active`.
- Mở lại ca: ca đã kết thúc (`ActualEndTime != null`), là ca hôm nay và chưa hết giờ ca.

## 3. API

> `WorkShiftController`, `WorkShiftAttendanceController`, `DoctorSchedulesController` **không** có `[ApiResponseValidationFilter]`: thiếu trường `[Required]` trả 400 `ValidationProblemDetails` mặc định (message mặc định của ASP.NET, ví dụ "The StaffUserId field is required.").
> Định dạng JSON: `DateOnly` là `"yyyy-MM-dd"`, `TimeOnly` là `"HH:mm:ss"`.

### 3.1 `POST api/work-shifts` – tạo ca (ClinicManager)

Body `CreateWorkShiftRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `staffUserId` | string | Có | `[Required]`; phải là `StaffProfile.UserId` đang hoạt động | Nhân viên nhận ca (id tài khoản) |
| `scheduleDate` | DateOnly? | Có | `[Required]`; ≥ hôm nay (`ClinicClock`) | Ngày ca |
| `shiftStart` | TimeOnly? | Có | `[Required]`; < `shiftEnd` | Giờ bắt đầu |
| `shiftEnd` | TimeOnly? | Có | `[Required]` | Giờ kết thúc |
| `roomId` | int? | Không | Phòng tồn tại, `Active`, không trùng giờ với ca khác trong phòng | Phòng |
| `assignment` | string? | Không | trim | Nhiệm vụ |
| `note` | string? | Không | trim, lưu vào `Notes` | Ghi chú |

```json
{
  "staffUserId": "6f1c...",
  "scheduleDate": "2026-11-12",
  "shiftStart": "08:00:00",
  "shiftEnd": "12:00:00",
  "roomId": 1,
  "assignment": "Khám tổng quát",
  "note": null
}
```

Response `ApiResponse<WorkShipResponse>`, HTTP 200, `message = "Work shift created successfully"`.

### 3.2 `GET api/work-shifts` – danh sách ca (ClinicManager)

Query `WorkShiftQueryRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `FromDate` | DateOnly? | Không | Mặc định thứ Hai của tuần hiện tại | Từ ngày |
| `ToDate` | DateOnly? | Không | Mặc định `FromDate + 6`; phải ≥ `FromDate` | Đến ngày |
| `StaffUserId` | string? | Không | | Lọc nhân viên |
| `RoomId` | int? | Không | | Lọc phòng |

Response `ApiResponse<List<WorkShipResponse>>`, HTTP 200, sắp theo `ScheduleDate`, `ShiftStart`.

### 3.3 `GET api/work-shifts/{id}` – chi tiết ca

`id` là `long`. Response `ApiResponse<WorkShipResponse>`, HTTP 200.

### 3.4 `PUT api/work-shifts/{id}` – sửa ca

Body `UpdateWorkShiftRequest`, cùng trường và ràng buộc như 3.1 (ghi đè toàn bộ). Response `ApiResponse<WorkShipResponse>`, HTTP 200, `message = "Work shift updated successfully"`.

### 3.5 `DELETE api/work-shifts/{id}` – xóa ca

Response `ApiResponse`, HTTP 200, `message = "Work shift deleted successfully"`.

### 3.6 `POST api/work-shifts/{id}/reopen` – mở lại ca (ClinicManager)

Không body. Response `ApiResponse<ReopenShiftResponse>`, HTTP 200, `message = "Shift reopened, {n} patient(s) restored"`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `shiftId` | long | Id ca |
| `restoredAppointmentIds` | long[] | Lịch đã được trả từ `NO_SHOW` về trạng thái trước |
| `skippedAppointmentIds` | long[] | Lịch trong log kết thúc ca nhưng đã đổi trạng thái sau đó, để nguyên |

### `WorkShipResponse`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | long | Id ca |
| `staffUserId` | string | Id tài khoản nhân viên |
| `staffName` | string | Họ tên |
| `roomId` / `roomName` | int? / string? | Phòng |
| `scheduleDate` | DateOnly | Ngày |
| `shiftStart` / `shiftEnd` | TimeOnly | Giờ ca |
| `assignment` | string? | Nhiệm vụ |
| `isPresent` | bool? | `null` chưa chấm, `true` có mặt |
| `absenceReason` | string? | Lý do vắng (API không ghi trường này) |
| `actualStartTime` / `actualEndTime` | TimeOnly? | Giờ vào/ra thực tế; có `actualEndTime` là ca mở lại được |
| `notes` | string? | Ghi chú |
| `createdAt` | DateTimeOffset | Lúc tạo |

### 3.7 `GET api/doctor-schedules` – lịch ca của tôi (Doctor)

Query `DoctorScheduleQueryRequest`: `FromDate` (DateOnly?, mặc định thứ Hai tuần này), `ToDate` (DateOnly?, mặc định `FromDate + 6`). Khoảng phải `FromDate ≤ ToDate` và **tối đa 7 ngày**. Luôn lọc theo user đang đăng nhập, không nhận id từ client.

Response `ApiResponse<List<DoctorShiftResponse>>`, HTTP 200.

### 3.8 `GET api/doctor-schedules/{shiftId}` – chi tiết một ca của tôi (Doctor)

Ca của bác sĩ khác trả 404 (không lộ là có tồn tại). Response `ApiResponse<DoctorShiftResponse>`.

### `DoctorShiftResponse`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `scheduleDate`, `shiftStart`, `shiftEnd`, `roomId`, `roomName`, `assignment`, `isPresent`, `absenceReason`, `actualStartTime`, `actualEndTime` | như `WorkShipResponse` | Thông tin ca |
| `appointmentCount` | int | Số lịch hẹn thuộc ca |
| `appointments` | `DoctorAppointmentResponse[]` | `id`, `patientId`, `patientCode`, `patientName`, `appointmentType`, `timeSlotStart`, `timeSlotEnd`, `status`, `notes`; sắp theo giờ trong ca |

Lịch hẹn "thuộc ca" khi giờ của nó nằm trong `[ShiftStart, ShiftEnd)`: lịch đặt trước dùng `TimeSlotStart`, walk-in dùng giờ `CheckInAt` (`ShiftTimeHelper`).

### 3.9 `POST api/doctor-schedules/{shiftId}/start` – bắt đầu ca (Doctor, F-RCP-08)

Response `ApiResponse<DoctorShiftResponse>`, `message = "Shift started"`.

### 3.10 `POST api/doctor-schedules/{shiftId}/end` – kết thúc ca (Doctor, F-RCP-08)

Response `ApiResponse<EndShiftResponse>`, `message = "Shift ended: {a} marked NO_SHOW, {b} waiting and {c} upcoming patients were told to see the front desk"`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `shiftId` | long | Id ca |
| `actualStartTime` / `actualEndTime` | TimeOnly? | Giờ vào/ra |
| `noShowAppointmentIds` | long[] | Lịch `CONFIRMED` đã qua giờ mà chưa đến → `NO_SHOW` |
| `waitingAppointmentIds` | long[] | Bệnh nhân `CHECKED_IN` đang chờ, không đánh dấu, báo đến quầy |
| `upcomingAppointmentIds` | long[] | Lịch giờ còn tới, không đánh dấu, báo đổi lịch |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu trường `[Required]` | Message mặc định ASP.NET, dạng `ValidationProblemDetails` |
| 400 | `shiftStart >= shiftEnd` | `WorkShiftMessage.InvalidTimeRange` "Shift start time must be earlier than end time" |
| 400 | Ngày ca ở quá khứ | `WorkShiftMessage.PastDate` "Shift date cannot be in the past" |
| 404 | Không có nhân viên | `WorkShiftMessage.StaffNotFound` "Staff not found" |
| 400 | Nhân viên đã vô hiệu | `WorkShiftMessage.StaffInactive` "Staff account is inactive" |
| 404 | Không có phòng | `WorkShiftMessage.RoomNotFound` "Room not found" |
| 400 | Phòng không `Active` | `WorkShiftMessage.RoomNotActive` "Room is not active" |
| 400 | Nhân viên đã có ca chồng giờ | `WorkShiftMessage.ShiftOverlap` "This staff member already has a shift that overlaps this time" |
| 400 | Phòng đã có ca chồng giờ | `WorkShiftMessage.RoomOverlap` "This room is already used by another shift at that time" |
| 404 | Không có ca (`work-shifts`) | `WorkShiftMessage.WorkShiftNotFound` "Work shift not found" |
| 400 | `FromDate > ToDate` (`work-shifts`) | `WorkShiftMessage.InvalidDateRange` "From date must be earlier than or equal to to date" |
| 400 | Xóa ca đã bắt đầu/đã qua | `WorkShiftMessage.ShiftAlreadyStarted` "Cannot delete a work shift that has already started or passed" |
| 400 | Xóa ca còn lịch hẹn | `WorkShiftMessage.ShiftHasAppointments` "Cannot delete this work shift because it has booked appointments. Please move the appointments first" |
| 400 | Sửa ca đã bắt đầu/đã qua | `WorkShiftMessage.CannotUpdateStartedShift` "Cannot update a work shift that has already started or passed" |
| 400 | Đổi nhân viên/ngày/giờ của ca còn lịch hẹn | `WorkShiftMessage.ShiftHasAppointmentsCannotChange` "Cannot change staff, date or time of this work shift because it has booked appointments. Please move the appointments first" |
| 404 | User không có `StaffProfile` (doctor-schedules) | `DoctorScheduleMessage.DoctorNotFound` "Doctor profile not found" |
| 404 | Không có ca / ca của người khác (doctor-schedules, reopen) | `DoctorScheduleMessage.ShiftNotFound` "Work shift not found" |
| 400 | `FromDate > ToDate` (doctor-schedules) | `DoctorScheduleMessage.InvalidDateRange` "From date must be earlier than or equal to to date" |
| 400 | Khoảng xem > 7 ngày | `DoctorScheduleMessage.DateRangeTooLong` "You can view at most one week at a time" |
| 400 | Start/end ca không phải hôm nay | `DoctorScheduleMessage.ShiftNotToday` "Only a shift of today can be started or ended" |
| 400 | Start ca đã start | `DoctorScheduleMessage.ShiftAlreadyStarted` "This shift has already been started" |
| 400 | Start khi đã hết giờ ca | `DoctorScheduleMessage.ShiftOverCannotStart` "The time of this shift is over, it cannot be started" |
| 400 | Start sớm hơn 30 phút trước giờ ca | `DoctorScheduleMessage.ShiftTooEarlyToStart` "It is too early to start this shift" |
| 400 | Start/reopen khi phòng đang có ca khác chạy | `DoctorScheduleMessage.RoomInUse` "The room is already used by another doctor's shift" |
| 400 | End khi chưa start | `DoctorScheduleMessage.ShiftNotStarted` "Start the shift before ending it" |
| 400 | End ca đã end | `DoctorScheduleMessage.ShiftAlreadyEnded` "This shift has already been ended" |
| 400 | End khi còn bệnh nhân `IN_SERVICE` | `DoctorScheduleMessage.ExaminationStillRunning` "Finish the examination in progress before ending the shift" |
| 400 | Reopen ca chưa end | `DoctorScheduleMessage.ShiftNotEnded` "This shift has not been ended" |
| 400 | Reopen ca không phải hôm nay hoặc đã hết giờ | `DoctorScheduleMessage.ShiftTimeOver` "The time of this shift is over, it cannot be reopened" |

## 4. Luồng xử lý trong code

**Tạo ca** – `WorkShiftController.cs:23` → `WorkShiftService.CreateWorkShipAsync`
1. Lấy `ScheduleDate`, `ShiftStart`, `ShiftEnd` (đã qua `[Required]`) – `WorkShiftService.cs:32-34`.
2. `shiftStart < shiftEnd` – `:36`; ngày ≥ hôm nay – `:37`.
3. `StaffRepository.GetByUserIdAsync`, không có → 404, không hoạt động → 400 – `:39-41`.
4. Có `roomId`: phòng tồn tại, `Active` – `:43-49`.
5. `HasOverlapAsync` (ca cùng nhân viên cùng ngày giao giờ) – `:51-52`, `WorkShiftRepository.cs:84-92`.
6. Có `roomId`: `HasRoomOverlapAsync` – `WorkShiftService.cs:55-59`, `WorkShiftRepository.cs:74-82`.
7. Tạo `StaffSchedule`, lưu – `WorkShiftService.cs:61-74`; map `ToResponse` – `:79-99`.

**Danh sách / chi tiết**
1. Mặc định tuần hiện tại (thứ Hai, `WorkShiftConstants.WeekStartDay`) – `WorkShiftService.cs:103-104`, `:136-141`; kiểm khoảng – `:106`.
2. `WorkShiftRepository.GetAllAsync` (include `StaffProfile`, `Room`, lọc, sắp) – `WorkShiftRepository.cs:27-49`.
3. Chi tiết: `GetByIdAsync`, null → 404 – `WorkShiftService.cs:112-117`.

**Sửa ca** – `WorkShiftController.cs:49` → `WorkShiftService.UpdateWorkShiftAsync`
1. Tìm ca, null → 404 – `WorkShiftService.cs:145-146`.
2. Giờ bắt đầu **cũ** phải sau hiện tại – `:149-150`.
3. Kiểm giờ, ngày, nhân viên, phòng như khi tạo – `:153-170`.
4. Nếu đổi nhân viên/ngày/giờ: `HasBookedAppointmentsAsync` với giá trị **cũ** → `ShiftHasAppointmentsCannotChange` – `:172-183`, `WorkShiftRepository.cs:94-104`.
5. Chồng giờ nhân viên, phòng (loại trừ chính ca) – `WorkShiftService.cs:186-194`.
6. Gán, `Update`, lưu – `:196-206`; trả với nhân viên/phòng mới – `:209`.

**Xóa ca** – `WorkShiftController.cs:43` → `WorkShiftService.DeleteWorkShiftAsync`
1. Tìm ca – `WorkShiftService.cs:121-122`.
2. Giờ bắt đầu phải sau hiện tại – `:125-126`.
3. Còn lịch hẹn (không `CANCELLED`, không `NO_SHOW`, cùng bác sĩ, cùng ngày, giao giờ) → `ShiftHasAppointments` – `:128-130`.
4. Xóa cứng – `:132-133`.

**Lịch của tôi** – `DoctorSchedulesController.cs:25`, `:33` → `DoctorScheduleService`
1. `GetDoctorAsync` (404 `DoctorNotFound`) – `DoctorScheduleService .cs:54`, `:344-349`.
2. Mặc định tuần, kiểm khoảng và tối đa 7 ngày – `:56-60`.
3. Lấy ca theo `userId` đăng nhập và lịch hẹn của bác sĩ trong khoảng – `:63-64`.
4. `ToResponse` lọc lịch thuộc ca (`ShiftTimeHelper.IsInShift`), sắp theo giờ – `:352-388`.
5. Chi tiết: ca không phải của mình → 404 – `:74-77`.

**Bắt đầu ca** – `DoctorSchedulesController.cs:41` → `StartShiftAsync`
1. `GetOwnShiftOfTodayAsync`: ca của mình (404) và là hôm nay – `DoctorScheduleService .cs:86`, `:300-309`.
2. Chưa start – `:87`; chưa hết giờ ca – `:91`; không sớm hơn 30 phút (`ClockInEarlyMinutes`) – `:93-94`.
3. Phòng không có ca khác đang chạy (`HasRunningShiftInRoomAsync`) – `:97-101`, `WorkShiftRepository.cs:64-72`.
4. `IsPresent = true`, `AbsenceReason = null`, `ActualStartTime = giờ hiện tại`, lưu – `DoctorScheduleService .cs:103-108`.
5. Audit `STAFF_SHIFT_STARTED` – `:110`.

**Kết thúc ca** – `DoctorSchedulesController.cs:52` → `EndShiftAsync`
1. Ca của mình hôm nay, đã start, chưa end – `DoctorScheduleService .cs:118-120`.
2. Lấy lịch mở của bác sĩ trong ngày; có `IN_SERVICE` → `ExaminationStillRunning` – `:124-128`.
3. Đọc danh sách đã báo từ log kết thúc ca trước (nếu ca từng được mở lại) – `:135`.
4. Với lịch thuộc ca và chưa có phiếu khám – `:138`:
   - `CHECKED_IN` → `WaitingAppointmentIds`, cần báo – `:140-145`;
   - `CONFIRMED` đã qua giờ (`IsLate`) → đánh `NO_SHOW` (audit `APPOINTMENT_NO_SHOW`, lý do `NoShowReason`), ghi vào `restorable` – `:146-152`, `:312-337`;
   - giờ còn tới → `UpcomingAppointmentIds`, cần báo – `:153-158`.
5. Đặt `ActualEndTime`, lưu (làm cuối để lỗi giữa chừng thì gọi lại được) – `:162-165`.
6. Audit `STAFF_SHIFT_ENDED` với `Restorable` (id + trạng thái cũ) và `Notified` – `:169-175`.
7. Gửi SMS + email cho người chưa từng báo; lỗi gửi chỉ log – `:177`, `:182-206`.

**Mở lại ca** – `WorkShiftAttendanceController.cs:29` → `DoctorScheduleService.ReopenShiftAsync`
1. Tìm ca (404 `ShiftNotFound`) – `DoctorScheduleService .cs:210-211`.
2. Đã end – `:212`; là hôm nay và giờ hiện tại < `ShiftEnd` – `:215-216`.
3. Phòng không có ca khác đang chạy – `:219-223`.
4. Đọc log `STAFF_SHIFT_ENDED` mới nhất của ca (`AuditLogRepository.GetLatestAsync`), lấy `Restorable` – `:226`, `:266-293`.
5. Với mỗi lịch: nếu không còn `NO_SHOW` hoặc trạng thái cũ không phải `CHECKED_IN`/`CONFIRMED` → `SkippedAppointmentIds` – `:228-235`.
6. Ngược lại trả `Status` về trạng thái cũ, cập nhật – `:237-239`; nếu là `CHECKED_IN` thì vào lại hàng chờ khám (số mới, cuối nhóm ưu tiên) – `:242-245`; audit `APPOINTMENT_NO_SHOW_REVERTED` lý do `ShiftReopenedReason` – `:247-251`.
7. `ActualEndTime = null`, lưu – `:256-259`; audit `STAFF_SHIFT_REOPENED` – `:261`.
8. Controller ghép message số người đã khôi phục – `WorkShiftAttendanceController.cs:31-33`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-C01 | Ngày giờ nghiệp vụ theo `ClinicClock` | Toàn bộ `WorkShiftService`, `DoctorScheduleService` |
| BR-RCP-05 | Hết ca: lịch quá giờ chưa đến → `NO_SHOW` (ghi audit); người đã check-in không tự `NO_SHOW` | `DoctorScheduleService .cs:138-159` |
| BR-C11 | Bắt đầu/kết thúc/mở lại ca, `NO_SHOW` và hoàn tác ghi `AuditLog` | `DoctorScheduleService .cs:110`, `:169`, `:249`, `:261`, `:334` |
| BR-ADM-03 | Ca chỉ xếp vào phòng `Active` (phía ca) | `WorkShiftService.cs:48`, `:169` |
| (code) | Một nhân viên không có hai ca chồng giờ trong ngày; một phòng không có hai ca chồng giờ | `WorkShiftService.cs:51-59`, `:186-194` |
| (code) | Chỉ xếp ca cho nhân viên đang hoạt động | `WorkShiftService.cs:41`, `:162` |
| (code) | Chỉ sửa/xóa ca chưa bắt đầu; ca còn lịch hẹn không xóa, không đổi người/ngày/giờ | `WorkShiftService.cs:126-130`, `:150`, `:177-183` |
| (code) | Bác sĩ chỉ xem/chấm công ca của mình; ca người khác trả 404 | `DoctorScheduleService .cs:63`, `:76`, `:305` |
| (code) | Vào ca sớm tối đa 30 phút, trước khi ca hết giờ; một phòng chỉ một ca đang chạy | `DoctorScheduleService .cs:91-101` |
| (code) | Mở lại ca chỉ trong giờ ca hôm nay; chỉ hoàn tác lịch vẫn còn `NO_SHOW` | `DoctorScheduleService .cs:215-235` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `StaffSchedules` | (không có) | dòng mới | Tạo ca |
| `StaffSchedules` | có | sửa / xóa cứng | Chỉ ca chưa bắt đầu |
| `StaffSchedules.IsPresent`, `ActualStartTime` | `null` | `true`, giờ vào | Start |
| `StaffSchedules.ActualEndTime` | `null` | giờ ra | End; reopen đặt lại `null` |
| `Appointments.Status` | `CONFIRMED` | `NO_SHOW` | End, lịch quá giờ chưa đến |
| `Appointments.Status` | `NO_SHOW` | `CONFIRMED` / `CHECKED_IN` | Reopen; `CHECKED_IN` vào lại hàng chờ |
| `AuditLogs` | | `STAFF_SHIFT_STARTED`, `STAFF_SHIFT_ENDED`, `STAFF_SHIFT_REOPENED`, `APPOINTMENT_NO_SHOW`, `APPOINTMENT_NO_SHOW_REVERTED` | Entity `StaffSchedule` / `Appointment` |
| SMS, email | | gửi cho bệnh nhân chờ / sắp tới | End (`ShiftEndedWaitingNotice`, `ShiftEndedUpcomingNotice`) |

## 7. Liên quan

- Trước đó: F-ADM-01 (nhân viên hoạt động), F-ADM-03 (phòng `Active`).
- Sau đó: F-APT-02 (slot trống theo ca bác sĩ), F-RCP-04/05 (hàng chờ theo phòng của ca), F-RCP-07 (`needs-attention`, đổi bác sĩ cho người chờ khi bác sĩ kết thúc ca), F-ADM-01 (không vô hiệu hóa người còn ca), F-ADM-03 (không ngừng phòng còn ca).

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `WorkShiftService`, `DoctorScheduleService`, các controller ca.
- Ca cần test thêm: chồng giờ nhân viên/phòng (biên `ShiftEnd == ShiftStart` không chồng); sửa ca loại trừ chính nó; xóa/sửa ca đã bắt đầu; đổi giờ ca còn lịch; start sớm 31 phút / đúng 30 phút; start khi phòng có ca khác chạy; end khi còn `IN_SERVICE`; end phân loại `NO_SHOW` / waiting / upcoming; end lần 2 sau reopen không báo lại người đã báo; reopen sau giờ ca; reopen bỏ qua lịch đã đổi trạng thái.

## 9. Còn thiếu / câu hỏi mở

- Tạo/sửa ca chỉ kiểm **ngày** ≥ hôm nay, không kiểm giờ: tạo được ca hôm nay có giờ bắt đầu đã qua.
- Không kiểm vai trò nhân viên hay loại phòng: lễ tân có thể được xếp vào phòng X-quang. Chưa xác định từ code có cần ràng buộc này không.
- Dữ liệu vắng mặt `IsPresent = false`, `AbsenceReason` có cột nhưng không API nào ghi (liên quan F-ADM-07).
- `GET api/work-shifts` không giới hạn độ dài khoảng ngày (khác `doctor-schedules` giới hạn 7 ngày).
- Lỗi validation trả `ValidationProblemDetails` không phải `ApiResponse` (BR-C07); message thành công viết cứng (BR-C08).
- Tạo/sửa/xóa ca không ghi `AuditLog`.
- `ShiftTimeHelper.GetTimeInShift` dùng `CheckInAt.Value.LocalDateTime` (múi giờ của server), không dùng `ClinicClock` – có thể lệch BR-C01 nếu server không chạy giờ Việt Nam.
- `WorkShiftRepository.GetConfigValueAsync` ném `NotImplementedException` (`WorkShiftRepository.cs:59-62`); hiện không nơi nào gọi.
- Mở lại ca phụ thuộc `AuditLog`: nếu `IAuditLogRepository` không được inject (tham số tùy chọn) thì không khôi phục được ai.
- Tên lớp/interface viết sai chính tả `IWorkShipService`, `WorkShipResponse`, `CreateWorkShipAsync` (giữ nguyên trong tài liệu theo code).

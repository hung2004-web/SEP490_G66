# F-RCP-07 Danh sách cần xử lý sau hết ca và đổi bác sĩ

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `ClinicManager` |
| API | `GET api/appointments/needs-attention`, `POST api/appointments/{id}/reassign-doctor` |
| Code chính | `AppointmentsController.GetNeedsAttentionAsync` → `AppointmentService.GetNeedsAttentionAsync`; `AppointmentsController.ReassignDoctorAsync` → `AppointmentService.ReassignDoctorAsync` → `AppointmentRepository`, `QueueService` |

## 1. Chức năng này làm gì

Khi bác sĩ kết thúc ca (F-RCP-08), những người đã check-in còn đang chờ không bị NO_SHOW mà được đưa vào danh sách "cần xử lý" (nhóm `WAITING`), cùng với người đặt lịch cho giờ sau lúc bác sĩ rời đi (nhóm `UPCOMING`). Lễ tân xem danh sách này, chuyển người đang chờ sang bác sĩ khác có ca hôm nay (`reassign-doctor`), và gọi điện đổi lịch cho người `UPCOMING` (đổi lịch dùng F-APT-08).

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist` hoặc `ClinicManager`.
- `needs-attention`: có ít nhất một ca hôm nay đã kết thúc (`ActualEndTime != null`); không có thì trả danh sách rỗng.
- `reassign-doctor`: lịch `CHECKED_IN`, chưa có phiếu khám, đúng ngày hôm nay; bác sĩ mới có ca hôm nay chưa kết thúc, phòng phù hợp dịch vụ.

## 3. API

### 3.1 `GET api/appointments/needs-attention`

Không có tham số.

**Response** (`ApiResponse<List<NeedsAttentionResponse>>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `appointmentId`, `patientId`, `patientCode`, `patientName` | | |
| `patientPhoneNumber` | string | Số đầy đủ (lễ tân gọi điện) |
| `appointmentType` | string | `BOOKED`/`WALK_IN` |
| `status` | string | `PENDING`/`CONFIRMED`/`CHECKED_IN` |
| `group` | string | `WAITING` (đang ở phòng khám) hoặc `UPCOMING` (đặt giờ sau khi bác sĩ rời) |
| `timeSlotStart` | TimeOnly? | Null với walk-in |
| `doctorId`, `doctorName` | | Bác sĩ đã kết thúc ca |
| `shiftEndedAt` | TimeOnly? | `ActualEndTime` của ca |
| `hasExamination` | bool | Đã được khám (quay về từ X-quang) – người này không đổi bác sĩ được |

### 3.2 `POST api/appointments/{id}/reassign-doctor`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | | Id lịch hẹn |
| `doctorId` | int? | Có | `[Required]` | Bác sĩ nhận bệnh nhân (`StaffProfiles.Id`) |

```json
{ "doctorId": 5 }
```

**Response** (`ApiResponse<AppointmentResponse>`, HTTP 200, message `"Patient moved to another doctor"`): `AppointmentResponse` với `doctorId`, `doctorName` của bác sĩ mới, `roomId`, `roomName` của ca bác sĩ mới.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `doctorId` | ProblemDetails mặc định |
| 404 | Không có lịch | `AppointmentNotFound`: "Appointment not found in system" |
| 400 | Lịch không `CHECKED_IN` | `ReassignOnlyWaiting`: "Only a patient who is checked in and waiting can be moved to another doctor" |
| 400 | Lịch đã có phiếu khám | `ReassignAlreadyExamined`: "This patient was already seen by the doctor and stays with that doctor" |
| 400 | Lịch không phải hôm nay | `ReassignWrongDay`: "A patient can only be moved to another doctor on the day of the appointment" |
| 400 | Trùng bác sĩ hiện tại | `ReassignSameDoctor`: "The patient is already with this doctor" |
| 400 | Bác sĩ mới không còn ca phù hợp và đã kết thúc một ca hôm nay | `CheckInDoctorShiftEnded`: "The doctor has already ended the shift today" |
| 400 | Bác sĩ mới không có ca phù hợp (kể cả id không tồn tại) | `DoctorNoSuitableShiftToday`: "The doctor has no shift today in a room that suits these services" |

## 4. Luồng xử lý trong code

### 4.1 needs-attention

1. `AppointmentsController.cs:84-90` gọi service.
2. `AppointmentService.cs:691-696` `today = ClinicClock.Today`; `GetEndedShiftsAsync(today)` (`AppointmentRepository.cs:119-125`: mọi ca hôm nay có `ActualEndTime != null`, mọi nhân viên). Rỗng → `[]`.
3. `AppointmentService.cs:698-700` lấy lịch hôm nay của các bác sĩ đó ở `PENDING`, `CONFIRMED`, `CHECKED_IN` (`GetAppointmentsOfDoctorsAsync`, `AppointmentRepository.cs:127-140`).
4. `AppointmentService.cs:703-743` với mỗi lịch:
   - Tìm ca đã kết thúc của đúng bác sĩ mà lịch thuộc về (`ShiftTimeHelper.IsInShift`, `ShiftTimeHelper.cs:15-19`: mốc = `TimeSlotStart`, walk-in dùng giờ `CheckInAt.LocalDateTime`; thuộc ca khi `ShiftStart ≤ mốc < ShiftEnd`). Không có → bỏ.
   - `CHECKED_IN` → nhóm `WAITING` (kể cả người đã có phiếu khám, `hasExamination = true`).
   - Không phải `CHECKED_IN` nhưng `TimeSlotStart > shift.ActualEndTime` → nhóm `UPCOMING`.
   - Còn lại (giờ hẹn đã qua lúc kết thúc ca) → bỏ.
5. `AppointmentService.cs:746-750` sắp xếp: `WAITING` trước, rồi `TimeSlotStart` tăng dần (null đứng trước), rồi `AppointmentId`.

### 4.2 reassign-doctor

1. `AppointmentsController.cs:109-118` nhận request.
2. `AppointmentService.cs:755-756` tải lịch kèm `Examination`, không có → 404.
3. `AppointmentService.cs:758` khác `CHECKED_IN` → `ReassignOnlyWaiting`.
4. `AppointmentService.cs:760` có `Examination` → `ReassignAlreadyExamined`.
5. `AppointmentService.cs:761-762` khác hôm nay → `ReassignWrongDay`.
6. `AppointmentService.cs:763-764` trùng bác sĩ → `ReassignSameDoctor`.
7. `AppointmentService.cs:767-770` `FindDoctorShiftAsync(newDoctorId, today, slot: null, loại phòng)` (`:949-965`): ca đang chạy, nếu không thì ca kế tiếp hôm nay, trong loại phòng của dịch vụ, chưa kết thúc, `IsPresent != false`. Không có → `CheckInDoctorShiftEnded` hoặc `DoctorNoSuitableShiftToday`.
8. `AppointmentService.cs:772-775` gán `DoctorId` mới, lưu.
9. `AppointmentService.cs:778-783` hủy bản ghi hàng chờ `Examination` đang hoạt động (`CANCELLED`), rồi tạo bản ghi mới cho bác sĩ mới: phòng ca mới, `AssignedStaffId` mới, giữ `Priority`, `Notes` = ghi chú bản cũ; **số mới** (`QueueNumber` cuối hàng), `SkipCount = 0`.
10. `AppointmentService.cs:785-786` audit `APPOINTMENT_DOCTOR_REASSIGNED` (cũ `{DoctorId}`, mới `{DoctorId, RoomId}`).
11. `AppointmentService.cs:788-793` trả response với bác sĩ và phòng mới.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-RCP-05 | Người đã check-in còn chờ khi hết ca không tự NO_SHOW, vào `needs-attention` để đổi bác sĩ | `AppointmentService.cs:713-716`; `DoctorScheduleService .cs:140-145` |
| Q11 | Bác sĩ thay ca xem được bệnh nhân khi được đổi bác sĩ | `AppointmentService.cs:772-775` (đổi `DoctorId`) |
| (code) | Người đã được khám ở lại với bác sĩ của phiếu khám | `AppointmentService.cs:760` |
| (code) | Bác sĩ mới phải có ca hôm nay, phòng hợp dịch vụ | `AppointmentService.cs:767-769` |
| BR-C11 | Ghi audit | `AppointmentService.cs:785-786` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.DoctorId`, `UpdatedAt` | bác sĩ cũ | bác sĩ mới | `Status` giữ `CHECKED_IN`, `Priority` giữ nguyên |
| `QueueEntries` (bản cũ) | `WAITING`/`CALLED` | `CANCELLED` | |
| `QueueEntries` (bản mới) | — | `WAITING`, số mới, phòng mới | |
| `AuditLogs` | — | `APPOINTMENT_DOCTOR_REASSIGNED` | |
| needs-attention | | | Chỉ đọc |

## 7. Liên quan

- Trước đó: F-RCP-08 kết thúc ca (tạo ra danh sách, gửi SMS/email cho bệnh nhân).
- Sau đó: F-RCP-04/F-RCP-05 ở bác sĩ mới; F-APT-08 đổi lịch cho nhóm `UPCOMING`; F-APT-07 hủy nếu bệnh nhân không đổi.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: không có ca kết thúc → rỗng; lịch thuộc ca khác của cùng bác sĩ không lên danh sách; walk-in xếp theo giờ check-in; `UPCOMING` khi giờ hẹn sau `ActualEndTime`; đổi bác sĩ cho người có Examination; đổi sang chính bác sĩ cũ; bác sĩ mới đã kết thúc ca; hàng chờ cũ `CANCELLED`, hàng chờ mới giữ ưu tiên.

## 9. Còn thiếu / câu hỏi mở

- Danh sách `WAITING` có cả người `hasExamination = true`, nhưng `reassign-doctor` từ chối họ; Chưa xác định từ code lễ tân xử lý người này thế nào (bác sĩ đã rời ca vẫn gọi được họ vì ngoài ca vẫn được gọi người đã khám).
- `reassign-doctor` không yêu cầu bác sĩ cũ đã kết thúc ca: mọi bệnh nhân `CHECKED_IN` chưa khám hôm nay đều chuyển được.
- Bác sĩ mới không cần đang trong ca (ca sắp tới cũng nhận); bệnh nhân bị xếp cuối hàng theo `QueueNumber` (cùng mức ưu tiên), không giữ vị trí cũ. Trong `waiting-list` vị trí vẫn tính theo nhóm/giờ hẹn nên không bị đẩy xuống.
- Không có lý do khi đổi bác sĩ trong audit (BR-C11).
- `UPCOMING` chỉ xét `TimeSlotStart > ActualEndTime`; lịch `PENDING` có giờ hẹn đã qua lúc kết thúc ca không thuộc nhóm nào và cũng không bị NO_SHOW (xem F-RCP-08).
- Ca bị mở lại (`api/work-shifts/{id}/reopen`) có `ActualEndTime = null` nên bệnh nhân của ca đó biến khỏi danh sách.
- `ShiftTimeHelper` dùng `CheckInAt.LocalDateTime` (giờ máy chủ) cho walk-in; lệch BR-C01 nếu máy chủ không ở giờ Việt Nam.

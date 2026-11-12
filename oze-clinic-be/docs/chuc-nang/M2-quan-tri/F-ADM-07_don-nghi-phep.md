# F-ADM-07 Đơn nghỉ phép và lịch làm việc của tôi

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2, quy tắc BR-ADM-05..08.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | ✅ Đã làm (11/11/2026) |
| Vai trò được dùng | `Doctor`, `Receptionist`, `DentalImagingTechnician` gửi và rút đơn, xem ca của mình; `ClinicManager` duyệt hoặc từ chối; `Receptionist`, `Doctor`, `ClinicManager` xem bác sĩ trong ca hôm nay |
| API | `POST api/leave-requests`, `GET api/leave-requests/my`, `POST api/leave-requests/{id}/cancel`, `GET api/leave-requests`, `GET api/leave-requests/{id}`, `POST api/leave-requests/{id}/approve`, `POST api/leave-requests/{id}/reject`, `GET api/schedules/my`, `GET api/schedules/doctors-on-duty` |
| Code chính | `LeaveRequestsController` → `LeaveRequestService` → `LeaveRequestRepository` (+ `WorkShiftRepository`, `StaffRepository`); `SchedulesController` → `ScheduleViewService` |
| Màn hình | Nhân viên: "Công việc → Lịch làm việc" (`/work-schedule`, `MyWorkSchedule.jsx`). Quản lý: "Đơn nghỉ phép" (`/admin/leave-requests`, `LeaveRequestManagement.jsx`) |

## 1. Chức năng này làm gì

Nhân viên xem các ca quản lý đã phân cho mình theo tuần. Muốn nghỉ thì gửi đơn cho **một ngày hoặc nửa ngày** (ca sáng hoặc ca chiều) có ca, kèm lý do. Quản lý xem đơn, thấy các ca và lịch hẹn bị ảnh hưởng, rồi:

- **Duyệt có người thay**: ca và các lịch hẹn trong ca chuyển sang người thay (cùng vai trò, đang rảnh).
- **Duyệt không người thay**: chỉ được khi ca không có lịch hẹn nào; ca bị đánh dấu vắng (`IsPresent = false`, `AbsenceReason = "Nghỉ phép: <lý do>"`), nên không mở slot đặt lịch cho ca đó.
- **Từ chối**: bắt buộc nêu lý do.

Lễ tân thấy danh sách **bác sĩ trong ca hôm nay** (phòng, giờ ca, đang làm, chưa vào ca, đã kết thúc ca, nghỉ phép) để lọc màn quầy và chọn bác sĩ cho khách vãng lai hoặc khi chuyển bác sĩ.

## 2. Tiền điều kiện

- Người gửi có `StaffProfile`.
- Có ít nhất một ca trong ngày và buổi xin nghỉ. Không ca nào trong đó đã bắt đầu (giờ bắt đầu ≤ giờ VN hiện tại, hoặc đã chấm vào ca).
- Duyệt, từ chối: đơn đang `Pending`.

## 3. API

**`POST api/leave-requests`** (Doctor, Receptionist, DentalImagingTechnician)

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `leaveDate` | DateOnly | Có | ≥ hôm nay (giờ VN) |
| `slot` | string? | Không | `Morning`, `Afternoon`, hoặc trống (cả ngày). Ca bắt đầu trước 12:00 là ca sáng |
| `reason` | string | Có | Tối đa 500 ký tự |

**`GET api/leave-requests/my`** và **`GET api/leave-requests`** (quản lý) có phân trang, lọc theo `status`, `role`, `slot` (`Morning`, `Afternoon`, `WholeDay`), `fromDate`, `toDate`, `searchKeyword` (tên hoặc lý do). Đơn chờ duyệt đứng đầu.

**`GET api/leave-requests/{id}`** (quản lý) trả `request` gồm `affectedShifts[]`, `affectedAppointments[]`. Trả thêm `substituteOptions[]` là những người cùng vai trò, không có ca trùng giờ và không có đơn nghỉ trùng.

**`POST api/leave-requests/{id}/approve`** body `{ "substituteStaffUserId": "..." }`, có thể bỏ trống. **`POST .../reject`** body `{ "reason": "..." }`. **`POST .../cancel`**: chỉ người gửi rút, và chỉ khi đơn còn `Pending`.

**`GET api/schedules/my?fromDate=&toDate=`**: ca của tôi. Mặc định tuần này và tuần sau, tối đa 62 ngày.

**`GET api/schedules/doctors-on-duty?date=`**: các ca bác sĩ trong ngày. Mặc định hôm nay. Mỗi dòng gồm `doctorId`, `doctorName`, `roomName`, `shiftStart`, `shiftEnd` và `status`. `status` nhận một trong các giá trị `NotStarted`, `Working`, `Ended`, `OnLeave`.

**Lỗi** (`ErrorConstants.LeaveRequestMessage`)

| HTTP | Khi nào | Message |
|---|---|---|
| 400 | Ngày đã qua | `DateInPast` |
| 400 | Không có ca trong buổi đó | `NoShiftToLeave` |
| 400 | Có ca đã bắt đầu | `ShiftAlreadyStarted` |
| 400 | Trùng đơn `Pending`/`Approved` (cả ngày trùng mọi buổi) | `AlreadyRequested` |
| 400 | Buổi không hợp lệ | `SlotInvalid` |
| 400 | Duyệt không người thay mà ca còn lịch hẹn | `SubstituteRequired` |
| 400 | Người thay khác vai trò / bận / chính mình | `SubstituteWrongRole`, `SubstituteBusy`, `SubstituteSamePerson` |
| 400 | Đơn đã xử lý | `NotPending` |
| 400 | Từ chối không có lý do | `RejectReasonRequired` |
| 403 | Rút đơn của người khác | `NotOwner` |
| 404 | Không có đơn | `NotFound` |

## 4. Luồng xử lý

1. Gửi: chuẩn hóa buổi, kiểm ngày, lấy ca của ngày đó theo buổi, kiểm ca chưa bắt đầu, kiểm trùng đơn, lưu `Pending`, ghi `AuditLog` `LEAVE_REQUESTED`.
2. Duyệt (trong một transaction): kiểm `Pending`, lấy ca theo buổi và lịch hẹn chưa xong có giờ giao với ca.
   - Có người thay: kiểm cùng vai trò và người thay đang rảnh, rồi đổi `StaffSchedules.StaffProfileId` và `Appointments.DoctorId` sang người thay. Ghi chú vào ca "Thay ca cho …".
   - Không người thay: nếu còn lịch hẹn thì báo lỗi; nếu không thì đặt `IsPresent = false` và `AbsenceReason` cho ca.
   - Cuối cùng chuyển đơn sang `Approved`, lưu người duyệt và thời gian, ghi `AuditLog` `LEAVE_APPROVED`.
3. Từ chối: chuyển `Rejected`, lưu lý do, ghi `AuditLog` `LEAVE_REJECTED`.
4. Rút: chuyển `Cancelled`, ghi `AuditLog` `LEAVE_CANCELLED`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc |
|---|---|
| BR-ADM-05 | Chỉ xin nghỉ ca từ nay về sau và chưa bắt đầu; nghỉ theo ngày hoặc nửa ngày (sáng < 12:00 ≤ chiều); không có hai đơn `Pending`/`Approved` chồng nhau |
| BR-ADM-06 | Ca có lịch hẹn chỉ được duyệt nghỉ khi có **người thay cùng vai trò, đang rảnh**; lịch hẹn chuyển theo người thay, không hủy lịch của bệnh nhân |
| BR-ADM-07 | Từ chối bắt buộc lý do; gửi, rút, duyệt, từ chối đều ghi `AuditLog` |
| BR-ADM-08 | Ca bị duyệt nghỉ mà không có người thay thì bị đánh vắng, nên không còn slot đặt lịch cho ca đó (`AppointmentRepository`: `IsPresent != false`) |

## 6. Dữ liệu thay đổi

| Bảng | Thay đổi |
|---|---|
| `LeaveRequests` (mới, migration `AddLeaveRequestsAndCashSessions`) | Thêm đơn, đổi `Status` |
| `StaffSchedules` | `StaffProfileId` (có người thay), hoặc `IsPresent`, `AbsenceReason` (không người thay) |
| `Appointments.DoctorId` | Sang người thay |
| `AuditLogs` | 1 dòng mỗi thao tác |

## 7. Kiểm thử

- `OZE.UnitTest/Services/LeaveRequests/LeaveRequestTests.cs` (tab `OZ-LEAVE-01`, 12 ca).
- `OZE.UnitTest/Services/Schedules/DoctorsOnDutyTests.cs` (tab `OZ-SCH-01`).

## 8. Còn mở

- Chưa có hạn mức ngày phép và chưa quy định phải gửi trước bao nhiêu ngày. Cần chốt với phòng khám.
- Chưa có thông báo cho người gửi khi đơn được duyệt hoặc từ chối. Người gửi tự xem trạng thái ở trang Lịch làm việc.
- Quản lý chưa gửi đơn được (quản lý không có ca).
- Trang "Phân ca" của quản lý vẫn dùng dữ liệu giả. Đơn được duyệt chỉ hiện trên dữ liệu thật của API ca.

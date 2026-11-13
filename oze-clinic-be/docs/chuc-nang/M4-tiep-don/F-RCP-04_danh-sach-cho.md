# F-RCP-04 Danh sách chờ theo bác sĩ

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `Doctor`, `ClinicManager` |
| API | `GET api/appointments/waiting-list?doctorId={id}` |
| Code chính | `AppointmentsController.GetWaitingListAsync` → `AppointmentService.GetWaitingListAsync` → `AppointmentRepository.GetWaitingAppointmentsAsync`, `QueueService.IsDoctorOffDutyAsync` |

## 1. Chức năng này làm gì

Trả danh sách bệnh nhân đã check-in hôm nay và đang chờ khám, **theo đúng thứ tự sẽ được khám** (`position` 1 là người kế tiếp). Lễ tân và quản lý xem theo bác sĩ bất kỳ hoặc toàn phòng khám; bác sĩ chỉ xem danh sách của mình.

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist`, `Doctor` hoặc `ClinicManager`.
- Tài khoản bác sĩ phải có `StaffProfile`.
- Cấu hình `CheckIn.LateMinutes` có trong `SystemConfigurations` và là số nguyên (seed = 15).

## 3. API

**Request** `GET api/appointments/waiting-list`, quyền `[Authorize(Roles = "Receptionist,Doctor,ClinicManager")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `doctorId` (query) | int? | Không | | Lọc theo bác sĩ (`StaffProfiles.Id`). Bỏ trống = mọi bác sĩ. **Bị bỏ qua nếu người gọi có role `Doctor`** (luôn lấy bác sĩ đang đăng nhập) |

**Response thành công** (`ApiResponse<List<WaitingListItemResponse>>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `position` | int | Thứ tự, bắt đầu từ 1 |
| `appointmentId`, `patientId`, `patientCode`, `patientName` | | |
| `doctorId`, `doctorName` | | |
| `appointmentType` | string | `BOOKED` hoặc `WALK_IN` |
| `timeSlotStart` | TimeOnly? | Giờ hẹn; null với walk-in |
| `checkInAt` | DateTimeOffset? | Giờ check-in |
| `roomId`, `roomName` | | Phòng của bản ghi hàng chờ `Examination` đang hoạt động mới nhất (`GetCurrentRoom`, `AppointmentService.cs:977-984`) |
| `priority` | int | 0/1/2 |
| `isLate` | bool | Thuộc nhóm "đặt nhưng đến trễ" |
| `isPriorityReturn` | bool | Đã khám, đi chụp phim xong quay lại |
| `services` | string[] | Tên dịch vụ, biến thể ghi `"Dịch vụ - Biến thể"` |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | Người gọi role `Doctor` không có `StaffProfile` | `AppointmentMessage.DoctorProfileNotFound`: "No doctor profile is linked to this account" |
| 400 | Thiếu hoặc sai cấu hình `CheckIn.LateMinutes` | `ConfigMissing`: "System configuration CheckIn.LateMinutes is missing" |

## 4. Luồng xử lý trong code

1. `AppointmentsController.cs:136-146`: nếu `IsInRole(Doctor)` thì `doctorUserId = CurrentUserId ?? ""`, ngược lại null.
2. `AppointmentService.cs:438-443`: có `doctorUserId` → tra `StaffProfile.Id` (`GetStaffProfileIdByUserIdAsync`), không có → 404; ghi đè `doctorId` bằng id này.
3. `AppointmentService.cs:445` đọc `CheckIn.LateMinutes` (`GetIntConfigAsync`, `:355-361`).
4. `AppointmentService.cs:446-447` `today = ClinicClock.Today`; `GetWaitingAppointmentsAsync(today, doctorId)` (`AppointmentRepository.cs:222-252`):
   - Lấy lịch `AppointmentDate == today` và `Status == CHECKED_IN` (lọc thêm `DoctorId` nếu có), kèm Patient, Doctor, dịch vụ, Examination + ImagingRequests, QueueEntries + Room.
   - **Loại** bệnh nhân có phiếu khám đang có chỉ định chụp phim `Pending` hoặc `InProgress` (đang ở phòng X-quang).
5. `AppointmentService.cs:451-455`: chỉ khi người gọi là bác sĩ, nếu bác sĩ **ngoài ca** (`IsDoctorOffDutyAsync` → `QueueRepository.IsOffDutyAsync`, `QueueRepository.cs:131-138`: không có ca hôm nay đã bắt đầu và chưa kết thúc) thì chỉ giữ bệnh nhân **đã có phiếu khám** (quay về từ X-quang).
6. `AppointmentService.cs:457-484` gán nhóm và sắp xếp (xem mục "Thuật toán"), đánh `position` từ 1.

### Thuật toán sắp xếp (đúng như code)

**Bước A – gán nhóm** `GetWaitingGroup` (`AppointmentService.cs:487-505`), xét theo thứ tự:

| Nhóm | Hằng | Điều kiện |
|---|---|---|
| 0 | `PriorityReturnGroup` | Lịch đã có `Examination` (đã khám, quay về từ chụp phim) |
| 3 | `WalkInGroup` | `AppointmentType == WALK_IN` |
| 2 | `LateGroup` | Lịch đặt, check-in trễ (`IsLateCheckIn` = true) |
| 1 | `OnTimeGroup` | Còn lại (lịch đặt, đến sớm hoặc đúng giờ) |

**Đến trễ** `IsLateCheckIn` (`AppointmentService.cs:508-517`):
- `CheckInAt` hoặc `TimeSlotStart` null → không trễ.
- `bookedAt = AppointmentDate + TimeSlotStart`.
- Trễ khi `CheckInAt.Value.LocalDateTime > bookedAt + CheckIn.LateMinutes phút` (lớn hơn hẳn; đúng mốc vẫn là đúng giờ).
- Đến sớm bao nhiêu cũng là đúng giờ. **`CheckIn.EarlyMinutes` không được đọc ở bất kỳ đâu.**

**Bước B – sắp xếp** (`AppointmentService.cs:458-462`), khóa lần lượt:

1. `Priority` **giảm dần** (2 Urgent → 1 High → 0 Normal). Mức ưu tiên đứng trên nhóm: walk-in Urgent đứng trước lịch đặt Normal.
2. Nhóm **tăng dần** (0 → 1 → 2 → 3).
3. Chỉ trong nhóm 1 (đúng giờ): `TimeSlotStart` tăng dần. Nhóm khác khóa này là null (không tác dụng).
4. `CheckInAt` tăng dần (người check-in trước đứng trước). Với nhóm 1 đây là khóa phụ khi trùng giờ hẹn.

Ví dụ (`LateMinutes = 15`, cùng bác sĩ):

| Bệnh nhân | Loại | Giờ hẹn | Check-in | Ưu tiên | Nhóm | Vị trí |
|---|---|---|---|---|---|---|
| D | BOOKED, đã có Examination (chụp phim xong) | 08:00 | 07:55 | 2 (tự đặt khi trả kết quả phim) | 0 | 1 |
| E | WALK_IN | — | 09:20 | 2 | 3 | 2 |
| A | BOOKED | 09:00 | 08:30 (sớm) | 0 | 1 | 3 |
| B | BOOKED | 08:30 | 09:00 (> 08:45 nên trễ) | 0 | 2 | 4 |
| C | WALK_IN | — | 08:50 | 0 | 3 | 5 |

Giải thích: mức 2 đứng trước mức 0; trong mức 2, nhóm 0 (D) trước nhóm 3 (E). Trong mức 0: A (đúng giờ) → B (trễ) → C (vãng lai), dù C check-in trước B.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-RCP-02 | Ưu tiên giảm dần, rồi (1) đúng giờ theo giờ hẹn, (2) trễ theo giờ check-in, (3) vãng lai theo giờ check-in | `AppointmentService.cs:457-517` (thêm nhóm 0 "quay về từ X-quang" đứng đầu) |
| BR-RCP-03 | Danh sách chờ tính từ lịch `CHECKED_IN` của bác sĩ trong ngày | `AppointmentRepository.cs:236` |
| BR-C01 | Ngày lấy từ `ClinicClock.Today` | `AppointmentService.cs:446` |
| (code) | Bác sĩ chỉ xem của mình; ngoài ca chỉ thấy bệnh nhân đã khám | `AppointmentsController.cs:143`, `AppointmentService.cs:451-455` |
| (code) | Bệnh nhân đang chụp phim bị ẩn | `AppointmentRepository.cs:245-251` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| — | | | Chỉ đọc, không ghi |

## 7. Liên quan

- Trước đó: F-RCP-01, F-RCP-02, F-RCP-03; trả kết quả chụp phim (`ImagingRequestService`) đưa bệnh nhân về nhóm 0 với ưu tiên Urgent.
- Sau đó: F-EXM-01 bắt đầu khám (bác sĩ chọn từ danh sách), F-RCP-05 gọi số, F-RCP-06, F-RCP-07.

## 8. Kiểm thử

- Test hiện có: `GetWaitingListTests.GetWaitingListAsync_ShouldPlacePriorityReturnPatientAheadOfOnTimePatients` (bệnh nhân có Examination đứng trước bệnh nhân đúng giờ cùng mức ưu tiên).
- Ca cần test thêm: ưu tiên cao hơn vượt nhóm; đúng giờ xếp theo giờ hẹn dù check-in muộn hơn; check-in đúng mốc `+LateMinutes` vẫn đúng giờ; trễ xếp theo giờ check-in; walk-in xếp cuối cùng mức; ẩn bệnh nhân đang chụp phim; bác sĩ ngoài ca; người gọi role Doctor truyền `doctorId` khác bị bỏ qua; thiếu cấu hình.

## 9. Còn thiếu / câu hỏi mở

- **Lệch BR-RCP-03**: Dac_ta nói "kết hợp gọi/bỏ qua của hàng chờ", nhưng `waiting-list` **không xét** trạng thái `CALLED` hay `SkipCount` của `QueueEntries`; người đã được gọi hoặc bị bỏ qua vẫn giữ vị trí cũ.
- ~~Hai thứ tự khác nhau~~: đã sửa 11/11/2026. `waiting-list` và `call-next` dùng chung `WaitingOrder` (`OZE.Application/Helpers/WaitingOrder.cs`); `waiting-list` xét thêm `SkipCount` sau nhóm. Giờ check-in được đổi sang giờ phòng khám (`ClinicClock.ToClinicTime`) khi xét trễ.
- Nhóm 0 (quay về từ X-quang) không có trong BR-RCP-02.
- `CheckIn.EarlyMinutes` ghi ở mục 7 Dac_ta "dùng ở BR-RCP-02" nhưng code không dùng. Mô tả seed của `CheckIn.LateMinutes` ("Số phút đến muộn trước khi đánh dấu NO_SHOW", `SystemConfigurationConfiguration.cs:34`) cũng không đúng cách code dùng (chỉ để phân nhóm trễ).
- `IsLateCheckIn` dùng `CheckInAt.LocalDateTime` (giờ **máy chủ**) so với giờ hẹn (giờ Việt Nam). Máy chủ chạy UTC thì giờ check-in lệch 7 tiếng, gần như không ai bị tính trễ. Lệch BR-C01.
- Người dùng có cả role `Doctor` và `Receptionist` bị coi là bác sĩ ở đây (`AppointmentsController.cs:143`), trong khi `QueuesController` coi là lễ tân.

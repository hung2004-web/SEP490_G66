# F-APT-02 Xem slot trống

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi người (`[AllowAnonymous]`) |
| API | `GET api/appointments/available-slots` |
| Code chính | `AppointmentsController.GetAvailableSlotsAsync` → `AppointmentService.GetAvailableSlotsAsync` → `ResolveBookingLinesAsync` + `FindSlotsAsync` → `AppointmentRepository.GetDoctorShiftsAsync`, `GetActiveAppointmentsAsync`, `GetConfigValueAsync` |

## 1. Chức năng này làm gì

Với các dịch vụ/biến thể người dùng chọn và một ngày, trả về các khung giờ còn trống theo từng bác sĩ. Slot được cắt từ **ca làm của bác sĩ** (`StaffSchedules`) trong phòng đúng loại, dài bằng tổng thời lượng các dịch vụ, không trùng lịch đang giữ chỗ của bác sĩ đó.

Hàm `FindSlotsAsync` cũng được dùng lại để kiểm tra slot khi đặt (F-APT-03/04) và đổi lịch (F-APT-08).

## 2. Tiền điều kiện

- Không cần đăng nhập.
- `SystemConfigurations` có các khóa dạng số nguyên: `Booking.MaxDaysAhead`, `Booking.MinHoursAhead`, `Clinic.SlotDurationMinutes`; và khóa chuỗi `Booking.GeneralExamServiceCode`.
- Dịch vụ khám tổng quát tồn tại và `IsActive`.
- Có ca bác sĩ (`StaffSchedules`) trong ngày đó, gắn phòng `Active` đúng loại phòng.

## 3. API

**Request** `GET api/appointments/available-slots`, quyền `[AllowAnonymous]`. Tham số query (`AvailableSlotRequest`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `serviceId` | `List<int>` | Không | Lặp tham số: `?serviceId=2&serviceId=3`. Bỏ trùng; id của khám tổng quát bị bỏ qua | Dịch vụ chọn thêm (khám tổng quát hệ thống tự thêm) |
| `variantId` | `List<int>` | Không | Lặp tham số | Biến thể chọn; dịch vụ cha suy ra từ biến thể |
| `date` | `DateOnly?` (`yyyy-MM-dd`) | Có | `[Required]`; từ hôm nay đến hôm nay + `Booking.MaxDaysAhead` | Ngày muốn khám |
| `doctorId` | int? | Không | | `null` = mọi bác sĩ phù hợp |

Ví dụ: `GET api/appointments/available-slots?variantId=2&date=2026-11-20`

**Response thành công** (`ApiResponse<List<AvailableSlotResponse>>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `doctorId` | int | `StaffProfile.Id` của bác sĩ |
| `doctorName` | string | Tên bác sĩ |
| `date` | DateOnly | Ngày |
| `slotStart` | TimeOnly | Giờ bắt đầu |
| `slotEnd` | TimeOnly | `slotStart` + tổng thời lượng dịch vụ |

Danh sách sắp theo `slotStart`, rồi `doctorId`. Một giờ có nhiều bác sĩ rảnh thì có nhiều dòng. Không có ca phù hợp thì trả mảng rỗng (không lỗi).

```json
{ "success": true, "message": "Success",
  "data": [ { "doctorId": 3, "doctorName": "BS. A", "date": "2026-11-20", "slotStart": "08:00:00", "slotEnd": "09:00:00" } ] }
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `date` (model validation, trả `ValidationProblemDetails` mặc định của ASP.NET, không bọc `ApiResponse`) | "The Date field is required." |
| 400 | Thiếu/không phải số cấu hình | `AppointmentMessage.ConfigMissing` "System configuration {0} is missing" |
| 400 | Khám tổng quát không có hoặc đã tắt | `AppointmentMessage.GeneralExamServiceMissing` "The general exam service is not set up. Please contact the clinic" |
| 404 | Có `serviceId` không tồn tại | `AppointmentMessage.ServiceNotFound` "Service not found" |
| 400 | Dịch vụ đã tắt | `AppointmentMessage.ServiceInactive` "This service is not available for booking" |
| 404 | Có `variantId` không tồn tại | `AppointmentMessage.VariantNotFound` "Service variant not found" |
| 400 | Biến thể hoặc dịch vụ cha đã tắt | `AppointmentMessage.VariantInactive` "This service variant is not available for booking" |
| 400 | Dịch vụ cần nhiều loại phòng khác nhau | `AppointmentMessage.ServicesNeedDifferentRooms` "These services need different rooms and cannot be booked in one appointment" |
| 400 | `date` trước hôm nay | `AppointmentMessage.PastDate` "Appointment date cannot be in the past" |
| 400 | `date` > hôm nay + `Booking.MaxDaysAhead` | `AppointmentMessage.TooFarAhead` "Appointment date is too far in advance" |

## 4. Luồng xử lý trong code

1. Controller bind query vào `AvailableSlotRequest` (`AppointmentsController.cs:37-43`). `[ApiController]` tự trả 400 nếu thiếu `date`.
2. `GetAvailableSlotsAsync` gọi `ResolveBookingLinesAsync(serviceId, variantId)` rồi `FindSlotsAsync(lines, date, doctorId)` (`AppointmentService.cs:72-76`).
3. **Dựng danh sách dòng dịch vụ** `ResolveBookingLinesAsync` (`AppointmentService.cs:284-319`):
   1. Đọc `Booking.GeneralExamServiceCode`, lấy dịch vụ theo mã qua `IServiceRepository.GetByCodeAsync`; không có hoặc tắt → `GeneralExamServiceMissing` (`:287-289`).
   2. Bỏ id khám tổng quát và id trùng khỏi `serviceId`, tải dịch vụ; thiếu → 404 `ServiceNotFound`; có dịch vụ tắt → `ServiceInactive` (`:291-294`, repo `AppointmentRepository.cs:194-200`).
   3. Bỏ trùng `variantId`, tải biến thể kèm dịch vụ cha; thiếu → 404 `VariantNotFound`; biến thể hoặc dịch vụ cha tắt → `VariantInactive` (`:296-299`, repo `AppointmentRepository.cs:202-209`).
   4. Thứ tự dòng: khám tổng quát, các dịch vụ theo thứ tự gửi, các biến thể theo thứ tự gửi (`:302-308`). Mỗi dòng là `BookingLine(Service, Variant?)` (`:269-281`).
   5. **Kiểm tra loại phòng**: đếm số `RequiredRoomType` khác rỗng, phân biệt; > 1 → `ServicesNeedDifferentRooms` (`:311-316`). Dịch vụ để trống loại phòng không tính.
4. **Tìm slot** `FindSlotsAsync` (`AppointmentService.cs:200-254`):
   1. `today` = `ClinicClock.Today` (giờ Việt Nam, BR-C01). Đọc `Booking.MaxDaysAhead`; kiểm tra `date >= today` (`PastDate`) và `date <= today + MaxDaysAhead` (`TooFarAhead`) (`:202-205`).
   2. Đọc `Clinic.SlotDurationMinutes` (bước nhảy giữa các slot) và `Booking.MinHoursAhead`; `earliestStart = ClinicClock.Now + MinHoursAhead giờ` (`:207-209`).
   3. **Thời lượng slot** = tổng `GetMinutes` các dòng: lấy `EstimatedMinutes` của biến thể (nếu là biến thể) hoặc của dịch vụ; `null` thì tính bằng `SlotDurationMinutes` (`:211`, `:279-280`).
   4. Lấy ca bác sĩ trong ngày (`AppointmentRepository.cs:162-187`): `ScheduleDate = date`, `IsPresent != false`, `ActualEndTime == null` (chưa kết thúc ca), `StaffProfile.IsActive`, user có role `Doctor`, `Room` khác null và `Room.Status = Active`; lọc theo `doctorId` nếu có; sắp theo `ShiftStart`.
   5. **Lọc loại phòng**: `RequiredRoomTypeOf` lấy loại phòng khác rỗng đầu tiên của các dòng, không có thì `GeneralTreatment` (`AppointmentService.cs:942-945`); chỉ giữ ca có `Room.RoomType` bằng loại đó (`:215-216`).
   6. Lấy lịch đang giữ chỗ của các bác sĩ đó trong ngày: mọi trạng thái trừ `CANCELLED`, `NO_SHOW` (`AppointmentRepository.cs:86-95`); bỏ lịch `excludeAppointmentId` nếu đang đổi lịch (`:219-221`).
   7. Với mỗi ca: `start` chạy từ `ShiftStart`, mỗi bước cộng `SlotDurationMinutes`; `end = start + duration`; dừng khi `end > ShiftEnd` hoặc `end < start` (qua nửa đêm) (`:224-233`).
   8. Slot bị loại nếu trùng lịch của **cùng bác sĩ** (`a.TimeSlotStart < end && start < a.TimeSlotEnd`) hoặc `date + start < earliestStart` (`:235-237`).
   9. Sắp kết quả theo `SlotStart`, `DoctorId` (`:253`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-01 | Khám tổng quát luôn được thêm vào đầu danh sách dịch vụ | `AppointmentService.cs:302` |
| BR-APT-03 | Chỉ một loại phòng; slot dài bằng tổng thời lượng dịch vụ | `AppointmentService.cs:311-316`, `:211`, `:215-216` |
| BR-APT-04 | Tối đa `Booking.MaxDaysAhead` ngày, tối thiểu `Booking.MinHoursAhead` giờ | `AppointmentService.cs:203-209`, `:237` |
| BR-C01 | Giờ nghiệp vụ là giờ Việt Nam (`ClinicClock`) | `AppointmentService.cs:202`, `:209` |
| (trong code) | Chỉ `CANCELLED`, `NO_SHOW` nhả chỗ | `AppointmentRepository.cs:92-93` |
| (trong code) | Bác sĩ đã kết thúc ca (`ActualEndTime` có giá trị) không nhận lịch mới | `AppointmentRepository.cs:176` |

## 6. Trạng thái và dữ liệu thay đổi

Chỉ đọc.

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `StaffSchedules`, `Rooms`, `Appointments`, `Services`, `ServiceVariants`, `SystemConfigurations` | - | - | Chỉ đọc |

## 7. Liên quan

- Trước đó: F-APT-01 (chọn dịch vụ); quản lý ca bác sĩ (`StaffSchedules`), phòng.
- Sau đó: F-APT-03, F-APT-04 (đặt), F-APT-08 (đổi lịch) gửi `date`, `slotStart`, `doctorId` lấy từ đây; server kiểm tra lại slot bằng chính `FindSlotsAsync`.

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `GetAvailableSlotsAsync` / `FindSlotsAsync`.
- Ca cần test thêm:
  - Ca 08:00-12:00, slot 30 phút, dịch vụ tổng 60 phút → slot cuối 11:00-12:00.
  - Lịch `PENDING` của bác sĩ 09:00-09:30 chặn các slot chồng lên; lịch `CANCELLED` không chặn.
  - Ngày hôm nay: slot trước `now + MinHoursAhead` bị loại.
  - Ngày quá khứ → `PastDate`; quá `MaxDaysAhead` → `TooFarAhead`.
  - Dịch vụ `MinorSurgery` chỉ lấy ca ở phòng `MinorSurgery`; dịch vụ không yêu cầu phòng → `GeneralTreatment`.
  - `MinorSurgery` + `XRay` → `ServicesNeedDifferentRooms`.
  - Bác sĩ đã kết thúc ca, phòng `Inactive`, `IsPresent = false` → không có slot.

## 9. Còn thiếu / câu hỏi mở

- **Lệch mục 7 tài liệu tổng**: `Clinic.WorkStartTime` / `Clinic.WorkEndTime` ghi "Dùng ở F-APT-02" nhưng code **không đọc** hai khóa này. Khung giờ đến từ ca bác sĩ (`ShiftStart`/`ShiftEnd`). `Clinic.SlotDurationMinutes` chỉ là bước nhảy giữa các giờ bắt đầu và thời lượng mặc định của dịch vụ không có `EstimatedMinutes`.
- Kiểm tra trùng chỉ theo bác sĩ, không theo phòng. Hai ca khác bác sĩ cùng phòng được chặn ở chỗ tạo ca (`RoomInUse`), không ở đây.
- Model validation của controller này không dùng `[ApiResponseValidationFilter]` nên lỗi thiếu `date` trả `ValidationProblemDetails`, không phải `ApiResponse` (lệch BR-C07).
- Kết quả nằm trong ngưỡng hiện tại; giữa lúc xem và lúc đặt slot có thể đã bị người khác lấy, khi đó F-APT-03/04 trả `SlotNotAvailable`.

# F-APT-03 Khách vãng lai đặt lịch (không đăng nhập)

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Khách chưa có tài khoản (`[AllowAnonymous]`) |
| API | `POST api/appointments/guest-booking` |
| Code chính | `AppointmentsController.BookAsGuestAsync` → `AppointmentService.BookAsGuestAsync` → `CreateBookingAsync` → `AppointmentRepository` (`ExecuteSerializableAsync`, `AddAsync`, `AddPatientAsync`, `HasUnfinishedAppointmentAsync`), `RegistrationRepository` (`FindUserByPhoneAsync`, `FindUnlinkedPatientsByPhoneAsync`) |

## 1. Chức năng này làm gì

Khách chưa có tài khoản nhập họ tên, số điện thoại (và email nếu có), chọn dịch vụ và một slot trống để gửi yêu cầu đặt lịch. Hệ thống tạo (hoặc dùng lại) hồ sơ bệnh nhân chưa gắn tài khoản, tạo lịch `PENDING` giữ chỗ, gửi SMS/email "đã nhận yêu cầu", và lễ tân sẽ gọi xác nhận (F-APT-06).

## 2. Tiền điều kiện

- Không cần đăng nhập.
- Số điện thoại **chưa** thuộc tài khoản nào trong bảng `Users` (BR-APT-09).
- Slot gửi lên phải còn trống theo F-APT-02 tại thời điểm lưu.
- Nếu số điện thoại đã có hồ sơ bệnh nhân chưa gắn tài khoản: hồ sơ đó không có lịch chưa kết thúc từ hôm nay trở đi.
- Cấu hình như F-APT-02.

## 3. API

**Request** `POST api/appointments/guest-booking`, quyền `[AllowAnonymous]`. Body `GuestBookingRequest` (kế thừa `BookingRequest`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `serviceId` | `List<int>` | Không | Như F-APT-02 | Dịch vụ chọn thêm |
| `variantId` | `List<int>` | Không | Như F-APT-02 | Biến thể chọn |
| `date` | DateOnly? | Có | `[Required]`; trong khoảng F-APT-02 | Ngày khám |
| `slotStart` | TimeOnly? | Có | `[Required]`; phải trùng `slotStart` của một slot trống | Giờ bắt đầu |
| `doctorId` | int? | Không | | `null` = hệ thống chọn bác sĩ ít lịch nhất trong ngày |
| `note` | string? | Không | `[MaxLength(500)]`, được trim, rỗng → `null` | Lý do khám / ghi chú; sau này thành `ChiefComplaint` khi bắt đầu khám |
| `fullName` | string | Có | `[Required]`, `[MaxLength(100)]` | Họ tên |
| `phoneNumber` | string | Có | `[Required]`; chuẩn hóa E.164 trong service (BR-C03) | Số điện thoại |
| `email` | string? | Không | Nếu có: ≤ 256 ký tự, đúng định dạng `EmailAddressAttribute` | Email nhận thông báo |

```json
{
  "serviceId": [],
  "variantId": [2],
  "date": "2026-11-20",
  "slotStart": "09:00:00",
  "doctorId": null,
  "note": "Đau răng hàm dưới",
  "fullName": "Nguyễn Văn A",
  "phoneNumber": "0912 345 678",
  "email": "a@example.com"
}
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, `message = "Appointment request received. The receptionist will call to confirm."`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | long | Id lịch hẹn |
| `patientId` | int | Id hồ sơ bệnh nhân |
| `patientCode` | string | Mã bệnh nhân, dạng `BN-yyMMdd-xxxxxx` khi tạo mới |
| `patientName` | string | Họ tên trong hồ sơ |
| `patientPhoneNumber` | string | **Đã che**: 4 ký tự đầu + `*` + 3 ký tự cuối (`PhoneNumberHelper.Mask`) |
| `doctorId` | int? | Bác sĩ được gán |
| `doctorName` | string? | Tên bác sĩ |
| `serviceId`, `serviceName` | int, string | Dịch vụ đầu tiên (khám tổng quát), giữ cho FE cũ |
| `services` | `List<AppointmentServiceResponse>` | `serviceId`, `serviceName`, `variantId`, `variantName`, `durationMinutes`, `priceAtBooking` |
| `appointmentType` | string | `BOOKED` |
| `appointmentDate` | DateOnly | Ngày khám |
| `timeSlotStart`, `timeSlotEnd` | TimeOnly? | Giờ slot |
| `status` | string | `PENDING` |
| `checkInAt`, `roomId`, `roomName`, `cancellationReason` | | `null` |
| `notes` | string? | Ghi chú |
| `createdAt` | DateTimeOffset | Thời điểm tạo (UTC) |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `date`, `slotStart`, `fullName`, `phoneNumber` hoặc vượt độ dài (`ValidationProblemDetails` mặc định) | Message mặc định của DataAnnotations, ví dụ "The FullName field is required." |
| 400 | Số điện thoại không hợp lệ | `AuthMessage.InvalidPhone` "Phone number is invalid. Please check again." |
| 400 | Email sai định dạng hoặc > 256 ký tự | `AuthMessage.EmailInvalid` "Email is invalid. Please check again." |
| 400/404 | Lỗi dịch vụ, biến thể, loại phòng, cấu hình, ngày | Như F-APT-02 (`GeneralExamServiceMissing`, `ServiceNotFound`, `ServiceInactive`, `VariantNotFound`, `VariantInactive`, `ServicesNeedDifferentRooms`, `ConfigMissing`, `PastDate`, `TooFarAhead`) |
| 400 | Số điện thoại đã có tài khoản | `AppointmentMessage.PhoneHasAccount` "This phone number already has an account. Please sign in to book" |
| 400 | Slot không còn trống / không khớp slot nào / quá sát giờ | `AppointmentMessage.SlotNotAvailable` "This time slot is no longer available. Please choose another time" |
| 400 | Số điện thoại khớp > 1 hồ sơ chưa gắn tài khoản | `AuthMessage.MultiplePatientRecords` "This phone number belongs to more than one patient record. Please contact the reception desk." |
| 400 | Hồ sơ cũ còn lịch chưa kết thúc | `AppointmentMessage.PatientHasUnfinishedAppointment` "You already have an appointment that is not finished. Please finish or cancel it before booking a new one" |
| 409 | Trùng khóa duy nhất khi hai request cùng tạo bản ghi | "This record already exists" (`GlobalExceptionMiddleware.cs:61-66`) |

## 4. Luồng xử lý trong code

1. Controller nhận body, `[ApiController]` kiểm tra DataAnnotations (`AppointmentsController.cs:45-53`).
2. Chuẩn hóa số điện thoại sang E.164 bằng `PhoneNumberHelper.TryNormalize`; sai → `InvalidPhone` (`AppointmentService.cs:80-81`).
3. Trim email; rỗng → `null`; có giá trị thì kiểm tra độ dài và định dạng → `EmailInvalid` (`AppointmentService.cs:83-85`).
4. `ResolveBookingLinesAsync` dựng danh sách dịch vụ (khám tổng quát + chọn thêm) và kiểm tra loại phòng (`AppointmentService.cs:87`, chi tiết ở F-APT-02 bước 3).
5. Sinh các biến thể số để tra cứu (`GetLookupVariants`) (`:88`). Tìm `Users` có số này; có → `PhoneHasAccount` (`:91-92`, repo `RegistrationRepository.cs:17-21`).
6. `CreateBookingAsync` (`AppointmentService.cs:143-196`):
   1. Đọc `Clinic.SlotDurationMinutes` (`:147`).
   2. Mở transaction `Serializable`, tự thử lại tối đa 3 lần khi SQL Server báo deadlock 1205 (`AppointmentRepository.cs:46-71`).
   3. Gọi lại `FindSlotsAsync(lines, date, doctorId)` và lọc slot có `SlotStart == slotStart`; không có → `SlotNotAvailable` (`AppointmentService.cs:152-155`). Server không tin slot client gửi.
   4. Có `doctorId` → lấy ứng viên đầu; không có → `PickLeastBusyAsync`: bác sĩ có ít lịch giữ chỗ nhất trong ngày, hòa thì `DoctorId` nhỏ hơn (`:157`, `:257-266`).
   5. Lấy bệnh nhân (callback, `:95-116`): tìm hồ sơ `UserId == null`, chưa xóa mềm, cùng số (`RegistrationRepository.cs:32-40`); > 1 → `MultiplePatientRecords`; 0 → tạo `Patient` mới với `PatientCode = BN-{yyMMdd}-{6 số ngẫu nhiên}` (`AppointmentService.cs:388-391`), `FullName`, `PhoneNumber` E.164, `Email`, rồi `AddPatientAsync` (chưa lưu). 1 → dùng nguyên hồ sơ cũ (không cập nhật tên/email).
   6. Hồ sơ đã có Id: `HasUnfinishedAppointmentAsync` (lịch `PENDING`/`CONFIRMED`/`CHECKED_IN`/`IN_SERVICE` có ngày ≥ hôm nay) → `PatientHasUnfinishedAppointment` (`AppointmentService.cs:162-166`, `AppointmentRepository.cs:310-319`, `AppointmentConstants.cs:16`).
   7. Tạo `Appointment`: `AppointmentType = BOOKED`, `Status = PENDING`, `DoctorId`, `AppointmentDate`, `TimeSlotStart/End` theo slot đã chọn, `Notes`, `CreatedAt = UtcNow`, `CreatedByUserId = null`; kèm `AppointmentServiceItem` mỗi dòng với `DurationMinutes = GetMinutes`, `PriceAtBooking = Variant.ReferencePrice ?? Service.ReferencePrice` (`:168-190`).
   8. `AddAsync` + `SaveChangesAsync` (bệnh nhân mới được lưu cùng), commit (`:191-192`).
7. Gửi SMS (nếu có số) và email (nếu có), nội dung "OZE Dental: Your appointment request for {dịch vụ} at {HH:mm} on {dd/MM/yyyy} has been received. The receptionist will call to confirm."; lỗi gửi chỉ ghi log warning, không hoàn tác (`AppointmentService.cs:364-385`).
8. Ghi `AuditLog` action `APPOINTMENT_CREATED`, entity `Appointment`, giá trị mới gồm `Status`, ngày, giờ, `DoctorId`, tên dịch vụ (`AppointmentService.cs:1144-1154`).
9. Map `ToResponse` (che số điện thoại) và trả 200 (`AppointmentService.cs:393-425`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-01 | Khám tổng quát luôn tự thêm | `AppointmentService.cs:302` |
| BR-APT-03 | Một loại phòng, slot = tổng thời lượng | `AppointmentService.cs:311-316`, `FindSlotsAsync` |
| BR-APT-04 | Khoảng đặt trước | `FindSlotsAsync` `AppointmentService.cs:203-209` |
| BR-APT-05 | Lịch mới `PENDING`, giữ chỗ | `AppointmentService.cs:177` |
| BR-APT-09 | Số đã có tài khoản phải đăng nhập | `AppointmentService.cs:91-92` |
| BR-C03 | Số điện thoại lưu E.164 | `AppointmentService.cs:80`, `:108` |
| BR-C05 | Chốt giá và thời lượng lúc đặt | `AppointmentService.cs:182-189` |
| BR-C11 | Ghi audit khi đặt | `AppointmentService.cs:119` |
| (trong code) | Mỗi bệnh nhân chỉ một lịch chưa kết thúc | `AppointmentService.cs:162-166` |
| (trong code) | Dùng lại hồ sơ vãng lai cùng số | `AppointmentService.cs:98-101` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Patients` | Chưa có hoặc đã có (UserId null) | Tạo mới nếu chưa có | Không sửa hồ sơ cũ |
| `Appointments` | - | 1 dòng `Status = PENDING`, `AppointmentType = BOOKED` | `CreatedByUserId = null` |
| `AppointmentServices` (`AppointmentServiceItem`) | - | 1 dòng mỗi dịch vụ/biến thể | Chốt `DurationMinutes`, `PriceAtBooking` |
| `AuditLogs` | - | `APPOINTMENT_CREATED` | |

## 7. Liên quan

- Trước đó: F-APT-01, F-APT-02.
- Sau đó: F-APT-06 (lễ tân xác nhận), F-APT-07 (hủy, khách phải gọi lễ tân vì không có token), F-APT-08 (đổi lịch qua lễ tân). Khi khách đăng ký tài khoản bằng số này, hồ sơ vãng lai được gắn vào tài khoản (M1).

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `BookAsGuestAsync`.
- Ca cần test thêm:
  - Đặt thành công số mới → tạo bệnh nhân, lịch `PENDING`, số trả về đã che.
  - Số đã có tài khoản → `PhoneHasAccount`.
  - Số có 1 hồ sơ vãng lai → dùng lại, không tạo mới; hồ sơ đó còn lịch `PENDING` → `PatientHasUnfinishedAppointment`.
  - Số có 2 hồ sơ vãng lai → `MultiplePatientRecords`.
  - Slot vừa bị người khác đặt → `SlotNotAvailable`.
  - Không gửi `doctorId` → chọn bác sĩ ít lịch nhất.
  - SMS lỗi → vẫn 200.

## 9. Còn thiếu / câu hỏi mở

- **Lệch BR-APT-01 "giá 0"**: `PriceAtBooking` của khám tổng quát = `ReferencePrice` của dịch vụ đó (dữ liệu mẫu 100000), không phải 0.
- `FindUserByPhoneAsync` tìm trong **mọi** `Users`, gồm cả nhân viên. Nhân viên dùng số cá nhân để đặt lịch cũng bị `PhoneHasAccount`. Chưa xác định từ code đây là ý định hay sót.
- Hồ sơ vãng lai cũ được dùng lại nguyên trạng: `fullName`, `email` mới gửi lên bị bỏ qua, email thông báo vẫn gửi tới email trong request (không phải email hồ sơ).
- API công khai, không có rate limit (`[EnableRateLimiting]` không gắn). Rủi ro spam giữ chỗ; hiện chỉ dựa vào lễ tân gọi xác nhận.
- Lỗi model validation trả `ValidationProblemDetails`, không phải `ApiResponse` (lệch BR-C07).
- Quy tắc "mỗi bệnh nhân một lịch chưa kết thúc" có trong code nhưng chưa có mã BR trong tài liệu tổng.

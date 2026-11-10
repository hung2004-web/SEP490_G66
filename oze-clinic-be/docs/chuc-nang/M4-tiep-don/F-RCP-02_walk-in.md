# F-RCP-02 Walk-in: tạo lịch và check-in ngay

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `ClinicManager` |
| API | `POST api/appointments/walk-in` |
| Code chính | `AppointmentsController.CreateWalkInAsync` → `AppointmentService.CreateWalkInAsync` → `AppointmentRepository`, `RegistrationRepository.FindPatientsByPhoneAsync`, `QueueService.EnqueueAsync` |

## 1. Chức năng này làm gì

Khách đến không đặt trước. Lễ tân nhập thông tin, chọn bác sĩ và dịch vụ; hệ thống tìm hoặc tạo hồ sơ bệnh nhân theo số điện thoại, tạo lịch loại `WALK_IN` ở trạng thái `CHECKED_IN` ngay (không qua `PENDING`/`CONFIRMED`), đưa vào phòng của ca bác sĩ và cấp số hàng chờ khám.

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist` hoặc `ClinicManager`.
- Cấu hình `Booking.GeneralExamServiceCode` và `Clinic.SlotDurationMinutes` có trong `SystemConfigurations`; dịch vụ khám tổng quát tồn tại và active.
- Bác sĩ được chọn có ca **hôm nay chưa kết thúc** (đang chạy hoặc sắp tới) trong loại phòng phù hợp dịch vụ.
- Nếu số điện thoại đã có hồ sơ: hồ sơ đó không có lịch chưa xong từ hôm nay trở đi.

## 3. API

**Request** `POST api/appointments/walk-in`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `fullName` | string | Có | `[Required]`, `[MaxLength(100)]` | Họ tên (chỉ dùng khi tạo hồ sơ mới) |
| `phoneNumber` | string | Có | `[Required]`; chuẩn hóa E.164 bằng `PhoneNumberHelper.TryNormalize` | Số điện thoại, khóa tìm hồ sơ |
| `email` | string? | Không | ≤ 256 ký tự, đúng định dạng `EmailAddressAttribute` | |
| `dateOfBirth` | DateOnly? | Không | ≤ hôm nay (`ClinicClock.Today`) | |
| `gender` | string? | Không | `[MaxLength(10)]`; `Male`/`Female`/`Other` (không phân biệt hoa thường) | |
| `doctorId` | int? | Có | `[Required]` | Bác sĩ bệnh nhân yêu cầu (`StaffProfiles.Id`) |
| `serviceId` | int[] | Không | Dịch vụ active; tất cả cùng một loại phòng | Khám tổng quát tự thêm, có thể để rỗng |
| `variantId` | int[] | Không | Biến thể active và dịch vụ cha active | |
| `note` | string? | Không | `[MaxLength(500)]` | Ghi vào `Appointments.Notes` |
| `priority` | int? | Không | 0/1/2; null = 0 | Mức ưu tiên |
| `reason` | string? | Khi `priority` > 0 | `[MaxLength(500)]` | Lý do ưu tiên |

Ví dụ:

```json
{
  "fullName": "Nguyễn Văn An",
  "phoneNumber": "0912 345 678",
  "doctorId": 3,
  "serviceId": [12],
  "variantId": [],
  "priority": 2,
  "reason": "Chảy máu sau nhổ răng"
}
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, message `"Walk-in registered and added to the queue"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | long | Id lịch mới |
| `patientId`, `patientCode`, `patientName` | | Hồ sơ (mới hoặc có sẵn) |
| `patientPhoneNumber` | string | **Đã che** bằng `PhoneNumberHelper.Mask` (khác check-in) |
| `doctorId`, `doctorName` | | Lấy từ ca được chọn |
| `serviceId`, `serviceName` | | Dòng đầu tiên = khám tổng quát |
| `services[]` | | Dịch vụ, biến thể, `durationMinutes`, `priceAtBooking` |
| `appointmentType` | string | `WALK_IN` |
| `appointmentDate` | DateOnly | Hôm nay |
| `timeSlotStart`, `timeSlotEnd` | | Luôn null |
| `status` | string | `CHECKED_IN` |
| `checkInAt` | DateTimeOffset | Thời điểm tạo (UTC) |
| `roomId`, `roomName` | | Phòng của ca bác sĩ |
| `notes`, `createdAt` | | |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `fullName`/`phoneNumber`/`doctorId`, vượt độ dài | ProblemDetails mặc định của `[ApiController]` |
| 400 | Số điện thoại sai | `AuthMessage.InvalidPhone`: "Phone number is invalid. Please check again." |
| 400 | Email sai | `AuthMessage.EmailInvalid`: "Email is invalid. Please check again." |
| 400 | Giới tính sai | `PatientMessage.InvalidGender`: "Gender must be one of: Male, Female, Other" |
| 400 | Ngày sinh tương lai | `PatientMessage.InvalidDateOfBirth`: "Date of birth cannot be in the future" |
| 400 | Ưu tiên sai | `AppointmentMessage.PriorityInvalid`: "Priority must be 0 (normal), 1 (high) or 2 (urgent)" |
| 400 | Ưu tiên > 0 không lý do | `PriorityReasonRequired`: "A reason is required when the priority is above normal" |
| 400 | Thiếu cấu hình | `ConfigMissing`: "System configuration {0} is missing" (`{0}` = khóa) |
| 400 | Chưa có dịch vụ khám tổng quát / không active | `GeneralExamServiceMissing`: "The general exam service is not set up. Please contact the clinic" |
| 404 | Dịch vụ không tồn tại | `ServiceNotFound`: "Service not found" |
| 400 | Dịch vụ inactive | `ServiceInactive`: "This service is not available for booking" |
| 404 | Biến thể không tồn tại | `VariantNotFound`: "Service variant not found" |
| 400 | Biến thể inactive | `VariantInactive`: "This service variant is not available for booking" |
| 400 | Dịch vụ cần nhiều loại phòng | `ServicesNeedDifferentRooms`: "These services need different rooms and cannot be booked in one appointment" |
| 400 | Không có ca phù hợp và bác sĩ đã kết thúc một ca hôm nay | `CheckInDoctorShiftEnded`: "The doctor has already ended the shift today" |
| 400 | Không có ca phù hợp | `DoctorNoSuitableShiftToday`: "The doctor has no shift today in a room that suits these services" |
| 400 | Số điện thoại thuộc nhiều hồ sơ | `AuthMessage.MultiplePatientRecords`: "This phone number belongs to more than one patient record. Please contact the reception desk." |
| 400 | Hồ sơ có sẵn còn lịch chưa xong | `PatientHasUnfinishedAppointment`: "You already have an appointment that is not finished. Please finish or cancel it before booking a new one" |

## 4. Luồng xử lý trong code

1. `AppointmentsController.cs:70-78` nhận body, truyền `CurrentUserId` làm người tạo.
2. Kiểm tra dữ liệu trước khi chạm DB, theo thứ tự: số điện thoại (`AppointmentService.cs:823`), email (`:825-827`), giới tính (`:828`), ngày sinh (`:829-830`), mức ưu tiên (`:833-834`, `EnsureValidPriority` `:1137-1142`).
3. `AppointmentService.cs:836` `ResolveBookingLinesAsync` (`:284-319`): thêm khám tổng quát theo `Booking.GeneralExamServiceCode` đứng đầu, sau đó các dịch vụ đã chọn (bỏ trùng, bỏ khám tổng quát nếu chọn lại), rồi các biến thể; kiểm tra tồn tại, active, tối đa một loại phòng.
4. `AppointmentService.cs:839-843` `FindDoctorShiftAsync(doctorId, today, slot: null, loại phòng)` (`:949-965`): vì không có giờ hẹn, chọn ca đang chạy lúc `ClinicClock.Now`, nếu không có thì ca kế tiếp trong ngày. Không có ca → `CheckInDoctorShiftEnded` (nếu bác sĩ đã kết thúc ca hôm nay) hoặc `DoctorNoSuitableShiftToday`.
5. `AppointmentService.cs:845-846` đọc `Clinic.SlotDurationMinutes`, tạo các biến thể số điện thoại để tìm.
6. `AppointmentService.cs:848-903` chạy trong `ExecuteSerializableAsync` (`AppointmentRepository.cs:49-71`, transaction Serializable, thử lại tối đa 3 lần khi deadlock 1205):
   - `:851-852` tìm hồ sơ theo số điện thoại; > 1 hồ sơ → `MultiplePatientRecords`.
   - `:854-868` không có → tạo `Patient` mới (`PatientCode = BN-yyMMdd-xxxxxx`, `FullName`, `PhoneNumber` E.164, `Email`, `DateOfBirth`, `Gender`).
   - `:869-874` có sẵn → dùng nguyên hồ sơ (không cập nhật tên/email/ngày sinh), chặn nếu `HasUnfinishedAppointmentAsync` (`AppointmentRepository.cs:310-319`: lịch từ hôm nay trở đi ở `PENDING`/`CONFIRMED`/`CHECKED_IN`/`IN_SERVICE`).
   - `:876-900` tạo `Appointment`: `AppointmentType = WALK_IN`, `AppointmentDate = today`, `Status = CHECKED_IN`, `Priority`, `CheckInAt = now`, `TimeSlotStart/End` = null, `Notes`, `CreatedByUserId`, `ServiceItems` (thời lượng = ước tính của dịch vụ/biến thể hoặc 1 slot; `PriceAtBooking` = giá tham khảo). Lưu.
7. `AppointmentService.cs:906` sau transaction, `EnterExaminationQueueAsync` → `QueueService.EnqueueAsync` cấp số hàng chờ `Examination` (cơ chế khóa như F-RCP-01), `Notes` = lý do đã trim.
8. `AppointmentService.cs:908-910` audit `APPOINTMENT_CREATED` và `APPOINTMENT_CHECKED_IN` (giá trị cũ null).
9. `AppointmentService.cs:913-924` dựng response qua `ToResponse` (`:393-425`): số điện thoại che, giờ hẹn null, kèm phòng.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-RCP-04 | Walk-in không qua `PENDING`/`CONFIRMED`, vào thẳng `CHECKED_IN`, loại `WALK_IN` | `AppointmentService.cs:881-886` |
| BR-RCP-02 | Walk-in thuộc nhóm vãng lai, xếp sau lịch đặt cùng mức ưu tiên | F-RCP-04 |
| BR-APT-01 | Khám tổng quát tự thêm | `AppointmentService.cs:287-302` |
| BR-APT-03 | Dịch vụ cùng một loại phòng | `AppointmentService.cs:311-316` |
| BR-C03 | Số điện thoại chuẩn hóa E.164, sai thì từ chối trước khi truy vấn | `AppointmentService.cs:823` |
| BR-C05 | Giá, thời lượng chốt tại lúc tạo | `AppointmentService.cs:890-897` |
| (code) | Một bệnh nhân chỉ một lịch chưa xong | `AppointmentService.cs:872-873` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Patients` | — / có sẵn | Thêm mới nếu chưa có | Hồ sơ có sẵn không bị sửa |
| `Appointments` | — | `WALK_IN`, `CHECKED_IN`, `CheckInAt` | Không có giờ hẹn |
| `AppointmentServices` | — | Các dòng dịch vụ | |
| `QueueEntries` | — | `Examination`, `WAITING` | |
| `AuditLogs` | — | `APPOINTMENT_CREATED`, `APPOINTMENT_CHECKED_IN` | |

## 7. Liên quan

- Trước đó: không có (khách đến quầy).
- Sau đó: F-RCP-04, F-RCP-05, F-RCP-03, F-RCP-06, F-RCP-07, F-EXM-01. Hồ sơ walk-in có thể được liên kết khi bệnh nhân đăng ký tài khoản bằng OTP SMS (xem `AuthServiceTests.VerifyOtpAsync_WithSmsCodeAndWalkInRecord_ShouldLinkExistingPatient`).

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `CreateWalkInAsync`.
- Ca cần test thêm: số mới tạo hồ sơ; số cũ dùng hồ sơ cũ; số trùng nhiều hồ sơ; hồ sơ còn lịch chưa xong; bác sĩ không có ca / đã kết thúc ca; dịch vụ khác loại phòng; ưu tiên > 0 không lý do; hai quầy tạo cùng số điện thoại cùng lúc (deadlock retry).

## 9. Còn thiếu / câu hỏi mở

- Walk-in **không yêu cầu bác sĩ đã bấm bắt đầu ca**: ca sắp tới trong ngày cũng nhận.
- Tạo lịch (transaction) và cấp số hàng chờ tách rời: lỗi ở bước cấp số để lại lịch `CHECKED_IN` không có số.
- Hồ sơ có sẵn không được cập nhật theo `fullName`/`email`... nhập ở quầy; FE nên báo lễ tân.
- Message `PatientHasUnfinishedAppointment` viết cho bệnh nhân ("You already have..."), lễ tân đọc thấy lạ.
- `patientPhoneNumber` trong response walk-in bị che, còn check-in thì không; FE cần thống nhất.
- Quy tắc BR-APT-09 (số đã có tài khoản phải đăng nhập) không áp dụng cho walk-in: code dùng luôn hồ sơ có sẵn, kể cả hồ sơ có tài khoản.

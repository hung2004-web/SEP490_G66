# F-APT-04 Bệnh nhân đăng nhập đặt lịch

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Patient` |
| API | `POST api/appointments` |
| Code chính | `AppointmentsController.BookAsPatientAsync` → `AppointmentService.BookAsPatientAsync` → `CreateBookingAsync` → `AppointmentRepository` (`GetPatientByUserIdAsync`, `ExecuteSerializableAsync`, `HasUnfinishedAppointmentAsync`, `AddAsync`) |

## 1. Chức năng này làm gì

Bệnh nhân đã đăng nhập chọn dịch vụ và slot trống để đặt lịch cho chính mình. Hồ sơ bệnh nhân lấy từ token, không lấy từ request. Lịch tạo ra ở `PENDING`, giữ chỗ, chờ lễ tân xác nhận (F-APT-06).

## 2. Tiền điều kiện

- Đăng nhập với role `Patient`; tài khoản đã gắn một hồ sơ `Patients` (`UserId` = id tài khoản, chưa xóa mềm).
- Bệnh nhân không còn lịch chưa kết thúc (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`) từ hôm nay trở đi.
- Slot còn trống theo F-APT-02. Cấu hình như F-APT-02.

## 3. API

**Request** `POST api/appointments`, quyền `[Authorize(Roles = "Patient")]`. Body `BookingRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `serviceId` | `List<int>` | Không | Như F-APT-02 | Dịch vụ chọn thêm |
| `variantId` | `List<int>` | Không | Như F-APT-02 | Biến thể chọn |
| `date` | DateOnly? | Có | `[Required]` | Ngày khám |
| `slotStart` | TimeOnly? | Có | `[Required]`; phải trùng một slot trống | Giờ bắt đầu |
| `doctorId` | int? | Không | | `null` = hệ thống chọn bác sĩ ít lịch nhất |
| `note` | string? | Không | `[MaxLength(500)]` | Ghi chú / lý do khám |

```json
{ "serviceId": [], "variantId": [2], "date": "2026-11-20", "slotStart": "09:00:00", "doctorId": 3, "note": "Ê buốt răng" }
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, `message = "Appointment request received. The receptionist will call to confirm."`)

Giống F-APT-03 (cùng hàm `ToResponse`): `status = PENDING`, `appointmentType = BOOKED`, `patientPhoneNumber` đã che.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401 / 403 | Chưa đăng nhập / không phải `Patient` | Do ASP.NET trả, không qua `ErrorConstants` |
| 400 | Thiếu `date`, `slotStart`, `note` > 500 (`ValidationProblemDetails`) | Message mặc định DataAnnotations |
| 400/404 | Lỗi dịch vụ, biến thể, loại phòng, cấu hình, ngày | Như F-APT-02 |
| 400 | Slot không còn trống | `AppointmentMessage.SlotNotAvailable` "This time slot is no longer available. Please choose another time" |
| 404 | Tài khoản chưa gắn hồ sơ bệnh nhân | `AppointmentMessage.PatientProfileNotFound` "No patient profile is linked to this account" |
| 400 | Còn lịch chưa kết thúc | `AppointmentMessage.PatientHasUnfinishedAppointment` "You already have an appointment that is not finished. Please finish or cancel it before booking a new one" |

## 4. Luồng xử lý trong code

1. Controller lấy `CurrentUserId` từ claim `NameIdentifier`/`sub`; thiếu thì truyền chuỗi rỗng để không khớp ai (`AppointmentsController.cs:55-64`, `BaseApiController.cs:17-18`).
2. `ResolveBookingLinesAsync` dựng danh sách dịch vụ và kiểm tra loại phòng (`AppointmentService.cs:125`; chi tiết F-APT-02 bước 3).
3. `CreateBookingAsync(..., createdByUserId: userId, ...)` (`AppointmentService.cs:127-134`, thân hàm `:143-196`):
   1. Đọc `Clinic.SlotDurationMinutes`, mở transaction `Serializable` (thử lại khi deadlock, `AppointmentRepository.cs:49-71`).
   2. Kiểm tra lại slot bằng `FindSlotsAsync`; không khớp → `SlotNotAvailable` (`AppointmentService.cs:152-155`).
   3. Chọn bác sĩ: theo `doctorId` hoặc `PickLeastBusyAsync` (`:157`, `:257-266`).
   4. Callback lấy bệnh nhân theo `UserId` (`AppointmentRepository.cs:39-43`); không có → 404 `PatientProfileNotFound` (`AppointmentService.cs:131-133`).
   5. Kiểm tra lịch chưa kết thúc → `PatientHasUnfinishedAppointment` (`:162-166`).
   6. Tạo `Appointment` `PENDING`, `BOOKED`, `CreatedByUserId = userId`, kèm `AppointmentServiceItem` chốt giá và thời lượng; lưu và commit (`:168-192`).
4. Gửi SMS/email "đã nhận yêu cầu" tới `Patient.PhoneNumber`, `Patient.Email` của hồ sơ; lỗi chỉ log (`AppointmentService.cs:136`, `:364-385`).
5. Ghi audit `APPOINTMENT_CREATED` (`:137`, `:1144-1154`).
6. Trả `ToResponse` (`:138`, `:393-425`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-01 | Khám tổng quát tự thêm | `AppointmentService.cs:302` |
| BR-APT-03 | Một loại phòng, slot = tổng thời lượng | `AppointmentService.cs:311-316`, `FindSlotsAsync` |
| BR-APT-04 | Khoảng đặt trước | `AppointmentService.cs:203-209` |
| BR-APT-05 | Lịch mới `PENDING`, giữ chỗ | `AppointmentService.cs:177` |
| BR-C05 | Chốt giá và thời lượng | `AppointmentService.cs:182-189` |
| BR-C11 | Ghi audit | `AppointmentService.cs:137` |
| (trong code) | Bệnh nhân lấy từ token, không từ request | `AppointmentService.cs:130-133` |
| (trong code) | Mỗi bệnh nhân một lịch chưa kết thúc | `AppointmentService.cs:162-166` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments` | - | 1 dòng `PENDING`, `BOOKED`, `CreatedByUserId` = tài khoản bệnh nhân | |
| `AppointmentServices` | - | 1 dòng mỗi dịch vụ/biến thể | Chốt giá, thời lượng |
| `AuditLogs` | - | `APPOINTMENT_CREATED` | |

## 7. Liên quan

- Trước đó: M1 đăng ký/đăng nhập (tài khoản gắn hồ sơ bệnh nhân), F-APT-01, F-APT-02.
- Sau đó: F-APT-05 (lịch của tôi), F-APT-06 (xác nhận), F-APT-07 (tự hủy), F-APT-08 (tự đổi lịch).

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `BookAsPatientAsync` (controller test cũng chưa có ca đặt lịch).
- Ca cần test thêm:
  - Đặt thành công → `PENDING`, `CreatedByUserId` đúng tài khoản.
  - Tài khoản không có hồ sơ → 404.
  - Còn lịch `CONFIRMED` hôm nay hoặc tương lai → 400; lịch cũ quá ngày vẫn `PENDING` thì không chặn.
  - Hai request cùng slot, cùng bác sĩ → một thành công, một `SlotNotAvailable`.

## 9. Còn thiếu / câu hỏi mở

- Lệch BR-APT-01 "giá 0" như F-APT-03.
- Quy tắc "một lịch chưa kết thúc" chưa có mã BR trong tài liệu tổng.
- Lỗi model validation trả `ValidationProblemDetails`, không phải `ApiResponse` (lệch BR-C07).

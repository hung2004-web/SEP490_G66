# Hướng dẫn làm đặt lịch cho bệnh nhân đã đăng nhập và "lịch của tôi"

Hướng dẫn từng bước, làm theo thứ tự. Mỗi bước nhỏ, build được sau bước cuối của mỗi phần.

> Điều kiện: đã gỡ phần code cũ (BookingRequest, RescheduleAppointmentRequest và các hàm bệnh nhân). Đã có sẵn phần biến thể dịch vụ (`VariantId`, `BookingLine`, `ResolveBookingLinesAsync`) và không còn `Status` của dịch vụ trong lịch.

Mục tiêu:

| Việc | API |
|---|---|
| A. Bệnh nhân đã đăng nhập đặt lịch | `POST api/appointments` |
| B. Bệnh nhân xem lịch của mình | `GET api/appointments/my` |
| C. Đổi lịch | `POST api/appointments/{id}/reschedule` (làm theo `Huong_dan_reschedule_appointment.md`, kèm các chỉnh sửa ở phần C bên dưới) |

Không cần migration, không cần sửa database.

---

## Phần A. Đặt lịch cho bệnh nhân đã đăng nhập

Ý tưởng: bệnh nhân lấy từ **token**, không nhập tên, số điện thoại. Phần tạo lịch dùng chung với luồng khách, không viết lặp.

### A1. Tạo request chung `BookingRequest`

File mới `OZE.Common/Models/BookingRequest.cs` (mỗi model một file):

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // What every booking needs, whether a guest or a signed-in patient makes it
    public class BookingRequest
    {
        // Services the patient picked; the general exam is added by the system, so this may be empty
        public List<int> ServiceId { get; set; } = new();

        // Variants the patient picked; each one belongs to a service, which the system finds from the variant
        public List<int> VariantId { get; set; } = new();

        [Required]
        public DateOnly? Date { get; set; }

        [Required]
        public TimeOnly? SlotStart { get; set; }

        // Optional; null means the system picks the doctor with the fewest appointments
        public int? DoctorId { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
```

### A2. `GuestBookingRequest` kế thừa `BookingRequest`

Sửa `OZE.Common/Models/GuestBookingRequest.cs`, chỉ giữ phần riêng của khách:

```csharp
public class GuestBookingRequest : BookingRequest
{
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    public string PhoneNumber { get; set; } = string.Empty;

    public string? Email { get; set; }
}
```

### A3. Thêm message lỗi

Trong `ErrorConstants.AppointmentMessage`:

```csharp
public const string PatientProfileNotFound = "No patient profile is linked to this account";
```

### A4. Thêm hàm lấy bệnh nhân theo tài khoản

`IAppointmentRepository`:

```csharp
Task<Patient?> GetPatientByUserIdAsync(string userId);
```

`AppointmentRepository`:

```csharp
public async Task<Patient?> GetPatientByUserIdAsync(string userId)
{
    return await _context.Patients
        .FirstOrDefaultAsync(x => x.UserId == userId && x.DeletedAt == null);
}
```

Chỉ lấy hồ sơ chưa bị xóa mềm (`DeletedAt == null`).

### A5. Tách phần tạo lịch dùng chung trong `AppointmentService`

Hiện toàn bộ nằm trong `BookAsGuestAsync`. Tách phần "kiểm tra lại slot, tạo `Appointment`, lưu" ra hàm riêng:

```csharp
// Re-checks the slot and saves the appointment in one serializable transaction;
// getPatientAsync runs inside it so a new patient record is saved together with the appointment
private async Task<(Appointment Appointment, Patient Patient, AvailableSlotResponse Slot)> CreateBookingAsync(
    List<BookingLine> lines, DateOnly date, TimeOnly slotStart, int? doctorId, string? note,
    string? createdByUserId, Func<Task<Patient>> getPatientAsync)
{
    var slotMinutes = await GetIntConfigAsync(ConfigKeyConstants.SlotDurationMinutes);

    return await _appointmentRepository.ExecuteSerializableAsync(async () =>
    {
        // Re-check inside the transaction; never trust the slot sent by the client
        var candidates = (await FindSlotsAsync(lines, date, doctorId))
            .Where(x => x.SlotStart == slotStart)
            .ToList();
        ConditionGuard.Ensure(candidates.Count > 0, ErrorConstants.AppointmentMessage.SlotNotAvailable);

        var chosen = doctorId.HasValue ? candidates[0] : await PickLeastBusyAsync(candidates, date);
        var patient = await getPatientAsync();

        var appointment = new Appointment
        {
            Patient = patient,
            DoctorId = chosen.DoctorId,
            AppointmentType = AppointmentConstants.BookedType,
            AppointmentDate = date,
            TimeSlotStart = chosen.SlotStart,
            TimeSlotEnd = chosen.SlotEnd,
            Status = AppointmentConstants.PendingStatus,
            Notes = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByUserId = createdByUserId,
            ServiceItems = lines.Select(l => new AppointmentServiceItem
            {
                ServiceId = l.Service.Id,
                VariantId = l.Variant?.Id,
                DurationMinutes = l.GetMinutes(slotMinutes),
                PriceAtBooking = l.Price,
                CreatedAt = DateTimeOffset.UtcNow
            }).ToList()
        };
        await _appointmentRepository.AddAsync(appointment);
        await _appointmentRepository.SaveChangesAsync();

        return (appointment, patient, chosen);
    });
}
```

Điểm khác nhau giữa khách và bệnh nhân chỉ là cách **lấy bệnh nhân**, nên truyền vào dưới dạng `getPatientAsync`. Hàm này chạy **bên trong** giao dịch, để bệnh nhân mới (của khách) được lưu cùng lịch.

### A6. Cho `BookAsGuestAsync` dùng hàm chung

Phần đầu hàm (kiểm tra số điện thoại, email, `ResolveBookingLinesAsync`, kiểm tra `PhoneHasAccount`) giữ nguyên. Thay phần `ExecuteSerializableAsync(...)` bằng:

```csharp
var (appointment, patient, slot) = await CreateBookingAsync(lines, request.Date!.Value, request.SlotStart!.Value,
    request.DoctorId, request.Note, null, async () =>
    {
        // AC6: reuse the walk-in record of this phone, or create a new one
        var patients = await _registrationRepository.FindUnlinkedPatientsByPhoneAsync(phoneVariants);
        ConditionGuard.ThrowIf(patients.Count > 1, ErrorConstants.AuthMessage.MultiplePatientRecords);

        var patient = patients.FirstOrDefault();
        if (patient == null)
        {
            patient = new Patient
            {
                PatientCode = GeneratePatientCode(),
                FullName = request.FullName.Trim(),
                PhoneNumber = phone,
                Email = email,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await _appointmentRepository.AddPatientAsync(patient);
        }

        return patient;
    });

await SendBookingNotificationAsync(phone, email, appointment, lines);
return ToResponse(appointment, patient, slot, lines);
```

Biến `slotMinutes` trong `BookAsGuestAsync` không còn dùng, xóa đi.

### A7. Hàm `BookAsPatientAsync`

```csharp
public async Task<AppointmentResponse> BookAsPatientAsync(BookingRequest request, string userId)
{
    var lines = await ResolveBookingLinesAsync(request.ServiceId, request.VariantId);

    var (appointment, patient, slot) = await CreateBookingAsync(lines, request.Date!.Value, request.SlotStart!.Value,
        request.DoctorId, request.Note, userId, async () =>
        {
            // The patient comes from the token, never from the request
            var existing = await _appointmentRepository.GetPatientByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(existing != null, ErrorConstants.AppointmentMessage.PatientProfileNotFound);
            return existing!;
        });

    await SendBookingNotificationAsync(patient.PhoneNumber, patient.Email, appointment, lines);
    return ToResponse(appointment, patient, slot, lines);
}
```

Hồ sơ bệnh nhân có thể thiếu số điện thoại hoặc email, nên `SendBookingNotificationAsync` phải nhận `string? phone` và bỏ qua kênh trống:

```csharp
private async Task SendBookingNotificationAsync(string? phone, string? email, Appointment appointment, List<BookingLine> lines)
...
    if (!string.IsNullOrWhiteSpace(phone))
    {
        await _smsSender.SendSmsAsync(phone, message);
    }
    if (!string.IsNullOrWhiteSpace(email))
    {
        await _emailSender.SendEmailAsync(email, "OZE Dental - Appointment request", message);
    }
```

`CreatedByUserId = userId` ghi lại tài khoản đã đặt lịch.

### A8. Khai báo trong interface

`IAppointmentService`:

```csharp
Task<AppointmentResponse> BookAsPatientAsync(BookingRequest request, string userId);
```

### A9. Thêm endpoint

`AppointmentsController`, gần `guest-booking`:

```csharp
// POST api/appointments
[HttpPost]
[Authorize(Roles = RoleConstants.PatientRole)]
public async Task<ActionResult<ApiResponse<AppointmentResponse>>> BookAsPatientAsync([FromBody] BookingRequest request)
{
    // The empty fallback matches no patient, so a missing user id never books for someone else
    var appointment = await _appointmentService.BookAsPatientAsync(request, CurrentUserId ?? string.Empty);
    return Ok(ApiResponse<AppointmentResponse>.SuccessResult(appointment,
        "Appointment request received. The receptionist will call to confirm."));
}
```

### A10. Kiểm tra phần A (Swagger)

Chuẩn bị: DB đã áp migration, có dịch vụ, ca bác sĩ, `Booking.GeneralExamServiceCode`, và một tài khoản bệnh nhân **có hồ sơ** (`Patients.UserId` khớp tài khoản).

| # | Tình huống | Mong đợi |
|---|---|---|
| 1 | Đăng nhập bệnh nhân, đặt lịch slot trống | 200, lịch `PENDING`, `CreatedByUserId` đúng tài khoản |
| 2 | Không đăng nhập | 401 |
| 3 | Đăng nhập bằng vai trò lễ tân hoặc bác sĩ | 403 |
| 4 | Tài khoản bệnh nhân chưa có hồ sơ | 404 `PatientProfileNotFound` |
| 5 | Slot đã có người đặt | 400 `SlotNotAvailable` |
| 6 | Dịch vụ hoặc biến thể không tồn tại hoặc đã tắt | 404 hoặc 400 |
| 7 | `guest-booking` vẫn chạy như cũ với khách chưa có tài khoản | 200 |
| 8 | `guest-booking` với số điện thoại đã có tài khoản | 400 `PhoneHasAccount` |

---

## Phần B. `GET api/appointments/my`

Không cần sửa repository: danh sách lịch hiện có đã lọc theo `PatientId`, `status`, ngày, phân trang.

### B1. Interface

`IAppointmentService`:

```csharp
Task<PagedResult<AppointmentResponse>> GetMyAppointmentsAsync(AppointmentQueryParameters query, string userId, CancellationToken cancellationToken = default);
```

### B2. Service

```csharp
public async Task<PagedResult<AppointmentResponse>> GetMyAppointmentsAsync(AppointmentQueryParameters query, string userId, CancellationToken cancellationToken = default)
{
    var patient = await _appointmentRepository.GetPatientByUserIdAsync(userId);
    ConditionGuard.Ensure<NotFoundException>(patient != null, ErrorConstants.AppointmentMessage.PatientProfileNotFound);

    // Always the signed-in patient's own id; a PatientId sent by the client is overwritten
    query.PatientId = patient!.Id;
    return await GetAppointmentsAsync(query, cancellationToken);
}
```

Dòng `query.PatientId = patient.Id` là chỗ **bảo mật**: dù client gửi `patientId` của người khác cũng bị ghi đè.

### B3. Controller

```csharp
[HttpGet("my")]
[Authorize(Roles = RoleConstants.PatientRole)]
public async Task<ActionResult<ApiResponse<PagedResult<AppointmentResponse>>>> GetMyAppointmentsAsync(
    [FromQuery] AppointmentQueryParameters query,
    CancellationToken cancellationToken)
{
    var result = await _appointmentService.GetMyAppointmentsAsync(query, CurrentUserId ?? string.Empty, cancellationToken);
    return Ok(ApiResponse<PagedResult<AppointmentResponse>>.SuccessResult(result));
}
```

### B4. Kiểm tra

| # | Tình huống | Mong đợi |
|---|---|---|
| 1 | Bệnh nhân A gọi `/my` | Chỉ thấy lịch của A |
| 2 | A gửi `?patientId=<id của B>` | Vẫn chỉ thấy lịch của A |
| 3 | Lọc `?status=PENDING`, `?fromDate=...&toDate=...` | Lọc đúng |
| 4 | `?sortDescending=true` | Lịch mới nhất trước |
| 5 | Không đăng nhập hoặc vai trò khác | 401 hoặc 403 |

---

## Phần C. Đổi lịch

Làm theo `docs/Huong_dan_reschedule_appointment.md`, **kèm 3 chỉnh sửa** vì hướng dẫn đó viết trước khi có biến thể:

1. **`FindSlotsAsync` nhận `List<BookingLine>`** (không phải `List<Service>`). Thêm tham số `long? excludeAppointmentId = null` vào cuối và lọc `booked` như trong hướng dẫn.
2. **Dựng danh sách dòng từ lịch** bằng:
   ```csharp
   var lines = appointment.ServiceItems.Select(i => new BookingLine(i.Service, i.Variant)).ToList();
   ```
   thay cho `services = ...Select(i => i.Service!)`.
3. **Bỏ đoạn cập nhật status từng dịch vụ.** Trong hướng dẫn có vòng `foreach` đổi `item.Status` sang `ServiceConfirmedStatus` khi nhân viên đổi lịch. Cột này đã bị xóa, bỏ cả vòng lặp.

Khách vãng lai (không có tài khoản) không tự đổi lịch được: họ tự gọi điện nhờ lễ tân, lễ tân đổi giúp bằng chính API này (nhánh dành cho nhân viên, không giới hạn hạn, lịch thành `CONFIRMED` và gửi SMS, email báo khách). Nhánh "bệnh nhân tự đổi" chỉ dành cho bệnh nhân có tài khoản.

Ngoài ra, hạn đổi dùng chung `Booking.CancelCutoffHours` qua hàm `EnsureBeforeCutoffAsync` (tách từ hàm hủy). Hạn này đang là 24 giờ trong database; nếu muốn 2 giờ thì sửa giá trị config, không sửa code.

Hạn chế đã biết: thời lượng slot mới tính từ danh mục dịch vụ hiện tại, trong khi `DurationMinutes` chốt trong lịch không đổi.

---

## Danh sách kiểm tra khi làm xong

- [ ] `dotnet build` không lỗi mới (còn 3 cảnh báo `CS8602` cũ ở hàm hủy, xác nhận, check-in).
- [ ] `dotnet test` vẫn qua.
- [ ] `guest-booking` chạy như trước.
- [ ] Đã chạy tay các bảng kiểm tra ở A10 và B4, và các tình huống ở mục 6 của hướng dẫn đổi lịch.
- [ ] Không commit file cấu hình có khóa bí mật (`appsettings*.json`).

## Việc để sau

- Chặn bệnh nhân giữ hai lịch cùng giờ (chưa quyết).
- SMS "đã ghi nhận giờ mới" cho bệnh nhân khi tự đổi lịch.
- Unit test cho `BookAsPatientAsync`, `GetMyAppointmentsAsync`, `RescheduleAppointmentAsync`.
- Đổi dịch vụ khi đổi lịch.

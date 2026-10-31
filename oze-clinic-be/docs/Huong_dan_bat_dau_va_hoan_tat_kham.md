# Hướng dẫn làm "bắt đầu khám" và "hoàn tất khám"

Hướng dẫn từng bước, làm theo thứ tự. Mỗi phần nhỏ, có thể build sau mỗi phần.

> Trạng thái: **chưa có code**, đây là bản hướng dẫn. Chỉ cần dùng những thứ đã có sẵn: `StartExamination` dùng lại `GetStaffProfileIdByUserIdAsync`, `ConditionGuard`, `AppointmentConstants`, bảng `Examinations`.

## 1. Mục tiêu

Bác sĩ có hai nút:

| Nút | Endpoint | Kết quả |
|---|---|---|
| **Bắt đầu khám** | `POST api/appointments/{id}/start-examination` | Lịch `CHECKED_IN` thành `IN_SERVICE`, tạo phiếu khám `InProgress` |
| **Hoàn tất** | `POST api/appointments/{id}/complete-examination` | Phiếu thành `Locked` (khóa luôn), lịch thành `COMPLETED` |

**Đã chốt, không làm trong phần này**: điều kiện tối thiểu để hoàn tất, giao dịch serializable, audit, test mới, tự khóa bằng tiến trình nền, chờ phim, yêu cầu chỉnh sửa phiếu đã khóa.

## 2. Quy tắc

**Bắt đầu khám**

| # | Điều kiện | Nếu không thỏa |
|---|---|---|
| 1 | Tài khoản đăng nhập có hồ sơ bác sĩ | 404, `DoctorProfileNotFound` (đã có sẵn) |
| 2 | Lịch hẹn tồn tại và thuộc đúng bác sĩ này | 404, `AppointmentNotFound` (lịch của bác sĩ khác trông như không tồn tại) |
| 3 | Lịch đang `CHECKED_IN` | 400, `OnlyCheckedInCanStartExamination` |
| 4 | Lịch là của ngày hôm nay | 400, `ExaminationWrongDay` |
| 5 | Bác sĩ chưa có lịch `IN_SERVICE` nào trong ngày | 400, `DoctorAlreadyExamining` |

Bác sĩ **chọn bất kỳ ai** trong danh sách chờ, không bắt buộc người đầu danh sách.

**Hoàn tất khám**

| # | Điều kiện | Nếu không thỏa |
|---|---|---|
| 1 | Tài khoản có hồ sơ bác sĩ | 404 |
| 2 | Lịch thuộc đúng bác sĩ này | 404 |
| 3 | Lịch đang `IN_SERVICE` | 400, `OnlyInServiceCanBeCompleted` |
| 4 | Lịch có phiếu khám | 400, `ExaminationNotFound` |
| 5 | Phiếu đang `InProgress` (chưa khóa) | 400, `ExaminationAlreadyLocked` |

Việc đổi trạng thái là do **bác sĩ bấm**, hệ thống chỉ thực hiện khi có yêu cầu.

---

## 3. Làm từng bước

### Bước 1. Hằng số trạng thái phiếu khám

File mới `OZE.Common/Constants/ExaminationConstants.cs`:

```csharp
namespace OZE.Common.Constants
{
    // Must match the check constraint CK_Examinations_Status in ExaminationConfiguration
    public static class ExaminationConstants
    {
        public const string InProgressStatus = "InProgress";
        // A finished examination is locked at once, so "Completed" is not used by the clinic's flow
        public const string LockedStatus = "Locked";
    }
}
```

Không cần sửa `ImagingRequestConstants`, nó vẫn có hằng số `InProgressExaminationStatus` riêng.

### Bước 2. Thông báo lỗi

Trong `ErrorConstants.AppointmentMessage` (cùng chỗ với `DoctorProfileNotFound`) thêm:

```csharp
public const string OnlyCheckedInCanStartExamination = "Only a patient who is checked in can be examined";
public const string ExaminationWrongDay = "An examination can only be started on the day of the appointment";
public const string DoctorAlreadyExamining = "You are already examining another patient. Complete that examination first";
public const string OnlyInServiceCanBeCompleted = "Only an examination that is in progress can be completed";
public const string ExaminationNotFound = "No examination was found for this appointment";
public const string ExaminationAlreadyLocked = "This examination is already completed and locked";
```

### Bước 3. Model kết quả của "bắt đầu khám"

Mỗi model một file. File mới `OZE.Common/Models/StartExaminationResponse.cs`:

```csharp
namespace OZE.Common.Models
{
    public class StartExaminationResponse
    {
        public long ExaminationId { get; set; }
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string ExaminationStatus { get; set; } = string.Empty;
        // Filled in from the note left when booking; the doctor corrects it during the examination
        public string? ChiefComplaint { get; set; }
        public DateTimeOffset StartedAt { get; set; }
    }
}
```

"Hoàn tất khám" trả về `AppointmentResponse` đã có.

### Bước 4. Repository

**Khai báo** trong `OZE.Application/Interfaces/IAppointmentRepository.cs`:

```csharp
// The appointment with its patient, services and examination, for the doctor's start and complete actions
Task<Appointment?> GetByIdWithExaminationAsync(long id, CancellationToken cancellationToken = default);
Task<bool> HasAppointmentInServiceAsync(int doctorId, DateOnly date);
Task AddExaminationAsync(Examination examination);
```

**Cài đặt** trong `OZE.Persistence/Repositories/AppointmentRepository.cs`:

```csharp
public async Task<Appointment?> GetByIdWithExaminationAsync(long id, CancellationToken cancellationToken = default)
{
    return await _context.Appointments
        .Include(x => x.Patient)
        .Include(x => x.Doctor)
        .Include(x => x.Examination)
        .Include(x => x.ServiceItems)
            .ThenInclude(x => x.Service)
        .Include(x => x.ServiceItems)
            .ThenInclude(x => x.Variant)
        .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
}

public async Task<bool> HasAppointmentInServiceAsync(int doctorId, DateOnly date)
{
    return await _context.Appointments
        .AnyAsync(x => x.DoctorId == doctorId
            && x.AppointmentDate == date
            && x.Status == AppointmentConstants.InServiceStatus);
}

public async Task AddExaminationAsync(Examination examination)
{
    await _context.Examinations.AddAsync(examination);
}
```

Lưu ý: hàm tải lịch **không dùng `AsNoTracking`**, vì sau đó ta sửa trạng thái và lưu. `SaveChangesAsync` đã có sẵn trong repository.

### Bước 5. Khai báo trong `IAppointmentService`

```csharp
// Both actions belong to the doctor of the appointment; doctorUserId is the signed-in account
Task<StartExaminationResponse> StartExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default);
Task<AppointmentResponse> CompleteExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default);
```

### Bước 6. Viết hai hàm trong `AppointmentService`

Đặt gần `CheckInAppointmentAsync`.

```csharp
public async Task<StartExaminationResponse> StartExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default)
{
    var doctorId = await _appointmentRepository.GetStaffProfileIdByUserIdAsync(doctorUserId);
    ConditionGuard.Ensure<NotFoundException>(doctorId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);

    var appointment = await _appointmentRepository.GetByIdWithExaminationAsync(id, cancellationToken);
    // Another doctor's appointment looks like "not found"
    ConditionGuard.Ensure<NotFoundException>(appointment != null && appointment.DoctorId == doctorId,
        ErrorConstants.AppointmentMessage.AppointmentNotFound);

    ConditionGuard.ThrowIf(appointment!.Status != AppointmentConstants.CheckedInStatus,
        ErrorConstants.AppointmentMessage.OnlyCheckedInCanStartExamination);
    ConditionGuard.ThrowIf(appointment.AppointmentDate != DateOnly.FromDateTime(DateTime.Today),
        ErrorConstants.AppointmentMessage.ExaminationWrongDay);
    // A doctor examines one patient at a time
    ConditionGuard.ThrowIf(await _appointmentRepository.HasAppointmentInServiceAsync(doctorId!.Value, appointment.AppointmentDate),
        ErrorConstants.AppointmentMessage.DoctorAlreadyExamining);

    var now = DateTimeOffset.UtcNow;
    var examination = new Examination
    {
        AppointmentId = appointment.Id,
        PatientId = appointment.PatientId,
        DoctorId = doctorId.Value,
        ChiefComplaint = appointment.Notes,
        ExaminationStatus = ExaminationConstants.InProgressStatus,
        CreatedAt = now
    };

    appointment.Status = AppointmentConstants.InServiceStatus;
    appointment.UpdatedAt = now;

    // One save: the new examination and the appointment's new status are stored together
    await _appointmentRepository.AddExaminationAsync(examination);
    await _appointmentRepository.SaveChangesAsync();

    return new StartExaminationResponse
    {
        ExaminationId = examination.Id,
        AppointmentId = appointment.Id,
        PatientId = appointment.PatientId,
        PatientName = appointment.Patient?.FullName ?? string.Empty,
        ExaminationStatus = examination.ExaminationStatus,
        ChiefComplaint = examination.ChiefComplaint,
        StartedAt = now
    };
}

public async Task<AppointmentResponse> CompleteExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default)
{
    var doctorId = await _appointmentRepository.GetStaffProfileIdByUserIdAsync(doctorUserId);
    ConditionGuard.Ensure<NotFoundException>(doctorId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);

    var appointment = await _appointmentRepository.GetByIdWithExaminationAsync(id, cancellationToken);
    ConditionGuard.Ensure<NotFoundException>(appointment != null && appointment.DoctorId == doctorId,
        ErrorConstants.AppointmentMessage.AppointmentNotFound);

    ConditionGuard.ThrowIf(appointment!.Status != AppointmentConstants.InServiceStatus,
        ErrorConstants.AppointmentMessage.OnlyInServiceCanBeCompleted);
    var examination = appointment.Examination;
    ConditionGuard.ThrowIf(examination == null, ErrorConstants.AppointmentMessage.ExaminationNotFound);
    ConditionGuard.ThrowIf(examination!.ExaminationStatus != ExaminationConstants.InProgressStatus,
        ErrorConstants.AppointmentMessage.ExaminationAlreadyLocked);

    // Completing the examination locks it at once; later changes go through a change request
    var now = DateTimeOffset.UtcNow;
    examination.ExaminationStatus = ExaminationConstants.LockedStatus;
    examination.LockedAt = now;
    examination.LockedByUserId = doctorUserId;
    examination.UpdatedAt = now;
    appointment.Status = AppointmentConstants.CompletedStatus;
    appointment.UpdatedAt = now;

    await _appointmentRepository.SaveChangesAsync();
    return MapToResponse(appointment);
}
```

Giải thích các điểm dễ sai:

- **`doctorId` là số của `StaffProfiles`**, không phải mã tài khoản. `Appointment.DoctorId` cũng là số này, nên so sánh trực tiếp.
- **Điều kiện lịch của bác sĩ khác** gộp chung với "không tìm thấy" để người ngoài không biết lịch đó tồn tại.
- **Một lần `SaveChangesAsync`** lưu cả phiếu mới lẫn trạng thái lịch, nên không bao giờ có lịch `IN_SERVICE` mà thiếu phiếu.
- **Bấm "bắt đầu" hai lần** bị chặn ở điều kiện 3 (lịch đã `IN_SERVICE`). Database còn có index duy nhất theo `AppointmentId` của phiếu như lớp chặn thứ hai.
- **Bấm "hoàn tất" hai lần** bị chặn ở điều kiện 3 (lịch đã `COMPLETED`).
- `using OZE.Domain.Entities;` đã có sẵn trong file service. Nếu thiếu thì thêm.

### Bước 7. Thêm hai action vào controller

Trong `OZE/Controllers/AppointmentsController.cs`, gần action `check-in`:

```csharp
/// <summary>
/// The doctor starts examining a patient who is waiting: the appointment goes in service and an examination is created.
/// </summary>
[HttpPost("{id:long}/start-examination")]
[Authorize(Roles = RoleConstants.DoctorRole)]
public async Task<ActionResult<ApiResponse<StartExaminationResponse>>> StartExaminationAsync(
    [FromRoute] long id,
    CancellationToken cancellationToken)
{
    // The empty fallback matches no doctor, so a missing user id never starts someone else's examination
    var result = await _appointmentService.StartExaminationAsync(id, CurrentUserId ?? string.Empty, cancellationToken);
    return Ok(ApiResponse<StartExaminationResponse>.SuccessResult(result, "Bắt đầu khám thành công"));
}

/// <summary>
/// The doctor completes the examination: it is locked at once and the appointment is completed.
/// </summary>
[HttpPost("{id:long}/complete-examination")]
[Authorize(Roles = RoleConstants.DoctorRole)]
public async Task<ActionResult<ApiResponse<AppointmentResponse>>> CompleteExaminationAsync(
    [FromRoute] long id,
    CancellationToken cancellationToken)
{
    var result = await _appointmentService.CompleteExaminationAsync(id, CurrentUserId ?? string.Empty, cancellationToken);
    return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Hoàn tất khám thành công"));
}
```

### Bước 8. Build

`dotnet build` rồi `dotnet test` để chắc không làm hỏng test hiện có. Không cần migration: bảng `Examinations` và các ràng buộc đã đủ.

---

## 4. Cách tự kiểm tra bằng Swagger (tùy chọn)

Cần một bác sĩ có tài khoản đăng nhập, lịch `CONFIRMED` của hôm nay và đã check-in (xem `Huong_dan_nhap_du_lieu_mau.md`).

| # | Tình huống | Mong đợi |
|---|---|---|
| 1 | Bác sĩ bắt đầu khám lịch `CHECKED_IN` của mình | 200, trả mã phiếu khám, lịch `IN_SERVICE` |
| 2 | Bấm bắt đầu lần hai cho cùng lịch | 400, `OnlyCheckedInCanStartExamination` |
| 3 | Bắt đầu khám người khác khi đang khám một người | 400, `DoctorAlreadyExamining` |
| 4 | Bác sĩ khác bắt đầu khám lịch này | 404 |
| 5 | Lịch chưa check-in (`CONFIRMED`) | 400 |
| 6 | Lễ tân hoặc bệnh nhân gọi endpoint | 403 |
| 7 | Hoàn tất lịch `IN_SERVICE` của mình | 200, lịch `COMPLETED` |
| 8 | Hoàn tất lần hai | 400, `OnlyInServiceCanBeCompleted` |
| 9 | Sau bước 7, `GET api/medical-records/examinations/{id}` | Trạng thái phiếu `Locked` |
| 10 | Sau bước 1, tạo chỉ định chụp phim `POST api/examinations/{id}/imaging-requests` | Chạy được (lần đầu API có sẵn có phiếu khám thật) |

## 5. Danh sách kiểm tra khi làm xong

- [ ] `dotnet build` không lỗi mới.
- [ ] `dotnet test`: các test hiện có vẫn qua.
- [ ] Danh sách chờ: sau khi bắt đầu khám, bệnh nhân đó **biến khỏi** danh sách chờ (vì không còn `CHECKED_IN`).
- [ ] Không commit file cấu hình có khóa bí mật (`appsettings*.json`).

## 6. Việc để sau

- **Ghi nội dung khám**: lý do khám, ghi chú lâm sàng, sơ đồ răng, chẩn đoán.
- **Điều kiện tối thiểu** để hoàn tất khám (ví dụ phải có ghi chú hoặc chẩn đoán), thêm khi đã có phần ghi nội dung.
- **Yêu cầu chỉnh sửa phiếu đã khóa**: bác sĩ gửi, quản lý duyệt, hệ thống tạo phụ lục. Cần một bảng mới và nên làm sớm, vì khóa xong mà chưa có đường sửa thì bác sĩ gõ nhầm là kẹt.
- **Chờ phim**: bác sĩ khám người khác trong lúc bệnh nhân đi chụp, người chụp xong quay lại lên đầu danh sách. Cần thêm trạng thái phiếu khám.
- **Kết thúc ca tự động** (`NO_SHOW` kèm lý do), **khách vãng lai**.
- **Audit** và **unit test** cho hai nút này, khi bạn cần.

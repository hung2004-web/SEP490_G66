# Hướng dẫn làm chức năng Reschedule Appointment (đổi lịch hẹn)

Tài liệu này hướng dẫn từng bước thêm chức năng **đổi lịch hẹn** vào BE OZE Clinic. Người làm chỉ cần đọc và làm theo thứ tự.

> Trạng thái: **chưa có code**. Đây là bản hướng dẫn. Các chức năng liên quan đã có sẵn: đặt lịch (`BookAsGuestAsync`), xác nhận (`ConfirmAppointmentAsync`), hủy (`CancelAppointmentAsync`), kiểm tra chủ sở hữu (`EnsureOwnedBy`).

---

## 1. Reschedule là gì

Dời một lịch hẹn đã đặt sang **giờ khác** (và có thể **bác sĩ khác**), giữ nguyên lịch cũ, không hủy rồi đặt lại.

| | Hủy lịch | Đổi lịch |
|---|---|---|
| Kết quả | Lịch mất, giải phóng giờ | Lịch còn, chuyển sang giờ mới |
| Trạng thái sau | `CANCELLED` | `PENDING` hoặc `CONFIRMED` |

## 2. Quy tắc nghiệp vụ (đã chốt)

| Ai đổi | Lịch đang ở | Được không | Sau khi đổi |
|---|---|---|---|
| Bệnh nhân | `PENDING`, còn đủ hạn | Được | Vẫn `PENDING` (chờ lễ tân xác nhận) |
| Bệnh nhân | `PENDING`, quá hạn | Không, báo gọi phòng khám | - |
| Bệnh nhân | `CONFIRMED` | **Không**, phải liên hệ lễ tân | - |
| Lễ tân, quản lý | `PENDING` hoặc `CONFIRMED` | Được, không bị hạn | `CONFIRMED` |
| Khách vãng lai (không có tài khoản) | Bất kỳ | **Không tự đổi được**, phải gọi điện nhờ lễ tân đổi giúp | - |
| Ai cũng vậy | `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW` | Không | - |

- **Hạn** dùng chung config `Booking.CancelCutoffHours` (mặc định 24 giờ), tính từ **giờ khám hiện tại** (giờ cũ) đến bây giờ.
- Bệnh nhân chỉ đổi **lịch của chính mình**. Lịch của người khác trả 404.
- Bác sĩ (role Doctor) **không** được đổi lịch.
- Khách vãng lai (chưa có tài khoản) **không tự đổi được**, vì không có token để gọi API. Khách tự gọi điện nhờ lễ tân, lễ tân đổi giúp bằng API này. Lịch đổi xong thành `CONFIRMED` và hệ thống gửi SMS, email báo giờ mới cho khách. Hủy lịch cũng làm theo cách này.
- Giai đoạn 1 chỉ đổi **ngày, giờ, bác sĩ**. Đổi **dịch vụ** để giai đoạn sau (liên quan phòng và thời lượng).

## 3. Các file cần sửa

| # | File | Việc |
|---|---|---|
| 1 | `OZE.Common/Models/RescheduleAppointmentRequest.cs` | **Tạo mới**: dữ liệu client gửi lên |
| 2 | `OZE.Common/Constants/ErrorConstants.cs` | Thêm 3 message lỗi |
| 3 | `OZE.Application/Interfaces/IAppointmentService.cs` | Thêm hàm `RescheduleAppointmentAsync` |
| 4 | `OZE.Application/Services/AppointmentService.cs` | Sửa `FindSlotsAsync`, thêm hàm đổi lịch, gom kiểm tra hạn |
| 5 | `OZE/Controllers/AppointmentsController.cs` | Thêm API `POST {id}/reschedule` |

Không cần migration, không cần thêm config mới (dùng lại `Booking.CancelCutoffHours`).

---

## 4. Làm từng bước

### Bước 1. Tạo request model

Mỗi model một file, đặt trong `OZE.Common/Models/`.

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class RescheduleAppointmentRequest
    {
        [Required]
        public DateOnly? Date { get; set; }

        [Required]
        public TimeOnly? SlotStart { get; set; }

        // Optional; null means "keep the doctor if free, otherwise any suitable doctor"
        public int? DoctorId { get; set; }
    }
}
```

### Bước 2. Thêm message lỗi

Trong `ErrorConstants.AppointmentMessage` thêm:

```csharp
public const string OnlyOpenCanBeRescheduled = "Only an appointment that is pending or confirmed can be rescheduled";
public const string ConfirmedNeedsReceptionistToReschedule = "This appointment is already confirmed. Please call the clinic to reschedule it";
public const string RescheduleDeadlinePassed = "It is too close to the appointment time to reschedule online. Please call the clinic";
```

Message hiện viết tiếng Anh cho giống các message khác trong file.

### Bước 3. Thêm vào interface

```csharp
// ownerUserId: null for staff; for a patient, the user id that must own the appointment
Task<AppointmentResponse> RescheduleAppointmentAsync(long id, RescheduleAppointmentRequest request, string? ownerUserId, CancellationToken cancellationToken = default);
```

> **Lưu ý Visual Studio:** nếu file `AppointmentService.cs` đang mở khi bạn thêm vào interface, VS có thể tự chèn hàm rỗng `throw new NotImplementedException()` ở cuối file. Hãy xóa nó (hoặc đóng tab, chọn Don't Save rồi mở lại) để khỏi trùng hàm.

### Bước 4. Sửa `FindSlotsAsync` để bỏ qua chính lịch đang đổi

`FindSlotsAsync` kiểm tra "giờ này đã có ai đặt chưa" bằng danh sách lịch đang giữ chỗ. Danh sách đó **gồm cả lịch đang đổi**, nên nếu không loại ra, đổi sang giờ chồng lên giờ cũ của chính nó sẽ bị báo trùng.

Thêm tham số tùy chọn `excludeAppointmentId` và lọc:

```csharp
private async Task<List<AvailableSlotResponse>> FindSlotsAsync(
    List<Service> services, DateOnly date, int? doctorId, long? excludeAppointmentId = null)
{
    // ... giữ nguyên phần trên ...
    var booked = (await _appointmentRepository.GetActiveAppointmentsAsync(date, doctorIds))
        .Where(a => a.Id != excludeAppointmentId)
        .ToList();
    // ... giữ nguyên phần còn lại ...
}
```

Các chỗ gọi cũ (`GetAvailableSlotsAsync`, `BookAsGuestAsync`) không cần sửa vì tham số có giá trị mặc định.

### Bước 5. Gom kiểm tra hạn dùng chung với hủy

Hàm hủy đang có đoạn kiểm tra hạn viết trực tiếp. Tách ra một hàm để đổi lịch dùng lại, tránh viết hai lần:

```csharp
private async Task EnsureBeforeCutoffAsync(Appointment appointment, string errorMessage)
{
    var cutoffHours = await GetIntConfigAsync(ConfigKeyConstants.BookingCancelCutoffHours);
    var startsAt = appointment.AppointmentDate.ToDateTime(appointment.TimeSlotStart ?? default);
    ConditionGuard.ThrowIf(startsAt - DateTime.Now < TimeSpan.FromHours(cutoffHours), errorMessage);
}
```

Trong `CancelAppointmentAsync`, thay đoạn cũ bằng:

```csharp
await EnsureBeforeCutoffAsync(appointment, ErrorConstants.AppointmentMessage.CancelDeadlinePassed);
```

### Bước 6. Viết hàm đổi lịch trong service

```csharp
public async Task<AppointmentResponse> RescheduleAppointmentAsync(
    long id, RescheduleAppointmentRequest request, string? ownerUserId, CancellationToken cancellationToken = default)
{
    var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
    ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);
    EnsureOwnedBy(appointment!, ownerUserId);

    ConditionGuard.ThrowIf(!IsOpen(appointment!), ErrorConstants.AppointmentMessage.OnlyOpenCanBeRescheduled);

    var isPatient = ownerUserId != null;
    if (isPatient)
    {
        // A confirmed appointment was agreed with the receptionist, so changing it also goes through them
        ConditionGuard.ThrowIf(appointment.Status == AppointmentConstants.ConfirmedStatus,
            ErrorConstants.AppointmentMessage.ConfirmedNeedsReceptionistToReschedule);
        await EnsureBeforeCutoffAsync(appointment, ErrorConstants.AppointmentMessage.RescheduleDeadlinePassed);
    }

    // The services stay the same, so the new slot must fit the same total time and room type
    var services = appointment.ServiceItems.Select(i => i.Service!).ToList();
    ConditionGuard.Ensure(services.Count > 0, ErrorConstants.AppointmentMessage.ServiceNotFound);

    var date = request.Date!.Value;
    var slotStart = request.SlotStart!.Value;

    var chosen = await _appointmentRepository.ExecuteSerializableAsync(async () =>
    {
        // Re-check inside the transaction; never trust the slot sent by the client
        var candidates = (await FindSlotsAsync(services, date, request.DoctorId, excludeAppointmentId: appointment.Id))
            .Where(x => x.SlotStart == slotStart)
            .ToList();
        ConditionGuard.Ensure(candidates.Count > 0, ErrorConstants.AppointmentMessage.SlotNotAvailable);

        // No doctor sent: keep the current doctor when free, otherwise take the least busy one
        var slot = request.DoctorId.HasValue
            ? candidates[0]
            : candidates.FirstOrDefault(c => c.DoctorId == appointment.DoctorId)
                ?? await PickLeastBusyAsync(candidates, date);

        appointment.AppointmentDate = date;
        appointment.TimeSlotStart = slot.SlotStart;
        appointment.TimeSlotEnd = slot.SlotEnd;
        appointment.DoctorId = slot.DoctorId;
        // A patient's change still needs the receptionist's call; staff changed it after talking to the patient
        appointment.Status = isPatient ? AppointmentConstants.PendingStatus : AppointmentConstants.ConfirmedStatus;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        if (!isPatient)
        {
            foreach (var item in appointment.ServiceItems.Where(i => i.Status == AppointmentConstants.ServiceRequestedStatus))
            {
                item.Status = AppointmentConstants.ServiceConfirmedStatus;
            }
        }

        await _appointmentRepository.UpdateAsync(appointment);
        return slot;
    });

    if (!isPatient)
    {
        await SendConfirmationNotificationAsync(appointment);
    }

    return MapToResponse(appointment);
}
```

Giải thích các điểm dễ sai:

- **Phải bỏ lịch đang đổi khỏi phép kiểm tra trùng** (`excludeAppointmentId`), nếu không sẽ tự trùng với chính nó.
- **Kiểm tra lại slot trong transaction** giống `BookAsGuestAsync`, để hai người không giành cùng một giờ. Đừng tin giờ client gửi.
- **Lịch cũ không có dịch vụ** (tạo trước khi có bảng `AppointmentServices`) sẽ có `services.Count == 0`, thời lượng bằng 0. Đoạn `Ensure(services.Count > 0, ...)` chặn trường hợp này.
- Nếu `UpdateAsync` của repository gọi `SaveChanges` thì nó chạy trong transaction nên không sao. Kiểm tra lại cách `UpdateAsync` đang viết trước khi làm.
- SMS chỉ gửi khi **nhân viên** đổi (lịch đã `CONFIRMED`). Bệnh nhân tự đổi thì lễ tân sẽ gọi xác nhận như lịch `PENDING` bình thường. Muốn gửi SMS "đã ghi nhận giờ mới" cho bệnh nhân thì làm thêm sau.

### Bước 7. Thêm action vào controller

Đặt gần action `cancel`:

```csharp
/// <summary>
/// Moves an appointment to a new time and/or doctor. A patient can only move their own pending appointment.
/// </summary>
[HttpPost("{id:long}/reschedule")]
[Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole},{RoleConstants.PatientRole}")]
public async Task<ActionResult<ApiResponse<AppointmentResponse>>> RescheduleAppointmentAsync(
    [FromRoute] long id,
    [FromBody] RescheduleAppointmentRequest request,
    CancellationToken cancellationToken)
{
    var result = await _appointmentService.RescheduleAppointmentAsync(id, request, OwnerRestriction, cancellationToken);
    return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Đổi lịch hẹn thành công"));
}
```

`OwnerRestriction` đã có sẵn trong controller: trả `null` cho lễ tân, bác sĩ, quản lý và trả user id cho bệnh nhân. Role Doctor không nằm trong `Authorize` nên không gọi được API này.

---

## 5. Cách bệnh nhân và lễ tân tìm giờ trống

Không cần API mới. Dùng lại `GET api/appointments/available-slots` và truyền **danh sách dịch vụ của lịch đó** (lấy từ `AppointmentResponse.Services`) cùng ngày muốn đổi. Client lấy `slotStart` và `doctorId` từ kết quả rồi gửi lên API `reschedule`.

> Lưu ý nhỏ: `available-slots` vẫn coi lịch đang đổi là đã chiếm chỗ, nên giờ hiện tại của chính lịch đó **không** hiện là trống. Điều này không ảnh hưởng đúng/sai (API `reschedule` kiểm tra lại đúng), chỉ là bệnh nhân không thấy chính giờ cũ trong danh sách.

---

## 6. Cách tự kiểm tra (Swagger)

Chuẩn bị: DB có category, service, ca làm của bác sĩ, config `Booking.GeneralExamServiceCode`, và dòng `Booking.CancelCutoffHours` (đã seed bằng migration `AddCancelCutoffHoursConfig`). Đặt một lịch bằng `POST api/appointments/guest-booking` để có lịch `PENDING`.

| # | Tình huống | Kết quả mong đợi |
|---|---|---|
| 1 | Lễ tân đổi lịch `PENDING` sang giờ trống | 200, lịch thành `CONFIRMED`, giờ mới, có SMS |
| 2 | Lễ tân đổi lịch `CONFIRMED` sang giờ trống | 200, vẫn `CONFIRMED` |
| 3 | Bệnh nhân đổi lịch `PENDING` của mình, còn đủ hạn | 200, vẫn `PENDING` |
| 4 | Bệnh nhân đổi lịch `PENDING` mà giờ khám còn dưới 24 giờ | 400, message quá hạn |
| 5 | Bệnh nhân đổi lịch `CONFIRMED` | 400, message gọi phòng khám |
| 6 | Bệnh nhân đổi lịch của người khác | 404 |
| 7 | Đổi sang giờ đã có người đặt (cùng bác sĩ) | 400, `SlotNotAvailable` |
| 8 | Đổi sang giờ chồng lên giờ cũ của chính lịch đó | 200 (không tự báo trùng) |
| 9 | Đổi lịch `CANCELLED`, `COMPLETED`, `CHECKED_IN` | 400, `OnlyOpenCanBeRescheduled` |
| 10 | Đổi sang ngày quá khứ hoặc quá `MaxDaysAhead` | 400 |
| 11 | Gọi bằng role Doctor | 403 |
| 12 | Đổi xong, gọi `available-slots`: giờ cũ trống lại | Giờ cũ xuất hiện lại cho người khác đặt |

Sau mỗi lần đổi, xem lại `GET api/appointments/{id}` để chắc `appointmentDate`, `timeSlotStart`, `timeSlotEnd`, `doctorName`, `status` đúng.

---

## 7. Danh sách kiểm tra khi làm xong

- [ ] Build không lỗi (`dotnet build OZE.sln`).
- [ ] Các test hiện có vẫn qua (`dotnet test OZE.UnitTest`).
- [ ] Không còn hàm `NotImplementedException` do Visual Studio chèn vào `AppointmentService.cs`.
- [ ] Hủy lịch vẫn hoạt động đúng sau khi gom `EnsureBeforeCutoffAsync`.
- [ ] Đã chạy tay các tình huống trong mục 6.
- [ ] Không commit file cấu hình có khóa bí mật (`appsettings*.json`).

## 8. Việc để giai đoạn sau

- **Đổi dịch vụ:** cần tính lại thời lượng, kiểm tra loại phòng, cập nhật bảng `AppointmentServices`.
- **Lịch sử đổi:** bảng `AppointmentChangeLogs` (id lịch, người đổi, thời điểm, giờ cũ, giờ mới, bác sĩ cũ, bác sĩ mới) cần migration. Lưu ý code hiện chưa ghi lại ai đã xác nhận hoặc đổi.
- **SMS cho bệnh nhân** khi tự đổi.
- **Unit test** cho `RescheduleAppointmentAsync` (các tình huống 3 đến 9 ở mục 6 là bộ test gợi ý).
- **Múi giờ:** code dùng `DateTime.Now`, deploy lên server UTC sẽ lệch 7 giờ, cần đặt `TZ=Asia/Ho_Chi_Minh`.

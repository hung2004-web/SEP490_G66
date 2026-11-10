# F-RCP-03 Đổi mức ưu tiên

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `ClinicManager` |
| API | `POST api/appointments/{id}/priority` |
| Code chính | `AppointmentsController.SetPriorityAsync` → `AppointmentService.SetPriorityAsync` → `AppointmentRepository`, `QueueService.UpdatePriorityAsync` → `QueueRepository` |

## 1. Chức năng này làm gì

Lễ tân nâng hoặc hạ mức ưu tiên của một bệnh nhân đã check-in và đang chờ (ví dụ bệnh nhân đau tăng lên). Mức mới được ghi vào lịch hẹn và vào bản ghi hàng chờ đang hoạt động, làm thay đổi thứ tự danh sách chờ và thứ tự gọi số.

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist` hoặc `ClinicManager`.
- Lịch tồn tại, trạng thái `CHECKED_IN`.

## 3. API

**Request** `POST api/appointments/{id}/priority`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | | Id lịch hẹn |
| `priority` | int? | Có | `[Required]`; 0/1/2 | Mức mới |
| `reason` | string? | Khi `priority` > 0 | `[MaxLength(500)]` | Lý do, ghi vào audit |

Ví dụ:

```json
{ "priority": 2, "reason": "Sưng đau tăng" }
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, message `"Priority updated successfully"`)

Cùng cấu trúc `AppointmentResponse` như F-RCP-01 (không có trường `priority`, `roomId`/`roomName` để null).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `priority`, `reason` > 500 | ProblemDetails mặc định |
| 404 | Không có lịch | `AppointmentNotFound`: "Appointment not found in system" |
| 400 | Lịch không `CHECKED_IN` | `PriorityOnlyForWaiting`: "The priority can only be changed while the patient is checked in and waiting" |
| 400 | Mức sai | `PriorityInvalid`: "Priority must be 0 (normal), 1 (high) or 2 (urgent)" |
| 400 | Mức > 0 không lý do | `PriorityReasonRequired`: "A reason is required when the priority is above normal" |

## 4. Luồng xử lý trong code

1. `AppointmentsController.cs:233-242` nhận request.
2. `AppointmentService.cs:988-989` tải lịch (`GetByIdWithDetailsAsync`), không có → 404.
3. `AppointmentService.cs:992` khác `CHECKED_IN` → 400 `PriorityOnlyForWaiting`.
4. `AppointmentService.cs:994-995` `EnsureValidPriority` (`:1137-1142`).
5. `AppointmentService.cs:997-1001` gán `Priority`, `UpdatedAt`, lưu.
6. `AppointmentService.cs:1004-1007` `QueueService.UpdatePriorityAsync` (`QueueService.cs:95-111`): tìm bản ghi hàng chờ `Examination` đang hoạt động mới nhất (`GetActiveByAppointmentAndTypeAsync`, `QueueRepository.cs:60-67`, trạng thái `WAITING`/`CALLED`/`IN_PROGRESS`), gán `Priority`. Không có bản ghi → chỉ log cảnh báo, không lỗi.
7. `AppointmentService.cs:1009-1010` audit `APPOINTMENT_PRIORITY_CHANGED` (cũ `{Priority}`, mới `{Priority}`, lý do trim).
8. `AppointmentService.cs:1012` trả `MapToResponse`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-RCP-02 | Danh sách chờ xếp theo mức ưu tiên giảm dần | F-RCP-04, F-RCP-05 |
| (code) | Chỉ đổi khi `CHECKED_IN` | `AppointmentService.cs:992` |
| (code) | Mức > 0 bắt buộc lý do | `AppointmentService.cs:1140-1141` |
| BR-C11 | Ghi audit kèm lý do | `AppointmentService.cs:1009-1010` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Priority`, `UpdatedAt` | mức cũ | mức mới | Trạng thái giữ `CHECKED_IN` |
| `QueueEntries.Priority` (bản `Examination` đang hoạt động) | mức cũ | mức mới | `Notes` (lý do lúc check-in) không đổi |
| `AuditLogs` | — | `APPOINTMENT_PRIORITY_CHANGED` | |

## 7. Liên quan

- Trước đó: F-RCP-01 check-in, F-RCP-02 walk-in.
- Sau đó: F-RCP-04 danh sách chờ, F-RCP-05 gọi số.
- Liên quan: khi bệnh nhân chụp phim xong quay về, `ImagingRequestService.cs:287-309` tự đặt `Priority = Urgent` (2) cho cả lịch và hàng chờ.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: lịch không `CHECKED_IN`; mức 3; mức 1 không lý do; hạ về 0 không cần lý do; lịch không có bản ghi hàng chờ đang hoạt động (chỉ log); bản ghi hàng chờ được cập nhật đúng.

## 9. Còn thiếu / câu hỏi mở

- Điều kiện chỉ là `CHECKED_IN`, nên cũng đổi được cho bệnh nhân **đang đi chụp phim** (lịch quay về `CHECKED_IN` khi có chỉ định, `ImagingRequestService.cs:85-94`) và bệnh nhân **đã được gọi** (`CALLED`).
- Không kiểm tra ngày: lịch `CHECKED_IN` của ngày cũ vẫn đổi được.
- Lý do mới chỉ nằm trong audit; `QueueEntries.Notes` vẫn giữ lý do cũ lúc check-in (sẽ đi theo khi đổi bác sĩ, F-RCP-07).

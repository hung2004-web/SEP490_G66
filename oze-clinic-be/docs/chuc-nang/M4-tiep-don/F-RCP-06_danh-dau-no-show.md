# F-RCP-06 Đánh dấu NO_SHOW

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `ClinicManager` |
| API | `POST api/appointments/{id}/no-show` |
| Code chính | `AppointmentsController.MarkNoShowAsync` → `AppointmentService.MarkNoShowAsync` → `AppointmentRepository`, `QueueService.UpdateStatusAsync` |

## 1. Chức năng này làm gì

Bệnh nhân đã check-in nhưng bỏ về trước khi được khám. Lễ tân đánh dấu lịch `NO_SHOW` và rút bệnh nhân khỏi hàng chờ khám. Đây là NO_SHOW **thủ công**; NO_SHOW tự động cho lịch đặt không đến nằm ở F-RCP-08 (kết thúc ca).

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist` hoặc `ClinicManager`.
- Lịch ở `CHECKED_IN` và **chưa có phiếu khám** (`Examination == null`).

## 3. API

**Request** `POST api/appointments/{id}/no-show`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | | Id lịch hẹn |
| `reason` | string? | Không | `[MaxLength(500)]` | Lý do, ghi vào audit |

Body khai báo `MarkNoShowRequest?` nhưng **không** đặt `EmptyBodyBehavior.Allow` như check-in. Việc gửi body rỗng có được nhận hay không: Chưa xác định từ code (phụ thuộc hành vi mặc định của ASP.NET Core 8); FE nên gửi ít nhất `{}`.

Ví dụ:

```json
{ "reason": "Bệnh nhân bỏ về lúc 10:15" }
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, message `"Patient marked as NO_SHOW"`)

`AppointmentResponse` như F-RCP-01, `status = "NO_SHOW"`, `roomId`/`roomName` null.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | `reason` > 500 ký tự | ProblemDetails mặc định |
| 404 | Không có lịch | `AppointmentNotFound`: "Appointment not found in system" |
| 400 | Lịch không `CHECKED_IN` | `NoShowOnlyWaiting`: "Only a patient who is checked in and waiting can be marked as not there" |
| 400 | Lịch đã có phiếu khám (đang/đã khám, đi chụp phim về) | `NoShowAlreadyExamined`: "The doctor has already started on this patient; the doctor completes the examination instead" |

## 4. Luồng xử lý trong code

1. `AppointmentsController.cs:95-104` nhận `id` và body.
2. `AppointmentService.cs:798-799` tải lịch kèm `Examination` (`GetByIdWithExaminationAsync`, `AppointmentRepository.cs:274-285`), không có → 404.
3. `AppointmentService.cs:801` khác `CHECKED_IN` → 400 `NoShowOnlyWaiting`.
4. `AppointmentService.cs:803` có `Examination` → 400 `NoShowAlreadyExamined`.
5. `AppointmentService.cs:805-808` `Status = NO_SHOW`, `UpdatedAt`, lưu.
6. `AppointmentService.cs:810-813` `QueueService.UpdateStatusAsync(id, Examination, CANCELLED)` (`QueueService.cs:59-93`): bản ghi hàng chờ đang hoạt động → `CANCELLED`, `CompletedAt = now`. Không có bản ghi → chỉ log cảnh báo.
7. `AppointmentService.cs:815-816` audit `APPOINTMENT_NO_SHOW` (cũ `{Status}`, mới `{Status}`, lý do trim).
8. `AppointmentService.cs:818` trả `MapToResponse`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (code) | Chỉ người đã check-in và đang chờ | `AppointmentService.cs:801` |
| (code) | Người bác sĩ đã bắt đầu khám thì bác sĩ hoàn tất, không NO_SHOW | `AppointmentService.cs:803` |
| BR-C11 | Ghi audit (lý do tùy chọn) | `AppointmentService.cs:815-816` |
| (mục 3 Dac_ta) | `NO_SHOW` nhả chỗ | Gián tiếp: các truy vấn slot loại `CANCELLED`/`NO_SHOW` (`AppointmentRepository.cs:86-95`) |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Status` | `CHECKED_IN` | `NO_SHOW` | |
| `QueueEntries` (`Examination`, đang hoạt động) | `WAITING`/`CALLED` | `CANCELLED`, `CompletedAt` | |
| `AuditLogs` | — | `APPOINTMENT_NO_SHOW` | |

## 7. Liên quan

- Trước đó: F-RCP-01, F-RCP-02; thường sau F-RCP-05 gọi nhiều lần không có mặt.
- Sau đó: không có bước tiếp. NO_SHOW thủ công **không** được khôi phục bởi "mở lại ca" (`api/work-shifts/{id}/reopen` chỉ khôi phục các lịch do lần kết thúc ca đánh dấu).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: lịch `CONFIRMED` bị từ chối; lịch có Examination bị từ chối; hàng chờ chuyển `CANCELLED`; không có bản ghi hàng chờ vẫn thành công; body rỗng.

## 9. Còn thiếu / câu hỏi mở

- **Lệch mục 3 Dac_ta**: sơ đồ trạng thái chỉ có `CONFIRMED → NO_SHOW` (hết ca chưa đến), không có `CHECKED_IN → NO_SHOW`. Code thủ công chỉ cho `CHECKED_IN → NO_SHOW`; lễ tân **không có API** đánh dấu NO_SHOW cho lịch `CONFIRMED` (chỉ tự động khi bác sĩ kết thúc ca).
- Lý do không bắt buộc, trong khi BR-C11 ghi "kèm người làm và lý do".
- Không kiểm tra ngày: lịch `CHECKED_IN` của ngày cũ (không ai đóng) vẫn đánh dấu được – có thể là chủ ý để dọn dữ liệu, chưa xác định từ code.
- Không gửi thông báo cho bệnh nhân.

# F-APT-07 Hủy lịch hẹn

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Patient` (lịch của mình), `Receptionist`, `ClinicManager`, `Doctor` (theo code) |
| API | `POST api/appointments/{id}/cancel` |
| Code chính | `AppointmentsController.CancelAppointmentAsync` → `AppointmentService.CancelAppointmentAsync` → `AppointmentRepository.GetByIdWithDetailsAsync`, `UpdateAsync`, `GetConfigValueAsync` |

## 1. Chức năng này làm gì

Hủy một lịch hẹn chưa bắt đầu (`PENDING` hoặc `CONFIRMED`) kèm lý do. Lịch chuyển `CANCELLED` và nhả chỗ cho người khác đặt. Bệnh nhân chỉ tự hủy được lịch `PENDING` của mình và trước giờ khám ít nhất `Booking.CancelCutoffHours` giờ; nhân viên hủy được mọi lúc.

## 2. Tiền điều kiện

- Đăng nhập một trong các role `Receptionist`, `Doctor`, `ClinicManager`, `Patient`.
- Lịch đang `PENDING` hoặc `CONFIRMED`.
- Bệnh nhân: lịch thuộc hồ sơ gắn với tài khoản; lịch `PENDING`; còn ≥ `Booking.CancelCutoffHours` giờ (mặc định 24) trước giờ khám.

## 3. API

**Request** `POST api/appointments/{id}/cancel`, quyền `[Authorize(Roles = "Receptionist,Doctor,ClinicManager,Patient")]`. Body `CancelAppointmentRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | `{id:long}` | Id lịch |
| `reason` | string | Có | `[Required]`, `[MaxLength(500)]`; service kiểm tra thêm không rỗng/khoảng trắng; được trim khi lưu | Lý do hủy |

```json
{ "reason": "Bận việc đột xuất" }
```

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, `message = "Appointment cancelled successfully"`)

`AppointmentResponse` như F-APT-05 với `status = CANCELLED`, `cancellationReason` = lý do.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401 / 403 | Chưa đăng nhập / sai role | Do ASP.NET trả |
| 400 | Thiếu `reason` / > 500 ký tự (model validation, `ValidationProblemDetails`) | "Cancellation reason is required" / "Cancellation reason cannot exceed 500 characters" |
| 400 | `reason` chỉ có khoảng trắng | `AppointmentMessage.ReasonRequired` "Cancellation reason is required" |
| 404 | Không có lịch, hoặc bệnh nhân hủy lịch người khác | `AppointmentMessage.AppointmentNotFound` "Appointment not found in system" |
| 400 | Lịch không ở `PENDING`/`CONFIRMED` | `AppointmentMessage.OnlyOpenCanBeCancelled` "Only an appointment that is pending or confirmed can be cancelled" |
| 400 | Bệnh nhân hủy lịch `CONFIRMED` | `AppointmentMessage.ConfirmedNeedsReceptionistToCancel` "This appointment is already confirmed. Please call the clinic to cancel it" |
| 400 | Bệnh nhân hủy khi còn < `CancelCutoffHours` giờ | `AppointmentMessage.CancelDeadlinePassed` "It is too close to the appointment time to cancel online. Please call the clinic" |
| 400 | Thiếu cấu hình `Booking.CancelCutoffHours` (chỉ nhánh bệnh nhân) | `AppointmentMessage.ConfigMissing` "System configuration {0} is missing" |
| 409 | Xung đột `RowVersion` | `AppointmentMessage.RecordChangedMeanwhile` |

## 4. Luồng xử lý trong code

1. Controller truyền `CurrentUserId` (người hủy) và `OwnerRestriction` (`null` cho `Receptionist`/`Doctor`/`ClinicManager`, user id cho bệnh nhân) (`AppointmentsController.cs:23-26`, `:178-187`).
2. `reason` rỗng/khoảng trắng → `ReasonRequired` (`AppointmentService.cs:540`).
3. Tải lịch kèm chi tiết; không có → 404 (`:542-543`). `EnsureOwnedBy` cho bệnh nhân → 404 nếu không phải của mình (`:544`, `:1169-1177`).
4. `IsOpen` (`PENDING` hoặc `CONFIRMED`) sai → `OnlyOpenCanBeCancelled` (`:546`, `:1165-1166`).
5. Nếu là bệnh nhân (`ownerUserId != null`) (`:550-556`):
   1. `CONFIRMED` → `ConfirmedNeedsReceptionistToCancel`.
   2. `EnsureBeforeCutoffAsync`: đọc `Booking.CancelCutoffHours` (`SystemConfigurations`), `startsAt = AppointmentDate + TimeSlotStart`; nếu `startsAt - ClinicClock.Now < cutoff` → `CancelDeadlinePassed` (`:1157-1162`).
6. Cập nhật: `Status = CANCELLED`, `CancellationReason = reason.Trim()`, `CancelledAt = UtcNow`, `CancelledByUserId = userId`, `UpdatedAt` (`:558-563`); `UpdateAsync` lưu (`:565`).
7. Ghi audit `APPOINTMENT_CANCELLED`, cũ `{ Status }`, mới `{ Status }`, lý do = `CancellationReason` (`:566-567`).
8. Trả `MapToResponse` (`:569`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-06 | Bệnh nhân chỉ hủy lịch của mình, chỉ `PENDING`, trước cutoff | `AppointmentService.cs:544`, `:550-556` |
| BR-APT-07 | Nhân viên hủy mọi lúc, bắt buộc lý do | `AppointmentService.cs:540`, `:550` (bỏ qua kiểm tra hạn) |
| BR-C11 | Ghi audit kèm lý do | `AppointmentService.cs:566-567` |
| (vòng đời) | Chỉ `CANCELLED`, `NO_SHOW` nhả chỗ | `AppointmentRepository.cs:92-93` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Status` | `PENDING` / `CONFIRMED` | `CANCELLED` | |
| `Appointments.CancellationReason`, `CancelledAt`, `CancelledByUserId`, `UpdatedAt` | null | Lý do, UtcNow, user id người hủy | |
| `AppointmentServices` | | Không đổi | Bảng không có cột trạng thái |
| `AuditLogs` | - | `APPOINTMENT_CANCELLED` | |

## 7. Liên quan

- Trước đó: F-APT-03, F-APT-04, F-APT-06.
- Sau đó: slot được nhả cho F-APT-02; bệnh nhân đặt lịch mới được (không còn lịch chưa kết thúc).

## 8. Kiểm thử

- Test hiện có (`AppointmentsControllerTests`): `CancelAppointmentAsync_ShouldReturnOk_WhenCancelled`, `CancelAppointmentAsync_ShouldPassOwnUserId_WhenPatient`. Chưa có test service.
- Ca cần test thêm:
  - Bệnh nhân hủy `PENDING` còn > 24h → thành công; còn < 24h → `CancelDeadlinePassed`.
  - Bệnh nhân hủy `CONFIRMED` → `ConfirmedNeedsReceptionistToCancel`.
  - Bệnh nhân hủy lịch người khác → 404.
  - Lễ tân hủy `CONFIRMED` sát giờ → thành công.
  - Hủy lịch `CHECKED_IN`/`COMPLETED`/`CANCELLED` → `OnlyOpenCanBeCancelled`.
  - `reason = "   "` → `ReasonRequired`.

## 9. Còn thiếu / câu hỏi mở

- **Lệch vai trò**: tài liệu tổng ghi "Bệnh nhân, lễ tân, quản lý"; code cho cả `Doctor` hủy, và bác sĩ được coi như nhân viên (hủy mọi lịch, mọi lúc). Mục 1 tài liệu tổng không cho bác sĩ quyền này.
- **Lệch BR-APT-07** "Hủy xong các dịch vụ chưa làm chuyển `CANCELLED`": bảng `AppointmentServices` không có cột trạng thái (migration `RemoveAppointmentServiceStatus`), code không đổi gì ở dịch vụ.
- **Lệch BR-APT-07 "bắt buộc lý do" chỉ cho nhân viên**: code bắt buộc lý do với cả bệnh nhân.
- Không gửi SMS/email báo hủy cho bệnh nhân khi nhân viên hủy. Chưa xác định từ code có cần không.
- Không có thông báo cho lễ tân khi bệnh nhân tự hủy.
- Model validation trả `ValidationProblemDetails`, không phải `ApiResponse` (lệch BR-C07).

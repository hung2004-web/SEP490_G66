# F-APT-06 Xác nhận lịch hẹn

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `ClinicManager` |
| API | `POST api/appointments/{id}/confirm` |
| Code chính | `AppointmentsController.ConfirmAppointmentAsync` → `AppointmentService.ConfirmAppointmentAsync` → `AppointmentRepository.GetByIdWithDetailsAsync`, `UpdateAsync` |

## 1. Chức năng này làm gì

Sau khi gọi điện cho bệnh nhân và được đồng ý, lễ tân bấm xác nhận lịch `PENDING`. Lịch chuyển `CONFIRMED`, hệ thống gửi SMS và email báo đã xác nhận. Chỉ lịch `CONFIRMED` mới check-in được (M4), nên bước này cũng là bộ lọc lịch đặt ảo.

## 2. Tiền điều kiện

- Đăng nhập role `Receptionist` hoặc `ClinicManager`.
- Lịch tồn tại và đang `PENDING`.

## 3. API

**Request** `POST api/appointments/{id}/confirm`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | `{id:long}` | Id lịch |

Không có body.

**Response thành công** (`ApiResponse<AppointmentResponse>`, HTTP 200, `message = "Appointment confirmed successfully"`)

`AppointmentResponse` như F-APT-05 với `status = CONFIRMED`.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401 / 403 | Chưa đăng nhập / sai role | Do ASP.NET trả |
| 404 | Không có lịch | `AppointmentMessage.AppointmentNotFound` "Appointment not found in system" |
| 400 | Lịch không ở `PENDING` | `AppointmentMessage.OnlyPendingCanBeConfirmed` "Only an appointment that is waiting for confirmation can be confirmed" |
| 409 | Người khác vừa sửa lịch (`RowVersion`) | `AppointmentMessage.RecordChangedMeanwhile` "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

1. Controller gọi service (`AppointmentsController.cs:206-214`).
2. Tải lịch kèm `Patient`, `Doctor`, `ServiceItems.Service/Variant` (tracking) (`AppointmentService.cs:636`, `AppointmentRepository.cs:262-272`); không có → 404 (`AppointmentService.cs:637`).
3. `Status != PENDING` → `OnlyPendingCanBeConfirmed` (`:639`).
4. Đổi `Status = CONFIRMED`, `UpdatedAt = UtcNow`; `UpdateAsync` lưu ngay (`:641-645`, `AppointmentRepository.cs:397-401`). `RowVersion` là concurrency token (`AppointmentConfiguration.cs:23`); xung đột → `DbUpdateConcurrencyException` → 409 (`GlobalExceptionMiddleware.cs:55-60`).
5. Ghi audit `APPOINTMENT_CONFIRMED`, cũ `{ Status: "PENDING" }`, mới `{ Status: "CONFIRMED" }` (`AppointmentService.cs:646-647`).
6. `SendConfirmationNotificationAsync`: nội dung "OZE Dental: Your appointment for {dịch vụ} at {HH:mm} on {dd/MM/yyyy} has been confirmed."; gửi SMS nếu hồ sơ có số, email (tiêu đề "OZE Dental - Appointment confirmed") nếu có email; lỗi chỉ log warning (`AppointmentService.cs:648`, `:330-353`).
7. Trả `MapToResponse` (`:650`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-05 | Lễ tân xác nhận thì `CONFIRMED`, kèm SMS và email | `AppointmentService.cs:639-648` |
| BR-C10 | Cập nhật đồng thời trả 409 | `AppointmentConfiguration.cs:23`, `GlobalExceptionMiddleware.cs:55-60` |
| BR-C11 | Ghi audit | `AppointmentService.cs:646` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Status` | `PENDING` | `CONFIRMED` | `UpdatedAt` = UtcNow |
| `AuditLogs` | - | `APPOINTMENT_CONFIRMED` | |
| SMS / email | - | Gửi thông báo | Không ảnh hưởng kết quả nếu lỗi |

## 7. Liên quan

- Trước đó: F-APT-03, F-APT-04, hoặc bệnh nhân tự đổi lịch (F-APT-08, lịch về `PENDING`).
- Sau đó: M4 F-RCP-01 check-in (chỉ nhận `CONFIRMED`); F-APT-07 hủy (bệnh nhân không tự hủy được lịch `CONFIRMED`); F-APT-08 đổi lịch qua lễ tân.

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `ConfirmAppointmentAsync`.
- Ca cần test thêm:
  - `PENDING` → `CONFIRMED`, có audit, gọi `ISmsSender.SendSmsAsync`.
  - `CONFIRMED`/`CANCELLED`/`CHECKED_IN` → `OnlyPendingCanBeConfirmed`.
  - Không tìm thấy → 404.
  - SMS ném lỗi → vẫn trả thành công.

## 9. Còn thiếu / câu hỏi mở

- Không kiểm tra ngày: lịch `PENDING` của ngày đã qua vẫn xác nhận được. Chưa xác định từ code đây là ý định.
- Không có tham số ghi chú cuộc gọi (đã gọi, không nghe máy...). Liên quan F-APT-10 và M9.
- Nội dung SMS/email viết tiếng Anh, chưa có mẫu tiếng Việt.

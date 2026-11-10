# F-APT-10 Cảnh báo lịch `PENDING` quá hạn xác nhận

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.
> **Chức năng chưa làm.** Mục 3, 4, 6 dưới đây là **THIẾT KẾ ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | `Receptionist` (đề xuất thêm `ClinicManager`) |
| API | Chưa có. Đề xuất `GET api/appointments/pending-overdue` |
| Code chính | Chưa có. Đề xuất `AppointmentsController.GetPendingOverdueAsync` → `AppointmentService.GetPendingOverdueAsync` → `AppointmentRepository` (truy vấn mới) |

## 1. Chức năng này làm gì

Lịch đặt online ở `PENDING` vẫn **giữ chỗ** (BR-APT-05). Nếu lễ tân quên gọi xác nhận, slot bị khóa và bệnh nhân không biết lịch có được nhận hay không. Chức năng này liệt kê cho lễ tân các lịch `PENDING` đã quá thời gian chờ xác nhận hoặc sắp tới giờ khám, để lễ tân gọi điện xác nhận, đổi hoặc hủy. Theo mặc định tạm Q10: **chỉ cảnh báo, không tự hủy**.

**Cách làm hiện tại**: lễ tân lọc tay bằng `GET api/appointments?status=PENDING` (F-APT-05), sắp theo ngày; không có tiêu chí "quá hạn".

## 2. Tiền điều kiện

- Đăng nhập role lễ tân.
- Có cấu hình ngưỡng quá hạn (đề xuất thêm khóa mới, xem mục 9).

## 3. API (ĐỀ XUẤT)

**Request** `GET api/appointments/pending-overdue`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`. Không có tham số bắt buộc.

**Response** `ApiResponse<List<PendingOverdueResponse>>`, HTTP 200:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `appointmentId` | long | Id lịch |
| `patientId`, `patientCode`, `patientName`, `patientPhoneNumber` | | Để lễ tân gọi (số đầy đủ) |
| `appointmentDate`, `timeSlotStart` | DateOnly, TimeOnly? | Giờ khám |
| `doctorId`, `doctorName` | | |
| `createdAt` | DateTimeOffset | Lúc đặt |
| `pendingHours` | int | Số giờ đã chờ xác nhận |
| `hoursUntilVisit` | int | Số giờ còn tới giờ khám |
| `reason` | string | `WAITING_TOO_LONG` hoặc `VISIT_SOON` (đề xuất, chưa có hằng số) |

## 4. Luồng xử lý trong code (ĐỀ XUẤT)

1. Đọc ngưỡng từ `SystemConfigurations` qua `GetIntConfigAsync` (như `AppointmentService.cs:355-361`).
2. Lấy lịch `Status = PENDING`, `AppointmentDate >= ClinicClock.Today` (BR-C01).
3. Đánh dấu `WAITING_TOO_LONG` khi `ClinicClock.Now - CreatedAt >= Booking.PendingConfirmHours`; `VISIT_SOON` khi giờ khám - `ClinicClock.Now` <= `Booking.PendingVisitSoonHours`.
4. Sắp: `VISIT_SOON` trước, rồi theo giờ khám.
5. Không đổi dữ liệu. (Tùy chọn sau này: FE gọi định kỳ hoặc đẩy `Notification` cho lễ tân, liên quan F-CRM-03.)

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-05 | Lịch `PENDING` giữ chỗ đến khi được xác nhận | Đã có ở `AppointmentRepository.cs:86-95` (chỉ `CANCELLED`, `NO_SHOW` nhả chỗ) |
| Q10 | Quá hạn chỉ cảnh báo, không tự hủy (mặc định tạm) | Chưa làm |

## 6. Trạng thái và dữ liệu thay đổi (ĐỀ XUẤT)

Chỉ đọc. Nếu sau này chốt "tự hủy" (Q10) thì lịch `PENDING` → `CANCELLED` với `CancelledByUserId = null` và lý do hệ thống, ghi audit `APPOINTMENT_CANCELLED`.

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments` | - | - | Chỉ đọc |

## 7. Liên quan

- Trước đó: F-APT-03, F-APT-04, F-APT-08 (bệnh nhân đổi lịch → `PENDING`).
- Sau đó: F-APT-06 (xác nhận), F-APT-07 (hủy), F-APT-08 (đổi).

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa làm).
- Ca cần test khi làm: lịch vừa đặt không xuất hiện; lịch chờ quá ngưỡng xuất hiện; lịch sắp tới giờ xuất hiện dù mới đặt; lịch `CONFIRMED`/`CANCELLED` không xuất hiện; lịch ngày đã qua không xuất hiện.

## 9. Còn thiếu / câu hỏi mở

- Q10: tự hủy hay chỉ cảnh báo. Mặc định tạm: chỉ cảnh báo.
- Cần thêm khóa cấu hình mới (đề xuất `Booking.PendingConfirmHours`, `Booking.PendingVisitSoonHours`) vào `ConfigKeyConstants` và seed `SystemConfigurations`; chưa có trong mục 7 tài liệu tổng. Giá trị mặc định chưa chốt.
- Lịch `PENDING` của ngày đã qua hiện không được dọn và không chặn bệnh nhân đặt mới (`HasUnfinishedAppointmentAsync` chỉ xét ngày ≥ hôm nay, `AppointmentRepository.cs:310-319`), nhưng vẫn nằm ở `PENDING` mãi. Chưa chốt có tự chuyển `NO_SHOW`/`CANCELLED` không.

# F-APT-09 Lễ tân đặt lịch hộ (tự xác nhận)

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.
> **Chức năng chưa làm.** Mục 3, 4, 6 dưới đây là **THIẾT KẾ ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã làm (11/11/2026). Phần ĐỀ XUẤT bên dưới giữ để tham khảo; cách làm thực tế ghi ở mục "Đã làm" |
| Vai trò được dùng | `Receptionist` (đề xuất thêm `ClinicManager` cho khớp các API lễ tân khác) |
| API | `POST api/appointments/reception-booking` (Receptionist) |
| Code chính | Chưa có. Đề xuất `AppointmentsController.BookByFrontDeskAsync` → `AppointmentService.BookByFrontDeskAsync` → dùng lại `ResolveBookingLinesAsync`, `CreateBookingAsync` |

## 1. Chức năng này làm gì

Bệnh nhân gọi điện hoặc đến quầy hẹn lịch cho ngày khác; lễ tân chọn dịch vụ, slot và đặt hộ. Vì lễ tân đã nói chuyện trực tiếp với bệnh nhân nên lịch **tự `CONFIRMED`** (mặc định tạm Q9), bệnh nhân nhận SMS/email xác nhận ngay.

**Cách làm hiện tại** (theo tài liệu tổng): lễ tân gọi `POST api/appointments/guest-booking` (F-APT-03) rồi `POST {id}/confirm` (F-APT-06). Cách này **không dùng được** cho bệnh nhân đã có tài khoản vì `guest-booking` chặn số đã có tài khoản (`PhoneHasAccount`, `AppointmentService.cs:91-92`), và `CreatedByUserId` để trống nên không biết lễ tân nào đặt.

## 2. Tiền điều kiện

- Đăng nhập role lễ tân.
- Slot còn trống theo F-APT-02. Cấu hình như F-APT-02.
- Bệnh nhân không còn lịch chưa kết thúc (giữ quy tắc hiện có của `CreateBookingAsync`).

## 3. API (ĐỀ XUẤT)

**Request** `POST api/appointments/front-desk-booking`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`. Body đề xuất `FrontDeskBookingRequest : BookingRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `serviceId`, `variantId`, `date`, `slotStart`, `doctorId`, `note` | | | Như `BookingRequest` (F-APT-04) | |
| `patientId` | int? | Một trong hai | Hồ sơ có sẵn (kể cả đã gắn tài khoản) | Bệnh nhân đã có hồ sơ |
| `fullName` | string? | Khi không có `patientId` | `[MaxLength(100)]` | Bệnh nhân mới |
| `phoneNumber` | string? | Khi không có `patientId` | Chuẩn hóa E.164 | |
| `email` | string? | Không | Như F-APT-03 | |

**Response** `ApiResponse<AppointmentResponse>`, HTTP 200, `status = CONFIRMED`, message đề xuất "Appointment booked and confirmed".

**Lỗi đề xuất**: dùng lại `SlotNotAvailable`, `PatientHasUnfinishedAppointment`, `MultiplePatientRecords`, `InvalidPhone`, `EmailInvalid`, các lỗi dịch vụ/ngày của F-APT-02; `PatientMessage.PatientNotFound` (404) khi `patientId` không tồn tại. Có thể cần message mới khi thiếu cả `patientId` lẫn `fullName`/`phoneNumber` (chưa có trong `ErrorConstants`).

## 4. Luồng xử lý trong code (ĐỀ XUẤT)

1. Kiểm tra request; xác định bệnh nhân: theo `patientId`, hoặc theo số điện thoại dùng `FindPatientsByPhoneAsync` (mọi hồ sơ, có hay không có tài khoản, giống walk-in `AppointmentService.cs:851-868`), không có thì tạo mới.
2. `ResolveBookingLinesAsync` (khám tổng quát + dịch vụ chọn, kiểm tra loại phòng).
3. Dùng lại `CreateBookingAsync`, thêm tham số trạng thái ban đầu (`CONFIRMED`) thay vì gán cứng `PENDING` ở `AppointmentService.cs:177`; `CreatedByUserId` = lễ tân.
4. Ghi audit `APPOINTMENT_CREATED` và `APPOINTMENT_CONFIRMED`.
5. Gửi `SendConfirmationNotificationAsync`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-01, BR-APT-03, BR-APT-04 | Như đặt online | Chưa làm (sẽ dùng lại `ResolveBookingLinesAsync`, `FindSlotsAsync`) |
| BR-APT-05 / Q9 | Lễ tân đặt hộ thì tự `CONFIRMED` (mặc định tạm) | Chưa làm |
| BR-C11 | Ghi audit kèm người đặt | Chưa làm |

## 6. Trạng thái và dữ liệu thay đổi (ĐỀ XUẤT)

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Patients` | Có hoặc chưa | Tạo mới nếu chưa có | |
| `Appointments` | - | `CONFIRMED`, `BOOKED`, `CreatedByUserId` = lễ tân | |
| `AppointmentServices` | - | Chốt giá, thời lượng | |
| `AuditLogs` | - | `APPOINTMENT_CREATED`, `APPOINTMENT_CONFIRMED` | |

## 7. Liên quan

- Trước đó: F-APT-01, F-APT-02; M9 BR-CRM-01 (lễ tân gọi chốt giờ tái khám rồi đặt lịch).
- Sau đó: M4 check-in; F-APT-07, F-APT-08.

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa làm).
- Ca cần test khi làm: đặt cho hồ sơ có tài khoản; đặt cho số mới; lịch `CONFIRMED` ngay và có SMS; slot bị chiếm; bệnh nhân còn lịch chưa kết thúc.

## 9. Còn thiếu / câu hỏi mở

- Q9 (mục 8 tài liệu tổng): tự `CONFIRMED` hay vẫn `PENDING`. Mặc định tạm: tự `CONFIRMED`.
- Lễ tân đặt hộ có phải tuân `Booking.MinHoursAhead` (2 giờ) không? Chưa chốt.
- Có cho chọn giờ ngoài slot (chèn lịch) không? Chưa chốt.
- Walk-in (`POST walk-in`, M4 F-RCP-02) đã cho lễ tân tạo lịch cho bệnh nhân có tài khoản nhưng chỉ cho **hôm nay** và check-in ngay, không thay được chức năng này.

## Đã làm (11/11/2026)

- `AppointmentService.BookByReceptionistAsync`: nhận `patientId` (hồ sơ có sẵn, kể cả có tài khoản) **hoặc** `fullName` + `phoneNumber` (+ `email`) cho người mới. Số điện thoại của tài khoản thì đặt cho hồ sơ của tài khoản đó; có hồ sơ chưa liên kết thì dùng lại; chưa có thì tạo mới.
- Dùng chung `CreateBookingAsync` với đặt lịch online (kiểm tra lại slot trong transaction serializable, một bệnh nhân chỉ có một lịch chưa xong, BR-APT-01..04), chỉ khác trạng thái ban đầu là **`CONFIRMED`** và người tạo là lễ tân. Bệnh nhân nhận SMS và email báo lịch đã xác nhận.
- Màn hình: hộp thoại "Đặt lịch hộ" (`BookingDialog.jsx`) gồm 3 bước: bệnh nhân, dịch vụ, ngày giờ (giờ trống của mọi bác sĩ). Hộp thoại mở từ Quản lý lịch hẹn (nút trên đầu trang hoặc ô trống của lịch tuần), Hồ sơ bệnh nhân và Yêu cầu tư vấn.
- Test: `OZE.UnitTest/Services/Appointments/BookByReceptionistTests.cs` (tab `OZ-APPT-22`).


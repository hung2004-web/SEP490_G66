# F-APT-11 Ghi kết quả liên lạc khi xác nhận lịch, đặt lại lịch đã hủy

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M3 (BR-APT-05, BR-APT-08, BR-APT-10..15), câu hỏi Q10, Q16.
>
> **Đề xuất 11/11/2026, chờ nhóm chốt.** Chưa có trong code. Mục 3, 4, 6 là **THIẾT KẾ ĐỀ XUẤT**. Nguồn: phiên brainstorm `_bmad-output/brainstorming/brainstorm-xac-nhan-lich-pending-2026-11-11/`.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ⬜ Đề xuất, chưa làm |
| Vai trò được dùng | `Receptionist` |
| API | Đề xuất: `POST api/appointments/{id}/contact-attempts`, `GET api/appointments/{id}/contact-attempts`, `POST api/appointments/{id}/rebook` |
| Code chính | Đề xuất: `AppointmentsController` → `AppointmentContactService` (mới) → `AppointmentContactLogRepository` (mới), dùng lại `AppointmentService` (xác nhận, hủy, đổi lịch) và `PatientService.UpdatePatientAsync` |

## 1. Chức năng này làm gì

Lịch đặt online ở `PENDING`. Lễ tân gọi cho khách **bằng điện thoại ngoài hệ thống**, rồi vào web ghi **kết quả cuộc gọi**. Kết quả quyết định lịch được xác nhận, giữ chờ hay bị hủy. Khi khách tự gọi lên phòng khám (hủy, đổi giờ, sửa thông tin, hoặc muốn giữ lại lịch đã bị hủy), lễ tân cũng ghi lại như vậy.

Web không ghi được cuộc gọi, nên hệ thống **không chứng minh** lễ tân đã gọi. Hệ thống lưu **lời khai có ghi danh** (ai, lúc nào, kết quả gì) để truy trách nhiệm và làm báo cáo.

## 2. Tiền điều kiện

- Đăng nhập `Receptionist`.
- Lịch tồn tại. Ghi kết quả xác nhận chỉ khi lịch `PENDING`. Ghi "khách gọi đến" được cho lịch `PENDING` hoặc `CONFIRMED`. "Đặt lại" chỉ cho lịch `CANCELLED`.
- Hiện trạng code liên quan:
  - Xác nhận: `AppointmentService.ConfirmAppointmentAsync` (`AppointmentService.cs:624`), `POST api/appointments/{id}/confirm` (`AppointmentsController.cs:219`): chỉ đổi `PENDING` → `CONFIRMED` và gửi SMS/email, không lưu ai xác nhận ngoài audit đổi trạng thái.
  - Hủy: `CancelAppointmentAsync` (`AppointmentService.cs:514`), bắt buộc lý do.
  - Đổi lịch: `RescheduleAppointmentAsync` (`AppointmentService.cs:555`).
  - Sửa hồ sơ: `PatientService.UpdatePatientAsync` (`PatientService.cs:145`), chặn lễ tân đổi SĐT/email của bệnh nhân có tài khoản.

## 3. API (đề xuất)

**Request 1** `POST api/appointments/{id}/contact-attempts`, quyền `Receptionist`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `direction` | string | có | `Outbound` (lễ tân gọi đi), `Inbound` (khách gọi đến) | Chiều cuộc gọi |
| `outcome` | string | có | Xem bảng kết quả ở mục 4 | Kết quả |
| `note` | string | khi `outcome` là hủy | ≤ 500 | Ghi chú, lý do hủy |
| `patientUpdate` | object | khi `outcome = ConfirmedWithChanges` | Cùng trường với `UpdatePatientRequest` | Thông tin đã sửa |
| `reschedule` | object | khi `outcome = Rescheduled` | Cùng trường với `RescheduleAppointmentRequest` | Giờ mới |

Ví dụ:

```json
{
  "direction": "Outbound",
  "outcome": "ConfirmedWithChanges",
  "note": "Khách báo sai năm sinh",
  "patientUpdate": { "fullName": "Nguyễn Văn An", "dateOfBirth": "1996-04-02", "gender": "Male" }
}
```

**Response thành công** (`ApiResponse<ContactAttemptResponse>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `attemptNumber` | int | Lần liên lạc thứ mấy của lịch này |
| `appointmentStatus` | string | Trạng thái lịch sau khi ghi |
| `failedAttempts` | int | Số lần "không liên lạc được" |
| `suggestCancel` | bool | `true` khi đã đủ `Booking.ContactMaxAttempts` lần không liên lạc được |
| `nextRetryAt` | datetime? | Lúc sớm nhất được gọi lại |

**Request 2** `GET api/appointments/{id}/contact-attempts`, quyền `Receptionist`: danh sách nhật ký của lịch, mới nhất trước.

**Request 3** `POST api/appointments/{id}/rebook`, quyền `Receptionist`

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `date`, `slotStart` | date, time | không | Giờ mới; bỏ trống thì dùng giờ của lịch cũ |
| `note` | string | không | Ví dụ "Khách gọi lại xin giữ lịch" |

Trả về lịch mới (`AppointmentResponse`), trạng thái `CONFIRMED`.

**Lỗi**

| HTTP | Khi nào | Message (đề xuất thêm vào `ErrorConstants.AppointmentMessage`) |
|---|---|---|
| 404 | Không có lịch | `AppointmentNotFound` (đã có) |
| 400 | Ghi kết quả xác nhận cho lịch không ở `PENDING` | `OnlyPendingCanBeConfirmed` (đã có) |
| 400 | Gọi lại khi chưa đủ `Booking.ContactRetryMinutes` | `ContactRetryTooSoon` (mới) |
| 400 | Hủy mà thiếu ghi chú | `ReasonRequired` (đã có) |
| 400 | Sửa thông tin không hợp lệ | Lỗi của `UpdatePatientAsync` (`InvalidPhone`, `PhoneExist`, `ContactManagedByAccount`, …) |
| 400 | "Đặt lại" lịch không ở `CANCELLED` | `OnlyCancelledCanBeRebooked` (mới) |
| 400 | Giờ chọn khi "Đặt lại" không còn trống | `SlotNotAvailable` (đã có) |

## 4. Luồng xử lý (đề xuất)

**Ghi kết quả liên lạc**

1. Tìm lịch, kiểm tra trạng thái theo mục 2.
2. Với `outcome = NoAnswer`: kiểm tra lần "không liên lạc được" gần nhất cách hiện tại ít nhất `Booking.ContactRetryMinutes`.
3. Trong **một transaction**: thực hiện việc theo kết quả, rồi ghi dòng nhật ký.

| `outcome` | Ý nghĩa | Việc làm | Lịch sau đó |
|---|---|---|---|
| `Confirmed` | Đã xác nhận, đúng thông tin | Gọi logic xác nhận hiện có | `CONFIRMED` |
| `ConfirmedWithChanges` | Đã xác nhận, có sửa thông tin | `UpdatePatientAsync` rồi xác nhận; lỗi ở bước sửa thì rollback, lịch giữ `PENDING` | `CONFIRMED` |
| `Rescheduled` | Khách muốn đổi giờ | `RescheduleAppointmentAsync` rồi xác nhận | `CONFIRMED` |
| `NoAnswer` | Không liên lạc được | Tăng số lần thất bại; đủ `Booking.ContactMaxAttempts` thì trả `suggestCancel = true` | `PENDING` |
| `WrongNumber` | Sai số, không phải người đặt | Hủy, lý do "Sai số điện thoại" | `CANCELLED` |
| `CancelledByPatient` | Khách báo hủy | Hủy, lý do lấy từ `note` | `CANCELLED` |
| `InfoOnly` | Khách gọi đến hỏi hoặc dặn dò, không đổi gì | Chỉ ghi nhật ký | Giữ nguyên |

4. SMS/email xác nhận gửi **sau khi** transaction thành công, tới thông tin đã sửa.

**Đặt lại lịch đã hủy**

1. Lịch cũ phải `CANCELLED`.
2. Lấy giờ trong request, không có thì giờ cũ; kiểm tra slot trống như khi đặt lịch.
3. Tạo lịch mới cùng bệnh nhân, dịch vụ, bác sĩ, trạng thái `CONFIRMED`, gắn `RebookedFromAppointmentId` = lịch cũ. Không dùng `ParentAppointmentId` (`Appointment.cs:26`) vì trường đó đang dành cho lịch tái khám.
4. Ghi nhật ký vào **cả hai** lịch: lịch cũ "Đã đặt lại thành #mới", lịch mới "Đặt lại từ #cũ".

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-10 | Mỗi lần liên lạc một dòng nhật ký, không sửa, không xóa | Chỉ có API thêm, không có API sửa/xóa |
| BR-APT-11 | Kết quả liên lạc quyết định trạng thái lịch | Bảng ở mục 4 |
| BR-APT-12 | Sửa thông tin và xác nhận trong cùng transaction; không sửa SĐT/email của bệnh nhân có tài khoản | Bước 3 mục 4; `UpdatePatientAsync` |
| BR-APT-13 | Gọi lại cách ít nhất 15 phút; sau 3 lần gợi ý hủy, lễ tân quyết định | Bước 2 mục 4; `suggestCancel` |
| BR-APT-14 | Khách gọi lại: lịch đã hủy không mở lại, dùng "Đặt lại" | API `rebook` |
| BR-APT-15 | Lịch `PENDING` còn dưới 2 giờ thì lên đầu danh sách, đánh dấu cảnh báo | F-APT-10 |

## 6. Trạng thái và dữ liệu thay đổi (đề xuất)

**Bảng mới `AppointmentContactLogs`**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | long | Khóa chính |
| `AppointmentId` | long | FK `Appointments` |
| `AttemptNumber` | int | Thứ tự trong lịch, bắt đầu từ 1 |
| `Direction` | nvarchar(10) | `Outbound`, `Inbound` |
| `Outcome` | nvarchar(30) | Giá trị ở bảng mục 4 |
| `Note` | nvarchar(500) null | |
| `Changes` | nvarchar(max) null | JSON giá trị cũ và mới khi sửa thông tin |
| `RecordedByUserId` | nvarchar(450) | Lễ tân ghi |
| `RecordedAt` | datetimeoffset | |

Index `(AppointmentId, RecordedAt)`.

**Thay đổi bảng `Appointments`:** thêm `RebookedFromAppointmentId` (long null, FK chính nó).

**Cấu hình mới trong `SystemConfigurations`:** `Booking.ContactRetryMinutes` = 15, `Booking.ContactMaxAttempts` = 3, `Booking.PendingWarnHours` = 2.

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments.Status` | `PENDING` | `CONFIRMED` / `PENDING` / `CANCELLED` | Theo kết quả |
| `Patients` | Thông tin cũ | Thông tin đã sửa | Chỉ khi `ConfirmedWithChanges` |
| `AppointmentContactLogs` | | Thêm 1 dòng (đặt lại: 2 dòng) | |
| `Appointments` (mới) | | Lịch `CONFIRMED`, `RebookedFromAppointmentId` | Chỉ khi đặt lại |

## 7. Liên quan

- Trước đó: F-APT-03 (khách vãng lai đặt), F-APT-04 (bệnh nhân đặt) tạo lịch `PENDING`.
- Thay thế cách dùng của F-APT-06 (xác nhận lịch): màn lễ tân dùng "Ghi kết quả gọi" thay cho nút xác nhận trống. API `confirm` cũ giữ lại cho tương thích hoặc bỏ, nhóm chốt.
- Dùng lại F-APT-07 (hủy), F-APT-08 (đổi lịch), sửa hồ sơ bệnh nhân (`PUT api/patients/{id}`).
- Sau đó: F-RCP-01 (check-in chỉ nhận lịch `CONFIRMED`); F-APT-10 (cảnh báo `PENDING` quá hạn) đọc số lần liên lạc thất bại.

## 8. Kiểm thử

- Test hiện có: chưa có.
- Ca cần test:
  - Mỗi `outcome` ở bảng mục 4 cho đúng trạng thái lịch và đúng một dòng nhật ký.
  - `ConfirmedWithChanges` với SĐT đã thuộc bệnh nhân khác: lịch giữ `PENDING`, hồ sơ không đổi, không có dòng nhật ký xác nhận.
  - `ConfirmedWithChanges` cho bệnh nhân có tài khoản đổi SĐT: lỗi `ContactManagedByAccount`.
  - `NoAnswer` lần 2 trong vòng 15 phút: lỗi `ContactRetryTooSoon` (biên: đúng 15 phút thì được).
  - `NoAnswer` lần thứ 3: `suggestCancel = true`, lịch vẫn `PENDING`.
  - Ghi kết quả xác nhận cho lịch `CONFIRMED`: lỗi.
  - `Inbound` + `CancelledByPatient` cho lịch `CONFIRMED`: hủy được, nhật ký chiều `Inbound`.
  - "Đặt lại" lịch `CANCELLED`, giờ cũ còn trống: lịch mới `CONFIRMED`, có `RebookedFromAppointmentId`, nhật ký ở cả hai lịch.
  - "Đặt lại" khi giờ cũ đã có người đặt: lỗi `SlotNotAvailable`.
  - "Đặt lại" lịch không ở `CANCELLED`: lỗi.

## 9. Còn thiếu / câu hỏi mở

- Toàn bộ chức năng là đề xuất; cần nhóm chốt trước khi code (bảng mới và migration ảnh hưởng FE lễ tân, đặt lịch, test).
- Q16: có làm bước bệnh nhân tự xác nhận (OTP khi đặt lịch, link trong SMS/email) không; lịch từ tài khoản đã xác minh OTP có tự `CONFIRMED` không. Cần SMS/email thật (key Twilio/SendGrid đang trống).
- Hướng phát triển, ngoài phạm vi đồ án: gọi điện trên web qua tổng đài ảo (click-to-call, ví dụ Stringee, Twilio Voice) để có bằng chứng cuộc gọi thật (thời lượng, ghi âm).
- Giữ hay bỏ API `POST api/appointments/{id}/confirm` khi đã có `contact-attempts`.
- Có hiện lịch sử NO_SHOW và hủy của SĐT khi lễ tân xác nhận không (ý tưởng trong phiên brainstorm).

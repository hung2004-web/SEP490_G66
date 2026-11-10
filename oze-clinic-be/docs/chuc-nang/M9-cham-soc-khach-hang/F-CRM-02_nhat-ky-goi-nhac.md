# F-CRM-02 Nhật ký gọi nhắc tái khám

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M9 (BR-CRM-01), câu hỏi Q8.
>
> **Chức năng chưa làm.** Mục 3-6 là **ĐỀ XUẤT**. Hiện **không có bảng** nào lưu cuộc gọi; cần một bảng mới. Chốt với nhóm trước khi code.

| Mục | Giá trị |
|---|---|
| Module | M9 Chăm sóc khách hàng và thông báo |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | Đề xuất: `Receptionist` ghi; `Receptionist`, `ClinicManager` xem |
| API | Đề xuất: `POST api/recall-reminders/calls`, `GET api/patients/{patientId}/recall-calls` |
| Code chính | Chưa có. Đề xuất: `RecallRemindersController` → `RecallReminderService.LogCallAsync` / `GetCallsAsync` → `RecallCallRepository` (mới) |

## 1. Chức năng này làm gì

Mỗi lần lễ tân gọi nhắc tái khám, ghi lại kết quả: đã chốt lịch, hẹn gọi lại, không nghe máy, từ chối. Nhật ký giúp danh sách nhắc (F-CRM-01) biết ai đã gọi, ai cần gọi lại lúc nào, và để quản lý theo dõi.

## 2. Tiền điều kiện

- Đề xuất: đăng nhập `Receptionist`; giai đoạn được nhắc thuộc kế hoạch `Approved`/`InProgress`, `StageStatus = Scheduled`.
- Hiện trạng: các bảng có sẵn **không phù hợp** để lưu cuộc gọi:
  - `Notifications`: dành cho thông báo gửi tới một `UserId` (FK tới `AspNetUsers`, xóa cascade); bệnh nhân vãng lai không có user; `NotificationType` chỉ nhận `InApp`, `Email`, `SMS`.
  - `AuditLogs` (`Action`, `EntityType`, `EntityId`, `NewValues`, `AdditionalData`): dùng được như bản ghi tạm, nhưng khó truy vấn "lần gọi gần nhất" và "gọi lại lúc".

## 3. API

**ĐỀ XUẤT 1** `POST api/recall-reminders/calls`, quyền `Receptionist`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `treatmentPlanStageId` | long | Có | Giai đoạn `Scheduled` của kế hoạch `Approved`/`InProgress` | Giai đoạn được nhắc |
| `callResult` | string | Có | `BOOKED`, `CALLBACK`, `NO_ANSWER`, `DECLINED`, `WRONG_NUMBER` (đề xuất, chữ hoa giống trạng thái lịch hẹn) | Kết quả |
| `callbackAt` | DateTimeOffset | Khi `CALLBACK` | Ở tương lai | Hẹn gọi lại |
| `appointmentId` | long | Khi `BOOKED` | Lịch của đúng bệnh nhân | Lịch đã đặt |
| `notes` | string | Không | ≤ 500 | Ghi chú |

Ví dụ:

```json
{ "treatmentPlanStageId": 321, "callResult": "CALLBACK", "callbackAt": "2026-11-12T09:00:00+07:00", "notes": "Bệnh nhân đang bận, gọi lại sáng thứ Năm" }
```

**Response** (`ApiResponse<RecallCallResponse>`): `Id`, `PatientId`, `TreatmentPlanStageId`, `CallResult`, `CallbackAt`, `AppointmentId`, `Notes`, `CalledByName`, `CalledAt`.

**ĐỀ XUẤT 2** `GET api/patients/{patientId}/recall-calls`, quyền `Receptionist`, `ClinicManager`: lịch sử gọi, mới nhất trước.

**Lỗi đề xuất**

| HTTP | Khi nào | Message đề xuất |
|---|---|---|
| 404 | Không có giai đoạn | dùng lại `TreatmentPlanMessage.StageNotFound` |
| 400 | Giai đoạn / kế hoạch không ở trạng thái nhắc được | mới |
| 400 | `callResult` sai, thiếu `callbackAt`/`appointmentId` theo kết quả | mới, theo mẫu `... is invalid. Please check again.` |
| 400 | `appointmentId` không thuộc bệnh nhân | mới (giống `InvoiceMessage.AppointmentPatientMismatch`) |

## 4. Luồng xử lý trong code

Chưa có code. Luồng đề xuất:

1. Lấy `StaffProfile`/user lễ tân hiện tại.
2. Nạp giai đoạn kèm kế hoạch và bệnh nhân, kiểm trạng thái.
3. Kiểm `callResult` và các trường đi kèm; với `BOOKED`, kiểm lịch tồn tại, đúng bệnh nhân, `PENDING`/`CONFIRMED`.
4. Thêm dòng `RecallCalls`, `CalledAt` = `DateTimeOffset.UtcNow` (BR-C02).
5. Ghi `AuditLog` (BR-C11, đề xuất hằng mới `AuditConstants.RecallCallLogged`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-CRM-01 | Lễ tân gọi chốt giờ rồi đặt lịch cho giai đoạn | Đề xuất: `callResult = BOOKED` bắt buộc `appointmentId` |
| BR-C11 | Thay đổi quan trọng ghi `AuditLog` | Đề xuất: bước 5 |
| BR-C02 | Mốc thời điểm dùng `DateTimeOffset` | `CalledAt`, `CallbackAt` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `RecallCalls` (**bảng mới**, cần migration) | | thêm dòng | Cột đề xuất: `Id` long, `PatientId` int FK, `TreatmentPlanStageId` long FK, `CallResult` nvarchar(20) + check constraint, `CallbackAt` DateTimeOffset?, `AppointmentId` long? FK, `Notes` nvarchar(500), `CalledByUserId` nvarchar FK, `CalledAt` DateTimeOffset; index (`TreatmentPlanStageId`, `CalledAt` desc), (`CallbackAt`) lọc `CallResult = 'CALLBACK'` |
| `AuditLogs` | | thêm dòng | |
| `TreatmentPlanStages` | `Scheduled` | `Scheduled` | Không đổi; nếu có cột `AppointmentServices.TreatmentPlanStageId` thì gắn lịch vào giai đoạn |

## 7. Liên quan

- Trước đó: F-CRM-01 danh sách nhắc.
- Sau đó: đặt lịch tái khám (F-APT-09 chưa làm, hoặc `guest-booking` + F-APT-06 xác nhận); F-CRM-01 dùng lần gọi gần nhất để ẩn/hiện bệnh nhân.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: từng `callResult` với trường bắt buộc tương ứng; `callbackAt` ở quá khứ; giai đoạn đã hoàn thành; kế hoạch đã hủy; `appointmentId` của bệnh nhân khác; ghi audit.

## 9. Còn thiếu / câu hỏi mở

- Cần migration bảng mới; tên bảng, danh sách `callResult` chưa chốt.
- Q8 chưa chốt kênh nhắc: nếu thêm SMS tự động thì phân biệt cuộc gọi tay (bảng này) với tin gửi tự động (`Notifications` `NotificationType = SMS`).
- Số lần gọi không nghe máy tối đa trước khi dừng nhắc: chưa chốt.

# F-ADM-06 Sửa cấu hình hệ thống

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2 và mục 7.
>
> **Chức năng CHƯA LÀM.** Mục 3, 4, 6 bên dưới là **ĐỀ XUẤT**, chưa có trong code. Phần "Hiện trạng" là code thật.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | `ClinicManager` (theo ma trận quyền Dac_ta mục 1) |
| API | ĐỀ XUẤT: `GET api/system-configurations`, `GET api/system-configurations/{key}`, `PUT api/system-configurations/{key}` |
| Code chính | ĐỀ XUẤT: `SystemConfigurationsController` → `SystemConfigurationService` → `SystemConfigurationRepository`. Hiện chỉ có entity `SystemConfiguration` và các hàm đọc `GetConfigValueAsync` |

## 1. Chức năng này làm gì

Quản lý phòng khám xem và sửa các tham số vận hành (số ngày đặt trước tối đa, giờ hủy tối thiểu, độ dài slot, giờ làm việc...) mà không cần sửa code hay deploy lại (BR-C12). Mỗi lần sửa lưu người sửa, thời điểm và ghi nhật ký.

### Hiện trạng trong code

- Entity `SystemConfiguration` (`OZE.Domain/Entities/SystemConfiguration.cs:3-12`): `Id`, `ConfigKey`, `ConfigValue`, `DataType` (mặc định `"String"`), `Description`, `UpdatedAt`, `UpdatedByUserId`.
- Cấu hình bảng `SystemConfigurations` (`SystemConfigurationConfiguration.cs`): check constraint `DataType IN ('String','Int','Bool','Decimal','Json')` (`:13`); `ConfigKey` tối đa 100, bắt buộc (`:17`); `ConfigValue` tối đa 500, bắt buộc (`:18`); `Description` tối đa 500 (`:20`); FK `UpdatedByUserId` → `AspNetUsers` (`:22-26`); unique index `IX_SystemConfigurations_ConfigKey` (`:28`).
- Dữ liệu seed (`SystemConfigurationConfiguration.cs:30-39`):

| Id | `ConfigKey` | `ConfigValue` | `DataType` | Đang được code đọc? |
|---|---|---|---|---|
| 1 | `Booking.MaxDaysAhead` | 30 | Int | Có – `AppointmentService` |
| 2 | `Booking.MinHoursAhead` | 2 | Int | Có – `AppointmentService` |
| 3 | `CheckIn.EarlyMinutes` | 30 | Int | **Không** |
| 4 | `CheckIn.LateMinutes` | 15 | Int | Có – `AppointmentService` (phân nhóm trễ) |
| 5 | `Queue.AutoExpireMinutes` | 60 | Int | **Không** |
| 6 | `Clinic.WorkStartTime` | 08:00 | String | **Không** |
| 7 | `Clinic.WorkEndTime` | 17:00 | String | **Không** |
| 8 | `Clinic.SlotDurationMinutes` | 30 | Int | Có – `AppointmentService`, `ExaminationService` |
| 9 | `Booking.CancelCutoffHours` | 24 | Int | Có – `AppointmentService` |
| – | `Booking.GeneralExamServiceCode` | (không seed) | – | Có – `AppointmentService`; thiếu thì lỗi `ConfigMissing` |

- Khóa dùng trong code nằm ở `ConfigKeyConstants` (`OZE.Common/Constants/ConfigKeyConstants.cs`).
- Đọc giá trị: `AppointmentRepository.GetConfigValueAsync` (`AppointmentRepository.cs:97-104`) và `ExaminationRepository.GetConfigValueAsync` truy vấn DB **mỗi lần gọi, không cache** → sửa giá trị trong DB có hiệu lực ngay ở request sau. `WorkShiftRepository.GetConfigValueAsync` ném `NotImplementedException`.
- `AppointmentService.GetIntConfigAsync` / `GetStringConfigAsync` (`AppointmentService.cs:321-326`, `:355-361`): giá trị thiếu hoặc không parse được → 400 `AppointmentMessage.ConfigMissing`.
- Không có controller, service, repository ghi cấu hình. Hiện chỉ sửa được bằng SQL trực tiếp hoặc migration.

## 2. Tiền điều kiện

- ĐỀ XUẤT: đăng nhập, role `ClinicManager`.
- Khóa cấu hình đã tồn tại (không cho tạo khóa mới qua API, khóa do dev seed bằng migration).

## 3. API (ĐỀ XUẤT)

**Request** `GET api/system-configurations`, quyền `ClinicManager` – trả toàn bộ cấu hình.

**Request** `GET api/system-configurations/{key}`, quyền `ClinicManager` – trả một cấu hình.

**Request** `PUT api/system-configurations/{key}`, quyền `ClinicManager`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `configValue` | string | Có | Tối đa 500; parse được theo `DataType` của khóa; qua kiểm tra miền giá trị theo khóa (bảng mục 5) | Giá trị mới |
| `reason` | string? | Không | Tối đa 500 | Lý do sửa, ghi vào `AuditLog` |

```json
{ "configValue": "45", "reason": "Mở đặt lịch xa hơn cho dịp Tết" }
```

**Response thành công** (ĐỀ XUẤT `ApiResponse<SystemConfigurationResponse>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `configKey` | string | Khóa |
| `configValue` | string | Giá trị |
| `dataType` | string | `String`/`Int`/`Bool`/`Decimal`/`Json` |
| `description` | string? | Mô tả |
| `updatedAt` | DateTimeOffset? | Lần sửa cuối |
| `updatedByUserId` | string? | Người sửa |

**Lỗi** (ĐỀ XUẤT – các message chưa có trong `ErrorConstants`, cần thêm một lớp `SystemConfigurationMessage`)

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `configValue` | Chưa có, cần thêm |
| 400 | Không parse được theo `DataType` | Chưa có, cần thêm |
| 400 | Ngoài miền giá trị của khóa | Chưa có, cần thêm |
| 404 | Không có khóa | Chưa có, cần thêm (hoặc dùng `Common.NotFound` "Not Found") |

## 4. Luồng xử lý trong code (ĐỀ XUẤT)

1. Controller lấy `userId` từ claim, gắn `[ApiResponseValidationFilter]` để lỗi validation trả `ApiResponse`.
2. Service tìm bản ghi theo `ConfigKey`, không có → `NotFoundException`.
3. Parse `configValue` theo `DataType` (`int.TryParse`, `bool.TryParse`, `decimal.TryParse`, `TimeOnly.TryParse` cho giờ, `JsonDocument.Parse` cho Json).
4. Kiểm miền giá trị theo khóa (mục 5) và ràng buộc chéo (`Clinic.WorkStartTime < Clinic.WorkEndTime`).
5. Gán `ConfigValue`, `UpdatedAt = DateTimeOffset.UtcNow`, `UpdatedByUserId`; `SaveChanges`.
6. Ghi `AuditLog` (`IAuditLogService.LogAsync(action, "SystemConfiguration", key, oldValues, newValues, reason)`) theo BR-C11.
7. Nếu sau này thêm cache cho cấu hình thì xóa cache ở bước này.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-C12 | Cấu hình đổi được không cần sửa code nằm ở `SystemConfigurations` | Chưa có API ghi |
| BR-C11 | Thay đổi quan trọng ghi `AuditLog` | ĐỀ XUẤT ở bước 6 |
| (ĐỀ XUẤT) | `Booking.MaxDaysAhead` số nguyên ≥ 1 | Service |
| (ĐỀ XUẤT) | `Booking.MinHoursAhead`, `Booking.CancelCutoffHours`, `CheckIn.EarlyMinutes`, `CheckIn.LateMinutes` số nguyên ≥ 0 | Service |
| (ĐỀ XUẤT) | `Clinic.SlotDurationMinutes`, `Queue.AutoExpireMinutes` số nguyên > 0 | Service |
| (ĐỀ XUẤT) | `Clinic.WorkStartTime` < `Clinic.WorkEndTime`, dạng `HH:mm` | Service |
| (ĐỀ XUẤT) | `Booking.GeneralExamServiceCode` là mã của một dịch vụ đang hoạt động | Service, dùng `ServiceRepository.GetByCodeAsync` |

## 6. Trạng thái và dữ liệu thay đổi (ĐỀ XUẤT)

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `SystemConfigurations.ConfigValue` | cũ | mới | |
| `SystemConfigurations.UpdatedAt`, `UpdatedByUserId` | cũ / null | thời điểm, người sửa | Cột đã có sẵn |
| `AuditLogs` | | 1 dòng | Giá trị cũ, mới, lý do |

## 7. Liên quan

- Sau đó: F-APT-02, F-APT-03/04 (BR-APT-04), F-APT-07/08 (BR-APT-06, BR-APT-08), F-APT-01 (BR-APT-01), F-RCP-01/02 (BR-RCP-02), F-RCP-06 (BR-RCP-06), F-EXM (độ dài slot).

## 8. Kiểm thử

- Test hiện có: Chưa có (chức năng chưa làm).
- Ca cần test khi làm: sửa khóa không tồn tại; giá trị sai kiểu; ngoài miền; giờ bắt đầu ≥ giờ kết thúc; giá trị mới có hiệu lực ngay ở request đặt lịch kế tiếp; có `AuditLog`.

## 9. Còn thiếu / câu hỏi mở

- Toàn bộ chức năng chưa có code.
- `Booking.GeneralExamServiceCode` **không được seed** (Dac_ta mục 7 ghi "phải seed tay"); thiếu khóa thì đặt lịch lỗi `ConfigMissing`. API này nên là cách chính để đặt khóa đó, hoặc thêm seed.
- 4 khóa đã seed nhưng code không đọc: `CheckIn.EarlyMinutes`, `Queue.AutoExpireMinutes`, `Clinic.WorkStartTime`, `Clinic.WorkEndTime`. Sửa chúng hiện không có tác dụng. Dac_ta mục 7 ghi `Clinic.WorkStartTime/WorkEndTime` dùng ở F-APT-02 và `Queue.AutoExpireMinutes` dùng ở BR-RCP-06 – lệch với code.
- Mô tả seed của `CheckIn.LateMinutes` là "Số phút đến muộn trước khi đánh dấu NO_SHOW", còn Dac_ta mục 7 và `ConfigKeyConstants` dùng nó để phân nhóm "đến trễ" trong danh sách chờ (BR-RCP-02). Cần sửa mô tả seed.
- Giờ vào ca sớm (`WorkShiftConstants.ClockInEarlyMinutes = 30`) đang là hằng số trong code, chưa đưa vào cấu hình.
- Chưa chốt: quản lý có được thêm khóa mới không; có cần lịch sử phiên bản cấu hình ngoài `AuditLog` không.

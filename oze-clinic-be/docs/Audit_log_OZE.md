# Audit log của hệ thống OZE

Tài liệu chốt những sự kiện nào cần ghi vào bảng `AuditLogs`, ghi những gì, và cách ghi.

## 1. Hiện trạng

- Entity `AuditLog` và bảng `AuditLogs` đã có đủ cột và index.
- Chưa có code nào ghi vào bảng này (xem `docs/Tong_quan_he_thong_OZE.md`).

Các cột của `AuditLogs`:

| Cột | Ý nghĩa |
|---|---|
| `Id` | Khóa chính (long) |
| `UserId` | Người thực hiện thao tác |
| `Action` | Tên sự kiện, ví dụ `APPOINTMENT_CONFIRMED` |
| `EntityType` | Loại đối tượng bị tác động, ví dụ `Appointment` |
| `EntityId` | Id của đối tượng đó |
| `OldValues` | Giá trị cũ (JSON) |
| `NewValues` | Giá trị mới (JSON) |
| `IpAddress` | Địa chỉ IP của người gọi |
| `UserAgent` | Trình duyệt hoặc thiết bị |
| `AdditionalData` | Thông tin thêm, ví dụ lý do hủy hoặc sửa |
| `CreatedAt` | Thời điểm ghi |

Index có sẵn: (`EntityType`, `EntityId`), (`UserId`, `CreatedAt`), `CreatedAt`.

## 2. Nguyên tắc chọn

Chỉ ghi hành động làm đổi dữ liệu quan trọng: liên quan tiền, dữ liệu y tế, hoặc cần truy ra "ai làm gì, lúc nào". Không ghi các thao tác chỉ đọc thông thường, vì bảng sẽ phình rất nhanh. Dữ liệu y tế là ngoại lệ duy nhất cho việc ghi thao tác đọc.

## 3. Bước 1: làm trước (tiền và nghiệp vụ chính)

| Nhóm | Sự kiện (`Action`) | `EntityType` | Ghi gì |
|---|---|---|---|
| Lịch hẹn | `APPOINTMENT_CREATED` | `Appointment` | Dịch vụ, bác sĩ, giờ hẹn, nguồn đặt |
| Lịch hẹn | `APPOINTMENT_CONFIRMED` | `Appointment` | Trạng thái cũ và mới |
| Lịch hẹn | `APPOINTMENT_CANCELLED` | `Appointment` | Trạng thái cũ và mới, lý do hủy (`AdditionalData`) |
| Lịch hẹn | `APPOINTMENT_CHECKED_IN` | `Appointment` | Trạng thái cũ và mới, giờ check-in |
| Lịch hẹn | `APPOINTMENT_RESCHEDULED` | `Appointment` | Giờ và bác sĩ cũ và mới, lý do sửa (`AdditionalData`) |
| Thanh toán | `PAYMENT_RECORDED` | `Payment` | Số tiền, phương thức, hóa đơn |
| Thanh toán | `PAYMENT_VOIDED` | `Payment` | Số tiền, lý do hủy |
| Hoàn tiền | `REFUND_REQUESTED` | `RefundAdjustmentRequest` | Số tiền, lý do, người đề nghị |
| Hoàn tiền | `REFUND_APPROVED` | `RefundAdjustmentRequest` | Số tiền, người duyệt |
| Hoàn tiền | `REFUND_REJECTED` | `RefundAdjustmentRequest` | Lý do từ chối, người duyệt |

## 4. Bước 2: nếu còn thời gian

| Nhóm | Sự kiện (`Action`) | `EntityType` |
|---|---|---|
| Dữ liệu y tế | `PATIENT_RECORD_VIEWED` | `Patient` |
| Dữ liệu y tế | `PATIENT_UPDATED`, `PATIENT_DELETED` | `Patient` |
| Dữ liệu y tế | `DIAGNOSIS_CREATED`, `DIAGNOSIS_ADDENDUM_ADDED` | `ClinicalDiagnosis` |
| Dữ liệu y tế | `TREATMENT_PLAN_CONFIRMED`, `TREATMENT_PLAN_REVISED` | `TreatmentPlan` |
| Dữ liệu y tế | `IMAGING_RESULT_UPLOADED` | `ImagingResult` |
| Cấu hình và danh mục | `SERVICE_PRICE_CHANGED` | `Service` |
| Cấu hình và danh mục | `VARIANT_PRICE_CHANGED` | `ServiceVariant` |
| Cấu hình và danh mục | `CONFIG_CHANGED` | `SystemConfiguration` |
| Cấu hình và danh mục | `SCHEDULE_CHANGED` | `StaffSchedule` |

Lý do ghi nhóm dữ liệu y tế:

- `PATIENT_RECORD_VIEWED` truy ra ai xem hồ sơ của ai.
- `PATIENT_DELETED` cần biết ai xóa, vì hồ sơ dùng xóa mềm (`DeletedAt`).
- Chẩn đoán đã chốt và kế hoạch điều trị đã xác nhận không được ghi đè lặng lẽ, nên phải để lại lịch sử khi bổ sung hoặc sửa.

Lý do ghi nhóm cấu hình và danh mục: giá và cấu hình ảnh hưởng trực tiếp đến doanh thu và hành vi hệ thống.

## 5. Đã bỏ khỏi phạm vi

Các nhóm sau đã được cân nhắc và loại bỏ cho đồ án này:

- Đăng nhập: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGED`, `PASSWORD_RESET`
- Phân quyền: `ROLE_ASSIGNED`, `ROLE_REMOVED`, `ACCOUNT_LOCKED`, `ACCOUNT_DISABLED`
- Tài khoản nhân viên: `STAFF_CREATED`, `STAFF_UPDATED`

Nên nói rõ trong báo cáo rằng phần audit bảo mật (đăng nhập, phân quyền) sẽ mở rộng sau.

## 6. Không ghi

- Mật khẩu, token, OTP, số thẻ.
- Danh sách và tìm kiếm thông thường.
- Dữ liệu y tế đầy đủ vào `OldValues` và `NewValues`. Chỉ ghi tên trường đã đổi và `EntityId`, để bảng log không thành nơi lưu thứ hai của dữ liệu nhạy cảm.

## 7. Cách ghi

1. Tạo `IAuditLogService` ghi các cột: `UserId`, `Action`, `EntityType`, `EntityId`, `OldValues`, `NewValues` (JSON), `IpAddress`, `UserAgent`, `AdditionalData`.
2. Gọi ở tầng Application service, sau khi nghiệp vụ thành công.
3. Ghi chung transaction với nghiệp vụ. Nếu giao dịch lỗi thì log cũng không được ghi.
4. Lý do hủy hoặc sửa để trong `AdditionalData`.
5. Đặt tên `Action` theo mẫu `<ĐỐI_TƯỢNG>_<HÀNH_ĐỘNG>`, viết hoa, dùng hằng số trong `OZE.Common/Constants` thay vì chuỗi viết tay.

## 8. Dùng ở đâu

- Màn hình lễ tân, mục "Lịch sử thao tác" của một lịch hẹn: lọc `EntityType = Appointment` và `EntityId = <Id lịch hẹn>`.
- Truy vết một nhân viên đã làm gì trong ngày: lọc theo `UserId` và `CreatedAt`.
- Đối soát thanh toán và hoàn tiền: lọc `EntityType` là `Payment` hoặc `RefundAdjustmentRequest`.

# F-CRM-03 API đọc thông báo trong hệ thống

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M9.
>
> **Chức năng chưa làm.** Bảng `Notifications` đã có và **đã được ghi** khi tạo chỉ định chụp phim. Mục 3-4 là **ĐỀ XUẤT**, khớp với dữ liệu giả lập FE đang dùng (`oze-clinic-fe/src/services/notificationService.jsx`).

| Mục | Giá trị |
|---|---|
| Module | M9 Chăm sóc khách hàng và thông báo |
| Trạng thái | ⬜ Chưa làm (đã ghi `Notification` khi tạo chỉ định phim) |
| Vai trò được dùng | Đề xuất: mọi người dùng đã đăng nhập, chỉ thấy thông báo của chính mình |
| API | Đề xuất: `GET api/notifications`, `GET api/notifications/unread-count`, `POST api/notifications/{id}/read`, `POST api/notifications/read-all` |
| Code chính | Chưa có. Đề xuất: `NotificationsController` → `NotificationService` → `NotificationRepository` (mới) |

## 1. Chức năng này làm gì

Người dùng (hiện tại chủ yếu là kỹ thuật viên chụp phim) xem danh sách thông báo trong hệ thống của mình, số thông báo chưa đọc, và đánh dấu đã đọc một hoặc tất cả. Bấm vào thông báo thì mở đúng đối tượng (`ReferenceType`, `ReferenceId`), ví dụ chỉ định chụp.

## 2. Tiền điều kiện

- Đăng nhập (JWT); `UserId` lấy từ token (`BaseApiController.CurrentUserId`).
- **Chỗ code đang ghi `Notification`** (duy nhất):
  - `ImagingRequestRepository.AddAsync` (`ImagingRequestRepository.cs:82-123`), gọi từ `ImagingRequestService.CreateAsync` (`ImagingRequestService.cs:76-83`) khi bác sĩ tạo chỉ định chụp (F-IMG-01).
  - Mỗi kỹ thuật viên đang hoạt động (`StaffProfile.IsActive`, role `DentalImagingTechnician`, `ImagingRequestRepository.cs:70-80`) nhận một dòng: `Title = "New imaging request"`, `Message = "Imaging request ({ImagingType}) for {PatientName} has been submitted."`, `NotificationType = "InApp"`, `Channel = "InApp"`, `ReferenceType = "ImagingRequest"`, `ReferenceId = ImagingRequest.Id`, `IsRead = false`, `SentAt = CreatedAt = ImagingRequest.CreatedAt`, `DeliveryStatus = "Sent"`.
- SMS/email xác nhận lịch hẹn (`AppointmentService.SendBookingNotificationAsync`, `SendConfirmationNotificationAsync`) gửi thẳng qua `ISmsSender`/`IEmailSender`, **không** ghi bảng `Notifications`.
- `DbSet<Notification>` có ở `AppIdentityDbContext.cs:59`; chưa có repository/service/controller nào đọc.

## 3. API

Cấu trúc bảng (`NotificationConfiguration.cs`): `Id` long, `UserId` (FK `AspNetUsers`, xóa cascade), `Title` (200, bắt buộc), `Message` (bắt buộc), `NotificationType` (20; check `InApp`, `Email`, `SMS`), `Channel` (20, mặc định `InApp`), `ReferenceType` (50), `ReferenceId` (50), `IsRead` (mặc định false), `ReadAt`, `SentAt`, `DeliveryStatus` (20; check `Pending`, `Sent`, `Delivered`, `Failed`), `CreatedAt`. Index `IX_Notifications_UserId_Unread` (`UserId`, `CreatedAt` desc, lọc `IsRead = 0`) và `IX_Notifications_UserId_CreatedAt`.

**ĐỀ XUẤT 1** `GET api/notifications?page=1&pageSize=20`, `[Authorize]`

| Trường (query) | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `page` | int | Không | ≥ 1, mặc định 1 | Trang |
| `pageSize` | int | Không | 1..50, mặc định 20 (FE `NOTIFICATION_PAGE_SIZE = 20`) | Cỡ trang |
| `unreadOnly` | bool | Không | Mặc định false | Chỉ chưa đọc |

Response FE đang giả lập: `{ items, page, pageSize, totalItems, totalPages, unreadCount }`. Backend có sẵn `PagedResult<T>` với `Items`, `TotalCount`, `PageNumber`, `PageSize`, `TotalPages`: **tên trường khác** FE, cần chốt một bên.

| Trường mỗi item | Kiểu | Ý nghĩa |
|---|---|---|
| `Id` | long | |
| `Title`, `Message` | string | |
| `NotificationType` | string | `InApp` |
| `ReferenceType`, `ReferenceId` | string? | Ví dụ `ImagingRequest`, `"99"` để FE điều hướng |
| `IsRead` | bool | |
| `ReadAt` | DateTimeOffset? | |
| `CreatedAt` | DateTimeOffset | Mới nhất trước |

**ĐỀ XUẤT 2** `GET api/notifications/unread-count` → `{ unreadCount }`.

**ĐỀ XUẤT 3** `POST api/notifications/{id}/read` → `{ unreadCount }`. Thông báo của người khác trả **404** (không lộ tồn tại, mục 1 tài liệu tổng).

**ĐỀ XUẤT 4** `POST api/notifications/read-all` → `{ unreadCount: 0 }`.

**Lỗi đề xuất**

| HTTP | Khi nào | Message đề xuất |
|---|---|---|
| 401 | Chưa đăng nhập | (do ASP.NET Core) |
| 404 | Không có thông báo hoặc không phải của mình | mới: `Notification not found.` (thêm `ErrorConstants.NotificationMessage`) |
| 400 | `page`/`pageSize` sai | mới |

## 4. Luồng xử lý trong code

Chưa có code đọc. Luồng ghi hiện có xem mục 2. Luồng đề xuất:

1. Lấy `CurrentUserId`.
2. Danh sách: `Notifications` `AsNoTracking`, `UserId = currentUserId`, (lọc `IsRead = false` nếu `unreadOnly`), xếp `CreatedAt` desc, `Id` desc, phân trang; đếm chưa đọc bằng index `IX_Notifications_UserId_Unread`.
3. Đánh dấu một: tìm theo `Id` **và** `UserId`; không có → 404; đã đọc thì giữ nguyên (idempotent); chưa đọc thì `IsRead = true`, `ReadAt = DateTimeOffset.UtcNow`.
4. Đánh dấu tất cả: `ExecuteUpdateAsync` trên các dòng chưa đọc của user.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-IMG-02 | Tạo chỉ định thì báo kỹ thuật viên đang hoạt động | Đã có: `ImagingRequestRepository.cs:70-123` |
| Mục 1 tài liệu tổng | Chỉ thấy dữ liệu của mình; của người khác trả 404 | Đề xuất: lọc `UserId` ở mọi truy vấn |
| BR-C07 | Response bọc `ApiResponse<T>` | Đề xuất |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Notifications.IsRead` | `false` | `true` | Đề xuất API 3, 4; ghi `ReadAt` |
| `Notifications` (ghi mới) | | | Hiện chỉ do F-IMG-01 |

## 7. Liên quan

- Trước đó: F-IMG-01 (nguồn thông báo duy nhất hiện tại).
- Sau đó: FE chuông thông báo ở `Header.jsx` (đang dùng dữ liệu giả `mockNotifications`); có thể mở rộng nguồn: F-CRM-01 nhắc tái khám, xác nhận lịch, hoàn thành chụp (báo bác sĩ).

## 8. Kiểm thử

- Test hiện có: Chưa có (chỉ `CreateAsync_ShouldSavePendingRequest_AndNotifyActiveTechnicians` kiểm danh sách người nhận và nội dung message ở mức service).
- Ca cần test: chỉ trả thông báo của mình; phân trang; đếm chưa đọc; đánh dấu thông báo người khác → 404; đánh dấu lại không lỗi; read-all.

## 9. Còn thiếu / câu hỏi mở

- Chưa có API đọc; FE đang dùng dữ liệu giả.
- Tên trường phân trang FE (`page`, `totalItems`) khác `PagedResult<T>` (`PageNumber`, `TotalCount`).
- Thông báo chỉ sinh khi tạo chỉ định phim. Hủy chỉ định (F-IMG-03) không gửi thông báo, thông báo cũ vẫn trỏ tới chỉ định đã hủy; hoàn thành chụp (F-IMG-04) không báo bác sĩ.
- Không có đẩy thời gian thực (SignalR, polling): chưa chốt.
- Thời gian lưu và dọn thông báo cũ: chưa chốt.
- Hằng `NotificationType`/`Channel`/`DeliveryStatus` đang nằm trong `ImagingRequestConstants`; khi có nhiều nguồn nên chuyển sang `NotificationConstants` riêng.

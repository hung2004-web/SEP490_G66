# F-ADM-03 Quản lý phòng

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `ClinicManager` |
| API | `GET api/rooms`, `GET api/rooms/{id}`, `POST api/rooms`, `PUT api/rooms/{id}`, `DELETE api/rooms/{id}` |
| Code chính | `RoomsController` → `RoomService` → `RoomRepository` |

## 1. Chức năng này làm gì

Quản lý phòng khám khai báo các phòng (phòng điều trị tổng quát, phòng tiểu phẫu, phòng X-quang), đổi tên, loại, tầng, mô tả và trạng thái hoạt động. Phòng là nơi xếp ca làm việc (F-ADM-05) và hàng chờ. Phòng đã có lịch sử thì chỉ ngừng hoạt động, không xóa.

## 2. Tiền điều kiện

- Đăng nhập, role `ClinicManager` (`RoomsController.cs:11`).
- Sửa / xóa: phòng `id` tồn tại.

## 3. API

Mọi endpoint quyền `ClinicManager`, `id` là `int` (route constraint `{id:int}`).

> Controller **không** gắn `[ApiResponseValidationFilter]`: lỗi DataAnnotations trả 400 dạng `ValidationProblemDetails` mặc định của `[ApiController]` (không phải `ApiResponse`).

### 3.1 `GET api/rooms` – danh sách

Query (`RoomQueryRequest`), giá trị rỗng bị bỏ qua:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `Keyword` | string? | Không | Trim | `RoomName` chứa chuỗi |
| `RoomType` | string? | Không | So bằng | Lọc loại phòng |
| `Status` | string? | Không | So bằng | Lọc trạng thái |

Response `ApiResponse<List<RoomResponse>>`, HTTP 200, sắp theo `RoomName`.

### 3.2 `GET api/rooms/{id}` – chi tiết

Response `ApiResponse<RoomResponse>`, HTTP 200.

### 3.3 `POST api/rooms` – tạo phòng

Body `CreateRoomRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `roomName` | string | Có | `[Required]` "Room name is required"; `[MaxLength(100)]` "Room name must not exceed 100 characters"; không trùng (DB so không phân biệt hoa thường, index `IX_Rooms_RoomName`) | Tên phòng |
| `roomType` | string | Có | `[Required]` "Room type is required"; `[AllowedValues]` `GeneralTreatment`, `MinorSurgery`, `XRay` → `RoomMessage.InvalidRoomType` | Loại phòng |
| `floor` | string? | Không | `[MaxLength(20)]` "Floor must not exceed 20 characters"; rỗng lưu `null` | Tầng |
| `description` | string? | Không | `[MaxLength(500)]` "Description must not exceed 500 characters"; rỗng lưu `null` | Mô tả |

Phòng mới luôn `status = "Active"`.

```json
{ "roomName": "Phòng 101", "roomType": "GeneralTreatment", "floor": "1", "description": "Ghế số 1" }
```

Response `ApiResponse<RoomResponse>`, HTTP 200, `message = "Room created successfully."`.

### 3.4 `PUT api/rooms/{id}` – sửa phòng

Body `UpdateRoomRequest` = các trường của `CreateRoomRequest` cộng:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `status` | string | Có | `[Required]` "Room status is required"; `[AllowedValues]` `Active`, `Maintenance`, `Inactive` → `RoomMessage.InvalidStatus` | Trạng thái |

Gửi đủ mọi trường (ghi đè). Response `ApiResponse<RoomResponse>`, HTTP 200, `message = "Room updated successfully."`.

### 3.5 `DELETE api/rooms/{id}` – xóa phòng

Response `ApiResponse` (không `data`), HTTP 200, `message = "Room deleted successfully."`.

### `RoomResponse`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | int | Id phòng |
| `roomName` | string | Tên |
| `roomType` | string | `GeneralTreatment` / `MinorSurgery` / `XRay` |
| `status` | string | `Active` / `Maintenance` / `Inactive` |
| `floor` | string? | Tầng |
| `description` | string? | Mô tả |
| `createdAt` | DateTimeOffset? | Lúc tạo |
| `updatedAt` | DateTimeOffset? | Lần sửa cuối |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Validation DTO | Chuỗi viết trong DTO (xem bảng trên) hoặc `RoomMessage.InvalidRoomType` "Room type must be GeneralTreatment, MinorSurgery or XRay.", `RoomMessage.InvalidStatus` "Room status must be Active, Maintenance or Inactive." – dạng `ValidationProblemDetails` |
| 400 | Loại / trạng thái sai (kiểm tra lại ở service) | `RoomMessage.InvalidRoomType`, `RoomMessage.InvalidStatus` |
| 400 | Tên trùng (kể cả hai request cùng lúc, bắt lỗi unique index) | `RoomMessage.RoomNameExist` "A room with this name already exists." |
| 400 | Đổi loại hoặc đưa phòng `Active` sang `Maintenance`/`Inactive` khi còn ca sắp tới | `RoomMessage.HasUpcomingShifts` "This room still has upcoming shifts. Move them to another room before changing its type or taking it out of service." |
| 400 | Xóa phòng đã có ca hoặc hàng chờ | `RoomMessage.RoomInUse` "This room has schedule or queue history and cannot be deleted. Set its status to Inactive instead." |
| 404 | Không có phòng | `RoomMessage.RoomNotFound` "Room not found." |

## 4. Luồng xử lý trong code

**Danh sách / chi tiết**
1. `RoomsController.GetRoomsAsync` – `RoomsController.cs:23`; `GetRoomByIdAsync` – `:30`.
2. `RoomService.GetRoomsAsync` → `RoomRepository.GetAllAsync` (lọc, sắp `RoomName`) → AutoMapper – `RoomService.cs:23-27`, `RoomRepository.cs:21-42`.
3. `GetExistingRoomAsync`: `FindAsync`, null → 404 – `RoomService.cs:102-107`, `RoomRepository.cs:52-55`.

**Tạo**
1. `RoomsController.CreateRoomAsync` – `RoomsController.cs:37`.
2. Trim tên; `EnsureValidRoomType` – `RoomService.cs:37-38`, `:109-112`.
3. `IsRoomNameInUseAsync` → `RoomNameExist` – `RoomService.cs:39`, `RoomRepository.cs:57-60`.
4. Tạo `Room` với `Status = Active`, `Floor`/`Description` trim về null – `RoomService.cs:41-49`.
5. `AddAsync` + `SaveChangesAsync`; lỗi unique `IX_Rooms_RoomName` đổi thành `RoomNameExist` – `RoomService.cs:51-52`, `RoomRepository.cs:80-98`.

**Sửa**
1. `GetExistingRoomAsync` – `RoomService.cs:59`.
2. Kiểm tra loại, trạng thái – `RoomService.cs:62-63`.
3. Tên đổi (so không phân biệt hoa thường) thì kiểm tra trùng, loại trừ chính phòng – `RoomService.cs:65-69`.
4. Nếu phòng đang `Active` chuyển sang trạng thái khác, hoặc đổi `RoomType`: `HasUpcomingShiftsAsync` → `HasUpcomingShifts` – `RoomService.cs:72-77`, `RoomRepository.cs:44-49`.
5. Gán các trường, `UpdatedAt` – `RoomService.cs:79-84`; lưu – `:86`.

**Xóa**
1. `GetExistingRoomAsync` – `RoomService.cs:93`.
2. `IsRoomInUseAsync` (có `StaffSchedules` hoặc `QueueEntries` dùng phòng) → `RoomInUse` – `RoomService.cs:96`, `RoomRepository.cs:63-68`.
3. Xóa cứng – `RoomService.cs:98-99`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-ADM-03 | Phòng còn ca sắp tới thì không đổi loại hoặc ngừng hoạt động | `RoomService.cs:72-77` |
| BR-ADM-03 | Phòng đã có lịch sử (ca, hàng chờ) thì không xóa, chỉ đặt `Inactive` | `RoomService.cs:96` |
| (code) | Tên phòng không trùng (không phân biệt hoa thường) | `RoomService.cs:39`, `:65-69`; unique index `IX_Rooms_RoomName` |
| (code) | Loại và trạng thái phải khớp check constraint `CK_Rooms_RoomType`, `CK_Rooms_Status` | `RoomConfiguration.cs:13-14` |

"Ca sắp tới" = `StaffSchedules.RoomId` = phòng và (`ScheduleDate > hôm nay` hoặc hôm nay, `ActualEndTime == null`, `ShiftEnd > giờ hiện tại`), giờ theo `ClinicClock`.

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Rooms` | (không có) | dòng mới, `Status = Active` | Tạo |
| `Rooms.Status` | `Active` | `Maintenance` / `Inactive` | Chỉ khi không còn ca sắp tới |
| `Rooms` | có | xóa cứng | Chỉ khi chưa có ca và hàng chờ |

## 7. Liên quan

- Sau đó: F-ADM-05 chỉ xếp ca vào phòng `Active`; hàng chờ (F-RCP-05) dùng `RoomId` của ca; F-ADM-04 dùng cùng tập loại phòng cho `RequiredRoomType` của dịch vụ.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: tên trùng khác hoa thường; đổi tên chỉ khác hoa thường của chính nó; `Active` → `Inactive` khi còn ca hôm nay chưa kết thúc / ca ngày mai; đổi loại khi còn ca; xóa phòng có ca cũ; xóa phòng chưa dùng.

## 9. Còn thiếu / câu hỏi mở

- `Maintenance` → `Inactive` không kiểm tra ca sắp tới (chỉ kiểm khi trạng thái **cũ** là `Active`). Ca đã xếp trước đó vào phòng đang bảo trì vẫn giữ nguyên.
- Lỗi validation trả `ValidationProblemDetails`, không phải `ApiResponse` (lệch BR-C07); nhiều message viết cứng trong DTO, không có trong `ErrorConstants` (lệch BR-C08).
- Tạo trả HTTP 200, không phải 201.
- Không ghi `AuditLog`.

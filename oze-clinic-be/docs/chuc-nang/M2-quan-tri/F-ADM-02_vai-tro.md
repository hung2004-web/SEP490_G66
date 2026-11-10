# F-ADM-02 Quản lý vai trò

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | ✅ Đã có API (chỉ xem, tạo, sửa mô tả) |
| Vai trò được dùng | `ClinicManager` |
| API | `GET api/roles`, `GET api/roles/{id}`, `POST api/roles`, `PUT api/roles/{id}` |
| Code chính | `RolesController` → `RoleService` → `RoleRepository`, `RoleManager<ApplicationRole>` |

## 1. Chức năng này làm gì

Quản lý phòng khám xem danh mục vai trò (kèm số người đang giữ vai trò), tạo vai trò mới và sửa mô tả. Tên vai trò không đổi được sau khi tạo để các `[Authorize(Roles = ...)]` hiện có vẫn đúng. Không có API xóa hay bật/tắt vai trò.

## 2. Tiền điều kiện

- Đăng nhập, role `ClinicManager` (`RolesController.cs:12`).
- Sửa: vai trò có `id` phải tồn tại.

## 3. API

Mọi endpoint quyền `ClinicManager`. POST/PUT có `[ApiResponseValidationFilter]` (lỗi validation trả 400 dạng `ApiResponse`).

### 3.1 `GET api/roles` – danh sách

Query (`RoleQueryRequest`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `Keyword` | string? | Không | Trim | Tìm trong `Name` hoặc `Description` |
| `IsActive` | bool? | Không | | Lọc theo `IsActive` |

Response `ApiResponse<List<RoleResponse>>`, HTTP 200, sắp theo `Name`.

### 3.2 `GET api/roles/{id}` – chi tiết

`id` là string (`AspNetRoles.Id`). Response `ApiResponse<RoleResponse>`, HTTP 200.

### 3.3 `POST api/roles` – tạo vai trò

Body `CreateRoleRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `name` | string | Có | `[Required]` → `NameRequired`; `[MaxLength(100)]`, regex `^[\p{L}\p{N} _-]+$` (chữ, số, khoảng trắng, `_`, `-`; **không có dấu phẩy**) → `NameInvalid`; không trùng (không phân biệt hoa thường) | Tên vai trò |
| `description` | string? | Không | `[MaxLength(500)]` → `DescriptionInvalid`; rỗng lưu `null` | Mô tả |

```json
{ "name": "Nurse", "description": "Phụ tá nha khoa" }
```

Response `ApiResponse<RoleResponse>`, HTTP 200, `message = "Create role success!"`, `userCount = 0`.

### 3.4 `PUT api/roles/{id}` – sửa mô tả

Body `UpdateRoleRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `description` | string? | Không | `[MaxLength(500)]` → `DescriptionInvalid`; rỗng lưu `null` | Mô tả mới (ghi đè) |

Response `ApiResponse<RoleResponse>`, HTTP 200, `message = "Update role success!"`.

### `RoleResponse`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | string | Id vai trò |
| `name` | string | Tên vai trò |
| `description` | string? | Mô tả |
| `isActive` | bool | Cờ hoạt động (API không đổi được) |
| `userCount` | int | Số dòng `AspNetUserRoles` của vai trò |
| `createdAt` | DateTimeOffset | Lúc tạo |
| `updatedAt` | DateTimeOffset? | Lần sửa cuối |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu tên | `RoleMessage.NameRequired` "Please enter role name." |
| 400 | Tên quá 100 ký tự hoặc có ký tự không cho phép | `RoleMessage.NameInvalid` "Role name is invalid. Please check again." |
| 400 | Mô tả quá 500 ký tự | `RoleMessage.DescriptionInvalid` "Description is invalid. Please check again." |
| 400 | Tên đã có | `RoleMessage.RoleExist` "Role already exists in the system." |
| 400 | Identity từ chối (không mô tả) | `RoleMessage.CreateFailed` "Create role failed" / `RoleMessage.UpdateFailed` "Update role failed" |
| 404 | Không có vai trò | `RoleMessage.RoleNotFound` "Role not found." |

## 4. Luồng xử lý trong code

**Danh sách / chi tiết**
1. `RolesController.GetRolesAsync` – `RolesController.cs:24`; `GetRoleAsync` – `:31`.
2. `RoleService.GetRolesAsync` – `RoleService.cs:22`; `GetRoleAsync` không thấy → 404 `RoleNotFound` – `:27-32`.
3. `RoleRepository.QueryRoles` chiếu sang `RoleResponse`, đếm `UserCount` bằng subquery – `RoleRepository.cs:42-54`; lọc `Keyword`, `IsActive`, sắp `Name` – `:17-34`.

**Tạo**
1. Filter validation – `ApiResponseValidationFilterAttribute.cs:16-55`; action – `RolesController.cs:39`.
2. Trim tên; `RoleManager.RoleExistsAsync` (so theo tên chuẩn hóa, không phân biệt hoa thường) → `RoleExist` – `RoleService.cs:36-38`.
3. Tạo `ApplicationRole` (`IsActive = true`, `CreatedAt`) – `RoleService.cs:40-45`; `CreateAsync` – `:47-49`.
4. Trả `ToResponse(role, 0)` – `RoleService.cs:51`; controller kèm `RoleCreated` – `RolesController.cs:42`.

**Sửa**
1. `RoleManager.FindByIdAsync`, không có → 404 – `RoleService.cs:56-57`.
2. Chỉ cập nhật `Description`, `UpdatedAt` – `RoleService.cs:59-60`; `UpdateAsync` – `:62-64`.
3. Đọc lại qua `GetRoleAsync` để có `UserCount` – `RoleService.cs:67`; controller kèm `RoleUpdated` – `RolesController.cs:50`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (code) | Tên vai trò không trùng, không phân biệt hoa thường | `RoleService.cs:38` |
| (code) | Tên không chứa dấu phẩy (vì `[Authorize(Roles = "a,b")]` tách bằng dấu phẩy) | `CreateRoleRequest.cs:8-11` |
| (code) | Tên không sửa được, chỉ sửa mô tả | `UpdateRoleRequest.cs:6`, `RoleService.cs:59` |

Dac_ta chưa có mã `BR-ADM` riêng cho vai trò.

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `AspNetRoles` | (không có) | dòng mới, `IsActive = true`, `CreatedAt` | Tạo |
| `AspNetRoles.Description`, `UpdatedAt` | cũ | mới | Sửa |

## 7. Liên quan

- Trước đó: các role hệ thống (`Patient`, `Doctor`, `Receptionist`, `DentalImagingTechnician`, `ClinicManager`) có sẵn (seed; chưa xác định vị trí seed trong phạm vi file này).
- Sau đó: F-ADM-01 gán role cho nhân viên; F-ADM-01 lọc danh sách theo role.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: tạo trùng tên khác hoa thường; tên có dấu phẩy; mô tả rỗng lưu `null`; sửa id không tồn tại → 404; `userCount` đúng.

## 9. Còn thiếu / câu hỏi mở

- Role tạo mới **không dùng được**: `UpdateStaffRequest.Role` chỉ nhận 4 role cố định (regex), và mọi `[Authorize]` dùng hằng `RoleConstants`. Cần chốt mục đích của API tạo role.
- Không có API xóa, bật/tắt `IsActive` vai trò; `IsActive` chỉ để đọc/lọc.
- Có thể sửa mô tả cả role hệ thống (không chặn).
- `RoleService.TestToResponse` (`RoleService.cs:83-95`) trùng `ToResponse` và không được dùng: mã thừa.
- Không phân trang.

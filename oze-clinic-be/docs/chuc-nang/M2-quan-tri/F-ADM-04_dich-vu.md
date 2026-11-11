# F-ADM-04 Quản lý dịch vụ

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | 🟡 Một phần: CRUD dịch vụ ✅; CRUD biến thể dịch vụ (`ServiceVariant`) cho quản lý ⬜ |
| Vai trò được dùng | Xem: mọi người (`[AllowAnonymous]`); tạo/sửa/bật tắt/xóa: `ClinicManager` |
| API | `GET api/services`, `GET api/services/active`, `GET api/services/{id}`, `GET api/services/by-code/{code}`, `POST api/services`, `PUT api/services/{id}`, `PATCH api/services/{id}/status`, `DELETE api/services/{id}` |
| Code chính | `ServicesController` → `ClinicServiceService` → `ServiceRepository` |

## 1. Chức năng này làm gì

Quản lý phòng khám khai báo danh mục dịch vụ nha khoa (mã, tên, giá tham khảo, thời lượng dự kiến, loại phòng cần dùng), bật/tắt và xóa dịch vụ chưa từng được dùng. Danh sách dịch vụ được công khai cho trang đặt lịch, dropdown và trang chủ.

## 2. Tiền điều kiện

- Endpoint GET: không cần đăng nhập.
- POST/PUT/PATCH/DELETE: đăng nhập, role `ClinicManager` (gắn từng action, `ServicesController.cs:86`, `:107`, `:130`, `:153`).
- Sửa/bật tắt/xóa: dịch vụ `id` tồn tại.

## 3. API

> Service trả `ApiResponse` có `success = false` thay vì ném exception; controller tự chọn 400/404. Controller **không** có `[ApiResponseValidationFilter]`: lỗi DataAnnotations trả 400 `ValidationProblemDetails` mặc định.

### 3.1 `GET api/services` – danh sách có phân trang

Query `ServiceQueryParameters` (kế thừa `PagedRequestBase`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `SearchKeyword` | string? | Không | Trim | `ServiceName` hoặc `ServiceCode` chứa chuỗi |
| `IsActive` | bool? | Không | | Lọc trạng thái |
| `RequiredRoomType` | string? | Không | Trim, so bằng | Lọc loại phòng |
| `MinPrice` / `MaxPrice` | decimal? | Không | | Khoảng `ReferencePrice` |
| `SortBy` | string? | Không | `name`, `code`, `price`, `createdat`; khác → theo `Id` | Cột sắp xếp |
| `SortDescending` | bool | Không | mặc định `false` | Giảm dần |
| `PageNumber` | int | Không | < 1 thành 1; mặc định 1 | Trang |
| `PageSize` | int | Không | < 1 thành 10, > 100 thành 100; mặc định 10 | Kích thước trang |

Response `ApiResponse<PagedResult<ServiceDto>>`, HTTP 200: `items`, `totalCount`, `pageNumber`, `pageSize`, `totalPages`, `hasPreviousPage`, `hasNextPage`.

### 3.2 `GET api/services/active` – dịch vụ đang hoạt động

Response `ApiResponse<IReadOnlyList<ServiceDto>>`, HTTP 200, sắp theo `ServiceName`. Kết quả cache trong `IMemoryCache` (key `ClinicServices_ActiveList`, hết hạn tuyệt đối 10 phút, trượt 2 phút); mọi thao tác ghi đều xóa cache.

### 3.3 `GET api/services/{id}` và `GET api/services/by-code/{code}`

Response `ApiResponse<ServiceDto>`, HTTP 200; không thấy → 404. `code` được trim và đổi in hoa trước khi tìm.

### 3.4 `POST api/services` – tạo dịch vụ

Body `CreateServiceRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `serviceCode` | string | Có | `[Required]` "ServiceCode is required"; `[MaxLength(20)]` "ServiceCode cannot exceed 20 characters"; trim + **in hoa**; không trùng | Mã dịch vụ |
| `serviceName` | string | Có | `[Required]` "ServiceName is required"; `[MaxLength(200)]` "ServiceName cannot exceed 200 characters"; trim | Tên |
| `description` | string? | Không | trim | Mô tả |
| `referencePrice` | decimal | Không (mặc định 0) | `[Range(0, ...)]` "ReferencePrice must be greater than or equal to 0"; service kiểm lại → `InvalidPrice` | Giá tham khảo (VNĐ) |
| `estimatedMinutes` | int? | Không | `[Range(1, ...)]` "EstimatedMinutes must be greater than 0"; service kiểm lại → `InvalidEstimatedMinutes` | Thời lượng dự kiến (phút) |
| `requiredRoomType` | string? | Không | `[MaxLength(20)]`; nếu có phải là `GeneralTreatment`/`MinorSurgery`/`XRay` (không phân biệt hoa thường, được chuẩn hóa về đúng chữ) → `InvalidRoomType` | Loại phòng cần |
| `isActive` | bool | Không (mặc định `true`) | | Trạng thái ban đầu |

```json
{
  "serviceCode": "trn01",
  "serviceName": "Trám răng composite",
  "referencePrice": 300000,
  "estimatedMinutes": 30,
  "requiredRoomType": "generaltreatment",
  "isActive": true
}
```

Response `ApiResponse<ServiceDto>`, **HTTP 201** (`CreatedAtAction` trỏ `GET api/services/{id}`), `message = "Service created successfully"`. Ví dụ trên lưu `serviceCode = "TRN01"`, `requiredRoomType = "GeneralTreatment"`.

### 3.5 `PUT api/services/{id}` – sửa dịch vụ

Body `UpdateServiceRequest`: giống `CreateServiceRequest`, khác ở `isActive` là `bool?` (bỏ trống thì giữ nguyên trạng thái). Response `ApiResponse<ServiceDto>`, HTTP 200, `message = "Service updated successfully"`.

### 3.6 `PATCH api/services/{id}/status` – bật/tắt

Body `ToggleServiceStatusRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `isActive` | bool | Không có `[Required]`; thiếu thì là `false` | | Trạng thái mới |

Response `ApiResponse<ServiceDto>`, HTTP 200, `message = "Service activated successfully"` hoặc `"Service deactivated successfully"` (kể cả khi trạng thái không đổi).

### 3.7 `DELETE api/services/{id}` – xóa

Response `ApiResponse<bool>` (`data = true`), HTTP 200, `message = "Service deleted successfully"`.

### `ServiceDto`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | int | Id |
| `serviceCode` | string | Mã (in hoa) |
| `serviceName` | string | Tên |
| `description` | string? | Mô tả |
| `referencePrice` | decimal | Giá tham khảo |
| `estimatedMinutes` | int? | Thời lượng |
| `requiredRoomType` | string? | Loại phòng |
| `isActive` | bool | Đang hoạt động |
| `createdAt` | DateTimeOffset | Lúc tạo |
| `updatedAt` | DateTimeOffset? | Lần sửa cuối |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Validation DTO | Chuỗi viết trong DTO (bảng trên), dạng `ValidationProblemDetails` |
| 400 | Loại phòng sai | `ServiceMessage.InvalidRoomType` "Required room type must be one of: GeneralTreatment, MinorSurgery, XRay" |
| 400 | Giá < 0 | `ServiceMessage.InvalidPrice` "Reference price must be greater than or equal to 0" |
| 400 | Thời lượng ≤ 0 | `ServiceMessage.InvalidEstimatedMinutes` "Estimated minutes must be greater than 0" |
| 400 | Mã trùng | `ServiceMessage.ServiceCodeExist` "Service code already exists in system" |
| 400 | Tắt dịch vụ còn trong lịch hẹn chưa xong từ hôm nay | `ServiceMessage.HasOpenAppointments` "This service is in appointments that are not finished yet; it cannot be turned off now" |
| 400 | Xóa dịch vụ đã dùng | `ServiceMessage.ServiceInUse` "Cannot delete service because it is currently linked to existing invoices or treatment plan stages. Please deactivate the service instead." |
| 404 | Không có dịch vụ | `ServiceMessage.ServiceNotFound` "Service not found in system" |
| 409 | Hai request tạo cùng mã cùng lúc (unique index `IX_Services_ServiceCode`) | "This record already exists" (chuỗi trong `GlobalExceptionMiddleware`) |

## 4. Luồng xử lý trong code

**Danh sách** – `ServicesController.cs:26` → `ClinicServiceService.GetServicesAsync` `ClinicServiceService.cs:34-40` → `ServiceRepository.GetAllAsync` lọc `:82-107`, đếm `:109-113`, sắp `:115-122`, phân trang `:124-129`.

**Đang hoạt động** – `ServicesController.cs:39` → `ClinicServiceService.cs:42-63`: đọc cache `:45-48`; không có thì `ServiceRepository.GetActiveServicesAsync` `ServiceRepository.cs:132-139`; ghi cache `:53-60`.

**Theo id / mã** – `ServicesController.cs:51-62`, `:69-80`; `ClinicServiceService.cs:65-77`, `:79-96`; `ServiceRepository.GetByCodeAsync` in hoa mã `ServiceRepository.cs:46-57`. `success = false` → controller trả 404.

**Tạo**
1. `ServicesController.CreateServiceAsync` – `ServicesController.cs:87`.
2. Chuẩn hóa loại phòng – `ClinicServiceService.cs:102-105`; giá – `:107-110`; thời lượng – `:112-115`.
3. Mã trim + in hoa, `ExistsByCodeAsync` – `ClinicServiceService.cs:117-122`, `ServiceRepository.cs:59-76`.
4. Map sang `Service`, gán lại mã, tên, mô tả, loại phòng, `CreatedAt` – `ClinicServiceService.cs:124-129`.
5. `AddAsync` + `SaveChangesAsync`, xóa cache – `ClinicServiceService.cs:131-134`.
6. Controller: lỗi → 400 (`ServicesController.cs:92-95`), thành công → 201 `CreatedAtAction` (`:97-100`).

**Sửa**
1. `GetByIdAsync` (tracking), không có → `ServiceNotFound` – `ClinicServiceService.cs:147-151`.
2. Kiểm loại phòng, giá, thời lượng – `ClinicServiceService.cs:153-166`; mã trùng (loại trừ chính nó) – `:168-173`.
3. Gán trường – `ClinicServiceService.cs:175-180`.
4. `newIsActive = request.IsActive ?? service.IsActive`; đang bật mà tắt và `HasOpenAppointmentsAsync` → `HasOpenAppointments` – `ClinicServiceService.cs:181-186`, `ServiceRepository.cs:39-44`.
5. Lưu, xóa cache – `ClinicServiceService.cs:187-193`.
6. Controller: message `ServiceNotFound` → 404, lỗi khác → 400 – `ServicesController.cs:114-121`.

**Bật/tắt**
1. Không có → `ServiceNotFound` – `ClinicServiceService.cs:206-210`.
2. Trạng thái giống hiện tại → trả thành công, không lưu – `ClinicServiceService.cs:212-217`.
3. Tắt khi còn lịch hẹn chưa xong → `HasOpenAppointments` – `ClinicServiceService.cs:220-223`.
4. Lưu, xóa cache – `ClinicServiceService.cs:225-231`. Controller chọn 404/400 – `ServicesController.cs:137-144`.

**Xóa**
1. Không có → `ServiceNotFound` – `ClinicServiceService.cs:244-248`.
2. `IsServiceInUseAsync` (có trong `InvoiceItems`, `TreatmentPlanStages` hoặc `AppointmentServiceItems`) → `ServiceInUse` – `ClinicServiceService.cs:250-255`, `ServiceRepository.cs:141-150`.
3. Xóa cứng, lưu, xóa cache – `ClinicServiceService.cs:257-260`. Controller chọn 404/400 – `ServicesController.cs:159-166`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-ADM-04 | Dịch vụ đang được dùng thì không xóa | `ClinicServiceService.cs:250-255` |
| BR-ADM-04 | Mã dịch vụ không trùng | `ClinicServiceService.cs:117-122`, `:168-173`; unique index `IX_Services_ServiceCode` |
| BR-ADM-04 | Giá ≥ 0, thời lượng > 0 | `ClinicServiceService.cs:107-115`, `:158-166`; DTO `[Range]`; check constraint `CK_Services_ReferencePrice` |
| BR-C09 | Bản ghi đang được dùng xóa mềm (ở đây: tắt `IsActive`) | `ServiceInUse` gợi ý tắt thay vì xóa |
| BR-C05 | Giá/thời lượng chốt lúc đặt lịch, đổi giá không ảnh hưởng lịch cũ | Không kiểm ở đây; thuộc F-APT |
| (code) | Không tắt dịch vụ còn trong lịch hẹn `PENDING`/`CONFIRMED`/`CHECKED_IN`/`IN_SERVICE` từ hôm nay | `ClinicServiceService.cs:182-186`, `:220-223` |
| (code) | `RequiredRoomType` thuộc `GeneralTreatment`/`MinorSurgery`/`XRay` | `RoomTypeConstants.TryNormalize`; `CK_Services_RequiredRoomType` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Services` | (không có) | dòng mới, mã in hoa | Tạo |
| `Services.IsActive` | `true` | `false` | Tắt (PUT hoặc PATCH), không còn lịch mở |
| `Services` | có | xóa cứng | Chỉ khi chưa từng dùng |
| Cache `ClinicServices_ActiveList` | có | bị xóa | Mọi lần ghi |

## 7. Liên quan

- Trước đó: F-ADM-03 (tập loại phòng).
- Sau đó: F-APT-01 (dịch vụ đặt được, kèm biến thể), F-EXM-03 (dịch vụ trên phiếu khám), F-TP-01 (giai đoạn gắn dịch vụ đang hoạt động), F-PAY-01 (hóa đơn), F-ADM-08 (trang chủ).

## 8. Kiểm thử

- Test hiện có:
  - `Services/ClinicServices/*Tests`: `GetServicesAsync_ShouldReturnPagedServices`, `GetActiveServicesAsync_ShouldCacheResults`, `GetServiceByIdAsync_ShouldReturnService_WhenExists`, `GetServiceByIdAsync_ShouldReturnFailure_WhenNotFound`, `GetServiceByCodeAsync_ShouldReturnService_WhenExists`, `GetServiceByCodeAsync_ShouldReturnFailure_WhenCodeIsInvalid`, `CreateServiceAsync_ShouldCreateServiceAndInvalidateCache_WhenValid`, `CreateServiceAsync_ShouldFail_WhenCodeAlreadyExists`, `CreateServiceAsync_ShouldFail_WhenInvalidRoomType`, `CreateServiceAsync_ShouldFail_WhenPriceNegative`, `CreateServiceAsync_ShouldFail_WhenEstimatedMinutesNonPositive`, `UpdateServiceAsync_ShouldUpdateServiceAndInvalidateCache_WhenValid`, `UpdateServiceAsync_ShouldFail_WhenNotFound`, `ToggleServiceStatusAsync_ShouldToggleStatusAndInvalidateCache`, `ToggleServiceStatusAsync_ShouldShortCircuit_WhenStatusUnchanged`, `DeleteServiceAsync_ShouldDeleteAndInvalidateCache_WhenNotInUse`, `DeleteServiceAsync_ShouldFail_WhenServiceInUse`.
  - `ServicesControllerTests`: `GetServicesAsync_ShouldReturnOk_WhenServicesExist`, `CreateServiceAsync_ShouldReturnCreatedAtAction_WhenValidRequest`, `ToggleStatusAsync_ShouldReturnOk_WhenServiceExists`, `DeleteServiceAsync_ShouldReturnOk_WhenServiceDeletedSuccessfully`, `UpdateServiceAsync_ShouldReturnOk_WhenServiceUpdatedSuccessfully`.
- Ca cần test thêm: tắt dịch vụ còn lịch mở (PUT với `isActive = false` và PATCH) → `HasOpenAppointments`; PUT bỏ trống `isActive` giữ trạng thái; mã trùng khi sửa; controller trả 404 cho `ServiceNotFound` ở PUT/PATCH/DELETE; xóa dịch vụ chỉ có trong `AppointmentServiceItems`.

## 9. Còn thiếu / câu hỏi mở

- **Lệch Dac_ta**: F-ADM-04 ghi "Dịch vụ và nhóm dịch vụ" và BR-APT-02 nói về nhóm có `AllowMultipleSelection`. Trong code, bảng nhóm (`ServiceCategory`) đã bị thay bằng **biến thể dịch vụ** `ServiceVariant` (migration `20261030111932_ReplaceServiceCategoryWithServiceVariant`); không còn `AllowMultipleSelection` ngoài migration cũ. Cần sửa Dac_ta.
- CRUD `ServiceVariant` cho quản lý chưa có API (khớp ghi chú ⬜ trong Dac_ta). `ServiceDto` không trả danh sách biến thể.
- Message `ServiceInUse` chỉ nhắc hóa đơn và kế hoạch điều trị, nhưng code còn chặn khi dịch vụ có trong lịch hẹn (`AppointmentServiceItems`).
- Message thành công ("Service created successfully"...) và message validation viết cứng, không nằm trong `ErrorConstants` (BR-C08). Lỗi validation trả `ValidationProblemDetails`, không phải `ApiResponse` (BR-C07).
- `GET api/services` không mặc định lọc `IsActive`: khách không đăng nhập xem được cả dịch vụ đã tắt.
- PATCH `status` không bắt buộc `isActive`; gửi body rỗng `{}` sẽ tắt dịch vụ.
- Không ghi `AuditLog` khi đổi giá/tắt dịch vụ.
- `description` không giới hạn độ dài ở DTO; giới hạn ở DB chưa xác định từ code đã đọc.

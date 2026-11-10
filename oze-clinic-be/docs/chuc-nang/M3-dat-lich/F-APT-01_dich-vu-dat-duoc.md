# F-APT-01 Danh sách dịch vụ đặt được

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi người (`[AllowAnonymous]`) |
| API | `GET api/appointments/bookable-services` |
| Code chính | `AppointmentsController.GetBookableServicesAsync` → `AppointmentService.GetBookableServicesAsync` → `AppointmentRepository.GetBookableServicesAsync`, `AppointmentRepository.GetConfigValueAsync` |

## 1. Chức năng này làm gì

Trả về danh mục dịch vụ đang mở để khách hoặc bệnh nhân chọn trên màn hình đặt lịch. Mỗi dịch vụ kèm các biến thể (variant) đang hoạt động. Dịch vụ "khám tổng quát" được đánh dấu `isMandatory = true` để FE hiển thị tích sẵn và khóa lại (BR-APT-01).

## 2. Tiền điều kiện

- Không cần đăng nhập.
- Bảng `SystemConfigurations` phải có dòng `Booking.GeneralExamServiceCode` (không có trong migration, phải seed tay, xem `docs/Du_lieu_mau.sql` dòng 9-11, giá trị mẫu `KHAM-TQ`). Thiếu dòng này thì API trả 400.

## 3. API

**Request** `GET api/appointments/bookable-services`, quyền `[AllowAnonymous]`

Không có tham số.

**Response thành công** (`ApiResponse<List<BookableServiceResponse>>`, HTTP 200, `message = "Success"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `serviceId` | int | Id dịch vụ |
| `serviceName` | string | Tên dịch vụ |
| `description` | string? | Mô tả |
| `referencePrice` | decimal | Giá tham khảo của dịch vụ |
| `estimatedMinutes` | int? | Thời lượng ước tính (phút). `null` thì khi đặt tính bằng 1 slot (`Clinic.SlotDurationMinutes`) |
| `isMandatory` | bool | `true` khi `ServiceCode` = giá trị `Booking.GeneralExamServiceCode` |
| `variants` | `List<BookableVariantResponse>` | Biến thể đang hoạt động, theo `DisplayOrder` |
| `variants[].variantId` | int | Id biến thể |
| `variants[].variantName` | string | Tên biến thể |
| `variants[].description` | string? | Mô tả |
| `variants[].referencePrice` | decimal | Giá riêng của biến thể (không lấy giá dịch vụ) |
| `variants[].estimatedMinutes` | int? | Thời lượng biến thể |

Ví dụ:

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "serviceId": 1, "serviceName": "Nha khoa tổng quát", "description": "...",
      "referencePrice": 100000, "estimatedMinutes": 30, "isMandatory": true,
      "variants": [
        { "variantId": 1, "variantName": "Nhổ răng thường", "description": null, "referencePrice": 300000, "estimatedMinutes": 30 }
      ]
    }
  ]
}
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu hoặc rỗng cấu hình `Booking.GeneralExamServiceCode` | `AppointmentMessage.ConfigMissing` = "System configuration {0} is missing" ({0} = `Booking.GeneralExamServiceCode`) |

## 4. Luồng xử lý trong code

1. Controller nhận request, không kiểm tra quyền (`AppointmentsController.cs:28-35`).
2. Đọc mã dịch vụ khám tổng quát từ `SystemConfigurations` qua `GetStringConfigAsync(ConfigKeyConstants.GeneralExamServiceCode)` (`AppointmentService.cs:48`, hàm đọc ở `AppointmentService.cs:321-327`, truy vấn `AppointmentRepository.cs:97-104`). Giá trị rỗng thì ném `ConfigMissing`.
3. Lấy dịch vụ `IsActive = true`, include các biến thể `IsActive = true` sắp theo `DisplayOrder`, dịch vụ sắp theo `ServiceName` (`AppointmentRepository.cs:212-220`).
4. Map sang `BookableServiceResponse`; `IsMandatory = s.ServiceCode == examServiceCode` (`AppointmentService.cs:51-69`).
5. Trả `ApiResponse.SuccessResult` (`AppointmentsController.cs:34`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-APT-01 | Khám tổng quát luôn có trong lịch: API chỉ đánh dấu `isMandatory`, việc tự thêm nằm ở F-APT-02/03/04 | `AppointmentService.cs:59` |
| BR-APT-02 | Giá nằm ở dịch vụ và biến thể (biến thể có giá riêng) | `BookableVariantResponse.ReferencePrice` |
| BR-C12 | Mã dịch vụ khám tổng quát đọc từ `SystemConfigurations` | `AppointmentService.cs:48` |

## 6. Trạng thái và dữ liệu thay đổi

Chỉ đọc, không đổi dữ liệu.

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Services`, `ServiceVariants`, `SystemConfigurations` | - | - | Chỉ đọc (`AsNoTracking`) |

## 7. Liên quan

- Trước đó: quản lý cấu hình dịch vụ, biến thể (M2 quản trị dịch vụ).
- Sau đó: F-APT-02 (xem slot trống), F-APT-03, F-APT-04 dùng `serviceId`, `variantId` chọn ở đây.

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `GetBookableServicesAsync`.
- Ca cần test thêm:
  - Có cấu hình: dịch vụ khám tổng quát có `isMandatory = true`, các dịch vụ khác `false`.
  - Dịch vụ `IsActive = false` không xuất hiện; biến thể tắt không xuất hiện; biến thể sắp đúng `DisplayOrder`.
  - Thiếu `Booking.GeneralExamServiceCode` → 400 `ConfigMissing`.

## 9. Còn thiếu / câu hỏi mở

- **Lệch BR-APT-02**: tài liệu tổng nói "Nhóm dịch vụ có `AllowMultipleSelection`... nhóm không có giá". Code hiện tại không còn nhóm dịch vụ (migration `ReplaceServiceCategoryWithServiceVariant`), thay bằng **dịch vụ + biến thể**, mỗi biến thể có giá riêng. Không có quy tắc "chọn một / chọn nhiều". Cần cập nhật tài liệu tổng.
- **Lệch BR-APT-01 "giá 0"**: API trả `referencePrice` thật của dịch vụ khám tổng quát; khi đặt lịch `PriceAtBooking` cũng lấy giá này (xem F-APT-03/04). Code không ép giá 0.
- `Booking.GeneralExamServiceCode` không có trong `HasData` của `SystemConfigurationConfiguration.cs:30-39`, chỉ có trong `docs/Du_lieu_mau.sql`. Môi trường mới quên seed thì cả màn hình đặt lịch lỗi.
- Nếu dịch vụ khám tổng quát bị tắt, API vẫn chạy nhưng không có dòng nào `isMandatory = true`, còn đặt lịch sẽ lỗi `GeneralExamServiceMissing`.

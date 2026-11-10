# F-ADM-08 Dữ liệu trang chủ

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã F-ADM-08 **chưa có trong Dac_ta**, đặt tạm để ghi tài liệu cho `HomeController`.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị (đặt tạm; thực chất là trang công khai, đọc dữ liệu do quản trị khai báo) |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi người, không cần đăng nhập (`[AllowAnonymous]`) |
| API | `GET api/home` |
| Code chính | `HomeController.GetHomeAsync` → `HomeService.GetHomePageAsync` → `HomeRepository.GetActiveServiceAsync`, `GetActiveDoctorAsync` |

## 1. Chức năng này làm gì

Trả dữ liệu cho trang chủ công khai: danh sách dịch vụ đang hoạt động (tên, mô tả, giá tham khảo, thời lượng) và danh sách bác sĩ đang hoạt động (tên, chuyên khoa). Chỉ đọc, không thay đổi dữ liệu.

## 2. Tiền điều kiện

- Không có. Endpoint cho phép ẩn danh (`HomeController.cs:12`).

## 3. API

**Request** `GET api/home`, quyền: ẩn danh. Không có tham số.

**Response thành công** `ApiResponse<HomePageResponse>`, HTTP 200, `message = "Success"`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `doctors` | `HomeDoctorResponse[]` | Bác sĩ đang hoạt động, sắp theo `fullName` |
| `doctors[].id` | int | `StaffProfile.Id` (không phải `userId`) |
| `doctors[].fullName` | string | Họ tên |
| `doctors[].specialization` | string? | Chuyên khoa |
| `services` | `HomeServiceResponse[]` | Dịch vụ `IsActive = true`, sắp theo `serviceName` |
| `services[].id` | int | Id dịch vụ |
| `services[].serviceName` | string | Tên |
| `services[].description` | string? | Mô tả |
| `services[].referencePrice` | decimal | Giá tham khảo |
| `services[].estimatedMinutes` | int? | Thời lượng dự kiến |

Ví dụ:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "doctors": [ { "id": 3, "fullName": "Nguyễn Văn A", "specialization": "Nha chu" } ],
    "services": [ { "id": 5, "serviceName": "Trám răng composite", "description": null, "referencePrice": 300000, "estimatedMinutes": 30 } ]
  }
}
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 500 | Lỗi DB/không mong đợi | "An internal server error occurred." (`GlobalExceptionMiddleware`, không thuộc `ErrorConstants`) |

## 4. Luồng xử lý trong code

1. `HomeController.GetHomeAsync` gọi service – `HomeController.cs:21-26`.
2. `HomeService.GetHomePageAsync` lấy dịch vụ rồi bác sĩ (tuần tự) – `HomeService.cs:20-29`.
3. `HomeRepository.GetActiveServiceAsync`: `Services` có `IsActive`, sắp `ServiceName` – `HomeRepository.cs:26-29`.
4. `HomeRepository.GetActiveDoctorAsync`: `StaffProfiles` có `IsActive` và có role `Doctor` (subquery `UserRoles` + `Roles`), sắp `FullName` – `HomeRepository.cs:21-24`.
5. Map sang `HomeServiceResponse`, `HomeDoctorResponse` – `HomeService.cs:31-51`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (code) | Chỉ hiện dịch vụ đang hoạt động | `HomeRepository.cs:28` |
| (code) | Chỉ hiện bác sĩ đang hoạt động (nhân viên vô hiệu hóa ở F-ADM-01 tự biến mất) | `HomeRepository.cs:23` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| (không) | | | Chỉ đọc |

## 7. Liên quan

- Trước đó: F-ADM-01 (bác sĩ, chuyên khoa), F-ADM-04 (dịch vụ, giá, bật/tắt).
- Sau đó: khách bấm đặt lịch → F-APT-01 (dịch vụ đặt được), F-APT-03/04.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: dịch vụ tắt không hiện; bác sĩ vô hiệu hóa không hiện; nhân viên không phải Doctor không hiện; danh sách rỗng trả mảng rỗng.

## 9. Còn thiếu / câu hỏi mở

- Mã F-ADM-08 chưa có trong Dac_ta; cần thêm vào bảng chức năng (có thể hợp lý hơn nếu xếp vào M3 Đặt lịch hoặc một module "Trang công khai").
- Không cache, không phân trang; mỗi lần mở trang chủ chạy hai truy vấn. `GET api/services/active` (F-ADM-04) có cache 10 phút cho cùng loại dữ liệu.
- Danh sách dịch vụ không gồm biến thể (`ServiceVariant`) và không đánh dấu dịch vụ "Khám tổng quát" bắt buộc như F-APT-01.
- `HomeController` có `using` thừa (`Microsoft.OpenApi.Models`, `OZE.Application.Services`), không ảnh hưởng nghiệp vụ.

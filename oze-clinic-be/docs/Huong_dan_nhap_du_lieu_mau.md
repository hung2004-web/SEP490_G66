# Hướng dẫn nhập dữ liệu mẫu để chạy thử đặt lịch

Mục đích: có đủ dữ liệu để gọi thử `bookable-services`, `available-slots`, đặt lịch, xác nhận, hủy, đổi lịch.

> **Quan trọng:** giá, thời lượng, tên phòng trong file mẫu là **số mẫu để chạy thử**, không phải số liệu thật của OZE. Số thật phải hỏi phòng khám.

## 1. Đã nạp sẵn vào `OzeDatabase`

File [Du_lieu_mau.sql](Du_lieu_mau.sql) đã được chạy trên database local. Nội dung:

| Bảng | Dữ liệu |
|---|---|
| `SystemConfigurations` | `Booking.GeneralExamServiceCode` = `KHAM-TQ` |
| `Rooms` (4 phòng) | Phòng khám 1, Phòng khám 2 (`GeneralTreatment`), Phòng tiểu phẫu (`MinorSurgery`), Phòng X-quang (`XRay`) |
| `Services` (4 dịch vụ) | `KHAM-TQ` Nha khoa tổng quát (không gán loại phòng), `IMPLANT` và `NHO-RK` (`MinorSurgery`), `XQUANG` (`XRay`) |
| `ServiceVariants` (5 biến thể của `KHAM-TQ`) | Nhổ răng thường, Trám răng, Hàn răng, Lấy cao răng, Điều trị tủy răng |

Vì sao `KHAM-TQ` để trống loại phòng: khám tổng quát luôn có trong mọi lịch hẹn. Nếu nó bị gắn một loại phòng thì lịch có thêm tiểu phẫu hoặc chụp X-quang sẽ bị chặn vì cần hai loại phòng khác nhau.

## 2. Chạy lại file SQL (khi cần nạp vào database khác)

File chạy lặp lại được: dòng nào đã có thì bỏ qua, không tạo trùng. Từ thư mục gốc `oze-clinic-be`:

```bash
sqlcmd -S "(local)" -U sa -d OzeDatabase -C -f 65001 -i docs/Du_lieu_mau.sql
```

- `-f 65001` để đọc đúng tiếng Việt (UTF-8).
- Lệnh sẽ hỏi hoặc dùng biến môi trường `SQLCMDPASSWORD` cho mật khẩu `sa` (xem `appsettings.Development.json`). Đừng dán mật khẩu vào tài liệu hay commit.
- Kết quả cuối in ra số dòng mỗi bảng: 1, 4, 4, 5.
- Cửa sổ terminal Windows có thể hiện chữ tiếng Việt bị lỗi, nhưng dữ liệu trong database vẫn đúng. Kiểm tra bằng `SELECT UNICODE(...)` hoặc mở bằng SSMS.

## 3. Chưa có: bác sĩ và ca làm việc (làm tay)

Bác sĩ cần tài khoản đăng nhập (mật khẩu được băm bởi ASP.NET Identity), nên không nạp bằng SQL thuần. Không có ca làm của bác sĩ thì `available-slots` trả về rỗng, và không đặt lịch được.

Làm bằng API, đăng nhập bằng tài khoản quản lý mặc định (tạo bởi `DatabaseSeeder`), lấy token rồi:

**Bước 1. Tạo bác sĩ:** `POST api/staff` (vai trò `ClinicManager`)

Các trường: `fullName`, `email`, `phoneNumber`, `role` = `Doctor`, `specialization` (tùy chọn), `licenseNumber` (bắt buộc với bác sĩ). Ghi lại `userId` trong kết quả.

**Bước 2. Lấy Id phòng:** `GET api/rooms`, chọn phòng `GeneralTreatment`.

**Bước 3. Tạo ca làm:** `POST api/workshift` (vai trò `ClinicManager`)

Các trường: `staffUserId` (userId ở bước 1), `scheduleDate` (ngày từ hôm nay đến `Booking.MaxDaysAhead`), `shiftStart`, `shiftEnd`, `roomId`. Ví dụ ca 08:00 đến 12:00 ở Phòng khám 1.

Tạo ca cho vài ngày liền để có nhiều slot. Slot được sinh theo `Clinic.SlotDurationMinutes` (30 phút) và chỉ hiện khi cách hiện tại ít nhất `Booking.MinHoursAhead` giờ.

## 4. Chạy thử bằng Swagger

| # | Gọi | Mong đợi |
|---|---|---|
| 1 | `GET api/appointments/bookable-services` | 4 dịch vụ; `KHAM-TQ` có `isMandatory = true` và 5 biến thể |
| 2 | `GET api/appointments/available-slots?date=...` (không truyền dịch vụ) | Các slot của bác sĩ, thời lượng 30 phút (chỉ khám tổng quát) |
| 3 | Thêm `variantId` của "Điều trị tủy răng" | Slot dài hơn (30 + 60 phút) |
| 4 | Thêm `serviceId` của `IMPLANT` | Rỗng nếu bác sĩ chỉ có ca ở phòng khám, vì Implant cần `MinorSurgery` và khác loại phòng với khám tổng quát |
| 5 | `POST api/appointments/guest-booking` | Lịch `PENDING`, có SMS nếu cấu hình |
| 6 | `POST api/appointments/{id}/confirm` bằng lễ tân | Lịch `CONFIRMED`, có dòng trong `AuditLogs` |

Trường hợp 4 dùng để kiểm tra rule "một lịch một loại phòng": khám tổng quát cộng Implant bị chặn vì cần hai loại phòng khác nhau.

## 5. Dọn dữ liệu mẫu

Nếu muốn xóa dữ liệu mẫu đã nạp (chỉ khi chưa có lịch hẹn dùng chúng), xóa theo thứ tự: biến thể, dịch vụ, phòng, rồi cấu hình:

```sql
DELETE FROM ServiceVariants WHERE VariantCode IN ('NHO-RT','TRAM','HAN','CAO-RANG','TUY');
DELETE FROM Services WHERE ServiceCode IN ('KHAM-TQ','IMPLANT','NHO-RK','XQUANG');
DELETE FROM Rooms WHERE RoomName IN (N'Phòng khám 1', N'Phòng khám 2', N'Phòng tiểu phẫu', N'Phòng X-quang');
DELETE FROM SystemConfigurations WHERE ConfigKey = 'Booking.GeneralExamServiceCode';
```

Dịch vụ đã có lịch hẹn hoặc hóa đơn dùng tới thì không xóa được vì có khóa ngoại.

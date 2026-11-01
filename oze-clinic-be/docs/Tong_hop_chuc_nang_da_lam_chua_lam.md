# Tổng hợp chức năng OZE: đã làm và chưa làm

Cập nhật ngày 31/10/2026. Cột "Kiểm chứng" cho biết mức đã thử:

- **Chạy thật**: gọi API thật với database local.
- **Unit test**: có test tự động.
- **Chỉ build**: mới biên dịch qua, chưa chạy.

Luồng chính của phòng khám: đặt lịch, xác nhận, check-in, hàng chờ, khám bệnh, chụp X-quang, chẩn đoán, kế hoạch điều trị, kê đơn, thanh toán.

## 1. Đã làm

| Nhóm | Chức năng | Kiểm chứng |
|---|---|---|
| Tài khoản | Đăng ký (OTP), đăng nhập, làm mới token, đăng xuất, đổi mật khẩu, quên và đặt lại mật khẩu | Chạy thật: đăng ký, OTP, đăng nhập |
| Hồ sơ | Bệnh nhân tự xem và sửa hồ sơ (`api/me`, đổi số điện thoại qua OTP). Nhân viên tạo, xem, xóa mềm hồ sơ bệnh nhân, thêm hồ sơ y tế | Chạy thật: `api/me` |
| Quản trị | Nhân viên, vai trò, phòng (3 loại `GeneralTreatment`, `MinorSurgery`, `XRay`), dịch vụ, ca làm việc, lịch bác sĩ, trang chủ | Chạy thật: tạo nhân viên, phòng, ca làm |
| Dịch vụ | Dịch vụ có biến thể (`ServiceVariants`), giá và thời lượng chốt lúc đặt | Chạy thật |
| Đặt lịch | Danh sách dịch vụ đặt được, xem slot trống, khách vãng lai đặt, bệnh nhân đăng nhập đặt, quy tắc một loại phòng cho một lịch | Chạy thật |
| Lịch của tôi | `GET api/appointments/my` | Chạy thật |
| Xử lý lịch | Xác nhận, hủy, đổi lịch (nhân viên và bệnh nhân), kiểm tra hạn | Chạy thật |
| Check-in | Chỉ lịch đã xác nhận, đúng ngày hẹn, kèm mức ưu tiên và lý do | Chạy thật, unit test |
| Danh sách chờ | Theo bác sĩ, luật 3 nhóm (đúng giờ, đến trễ, vãng lai) và mức ưu tiên | Chạy thật, unit test |
| Mức ưu tiên | Đặt lúc check-in, đổi sau đó (`POST api/appointments/{id}/priority`) | Chạy thật, unit test |
| Audit | Ghi 6 sự kiện lịch hẹn: đặt, xác nhận, hủy, check-in, đổi lịch, đổi ưu tiên | Chạy thật |
| Khám bệnh (có sẵn từ trước) | Xem hồ sơ y tế, xem phiếu khám, tạo và xem chỉ định chụp phim, theo dõi giai đoạn của kế hoạch điều trị có sẵn | Chỉ build. Chưa dùng được trong luồng thật vì chưa có phiếu khám |
| Dữ liệu | Migration đã áp, dữ liệu mẫu (phòng, dịch vụ, biến thể), 265 unit test qua | Đã kiểm tra |

## 2. Chưa làm

| Nhóm | Chức năng | Ghi chú |
|---|---|---|
| **Khám bệnh (cốt lõi)** | **Bắt đầu khám** (tạo phiếu khám, lịch `IN_SERVICE`) | Việc kế tiếp, giai đoạn 1 |
| | **Hoàn tất khám** (lịch `COMPLETED`) | Giai đoạn 1 |
| | Ghi lý do khám, ghi chú lâm sàng, sơ đồ răng | Chưa có API ghi |
| | Chẩn đoán (kèm mã ICD-10, tùy chọn) | Chưa có API |
| | Chờ phim: bác sĩ khám người khác, người chụp xong lên đầu hàng | Giai đoạn 2, cần thêm trạng thái phiếu khám |
| | Tải kết quả X-quang lên, xem phim | Chưa có API |
| | Lập kế hoạch điều trị mới, bệnh nhân xác nhận, sửa có lưu phiên bản | Hiện chỉ theo dõi giai đoạn của kế hoạch có sẵn |
| | Kê đơn thuốc | Chưa có API |
| | Khóa hồ sơ, phụ lục sau khóa | Cột đã có, chưa có code |
| **Tiếp đón** | Tạo lịch khách vãng lai (`WALK_IN`) | Giá trị có sẵn, chưa có luồng |
| | Kết thúc ca tự động: `NO_SHOW` kèm lý do (cần cột `NoShowReason`) | Đã chốt thiết kế, chưa làm |
| | Lễ tân đặt hộ khách | Chưa có |
| | Hạn xác nhận và cảnh báo quá hạn | Chưa làm |
| **Tiền** | Hóa đơn, thanh toán, hoàn tiền | Có bảng, chưa có API, chờ quy tắc của phòng khám |
| **Quản trị** | Nhân viên tự sửa hồ sơ của mình | Đang chờ bạn chốt đề xuất |
| | API quản lý biến thể cho admin, API sửa cấu hình, duyệt đơn nghỉ phép | Chưa có |
| | Danh mục mã ICD-10 để chọn | Chưa có, tùy chọn |
| **Khác** | Nhắc tái khám, đối soát cuối ngày, thông báo trong hệ thống (`Notification`) | Chưa dùng |
| | Giao diện cho bác sĩ, lễ tân, kỹ thuật viên | Mới có mockup |

## 3. Việc tồn và rủi ro

- **Khóa bí mật trong repo public** (JWT, mật khẩu `sa`, SendGrid) cần xoay.
- **Múi giờ**: code dùng `DateTime.Now`, server UTC sẽ lệch 7 giờ. Ảnh hưởng việc check-in đúng ngày và giờ đến trễ. Cần đặt `TZ=Asia/Ho_Chi_Minh` khi deploy.
- **CI/CD** chạy cả trên nhánh `feat/**`, không chạy test, không chạy migration.
- **Dữ liệu thử còn trong database**: 1 bác sĩ mẫu, 1 tài khoản bệnh nhân thử (mật khẩu ở file tạm của phiên làm việc), các ca làm và dòng audit của lần chạy thử.
- Chưa có unit test cho đặt lịch bệnh nhân, `/my`, đổi lịch. Các phần này mới chỉ chạy thật.
- Tài liệu cũ còn lệch, ví dụ `Tong_quan_he_thong_OZE.md`.
- Ba cảnh báo `CS8602` trong `AppointmentService` (hàm hủy, xác nhận, check-in).
- Mới thử trên API thật với vai trò quản lý, chưa thử vai trò `Receptionist`.
- Có người vừa thêm migration `AddImagingRequestCancelReason` vào repo, đã được áp cùng đợt migration mức ưu tiên.
- Hồ sơ bệnh nhân khách vãng lai không có tài khoản, và các trường bảo hiểm, nhóm máu, liên hệ khẩn cấp hiện không còn nơi nào sửa được (hệ quả của việc gỡ `PUT api/patients/{id}`).

## 4. Các quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Hàng chờ | Không có trạng thái riêng; danh sách chờ tính từ các lịch `CHECKED_IN` của bác sĩ trong ngày |
| Thứ tự chờ | Mức ưu tiên giảm dần, rồi: đã đặt lịch đúng giờ (theo giờ hẹn), đã đặt lịch đến trễ (theo giờ check-in), khách vãng lai (theo giờ check-in) |
| Check-in | Chỉ lịch `CONFIRMED`, đúng ngày hẹn, đến sớm hay trễ đều được |
| Hết ca | Lịch chưa khám tự động thành `NO_SHOW` kèm lý do (chưa làm) |
| Loại phòng | `GeneralTreatment`, `MinorSurgery`, `XRay` |
| Phiếu khám | Giữ riêng khỏi lịch hẹn, tạo khi bác sĩ bấm bắt đầu khám |
| Mã ICD-10 | Không bắt buộc, chỉ ghi ở bước chẩn đoán |
| Audit | Làm cho lịch hẹn; thanh toán và hoàn tiền khi có API; đăng nhập, phân quyền, nhân viên đã bỏ khỏi phạm vi |

## 5. Thứ tự đề xuất tiếp theo

1. Giai đoạn 1 của khám bệnh: bắt đầu khám và hoàn tất khám.
2. Ghi nội dung khám (lý do, ghi chú, sơ đồ răng) và chẩn đoán.
3. Khách vãng lai và kết thúc ca tự động.
4. Chờ phim và tải kết quả X-quang.
5. Kế hoạch điều trị và kê đơn.
6. Hóa đơn và thanh toán.

# F-CRM-05 Yêu cầu tư vấn

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M9.

| Mục | Giá trị |
|---|---|
| Module | M9 Chăm sóc khách hàng |
| Trạng thái | ✅ Đã làm (11/11/2026) |
| Vai trò | Khách (không đăng nhập) gửi; `Receptionist` xử lý; `ClinicManager` xem |
| API | `POST api/consultation-requests` (AllowAnonymous), `GET api/consultation-requests`, `POST api/consultation-requests/{id}/handle` |
| Code chính | `ConsultationRequestsController` → `ConsultationService` → `ConsultationRepository`; bảng `ConsultationRequests` |
| Màn hình | Trang công khai "Liên hệ / Đăng ký tư vấn" (`ContactPage.jsx`, trước đây dữ liệu giả); Lễ tân → Bệnh nhân → **Yêu cầu tư vấn** (`ReceptionConsultations.jsx`) |

## Làm gì

Khách để lại họ tên, số điện thoại, email và nội dung cần tư vấn. Lễ tân thấy yêu cầu ở tab **Mới**, gọi lại, rồi:

- **Đặt lịch**: mở hộp thoại đặt lịch hộ (F-APT-09) với tên và số điện thoại điền sẵn; đặt xong yêu cầu chuyển thành **Đã đặt lịch**.
- **Ghi kết quả**: **Đã liên hệ** (khách đang cân nhắc) hoặc **Đã đóng** (không có nhu cầu hoặc không liên lạc được), kèm ghi chú.

## Quy tắc

- Số điện thoại phải hợp lệ (chuẩn hóa như đăng ký); email nếu có phải hợp lệ.
- Cùng một số điện thoại có yêu cầu **Mới** trong 10 phút gần nhất thì không nhận thêm, để tránh bấm gửi nhiều lần.
- Lễ tân chỉ đặt được các trạng thái Đã liên hệ, Đã đặt lịch, Đã đóng. Mỗi lần ghi lưu người xử lý, thời điểm và `AuditLog`.

## Test

`OZE.UnitTest/Services/Care/ConsultationRequestTests.cs` (tab `OZ-CRM-05`, 5 ca). Đặt lịch hộ: `Appointments/BookByReceptionistTests.cs` (tab `OZ-APPT-22`, 3 ca kiểm tra đầu vào).

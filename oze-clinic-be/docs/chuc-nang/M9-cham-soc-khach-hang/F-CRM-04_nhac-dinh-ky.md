# F-CRM-04 Nhắc tái khám định kỳ theo dịch vụ

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M9, BR-CRM-03.

| Mục | Giá trị |
|---|---|
| Module | M9 Chăm sóc khách hàng |
| Trạng thái | ✅ Đã làm (11/11/2026, theo góp ý hội đồng "chăm sóc khách hàng cơ bản, nhắc tái khám định kỳ") |
| Vai trò | `ClinicManager` đặt chu kỳ cho dịch vụ; hệ thống tự tạo lịch nhắc; `Receptionist` nhắc và gọi |
| Dữ liệu | Cột `Services.RecallIntervalMonths` (1–60, trống = không nhắc), `Examinations.FollowUpIsRecall` |
| Code chính | `AppointmentService.ApplyPeriodicRecall` (gọi trong `CompleteExaminationAsync`) |

## 1. Làm gì

Một số dịch vụ cần làm lại theo chu kỳ, ví dụ lấy cao răng 6 tháng/lần hoặc khám tổng quát 6 tháng/lần. Quản lý đặt chu kỳ cho dịch vụ. Khi bác sĩ hoàn tất lượt khám mà **không tự đặt ngày tái khám**, hệ thống tự đặt:

- ngày tái khám = hôm nay + chu kỳ **ngắn nhất** trong các dịch vụ đã làm;
- ghi chú "Nhắc định kỳ 6 tháng: <tên dịch vụ>";
- đánh dấu **Định kỳ** để lễ tân phân biệt với hẹn của bác sĩ.

Từ đó lượt nhắc đi chung quy trình F-CRM-01: job tự nhắc lúc 8 giờ hôm trước, lễ tân thấy ở tab "Sắp đến hạn", rồi "Quá hạn chưa đặt", gọi (F-CRM-02) và đặt lịch.

## 2. API

- `POST/PUT api/services` nhận thêm `recallIntervalMonths` (null hoặc 1–60), `ServiceDto` trả về trường này.
- Bác sĩ đặt ngày tái khám (`PUT api/examinations/{id}/follow-up`) thì thay ngày định kỳ và bỏ dấu định kỳ.

## 3. Còn mở

- Trang **Dịch vụ** của quản lý trên web vẫn dùng dữ liệu giả, nên hiện đặt chu kỳ qua API (Swagger) hoặc SQL. Dữ liệu mẫu đặt `KHAM-TQ` = 6 tháng.
- Chu kỳ đang đặt ở cấp dịch vụ, chưa đặt riêng được cho từng biến thể.

## 4. Test

`OZE.UnitTest/Services/Appointments/CompleteExaminationTests.cs` (tab `OZ-APPT-19`): tự đặt nhắc định kỳ theo chu kỳ ngắn nhất; giữ nguyên ngày bác sĩ đã đặt.

# F-PAY-08 Đối soát cuối ngày

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, BR-PAY-13. Liên quan: [F-PAY-06 Chốt ca](F-PAY-06_chot-ca.md).

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ✅ Đã làm (11/11/2026, theo góp ý hội đồng "đối soát cuối ngày, chốt ca") |
| Vai trò | `ClinicManager` |
| API | `GET api/reconciliations/daily?date=`, `POST api/reconciliations/daily/{date}/confirm` |
| Code chính | `ReconciliationsController` → `ReconciliationService` → `CareRepository`; bảng `DailyReconciliations` |
| Màn hình | Quản lý → Vận hành → **Đối soát cuối ngày** (`DailyReconciliation.jsx`) |

## 1. Làm gì

Cuối ngày, quản lý xem trên một trang:

- **Két tiền mặt trong ngày:** từng két của lễ tân (F-PAY-06) với tiền đầu ca, tiền mặt đã thu, đã chi, phải có, đếm được, chênh lệch, người nhận bàn giao. Két còn mở được đánh dấu.
- **Tiền mặt thu trong ngày** của cả phòng khám. Phần thu khi không ai mở két được tách riêng ("thu khi không mở két").
- **Chuyển khoản đã nhận** và danh sách **chuyển khoản còn chờ đối soát** với ngân hàng.
- **Hoàn tiền trong ngày:** số tiền trả lại = tiền yêu cầu − phần việc đã làm.

Bấm **Chốt đối soát ngày** để lưu bản số liệu cố định của ngày. Sau đó trang chỉ hiện "Đã chốt lúc … bởi …".

## 2. Quy tắc (BR-PAY-13)

- Không chốt được khi còn két của ngày đó chưa bàn giao (`ReconciliationOpenSessions`).
- Bắt buộc ghi chú khi có chênh lệch két, có tiền mặt thu ngoài két, hoặc còn chuyển khoản chờ (`ReconciliationNoteRequired`).
- Mỗi ngày chốt một lần (unique `ClinicDate`). Ngày trong tương lai không chốt được.
- Ngày tính theo giờ Việt Nam (BR-C01).

## 3. Test

`OZE.UnitTest/Services/Care/DailyReconciliationTests.cs` (tab `OZ-PAY-08`, 5 ca).

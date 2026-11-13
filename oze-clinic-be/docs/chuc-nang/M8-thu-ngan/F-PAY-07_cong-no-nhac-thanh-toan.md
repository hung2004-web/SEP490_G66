# F-PAY-07 Công nợ bệnh nhân và nhắc thanh toán

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, BR-PAY-08, BR-PAY-11, BR-PAY-12.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ✅ Đã làm (11/11/2026, theo góp ý hội đồng "công nợ bệnh nhân, nhắc thanh toán") |
| Vai trò | `Receptionist` xem và nhắc; `ClinicManager` xem |
| API | `GET api/debts`, `POST api/debts/{invoiceId}/remind`, `GET api/debts/{invoiceId}/reminders` |
| Code chính | `DebtsController` → `DebtService` → `CareRepository`; job `PaymentReminderBackgroundService`; bảng `PaymentReminders` |
| Màn hình | Lễ tân → Thu ngân → **Công nợ** (`ReceptionDebts.jsx`). Quản lý → Vận hành → **Công nợ** (cùng trang, không có nút thao tác) |

## 1. Làm gì

- **Danh sách công nợ:** mọi hóa đơn còn nợ (`UNPAID`, `PARTIALLY_PAID`, `PENDING_CONFIRMATION`), kèm số còn nợ, số ngày nợ, kỳ góp tới hoặc các kỳ quá hạn, số lần đã nhắc. Hóa đơn có kỳ quá hạn đứng đầu. Đầu trang có tổng còn nợ và số hóa đơn có kỳ quá hạn.
- **Nhắc thanh toán:** gửi SMS và email có số hóa đơn, số còn nợ và kỳ góp tới hạn hoặc quá hạn. Mỗi lần nhắc được lưu lại; bấm vào cột "Đã nhắc" để xem lịch sử.
- **Tự nhắc:** 8 giờ mỗi sáng (cấu hình `PaymentReminderSettings`: `Enabled`, `RunHour`, `DaysAhead`), nhắc kỳ đến hạn ngày mai và kỳ quá hạn (mỗi 7 ngày một lần).
- Nút **Thu tiền** mở thẳng hóa đơn trên màn Thu tiền.

## 2. Quy tắc

| Mã | Quy tắc |
|---|---|
| BR-PAY-08 | Trễ hạn chỉ nhắc, không phạt, không khóa điều trị |
| BR-PAY-11 | Chỉ nhắc hóa đơn còn nợ và bệnh nhân có số điện thoại hoặc email. Nhắc lại trong 4 giờ phải xác nhận (`force`). Không gửi được qua kênh nào thì không ghi là đã nhắc |
| BR-PAY-12 | Job: kỳ đến hạn ngày mai nhắc một lần; kỳ quá hạn tối đa 7 ngày một lần |

Lỗi (`ErrorConstants.CareMessage`): `InvoiceNotFound` (404), `NothingOwed`, `NoContact`, `RemindedRecently`, `SendFailed` (400).

## 3. Còn mở

- Trang "Công nợ" cũ của quản lý (`DebtManagement.jsx`, dữ liệu giả) không còn được dùng; route `/admin/debts` trỏ sang trang mới. Nhóm quyết định xóa hay giữ file đó.
- Chưa có mẫu tin nhắn tùy chỉnh.

## 4. Test

`OZE.UnitTest/Services/Care/DebtAndReminderTests.cs` (tab `OZ-PAY-07`, 6 ca).

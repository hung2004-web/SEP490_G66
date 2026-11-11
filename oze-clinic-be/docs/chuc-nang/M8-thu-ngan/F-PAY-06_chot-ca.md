# F-PAY-06 Chốt ca, báo cáo thu ngân theo ngày

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, câu hỏi Q6, Q15. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | 🟡 Một phần (có báo cáo ngày và báo cáo tổng quan; chưa có chốt ca) |
| Vai trò được dùng | `Receptionist` (báo cáo ngày), `ClinicManager` (báo cáo theo khoảng ngày) |
| API | `GET api/invoice-reports/daily`, `GET api/invoice-reports/overview` |
| Code chính | `InvoiceReportsController.GetDailyAsync` / `GetOverviewAsync` → `InvoiceReportService.GetDailyAsync` / `GetOverviewAsync` → `InvoiceReportRepository` |

## 1. Chức năng này làm gì

Cuối ngày, lễ tân xem số hóa đơn mới, tổng tiền đã thu xác nhận theo từng phương thức, công nợ đang mở và số kỳ trả góp đến hạn/quá hạn của **cả phòng khám trong một ngày**. Quản lý xem cùng các số đó cho một khoảng ngày. Chưa có bước chốt ca (nhập tiền mặt đếm được, lưu biên bản không sửa).

## 2. Tiền điều kiện

- `daily`: role `Receptionist` — `InvoiceReportsController.cs:24-25`.
- `overview`: role `ClinicManager` — `InvoiceReportsController.cs:37-38`.

## 3. API

**Request** `GET api/invoice-reports/daily?date=`, quyền `[Authorize(Roles = "Receptionist")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `date` | DateOnly? | Không | `yyyy-MM-dd`; bỏ trống → hôm nay theo `ClinicClock` | Ngày báo cáo (giờ VN) |

**Request** `GET api/invoice-reports/overview?from=&to=`, quyền `[Authorize(Roles = "ClinicManager")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `from` | DateOnly? | Không | Bỏ trống → hôm nay; `from ≤ to` | Ngày đầu (gồm) |
| `to` | DateOnly? | Không | Bỏ trống → hôm nay; `to − from ≤ 366` ngày | Ngày cuối (gồm) |

**Response thành công** (`ApiResponse<InvoiceReportResponse>`, HTTP 200, message `DailyRetrieved` = "Daily invoice report has been retrieved." / `OverviewRetrieved`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `fromDate`, `toDate` | DateOnly | Khoảng báo cáo |
| `asOfDate` | DateOnly | Mốc cho số kỳ góp: `daily` = `date`; `overview` = hôm nay |
| `newInvoiceCount` | int | Hóa đơn tạo trong khoảng, hiện không `CANCELLED` |
| `confirmedCollectionsTotal` | decimal | Σ `totalsByMethod[].amount` |
| `totalsByMethod[]` | `PaymentMethodTotal` | `paymentMethod`, `amount`, `paymentCount`; luôn có `CASH`, `BANK_TRANSFER`, `QR_TRANSFER` (0 nếu không có) |
| `openOutstandingInvoiceCount`, `openOutstandingAmount` | int, decimal | Hóa đơn `UNPAID`/`PENDING_CONFIRMATION`/`PARTIALLY_PAID` còn nợ, **tại thời điểm gọi** |
| `installmentDueCount` | int | Kỳ `Pending` có hạn đúng `asOfDate` |
| `installmentOverdueCount` | int | Kỳ `Overdue`, hoặc `Pending` có hạn < `asOfDate` |

Ví dụ:

```json
{
  "fromDate": "2026-11-11", "toDate": "2026-11-11", "asOfDate": "2026-11-11",
  "newInvoiceCount": 14,
  "confirmedCollectionsTotal": 23500000,
  "totalsByMethod": [
    { "paymentMethod": "CASH", "amount": 8500000, "paymentCount": 9 },
    { "paymentMethod": "BANK_TRANSFER", "amount": 15000000, "paymentCount": 3 },
    { "paymentMethod": "QR_TRANSFER", "amount": 0, "paymentCount": 0 }
  ],
  "openOutstandingInvoiceCount": 6, "openOutstandingAmount": 12750000,
  "installmentDueCount": 2, "installmentOverdueCount": 1
}
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants.ReportMessage`) |
|---|---|---|
| 400 | Ngày sai định dạng | ProblemDetails mặc định |
| 400 | (`overview`) `from > to` | `DateRangeInvalid`: "Report date range is invalid. 'From' must be on or before 'To'." |
| 400 | (`overview`) Khoảng > 366 ngày | `DateRangeTooLarge`: "Report date range cannot exceed 366 days." |

## 4. Luồng xử lý trong code

1. `daily`: `date ?? ClinicClock.Today`, `from = to = asOf = date` — `InvoiceReportService.cs:18-24`. `overview`: `from`, `to` mặc định hôm nay, kiểm `from ≤ to` và ≤ 366 ngày, `asOf = hôm nay` — `InvoiceReportService.cs:26-40`.
2. Đổi ngày sang khoảng `[00:00, 24:00)` với offset cố định `+07` để so với giờ UTC đã lưu — `InvoiceReportService.cs:48-49`, `:91-96`.
3. Đếm hóa đơn `CreatedAt` trong khoảng, `PaymentStatus != CANCELLED` — `InvoiceReportRepository.cs:25-37`.
4. Cộng khoản `CONFIRMED` có `PaidAt` trong khoảng, nhóm theo phương thức, bổ sung phương thức thiếu bằng 0 — `InvoiceReportRepository.cs:39-83`.
5. Công nợ: hóa đơn `UNPAID`/`PENDING_CONFIRMATION`/`PARTIALLY_PAID`, `max(0, FinalAmount − PaidAmount) > 0`, không lọc theo ngày — `InvoiceReportRepository.cs:85-102`.
6. Kỳ góp đến hạn / quá hạn so với `asOfDate`, bỏ hóa đơn `CANCELLED`, chỉ đọc (không ghi `Overdue`) — `InvoiceReportRepository.cs:104-124`.
7. Cộng tổng thu, dựng response — `InvoiceReportService.cs:68-85`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| Q6 | Mặc định tạm: chốt theo ca — tổng thu theo phương thức, số hóa đơn, hoàn tiền | **Một phần**: có tổng theo phương thức và số hóa đơn **theo ngày**; không theo ca, không có hoàn tiền, không có chốt |
| Q15 | Báo cáo ngày: lượt khám, `NO_SHOW`, doanh thu theo phương thức, công nợ | **Một phần**: có doanh thu theo phương thức và công nợ; không có lượt khám, `NO_SHOW` |
| BR-C01 | Ngày theo giờ VN | `InvoiceReportService.cs:22`, `:30`, `:91-96` |
| BR-PAY-04 | Chỉ tiền đã xác nhận mới là doanh thu | `InvoiceReportRepository.cs:47` (chỉ `CONFIRMED`) |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| — | — | — | Chỉ đọc |

## 7. Liên quan

- Trước đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md), [F-PAY-03](F-PAY-03_thu-tien.md), [F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md), [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md).
- Sau đó: báo cáo quản lý.

## 8. Kiểm thử

- Test hiện có: Chưa có (`OZE.UnitTest` không có test cho `InvoiceReportService`).
- Ca cần test: khoản tiền mặt lúc 23:30 và 00:30 giờ VN rơi đúng ngày; khoản `PENDING` không tính; phương thức không có khoản vẫn trả 0; hóa đơn hủy không đếm; `overview` `from > to` → 400, khoảng 367 ngày → 400; kỳ `Pending` hạn hôm nay → `installmentDueCount`; lễ tân gọi `overview` → 403.

## 9. Còn thiếu / câu hỏi mở

- **Chưa có chốt ca** (Q6): không có bảng, API hay bước nhập tiền mặt đếm thực tế, chênh lệch, biên bản không sửa. Thiết kế đề xuất trước đây (`GET api/cashier/shift-summary`, `POST api/cashier/shift-closings`, `GET api/reports/daily`) không được làm theo; code chỉ có hai báo cáo trên.
- Báo cáo theo **cả phòng khám**, không theo ca hay theo người thu (không lọc `ConfirmedByUserId`, `Payment` không có người tạo).
- **Không trừ tiền hoàn** và không có tổng hoàn trong ngày (review A21): `confirmedCollectionsTotal` chỉ cộng khoản `CONFIRMED` (`InvoiceReportRepository.cs:39-50`), bỏ qua `RefundAdjustmentRequest` `Processed`.
- **Số của ngày cũ thay đổi về sau**: void một khoản (thành `FAILED`) làm nó biến khỏi tổng của ngày đã thu; hủy hóa đơn làm nó biến khỏi `newInvoiceCount` của ngày lập. Không có số chốt bất biến để đối chiếu quỹ.
- Công nợ luôn là số hiện tại kể cả khi xem `daily` của ngày cũ; không gồm hóa đơn `PARTIALLY_REFUNDED` còn nợ.
- `installmentOverdueCount` vẫn đếm kỳ của hóa đơn đã trả đủ hoặc đã hoàn (chỉ bỏ `CANCELLED`, `InvoiceReportRepository.cs:109-111`).
- Không có số khoản CK/QR đang chờ xác nhận, số lượt khám, `NO_SHOW` (Q15).
- Lễ tân chỉ xem được một ngày; quản lý không gọi được `daily` (dùng `overview` với `from = to`, nhưng `asOfDate` luôn là hôm nay).
- Số tiền làm tròn 2 số lẻ (BR-C04).

# F-PAY-02 Xem hóa đơn, danh sách hóa đơn, công nợ

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Receptionist`, `ClinicManager` (mọi hóa đơn); `Patient` (của mình) |
| API | `GET api/invoices`, `GET api/invoices/{id}`, `GET api/invoices/my` |
| Code chính | `InvoicesController.GetPagedAsync` / `GetByIdAsync` / `GetMyInvoicesAsync` → `InvoiceService.GetPagedAsync` / `GetByIdAsync` / `GetMyInvoicesAsync` → `InvoiceRepository.GetPagedAsync` / `GetByIdWithDetailsAsync` |

## 1. Chức năng này làm gì

Lễ tân và quản lý tìm hóa đơn (lọc theo bệnh nhân, lịch hẹn, kế hoạch, trạng thái, từ khóa) và xem chi tiết một hóa đơn gồm dòng và các khoản thu. Danh sách công nợ là danh sách này lọc theo `paymentStatus` (`UNPAID`, `PENDING_CONFIRMATION`, `PARTIALLY_PAID`), mỗi dòng có `remainingAmount`. Bệnh nhân xem danh sách và chi tiết hóa đơn của chính mình.

## 2. Tiền điều kiện

- `GET api/invoices`: role `Receptionist` hoặc `ClinicManager` — `InvoicesController.cs:52-53`.
- `GET api/invoices/my`: role `Patient`, tài khoản có hồ sơ bệnh nhân chưa xóa mềm — `InvoicesController.cs:62-63`, `PatientRepository.cs:40-44`.
- `GET api/invoices/{id}`: một trong ba role trên; bệnh nhân chỉ xem hóa đơn của mình — `InvoicesController.cs:72-73`, `:34-37`.

## 3. API

**Request** `GET api/invoices`, quyền `[Authorize(Roles = "Receptionist,ClinicManager")]`. Query `InvoiceQueryParameters` (`InvoiceQueryParameters.cs:5-11`, `PagedRequestBase.cs:6-30`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `patientId` | int? | Không | | Lọc theo bệnh nhân |
| `appointmentId` | long? | Không | | Lọc theo lịch hẹn |
| `treatmentPlanId` | long? | Không | | Lọc theo kế hoạch |
| `paymentStatus` | string? | Không | Đổi sang chữ hoa, không kiểm giá trị hợp lệ | Lọc trạng thái (công nợ: gọi lần lượt `UNPAID`, `PENDING_CONFIRMATION`, `PARTIALLY_PAID`) |
| `searchKeyword` | string? | Không | | Tìm trong `InvoiceNumber`, `Notes`, tên bệnh nhân |
| `sortBy` | string? | Không | `invoicenumber`, `finalamount`, `paymentstatus`, `id`, `createdat`; khác → `CreatedAt` | Sắp xếp |
| `sortDescending` | bool | Không (false) | | Chiều sắp xếp (xem mục 9) |
| `pageNumber`, `pageSize` | int | Không (1, 10) | < 1 → mặc định; `pageSize` tối đa 100 | Phân trang |

**Request** `GET api/invoices/my`, quyền `[Authorize(Roles = "Patient")]`. Cùng query; `patientId` bị ghi đè bằng bệnh nhân của tài khoản.

**Request** `GET api/invoices/{id:long}`, quyền `[Authorize(Roles = "Receptionist,ClinicManager,Patient")]`. Không có body.

**Response thành công**
- Danh sách: `ApiResponse<PagedResult<InvoiceSummaryResponse>>`, HTTP 200. Mỗi dòng (`InvoiceResponse.cs:3-19`): `id`, `invoiceNumber`, `patientId`, `patientName`, `appointmentId`, `treatmentPlanId`, `totalAmount`, `discountAmount`, `finalAmount`, `paidAmount`, `remainingAmount = max(0, finalAmount − paidAmount)`, `paymentStatus`, `createdAt`, `cancelledAt`.
- Chi tiết: `ApiResponse<InvoiceResponse>`, HTTP 200 (`InvoiceResponse.cs:21-66`):

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| Các trường như danh sách | | |
| `notes`, `createdByUserId` | string? | |
| `items[]` | `InvoiceItemResponse` | Dòng, sắp theo `sortOrder` |
| `payments[]` | `InvoicePaymentSummaryResponse` | `id`, `amount`, `paymentMethod`, `paymentStatus`, `purpose`, `transactionReference`, `createdAt`, `paidAt`; mới nhất trước |

`paidAmount` là số đã thu ròng (khoản `CONFIRMED` trừ hoàn tiền đã duyệt), được tính lại mỗi lần thu/xác nhận/hủy khoản/hoàn tiền (`InvoiceMoneyHelper.cs:36-73`).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants.InvoiceMessage`) |
|---|---|---|
| 404 | (Chi tiết) Không có hóa đơn | `InvoiceNotFound`: "Invoice not found." |
| 403 | (Chi tiết) Bệnh nhân xem hóa đơn người khác, hoặc tài khoản không có hồ sơ bệnh nhân | `AccessDenied`: "You do not have access to this invoice." |
| 404 | (`my`) Tài khoản không có hồ sơ bệnh nhân | `PatientNotFound`: "Patient not found." |

## 4. Luồng xử lý trong code

**Danh sách**
1. Controller — `InvoicesController.cs:52-60` (`my`: `:62-70`).
2. (`my`) Tìm bệnh nhân theo `UserId` (404), gán `parameters.PatientId` — `InvoiceService.cs:140-150`.
3. Truy vấn AsNoTracking kèm `Patient`, áp các bộ lọc — `InvoiceRepository.cs:52-88`.
4. Đếm; 0 → trả trang rỗng — `InvoiceRepository.cs:90-94`.
5. Sắp xếp; mặc định `CreatedAt` giảm dần khi `sortDescending = false` — `InvoiceRepository.cs:97-117`.
6. `Skip/Take`, map `ToSummary` — `InvoiceRepository.cs:119-124`, `InvoiceService.cs:131-138`, `:416-436`.

**Chi tiết**
1. Controller tính `OwnerRestriction`: lễ tân/quản lý → `null`; còn lại → `CurrentUserId` — `InvoicesController.cs:34-37`, `:72-80`.
2. Đọc hóa đơn kèm dòng, khoản thu, hoàn tiền, trả góp, bệnh nhân — `InvoiceService.cs:125-126`, `InvoiceRepository.cs:30-50`.
3. Có owner: tìm bệnh nhân theo `UserId`, phải trùng `invoice.PatientId`, không thì 403 — `InvoiceService.cs:127`, `:374-385`.
4. Map `ToResponse` — `InvoiceService.cs:128`, `:438-489`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-05 | `PaidAmount` phản ánh số đã thu xác nhận (trừ hoàn tiền) | `InvoiceMoneyHelper.cs:8-31`, `:36-73` |
| BR-PAY-08 | Danh sách công nợ dùng để nhắc, không khóa điều trị | Lọc `paymentStatus`; cảnh báo mềm khi hoàn tất khám ([F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md)) |
| (phạm vi) | Bệnh nhân chỉ xem hóa đơn của mình | `InvoiceService.cs:374-385`, `:145-148` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| — | — | — | Chỉ đọc |

## 7. Liên quan

- Trước đó: [F-PAY-01](F-PAY-01_lap-hoa-don.md).
- Sau đó: [F-PAY-03](F-PAY-03_thu-tien.md), [F-PAY-04](F-PAY-04_ung-truoc-tra-gop.md), [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md), [F-PAY-06](F-PAY-06_chot-ca.md).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: lọc từng tham số; `paymentStatus` chữ thường vẫn lọc đúng; tìm theo tên bệnh nhân; phân trang `pageSize > 100` → 100; bệnh nhân xem hóa đơn người khác → 403; `my` chỉ trả hóa đơn của mình kể cả khi gửi `patientId` khác; `remainingAmount` sau thu một phần và sau hoàn tiền.

## 9. Còn thiếu / câu hỏi mở

- Không có API "công nợ" riêng: muốn lấy cả ba trạng thái còn nợ phải gọi ba lần (một `paymentStatus` mỗi lần); không trả SĐT bệnh nhân để gọi nhắc. Thiết kế đề xuất trước đây (`GET api/patients/{id}/invoices`, `GET api/invoices/outstanding`) không được làm theo; dùng `GET api/invoices?patientId=&paymentStatus=`.
- Bệnh nhân xem hóa đơn người khác nhận **403**, trong khi mục 1 tài liệu tổng yêu cầu **404** để không lộ hóa đơn có tồn tại.
- Chiều sắp xếp mặc định bị đảo: không gửi `sortBy`, `sortDescending = true` lại ra cũ nhất trước (`InvoiceRepository.cs:114-116`).
- `paymentStatus` sai giá trị không báo lỗi, chỉ trả danh sách rỗng.
- Hóa đơn `PARTIALLY_REFUNDED` vẫn có thể còn `remainingAmount > 0` nhưng không thu tiếp được ([F-PAY-03](F-PAY-03_thu-tien.md) mục 9) và không nằm trong báo cáo công nợ ([F-PAY-06](F-PAY-06_chot-ca.md)).
- Chi tiết hóa đơn không trả lịch trả góp và yêu cầu hoàn tiền (phải gọi `GET api/invoices/{id}/installment-plan`, `GET api/refund-requests?invoiceId=` — API sau chỉ cho quản lý).

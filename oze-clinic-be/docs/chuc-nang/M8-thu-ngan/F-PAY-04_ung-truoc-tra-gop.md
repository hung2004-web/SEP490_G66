# F-PAY-04 Ứng trước và trả góp

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M8, câu hỏi Q1, Q2. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M8 Thu ngân |
| Trạng thái | 🟡 Một phần (có API, chưa kiểm mức ứng trước BR-PAY-06, kỳ góp chưa kiểm số tiền) |
| Vai trò được dùng | `Receptionist` (lập lịch góp, xem kỳ đến hạn); `ClinicManager`, `Patient` (xem lịch góp) |
| API | `POST api/invoices/{id}/installment-plan`, `GET api/invoices/{id}/installment-plan`, `GET api/installments/due`; ứng trước và trả kỳ qua `POST api/invoices/{id}/payments` ([F-PAY-03](F-PAY-03_thu-tien.md)) |
| Code chính | `InvoicesController.CreateInstallmentPlanAsync` / `GetInstallmentPlanAsync`, `InstallmentsController.GetDueAsync` → `InstallmentService.CreatePlanAsync` / `GetPlanByInvoiceAsync` / `GetDuePeriodsAsync` → `InstallmentRepository`, `InvoiceRepository` |

## 1. Chức năng này làm gì

Với kế hoạch điều trị dài, code làm như sau:
- **Ứng trước**: lễ tân lập *hóa đơn gói* cho kế hoạch ([F-PAY-01](F-PAY-01_lap-hoa-don.md)), rồi thu một khoản `purpose = Deposit` ([F-PAY-03](F-PAY-03_thu-tien.md)). `Deposit` chỉ là nhãn: không có kiểm tra mức tối thiểu, không có số dư ứng trước riêng.
- **Trả góp**: lễ tân chia phần còn nợ của một hóa đơn thành các kỳ cố định (số thứ tự, số tiền, ngày đến hạn). Mỗi lần khách trả một kỳ, lễ tân thu khoản `purpose = Installment` gắn kỳ đó; kỳ chuyển `Paid` khi khoản được xác nhận.
- **Nhắc trễ hạn**: lễ tân xem danh sách kỳ đến hạn/quá hạn để gọi điện; khi bác sĩ hoàn tất khám, response kèm cảnh báo mềm nếu bệnh nhân còn nợ hoặc có kỳ quá hạn. Không chặn điều trị.

## 2. Tiền điều kiện

- Lập lịch góp: role `Receptionist` (`InvoicesController.cs:117-118`); hóa đơn tồn tại, không `CANCELLED`/`REFUNDED`/`PARTIALLY_REFUNDED`, chưa có lịch góp. Hóa đơn nào cũng lập được (không bắt buộc hóa đơn gói).
- Xem lịch góp: `Receptionist`, `ClinicManager`, `Patient` (chỉ hóa đơn của mình) — `InvoicesController.cs:128-129`.
- Kỳ đến hạn: `Receptionist` — `InstallmentsController.cs:24-25`.

## 3. API

**Request** `POST api/invoices/{id:long}/installment-plan`, quyền `[Authorize(Roles = "Receptionist")]`

Body `CreateInstallmentPlanRequest` (`InstallmentModels.cs:5-25`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `notes` | string? | Không | `MaxLength(500)` | Ghi chú |
| `periods` | array | Có | `[Required]`, `MinLength(1)` | Các kỳ |
| `periods[].sequence` | int | Có | `[Range(1, max)]`, không trùng | Số thứ tự kỳ |
| `periods[].amount` | decimal | Có | `[Range(0.01, max)]`; Σ ≤ số còn nợ | Số tiền kỳ |
| `periods[].dueDate` | DateOnly | Có | ≥ hôm nay (giờ phòng khám) | Ngày đến hạn |

```json
{
  "notes": "Niềng răng 6 tháng",
  "periods": [
    { "sequence": 1, "amount": 3000000, "dueDate": "2026-12-11" },
    { "sequence": 2, "amount": 3000000, "dueDate": "2027-01-11" }
  ]
}
```

**Request** `GET api/invoices/{id:long}/installment-plan`, quyền `[Authorize(Roles = "Receptionist,ClinicManager,Patient")]`.

**Request** `GET api/installments/due`, quyền `[Authorize(Roles = "Receptionist")]`. Không có tham số; mốc là hôm nay theo `ClinicClock`.

**Response thành công**
- Lịch góp: `ApiResponse<InstallmentPlanResponse>`, HTTP 200 (tạo: message `PlanCreated` = "Installment plan has been created."). Trường: `id`, `invoiceId`, `notes`, `createdAt`, `createdByUserId`, `periodsTotalAmount`, `periods[]` (`InstallmentModels.cs:27-36`).
- Kỳ đến hạn: `ApiResponse<IReadOnlyList<InstallmentPeriodResponse>>`, HTTP 200, sắp theo `dueDate`, `sequence`.

| Trường (`InstallmentPeriodResponse`) | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `installmentPlanId`, `invoiceId`, `sequence` | | |
| `amount`, `dueDate` | decimal, DateOnly | |
| `status` | string | `Pending`, `Paid`, `Overdue` |
| `paidAt`, `paymentId` | | Khi `Paid` |
| `invoiceNumber`, `patientId`, `patientName` | | Có ở danh sách đến hạn |

**Cảnh báo khi hoàn tất khám** (`POST api/appointments/{id}/complete-examination`, role `Doctor`): `AppointmentResponse.paymentWarnings[]` gồm `OUTSTANDING_BALANCE` (mỗi hóa đơn còn nợ: `invoiceId`, `invoiceNumber`, `remainingAmount`) và `OVERDUE_INSTALLMENT` (`overduePeriodCount`) — `AppointmentService.cs:1123-1125`, `:1145-1199`.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Body sai annotation (thiếu `periods`, `amount` ≤ 0...) | ProblemDetails mặc định |
| 404 | Không có hóa đơn | `InstallmentMessage.InvoiceNotFound` |
| 400 | Hóa đơn `CANCELLED`/`REFUNDED`/`PARTIALLY_REFUNDED` | `PaymentMessage.InvoiceNotPayable` |
| 400 | Hóa đơn đã có lịch góp | `InstallmentMessage.PlanAlreadyExists` |
| 400 | Không có kỳ / số thứ tự trùng hoặc ≤ 0 / số tiền ≤ 0 / hạn trước hôm nay | `PeriodsRequired` / `PeriodSequenceInvalid` / `PeriodAmountInvalid` / `PeriodDueDateInvalid` |
| 400 | Tổng các kỳ > số còn nợ | `PeriodsExceedRemaining`: "Sum of installment periods cannot exceed the remaining balance." |
| 409 | Hai request tạo lịch cùng lúc (unique `InvoiceId`) | "This record already exists" |
| 404 | (Xem) Hóa đơn chưa có lịch góp | `InstallmentMessage.PlanNotFound` |
| 403 | (Xem) Bệnh nhân xem lịch của người khác | `InvoiceMessage.AccessDenied` |

## 4. Luồng xử lý trong code

**Lập lịch góp** (`InstallmentService.CreatePlanAsync`):
1. Đọc hóa đơn kèm khoản thu, hoàn tiền, trả góp (404) — `InstallmentService.cs:36-37`.
2. Chặn hóa đơn `CANCELLED`/`REFUNDED`/`PARTIALLY_REFUNDED` — `InstallmentService.cs:38-42`.
3. Chưa có lịch góp — `InstallmentService.cs:43-45`, `InstallmentRepository.cs:33-36`.
4. Có kỳ, số thứ tự không trùng — `InstallmentService.cs:47-53`.
5. Từng kỳ theo `sequence`: `> 0`, `amount = Round(Amount, 2) > 0`, `dueDate ≥ ClinicClock.Today`; tạo kỳ `Pending` — `InstallmentService.cs:55-74`.
6. `Σ amount ≤ GetRemaining` (= `FinalAmount − (Σ CONFIRMED − Σ hoàn tiền)`, không tính khoản `PENDING`) — `InstallmentService.cs:76-79`, `InvoiceMoneyHelper.cs:30-31`.
7. Lưu lịch và kỳ, audit `INSTALLMENT_PLAN_CREATED` — `InstallmentService.cs:81-97`.

**Xem lịch góp** (`GetPlanByInvoiceAsync`):
1. Đọc lịch theo `InvoiceId` (404) — `InstallmentService.cs:113-114`, `InstallmentRepository.cs:23-31`.
2. Bệnh nhân: phải là chủ hóa đơn (403) — `InstallmentService.cs:115`, `:152-163`.
3. Kỳ `Pending` có hạn < hôm nay → `Overdue` và **lưu ngay** (ghi khi đọc) — `InstallmentService.cs:117-120`, `:134-148`.

**Kỳ đến hạn** (`GetDuePeriodsAsync`):
1. Đánh dấu mọi kỳ `Pending` quá hạn thành `Overdue` (mọi hóa đơn) — `InstallmentService.cs:128-129`, `InstallmentRepository.cs:58-79`.
2. Lấy kỳ `Pending`/`Overdue` có `DueDate ≤ hôm nay`, hóa đơn không `CANCELLED` — `InstallmentService.cs:130-131`, `InstallmentRepository.cs:38-56`.

**Trả kỳ**: khoản `Installment` ([F-PAY-03](F-PAY-03_thu-tien.md)) kiểm kỳ `Pending`/`Overdue`, chưa gắn khoản (`PaymentService.cs:224-235`); khi `CONFIRMED` thì kỳ → `Paid`, `PaidAt`, `PaymentId` (`PaymentService.cs:237-256`); void thì kỳ về `Pending`/`Overdue` (`PaymentService.cs:258-283`).

**Cảnh báo khi hoàn tất khám**: sau khi lưu, lấy hóa đơn `UNPAID`/`PENDING_CONFIRMATION`/`PARTIALLY_PAID` còn nợ và đếm kỳ quá hạn (bỏ hóa đơn hủy/hoàn tiền); lỗi khi dựng cảnh báo chỉ ghi log — `AppointmentService.cs:1129-1199`, `InvoiceRepository.cs:138-158`, `InstallmentRepository.cs:81-96`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-PAY-06 | Ứng trước 1/3 đến 1/2 giá kế hoạch | **Chưa kiểm** (`Deposit` chỉ là nhãn, `PaymentService.cs:41`, `:206-214`) |
| BR-PAY-08 | Trễ hạn chỉ nhắc, không phạt, không khóa điều trị | Danh sách `GET api/installments/due`; cảnh báo mềm `AppointmentService.cs:1123-1125`; không có phí trễ hạn |
| BR-PAY-05 | Lịch góp không vượt số còn nợ | `InstallmentService.cs:76-79` |
| BR-C01 | Ngày đến hạn, quá hạn theo giờ VN | `InstallmentService.cs:55`, `:128`, `:136` (`ClinicClock`); riêng void dùng UTC (mục 9) |
| BR-C11 | Lập lịch góp ghi `AuditLog` | `InstallmentService.cs:93-97` |
| (DB) | Một lịch góp / hóa đơn; `sequence` không trùng trong lịch; kỳ `Paid` phải có `PaymentId`, `PaidAt`; một khoản / kỳ | `InstallmentPlanConfiguration.cs:28-30`, `InstallmentPeriodConfiguration.cs:11-51`, `PaymentConfiguration.cs:50-53` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `InstallmentPlans` | — | 1 dòng / hóa đơn | |
| `InstallmentPeriods` | — | n kỳ `Pending` | |
| `InstallmentPeriods` | `Pending` | `Overdue` | Khi đọc lịch góp hoặc danh sách đến hạn |
| `InstallmentPeriods` | `Pending`/`Overdue` | `Paid` | Khi khoản `Installment` được xác nhận ([F-PAY-03](F-PAY-03_thu-tien.md)) |
| `Payments` | — | `Purpose = Deposit` / `Installment` | Qua [F-PAY-03](F-PAY-03_thu-tien.md) |
| `AuditLogs` | — | `INSTALLMENT_PLAN_CREATED` | |

## 7. Liên quan

- Trước đó: [F-TP-07](../M7-ke-hoach-dieu-tri/F-TP-07_duyet-ke-hoach.md) duyệt kế hoạch, [F-PAY-01](F-PAY-01_lap-hoa-don.md) hóa đơn gói.
- Sau đó: [F-PAY-03](F-PAY-03_thu-tien.md) thu ứng trước / trả kỳ, [F-PAY-06](F-PAY-06_chot-ca.md) số kỳ đến hạn/quá hạn, [F-PAY-05](F-PAY-05_huy-hoa-don-hoan-tien.md) hoàn tiền khi bỏ dở.

## 8. Kiểm thử

- Test hiện có: Chưa có (`OZE.UnitTest` không có test cho `InstallmentService`).
- Ca cần test: tạo lịch hợp lệ; tổng kỳ > còn nợ → 400; hạn trước hôm nay → 400; `sequence` trùng → 400; hóa đơn đã có lịch → 400; hóa đơn `CANCELLED` → 400; đọc lịch sau hạn → kỳ `Overdue` được lưu; danh sách đến hạn không có hóa đơn hủy; bệnh nhân xem lịch người khác → 403; tiền mặt `Installment` → kỳ `Paid`; void rồi thu lại cùng kỳ (hiện 409); hoàn tất khám với kỳ quá hạn → có `OVERDUE_INSTALLMENT`.

## 9. Còn thiếu / câu hỏi mở

Phát hiện review 11/11/2026, kiểm lại với code:
- **Q1 / BR-PAY-06**: mức ứng trước 1/3–1/2 không được kiểm; `purpose = Deposit` gắn được cho khoản bất kỳ, hóa đơn bất kỳ (`PaymentService.cs:41`, `:206-214`). Không có số dư "đã ứng / đã dùng / còn lại" của kế hoạch.
- **BR-PAY-03** cấm thu trước nhưng ứng trước trong code dựa trên hóa đơn gói thu cả kế hoạch ([F-PAY-01](F-PAY-01_lap-hoa-don.md) mục 9). Chưa có quy tắc trừ dần ứng trước vào hóa đơn buổi sau (và một kế hoạch chỉ có một hóa đơn).
- **Q2** code đã quyết khác mặc định tạm: mặc định là "không chia đợt cố định, trả theo giai đoạn đã làm"; code chia **kỳ cố định** có số tiền và hạn. Không có phí trễ hạn (khớp mặc định).
- **Thu bao nhiêu cũng đánh dấu kỳ `Paid`**: không kiểm `amount == period.Amount` (`PaymentService.cs:46-51`, `:237-256`).
- **Void rồi thu lại cùng kỳ bị 409**: void giữ `Payment.InstallmentPeriodId` trên khoản `FAILED` (`PaymentService.cs:258-283`) mà index `IX_Payments_InstallmentPeriodId` unique khi khác null (`PaymentConfiguration.cs:50-53`) → kỳ đó không bao giờ thu lại được.
- **Danh sách kỳ đến hạn vẫn hiện hóa đơn đã `PAID`/`REFUNDED`/`PARTIALLY_REFUNDED`** (chỉ lọc `CANCELLED`, `InstallmentRepository.cs:47-51`); đánh dấu `Overdue` cũng áp cho mọi hóa đơn (`:62-66`).
- Khách trả thêm bằng khoản `Regular` trên hóa đơn có lịch góp: các kỳ vẫn `Pending` rồi thành `Overdue` dù hóa đơn đã trả đủ.
- Hóa đơn vẫn sửa được (giảm `FinalAmount`) sau khi có lịch góp ([F-PAY-01](F-PAY-01_lap-hoa-don.md) mục 9).
- Void tính "quá hạn" bằng `DateTime.UtcNow` (`PaymentService.cs:279`) thay vì `ClinicClock` (BR-C01).
- Không có API sửa/hủy lịch góp; `PeriodNotFound`, `PeriodNotPayable` khai báo nhưng không dùng. `INSTALLMENT_PERIOD_PAID` khai báo trong `AuditConstants` nhưng không ghi.
- `GET` lịch góp có tác dụng phụ ghi DB (đánh dấu `Overdue`), kể cả khi bệnh nhân gọi.
- Cảnh báo nợ chỉ trả về cho bác sĩ lúc hoàn tất khám; lễ tân không thấy khi check-in.
- Thiết kế đề xuất trước đây (`POST api/TreatmentPlans/{id}/deposit`, `GET api/TreatmentPlans/{id}/balance`) không được làm theo.

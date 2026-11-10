# F-EXM-02 Nội dung khám (lý do khám, ghi chú lâm sàng)

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` (bác sĩ của phiếu) |
| API | `GET api/examinations/{id}`, `PUT api/examinations/{id}/content` |
| Code chính | `ExaminationsController.GetAsync` / `UpdateContentAsync` → `ExaminationService.GetAsync` / `UpdateContentAsync` → `ExaminationRepository.GetForWorkAsync`, `SaveChangesAsync` |

## 1. Chức năng này làm gì

Bác sĩ đang khám mở phiếu khám để xem toàn bộ nội dung làm việc (dịch vụ, chẩn đoán, đơn thuốc, sơ đồ răng) và ghi/sửa **lý do khám** (`ChiefComplaint`) và **ghi chú lâm sàng** (`ClinicalNotes`). Hai trường được thay nguyên giá trị mỗi lần lưu.

## 2. Tiền điều kiện

- Role `Doctor`, tài khoản có `StaffProfile`.
- Phiếu khám tồn tại và `Examination.DoctorId` là bác sĩ đang đăng nhập.
- Ghi (`PUT`): phiếu đang `InProgress` (chưa khóa). Xem (`GET`) được cả khi đã khóa.
- Không kiểm tra trạng thái lịch hẹn: khi bệnh nhân đang đi chụp phim (lịch `CHECKED_IN`) bác sĩ vẫn sửa được phiếu.

## 3. API

### 3.1 Xem phiếu đang làm

**Request** `GET api/examinations/{id}`, quyền `[Authorize(Roles = RoleConstants.DoctorRole)]` (cấp controller). `id` là `long`, Id phiếu khám.

**Response thành công** (`ApiResponse<ExaminationWorkResponse>`, HTTP 200, message `"Success"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `examinationId` | `long` | Id phiếu |
| `appointmentId` | `long` | Id lịch hẹn |
| `patientId` | `int` | Id bệnh nhân |
| `examinationStatus` | `string` | `InProgress` / `Locked` |
| `chiefComplaint` | `string?` | Lý do khám |
| `clinicalNotes` | `string?` | Ghi chú lâm sàng |
| `services` | `List<ExaminationServiceResponse>` | Xem F-EXM-03 |
| `diagnoses` | `List<DiagnosisResponse>` | Xem F-EXM-05 |
| `prescription` | `PrescriptionResponse` | Xem F-EXM-06 (chưa có đơn: `id = 0`, `status = "Draft"`) |
| `dentalChart` | `List<DentalChartToothResponse>` | Xem F-EXM-04 |

### 3.2 Lưu nội dung khám

**Request** `PUT api/examinations/{id}/content`, quyền `Doctor`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `chiefComplaint` | `string?` | Không | Trim; tối đa 500 ký tự (`ExaminationConstants.ChiefComplaintMaxLength`); rỗng/space → `null` | Lý do khám |
| `clinicalNotes` | `string?` | Không | Trim; tối đa 2000 ký tự (`ClinicalNotesMaxLength`); rỗng/space → `null` | Ghi chú lâm sàng |

Ví dụ:

```json
{ "chiefComplaint": "Đau răng 46 khi nhai", "clinicalNotes": "Lỗ sâu mặt nhai 46, gõ đau nhẹ" }
```

**Response thành công** (`ApiResponse<ExaminationWorkResponse>`, HTTP 200, message `"Examination notes saved"`): giống 3.1.

**Lỗi** (chung cho mọi API `api/examinations/{id}/...` của ExaminationService)

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | Tài khoản không có hồ sơ nhân viên | `MedicalRecordMessage.DoctorNotFound` = "Doctor profile not found" |
| 404 | Không có phiếu khám | `MedicalRecordMessage.ExaminationNotFound` = "Examination not found" |
| 403 | Phiếu của bác sĩ khác | `ExaminationMessage.NotExaminingDoctor` = "You can only work on the examinations you are performing" |
| 400 | (Chỉ PUT) Phiếu không còn `InProgress` | `ExaminationMessage.AlreadyLocked` = "This examination is already completed and locked, it can no longer be edited" |
| 400 | Lý do khám quá 500 ký tự | `ExaminationMessage.ChiefComplaintTooLong` = "The reason for the visit is too long" |
| 400 | Ghi chú quá 2000 ký tự | `ExaminationMessage.ClinicalNotesTooLong` = "The clinical notes are too long" |
| 409 | Phiếu bị lưu đồng thời (`RowVersion`) | `AppointmentMessage.RecordChangedMeanwhile` = "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

Các bước chung của mọi API trong `ExaminationsController` (dùng lại ở F-EXM-03..06):

1. Controller (`[Authorize(Roles = Doctor)]`, `[Route("api")]`) lấy `DoctorUserId = CurrentUserId ?? ""` — `ExaminationsController.cs:13-26`.
2. `LoadAsync`: tìm `StaffProfile` theo userId → 404 `DoctorNotFound` — `ExaminationService.cs:558-559`.
3. Tải phiếu có tracking, split query, kèm `Appointment.ServiceItems` (+`Service`, `Variant`), `Diagnoses`, `DentalChartEntries`, `Prescriptions.Items` → 404 `ExaminationNotFound` — `ExaminationService.cs:561-562`, `ExaminationRepository.cs:17-34`.
4. **Kiểm tra quyền bác sĩ**: `examination.DoctorId == doctor.Id`, sai → 403 `NotExaminingDoctor` — `ExaminationService.cs:563`.
5. (Chỉ thao tác ghi) **Khóa phiếu** `EnsureOpen`: `ExaminationStatus` phải `InProgress` → 400 `AlreadyLocked`; đồng thời gán `examination.UpdatedAt` để lần lưu luôn UPDATE dòng `Examinations` và EF kiểm tra `RowVersion` — `ExaminationService.cs:568-574`.

Riêng `GET`:

6. Bỏ qua bước 5, dựng `ExaminationWorkResponse` và sơ đồ răng — `ExaminationService.cs:21-25`, `548-553`, `612-623`.

Riêng `PUT content`:

6. `Clean` (trim, rỗng → `null`) hai trường, kiểm tra độ dài — `ExaminationService.cs:32-37`, `584`.
7. Gán `ChiefComplaint`, `ClinicalNotes`, `UpdatedAt` — `ExaminationService.cs:39-41`.
8. `SaveChangesAsync`; nếu `RowVersion` lệch (vd. phiếu vừa được hoàn tất) → `DbUpdateConcurrencyException` → 409 — `ExaminationService.cs:43`, `GlobalExceptionMiddleware.cs:55-59`.
9. Trả `ExaminationWorkResponse` — `ExaminationService.cs:44`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-EXM-02 | Lý do khám ban đầu chép từ ghi chú đặt lịch, bác sĩ sửa lại ở đây | `AppointmentService.cs:1061`, `ExaminationService.cs:39` |
| BR-EXM-04 | Phiếu đã khóa không sửa được | `ExaminationService.cs:570` |
| BR-C10 | Ghi đồng thời bị chặn bằng `RowVersion` (409) | `ExaminationService.cs:571-573`, `ExaminationConfiguration.cs:13` |
| (Quyền) | Chỉ bác sĩ của phiếu đọc/ghi | `ExaminationService.cs:563` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Examinations.ChiefComplaint`, `ClinicalNotes` | giá trị cũ | giá trị mới (hoặc `null`) | Thay nguyên |
| `Examinations.UpdatedAt`, `RowVersion` | | đổi | |

Không ghi `AuditLog`.

## 7. Liên quan

- Trước đó: F-EXM-01 bắt đầu khám.
- Sau đó: F-EXM-07 hoàn tất khám yêu cầu có `ClinicalNotes` hoặc ít nhất một chẩn đoán.

## 8. Kiểm thử

- Test hiện có: Chưa có (không có test cho `ExaminationService`).
- Ca cần test thêm: bác sĩ khác bị 403; phiếu `Locked` bị 400 `AlreadyLocked`; GET vẫn đọc được phiếu đã khóa; giá trị toàn space lưu thành `null`; quá độ dài; 409 khi lưu đè.

## 9. Còn thiếu / câu hỏi mở

- Không có `AuditLog` cho thay đổi nội dung khám (BR-C11 liệt kê "khám" là thay đổi quan trọng; code chỉ audit bắt đầu/hoàn tất).
- Client không gửi `RowVersion`: chỉ phát hiện xung đột giữa lúc tải và lúc lưu trong cùng một request, không phát hiện "ghi đè dữ liệu người khác vừa lưu sau khi mình mở màn hình".
- Lỗi xác thực model (thiếu body) do `[ApiController]` trả `ProblemDetails` mặc định, không bọc `ApiResponse` (không thấy `InvalidModelStateResponseFactory` tùy biến).

# F-EXM-06 Kê đơn, chốt đơn, mở lại đơn

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` (bác sĩ của phiếu) |
| API | `GET` / `PUT` / `DELETE api/examinations/{id}/prescription`; `POST api/examinations/{id}/prescription/items`; `PUT` / `DELETE api/examinations/{id}/prescription/items/{itemId}`; `POST api/examinations/{id}/prescription/finalize`; `POST api/examinations/{id}/prescription/reopen` |
| Code chính | `ExaminationsController.*Prescription*` → `ExaminationService` (`GetPrescriptionAsync`, `SavePrescriptionNotesAsync`, `DeletePrescriptionAsync`, `AddPrescriptionItemAsync`, `UpdatePrescriptionItemAsync`, `DeletePrescriptionItemAsync`, `FinalizePrescriptionAsync`, `ReopenPrescriptionAsync`) → `ExaminationRepository` (`GetForWorkAsync`, `RemovePrescription`, `RemovePrescriptionItem`, `SaveChangesAsync`) |

## 1. Chức năng này làm gì

Bác sĩ kê đơn thuốc cho lượt khám: thêm/sửa/xóa dòng thuốc, ghi chú chung của đơn, rồi **chốt đơn** (`Finalized`). Đơn đã chốt không sửa được, muốn sửa phải **mở lại** (`Draft`). Mỗi phiếu khám chỉ có một đơn; đơn chỉ ghi tên thuốc và cách dùng, phòng khám không bán thuốc.

## 2. Tiền điều kiện

- Như F-EXM-02: role `Doctor`, có `StaffProfile`, là bác sĩ của phiếu. Mọi thao tác ghi cần phiếu `InProgress`. `GET` đọc được cả khi phiếu đã khóa.
- Sửa ghi chú, thêm/sửa/xóa dòng, xóa cả đơn: đơn đang `Draft`.
- Chốt đơn: đơn có ít nhất một dòng thuốc.

## 3. API

Trạng thái đơn (`PrescriptionConstants`, check constraint `CK_Prescriptions_Status`): `Draft`, `Finalized`.

| Method + route | Body | Message thành công |
|---|---|---|
| `GET api/examinations/{id}/prescription` | — | `"Success"` |
| `PUT api/examinations/{id}/prescription` | `SavePrescriptionNotesRequest` | `"Prescription note saved"` |
| `DELETE api/examinations/{id}/prescription` | — | `"Prescription deleted"` |
| `POST api/examinations/{id}/prescription/items` | `SavePrescriptionItemRequest` | `"Medication added"` |
| `PUT api/examinations/{id}/prescription/items/{itemId}` | `SavePrescriptionItemRequest` | `"Medication updated"` |
| `DELETE api/examinations/{id}/prescription/items/{itemId}` | — | `"Medication removed"` |
| `POST api/examinations/{id}/prescription/finalize` | — | `"Prescription finalized"` |
| `POST api/examinations/{id}/prescription/reopen` | — | `"Prescription reopened"` |

Tất cả quyền `[Authorize(Roles = RoleConstants.DoctorRole)]`; `id`, `itemId` là `long`.

**Body `SavePrescriptionNotesRequest`**

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `notes` | `string?` | Không | Trim, tối đa 500 (`PrescriptionConstants.NotesMaxLength`); rỗng → `null` (xóa ghi chú) | Ghi chú chung của đơn |

**Body `SavePrescriptionItemRequest`**

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `medicationName` | `string?` | Có (`[Required]`) | Trim, không rỗng, tối đa 300 | Tên thuốc |
| `dosage` | `string?` | Không | Trim, tối đa 100 | Liều, vd. `500mg` |
| `frequency` | `string?` | Không | Trim, tối đa 200 | Số lần, vd. `3 times a day` |
| `duration` | `string?` | Không | Trim, tối đa 100 | Thời gian dùng, vd. `5 days` |
| `quantity` | `int?` | Không | 1..1000 (`MaxQuantity`) | Số lượng |
| `instructions` | `string?` | Không | Trim, tối đa 500 | Hướng dẫn |

Ví dụ:

```json
{ "medicationName": "Amoxicillin", "dosage": "500mg", "frequency": "3 lần/ngày", "duration": "5 ngày", "quantity": 15, "instructions": "Uống sau ăn" }
```

**Response thành công** (`ApiResponse<PrescriptionResponse>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `long` | Id đơn; `0` nếu phiếu chưa có đơn |
| `status` | `string` | `Draft` / `Finalized` (chưa có đơn: `Draft`) |
| `notes` | `string?` | Ghi chú chung |
| `items[]` | `List<PrescriptionItemResponse>` | `id`, `medicationName`, `dosage`, `frequency`, `duration`, `quantity`, `instructions`; sắp theo `SortOrder`, `Id` |

**Lỗi** (ngoài lỗi chung F-EXM-02: 404 `DoctorNotFound`, 404 `ExaminationNotFound`, 403 `NotExaminingDoctor`, 400 `AlreadyLocked`, 409 `RecordChangedMeanwhile`)

| HTTP | Khi nào | Message (`ErrorConstants.ExaminationMessage`) |
|---|---|---|
| 400 | Thiếu `medicationName` (null) | ProblemDetails mặc định của `[ApiController]` |
| 400 | Ghi chú > 500 | `PrescriptionNotesTooLong` = "The prescription note is too long" |
| 400 | Tên thuốc rỗng | `MedicationNameRequired` = "Please enter the medication name" |
| 400 | Tên thuốc > 300 | `MedicationNameTooLong` = "The medication name is too long" |
| 400 | `dosage` > 100 | `DosageTooLong` = "The dosage is too long" |
| 400 | `frequency` > 200 | `FrequencyTooLong` = "The frequency is too long" |
| 400 | `duration` > 100 | `DurationTooLong` = "The duration is too long" |
| 400 | `instructions` > 500 | `InstructionsTooLong` = "The instructions are too long" |
| 400 | `quantity` ngoài 1..1000 | `QuantityInvalid` = "The quantity must be a whole number between 1 and the allowed maximum" |
| 404 | (PUT/DELETE item) Dòng thuốc không thuộc đơn | `PrescriptionItemNotFound` = "Medication not found in this prescription" |
| 400 | Sửa ghi chú / dòng thuốc / xóa đơn khi đơn đã `Finalized` | `PrescriptionFinalized` = "The prescription is finalized. Reopen it to change it" |
| 400 | Chốt khi chưa có đơn hoặc đơn không có dòng | `PrescriptionNothingToFinalize` = "Add at least one medication before finalizing the prescription" |
| 409 | Hai request cùng tạo đơn (unique `IX_Prescriptions_ExaminationId`) | "This record already exists" (`GlobalExceptionMiddleware`, không lấy từ `ErrorConstants`) hoặc `RecordChangedMeanwhile` nếu `RowVersion` phiếu lệch trước |

## 4. Luồng xử lý trong code

Bước chung `LoadAsync` + `EnsureOpen` (quyền bác sĩ, khóa phiếu, `RowVersion` phiếu): xem F-EXM-02 mục 4, `ExaminationService.cs:556-574`. Mọi thao tác ghi đều gọi `EnsureOpen`.

Hàm phụ:
- `GetOrCreatePrescription`: lấy đơn đầu tiên (theo `Id`) của phiếu; chưa có thì tạo mới trong bộ nhớ (`Status = Draft`, `PrescribedByDoctorId = doctor.Id`, `PatientId`, `CreatedAt`) — `ExaminationService.cs:419-435`.
- `EnsureDraft`: đơn phải `Draft` → `PrescriptionFinalized` — `ExaminationService.cs:437-440`.
- `ValidateMedication`: trim, kiểm tra bắt buộc/độ dài/số lượng, trả `PrescriptionItem` — `ExaminationService.cs:442-467`.
- `ToPrescriptionResponse`: chưa có đơn → `{ id: 0, status: "Draft" }` — `ExaminationService.cs:469-491`.

**Xem** — `ExaminationService.cs:189-193`: `LoadAsync`, trả `ToPrescriptionResponse` (không `EnsureOpen`).

**Lưu ghi chú** — `ExaminationService.cs:195-209`
1. `LoadAsync`, `EnsureOpen`; kiểm tra độ dài ghi chú — dòng 197-201.
2. `GetOrCreatePrescription` (tạo đơn nếu chưa có), `EnsureDraft` — dòng 202-203.
3. Gán `Notes`, `UpdatedAt`, `SaveChangesAsync` — dòng 205-208.

**Thêm dòng thuốc** — `ExaminationService.cs:211-225`
1. `LoadAsync`, `EnsureOpen`, `ValidateMedication` — dòng 213-215.
2. `GetOrCreatePrescription`, `EnsureDraft` — dòng 216-217.
3. `SortOrder = max + 1` (đơn trống: 1), thêm dòng, `UpdatedAt`, `SaveChangesAsync` — dòng 219-223.

**Sửa dòng thuốc** — `ExaminationService.cs:227-248`
1. `LoadAsync`, `EnsureOpen`, `GetOrCreatePrescription`, `EnsureDraft` — dòng 229-232.
2. Tìm dòng → 404 `PrescriptionItemNotFound`; `ValidateMedication` — dòng 234-236.
3. Thay toàn bộ các trường, `UpdatedAt`, `SaveChangesAsync` — dòng 238-246.

**Xóa dòng thuốc** — `ExaminationService.cs:250-266`
1. `LoadAsync`, `EnsureOpen`, `GetOrCreatePrescription`, `EnsureDraft` — dòng 252-255.
2. Tìm dòng → 404; `RemovePrescriptionItem` (xóa cứng), bỏ khỏi collection, `UpdatedAt`, `SaveChangesAsync` — dòng 257-264.

**Xóa cả đơn** — `ExaminationService.cs:268-283`
1. `LoadAsync`, `EnsureOpen` — dòng 270-271.
2. Chưa có đơn → trả đơn trống, không lỗi. Có đơn → `EnsureDraft`, `RemovePrescription` (các dòng xóa theo cascade), `SaveChangesAsync` — dòng 274-281.

**Chốt đơn** — `ExaminationService.cs:285-301`
1. `LoadAsync`, `EnsureOpen` — dòng 287-288.
2. Không có đơn hoặc đơn không có dòng → `PrescriptionNothingToFinalize` — dòng 290-291.
3. Chưa `Finalized` thì đổi sang `Finalized`, `UpdatedAt`, lưu; đã chốt rồi thì không làm gì (idempotent) — dòng 294-299.

**Mở lại đơn** — `ExaminationService.cs:303-316`
1. `LoadAsync`, `EnsureOpen` — dòng 305-306.
2. Có đơn và khác `Draft` → đổi về `Draft`, `UpdatedAt`, lưu. Không có đơn hoặc đã `Draft` → không làm gì, không lỗi — dòng 308-315.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-EXM-06 | Một phiếu khám chỉ một đơn thuốc | `ExaminationService.cs:419-435`; unique index `IX_Prescriptions_ExaminationId` (`PrescriptionConfiguration.cs`, migration `20261103120518_OnePrescriptionPerExamination`) |
| BR-EXM-06 | Đơn chỉ ghi tên thuốc và cách dùng, không liên kết kho/giá | `PrescriptionItem` không có giá, không FK thuốc |
| (Chốt) | Đơn `Finalized` không sửa/xóa; phải mở lại | `ExaminationService.cs:437-440` |
| (Chốt) | Chốt cần ít nhất một dòng thuốc | `ExaminationService.cs:291` |
| BR-EXM-04 | Phiếu khóa thì không chốt/mở lại/sửa đơn | `ExaminationService.cs:570` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Prescriptions` | (không có) | `Draft` | Tạo khi lưu ghi chú hoặc thêm dòng đầu tiên |
| `Prescriptions.Status` | `Draft` | `Finalized` | Chốt đơn |
| `Prescriptions.Status` | `Finalized` | `Draft` | Mở lại |
| `Prescriptions` | `Draft` | (xóa cứng) | Xóa cả đơn, dòng thuốc xóa theo cascade |
| `PrescriptionItems` | | insert / update / delete cứng | |
| `Examinations.UpdatedAt`, `RowVersion` | | đổi | Do `EnsureOpen` |

## 7. Liên quan

- Trước đó: F-EXM-01, F-EXM-05.
- Sau đó: F-EXM-07 hoàn tất khám chặn nếu còn đơn `Draft` có dòng thuốc (`PrescriptionNotFinalized`) và tự xóa đơn `Draft` không có dòng; F-EXM-09 hiện đơn trong chi tiết lượt khám.

## 8. Kiểm thử

- Test hiện có: Chưa có test cho `ExaminationService`. Phần liên quan ở hoàn tất khám: `AppointmentPriorityReturnAndQueueTests.CompleteExaminationAsync_ShouldReject_WhenRecordIsNotReady` (ca `PrescriptionNotFinalized`).
- Ca cần test thêm: dòng đầu tạo đơn `Draft`; `SortOrder` tăng dần; sửa khi `Finalized` → 400; chốt đơn trống → 400; chốt/mở lại lặp lại không lỗi; xóa đơn đã chốt → 400; `quantity` 0 và 1001.

## 9. Còn thiếu / câu hỏi mở

- Đơn chỉ có ghi chú, không có dòng thuốc, **không chốt được** (`PrescriptionNothingToFinalize`) và **bị tự xóa khi hoàn tất khám** (`AppointmentRepository.cs:295-300`), nên ghi chú đó mất mà không báo. Cần chốt với nhóm.
- Không lưu ai/khi nào chốt hoặc mở lại đơn (chỉ `UpdatedAt`); không ghi audit.
- `Prescriptions` không có `RowVersion` riêng; xung đột chỉ phát hiện qua `RowVersion` của `Examinations` (vì `EnsureOpen` luôn cập nhật dòng phiếu).
- Entity vẫn là collection `Examination.Prescriptions`, code lấy đơn đầu tiên theo `Id`; F-EXM-09 trả `prescriptions` dạng danh sách.

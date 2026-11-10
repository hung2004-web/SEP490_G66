# F-EXM-05 Chẩn đoán

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` (bác sĩ của phiếu) |
| API | `POST api/examinations/{id}/diagnoses`, `PUT api/examinations/{id}/diagnoses/{diagnosisId}`, `DELETE api/examinations/{id}/diagnoses/{diagnosisId}` |
| Code chính | `ExaminationsController.AddDiagnosisAsync` / `UpdateDiagnosisAsync` / `DeleteDiagnosisAsync` → `ExaminationService` cùng tên → `ExaminationRepository` (`GetForWorkAsync`, `RemoveDiagnosis`, `SaveChangesAsync`) |

## 1. Chức năng này làm gì

Bác sĩ ghi một hoặc nhiều chẩn đoán cho lượt khám (tên bắt buộc, mã ICD-10 tùy chọn, mô tả). Một phiếu có chẩn đoán thì luôn có **đúng một chẩn đoán chính** (`IsPrimary`).

## 2. Tiền điều kiện

- Như F-EXM-02: role `Doctor`, có `StaffProfile`, là bác sĩ của phiếu, phiếu `InProgress`.

## 3. API

**Request** `POST api/examinations/{id}/diagnoses` và `PUT api/examinations/{id}/diagnoses/{diagnosisId}`, quyền `Doctor`. Body `SaveDiagnosisRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `diagnosisCode` | `string?` | Không | Trim, chữ hoa, tối đa 20; nhập tự do | Mã ICD-10 |
| `diagnosisName` | `string?` | Có (`[Required]`) | Trim, không rỗng, tối đa 300 | Tên chẩn đoán |
| `description` | `string?` | Không | Trim, tối đa 1000 | Mô tả |
| `isPrimary` | `bool` | Không (mặc định `false`) | | Đặt làm chẩn đoán chính |

`diagnosisId` (route, `long`) là `ClinicalDiagnosis.Id`.

Ví dụ:

```json
{ "diagnosisCode": "k02.1", "diagnosisName": "Sâu ngà răng 46", "description": "Lỗ sâu mặt nhai", "isPrimary": true }
```

**Request** `DELETE api/examinations/{id}/diagnoses/{diagnosisId}`: không có body.

**Response thành công** (`ApiResponse<List<DiagnosisResponse>>`, HTTP 200, message `"Diagnosis added"` / `"Diagnosis updated"` / `"Diagnosis deleted"`). Toàn bộ chẩn đoán của phiếu, sắp theo `CreatedAt`, `Id`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `long` | Id chẩn đoán |
| `diagnosisCode` | `string?` | Mã (đã chữ hoa) |
| `diagnosisName` | `string` | Tên |
| `description` | `string?` | Mô tả |
| `isPrimary` | `bool` | Chẩn đoán chính |

**Lỗi** (ngoài lỗi chung F-EXM-02: 404 `DoctorNotFound`, 404 `ExaminationNotFound`, 403 `NotExaminingDoctor`, 400 `AlreadyLocked`, 409 `RecordChangedMeanwhile`)

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `diagnosisName` (null) | ProblemDetails mặc định của `[ApiController]` |
| 400 | Tên rỗng/toàn khoảng trắng | `ExaminationMessage.DiagnosisNameRequired` = "Please enter the diagnosis name" |
| 400 | Tên > 300 | `ExaminationMessage.DiagnosisNameTooLong` = "The diagnosis name is too long" |
| 400 | Mã > 20 | `ExaminationMessage.DiagnosisCodeTooLong` = "The diagnosis code is too long" |
| 400 | Mô tả > 1000 | `ExaminationMessage.DiagnosisDescriptionTooLong` = "The diagnosis description is too long" |
| 404 | (PUT/DELETE) Chẩn đoán không thuộc phiếu | `ExaminationMessage.DiagnosisNotFound` = "Diagnosis not found in this examination" |

## 4. Luồng xử lý trong code

Bước chung `LoadAsync` + `EnsureOpen` (quyền bác sĩ, khóa phiếu, `RowVersion`): xem F-EXM-02 mục 4, `ExaminationService.cs:556-574`.

**Thêm (`AddDiagnosisAsync`)** — `ExaminationService.cs:318-344`

1. `LoadAsync` (lấy cả `doctor`), `EnsureOpen` — dòng 320-321.
2. `ValidateDiagnosis`: trim, tên bắt buộc và ≤ 300, mã chữ hoa ≤ 20, mô tả ≤ 1000 — dòng 322, `586-600`.
3. Tạo `ClinicalDiagnosis` với `DiagnosedByDoctorId = doctor.Id`, `CreatedAt = now` — dòng 324-332.
4. Là chính nếu `isPrimary = true` **hoặc** đây là chẩn đoán đầu tiên; khi đó bỏ `IsPrimary` của các chẩn đoán khác — dòng 334-339.
5. Thêm vào phiếu, `SaveChangesAsync`, trả danh sách — dòng 340-343.

**Sửa (`UpdateDiagnosisAsync`)** — `ExaminationService.cs:346-367`

1. `LoadAsync`, `EnsureOpen` — dòng 348-349.
2. Tìm chẩn đoán trong phiếu → 404 `DiagnosisNotFound`; `ValidateDiagnosis` — dòng 351-353.
3. Gán mã, tên, mô tả; nếu `isPrimary = true` bỏ chính của các chẩn đoán khác; gán `IsPrimary = request.IsPrimary` — dòng 355-362.
4. `EnsureOnePrimary`: nếu không còn chẩn đoán chính, chẩn đoán sớm nhất (`CreatedAt`, `Id`) thành chính — dòng 363, `602-610`.
5. `SaveChangesAsync`, trả danh sách — dòng 365-366.

**Xóa (`DeleteDiagnosisAsync`)** — `ExaminationService.cs:369-383`

1. `LoadAsync`, `EnsureOpen` — dòng 371-372.
2. Tìm chẩn đoán → 404 `DiagnosisNotFound` — dòng 374-375.
3. `RemoveDiagnosis` (xóa cứng); `EnsureOnePrimary` trên các chẩn đoán còn lại — dòng 377-379, `ExaminationRepository.cs:83-86`.
4. `SaveChangesAsync`, trả danh sách còn lại — dòng 381-382.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-EXM-05 | Mã ICD-10 không bắt buộc, nhập tự do (chỉ giới hạn độ dài) | `ExaminationService.cs:592-593` |
| (Chính) | Có chẩn đoán thì luôn đúng một chẩn đoán chính; cái đầu tiên tự là chính | `ExaminationService.cs:334-339`, `602-610` |
| BR-EXM-04 | Phiếu khóa không sửa | `ExaminationService.cs:570` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ClinicalDiagnoses` | | insert / update / delete cứng | `IsPrimary` của các dòng khác có thể đổi |
| `Examinations.UpdatedAt`, `RowVersion` | | đổi | Do `EnsureOpen` |

## 7. Liên quan

- Trước đó: F-EXM-01, F-EXM-04.
- Sau đó: F-EXM-07 hoàn tất khám cần ít nhất một chẩn đoán **hoặc** ghi chú lâm sàng; F-EXM-09 hiện chẩn đoán chính trong danh sách lượt khám; M7 kế hoạch điều trị.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: chẩn đoán đầu tự là chính; thêm cái mới `isPrimary = true` thì cái cũ hết chính; sửa bỏ chính thì cái sớm nhất thành chính; xóa cái chính; mã viết thường được chữ hoa.

## 9. Còn thiếu / câu hỏi mở

- Không lưu ai sửa chẩn đoán (chỉ `DiagnosedByDoctorId` lúc tạo); không ghi audit.
- Không kiểm tra định dạng ICD-10 (đúng với BR-EXM-05 "nhập tự do").

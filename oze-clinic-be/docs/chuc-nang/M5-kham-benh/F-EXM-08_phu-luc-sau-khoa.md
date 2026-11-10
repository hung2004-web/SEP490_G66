# F-EXM-08 Phụ lục sau khi khóa phiếu

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5 (BR-EXM-04).
>
> **Chức năng CHƯA LÀM.** Chỉ có entity và bảng. Toàn bộ API, luồng, quy tắc chi tiết dưới đây là **ĐỀ XUẤT**, chưa có trong code, cần nhóm chốt trước khi làm.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | ĐỀ XUẤT: `Doctor` |
| API | ĐỀ XUẤT: `GET api/examinations/{id}/addenda`, `POST api/examinations/{id}/addenda` |
| Code chính | Đã có: entity `ClinicalRecordAddendum`, `ClinicalRecordAddendumConfiguration`, `AppIdentityDbContext.ClinicalRecordAddenda`, navigation `Examination.Addenda`. Chưa có: controller, service, repository, DTO, constants, message lỗi |

## 1. Chức năng này làm gì

Sau khi hoàn tất khám (F-EXM-07), phiếu bị khóa và không sửa trực tiếp được. Khi cần sửa sai, bổ sung hay làm rõ nội dung, bác sĩ ghi **phụ lục** gắn vào phiếu. Phụ lục chỉ thêm, không sửa/xóa, nội dung gốc của phiếu giữ nguyên để truy vết.

## 2. Tiền điều kiện

Đề xuất:

- Role `Doctor`, có `StaffProfile`.
- Phiếu tồn tại và đã `Locked` (phiếu còn `InProgress` thì sửa trực tiếp ở F-EXM-02..06).
- Người ghi là bác sĩ của phiếu. Câu hỏi mở: có cho bác sĩ khác có quyền xem hồ sơ (`HasDoctorAccessAsync`) ghi phụ lục không.

## 3. API

### Hiện trạng dữ liệu (đã có trong code)

Bảng `ClinicalRecordAddenda` (`ClinicalRecordAddendumConfiguration.cs`), có trong migration `20261006133150_InitialCreate`:

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `Id` | `long` | PK |
| `ExaminationId` | `long` | FK `Examinations`, `NoAction`, index `IX_ClinicalRecordAddenda_ExaminationId` |
| `AddendumType` | `string` | max 20, bắt buộc, check `CK_ClinicalRecordAddenda_Type`: `Correction`, `Addition`, `Clarification` |
| `Content` | `string` | bắt buộc, không giới hạn độ dài ở DB |
| `OriginalContent` | `string?` | |
| `CreatedByDoctorId` | `int` | FK `StaffProfiles`, `NoAction` |
| `CreatedAt` | `DateTimeOffset` | mặc định `SYSDATETIMEOFFSET()` |

### API ĐỀ XUẤT

**Request** `POST api/examinations/{id}/addenda`, quyền `Doctor`

| Trường | Kiểu | Bắt buộc | Ràng buộc (đề xuất) | Ý nghĩa |
|---|---|---|---|---|
| `addendumType` | `string` | Có | `Correction` / `Addition` / `Clarification` | Loại phụ lục |
| `content` | `string` | Có | Trim, không rỗng, tối đa 2000 | Nội dung phụ lục |
| `originalContent` | `string?` | Bắt buộc khi `Correction` | Trim, tối đa 2000 | Nội dung cũ đang được sửa |

Ví dụ:

```json
{ "addendumType": "Correction", "content": "Răng 46 sâu ngà, không phải sâu men", "originalContent": "Sâu men răng 46" }
```

**Response thành công** (đề xuất `ApiResponse<List<AddendumResponse>>`, HTTP 200): danh sách phụ lục của phiếu, sắp theo `CreatedAt`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `long` | Id phụ lục |
| `addendumType` | `string` | Loại |
| `content` | `string` | Nội dung |
| `originalContent` | `string?` | Nội dung cũ |
| `createdByDoctorName` | `string` | Bác sĩ ghi |
| `createdAt` | `DateTimeOffset` | Thời điểm |

**Request** `GET api/examinations/{id}/addenda`: đề xuất trả cùng danh sách trên; đồng thời thêm `addenda` vào `ExaminationDetailResponse` (F-EXM-09).

**Lỗi** (đề xuất; message mới cần thêm vào `ErrorConstants.ExaminationMessage`)

| HTTP | Khi nào | Message |
|---|---|---|
| 404 | Không có hồ sơ bác sĩ / không có phiếu | Dùng lại `MedicalRecordMessage.DoctorNotFound`, `ExaminationNotFound` |
| 403 | Không phải bác sĩ của phiếu | Dùng lại `ExaminationMessage.NotExaminingDoctor` |
| 400 | Phiếu chưa khóa | Mới, đề xuất "Addenda can only be added to a locked examination. Edit the examination directly" |
| 400 | Loại sai | Mới, đề xuất "The addendum type must be one of: Correction, Addition, Clarification" |
| 400 | Thiếu / quá dài nội dung | Mới |
| 400 | `Correction` thiếu `originalContent` | Mới |

## 4. Luồng xử lý trong code

Chưa có code. Luồng ĐỀ XUẤT (theo cùng khuôn `ExaminationService`):

1. `LoadAsync` như F-EXM-02 (hồ sơ bác sĩ, phiếu, quyền bác sĩ của phiếu).
2. Kiểm tra `ExaminationStatus == ExaminationConstants.Locked`.
3. Kiểm tra `addendumType` thuộc danh sách hằng số mới (vd. `ClinicalRecordAddendumConstants`), khớp check constraint.
4. Trim, kiểm tra `content` / `originalContent`.
5. Thêm `ClinicalRecordAddendum` (`CreatedByDoctorId = doctor.Id`, `CreatedAt = now`), `SaveChangesAsync`.
6. Ghi `AuditLog` (vd. `EXAMINATION_ADDENDUM_ADDED`) kèm `ExaminationId`, loại.
7. Trả danh sách phụ lục.

Không có API sửa/xóa phụ lục.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-EXM-04 | Sửa sau khi khóa phải qua phụ lục | Hiện chỉ có phần "khóa" ở `ExaminationService.cs:570`; phần phụ lục chưa có |
| (ĐỀ XUẤT) | Phụ lục chỉ thêm, không sửa, không xóa; không đổi dữ liệu gốc của phiếu | Chưa có |
| (ĐỀ XUẤT) | Chỉ ghi cho phiếu `Locked` | Chưa có |
| (Có ở DB) | Loại phụ lục thuộc `Correction`, `Addition`, `Clarification` | `CK_ClinicalRecordAddenda_Type` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ClinicalRecordAddenda` | | insert | ĐỀ XUẤT |
| `Examinations` | `Locked` | `Locked` | Không đổi |
| `AuditLogs` | | thêm 1 dòng | ĐỀ XUẤT |

## 7. Liên quan

- Trước đó: F-EXM-07 hoàn tất khám (khóa phiếu).
- Sau đó: F-EXM-09 xem hồ sơ (đề xuất hiện phụ lục trong chi tiết lượt khám).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test khi làm: phiếu `InProgress` bị chặn; bác sĩ khác bị 403; loại sai; `Correction` thiếu nội dung cũ; phụ lục xuất hiện trong chi tiết hồ sơ; phiếu gốc không đổi.

## 9. Còn thiếu / câu hỏi mở

- Toàn bộ chức năng chưa làm; Dac_ta ghi ⬜ là đúng với code.
- Câu hỏi: ai được ghi phụ lục (chỉ bác sĩ của phiếu hay mọi bác sĩ có quyền xem)? Có cần phụ lục cho sơ đồ răng, chẩn đoán, đơn thuốc dạng có cấu trúc, hay chỉ văn bản tự do như entity hiện tại?
- Câu hỏi: có giới hạn thời gian ghi phụ lục sau khi khóa không?
- `Content` ở DB không giới hạn độ dài; cần thêm hằng số giới hạn ở service như các trường văn bản khác.

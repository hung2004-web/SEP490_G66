# F-EXM-04 Sơ đồ răng

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` (bác sĩ của phiếu) |
| API | `GET api/examinations/{id}/dental-chart`, `PUT api/examinations/{id}/dental-chart/{toothNumber}`, `DELETE api/examinations/{id}/dental-chart/{toothNumber}` |
| Code chính | `ExaminationsController.GetDentalChartAsync` / `SetToothAsync` / `RemoveToothChangeAsync` → `ExaminationService` cùng tên → `ExaminationRepository` (`GetForWorkAsync`, `GetEarlierChartEntriesAsync`, `RemoveChartEntry`, `SaveChangesAsync`) |

## 1. Chức năng này làm gì

Bác sĩ ghi tình trạng từng răng (số răng FDI) trong lượt khám. Mỗi lượt khám chỉ lưu **những răng thay đổi** (`DentalChartEntries`); sơ đồ trả về là trạng thái mới nhất từ các lượt khám trước của bệnh nhân, đè thêm thay đổi của lượt này.

## 2. Tiền điều kiện

- Như F-EXM-02: role `Doctor`, có `StaffProfile`, là bác sĩ của phiếu. Ghi/xóa: phiếu `InProgress`. Xem: được cả khi đã khóa.
- `toothNumber` hợp lệ theo FDI: 2 chữ số; góc phần tư 1–4 răng 1–8 (răng vĩnh viễn), 5–8 răng 1–5 (răng sữa).

## 3. API

**Request** `GET api/examinations/{id}/dental-chart`, quyền `Doctor`. Không có body.

**Request** `PUT api/examinations/{id}/dental-chart/{toothNumber}`, quyền `Doctor`. Body `SaveToothRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `toothNumber` (route) | `string` | Có | FDI, vd. `46`, `85` | Số răng |
| `condition` | `string?` | Có (`[Required]`) | Một trong `Healthy`, `Caries`, `Filled`, `Crown`, `Missing`, `Denture`, `Implant` (không phân biệt hoa thường, lưu đúng cách viết hằng số) | Tình trạng |
| `surface` | `string?` | Không | Trim, chuyển chữ hoa, tối đa 10 | Mặt răng, vd. `O`, `M`, `D` |
| `severity` | `string?` | Không | Trim, tối đa 20 | Mức độ |
| `notes` | `string?` | Không | Trim, tối đa 500 | Ghi chú |

Ví dụ:

```json
{ "condition": "Caries", "surface": "o", "severity": "Moderate", "notes": "Sâu ngà" }
```

**Request** `DELETE api/examinations/{id}/dental-chart/{toothNumber}`: bỏ thay đổi của răng đó trong lượt này. Không có body.

**Response thành công** (`ApiResponse<List<DentalChartToothResponse>>`, HTTP 200, message `"Success"` / `"Dental chart updated"` / `"Tooth change removed"`). Sắp theo `toothNumber` (ordinal).

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `toothNumber` | `string` | Số răng |
| `condition` | `string` | Tình trạng |
| `surface` | `string?` | Mặt răng |
| `severity` | `string?` | Mức độ |
| `notes` | `string?` | Ghi chú |
| `recordedInThisExamination` | `bool` | `true` nếu ghi trong lượt này, `false` nếu từ lượt trước |

Răng `Healthy` từ lượt trước bị ẩn; răng được đặt về `Healthy` trong lượt này vẫn hiện.

**Lỗi** (ngoài lỗi chung F-EXM-02: 404 `DoctorNotFound`, 404 `ExaminationNotFound`, 403 `NotExaminingDoctor`, 400 `AlreadyLocked`, 409 `RecordChangedMeanwhile`)

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `condition` | ProblemDetails mặc định của `[ApiController]` |
| 400 | Số răng sai | `ExaminationMessage.ToothNumberInvalid` = "The tooth number is not valid. Use the FDI number, for example 46" |
| 400 | Tình trạng không thuộc danh sách | `ExaminationMessage.ToothConditionInvalid` = "The tooth condition must be one of: Healthy, Caries, Filled, Crown, Missing, Denture, Implant" |
| 400 | `surface` > 10 | `ExaminationMessage.ToothSurfaceTooLong` = "The tooth surface is too long" |
| 400 | `severity` > 20 | `ExaminationMessage.ToothSeverityTooLong` = "The severity is too long" |
| 400 | `notes` > 500 | `ExaminationMessage.ToothNotesTooLong` = "The tooth notes are too long" |
| 404 | (DELETE) Răng không có thay đổi trong lượt này | `ExaminationMessage.ToothNotRecorded` = "No change was recorded for this tooth in this examination" |

## 4. Luồng xử lý trong code

Bước chung `LoadAsync` (+ `EnsureOpen` cho PUT/DELETE): xem F-EXM-02 mục 4, `ExaminationService.cs:556-574`.

**Xem (`GetDentalChartAsync`)** — `ExaminationService.cs:119-123`

1. `LoadAsync` (không `EnsureOpen`).
2. `BuildChartAsync` — `ExaminationService.cs:525-546`:
   - Lấy trạng thái trước đó: các `DentalChartEntries` của cùng bệnh nhân, thuộc phiếu khác, có `Examination.CreatedAt` < `CreatedAt` của phiếu này; mỗi răng lấy bản mới nhất theo `CreatedAt`, `Id` — `ExaminationService.cs:516-521`, `ExaminationRepository.cs:36-42`.
   - Đè các bản ghi của lượt này (`Here = true`).
   - Loại răng `Healthy` không thuộc lượt này, sắp theo số răng.

**Ghi (`SetToothAsync`)** — `ExaminationService.cs:125-173`

1. `LoadAsync`, `EnsureOpen` — dòng 127-128.
2. `NormalizeTooth` kiểm tra FDI → `ToothNumberInvalid` — dòng 130, `499-513`.
3. Đối chiếu `condition` với `DentalChartConstants.Conditions` (bỏ qua hoa thường) → `ToothConditionInvalid`; `surface` chữ hoa; kiểm tra độ dài — dòng 131-138.
4. Lấy tình trạng trước đó của răng (mặc định `Healthy`) và bản ghi hiện có của lượt này — dòng 140-142.
5. Nếu tình trạng mới bằng tình trạng trước đó và không có `surface`/`severity`/`notes` → xóa bản ghi của lượt này (nếu có), coi như không thay đổi — dòng 145-148.
6. Ngược lại: có bản ghi → cập nhật; chưa có → thêm `DentalChartEntry` (`ExaminationId`, `PatientId`, `ToothNumber`, ..., `CreatedAt = now`) — dòng 149-169.
7. `SaveChangesAsync` (kiểm tra `RowVersion` phiếu), trả sơ đồ — dòng 171-172.

**Bỏ thay đổi (`RemoveToothChangeAsync`)** — `ExaminationService.cs:175-187`

1. `LoadAsync`, `EnsureOpen`, `NormalizeTooth` — dòng 177-180.
2. Không có bản ghi của răng trong lượt này → 404 `ToothNotRecorded` — dòng 181-182.
3. `RemoveEntry` (xóa cứng), `SaveChangesAsync`, trả sơ đồ — dòng 184-186, `493-497`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (FDI) | Số răng theo FDI, vĩnh viễn 11–48, răng sữa 51–85 | `ExaminationService.cs:500-513`, `DentalChartConstants` |
| (Tình trạng) | Danh sách tình trạng cố định | `DentalChartConstants.Conditions` |
| (Chỉ lưu thay đổi) | Răng không đổi so với lượt trước thì không lưu | `ExaminationService.cs:145-148` |
| BR-EXM-04 | Phiếu khóa không sửa | `ExaminationService.cs:570` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `DentalChartEntries` | | insert / update / delete cứng | Tối đa một bản ghi mỗi răng mỗi phiếu (do code, không có unique index) |
| `Examinations.UpdatedAt`, `RowVersion` | | đổi | Do `EnsureOpen` |

## 7. Liên quan

- Trước đó: F-EXM-01; các lượt khám trước của bệnh nhân tạo trạng thái nền.
- Sau đó: F-EXM-05 chẩn đoán, M7 kế hoạch điều trị; sơ đồ cũng nằm trong `GET api/examinations/{id}` (F-EXM-02).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: số răng biên (11, 18, 19, 48, 51, 55, 56, 85, 91, `4A`); tình trạng viết thường; đặt lại về như cũ thì bản ghi bị xóa; răng `Healthy` cũ bị ẩn; DELETE răng chưa ghi → 404.

## 9. Còn thiếu / câu hỏi mở

- Trạng thái nền lấy từ **mọi** phiếu trước đó của bệnh nhân, kể cả phiếu chưa khóa (`InProgress`). Chưa xác định từ code có chủ ý không.
- Sơ đồ răng không có trong `GET api/medical-records/examinations/{id}` (F-EXM-09).
- Không có unique index `(ExaminationId, ToothNumber)`; tính duy nhất chỉ do code đảm bảo.
- Cột `Condition` dài 100 nhưng giá trị hợp lệ là danh sách cố định; không có check constraint ở DB.

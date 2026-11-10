# F-IMG-05 Tải ảnh kết quả chụp và đọc thông tin DICOM

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M6, câu hỏi Q12.
>
> **Chức năng chưa làm.** Mục 3-6 là **ĐỀ XUẤT**, dựa trên bảng `ImagingResults` đã có. Chốt với nhóm trước khi code.

| Mục | Giá trị |
|---|---|
| Module | M6 Chụp phim (X-quang) |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | Đề xuất: `DentalImagingTechnician` tải lên; `Doctor` xem và đánh giá ảnh |
| API | Đề xuất: `POST api/imaging-requests/{id}/results`, `GET api/imaging-requests/{id}/results`, `GET api/imaging-results/{resultId}/file`, `POST api/imaging-results/{resultId}/review` |
| Code chính | Chưa có. Đề xuất: `ImagingRequestsController` → `ImagingRequestService` (hoặc `ImagingResultService` mới) → `ImagingRequestRepository` + dịch vụ lưu file mới |

## 1. Chức năng này làm gì

Kỹ thuật viên tải ảnh kết quả (DICOM và ảnh JPG/PNG xem trước) lên chỉ định chụp; hệ thống đọc các thẻ DICOM cơ bản để kiểm tra đúng bệnh nhân, đúng loại chụp. Bác sĩ xem ảnh trong phiếu khám, đánh dấu ảnh đạt (`Reviewed`) hoặc không đạt (`Rejected`) kèm ghi chú. Ảnh từ máy chụp giả lập cũng nên được lưu theo cùng luồng (webhook F-IMG-04 hiện bỏ qua `images`).

## 2. Tiền điều kiện

- Hiện trạng code: bảng `ImagingResults` và entity `ImagingResult` đã có (migration `InitialCreate`), **chưa có code nào ghi vào bảng**. `MedicalRecordService.cs:113-128` đã đọc bảng này để hiện ảnh trong hồ sơ bệnh án, ẩn ảnh `ReviewStatus = "Rejected"` (`MedicalRecordConstants.RejectedImageStatus`).
- Chưa có dịch vụ lưu file nào trong backend (không có `IFormFile`, blob, static files). Cần chọn nơi lưu trước.
- Đề xuất: chỉ định ở `Pending`/`InProgress` (tải xong thì gọi F-IMG-04) hoặc `Completed` (bổ sung ảnh); không nhận khi `Cancelled`.

## 3. API

**ĐỀ XUẤT 1** `POST api/imaging-requests/{id}/results`, quyền `DentalImagingTechnician`, `multipart/form-data`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | Chỉ định không `Cancelled` | Mã chỉ định |
| `files` | file[] | Có | `.dcm` (`application/dicom`), `.jpg`, `.png`; giới hạn dung lượng: chưa chốt | Ảnh kết quả |
| `technicianNotes` | string | Không | ≤ 500 (đề xuất) | Ghi chú kỹ thuật (không chẩn đoán, BR-IMG-05) |
| `completeRequest` | bool | Không | Mặc định `true` | Tải xong thì hoàn thành chỉ định như F-IMG-04 |

**Response** (`ApiResponse<List<ImagingResultResponse>>`, đề xuất mở rộng `ImagingResponse` hiện có)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `ResultId` | long | `ImagingResults.Id` |
| `FileName`, `FilePath` | string | Tên và đường dẫn lưu (không lộ đường dẫn vật lý; FE tải qua API file) |
| `FileSize`, `MimeType` | long?, string? | |
| `ReviewStatus` | string | `Pending` |
| `Dicom` | object? | Thẻ đọc được: `PatientID`, `PatientName`, `Modality`, `BodyPartExamined`, `StudyDate`/`AcquisitionDateTime`, `Manufacturer`, `DeviceSerialNumber` |
| `CreatedAt` | DateTimeOffset | |

**ĐỀ XUẤT 2** `GET api/imaging-requests/{id}/results`: bác sĩ của lượt khám (`HasDoctorAccess`) và kỹ thuật viên xem danh sách ảnh.

**ĐỀ XUẤT 3** `GET api/imaging-results/{resultId}/file`: trả file (kiểm quyền như trên), không dùng link tĩnh công khai.

**ĐỀ XUẤT 4** `POST api/imaging-results/{resultId}/review`, quyền `Doctor`: body `{ "reviewStatus": "Reviewed" | "Rejected", "doctorNotes": "..." }`.

**Lỗi đề xuất** (thêm vào `ErrorConstants.ImagingRequestMessage`)

| HTTP | Khi nào | Message đề xuất |
|---|---|---|
| 404 | Không có chỉ định / ảnh | `Imaging request not found.` (đã có) / mới: `Imaging result not found.` |
| 400 | Chỉ định đã hủy | mới: `Cannot upload images because the imaging request is {0}.` |
| 400 | Không có file, sai định dạng, quá dung lượng | mới |
| 400 | DICOM khác bệnh nhân / khác loại chụp | mới (cảnh báo hay chặn: chưa chốt) |
| 403 | Bác sĩ không có quyền với bệnh nhân | dùng lại `MedicalRecordMessage.AccessDenied` |

## 4. Luồng xử lý trong code

Chưa có code. Luồng đề xuất cho API 1:

1. Lấy chỉ định có tracking (`ImagingRequestRepository.GetTrackedByIdAsync`), kiểm tra trạng thái.
2. Lấy `StaffProfile` kỹ thuật viên (`IStaffRepository.GetByUserIdAsync`) cho `UploadedByTechnicianId`.
3. Kiểm định dạng, dung lượng; với `.dcm` đọc thẻ DICOM (thư viện, ví dụ fo-dicom: chưa chốt), so `Modality` với `ImagingType`.
4. Lưu file vào kho (dịch vụ mới), tạo `ImagingResult` (`ReviewStatus = "Pending"`), lưu cùng transaction.
5. Nếu `completeRequest`: gọi `CompleteAndReturnPatientAsync` (`ImagingRequestService.cs:272-313`).
6. Webhook F-IMG-04: với `images[]`, tải từng ảnh từ simulator `GET api/v1/captures/{simulationId}/images/{imageId}` (simulator yêu cầu header `X-Api-Key`) rồi chạy bước 4. Simulator đã sinh metadata "DICOM-aligned" (`AcquisitionService.cs` trong `oze-xray-simulator`) nhưng ảnh là `.png`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-IMG-05 | Kỹ thuật viên không chẩn đoán: chỉ ghi `TechnicianNotes` kỹ thuật | Đề xuất: service |
| Q12 (tạm) | DICOM và JPG xem trước; bác sĩ, kỹ thuật viên xem | Đề xuất: API 2, 3 |
| (đề xuất) | Ảnh `Rejected` không hiện trong hồ sơ bệnh án | Đã có ở `MedicalRecordService.cs:113-118` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ImagingResults` | | thêm dòng, `ReviewStatus = Pending` | Cột có sẵn: `FilePath` (1000), `FileName` (500), `FileSize`, `MimeType` (100), `TechnicianNotes`, `UploadedByTechnicianId`; ràng buộc `CK_ImagingResults_ReviewStatus` ∈ `Pending`, `Reviewed`, `Rejected` |
| `ImagingResults` (review) | `Pending` | `Reviewed`/`Rejected` | `ReviewedByDoctorId`, `DoctorNotes`, `ReviewedAt` |
| `ImagingRequests` | `Pending`/`InProgress` | `Completed` | Khi `completeRequest = true` |
| (mới) | | | Chưa có cột lưu thẻ DICOM: cần migration (ví dụ `ImagingResults.DicomMetadata` JSON, `StudyInstanceUid`) |

## 7. Liên quan

- Trước đó: F-IMG-01, F-IMG-02; webhook F-IMG-04.
- Sau đó: F-EXM-09 hồ sơ bệnh án (đã đọc `ImagingResults`); F-IMG-06 chụp lại khi ảnh `Rejected` do lỗi kỹ thuật.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: tải đúng / sai định dạng; chỉ định `Cancelled`; DICOM khác bệnh nhân; kỹ thuật viên không có `StaffProfile`; bác sĩ không có quyền xem; review `Rejected` thì ảnh ẩn khỏi hồ sơ.

## 9. Còn thiếu / câu hỏi mở

- Q12 chưa chốt: định dạng lưu, ai xem, **lưu bao lâu**.
- Chưa chọn nơi lưu file (ổ đĩa server, cloud) và giới hạn dung lượng.
- Chưa có cột lưu thẻ DICOM; chưa chọn thư viện đọc DICOM.
- Comment `WebhooksController.cs:41-46` ghi webhook lưu kết quả, code thực tế không lưu (lệch giữa comment và code).
- `ImagingResponse` hiện có (`OZE.Common/Models/ImagingResponse.cs`) chỉ dùng cho hồ sơ bệnh án.

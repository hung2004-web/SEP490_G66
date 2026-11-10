# F-IMG-01 Bác sĩ chỉ định chụp phim

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M6.

| Mục | Giá trị |
|---|---|
| Module | M6 Chụp phim (X-quang) |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `POST api/examinations/{examinationId}/imaging-requests` (kèm 2 API xem: `GET api/examinations/{examinationId}/imaging-requests`, `GET api/imaging-requests/{id}`) |
| Code chính | `ImagingRequestsController.CreateAsync` → `ImagingRequestService.CreateAsync` → `ImagingRequestRepository.AddAsync` (+ `AppointmentRepository.UpdateAsync`, `QueueService.UpdateStatusAsync` / `EnqueueAsync`) |

## 1. Chức năng này làm gì

Bác sĩ đang khám một lượt khám tạo chỉ định chụp phim (loại phim, vùng chụp, lý do lâm sàng). Hệ thống lưu chỉ định ở trạng thái `Pending`, gửi thông báo trong hệ thống cho mọi kỹ thuật viên đang hoạt động, trả bệnh nhân về `CHECKED_IN` để bác sĩ rảnh khám người khác, và đưa bệnh nhân vào hàng chờ `Imaging`.

## 2. Tiền điều kiện

- Đăng nhập, role `Doctor`, có `StaffProfile` gắn với user.
- Lượt khám `examinationId` tồn tại, `DoctorId` của lượt khám = bác sĩ đang gọi.
- `Examination.ExaminationStatus` = `InProgress` (thường là lịch hẹn đang `IN_SERVICE`, sau F-EXM-01).

## 3. API

**Request** `POST api/examinations/{examinationId:long}/imaging-requests`, quyền `[Authorize(Roles = "Doctor")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `examinationId` (route) | long | Có | | Lượt khám |
| `ImagingType` | string | Có | Một trong `Periapical X-ray`, `Panoramic`, `Cephalometric`, `CBCT`, `Intraoral Photo` (`ImagingRequestConstants.ImagingTypes`), so không phân biệt hoa thường, lưu theo cách viết chuẩn | Loại chụp |
| `TargetArea` | string | Có | Trim, ≤ 200 ký tự | Vùng chụp (ví dụ răng 36) |
| `ClinicalIndication` | string | Có | Trim, ≤ 500 ký tự | Lý do lâm sàng |

Ví dụ:

```json
{
  "imagingType": "panoramic",
  "targetArea": "Răng 36, 37",
  "clinicalIndication": "Nghi sâu răng lan tủy"
}
```

**Response thành công** (`ApiResponse<ImagingRequestResponse>`, HTTP 200, `message` = `"Imaging request has been submitted."`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `Id` | long | Mã chỉ định (dùng làm `orderReference` cho máy chụp, xem F-IMG-04) |
| `ExaminationId` | long | Lượt khám |
| `PatientId` | int | Bệnh nhân |
| `ImagingType` | string | Loại chụp đã chuẩn hóa, ví dụ `Panoramic` |
| `TargetArea` | string | Vùng chụp |
| `ClinicalIndication` | string | Lý do lâm sàng |
| `RequestStatus` | string | `Pending` |
| `CancelReason` | string? | `null` |
| `CreatedAt` | DateTimeOffset | Thời điểm tạo (UTC) |

JSON trả về dạng camelCase (mặc định ASP.NET Core).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | User không có `StaffProfile` | `Doctor profile not found` (`MedicalRecordMessage.DoctorNotFound`) |
| 404 | Không có lượt khám | `Examination not found` (`MedicalRecordMessage.ExaminationNotFound`) |
| 403 | Không phải bác sĩ của lượt khám | `You do not have permission to request imaging for this examination.` (`ImagingRequestMessage.NotExaminingDoctor`) |
| 400 | Lượt khám không `InProgress` | `Cannot request imaging because the examination is {0}.` (`{0}` = trạng thái hiện tại) |
| 400 | Thiếu / chỉ có khoảng trắng | `Please enter imaging type.` / `Please enter target area.` / `Please enter clinical indication.` |
| 400 | Loại chụp ngoài danh sách | `Imaging type is invalid. Please check again.` |
| 400 | `TargetArea` > 200 ký tự | `Target area is invalid. Please check again.` |
| 400 | `ClinicalIndication` > 500 ký tự | `Clinical indication is invalid. Please check again.` |
| 409 | Lịch hẹn bị người khác sửa cùng lúc (`RowVersion`) khi cập nhật về `CHECKED_IN` | `RecordChangedMeanwhile` (do `GlobalExceptionMiddleware`) |

**API xem đi kèm (bác sĩ)**

| API | Quyền | Kết quả | Lỗi riêng |
|---|---|---|---|
| `GET api/examinations/{examinationId}/imaging-requests` | `Doctor`, phải là bác sĩ của lượt khám | `List<ImagingRequestResponse>` mọi trạng thái, xếp theo `CreatedAt`, `Id` (`ImagingRequestService.cs:112-133`) | 403 `You do not have permission to view imaging requests for this examination.` |
| `GET api/imaging-requests/{id}` | `Doctor`, phải là bác sĩ đã tạo chỉ định | `ImagingRequestResponse` (`ImagingRequestService.cs:135-157`) | 404 `Imaging request not found.`; 403 `You do not have permission to view this imaging request.` |

## 4. Luồng xử lý trong code

1. Controller nhận request, lấy `CurrentUserId`, gọi service (`ImagingRequestsController.cs:96-112`).
2. Tìm `StaffProfile` theo user, không có → 404 (`ImagingRequestService.cs:35-36`).
3. Lấy lượt khám kèm `Patient`, `Appointment` (`ImagingRequestService.cs:38-39`, `ImagingRequestRepository.cs:18-24`).
4. Kiểm tra đúng bác sĩ khám → 403 (`ImagingRequestService.cs:41-43`).
5. Kiểm tra `ExaminationStatus == "InProgress"` → 400 (`ImagingRequestService.cs:45-47`).
6. Trim và bắt buộc 3 trường (`ImagingRequestService.cs:49-51`, `RequireValue` ở `:322-327`).
7. Chuẩn hóa loại chụp theo danh sách, kiểm tra độ dài (`ImagingRequestService.cs:53-59`).
8. Dựng `ImagingRequest` trạng thái `Pending`, `CreatedAt = DateTimeOffset.UtcNow` (`ImagingRequestService.cs:61-71`).
9. Lấy tên bệnh nhân (rỗng thì "the patient") và danh sách `UserId` kỹ thuật viên đang hoạt động: `StaffProfile.IsActive` và role `DentalImagingTechnician` (`ImagingRequestService.cs:73-76`, `ImagingRequestRepository.cs:70-80`).
10. `AddAsync` trong **một transaction**: lưu chỉ định, rồi thêm một `Notification` cho mỗi kỹ thuật viên (`Title = "New imaging request"`, `Message = "Imaging request ({0}) for {1} has been submitted."`, `NotificationType`/`Channel = "InApp"`, `ReferenceType = "ImagingRequest"`, `ReferenceId = Id`, `DeliveryStatus = "Sent"`), commit (`ImagingRequestService.cs:78-83`, `ImagingRequestRepository.cs:82-123`).
11. Nếu lượt khám có lịch hẹn: `Appointment.Status = "CHECKED_IN"`, lưu (`ImagingRequestService.cs:86-94`). Bước này **ngoài transaction** của bước 10.
12. Hàng chờ: mục `Examination` của lịch hẹn về `WAITING`; thêm mục hàng chờ `Imaging` với `Priority = 1`, `Notes = "Imaging: {loại} - {vùng}"`, không gán phòng (`ImagingRequestService.cs:96-107`, `QueueService.cs:28-93`).
13. Trả `ImagingRequestResponse` (`ImagingRequestService.cs:109`, `:329-343`).

Tác động lên danh sách chờ khám: `AppointmentRepository.GetWaitingAppointmentsAsync` loại bệnh nhân có chỉ định `Pending`/`InProgress` (`AppointmentRepository.cs:245-251`), nên bệnh nhân không hiện trong danh sách chờ của bác sĩ trong lúc đi chụp.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-IMG-01 | Chỉ bác sĩ đang khám lượt đó được chỉ định; loại chụp trong danh sách cho phép | `ImagingRequestService.cs:41-47`, `:53-55` |
| BR-IMG-02 | Tạo chỉ định thì báo cho kỹ thuật viên đang hoạt động (`Notification`) | `ImagingRequestRepository.cs:70-123` |
| BR-IMG-03 | Chỉ định đang mở: lịch về `CHECKED_IN`, bệnh nhân ra khỏi danh sách chờ khám | `ImagingRequestService.cs:86-94`, `AppointmentRepository.cs:245-251` |
| BR-EXM-03 | Quay lại sau chụp thì tiếp tục phiếu cũ (ở F-EXM-01) | `AppointmentService.cs:1047-1053` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ImagingRequests` | (chưa có) | `Pending` | `RequestedByDoctorId` = bác sĩ |
| `Notifications` | | 1 dòng / kỹ thuật viên đang hoạt động | `IsRead = false`, `DeliveryStatus = Sent` |
| `Appointments.Status` | `IN_SERVICE` | `CHECKED_IN` | Bác sĩ được rảnh để bắt đầu khám người khác |
| `QueueEntries` (`Examination`) | `IN_PROGRESS` | `WAITING` | Chỉ khi có mục đang hoạt động |
| `QueueEntries` (`Imaging`) | | `WAITING`, `Priority = 1` | Có số thứ tự mới trong ngày |
| `Examinations` | `InProgress` | `InProgress` | Không đổi |

## 7. Liên quan

- Trước đó: F-EXM-01 bắt đầu khám (lượt khám `InProgress`).
- Sau đó: F-IMG-02 hàng chờ kỹ thuật viên, F-IMG-03 hủy chỉ định, F-IMG-04 hoàn thành chụp; F-CRM-03 đọc thông báo đã ghi ở bước 10.

## 8. Kiểm thử

- Test hiện có (`ImagingRequestServiceTests`): `CreateAsync_ShouldSavePendingRequest_AndNotifyActiveTechnicians`, `CreateAsync_ShouldRejectMissingFields`, `CreateAsync_ShouldRejectImagingTypeOutsideTheAllowedList`, `CreateAsync_ShouldRejectExaminationThatIsNotInProgress`, `CreateAsync_ShouldRejectDoctorWhoIsNotExaminingThisVisit`, `CreateAsync_ShouldReturnNotFound_WhenExaminationDoesNotExist`, `CreateAsync_ShouldReturnNotFound_WhenDoctorProfileDoesNotExist`; xem: `GetByExaminationAsync_*` (4 ca), `GetByIdAsync_*` (3 ca).
- Ca cần test thêm: service trong test được tạo **không có** `IAppointmentRepository`, `IQueueService`, nên chưa test lịch về `CHECKED_IN`, mục hàng chờ `Examination` về `WAITING`, thêm mục `Imaging`; độ dài `TargetArea` 201 / `ClinicalIndication` 501; không có kỹ thuật viên nào đang hoạt động (không ghi `Notification`).

## 9. Còn thiếu / câu hỏi mở

- Lưu chỉ định + thông báo nằm trong transaction, nhưng cập nhật lịch hẹn và hàng chờ là các lần lưu riêng. Lỗi ở bước 11-12 (ví dụ 409 `RowVersion`) thì chỉ định đã được lưu nhưng lịch vẫn `IN_SERVICE`.
- Mức ưu tiên hàng chờ `Imaging` cố định `1`, không gán phòng `XRay`. Chưa xác định từ code việc chọn phòng chụp.
- Không ghi `AuditLog` khi đổi lịch `IN_SERVICE` → `CHECKED_IN`.
- Thông báo gửi cho mọi kỹ thuật viên `IsActive`, không xét ca làm việc.
- Thời điểm dùng `DateTimeOffset.UtcNow` (mốc thời điểm, phù hợp BR-C02); số thứ tự hàng chờ lấy theo `ClinicClock.Today`.
- Q12 (định dạng, người xem, thời gian lưu ảnh) chưa chốt, liên quan F-IMG-05.

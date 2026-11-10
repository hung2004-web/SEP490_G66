# F-EXM-03 Dịch vụ trên phiếu khám

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M5.

| Mục | Giá trị |
|---|---|
| Module | M5 Khám bệnh |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` (bác sĩ của phiếu) |
| API | `POST api/examinations/{id}/services`, `PUT api/examinations/{id}/services/{serviceItemId}`, `DELETE api/examinations/{id}/services/{serviceItemId}` |
| Code chính | `ExaminationsController.AddServiceAsync` / `UpdateServiceAsync` / `RemoveServiceAsync` → `ExaminationService` cùng tên → `ExaminationRepository` (`GetForWorkAsync`, `GetServiceAsync`, `GetVariantAsync`, `GetConfigValueAsync`, `RemoveServiceItem`, `SaveChangesAsync`) |

## 1. Chức năng này làm gì

Trong lúc khám, bác sĩ thêm, đổi hoặc bỏ dịch vụ trên lịch hẹn của phiếu khám (bảng `AppointmentServiceItems`). Giá và thời lượng được chốt tại thời điểm thêm/đổi. Dịch vụ thêm sau khi bắt đầu khám được đánh dấu `addedDuringExamination = true`.

## 2. Tiền điều kiện

- Như F-EXM-02: role `Doctor`, có `StaffProfile`, là bác sĩ của phiếu, phiếu `InProgress`.
- Dịch vụ (và biến thể nếu chọn) tồn tại, `IsActive = true`; biến thể thuộc đúng dịch vụ.
- Cấu hình `Clinic.SlotDurationMinutes` có trong `SystemConfigurations` và là số nguyên (dùng khi dịch vụ/biến thể không có `EstimatedMinutes`).

## 3. API

**Request** `POST api/examinations/{id}/services` và `PUT api/examinations/{id}/services/{serviceItemId}`, quyền `Doctor`. Body `SaveExaminationServiceRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `serviceId` | `int?` | Có (`[Required]`) | Dịch vụ tồn tại, đang hoạt động | Dịch vụ |
| `variantId` | `int?` | Không | Biến thể tồn tại, thuộc `serviceId`, đang hoạt động | Biến thể được chọn |

`serviceItemId` (route, `long`) là `AppointmentServiceItem.Id`.

Ví dụ:

```json
{ "serviceId": 12, "variantId": 31 }
```

**Request** `DELETE api/examinations/{id}/services/{serviceItemId}`: không có body.

**Response thành công** (`ApiResponse<List<ExaminationServiceResponse>>`, HTTP 200, message `"Service added"` / `"Service updated"` / `"Service removed"`). Danh sách toàn bộ dòng dịch vụ sau thay đổi, sắp theo `CreatedAt`, `Id`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `long` | `AppointmentServiceItem.Id` |
| `serviceId` | `int` | Dịch vụ |
| `variantId` | `int?` | Biến thể |
| `serviceName` | `string` | Tên dịch vụ |
| `variantName` | `string?` | Tên biến thể |
| `price` | `decimal` | `PriceAtBooking` đã chốt |
| `durationMinutes` | `int` | Thời lượng đã chốt |
| `addedDuringExamination` | `bool` | `true` nếu `CreatedAt` của dòng ≥ `Examination.CreatedAt` |

**Lỗi** (ngoài lỗi chung ở F-EXM-02: 404 `DoctorNotFound`, 404 `ExaminationNotFound`, 403 `NotExaminingDoctor`, 400 `AlreadyLocked`, 409 `RecordChangedMeanwhile`)

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `serviceId` | ProblemDetails mặc định của `[ApiController]` |
| 404 | Không có dịch vụ | `AppointmentMessage.ServiceNotFound` = "Service not found" |
| 400 | Dịch vụ ngừng hoạt động | `AppointmentMessage.ServiceInactive` = "This service is not available for booking" |
| 404 | Không có biến thể | `AppointmentMessage.VariantNotFound` = "Service variant not found" |
| 400 | Biến thể không thuộc dịch vụ | `ExaminationMessage.VariantMismatch` = "This variant does not belong to the selected service" |
| 400 | Biến thể ngừng hoạt động | `AppointmentMessage.VariantInactive` = "This service variant is not available for booking" |
| 400 | Cặp dịch vụ + biến thể đã có trên lịch | `ExaminationMessage.ServiceAlreadyAdded` = "This service is already in the appointment" |
| 400 | Các dịch vụ cần loại phòng khác nhau | `AppointmentMessage.ServicesNeedDifferentRooms` = "These services need different rooms and cannot be booked in one appointment" |
| 400 | Thiếu/sai cấu hình slot | `AppointmentMessage.ConfigMissing` = "System configuration {0} is missing" ({0} = `Clinic.SlotDurationMinutes`) |
| 404 | (PUT/DELETE) Không có dòng dịch vụ trên lịch này | `ExaminationMessage.ServiceItemNotFound` = "Service not found in this appointment" |
| 400 | (DELETE) Xóa dòng cuối cùng | `ExaminationMessage.CannotRemoveLastService` = "An appointment must keep at least one service" |

## 4. Luồng xử lý trong code

Bước chung `LoadAsync` + `EnsureOpen` (quyền bác sĩ, khóa phiếu, `RowVersion`): xem F-EXM-02 mục 4, `ExaminationService.cs:556-574`.

**Thêm (`AddServiceAsync`)** — `ExaminationService.cs:47-72`

1. `LoadAsync`, `EnsureOpen` — dòng 49-50.
2. `ResolveServiceAsync`: dịch vụ tồn tại (404) và `IsActive`; nếu có `variantId`: biến thể tồn tại (404), thuộc dịch vụ (`VariantMismatch`), `IsActive` — dòng 52, `385-401`.
3. `EnsureServiceFits(items, service, variant, null)`: không trùng cặp `ServiceId` + `VariantId`; tất cả dịch vụ (khác rỗng) cùng một `RequiredRoomType` — dòng 54, `403-417`.
4. Đọc `Clinic.SlotDurationMinutes` — dòng 56, `576-582`.
5. Thêm `AppointmentServiceItem` với `DurationMinutes = variant.EstimatedMinutes ?? service.EstimatedMinutes ?? slotMinutes`, `PriceAtBooking = variant?.ReferencePrice ?? service.ReferencePrice`, `CreatedAt = now` — dòng 57-68.
6. `SaveChangesAsync` (kiểm tra `RowVersion` phiếu) và trả danh sách — dòng 70-71.

**Đổi (`UpdateServiceAsync`)** — `ExaminationService.cs:74-102`

1. `LoadAsync`, `EnsureOpen` — dòng 76-77.
2. Tìm dòng theo `serviceItemId` trong lịch của phiếu → 404 `ServiceItemNotFound` — dòng 79-81.
3. `ResolveServiceAsync` — dòng 83.
4. Chọn đúng cặp dịch vụ/biến thể hiện có → trả về luôn, không lưu — dòng 85-88.
5. `EnsureServiceFits` loại trừ chính dòng đang đổi — dòng 89.
6. Gán dịch vụ/biến thể mới, chốt lại giá và thời lượng; giữ nguyên `CreatedAt` (nên giữ nguyên dấu "thêm trong lúc khám") — dòng 91-98.
7. `SaveChangesAsync`, trả danh sách — dòng 100-101.

**Bỏ (`RemoveServiceAsync`)** — `ExaminationService.cs:104-117`

1. `LoadAsync`, `EnsureOpen` — dòng 106-107.
2. Tìm dòng → 404 `ServiceItemNotFound`; lịch phải còn > 1 dòng → `CannotRemoveLastService` — dòng 109-112.
3. `RemoveServiceItem` (xóa cứng), `SaveChangesAsync`, trả danh sách còn lại — dòng 114-116, `ExaminationRepository.cs:68-71`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-C05 | Giá và thời lượng chốt tại thời điểm thêm/đổi | `ExaminationService.cs:64-66`, `96-98` |
| (Phòng) | Một lịch hẹn chỉ dùng một loại phòng, như khi đặt lịch | `ExaminationService.cs:410-416` |
| (Trùng) | Không trùng cặp dịch vụ + biến thể | `ExaminationService.cs:407-408` |
| (Tối thiểu) | Lịch luôn còn ít nhất một dịch vụ | `ExaminationService.cs:112` |
| BR-EXM-04 | Phiếu khóa không sửa | `ExaminationService.cs:570` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `AppointmentServiceItems` | | insert / update / delete cứng | Thuộc `Appointment` của phiếu |
| `Examinations.UpdatedAt`, `RowVersion` | | đổi | Do `EnsureOpen` |

Không đổi trạng thái lịch hay phiếu. Không ghi `AuditLog`.

## 7. Liên quan

- Trước đó: F-EXM-01; dịch vụ ban đầu từ lúc đặt lịch (M3) hoặc walk-in (M4).
- Sau đó: F-EXM-07 hoàn tất khám; thu ngân (M8). Cách hóa đơn dùng các dòng dịch vụ này: Chưa xác định từ code (không thấy `InvoiceService` đọc `AppointmentServiceItems`).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test thêm: thêm trùng; biến thể sai dịch vụ; khác loại phòng; đổi sang chính nó không lưu; xóa dòng cuối; giá chốt từ biến thể khi có; `addedDuringExamination` đúng; thiếu cấu hình slot.

## 9. Còn thiếu / câu hỏi mở

- Dac_ta ghi API là `POST/PUT/DELETE examinations/{id}/services`; code PUT/DELETE có thêm `{serviceItemId}` và tiền tố `api/`.
- Thêm/đổi dịch vụ không tính lại `TimeSlotEnd` của lịch hẹn. Chưa xác định từ code có cần không.
- Xóa dòng dịch vụ là xóa cứng, kể cả dòng có từ lúc đặt lịch; không ghi audit.
- Message `ServiceInactive`/`VariantInactive` nói "not available for booking" dù đây là bác sĩ thêm trong lúc khám.

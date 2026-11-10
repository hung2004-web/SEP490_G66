# F-IMG-03 Hủy chỉ định chụp phim

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M6.

| Mục | Giá trị |
|---|---|
| Module | M6 Chụp phim (X-quang) |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` (chỉ bác sĩ đã tạo chỉ định) |
| API | `POST api/imaging-requests/{id}/cancel` |
| Code chính | `ImagingRequestsController.CancelAsync` → `ImagingRequestService.CancelAsync` → `ImagingRequestRepository.GetTrackedByIdAsync` / `SaveChangesAsync` (+ `QueueService.UpdateStatusAsync`) |

## 1. Chức năng này làm gì

Bác sĩ hủy một chỉ định chụp còn đang chờ (`Pending`) và ghi lý do. Chỉ định chuyển `Cancelled`, vẫn giữ loại chụp, vùng chụp, lý do lâm sàng. Nếu lượt khám không còn chỉ định nào đang mở, bệnh nhân rời hàng chờ `Imaging` và hiện lại trong danh sách chờ khám của bác sĩ.

## 2. Tiền điều kiện

- Đăng nhập, role `Doctor`, có `StaffProfile`.
- Chỉ định tồn tại, `RequestedByDoctorId` = bác sĩ đang gọi.
- `RequestStatus = Pending`.

## 3. API

**Request** `POST api/imaging-requests/{id:long}/cancel`, quyền `[Authorize(Roles = "Doctor")]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | | Mã chỉ định |
| `CancelReason` | string | Có | Trim, ≤ 500 ký tự | Lý do hủy |

Ví dụ:

```json
{ "cancelReason": "Đã có phim chụp ở cơ sở khác trong tuần" }
```

**Response thành công** (`ApiResponse<ImagingRequestResponse>`, HTTP 200, `message` = `"Cancel imaging request success!"`)

Cùng các trường `ImagingRequestResponse` như F-IMG-01, với `RequestStatus = "Cancelled"`, `CancelReason` = lý do đã trim.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | User không có `StaffProfile` | `Doctor profile not found` |
| 404 | Không có chỉ định | `Imaging request not found.` |
| 403 | Không phải bác sĩ tạo chỉ định | `You do not have permission to cancel this imaging request.` |
| 400 | Chỉ định không `Pending` | `Cannot cancel imaging request because the imaging request is {0}.` (`{0}` = trạng thái hiện tại) |
| 400 | Thiếu lý do | `Please enter cancel reason.` |
| 400 | Lý do > 500 ký tự | `Cancel reason is invalid. Please check again.` |
| 404 | Không nạp được lượt khám của chỉ định | `Examination not found` |

## 4. Luồng xử lý trong code

1. Controller gọi service với `CurrentUserId` (`ImagingRequestsController.cs:75-91`).
2. Tìm bác sĩ (`ImagingRequestService.cs:165-166`).
3. Lấy chỉ định có tracking, kèm `Examination` (`ImagingRequestService.cs:168-170`, `ImagingRequestRepository.cs:44-49`).
4. Kiểm tra người tạo → 403 (`ImagingRequestService.cs:172-174`), trạng thái `Pending` → 400 (`:175-177`).
5. Bắt buộc và kiểm tra độ dài lý do (`ImagingRequestService.cs:179-182`).
6. Kiểm tra có `Examination` (`ImagingRequestService.cs:184-188`).
7. Ghi `RequestStatus = "Cancelled"`, `CancelReason`, `UpdatedAt = UtcNow`, lưu (`ImagingRequestService.cs:190-194`).
8. Nếu không còn chỉ định khác của cùng lượt khám ở `Pending`/`InProgress` (`HasOtherOpenRequestAsync`, `:316-320`): mục hàng chờ `Imaging` của lịch hẹn → `CANCELLED` (`ImagingRequestService.cs:197-200`).
9. Trả response (`ImagingRequestService.cs:202`).

Sau bước 7, `AppointmentRepository.GetWaitingAppointmentsAsync` không còn loại bệnh nhân (`AppointmentRepository.cs:245-251`); lịch đang `CHECKED_IN` và đã có `Examination` nên rơi vào nhóm "quay lại" (`PriorityReturnGroup`, `AppointmentService.cs:492-497`) với mức ưu tiên cũ của lịch.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| Vòng đời mục 3 | `Pending` → `Cancelled`; hủy vẫn giữ ghi chú lâm sàng | `ImagingRequestService.cs:175-192` |
| BR-IMG-03 | Hết chỉ định mở thì bệnh nhân không còn bị ẩn khỏi danh sách chờ khám | `AppointmentRepository.cs:245-251` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ImagingRequests` | `Pending` | `Cancelled` | Lưu `CancelReason`, `UpdatedAt`; `ClinicalIndication` giữ nguyên |
| `QueueEntries` (`Imaging`) | `WAITING`/`CALLED`/`IN_PROGRESS` | `CANCELLED` | Chỉ khi không còn chỉ định mở khác; có `CompletedAt` |
| `Appointments` | `CHECKED_IN` | `CHECKED_IN` | Không đổi trạng thái, không đổi `Priority` |

## 7. Liên quan

- Trước đó: F-IMG-01.
- Sau đó: bác sĩ tiếp tục khám qua F-EXM-01 (tiếp tục phiếu cũ, BR-EXM-03).

## 8. Kiểm thử

- Test hiện có: `ImagingRequestServiceTests.CancelAsync_ShouldCancelPendingRequest_AndKeepClinicalNotes`, `CancelAsync_ShouldRejectMissingReason`, `CancelAsync_ShouldRejectRequestThatIsNotPending`, `CancelAsync_ShouldRejectDoctorWhoDidNotCreateTheRequest`, `CancelAsync_ShouldReturnNotFound_WhenRequestDoesNotExist`.
- Ca cần test thêm: hàng chờ `Imaging` về `CANCELLED` khi là chỉ định mở cuối cùng, và **không** đổi khi còn chỉ định khác; lý do 501 ký tự.

## 9. Còn thiếu / câu hỏi mở

- Không hủy được chỉ định `InProgress` (ví dụ máy hỏng giữa chừng). Chưa xác định từ code cách xử lý; liên quan F-IMG-06.
- Không ghi `AuditLog` và không lưu người hủy, thời điểm hủy riêng (chỉ có `UpdatedAt`). Khác với kế hoạch điều trị (`CancelledByUserId`, `CancelledAt`).
- Không có thông báo cho kỹ thuật viên khi chỉ định bị hủy; `Notification` đã gửi lúc tạo vẫn còn.
- Bác sĩ khác (ví dụ sau `reassign-doctor`) không hủy được chỉ định của bác sĩ cũ.
- Bác sĩ không được chọn lại mức ưu tiên khi bệnh nhân quay lại sau hủy (khác F-IMG-04 đặt `Urgent`). Tài liệu tổng không nói rõ trường hợp hủy.

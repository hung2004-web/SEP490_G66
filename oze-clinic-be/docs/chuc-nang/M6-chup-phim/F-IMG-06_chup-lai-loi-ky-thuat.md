# F-IMG-06 Chụp lại do lỗi kỹ thuật

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M6 (BR-IMG-05).
>
> **Chức năng chưa làm.** Mục 3-6 là **ĐỀ XUẤT**, dựa trên `ImagingRequests`, `ImagingResults`, hàng chờ hiện có. Chốt với nhóm trước khi code.

| Mục | Giá trị |
|---|---|
| Module | M6 Chụp phim (X-quang) |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | Đề xuất: `DentalImagingTechnician` (phát hiện ngay khi chụp), `Doctor` (phát hiện khi đọc phim) |
| API | Đề xuất: `POST api/imaging-requests/{id}/retake` |
| Code chính | Chưa có. Đề xuất: `ImagingRequestsController.RetakeAsync` → `ImagingRequestService.RetakeAsync` → `ImagingRequestRepository` + `QueueService` |

## 1. Chức năng này làm gì

Khi phim hỏng vì lỗi kỹ thuật (mờ, sai tư thế, lỗi máy), kỹ thuật viên hoặc bác sĩ yêu cầu chụp lại. Hệ thống tạo chỉ định chụp lại liên kết với chỉ định gốc, đưa bệnh nhân lại vào hàng chờ chụp, đánh dấu ảnh hỏng `Rejected`, và **không tính phí** lần chụp lại (phòng khám chịu, BR-IMG-05).

## 2. Tiền điều kiện

- Hiện trạng code: chưa có luồng nào. Sự kiện `CAPTURE_FAILED` của simulator đang bị bỏ qua (`ImagingRequestService.cs:237-241`); chỉ định `InProgress` không hủy được (`ImagingRequestService.cs:175-177`).
- Đề xuất: chỉ định gốc ở `InProgress` hoặc `Completed`; lượt khám vẫn `InProgress` (chưa hoàn tất khám).
- Phụ thuộc F-IMG-05 nếu muốn đánh dấu ảnh hỏng (`ImagingResults` hiện chưa được ghi).

## 3. API

**ĐỀ XUẤT** `POST api/imaging-requests/{id}/retake`, quyền `DentalImagingTechnician`, `Doctor`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | | Chỉ định gốc |
| `reason` | string | Có | ≤ 500 | Lỗi kỹ thuật gì |
| `rejectedResultIds` | long[] | Không | Thuộc chỉ định gốc | Ảnh hỏng, chuyển `Rejected` |

Ví dụ:

```json
{ "reason": "Phim mờ do bệnh nhân cử động", "rejectedResultIds": [501] }
```

**Response** (`ApiResponse<ImagingRequestResponse>`): chỉ định mới `Pending`, cùng `ImagingType`, `TargetArea`, `ClinicalIndication` với chỉ định gốc.

**Lỗi đề xuất**

| HTTP | Khi nào | Message đề xuất |
|---|---|---|
| 404 | Không có chỉ định | `Imaging request not found.` (đã có) |
| 400 | Chỉ định gốc `Pending`/`Cancelled` | mới: `Cannot retake imaging because the imaging request is {0}.` |
| 400 | Lượt khám không `InProgress` | dùng lại `Cannot request imaging because the examination is {0}.` |
| 400 | Thiếu / quá dài lý do | mới, theo mẫu `Please enter ...` / `... is invalid. Please check again.` |
| 403 | Bác sĩ không phải người khám lượt đó | dùng lại `NotExaminingDoctor` |

## 4. Luồng xử lý trong code

Chưa có code. Luồng đề xuất:

1. Lấy chỉ định gốc có tracking và lượt khám; kiểm vai trò và trạng thái.
2. Nếu gốc đang `InProgress`: chuyển `Completed` (hoặc `Cancelled` với `CancelReason` = lý do) để không còn hai chỉ định mở cho cùng một lần chụp.
3. Đánh `ImagingResults.ReviewStatus = "Rejected"` cho `rejectedResultIds` (ảnh bị ẩn khỏi hồ sơ, `MedicalRecordService.cs:113-118`).
4. Tạo `ImagingRequest` mới `Pending`, ghi liên kết với gốc và lý do (xem mục 6), dùng lại `ImagingRequestRepository.AddAsync` để báo kỹ thuật viên.
5. Hàng chờ: thêm mục `Imaging` (ưu tiên cao hơn mục thường, đề xuất `PriorityConstants.Urgent`); nếu lịch đang `IN_SERVICE` thì về `CHECKED_IN` như F-IMG-01 (`ImagingRequestService.cs:86-107`).
6. Webhook `CAPTURE_FAILED` (F-IMG-04): ghi chỉ định gốc về lại `Pending` (hoặc gọi luồng này với lý do = `failureMessage`) thay vì bỏ qua.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-IMG-05 | Chụp lại do lỗi kỹ thuật thì phòng khám chịu phí; kỹ thuật viên không chẩn đoán | Đề xuất: cờ chụp lại để bỏ qua khi lập hóa đơn (F-PAY-01) |
| BR-IMG-03, BR-IMG-04 | Đi chụp lại thì ra khỏi danh sách chờ khám; chụp xong quay lại `Urgent` | Dùng lại `AppointmentRepository.cs:245-251`, `ImagingRequestService.cs:272-313` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ImagingRequests` (gốc) | `InProgress`/`Completed` | `Completed` (hoặc `Cancelled`) | |
| `ImagingRequests` (mới) | | `Pending` | Cần migration: `RetakeOfRequestId` (FK tự tham chiếu), `RetakeReason`; tạm thời có thể ghi vào cột `Notes` đang bỏ trống |
| `ImagingResults` | `Pending` | `Rejected` | `DoctorNotes`/`TechnicianNotes` = lý do |
| `QueueEntries` (`Imaging`) | | `WAITING` | |
| `Notifications` | | 1 dòng / kỹ thuật viên | Như F-IMG-01 |

## 7. Liên quan

- Trước đó: F-IMG-04 hoàn thành chụp, F-IMG-05 xem/đánh giá ảnh.
- Sau đó: F-IMG-02 hàng chờ; F-PAY-01 lập hóa đơn (không tính lần chụp lại).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: chụp lại từ `Completed` và `InProgress`; từ chối `Pending`/`Cancelled`; lượt khám đã khóa; ảnh hỏng bị ẩn khỏi hồ sơ; chỉ định mới không vào hóa đơn.

## 9. Còn thiếu / câu hỏi mở

- Chưa xác định từ code chụp phim được tính tiền thế nào: `ImagingRequest` không gắn `ServiceId`, hóa đơn (F-PAY-01) không đọc `ImagingRequests`. Nên "phòng khám chịu phí" hiện chưa có chỗ để áp dụng.
- Ai được yêu cầu chụp lại (kỹ thuật viên, bác sĩ hay cả hai) chưa chốt.
- Giới hạn số lần chụp lại, có cần ghi `AuditLog` không: chưa chốt.

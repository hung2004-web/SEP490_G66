# F-IMG-02 Hàng chờ chụp phim của kỹ thuật viên

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M6.

| Mục | Giá trị |
|---|---|
| Module | M6 Chụp phim (X-quang) |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `DentalImagingTechnician` |
| API | `GET api/imaging-requests/queue` |
| Code chính | `ImagingRequestsController.GetQueueAsync` → `ImagingRequestService.GetQueueAsync` → `ImagingRequestRepository.GetQueueAsync` |

## 1. Chức năng này làm gì

Kỹ thuật viên xem danh sách chỉ định chụp đang chờ (`Pending`) hoặc đang chụp (`InProgress`) của toàn phòng khám, theo thứ tự thời gian bác sĩ chỉ định, để biết phải chụp ai, loại phim gì, vùng nào và lý do lâm sàng.

## 2. Tiền điều kiện

- Đăng nhập, role `DentalImagingTechnician`.
- Không cần tham số. Không lọc theo ngày, phòng hay kỹ thuật viên.

## 3. API

**Request** `GET api/imaging-requests/queue`, quyền `[Authorize(Roles = "DentalImagingTechnician")]`

Không có tham số.

**Response thành công** (`ApiResponse<List<ImagingRequestQueueResponse>>`, HTTP 200)

`message` = `"Success"` khi có dữ liệu, `"No Data."` (`ImagingRequestMessage.QueueEmpty`) khi danh sách rỗng (vẫn HTTP 200, `data = []`).

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `Id` | long | Mã chỉ định |
| `PatientId` | int | Bệnh nhân (0 nếu không nạp được lượt khám) |
| `PatientName` | string | Họ tên bệnh nhân (đã trim) |
| `DoctorName` | string | Bác sĩ chỉ định |
| `ImagingType` | string | Loại chụp |
| `TargetArea` | string | Vùng chụp |
| `ClinicalIndication` | string | Lý do lâm sàng |
| `RequestStatus` | string | `Pending` hoặc `InProgress` |
| `CreatedAt` | DateTimeOffset | Thời điểm chỉ định |

Ví dụ:

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": 99,
      "patientId": 12,
      "patientName": "Nguyen Van A",
      "doctorName": "Dr An",
      "imagingType": "Panoramic",
      "targetArea": "Răng 36",
      "clinicalIndication": "Nghi sâu răng",
      "requestStatus": "Pending",
      "createdAt": "2026-11-10T02:15:00+00:00"
    }
  ]
}
```

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401 | Chưa đăng nhập | (do ASP.NET Core) |
| 403 | Không phải role `DentalImagingTechnician` | (do ASP.NET Core) |

## 4. Luồng xử lý trong code

1. Controller gọi service, chọn message theo số phần tử (`ImagingRequestsController.cs:25-36`).
2. Repository lấy `ImagingRequests` `AsNoTracking`, kèm `Examination.Patient`, `RequestedByDoctor`, lọc `RequestStatus` ∈ {`Pending`, `InProgress`}, xếp `CreatedAt`, `Id` (`ImagingRequestRepository.cs:51-63`).
3. Service lọc lại theo `ImagingRequestConstants.QueueStatuses`, xếp lại `CreatedAt`, `Id`, map sang `ImagingRequestQueueResponse` (`ImagingRequestService.cs:205-214`, `ToQueueResponse` ở `:345-359`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (BR-081 trong comment code) | Hàng chờ chỉ gồm `Pending`, `InProgress`, theo thứ tự thời gian chỉ định | `ImagingRequestConstants.cs:11-12`, `ImagingRequestRepository.cs:58-61` |
| BR-IMG-05 | Kỹ thuật viên không chẩn đoán: response không có trường chẩn đoán | `ImagingRequestQueueResponse.cs` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| (không) | | | Chỉ đọc |

## 7. Liên quan

- Trước đó: F-IMG-01 tạo chỉ định `Pending`.
- Sau đó: F-IMG-04 hoàn thành chụp; F-IMG-05 tải ảnh (chưa làm).
- Song song: hàng chờ dạng số thứ tự `QueueEntries` loại `Imaging` xem qua `api/queues` (`QueuesController`, role kỹ thuật viên được phép), do F-IMG-01 tạo.

## 8. Kiểm thử

- Test hiện có: `ImagingRequestServiceTests.GetQueueAsync_ShouldReturnPendingAndInProgressRequestsInRequestTimeOrder`, `GetQueueAsync_ShouldReturnEmptyList_WhenNoRequestIsWaiting`.
- Ca cần test thêm: controller trả message `"No Data."` khi rỗng; chỉ định `Completed`/`Cancelled` không xuất hiện; quyền role khác bị 403.

## 9. Còn thiếu / câu hỏi mở

- **Không có API nào chuyển chỉ định sang `InProgress`** (kỹ thuật viên "bắt đầu chụp"). Hàng chờ có xử lý `InProgress` nhưng trong code hiện tại trạng thái này không bao giờ được ghi. Chưa xác định từ code có cần thêm `POST imaging-requests/{id}/start` không.
- Không lọc theo ngày: chỉ định `Pending` bị bỏ quên từ hôm trước vẫn nằm trong hàng chờ.
- Thứ tự chỉ theo `CreatedAt`, không theo mức ưu tiên của lịch hẹn.
- Hai hàng chờ song song (`ImagingRequests` ở API này và `QueueEntries` loại `Imaging`) có thể lệch nhau; chưa xác định từ code FE dùng nguồn nào.
- Message `"Success"` viết cứng trong controller, không nằm trong `ErrorConstants` (BR-C08).

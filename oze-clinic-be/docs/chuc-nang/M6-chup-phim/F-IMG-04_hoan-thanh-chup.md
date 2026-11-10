# F-IMG-04 Hoàn thành chụp phim

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M6.

| Mục | Giá trị |
|---|---|
| Module | M6 Chụp phim (X-quang) |
| Trạng thái | ✅ Đã có API (chưa lưu ảnh kết quả, xem F-IMG-05) |
| Vai trò được dùng | `DentalImagingTechnician` (bấm tay); máy chụp giả lập gọi webhook (không đăng nhập, ký HMAC) |
| API | `POST api/imaging-requests/{id}/complete`; `POST api/webhooks/imaging-simulator` |
| Code chính | `ImagingRequestsController.CompleteAsync` → `ImagingRequestService.CompleteAsync`; `WebhooksController.ReceiveImagingSimulatorWebhook` → `ImagingRequestService.ProcessSimulatorWebhookAsync`; cả hai → `CompleteAndReturnPatientAsync` → `ImagingRequestRepository`, `AppointmentRepository.UpdateAsync`, `QueueService` |

## 1. Chức năng này làm gì

Khi chụp xong, chỉ định chuyển `Completed`. Nếu bệnh nhân đang chờ bác sĩ (lịch `CHECKED_IN`), hệ thống nâng ưu tiên lịch lên `Urgent` (2), đưa mục hàng chờ khám về `WAITING` với ưu tiên `Urgent`, nên bệnh nhân lên đầu danh sách chờ để bác sĩ đọc phim và khám tiếp phiếu cũ. Việc hoàn thành do kỹ thuật viên bấm, hoặc do máy chụp giả lập (`oze-xray-simulator`) gửi webhook khi phiên chụp xong.

## 2. Tiền điều kiện

- Chỉ định tồn tại, `RequestStatus` ∈ {`Pending`, `InProgress`}.
- API tay: đăng nhập role `DentalImagingTechnician`.
- Webhook: cấu hình `XRaySimulator:WebhookSecret` trùng `Webhook:Secret` của simulator. Môi trường `Development` không cấu hình thì dùng `ImagingRequestConstants.DevelopmentWebhookSecret`. Phiên chụp trên simulator phải có `orderReference` = `"{Id}"` hoặc `"IR-{Id}"` của chỉ định.
- Không cần lịch hẹn `CHECKED_IN`; nếu lịch đã ở trạng thái khác thì chỉ đổi chỉ định (xem bước 4.C).

## 3. API

### 3.1 Kỹ thuật viên bấm hoàn thành

**Request** `POST api/imaging-requests/{id:long}/complete`, quyền `[Authorize(Roles = "DentalImagingTechnician")]`, không có body.

**Response thành công** (`ApiResponse<ImagingRequestResponse>`, HTTP 200, `message` = `"Imaging completed. The patient has been added to the priority return queue."`)

Các trường `ImagingRequestResponse` như F-IMG-01, `RequestStatus = "Completed"`. `PatientId = 0` nếu không nạp được lượt khám.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | Không có chỉ định | `Imaging request not found.` |
| 400 | Chỉ định đã `Completed`/`Cancelled` | `Cannot complete imaging request because the imaging request is {0}.` (`RequestNotOpen`) |
| 409 | Lịch hẹn bị sửa cùng lúc (`RowVersion`) | `RecordChangedMeanwhile` |

### 3.2 Webhook từ máy chụp giả lập

**Request** `POST api/webhooks/imaging-simulator`, `[AllowAnonymous]`, xác thực bằng chữ ký.

| Header / trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `X-Sim-Signature` | string | Có | `sha256=<hex>` hoặc `<hex>`; HMAC SHA256 của **raw body** với shared secret | Chống giả mạo |
| `X-Sim-Event-Id` | string | Không | | Chỉ dùng để log |
| `eventId` | string | | | Mã sự kiện |
| `eventType` | string | | Simulator gửi `CAPTURE_PROGRESS`, `CAPTURE_COMPLETED`, `CAPTURE_CANCELLED`, `CAPTURE_FAILED` | Loại sự kiện |
| `sequence` | int | | | Thứ tự sự kiện trong phiên |
| `simulationId` | string | | | Mã phiên chụp |
| `orderReference` | string | Có (khi hoàn thành) | `"{Id}"` hoặc `"IR-{Id}"` | Mã chỉ định OZE |
| `deviceId` | string | | | Máy chụp |
| `state` | string | | Simulator gửi `ACCEPTED`, `CAPTURING`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `FAILED` | Trạng thái phiên |
| `progress` | int | | | % tiến độ |
| `failureCode`, `failureMessage` | string? | | | Lỗi (không được xử lý) |
| `images[]` | `WebhookImageSummaryDto` (`imageId`, `fileName`, `contentType`, `sizeBytes`, `sequenceNumber`) | | | Danh sách ảnh (không được lưu) |
| `occurredAt` | DateTimeOffset | | | Thời điểm |

Ví dụ (rút gọn):

```json
{
  "eventId": "evt-5b1c...",
  "eventType": "CAPTURE_COMPLETED",
  "orderReference": "IR-99",
  "state": "COMPLETED",
  "progress": 100,
  "images": [{ "imageId": "IMG-sim1-1", "fileName": "panoramic_sim1_1.png", "contentType": "image/png", "sizeBytes": 20480, "sequenceNumber": 1 }]
}
```

**Response thành công** (`ApiResponse`, HTTP 200, `message` = `"Webhook processed successfully. Patient added to Priority Return Queue."`). Message này trả cả khi sự kiện bị bỏ qua (không phải hoàn thành, hoặc chỉ định đã đóng).

**Lỗi**

| HTTP | Khi nào | Message |
|---|---|---|
| 503 | Không có secret (môi trường không phải Development) | `Webhook secret is not configured` |
| 401 | Thiếu `X-Sim-Signature` | `Missing webhook signature` |
| 401 | Chữ ký sai hoặc không phải hex | `Invalid webhook signature` |
| 400 | Body không parse được JSON / `null` | `Invalid payload` |
| 400 | Sự kiện hoàn thành nhưng `orderReference` không ra số, hoặc không có chỉ định | `Failed to process imaging request completion from webhook` (viết cứng trong controller) |

## 4. Luồng xử lý trong code

**A. API tay**

1. Controller gọi `CompleteAsync(id, CurrentUserId, null)` (`ImagingRequestsController.cs:117-125`).
2. Lấy chỉ định có tracking → 404 (`ImagingRequestService.cs:222-223`).
3. Kiểm tra `RequestStatus` ∈ `QueueStatuses` → 400 (`ImagingRequestService.cs:224-226`).
4. Gọi `CompleteAndReturnPatientAsync` (bước C), trả response (`ImagingRequestService.cs:228-230`). `technicianUserId`, `notes` được nhận nhưng **không dùng**.

**B. Webhook**

1. Lấy secret từ `XRaySimulator:WebhookSecret`; trống và `Development` thì dùng secret dev; vẫn trống → 503 (`WebhooksController.cs:54-64`).
2. Thiếu chữ ký → 401 (`WebhooksController.cs:66-70`).
3. Đọc raw body, bỏ tiền tố `sha256=`, so HMAC SHA256 bằng `CryptographicOperations.FixedTimeEquals` → 401 nếu sai (`WebhooksController.cs:72-83`, `IsValidSignature` ở `:115-132`).
4. Parse JSON không phân biệt hoa thường; lỗi → 400 (`WebhooksController.cs:85-101`).
5. Gọi `ProcessSimulatorWebhookAsync` (`WebhooksController.cs:106-112`):
   1. Không phải `state = Completed` và không phải `eventType = capture.completed` (so không phân biệt hoa thường) → trả `true`, không làm gì (`ImagingRequestService.cs:237-241`). Simulator gửi `state = "COMPLETED"` nên khớp nhánh `state`.
   2. Bỏ tiền tố `IR-`, parse `long`; lỗi → `false` (→ 400) (`ImagingRequestService.cs:243-252`).
   3. Lấy chỉ định; không có → `false` (`ImagingRequestService.cs:254-258`).
   4. Chỉ định đã `Completed`/`Cancelled` → trả `true`, không đổi gì (idempotent, chỉ định đã hủy giữ nguyên hủy) (`ImagingRequestService.cs:260-264`).
   5. Gọi `CompleteAndReturnPatientAsync` (`ImagingRequestService.cs:266`).

**C. `CompleteAndReturnPatientAsync`** (`ImagingRequestService.cs:272-313`)

1. `RequestStatus = "Completed"`, `UpdatedAt = UtcNow`, lưu (`:274-277`).
2. Nạp lại lượt khám kèm `Appointment`; không có lịch → dừng (`:279-284`).
3. `isWaiting = Appointment.Status == "CHECKED_IN"`. Nếu đúng: `Appointment.Priority = PriorityConstants.Urgent` (2), lưu (`:287-296`).
4. Nếu không còn chỉ định mở khác (`HasOtherOpenRequestAsync`, `:316-320`): mục hàng chờ `Imaging` → `COMPLETED` (`:300-303`).
5. Nếu `isWaiting`: mục hàng chờ `Examination` → `WAITING`, `Priority` → `Urgent` (`:305-309`, `QueueService.cs:59-111`).

Kết quả trên danh sách chờ của bác sĩ: lịch `CHECKED_IN` có `Examination` và không còn chỉ định mở → hiện lại, xếp theo `Priority` giảm dần rồi nhóm `PriorityReturnGroup` (0) trước tiên, `IsPriorityReturn = true` (`AppointmentService.cs:436-484`, `:492-497`). Bác sĩ bấm bắt đầu khám thì tiếp tục phiếu cũ (`AppointmentService.cs:1047-1053`), kể cả khi đã hết ca (`:1029-1035`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-IMG-04 | Chụp xong: bệnh nhân vào lại hàng chờ với ưu tiên `Urgent` | `ImagingRequestService.cs:287-309` |
| BR-EXM-03 | Quay lại sau chụp thì tiếp tục phiếu cũ | `AppointmentService.cs:1047-1053` |
| BR-IMG-05 | Kỹ thuật viên không chẩn đoán: API không nhận nội dung chẩn đoán | `ImagingRequestsController.cs:117-125` |
| (code) | Webhook phải có chữ ký HMAC SHA256 hợp lệ; sự kiện lặp lại hoặc chỉ định đã hủy không làm đổi dữ liệu | `WebhooksController.cs:66-83`, `ImagingRequestService.cs:260-264` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ImagingRequests` | `Pending` / `InProgress` | `Completed` | `UpdatedAt` |
| `Appointments.Priority` | 0/1/2 | 2 (`Urgent`) | Chỉ khi lịch `CHECKED_IN`; ghi đè mức lễ tân đã chọn |
| `QueueEntries` (`Imaging`) | đang hoạt động | `COMPLETED` | Chỉ khi không còn chỉ định mở khác |
| `QueueEntries` (`Examination`) | đang hoạt động | `WAITING`, `Priority = 2` | Chỉ khi lịch `CHECKED_IN` |
| `ImagingResults` | | không đổi | Webhook có `images` nhưng không lưu |

## 7. Liên quan

- Trước đó: F-IMG-01, F-IMG-02.
- Sau đó: F-RCP-04 danh sách chờ (bệnh nhân hiện với `IsPriorityReturn = true`), F-EXM-01 tiếp tục khám; F-IMG-05 lưu ảnh (chưa làm).

## 8. Kiểm thử

- Test hiện có: chưa có test cho `CompleteAsync`, `ProcessSimulatorWebhookAsync`, `WebhooksController`. Liên quan: `AppointmentPriorityReturnAndQueueTests.GetWaitingListAsync_ShouldPlacePriorityReturnPatientAheadOfOnTimePatients`, `StartExaminationAsync_ShouldResumeExistingExamination_WhenReturningFromImaging`.
- Ca cần test thêm: hoàn thành `Pending` và `InProgress`; từ chối `Completed`/`Cancelled`; lịch `CHECKED_IN` → `Priority = 2` và hàng chờ khám `WAITING`; lịch `IN_SERVICE`/`COMPLETED` → không đổi lịch; còn chỉ định mở khác → hàng chờ `Imaging` không đóng; webhook: thiếu/sai chữ ký, body hỏng, `IR-99` và `99`, sự kiện `CAPTURE_PROGRESS` bị bỏ qua, gửi lặp lại, chỉ định đã hủy.

## 9. Còn thiếu / câu hỏi mở

- **Không lưu `ImagingResult`**: comment ở `WebhooksController.cs:41-46` nói "saves imaging results" nhưng code bỏ qua `images`. Tài liệu bệnh án (`MedicalRecordService.cs:113-128`) đọc `ImagingResults` nên luôn rỗng. Xem F-IMG-05.
- Không kiểm tra kỹ thuật viên nào được giao, không lưu người hoàn thành; tham số `technicianUserId`, `notes` và cột `ImagingRequests.Notes` không dùng.
- Không có bước `InProgress` (xem F-IMG-02).
- Sự kiện `CAPTURE_FAILED` / `CAPTURE_CANCELLED` bị bỏ qua (trả 200), chỉ định giữ nguyên; chưa có luồng chụp lại (F-IMG-06).
- Backend **không gọi** simulator để tạo phiên chụp (không có client nào trong `oze-clinic-be`). Chưa xác định từ code ai tạo phiên chụp với `orderReference` đúng mã chỉ định (thao tác tay trên API simulator `POST api/v1/captures`?).
- Secret mặc định lệch: simulator `appsettings.json` / `docker-compose.yml` dùng `oze-sim-webhook-secret-2026`, backend dev dùng `oze-xray-shared-secret-key-2026`. Phải cấu hình hai bên trùng nhau, nếu không mọi webhook bị 401.
- Secret dev nằm cứng trong `ImagingRequestConstants.cs:37`.
- Không chống replay (không kiểm `X-Sim-Timestamp`, không lưu `eventId`); an toàn nhờ trạng thái đã đóng thì bỏ qua.
- `orderReference` sai trả 400, simulator sẽ gửi lại tới `MaxRetries` lần.
- Webhook nhận `eventType = "capture.completed"`, nhưng simulator gửi `CAPTURE_COMPLETED`; chỉ chạy nhờ điều kiện `state`.
- Các lần lưu (chỉ định, lịch, hàng chờ) không chung transaction; không ghi `AuditLog` khi đổi `Priority` của lịch (F-RCP-03 đổi ưu tiên thì có ghi).
- Message thành công của cả hai API và lỗi webhook xử lý thất bại viết cứng, không nằm trong `ErrorConstants` (BR-C08).

# F-RCP-05 Hàng chờ: xem bảng số, gọi kế tiếp, gọi một số, bỏ qua

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M4.

| Mục | Giá trị |
|---|---|
| Module | M4 Tiếp đón và hàng chờ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Xem bảng: mọi người (kể cả không đăng nhập). Gọi/bỏ qua: `Doctor`, `Receptionist`, `DentalImagingTechnician`, `ClinicManager` |
| API | `GET api/queues`, `POST api/queues/call-next`, `POST api/queues/{id}/call`, `POST api/queues/{id}/skip` |
| Code chính | `QueuesController` → `QueueService.GetQueueEntriesAsync` / `CallNextAsync` / `CallAsync` / `SkipAsync` → `QueueRepository` |

## 1. Chức năng này làm gì

Quản lý bảng số thứ tự (`QueueEntries`) cho hàng chờ khám (`Examination`), chụp phim (`Imaging`) và điều trị (`Treatment`). Màn hình TV ở sảnh xem bảng số (tên bệnh nhân bị che). Nhân viên gọi người kế tiếp, gọi một số cụ thể, hoặc đánh dấu "gọi không có mặt" để số đó lùi về sau.

## 2. Tiền điều kiện

- Bệnh nhân đã có bản ghi hàng chờ, tạo khi check-in / walk-in (F-RCP-01, F-RCP-02), đổi bác sĩ (F-RCP-07), mở lại ca, hoặc có chỉ định chụp phim (`Imaging`).
- Gọi/bỏ qua: đăng nhập một trong bốn role nhân viên. Bác sĩ (không kiêm lễ tân/quản lý) gọi hàng chờ `Examination` thì phải có `StaffProfile` và chỉ thao tác trên bệnh nhân của mình.

## 3. API

### 3.1 `GET api/queues` – bảng số, `[AllowAnonymous]`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `queueType` (query) | string? | Không | `Examination`/`Imaging`/`Treatment`, phân biệt hoa thường | Bỏ trống = mọi loại |
| `roomId` (query) | int? | Không | | Lọc phòng; bản ghi chưa có phòng (`RoomId` null) luôn được tính vào |

Người gọi có một trong bốn role nhân viên → thấy đủ `patientName`, `patientCode`, `notes`. Không đăng nhập hoặc role khác (kể cả `Patient`) → tên che dạng `"N*** V*** A***"`, `patientCode` rỗng, `notes` null.

### 3.2 `POST api/queues/call-next?queueType=&roomId=`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `queueType` (query) | string | Có | Không kiểm tra giá trị; sai loại thì không tìm thấy ai | Loại hàng chờ |
| `roomId` (query) | int? | Không | | Lọc phòng và gán phòng cho số được gọi |

Thành công có người: HTTP 200, `data` = `QueueEntryResponse`, message `"Number {QueueNumber} called successfully."`. Không còn ai chờ: HTTP 200, `data = null`, message `"No patient is waiting in the queue."`.

### 3.3 `POST api/queues/{id}/call?roomId=`

`id` = `QueueEntries.Id`. Thành công: message `"Number {QueueNumber} called successfully."`.

### 3.4 `POST api/queues/{id}/skip`

`id` = `QueueEntries.Id`. Thành công: message `"Number {QueueNumber} was not there and has moved back in the queue."`.

**Response** (`QueueEntryResponse`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `appointmentId` | long | |
| `queueType` | string | `Examination`/`Imaging`/`Treatment` |
| `roomId`, `roomName` | | |
| `assignedStaffId`, `staffName` | | Bác sĩ phụ trách (hàng chờ khám) |
| `patientName`, `patientCode` | string | Có thể bị che (chỉ ở `GET`) |
| `queueNumber` | int | Số thứ tự trong ngày theo loại hàng chờ |
| `priority` | int | 0/1/2 |
| `skipCount` | int | Số lần gọi không có mặt |
| `status` | string | `WAITING`, `CALLED`, `IN_PROGRESS` (bảng chỉ hiện ba trạng thái này) |
| `calledAt`, `startedAt`, `completedAt`, `createdAt` | DateTimeOffset? | |
| `notes` | string? | Lý do ưu tiên / ghi chú chụp phim |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | `call-next` thiếu `queueType` | ProblemDetails mặc định |
| 404 | Bác sĩ không có `StaffProfile` (call-next/call/skip, hàng `Examination`) | `AppointmentMessage.DoctorProfileNotFound`: "No doctor profile is linked to this account" |
| 404 | `call`/`skip`: không có số | `QueueMessage.EntryNotFound`: "Queue number not found" |
| 403 | `call`: bác sĩ gọi bệnh nhân của bác sĩ khác | `NotYourPatientToCall`: "You can only call your own patients" |
| 400 | `call`: bác sĩ ngoài ca gọi bệnh nhân chưa khám | `DoctorNotOnShift`: "You are not on a shift now. Start your shift to call new patients; only patients you have already examined can still be called" |
| 400 | `call`: số của ngày khác | `NotInTodayQueue`: "This number is not in today's queue" |
| 400 | `call`: số không ở `WAITING` (hoặc vừa bị người khác gọi) | `OnlyWaitingCanBeCalled`: "Only a number that is waiting can be called" |
| 403 | `skip`: bác sĩ bỏ qua bệnh nhân của bác sĩ khác | `NotYourPatient`: "You can only skip your own patients" |
| 400 | `skip`: số không ở `CALLED` (hoặc vừa đổi trạng thái) | `OnlyCalledCanBeSkipped`: "Only a number that has been called can be skipped" |

## 4. Luồng xử lý trong code

**Ai bị giới hạn là "bác sĩ"**: `QueuesController.cs:95-98` `LimitedDoctorUserId` = user id khi có role `Doctor` và **không** có `Receptionist`/`ClinicManager`; còn lại null (toàn quyền).

**Thứ tự hàng chờ** (dùng chung cho bảng và `call-next`): `QueueRepository.GetActiveEntriesAsync` (`QueueRepository.cs:69-105`)
- Chỉ bản ghi tạo trong ngày hôm nay (`CreatedAt` trong cửa sổ `DayWindow`, `:155-160`) và ở `WAITING`/`CALLED`/`IN_PROGRESS` (`QueueConstants.ActiveStatuses`).
- Lọc `queueType`; lọc `roomId` = `RoomId == roomId || RoomId == null`; lọc `AssignedStaffId` (chỉ khi bác sĩ gọi `call-next`).
- Sắp xếp: `SkipCount` tăng dần → `Priority` giảm dần → `QueueNumber` tăng dần.

**3.1 GET** `QueuesController.cs:35-45` → `QueueService.cs:113-121`: lấy danh sách trên, map với `includePatientDetails = isStaff`; che tên bằng `MaskName` (`QueueService.cs:260-264`: chữ cái đầu mỗi từ + `***`).

**3.2 call-next** `QueuesController.cs:51-65` → `QueueService.CallNextAsync` (`QueueService.cs:123-161`):
1. `:130-137` nếu là bác sĩ và `queueType == Examination`: lấy `StaffProfile.Id` (không có → 404), xác định `offDuty` (`IsOffDutyAsync`, `QueueRepository.cs:131-138`: không có ca hôm nay đã `ActualStartTime` và chưa `ActualEndTime`).
2. `:139` lấy danh sách theo thứ tự trên.
3. `:141-158` duyệt các bản ghi `WAITING` (nếu `offDuty` thì chỉ những bản ghi mà lịch đã có `Examination`), thử `TryMarkCalledAsync` (`QueueRepository.cs:107-117`: một câu `UPDATE ... WHERE Id = @id AND Status = 'WAITING'` đặt `CALLED`, `CalledAt`, `RoomId = roomId ?? RoomId`). Thất bại (người khác vừa gọi) thì thử người tiếp theo.
4. `:160` không ai → null.

**3.3 call** `QueuesController.cs:71-80` → `QueueService.CallAsync` (`QueueService.cs:163-198`):
1. `:169-170` tải bản ghi (`GetByIdAsync`), không có → 404.
2. `:172-179` bác sĩ + hàng `Examination`: 404 nếu không có hồ sơ; 403 nếu `AssignedStaffId` khác; 400 `DoctorNotOnShift` nếu lịch chưa có `Examination` và bác sĩ ngoài ca.
3. `:182` ngày của `CreatedAt.LocalDateTime` khác `ClinicClock.Today` → 400 `NotInTodayQueue`.
4. `:183` khác `WAITING` → 400 `OnlyWaitingCanBeCalled`.
5. `:187-188` `TryMarkCalledAsync` thất bại → 400 `OnlyWaitingCanBeCalled`.

**3.4 skip** `QueuesController.cs:86-92` → `QueueService.SkipAsync` (`QueueService.cs:205-233`):
1. `:210-211` tải bản ghi, không có → 404.
2. `:213-218` bác sĩ + hàng `Examination`: 404 hồ sơ, 403 `NotYourPatient` (không kiểm tra đang trong ca).
3. `:220` khác `CALLED` → 400 `OnlyCalledCanBeSkipped`.
4. `:223-224` `TryMoveBackAsync` (`QueueRepository.cs:119-129`: `UPDATE ... WHERE Status = 'CALLED'` đặt `WAITING`, `CalledAt = null`, `SkipCount + 1`). Vì sắp xếp theo `SkipCount` trước, số này **lùi xuống sau mọi người chưa bị bỏ qua lần nào**, bất kể mức ưu tiên.

**Các nơi khác đổi trạng thái hàng chờ** (qua `QueueService.UpdateStatusAsync`, `QueueService.cs:59-93`, chỉ tác động bản ghi đang hoạt động mới nhất):
- `IN_PROGRESS` (+`StartedAt`): bác sĩ bắt đầu khám, `AppointmentService.cs:1069-1072`.
- `COMPLETED` (+`CompletedAt`): hoàn tất khám, `AppointmentService.cs:1125-1127`.
- `CANCELLED`: NO_SHOW tay (`AppointmentService.cs:810-813`), đổi bác sĩ (`:781`).
- `WAITING`: có chỉ định chụp phim (`ImagingRequestService.cs:98`), trả kết quả phim (`ImagingRequestService.cs:307-308`, kèm `Priority = Urgent`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-RCP-03 | Gọi/bỏ qua thực hiện trên hàng chờ | `QueueService.cs:123-233` |
| (code) | Bảng công khai che tên, ẩn mã và ghi chú | `QueueService.cs:235-264` |
| (code) | Số đánh theo loại hàng chờ và ngày, không trùng khi nhiều quầy cùng lúc | `QueueRepository.cs:24-46` |
| (code) | Gọi/bỏ qua chống tranh chấp bằng `UPDATE` có điều kiện trạng thái | `QueueRepository.cs:107-129` |
| (code) | Bác sĩ chỉ gọi bệnh nhân của mình; ngoài ca chỉ gọi người đã khám | `QueueService.cs:132-141`, `:172-179` |
| BR-RCP-06 | Hàng chờ quá `Queue.AutoExpireMinutes` tự hết hạn | **Chưa làm** |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `QueueEntries` (call-next/call) | `WAITING` | `CALLED`, `CalledAt`, `RoomId` (nếu truyền) | `Appointments` không đổi |
| `QueueEntries` (skip) | `CALLED` | `WAITING`, `CalledAt = null`, `SkipCount + 1` | |
| GET | | | Chỉ đọc |

## 7. Liên quan

- Trước đó: F-RCP-01, F-RCP-02, F-RCP-03, F-RCP-07, F-RCP-08 (bác sĩ phải bắt đầu ca mới gọi được bệnh nhân mới).
- Sau đó: F-EXM-01 bắt đầu khám (`IN_PROGRESS`), F-RCP-06 NO_SHOW nếu bệnh nhân bỏ về.

## 8. Kiểm thử

- Test hiện có: `AppointmentPriorityReturnAndQueueTests.QueueService_ShouldEnqueueAndCallNext` (cấp số rồi `call-next` chuyển `CALLED`).
- Ca cần test thêm: thứ tự `SkipCount` → `Priority` → `QueueNumber`; bác sĩ ngoài ca chỉ nhận người đã khám; `call` số của bác sĩ khác (403); `call` số ngày cũ; `skip` số chưa gọi; hai người `call-next` cùng lúc không nhận cùng một số; che tên khi không đăng nhập.

## 9. Còn thiếu / câu hỏi mở

- **Thứ tự gọi khác thứ tự `waiting-list`** (F-RCP-04): `call-next` không dùng nhóm đúng giờ/trễ/vãng lai và giờ hẹn, chỉ dùng `QueueNumber` (thứ tự check-in) sau `SkipCount`, `Priority`. Lệch BR-RCP-02.
- Bỏ qua đặt `SkipCount` lên trước `Priority`: một bệnh nhân Urgent bị gọi hụt một lần sẽ xếp sau mọi bệnh nhân Normal chưa bị bỏ qua. Chưa xác định từ tài liệu đây có phải ý muốn.
- Trạng thái `SKIPPED` có trong `QueueConstants` và CK nhưng **không nơi nào đặt**; "bỏ qua" chỉ đưa về `WAITING`.
- Comment `QueuesController.cs:83-84` nói người vắng đến hết buổi sẽ bị `NO_SHOW`, nhưng kết thúc ca (F-RCP-08) **không** NO_SHOW người đã check-in; họ vào `needs-attention`.
- BR-RCP-06 `Queue.AutoExpireMinutes` (seed 60) không được code đọc; số `CALLED` hay `WAITING` không bao giờ tự hết hạn.
- `call-next` không kiểm tra giá trị `queueType`; không kiểm tra `roomId` có thuộc ca của bác sĩ.
- `DayWindow` (`QueueRepository.cs:156-160`) và kiểm tra `NotInTodayQueue` (`QueueService.cs:182`) dùng **giờ máy chủ**, còn `ClinicClock.Today` là giờ Việt Nam; máy chủ UTC sẽ lệch ranh giới ngày 7 tiếng (lệch BR-C01).
- Gọi số không đổi trạng thái lịch hẹn; không có thông báo SMS/loa. Chưa xác định từ code FE có phát âm thanh hay không.

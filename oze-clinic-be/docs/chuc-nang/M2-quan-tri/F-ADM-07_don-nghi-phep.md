# F-ADM-07 Đơn nghỉ phép

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2.
>
> **Chức năng CHƯA LÀM.** Mục 2–6 bên dưới là **ĐỀ XUẤT**, chưa có trong code. Dac_ta chỉ có một dòng "Đơn nghỉ phép ⬜", chưa có quy tắc `BR-` nào.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | ĐỀ XUẤT: nhân viên (`Doctor`, `Receptionist`, `DentalImagingTechnician`, `ClinicManager`) gửi đơn; `ClinicManager` duyệt |
| API | ĐỀ XUẤT: `POST api/leave-requests`, `GET api/leave-requests/my`, `POST api/leave-requests/{id}/cancel`, `GET api/leave-requests`, `POST api/leave-requests/{id}/approve`, `POST api/leave-requests/{id}/reject` |
| Code chính | ĐỀ XUẤT: `LeaveRequestsController` → `LeaveRequestService` → `LeaveRequestRepository` (+ `WorkShiftRepository`, `StaffRepository`) |

## 1. Chức năng này làm gì

Nhân viên gửi đơn xin nghỉ một hoặc nhiều ngày (hoặc một phần ngày) kèm lý do. Quản lý xem đơn, thấy các ca và lịch hẹn bị ảnh hưởng, rồi duyệt hoặc từ chối. Đơn được duyệt thì các ca trong khoảng nghỉ được đánh dấu vắng có lý do, để quản lý xếp người thay và lễ tân dời lịch hẹn.

### Hiện trạng trong code

- Không có entity, bảng, DTO, controller hay message nào cho đơn nghỉ phép (tìm `Leave` trong `OZE.Domain`, `OZE.Common` không có kết quả).
- Có sẵn cột liên quan trong `StaffSchedules`: `IsPresent` (bool?) và `AbsenceReason` (string?) (`OZE.Domain/Entities/StaffSchedule.cs`). Hiện không API nào ghi `IsPresent = false` hay `AbsenceReason`; chỉ `StartShiftAsync` đặt `IsPresent = true`, `AbsenceReason = null` (`DoctorScheduleService .cs:103-104`).
- Kiểm tra "còn ca/lịch hẹn" có sẵn để tái dùng: `StaffRepository.HasUpcomingWorkAsync` (`StaffRepository.cs:68-75`), `WorkShiftRepository.HasBookedAppointmentsAsync` (`WorkShiftRepository.cs:94-104`).

## 2. Tiền điều kiện (ĐỀ XUẤT)

- Người gửi đăng nhập, có `StaffProfile` đang `IsActive`.
- Ngày bắt đầu nghỉ ≥ hôm nay (`ClinicClock`).
- Duyệt/từ chối: role `ClinicManager`, đơn đang `Pending`.

## 3. API (ĐỀ XUẤT)

**Request** `POST api/leave-requests`, quyền mọi role nhân viên

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `fromDate` | DateOnly | Có | ≥ hôm nay | Ngày bắt đầu nghỉ |
| `toDate` | DateOnly | Có | ≥ `fromDate` | Ngày kết thúc |
| `fromTime` / `toTime` | TimeOnly? | Không | Cả hai cùng có hoặc cùng trống; `fromTime < toTime`; chỉ khi `fromDate == toDate` | Nghỉ một phần ngày |
| `reason` | string | Có | Tối đa 500 | Lý do |

```json
{ "fromDate": "2026-11-20", "toDate": "2026-11-21", "reason": "Việc gia đình" }
```

**Request** `GET api/leave-requests/my` – đơn của tôi. `POST api/leave-requests/{id}/cancel` – người gửi rút đơn khi còn `Pending`.

**Request** `GET api/leave-requests?status=&staffUserId=&fromDate=&toDate=`, quyền `ClinicManager`.

**Request** `POST api/leave-requests/{id}/approve`, quyền `ClinicManager`, body `{ "note": "..." }` (không bắt buộc).

**Request** `POST api/leave-requests/{id}/reject`, quyền `ClinicManager`, body `{ "reason": "..." }` (bắt buộc).

**Response thành công** (ĐỀ XUẤT `ApiResponse<LeaveRequestResponse>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | long | Id đơn |
| `staffUserId`, `staffName`, `role` | string | Người xin nghỉ |
| `fromDate`, `toDate` | DateOnly | Khoảng nghỉ |
| `fromTime`, `toTime` | TimeOnly? | Nghỉ một phần ngày |
| `reason` | string | Lý do |
| `status` | string | `Pending` / `Approved` / `Rejected` / `Cancelled` |
| `affectedShiftIds` | long[] | Ca nằm trong khoảng nghỉ |
| `affectedAppointmentCount` | int | Số lịch hẹn chưa xong trong các ca đó |
| `reviewedByUserId`, `reviewedAt`, `reviewNote` | | Người duyệt/từ chối |
| `createdAt` | DateTimeOffset | Lúc gửi |

**Lỗi** (ĐỀ XUẤT – message chưa có trong `ErrorConstants`, cần thêm lớp `LeaveRequestMessage`)

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Ngày quá khứ, khoảng ngày/giờ sai, thiếu lý do | Chưa có, cần thêm |
| 400 | Trùng một đơn `Pending`/`Approved` khác của cùng người | Chưa có, cần thêm |
| 400 | Duyệt/từ chối/rút đơn không còn `Pending` | Chưa có, cần thêm |
| 404 | Không có đơn, hoặc đơn của người khác (khi xem/rút) | Chưa có, cần thêm |

## 4. Luồng xử lý trong code (ĐỀ XUẤT)

1. Gửi đơn: kiểm ngày giờ, kiểm trùng đơn, tính các ca giao khoảng nghỉ (`StaffSchedules` cùng `StaffProfileId`) để hiển thị, lưu `Pending`.
2. Duyệt: kiểm `Pending`; với mỗi ca bị ảnh hưởng đặt `IsPresent = false`, `AbsenceReason = <lý do đơn>`; **không** tự xóa ca, không tự hủy lịch hẹn; đơn → `Approved`, lưu người duyệt và thời điểm; ghi `AuditLog`.
3. Sau khi duyệt, quản lý dùng F-ADM-05 đổi người cho ca (bị chặn nếu ca còn lịch hẹn – `ShiftHasAppointmentsCannotChange`), lễ tân dời lịch hẹn (F-APT-08) hoặc đổi bác sĩ (F-RCP-07).
4. Từ chối: kiểm `Pending`, bắt buộc lý do; → `Rejected`; ghi `AuditLog`.
5. Rút đơn: chỉ người gửi, chỉ `Pending`; → `Cancelled`.
6. Thông báo cho người gửi khi đơn được duyệt/từ chối (`Notification` hoặc email) – cần chốt kênh.

## 5. Quy tắc nghiệp vụ (ĐỀ XUẤT, chưa có mã trong Dac_ta)

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (đề xuất BR-ADM-05) | Chỉ xin nghỉ cho ngày từ hôm nay trở đi; không có hai đơn `Pending`/`Approved` chồng thời gian của cùng người | `LeaveRequestService` |
| (đề xuất BR-ADM-06) | Duyệt đơn không tự xóa ca hay hủy lịch hẹn; ca bị ảnh hưởng đánh dấu vắng có lý do, quản lý tự xếp người thay | `LeaveRequestService` |
| (đề xuất BR-ADM-07) | Từ chối bắt buộc lý do; duyệt/từ chối ghi `AuditLog` | `LeaveRequestService` |
| (đề xuất) | Bác sĩ có đơn `Approved` không được nhận lịch hẹn mới trong khoảng nghỉ | Phía F-APT-02 (slot trống) |

## 6. Trạng thái và dữ liệu thay đổi (ĐỀ XUẤT)

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `LeaveRequests` (bảng mới, cần migration) | (không có) | `Pending` | Gửi đơn |
| `LeaveRequests.Status` | `Pending` | `Approved` / `Rejected` / `Cancelled` | |
| `StaffSchedules.IsPresent`, `AbsenceReason` | `null` | `false`, lý do | Khi duyệt |
| `AuditLogs` | | 1 dòng | Duyệt, từ chối |

## 7. Liên quan

- Trước đó: F-ADM-01 (nhân viên), F-ADM-05 (ca đã xếp).
- Sau đó: F-ADM-05 (đổi người cho ca), F-APT-08 (dời lịch), F-RCP-07 (đổi bác sĩ), F-APT-02 (không mở slot cho bác sĩ đang nghỉ).

## 8. Kiểm thử

- Test hiện có: Chưa có (chức năng chưa làm).
- Ca cần test khi làm: khoảng ngày sai; trùng đơn; duyệt đơn có ca còn lịch hẹn (ca được đánh vắng, lịch hẹn giữ nguyên); duyệt lại đơn đã duyệt; người khác rút đơn → 404.

## 9. Còn thiếu / câu hỏi mở

- Toàn bộ chức năng chưa có code; Dac_ta chưa mô tả nghiệp vụ và chưa có `BR-`.
- Cần chốt với phòng khám: có hạn mức ngày phép không; có nghỉ nửa ngày không; phải gửi trước bao nhiêu ngày; quản lý tự nghỉ thì ai duyệt; duyệt có cần tự hủy ca không.
- Cột `StaffSchedules.IsPresent = false` / `AbsenceReason` đã có nhưng chưa nơi nào ghi; chấm vắng (không qua đơn) cũng chưa có API.

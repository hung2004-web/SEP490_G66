# F-APT-05 Lịch của tôi (kèm danh sách và chi tiết lịch cho nhân viên)

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M3 Đặt lịch |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Patient` (lịch của tôi); `Receptionist`, `Doctor`, `ClinicManager` (danh sách); cả bốn role (chi tiết) |
| API | `GET api/appointments/my`; `GET api/appointments`; `GET api/appointments/{id}` |
| Code chính | `AppointmentsController.GetMyAppointmentsAsync` / `GetAppointmentsAsync` / `GetAppointmentByIdAsync` → `AppointmentService.GetMyAppointmentsAsync` / `GetAppointmentsAsync` / `GetAppointmentByIdAsync` → `AppointmentRepository.GetAppointmentsAsync`, `GetByIdWithDetailsAsync`, `GetPatientByUserIdAsync` |

## 1. Chức năng này làm gì

- Bệnh nhân xem danh sách lịch hẹn của chính mình, có lọc ngày, trạng thái và phân trang.
- Nhân viên (lễ tân, bác sĩ, quản lý) xem danh sách mọi lịch hẹn với bộ lọc theo ngày, bác sĩ, bệnh nhân, trạng thái, từ khóa.
- Xem chi tiết một lịch: nhân viên xem mọi lịch, bệnh nhân chỉ xem lịch của mình (lịch người khác trả 404).

## 2. Tiền điều kiện

- `GET my`: role `Patient`, tài khoản đã gắn hồ sơ bệnh nhân.
- `GET api/appointments`: role `Receptionist`, `Doctor` hoặc `ClinicManager`.
- `GET {id}`: một trong bốn role trên.

## 3. API

### 3.1 `GET api/appointments/my`, quyền `[Authorize(Roles = "Patient")]`

### 3.2 `GET api/appointments`, quyền `[Authorize(Roles = "Receptionist,Doctor,ClinicManager")]`

Cả hai dùng query `AppointmentQueryParameters` (kế thừa `PagedRequestBase`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `date` | DateOnly? | Không | Có `date` thì bỏ qua `fromDate`/`toDate` | Lọc đúng một ngày |
| `fromDate` | DateOnly? | Không | | `AppointmentDate >= fromDate` |
| `toDate` | DateOnly? | Không | | `AppointmentDate <= toDate` |
| `doctorId` | int? | Không | | Lọc theo bác sĩ |
| `patientId` | int? | Không | Với `my` bị **ghi đè** bằng id hồ sơ của người đăng nhập | Lọc theo bệnh nhân |
| `status` | string? | Không | Được trim và đổi chữ hoa | `PENDING`, `CONFIRMED`, ... |
| `searchKeyword` | string? | Không | Tìm `Contains` | Tên, mã bệnh nhân, số điện thoại |
| `sortBy` | string? | Không | `patientname`, `status`, `createdat`; khác → theo ngày + giờ | Cột sắp xếp |
| `sortDescending` | bool | Không | Mặc định `false` | |
| `pageNumber` | int | Không | < 1 → 1 | Trang |
| `pageSize` | int | Không | < 1 → 10, > 100 → 100; mặc định 10 | Cỡ trang |

Ví dụ: `GET api/appointments/my?status=pending&fromDate=2026-11-01&pageNumber=1&pageSize=10`

**Response** (`ApiResponse<PagedResult<AppointmentResponse>>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `items` | `List<AppointmentResponse>` | Xem bảng `AppointmentResponse` ở F-APT-03; ở đây `patientPhoneNumber` **không che** |
| `totalCount` | int | Tổng bản ghi |
| `pageNumber`, `pageSize` | int | |
| `totalPages`, `hasPreviousPage`, `hasNextPage` | int, bool, bool | Tính từ trên |

### 3.3 `GET api/appointments/{id}`, quyền `Receptionist,Doctor,ClinicManager,Patient`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `id` (route) | long | Có | `{id:long}` | Id lịch |

Response `ApiResponse<AppointmentResponse>`, HTTP 200, gồm cả `cancellationReason`, `checkInAt`.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401 / 403 | Chưa đăng nhập / sai role | Do ASP.NET trả |
| 404 | `my`: tài khoản chưa gắn hồ sơ | `AppointmentMessage.PatientProfileNotFound` "No patient profile is linked to this account" |
| 404 | `{id}`: không có lịch, hoặc bệnh nhân xem lịch người khác | `AppointmentMessage.AppointmentNotFound` "Appointment not found in system" |

## 4. Luồng xử lý trong code

**`GET my`**
1. Controller truyền `CurrentUserId ?? ""` (`AppointmentsController.cs:151-160`).
2. Lấy hồ sơ theo `UserId`; không có → 404 (`AppointmentService.cs:521-522`, repo `AppointmentRepository.cs:39-43`).
3. Ghi đè `query.PatientId = patient.Id` rồi gọi `GetAppointmentsAsync` (`AppointmentService.cs:525-526`).

**`GET api/appointments`** (và bước cuối của `my`)
1. Controller gọi service (`AppointmentsController.cs:123-131`).
2. Repo dựng truy vấn `AsNoTracking`, include `Patient`, `Doctor`, `ServiceItems.Service`, `ServiceItems.Variant`; áp các bộ lọc theo bảng trên; đếm `totalCount`; = 0 thì trả trang rỗng; sắp xếp; `Skip/Take` (`AppointmentRepository.cs:321-395`).
3. Service map từng dòng bằng `MapToResponse` (`AppointmentService.cs:427-432`, `:1179-1212`).

**`GET {id}`**
1. Controller tính `OwnerRestriction`: `null` nếu là `Receptionist`/`Doctor`/`ClinicManager`, ngược lại là `CurrentUserId ?? ""` (`AppointmentsController.cs:23-26`, `:165-173`).
2. Tải lịch kèm chi tiết (`AppointmentRepository.cs:262-272`); không có → 404 (`AppointmentService.cs:531-532`).
3. `EnsureOwnedBy`: nếu có owner thì `Patient.UserId` phải bằng owner, không thì 404 (`AppointmentService.cs:533`, `:1169-1177`).
4. `MapToResponse` (`:535`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (Mục 1 tài liệu tổng) | Bệnh nhân chỉ thấy dữ liệu của mình; của người khác trả 404 | `AppointmentService.cs:525`, `:1169-1177` |
| BR-C06 | Trạng thái so khớp chữ hoa | `AppointmentRepository.cs:361` (tự đổi chữ hoa) |
| BR-C07 | Không phải chủ sở hữu trả 404 | `AppointmentService.cs:1176` |

## 6. Trạng thái và dữ liệu thay đổi

Chỉ đọc.

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Appointments`, `AppointmentServices`, `Patients`, `StaffProfiles` | - | - | Chỉ đọc |

## 7. Liên quan

- Trước đó: F-APT-03, F-APT-04 tạo lịch.
- Sau đó: F-APT-06, F-APT-07, F-APT-08 thao tác trên lịch chọn từ danh sách; M4 check-in.

## 8. Kiểm thử

- Test hiện có (`OZE.UnitTest/Controllers/AppointmentsControllerTests.cs`):
  - `GetAppointmentsAsync_ShouldReturnOk_WithPagedList`
  - `GetAppointmentByIdAsync_ShouldReturnOk_WhenFound`
  - `GetAppointmentByIdAsync_ShouldPassOwnUserId_WhenPatient`
  - `GetAppointmentByIdAsync_ShouldNeverWidenAccess_WhenPatientHasNoUserId`
- Ca cần test thêm:
  - Service `GetMyAppointmentsAsync`: `patientId` client gửi bị ghi đè; tài khoản không có hồ sơ → 404.
  - `EnsureOwnedBy`: bệnh nhân xem lịch người khác → 404.
  - Repo: `date` ưu tiên hơn `fromDate/toDate`; `status=pending` khớp `PENDING`; phân trang biên.

## 9. Còn thiếu / câu hỏi mở

- Bác sĩ (`Doctor`) xem được **mọi** lịch hẹn ở `GET api/appointments` và `GET {id}`, không giới hạn theo `HasDoctorAccess` như mục 1 tài liệu tổng mô tả cho bác sĩ. Cần chốt.
- `searchKeyword` vẫn dùng được ở `my` (chỉ tìm trong lịch của mình), vô hại.
- Danh sách và chi tiết trả **số điện thoại đầy đủ**, còn response khi đặt lịch (F-APT-03/04) trả số đã che. Không nhất quán; chưa xác định từ code đâu là ý định.
- Không có kiểm tra `fromDate <= toDate`; khoảng ngược trả rỗng.

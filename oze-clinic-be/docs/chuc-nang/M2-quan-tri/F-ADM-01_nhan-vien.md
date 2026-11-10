# F-ADM-01 Quản lý nhân viên

> Khung chung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M2.

| Mục | Giá trị |
|---|---|
| Module | M2 Quản trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `ClinicManager` |
| API | `GET api/staff`, `GET api/staff/{userId}`, `POST api/staff`, `PUT api/staff/{userId}`, `PUT api/staff/{userId}/deactivate`, `PUT api/staff/{userId}/activate` |
| Code chính | `StaffController` → `StaffService` → `StaffRepository`, `RegistrationRepository`, `UserRefreshTokenRepository`, `UserManager<ApplicationUser>` |

## 1. Chức năng này làm gì

Quản lý phòng khám tạo tài khoản cho nhân viên (bác sĩ, lễ tân, kỹ thuật viên chụp phim, quản lý), xem danh sách, sửa thông tin và vai trò, vô hiệu hóa hoặc kích hoạt lại. Tạo mới thì hệ thống sinh mật khẩu tạm và gửi qua email; vô hiệu hóa thì khóa đăng nhập và đăng xuất mọi thiết bị.

## 2. Tiền điều kiện

- Đăng nhập, có role `ClinicManager` (`[Authorize(Roles = RoleConstants.ClinicManagerRole)]` ở mức class, `StaffController.cs:13`).
- Sửa, vô hiệu hóa: JWT phải có claim `NameIdentifier` hoặc `sub` (lấy làm `managerId`).
- Bản ghi đích phải có `StaffProfile` và **không** có role `Patient` (nếu không trả 404).
- Tạo mới: dịch vụ gửi email phải hoạt động (gửi mật khẩu tạm thất bại thì rollback toàn bộ).

## 3. API

Mọi endpoint quyền `ClinicManager`. Các endpoint POST/PUT có body dùng `[ApiResponseValidationFilter]`: lỗi validation trả 400 dạng `ApiResponse` (`message` = lỗi đầu tiên, `errors` = tất cả lỗi).

### 3.1 `GET api/staff` – danh sách nhân viên

Query (`StaffQueryRequest`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `Keyword` | string? | Không | Trim. Số bắt đầu bằng `0` được đổi thêm thành `+84...` để so | Tìm theo `FullName`, `Email`, `PhoneNumber` (chứa chuỗi) |
| `Role` | string? | Không | So bằng tuyệt đối với tên role | Lọc theo vai trò |
| `IsActive` | bool? | Không | | Lọc đang hoạt động / đã vô hiệu |

Response: `ApiResponse<List<StaffResponse>>`, HTTP 200, `message = "Success"`, sắp xếp theo `FullName`. Luôn loại người có role `Patient`.

### 3.2 `GET api/staff/{userId}` – chi tiết

Response `ApiResponse<StaffResponse>`, HTTP 200.

### 3.3 `POST api/staff` – tạo nhân viên

**Request** body `CreateStaffRequest` (kế thừa nguyên `UpdateStaffRequest`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `fullName` | string | Có | `[Required]` → `FullNameRequired`; `[MaxLength(100)]` → `FullNameInvalid` | Họ tên |
| `email` | string | Có | `[Required]` → `EmailRequired`; `[MaxLength(256)]`, `[EmailAddress]` → `EmailInvalid`; không trùng | Email, cũng là `UserName` để đăng nhập |
| `phoneNumber` | string | Có | `[Required]` → `PhoneRequired`; chuẩn hóa E.164 qua `PhoneNumberHelper.TryNormalize` (BR-C03); không trùng | Số điện thoại |
| `role` | string | Có | `[Required]` → `RoleRequired`; regex chỉ nhận `Doctor`, `Receptionist`, `DentalImagingTechnician`, `ClinicManager` → `RoleInvalid` | Vai trò |
| `specialization` | string? | Không | `[MaxLength(100)]` → `SpecializationInvalid`; chỉ lưu khi `role = Doctor` | Chuyên khoa |
| `licenseNumber` | string? | Bắt buộc khi `role = Doctor` | `[MaxLength(50)]` → `LicenseNumberInvalid`; trống với Doctor → `LicenseNumberRequired`; không trùng | Số chứng chỉ hành nghề, chỉ lưu với Doctor |

Ví dụ:

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "bs.a@oze.vn",
  "phoneNumber": "0912345678",
  "role": "Doctor",
  "specialization": "Nha chu",
  "licenseNumber": "CCHN-0001"
}
```

**Response thành công** `ApiResponse<StaffResponse>`, HTTP 200 (không phải 201), `message = "Create staff success!"` (`StaffMessage.StaffCreated`).

### 3.4 `PUT api/staff/{userId}` – sửa nhân viên

Body `UpdateStaffRequest`, cùng trường và ràng buộc như 3.3. Gửi đủ mọi trường (ghi đè). Response `ApiResponse<StaffResponse>`, HTTP 200, `message = "Update staff success!"`.

### 3.5 `PUT api/staff/{userId}/deactivate` – vô hiệu hóa

Không body. Response `ApiResponse<StaffResponse>`, HTTP 200, `message = "Deactivate staff success!"`.

### 3.6 `PUT api/staff/{userId}/activate` – kích hoạt lại

Không body. Response `ApiResponse<StaffResponse>`, HTTP 200, `message = "Activate staff success!"`.

### `StaffResponse`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `userId` | string | Id tài khoản (`AspNetUsers.Id`), dùng trong route |
| `fullName` | string | Họ tên |
| `email` | string? | Email |
| `phoneNumber` | string? | `user.PhoneNumber`, nếu null thì lấy `staff.PhoneNumber` |
| `dateOfBirth` | DateOnly? | Ngày sinh (API này không ghi trường này) |
| `gender` | string? | Giới tính (API này không ghi) |
| `role` | string? | Role đầu tiên của user |
| `specialization` | string? | Chuyên khoa |
| `licenseNumber` | string? | Số chứng chỉ |
| `hireDate` | DateOnly? | Ngày vào làm (API này không ghi) |
| `isActive` | bool | Đang hoạt động |
| `updatedAt` | DateTimeOffset? | Lần sửa cuối |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Validation DTO (POST/PUT) | `AuthMessage.FullNameRequired` "Please enter full name.", `FullNameInvalid` "Full name is invalid. Please check again.", `EmailRequired` "Please enter email.", `EmailInvalid` "Email is invalid. Please check again.", `PhoneRequired` "Please enter phone number.", `StaffMessage.RoleRequired` "Please enter role.", `RoleInvalid` "Role is invalid. Please check again.", `SpecializationInvalid` "Specialization is invalid. Please check again.", `LicenseNumberInvalid` "License number is invalid. Please check again." |
| 400 | Body JSON sai kiểu | `AuthMessage.InvalidData` "{0} is invalid. Please check again." |
| 400 | Số điện thoại không chuẩn hóa được | `AuthMessage.InvalidPhone` "Phone number is invalid. Please check again." |
| 400 | Doctor không có số chứng chỉ | `StaffMessage.LicenseNumberRequired` "Please enter license number." |
| 400 | Email đã thuộc tài khoản khác | `AuthMessage.EmailExist` "Email already exists in the system." |
| 400 | Số điện thoại đã thuộc tài khoản khác | `StaffMessage.PhoneExist` "Phone number already exists in the system." |
| 400 | Số chứng chỉ đã thuộc nhân viên khác | `StaffMessage.LicenseNumberExist` "License number already exists in the system." |
| 400 | Tạo: không gửi được email mật khẩu tạm | `AuthMessage.EmailCantSent` "Could not send the email. Please try again later." |
| 400 | Identity từ chối tạo/sửa (không có mô tả) | `StaffMessage.CreateFailed` "Create staff failed" / `StaffMessage.UpdateFailed` "Update staff failed" (nếu có thì trả mô tả lỗi Identity) |
| 400 | Sửa: tự đổi role của chính mình | `StaffMessage.CannotChangeOwnRole` "You cannot change your own role." |
| 400 | Đổi role hoặc vô hiệu hóa người còn ca/lịch hẹn từ nay về sau | `StaffMessage.HasUpcomingWork` "This staff member still has shifts or appointments from now on; move or cancel them first" |
| 400 | Đổi role hoặc vô hiệu hóa quản lý cuối cùng | `StaffMessage.LastManager` "The clinic must keep at least one active clinic manager" |
| 400 | Vô hiệu hóa chính mình | `StaffMessage.CannotDeactivateSelf` "You cannot deactivate your own account." |
| 400 | Vô hiệu hóa người đã vô hiệu | `StaffMessage.AlreadyInactive` "Cannot deactivate because staff is inactive." |
| 400 | Kích hoạt người đang hoạt động | `StaffMessage.AlreadyActive` "Cannot activate because staff is active." |
| 401 | Sửa/vô hiệu hóa mà token không có id người dùng | "User not identified" (chuỗi viết cứng trong controller, không có trong `ErrorConstants`) |
| 401/403 | Chưa đăng nhập / không phải `ClinicManager` | Do ASP.NET Core trả, không qua `ApiResponse` |
| 404 | Không có user, không có `StaffProfile`, hoặc user là `Patient` | `StaffMessage.StaffNotFound` "Staff not found." |

## 4. Luồng xử lý trong code

**Danh sách** (`GET api/staff`)
1. `StaffController.GetStaffListAsync` gọi service – `StaffController.cs:25`.
2. `StaffService.GetStaffListAsync` chuyển thẳng cho repository – `StaffService.cs:38`.
3. `StaffRepository.GetAllAsync`: join `StaffProfiles` với `Users`, đọc role bằng subquery trong cùng câu lệnh – `StaffRepository.cs:20-41`.
4. Bỏ role `Patient` – `StaffRepository.cs:43`; lọc `Keyword` (đổi `0...` thành `+84...`) – `:45-53`; lọc `Role` – `:55-58`; lọc `IsActive` – `:60-63`; sắp theo `FullName` – `:65`.

**Chi tiết** (`GET api/staff/{userId}`)
1. `StaffController.GetStaffAsync` – `StaffController.cs:32`.
2. `StaffService.GetExistingStaffAsync`: tìm user, tìm `StaffProfile`, không có → 404 `StaffNotFound` – `StaffService.cs:285-289`; user có role `Patient` → 404 – `:291-292`.
3. Map sang `StaffResponse` – `StaffService.cs:297-314`.

**Tạo** (`POST api/staff`)
1. Filter validation chạy trước action – `ApiResponseValidationFilterAttribute.cs:16-55`; action `StaffController.CreateStaffAsync` – `StaffController.cs:40`.
2. Chuẩn hóa số điện thoại, sai → `InvalidPhone` – `StaffService.cs:51`.
3. `GetDoctorInfo`: role khác Doctor thì bỏ `Specialization`, `LicenseNumber`; Doctor thiếu số chứng chỉ → `LicenseNumberRequired` – `StaffService.cs:52`, `:234-247`.
4. `EnsureUniqueAsync`: email (`FindByEmailAsync`), số điện thoại (`FindUserByPhoneAsync` với các biến thể), số chứng chỉ (`IsLicenseNumberInUseAsync`) – `StaffService.cs:55`, `:251-261`.
5. Dựng `StaffProfile` (`IsActive = true`) và `ApplicationUser` (`UserName = Email`) – `StaffService.cs:57-76`.
6. Sinh mật khẩu tạm 12 ký tự (`PasswordHelper.GenerateTemporaryPassword`) – `StaffService.cs:78`.
7. Trong transaction (`RegistrationRepository.ExecuteInTransactionAsync`, rollback khi không `Succeeded`) – `StaffService.cs:79-81`:
   - `CreateAsync(user, password)` – `StaffService.cs:208`;
   - `AddToRoleAsync(user, role)` – `:214`;
   - `SendTemporaryPasswordAsync`; lỗi → trả `IdentityResult.Failed(EmailCantSent)` để rollback – `:220-228`.
8. Không thành công → 400 với mô tả lỗi Identity hoặc `CreateFailed` – `StaffService.cs:82-83`.
9. Controller trả 200 kèm `StaffCreated` – `StaffController.cs:43`.

**Sửa** (`PUT api/staff/{userId}`)
1. Lấy `managerId` từ claim, thiếu → 401 – `StaffController.cs:50-54`.
2. `GetExistingStaffAsync` (404 nếu không phải nhân viên) – `StaffService.cs:90`.
3. Chuẩn hóa số điện thoại – `StaffService.cs:92`.
4. Tự đổi role của mình → `CannotChangeOwnRole` – `StaffService.cs:94`.
5. Đổi role thì `EnsureCanLeaveRoleAsync`: còn ca/lịch hẹn từ nay về sau → `HasUpcomingWork`; rời role `ClinicManager` khi chỉ còn ≤ 1 quản lý hoạt động → `LastManager` – `StaffService.cs:95-98`, `:176-185`.
6. `GetDoctorInfo`, `EnsureUniqueAsync` (loại trừ chính user/staff đang sửa) – `StaffService.cs:99-103`.
7. So email/số điện thoại cũ – mới; nếu `UserName` đang bằng email/số cũ thì đổi theo – `StaffService.cs:105-116`.
8. Email đổi → `EmailConfirmed = false`; số đổi → `PhoneNumberConfirmed = false` – `StaffService.cs:119-128`.
9. Đổi email, số hoặc role → đổi `SecurityStamp` (token cũ hết hiệu lực) – `StaffService.cs:130-133`.
10. Cập nhật `StaffProfile` (`FullName`, `PhoneNumber`, `Specialization`, `LicenseNumber`, `UpdatedAt`) – `StaffService.cs:135-139`.
11. Transaction `SaveStaffAsync`: `UpdateAsync(user)`; nếu đổi role thì `RemoveFromRoleAsync` rồi `AddToRoleAsync` (mỗi user đúng một role) – `StaffService.cs:141-143`, `:264-283`.
12. Trả 200 kèm `StaffUpdated` – `StaffController.cs:57`.

**Vô hiệu hóa** (`PUT .../deactivate`)
1. Lấy `managerId`, thiếu → 401 – `StaffController.cs:63-67`.
2. `GetExistingStaffAsync` – `StaffService.cs:152`.
3. Tự vô hiệu hóa mình → `CannotDeactivateSelf` – `StaffService.cs:153`; đã vô hiệu → `AlreadyInactive` – `:154`.
4. `EnsureCanLeaveRoleAsync` (BR-ADM-01) – `StaffService.cs:155`.
5. `staff.IsActive = false`, `LockoutEnabled = true`, `LockoutEnd = DateTimeOffset.MaxValue`, đổi `SecurityStamp` – `StaffService.cs:158-163`.
6. Thu hồi mọi refresh token – `StaffService.cs:165` (BR-ADM-02).
7. `UserManager.UpdateAsync` lưu user, profile và token trong một lần `SaveChanges` – `StaffService.cs:168-170`.
8. Lần làm mới token sau đó: `AuthService` thấy token đã thu hồi của tài khoản bị khóa vĩnh viễn → trả `AuthCode.AccountDisabled` – `AuthService.cs:543-551`.

**Kích hoạt** (`PUT .../activate`)
1. `GetExistingStaffAsync` – `StaffService.cs:189`; đang hoạt động → `AlreadyActive` – `:190`.
2. `IsActive = true`, `LockoutEnd = null`, `AccessFailedCount = 0` – `StaffService.cs:192-195`.
3. `UpdateAsync` – `StaffService.cs:197-199`. Trả 200 kèm `StaffActivated` – `StaffController.cs:77`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-ADM-01 | Không vô hiệu hóa (hoặc đổi role) nhân viên còn ca hoặc lịch hẹn chưa xong từ nay về sau; luôn còn ít nhất một quản lý hoạt động | `StaffService.EnsureCanLeaveRoleAsync` `StaffService.cs:176-185`; `StaffRepository.HasUpcomingWorkAsync` `:68-75`, `CountActiveStaffInRoleAsync` `:77-84` |
| BR-ADM-02 | Vô hiệu hóa thì thu hồi refresh token, lần làm mới sau báo `ACCOUNT_DISABLED` | `StaffService.cs:160-165`; `AuthService.cs:543-551`, `:563-568` |
| BR-C03 | Số điện thoại lưu E.164 | `StaffService.cs:51`, `:92` |
| (code) BR-004 | Email, số điện thoại, số chứng chỉ không trùng | `StaffService.EnsureUniqueAsync` `StaffService.cs:251-261` |
| (code) BR-088 | Bác sĩ bắt buộc có số chứng chỉ; vô hiệu hóa là khóa tài khoản, không xóa | `StaffService.cs:243-244`, `:157-161` |
| (code) | Không tự đổi role của mình, không tự vô hiệu hóa mình | `StaffService.cs:94`, `:153` |
| (code) | Đổi email/số/role thì đổi `SecurityStamp` | `StaffService.cs:130-133` |

"Còn ca" = `StaffSchedules` có `ScheduleDate > hôm nay`, hoặc hôm nay mà chưa kết thúc (`ActualEndTime == null`) và `ShiftEnd > giờ hiện tại`. "Còn lịch hẹn" = `Appointments.DoctorId` = nhân viên, `AppointmentDate >= hôm nay`, trạng thái thuộc `UnfinishedStatuses` (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`). Ngày giờ lấy từ `ClinicClock` (BR-C01).

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `AspNetUsers` | (không có) | Bản ghi mới, `UserName = Email` | Tạo |
| `StaffProfiles` | (không có) | `IsActive = true`, `CreatedAt` | Tạo |
| `AspNetUserRoles` | (không có) | 1 dòng role | Tạo; sửa role thì xóa dòng cũ, thêm dòng mới |
| `AspNetUsers.EmailConfirmed` / `PhoneNumberConfirmed` | `true`/`false` | `false` | Khi quản lý đổi email/số |
| `AspNetUsers.SecurityStamp` | cũ | mới | Khi đổi email/số/role, khi vô hiệu hóa |
| `StaffProfiles.IsActive` | `true` | `false` | Vô hiệu hóa; ngược lại khi kích hoạt |
| `AspNetUsers.LockoutEnd` | null | `DateTimeOffset.MaxValue` | Vô hiệu hóa; kích hoạt đặt lại `null`, `AccessFailedCount = 0` |
| `UserRefreshTokens` | còn hiệu lực | thu hồi | `RevokeUserTokensAsync` khi vô hiệu hóa |

Không ghi `AuditLog`.

## 7. Liên quan

- Trước đó: F-ADM-02 (danh mục role), F-AUTH-02 (quản lý đăng nhập).
- Sau đó: nhân viên đăng nhập bằng email + mật khẩu tạm (F-AUTH-02), đổi mật khẩu (F-AUTH-04); F-ADM-05 xếp ca cho nhân viên đang hoạt động; trang chủ F-ADM-08 hiện bác sĩ đang hoạt động.

## 8. Kiểm thử

- Test hiện có: chưa có test cho `StaffService`/`StaffController`. Có test phía đăng nhập liên quan: `AuthServiceTests.LoginAsync_WhenAccountDisabled_ShouldReturnAccountDisabledCode`, `AuthServiceTests.RefreshTokenAsync_WithTokenRevokedByDeactivation_ShouldReturnAccountDisabledCode`, `AuthServiceTests.RefreshTokenAsync_WhenAccountDisabled_ShouldReturnAccountDisabledCode`.
- Ca cần test thêm:
  - Tạo Doctor thiếu `licenseNumber`; role khác Doctor gửi `licenseNumber` thì bị bỏ.
  - Trùng email / số (dạng `0...` và `+84...`) / số chứng chỉ.
  - Gửi email lỗi → không còn user, profile, role trong DB.
  - Đổi role người còn ca tương lai / còn lịch `CONFIRMED`; đổi role quản lý cuối cùng; tự đổi role mình.
  - Vô hiệu hóa: chính mình, đã vô hiệu, còn ca hôm nay chưa kết thúc, quản lý cuối; kiểm tra refresh token bị thu hồi.
  - Kích hoạt lại: `LockoutEnd = null`, `AccessFailedCount = 0`.

## 9. Còn thiếu / câu hỏi mở

- Khi quản lý đổi email, code đặt `EmailConfirmed = false` nhưng **không gửi** email xác nhận mới. Chưa xác định từ code nhân viên xác nhận lại email bằng cách nào.
- Kích hoạt lại không kiểm tra role của user còn tồn tại/còn `IsActive`.
- Danh sách không phân trang (trả toàn bộ).
- `DateOfBirth`, `Gender`, `HireDate` có trong response nhưng API không cho nhập; nhân viên cũng chưa tự sửa hồ sơ được (Dac_ta F-ME-01 ghi "nhân viên chưa tự sửa được").
- Message 401 "User not identified" viết cứng trong controller, chưa đưa vào `ErrorConstants` (BR-C08).
- Tạo và sửa trả HTTP 200, không phải 201.
- Thay đổi nhân viên không ghi `AuditLog`; BR-C11 không liệt kê quản trị nhân viên nên chưa coi là lệch, nhưng nên chốt.
- Regex `role` cố định 4 role trong `RoleConstants.StaffRoles`; role mới tạo ở F-ADM-02 không gán được cho nhân viên (xem F-ADM-02 mục 9).

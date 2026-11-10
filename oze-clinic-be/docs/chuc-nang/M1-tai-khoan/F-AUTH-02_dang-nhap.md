# F-AUTH-02 Đăng nhập bằng email hoặc số điện thoại

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M1.

| Mục | Giá trị |
|---|---|
| Module | M1 Tài khoản và hồ sơ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi vai trò (`Patient`, `Receptionist`, `Doctor`, `DentalImagingTechnician`, `ClinicManager`); gọi ẩn danh `[AllowAnonymous]` |
| API | `POST api/auth/login` |
| Code chính | `AuthController.LoginAsync` → `AuthService.LoginAsync` → `UserManager` / `SignInManager.CheckPasswordSignInAsync`, `IRegistrationRepository.FindUserByPhoneAsync`, `IJwtTokenGenerator`, `IUserRefreshTokenRepository` |

## 1. Chức năng này làm gì

Người dùng nhập email hoặc số điện thoại cùng mật khẩu. Đúng thì hệ thống cấp access token JWT và refresh token, kèm họ tên và vai trò để FE điều hướng. Sai nhiều lần thì tài khoản bị khóa tạm.

## 2. Tiền điều kiện

- Tài khoản đã hoàn tất đăng ký (F-AUTH-01) hoặc là nhân viên do quản lý tạo.
- Bệnh nhân đăng nhập bằng email thì email phải đã xác nhận (`EmailConfirmed = true`); nhân viên không cần.
- Tài khoản không bị vô hiệu hóa (`LockoutEnd = MaxValue`) và không đang khóa tạm.
- Rate limit `auth`: 60 request / 60 giây / IP (`Program.cs:91-110`).

## 3. API

**Request** `POST api/auth/login`, quyền `[AllowAnonymous]`, có `[ApiResponseValidationFilter]`.

DTO `LoginRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `identifier` | string | Có ("Please enter phone number or email") | Có `@` → coi là email; không thì chuẩn hóa SĐT (E.164) | Email hoặc SĐT, được `Trim()` |
| `password` | string | Có ("Password is required") | | Mật khẩu |

```json
{ "identifier": "0912345678", "password": "matkhau123" }
```

**Response thành công** (`ApiResponse<AuthResult>`, HTTP 200, `message = "Login successful"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `token` | string | Access token JWT, hạn `JwtSettings.ExpiresInMinutes` (≤ 0 thì 60). Claim: `sub`, `nameidentifier`, `name`, `email`, `jti`, `sstamp`, `FullName` (nếu có), `role` |
| `refreshToken` | string | Chuỗi Base64 của 64 byte ngẫu nhiên, hạn 7 ngày |
| `expiresAt` | DateTime? (UTC) | Hạn access token |
| `fullName` | string? | Tên từ `StaffProfile` hoặc `Patient` |
| `role` | string? | **Role đầu tiên** của user |
| `errorMessage` | string? | Luôn `null` khi thành công |
| `success` | bool | Thuộc tính tính toán của `AuthResult` (`ErrorMessage` rỗng) |

**Lỗi** (HTTP 401 cho mọi lỗi nghiệp vụ, kèm `code`)

| HTTP | Khi nào | Message (`ErrorConstants`) | `code` |
|---|---|---|---|
| 400 | Thiếu trường (validation filter) | "Please enter phone number or email" / "Password is required" (chuỗi trong DTO) | |
| 401 | Không tìm thấy user, SĐT không hợp lệ, đăng ký dở dang, bệnh nhân dùng email chưa xác nhận, sai mật khẩu, sign-in không được phép | `AuthMessage.InvalidLogin` "Invalid login, please check again" | `INVALID_CREDENTIALS` |
| 401 | Khóa tạm do sai nhiều lần | `AuthMessage.AccountLocked` "Account is temporarily locked. Please try again later." | `LOCKED_OUT`, kèm `lockoutEnd` |
| 401 | Tài khoản bị vô hiệu hóa (`LockoutEnd = MaxValue`) | `AuthMessage.AccountDisabled` "Account has been disabled. Please contact the clinic." | `ACCOUNT_DISABLED` |
| 429 | Quá rate limit IP | `AuthMessage.TooManyRequests` | |

## 4. Luồng xử lý trong code

1. Controller gọi service; `Success` → 200, ngược lại **401 Unauthorized** (`AuthController.cs:54-62`).
2. Tìm user theo `identifier.Trim()` (`AuthService.cs:479`, `520-537`):
   - Có `@`: `FindByEmailAsync`; nếu user là `Patient` và `EmailConfirmed = false` → coi như không tìm thấy (`AuthService.cs:522-531`).
   - Không có `@`: chuẩn hóa SĐT, sai → `null` (không truy vấn DB); đúng → tìm theo 3 biến thể SĐT (`AuthService.cs:533-536`, `RegistrationRepository.cs:17-21`).
3. Không có user hoặc user là đăng ký dở dang → `InvalidLogin` + `INVALID_CREDENTIALS` (`AuthService.cs:480-482`).
4. `SignInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true)` (`AuthService.cs:484`). Identity cấu hình `MaxFailedAccessAttempts = 5`, `DefaultLockoutTimeSpan = 15 phút`, `AllowedForNewUsers = true` (`PersistenceServiceRegistration.cs:32-34`).
5. `IsLockedOut`: nếu `LockoutEnd == MaxValue` → `AccountDisabled` + `ACCOUNT_DISABLED`; ngược lại `AccountLocked` + `LOCKED_OUT` + `lockoutEnd` (`AuthService.cs:485-496`, `645-646`).
6. Không thành công (sai mật khẩu, `IsNotAllowed`…) → `InvalidLogin` (`AuthService.cs:497-499`).
7. Sinh access token (`JwtTokenGenerator.cs:31-71`) và refresh token (`JwtTokenGenerator.cs:73-79`) (`AuthService.cs:501-505`).
8. Lưu `UserRefreshToken` (`UserId`, `RefreshToken`, `ExpiryDate = now + 7 ngày`; `CreatedAt` do DB mặc định `SYSDATETIMEOFFSET()`) rồi `SaveChangesAsync` (`AuthService.cs:507-514`, `UserRefreshTokenConfiguration.cs:16`).
9. Trả `AuthResult` với `FullName` từ `UserService.GetFullName` và role đầu tiên (`AuthService.cs:516-518`, `603-615`, `UserService.cs:84-92`).
10. Mỗi request sau đó: `OnTokenValidated` từ chối token nếu user không còn, claim `sstamp` khác `SecurityStamp` hiện tại, `LockoutEnd = MaxValue`, hoặc `jti` đã bị thu hồi (`Program.cs:74-85`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-AUTH-05 | Sai nhiều lần khóa tạm (5 lần, 15 phút); vô hiệu hóa trả `ACCOUNT_DISABLED`; sai email/SĐT/mật khẩu đều trả chung `InvalidLogin` | `AuthService.cs:479-499`, `PersistenceServiceRegistration.cs:32-34` |
| BR-AUTH-06 | Access token theo `Jwt:ExpiresInMinutes` (mặc định 60); refresh token 7 ngày | `AuthService.cs:502`, `512`; `JwtTokenGenerator.cs:66` |
| BR-AUTH-01 | Đăng ký dở dang không đăng nhập được | `AuthService.cs:480` |
| BR-C03 | SĐT chuẩn hóa, số sai bị từ chối trước khi truy vấn DB | `AuthService.cs:533-534` |
| (code, không có mã) | Bệnh nhân chỉ đăng nhập bằng email đã xác nhận | `AuthService.cs:524-529` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `AspNetUsers.AccessFailedCount` | n | n+1 khi sai; về 0 khi đúng | Do `SignInManager` xử lý |
| `AspNetUsers.LockoutEnd` | null | `now + 15 phút` khi sai đủ 5 lần | |
| `UserRefreshTokens` | | Thêm 1 dòng (`ExpiryDate = now + 7 ngày`, `RevokedAt = null`) | Lưu refresh token dạng rõ |

## 7. Liên quan

- Trước đó: F-AUTH-01 Đăng ký; tạo nhân viên (M2); F-AUTH-06 Xác nhận email (để bệnh nhân đăng nhập bằng email).
- Sau đó: F-AUTH-03 Làm mới token / đăng xuất; mọi API cần `[Authorize]`.

## 8. Kiểm thử

- `AuthServiceTests`:
  - `LoginAsync_WithCorrectEmailAndPassword_ShouldReturnTokens`
  - `LoginAsync_WhenSuccessful_ShouldSaveRefreshTokenValidForSevenDays`
  - `LoginAsync_WhenSuccessful_AccessTokenShouldExpireAfterConfiguredMinutes`
  - `LoginAsync_WhenExpiryNotConfigured_AccessTokenShouldExpireAfterSixtyMinutes`
  - `LoginAsync_WithSpacesAroundEmail_ShouldTrimAndSucceed`
  - `LoginAsync_WithPhoneNumberInAnyFormat_ShouldFindUserByAllStoredVariants`
  - `LoginAsync_ShouldLockAccountAfterTooManyFailures`
  - `LoginAsync_StaffWithUnconfirmedContact_ShouldStillBeAbleToLogIn`
  - `LoginAsync_WhenEmailNotFound_ShouldReturnInvalidLogin`
  - `LoginAsync_WhenPhoneNotFound_ShouldReturnInvalidLogin`
  - `LoginAsync_WithInvalidPhoneNumber_ShouldReturnInvalidLoginWithoutQueryingDatabase`
  - `LoginAsync_WhenRegistrationNotVerified_ShouldReturnInvalidLogin`
  - `LoginAsync_WithWrongPassword_ShouldReturnInvalidLogin`
  - `LoginAsync_WhenLockedOut_ShouldReturnLockedOutCodeAndLockoutEnd`
  - `LoginAsync_WhenAccountDisabled_ShouldReturnAccountDisabledCode`
  - `LoginAsync_WhenSignInNotAllowed_ShouldReturnInvalidLogin`
- `AuthControllerTests`:
  - `LoginAsync_WhenServiceSucceeds_ShouldReturnOkWithTokens`
  - `LoginAsync_WhenServiceFails_ShouldReturnUnauthorizedWithMessage`
- Ca cần test thêm:
  - Bệnh nhân đăng nhập bằng email chưa xác nhận → `InvalidLogin` (chưa thấy test riêng).
  - `OnTokenValidated` từ chối token có `sstamp` cũ hoặc `jti` đã thu hồi (test tích hợp).
  - Validation filter khi thiếu `identifier`/`password`.

## 9. Còn thiếu / câu hỏi mở

- `AuthResult.Role` chỉ lấy **role đầu tiên** (`AuthService.cs:613`); user nhiều role thì FE không biết role khác (JWT vẫn chứa đủ role).
- Tài khoản bị vô hiệu hóa hoặc khóa tạm trả `ACCOUNT_DISABLED` / `LOCKED_OUT` mà **không cần mật khẩu đúng** (Identity kiểm tra lockout trước khi kiểm mật khẩu), nên lộ việc tài khoản tồn tại. Dac_ta BR-AUTH-05 chỉ yêu cầu ẩn khi sai thông tin đăng nhập; cần xác nhận đây là chấp nhận được.
- Số lần sai (5) và thời gian khóa (15 phút) chỉ có trong code, Dac_ta ghi "sai nhiều lần khóa tạm"; nên ghi rõ con số vào BR-AUTH-05.
- Message thành công `"Login successful"` và message validation trong `LoginRequest` là chuỗi cứng, không có trong `ErrorConstants` (lệch BR-C08).
- Refresh token lưu dạng rõ trong DB (không băm). Chưa xác định từ code đây là quyết định có chủ đích.
- `AuthResult` serialize cả `errorMessage` và `success` dư thừa trong `data`.

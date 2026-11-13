# F-AUTH-01 Đăng ký tài khoản bệnh nhân bằng OTP

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M1. Gộp 3 API: `register`, `verify-otp`, `resend-otp`.

| Mục | Giá trị |
|---|---|
| Module | M1 Tài khoản và hồ sơ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Khách (chưa đăng nhập, `[AllowAnonymous]`) |
| API | `POST api/auth/register`, `POST api/auth/verify-otp`, `POST api/auth/resend-otp` |
| Code chính | `AuthController.RegisterAsync / VerifyOtpAsync / ResendOtpAsync` → `AuthService.RegisterAsync / VerifyOtpAsync / ResendOtpAsync` → `IRegistrationRepository` (`RegistrationRepository`), `UserManager<ApplicationUser>`, `IPendingRegistrationStore` (`PendingRegistrationStore`), `IOtpSendLimiter` (`OtpSendLimiter`) |

## 1. Chức năng này làm gì

Khách tự đăng ký tài khoản bệnh nhân bằng số điện thoại (email tùy chọn). Hệ thống tạo tài khoản ở trạng thái **bị khóa**, gửi mã OTP 6 số qua SMS hoặc email theo lựa chọn. Khách nhập đúng OTP thì tài khoản được mở khóa và có hồ sơ bệnh nhân (tạo mới hoặc liên kết hồ sơ vãng lai cùng số điện thoại).

## 2. Tiền điều kiện

- Không cần đăng nhập.
- Số điện thoại chưa thuộc tài khoản đã hoàn tất đăng ký (tài khoản đăng ký dở dang thì được dùng lại).
- Nếu chọn `VerificationMethod = "Email"` thì phải có `Email`.
- Có cấu hình `RegisterOtpSettings` (`appsettings.json`: `ExpiresInMinutes = 5`, `ResendCooldownSeconds = 60`, `MaxAttempts = 5`; giá trị ≤ 0 thì code dùng mặc định 5 / 60 / 5).
- Cả controller chịu rate limit `auth`: 60 request / 60 giây / IP (`SecurityConstants.cs:10-12`, `Program.cs:91-110`), vượt thì 429 với message `TooManyRequests`.

## 3. API

### 3.1 Đăng ký

**Request** `POST api/auth/register`, quyền `[AllowAnonymous]`, có `[ApiResponseValidationFilter]` (lỗi validation trả `ApiResponse` 400, `message` = lỗi đầu tiên, `errors` = tất cả).

DTO `RegisterRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `fullName` | string | Có (`FullNameRequired`) | `[MaxLength(100)]` → `FullNameInvalid` | Họ tên, được `Trim()` khi lưu |
| `dateOfBirth` | DateOnly? | Có (`DateOfBirthRequired`) | Không được sau ngày hôm nay giờ VN (service) → `DateOfBirthInvalid` | Ngày sinh `yyyy-MM-dd` |
| `gender` | string | Có (`GenderRequired`) | Regex `^(Male\|Female)$` → `GenderInvalid` | Giới tính |
| `phoneNumber` | string | Có (`PhoneRequired`) | Service chuẩn hóa về E.164 bằng `PhoneNumberHelper.TryNormalize` (regex `^(0\|\+84\|84)(3\|5\|7\|8\|9)\d{8}$` sau khi bỏ dấu cách/chấm/gạch) → `InvalidPhone` | Số điện thoại, cũng là `UserName` |
| `email` | string? | Không | Nếu có: ≤ 256 ký tự và hợp lệ theo `EmailAddressAttribute` (service) → `EmailInvalid` | Email |
| `password` | string | Có (`PasswordRequired`) | `[StringLength(32, MinimumLength = 8)]` → `PasswordInvalid` | Mật khẩu |
| `confirmPassword` | string | Có (`ConfirmPasswordRequired`) | `[Compare(Password)]` → `ConfirmPasswordInvalid` | Nhập lại mật khẩu |
| `verificationMethod` | string | Có (`VerificationMethodRequired`) | Regex `^(Sms\|Email)$` → `VerificationMethodInvalid` | Kênh nhận OTP |

Ví dụ:

```json
{
  "fullName": "Nguyễn Văn A",
  "dateOfBirth": "1995-04-20",
  "gender": "Male",
  "phoneNumber": "0912 345 678",
  "email": "a@example.com",
  "password": "matkhau123",
  "confirmPassword": "matkhau123",
  "verificationMethod": "Sms"
}
```

**Response thành công** (`ApiResponse<RegisterPendingResponse>`, HTTP 200). `message` = `OtpSentSms` hoặc `OtpSentEmail`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `sessionId` | string | Mã phiên OTP (GUID dạng `N`), dùng cho `verify-otp` và `resend-otp` |
| `verificationMethod` | string | `Sms` hoặc `Email` |
| `maskedDestination` | string | Nơi nhận mã đã che `*` (SĐT: giữ 4 ký tự đầu + 3 cuối; email: giữ tối đa 2 ký tự đầu phần trước `@`) |
| `expiresAt` | DateTime (UTC) | Hạn OTP (`now + ExpiresInMinutes`) |
| `resendAvailableAt` | DateTime (UTC) | Thời điểm được gửi lại (`LastSentAt + ResendCooldownSeconds`) |

Mã OTP **không** nằm trong response.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Sai validation DTO | `AuthMessage.FullNameRequired`, `FullNameInvalid`, `DateOfBirthRequired`, `GenderRequired`, `GenderInvalid`, `PhoneRequired`, `PasswordRequired`, `PasswordInvalid`, `ConfirmPasswordRequired`, `ConfirmPasswordInvalid`, `VerificationMethodRequired`, `VerificationMethodInvalid`; JSON sai kiểu → `InvalidData` ("{0} is invalid. Please check again.") |
| 400 | SĐT không hợp lệ | `AuthMessage.InvalidPhone` "Phone number is invalid. Please check again." |
| 400 | Ngày sinh ở tương lai | `AuthMessage.DateOfBirthInvalid` "Date of birth is invalid. Please check again." |
| 400 | Email sai định dạng hoặc > 256 | `AuthMessage.EmailInvalid` "Email is invalid. Please check again." |
| 400 | Chọn `Email` nhưng không nhập email | `AuthMessage.EmailRequired` "Please enter email." |
| 400 | SĐT đã thuộc tài khoản hoàn tất | `AuthMessage.PhoneExist` "Patient with phone number {0} already exists in the system." ({0} = SĐT người dùng nhập, đã trim) |
| 400 | Email thuộc tài khoản khác đã hoàn tất | `AuthMessage.EmailExist` "Email already exists in the system." |
| 400 | Identity từ chối tạo/cập nhật user | `"User registration failed"` (chuỗi cứng, không ở `ErrorConstants`), `errors` = mô tả lỗi Identity |
| 400 | Gửi SMS/email lỗi | `AuthMessage.OtpSendFailed` "Could not send the OTP. Please try again later." |
| 429 | Quá 5 mã / 60 phút cho cùng liên hệ (mục đích `register`) | `AuthMessage.OtpTooManyRequests` "Too many codes were requested for this phone number or email. Please try again later" |
| 429 | Quá rate limit IP | `AuthMessage.TooManyRequests` "Too many requests. Please wait a moment and try again" |

### 3.2 Xác thực OTP

**Request** `POST api/auth/verify-otp`, quyền `[AllowAnonymous]`, có `[ApiResponseValidationFilter]`.

DTO `VerifyOtpRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `sessionId` | string | Có (`SessionIdRequired`) | | Lấy từ response `register` |
| `otp` | string | Có (`OtpRequired`) | Regex `^\s*\d{6}\s*$` → `InvalidOtp` | Mã 6 số, cho phép khoảng trắng hai đầu |

```json
{ "sessionId": "3f2a...", "otp": "123456" }
```

**Response thành công** (`ApiResponse`, HTTP 200): `data = null`, `message` = `AuthMessage.AccountCreated` "Create account success!". Không trả token, người dùng phải đăng nhập (F-AUTH-02).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu/sai định dạng trường | `SessionIdRequired`, `OtpRequired`, `InvalidOtp` |
| 400 | Phiên không tồn tại / hết hạn / tài khoản không còn ở trạng thái chờ / security stamp đã đổi | `AuthMessage.OtpExpired` "OTP has expired. Please register again." |
| 400 | OTP sai, hoặc đã sai đủ `MaxAttempts` lần | `AuthMessage.InvalidOtp` "OTP is invalid. Please check again." |
| 400 | Xác thực SMS và có > 1 hồ sơ vãng lai cùng số | `AuthMessage.MultiplePatientRecords` "This phone number belongs to more than one patient record. Please contact the reception desk." |
| 400 | Identity cập nhật user lỗi | `"User registration failed"` + `errors` |

### 3.3 Gửi lại OTP

**Request** `POST api/auth/resend-otp`, quyền `[AllowAnonymous]`, có `[ApiResponseValidationFilter]`.

DTO `ResendOtpRequest`: `sessionId` (string, bắt buộc, `SessionIdRequired`).

**Response thành công**: giống 3.1 (`ApiResponse<RegisterPendingResponse>`, cùng `sessionId`, `expiresAt` và `resendAvailableAt` mới).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Phiên không tồn tại / hết hạn / tài khoản không còn chờ | `AuthMessage.OtpExpired` |
| 400 | Chưa hết thời gian chờ gửi lại | `AuthMessage.OtpResendTooSoon` "Please wait before requesting another OTP." |
| 400 | Gửi lỗi (mã cũ vẫn còn hiệu lực) | `AuthMessage.OtpSendFailed` |
| 429 | Quá 5 mã / 60 phút | `AuthMessage.OtpTooManyRequests` |

## 4. Luồng xử lý trong code

**Register**

1. Controller lấy `baseUrl` = `Request.Scheme://Request.Host` rồi gọi service; `Success` → 200, ngược lại 400 (`AuthController.cs:25-33`).
2. Chuẩn hóa SĐT về E.164, sai → `InvalidPhone` (`AuthService.cs:68-71`).
3. Ngày sinh > ngày hiện tại theo `DateTime.UtcNow.AddHours(7)` → `DateOfBirthInvalid` (`AuthService.cs:74-78`).
4. Email rỗng coi là `null`; có thì kiểm tra độ dài và định dạng (`AuthService.cs:80-84`).
5. `VerificationMethod = Email` mà không có email → `EmailRequired` (`AuthService.cs:86-89`).
6. Tìm user theo 3 biến thể SĐT (`+84…`, `84…`, `0…`) (`AuthService.cs:92`, `RegistrationRepository.cs:17-21`). Có user mà không phải đăng ký dở dang → `PhoneExist` (`AuthService.cs:93-97`). "Đăng ký dở dang" = chưa xác nhận SĐT, chưa xác nhận email, `LockoutEnd == DateTimeOffset.MaxValue` và có role `Patient` (`AuthService.cs:408-414`).
7. Có email: tìm chủ email khác user ở bước 6. Chủ email là tài khoản hoàn tất → `EmailExist`; là đăng ký dở dang → nhả email khỏi tài khoản đó (xóa email, đổi `UserName` nếu đang là email, đổi security stamp) (`AuthService.cs:99-112`, `389-406`).
8. Đếm lượt gửi mã: `OtpSendLimiter.EnsureCanSend("register", email hoặc SĐT)`; quá 5 lần trong cửa sổ 60 phút → ném `TooManyRequestsException` → middleware trả 429 (`AuthService.cs:115-116`, `OtpSendLimiter.cs:16-32`, `GlobalExceptionMiddleware.cs:50-54`).
9. Trong transaction: tạo user mới hoặc cập nhật user dở dang: `UserName = PhoneNumber = SĐT`, `PhoneNumberConfirmed = false`, `EmailConfirmed = false`, `LockoutEnabled = true`, `LockoutEnd = MaxValue`, băm mật khẩu trực tiếp bằng `PasswordHasher` (bỏ qua password policy Identity), security stamp mới; gán role `Patient` nếu chưa có. Lỗi thì rollback (`AuthService.cs:118-125`, `260-290`, `RegistrationRepository.cs:42-61`).
10. Tạo `PendingRegistration` (session id, user id, security stamp, thông tin hồ sơ, `ExpiresAt`, `LastSentAt`, `FailedAttempts = 0`) (`AuthService.cs:127-142`).
11. Sinh OTP 6 số bằng `RandomNumberGenerator`, chỉ lưu hash SHA-256 của `"{sessionId}:{otp}"` (`AuthService.cs:144-145`, `OtpHelper.cs:8-18`).
12. Gửi OTP: Email → `IEmailSender.SendRegistrationOtpAsync`; SMS → `ISmsSender.SendSmsAsync` nội dung `"Ma OTP OZE cua ban la {otp}. Hieu luc {n} phut."`. Lỗi → `OtpSendFailed` (tài khoản dở dang vẫn còn trong DB) (`AuthService.cs:146-149`, `416-438`).
13. Lưu phiên vào `IDistributedCache` (Redis nếu cấu hình `ConnectionStrings:Redis`, không thì RAM) khóa `pending-registration:{sessionId}`, TTL = thời gian còn lại (`AuthService.cs:151`, `PendingRegistrationStore.cs:19-28`).
14. Trả `RegisterPendingResponse` + message theo kênh (`AuthService.cs:153`, `444-463`).

**Verify OTP**

1. Controller gọi service với `baseUrl` (`AuthController.cs:35-43`).
2. Lấy phiên; không có hoặc hết hạn → `OtpExpired` (`AuthService.cs:197-201`).
3. `FailedAttempts >= MaxAttempts` → xóa phiên, `InvalidOtp` (`AuthService.cs:203-208`).
4. So OTP bằng hash, so sánh thời gian hằng (`OtpHelper.cs:20-26`). Sai → tăng `FailedAttempts`; đủ ngưỡng thì xóa phiên, chưa thì lưu lại; trả `InvalidOtp` (`AuthService.cs:210-223`).
5. Lấy user của phiên; user mất, security stamp khác phiên (đã đăng ký lại) hoặc không còn dở dang → xóa phiên, `OtpExpired` (`AuthService.cs:225-230`, `371-380`).
6. Trong transaction, kích hoạt tài khoản (`AuthService.cs:232-234`, `292-338`):
   - Tìm hồ sơ `Patient` chưa liên kết (`UserId == null`, chưa xóa mềm) cùng SĐT (`RegistrationRepository.cs:32-40`).
   - Kênh SMS: > 1 hồ sơ → `MultiplePatientRecords` (rollback); đúng 1 → liên kết, chỉ điền trường đang trống (`DateOfBirth`, `Gender`, `Email`), `UpdatedAt = now` (`AuthService.cs:355-368`); 0 → tạo `Patient` mới mã `BN-yyMMdd-XXXXXX` (`AuthService.cs:340-352`, `901-904`). Đặt `PhoneNumberConfirmed = true`.
   - Kênh Email: chỉ tạo `Patient` mới khi **không** có hồ sơ vãng lai nào cùng số; có thì để lễ tân liên kết (không liên kết, không tạo). Đặt `EmailConfirmed = true`.
   - `LockoutEnd = null`, `AccessFailedCount = 0`, `UserManager.UpdateAsync`.
7. Xóa phiên dù kích hoạt thành công hay thất bại (`AuthService.cs:235`). Thất bại → trả lỗi (`AuthService.cs:236-239`).
8. Kênh SMS và có email: sinh token xác nhận email, gửi link `{baseUrl}/api/auth/confirm-email?userId=…&code=…` (code Base64Url). Lỗi gửi chỉ ghi log, không làm hỏng request (`AuthService.cs:241-255`). Link được xử lý ở F-AUTH-06.
9. Trả `AccountCreated` (`AuthService.cs:257`, `337`).

**Resend OTP**

1. Controller gọi service (`AuthController.cs:45-52`).
2. Phiên không có/hết hạn → `OtpExpired` (`AuthService.cs:158-162`).
3. `UtcNow < LastSentAt + ResendCooldownSeconds` → `OtpResendTooSoon` (`AuthService.cs:164-167`).
4. User không còn hợp lệ cho phiên → xóa phiên, `OtpExpired` (`AuthService.cs:169-173`).
5. `OtpSendLimiter.EnsureCanSend("register", …)` (`AuthService.cs:175-176`).
6. Sinh OTP mới và gửi; lỗi → `OtpSendFailed`, giữ mã cũ (`AuthService.cs:179-183`).
7. Cập nhật hash, `LastSentAt`, `ExpiresAt` mới, `FailedAttempts = 0`, lưu lại phiên (`AuthService.cs:185-190`).
8. Trả `RegisterPendingResponse` (`AuthService.cs:192`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-AUTH-01 | Tài khoản tạo khi đăng ký bị khóa `LockoutEnd = MaxValue` đến khi nhập đúng OTP | `AuthService.cs:276-277` (khóa), `AuthService.cs:327` (mở); login chặn ở `AuthService.cs:480` |
| BR-AUTH-02 | OTP 6 số, hạn `ExpiresInMinutes` (5'); sai `MaxAttempts` (5) lần thì xóa phiên; gửi lại cách nhau `ResendCooldownSeconds` (60s) | `OtpHelper.cs:8-11`, `AuthService.cs:203-223`, `164-167`, `440-442` |
| BR-AUTH-03 | SĐT có đăng ký dở dang thì dùng lại tài khoản, đổi security stamp để phiên OTP cũ mất hiệu lực | `AuthService.cs:92-97`, `281`, `374` |
| BR-AUTH-04 | Xác thực SMS: đúng 1 hồ sơ vãng lai cùng số thì liên kết; nhiều hồ sơ thì báo đến quầy lễ tân | `AuthService.cs:297-312` |
| BR-C03 | SĐT lưu E.164, số sai bị từ chối trước khi truy vấn DB | `AuthService.cs:68-71`, `PhoneNumberHelper.cs:11-39` |
| (code, không có mã) | Tối đa 5 mã / 60 phút / liên hệ / mục đích | `OtpSendLimiter.cs:59-75`, `SecurityConstants.cs:6-7` |
| (code, không có mã) | Email của đăng ký dở dang được nhả cho người đăng ký sau; email của tài khoản hoàn tất thì không | `AuthService.cs:99-112` |
| (code, không có mã) | Mật khẩu 8–32 ký tự, không áp policy Identity (digit/lowercase) khi đăng ký | `RegisterRequest.cs:25-27`, `AuthService.cs:278-279` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `AspNetUsers` (`ApplicationUser`) – register | Không có / đăng ký dở dang | Có, `LockoutEnd = MaxValue`, `PhoneNumberConfirmed = false`, `EmailConfirmed = false`, `SecurityStamp` mới, `PasswordHash` | `UserName = PhoneNumber` (E.164) |
| `AspNetUserRoles` – register | | Role `Patient` | |
| User dở dang khác giữ cùng email – register | Có email | `Email = null`, `NormalizedEmail = null`, stamp mới | `ReleaseEmailAsync` |
| `IMemoryCache` `pending-registration:{sessionId}` | | Phiên OTP (hash OTP, `FailedAttempts`, hạn) | Mất khi restart server |
| `IMemoryCache` `otp-sends:register:{liên hệ}` | | Đếm số lần gửi | Cửa sổ 60 phút tính từ lần gửi đầu |
| `AspNetUsers` – verify-otp | Bị khóa | `LockoutEnd = null`, `AccessFailedCount = 0`, `PhoneNumberConfirmed = true` (SMS) hoặc `EmailConfirmed = true` (Email) | |
| `Patients` – verify-otp | | Tạo mới (`PatientCode`, `FullName`, `DateOfBirth`, `Gender`, `PhoneNumber`, `Email`) hoặc liên kết hồ sơ vãng lai (`UserId`, điền trường trống, `UpdatedAt`) | Kênh Email có hồ sơ vãng lai: không tạo, không liên kết |
| Phiên OTP – verify-otp | Có | Xóa | Kể cả khi kích hoạt thất bại |

## 7. Liên quan

- Trước đó: không có (điểm vào của khách).
- Sau đó: F-AUTH-02 Đăng nhập; F-AUTH-06 Xác nhận email (link gửi sau khi xác thực SMS mà có email); F-ME-01 Hồ sơ của tôi (cần `Patient` đã liên kết).
- Lễ tân liên kết hồ sơ vãng lai khi đăng ký qua Email: Chưa xác định từ code (không thấy API trong phạm vi này).

## 8. Kiểm thử

- `Services/Auth/*Tests`:
  - `RegisterAsync_WithNewPhone_ShouldCreateLockedPatientAccountAndSendSms`
  - `RegisterAsync_WhenSuccessful_ShouldSavePendingSessionAndReturnIt`
  - `RegisterAsync_WithEmailMethod_ShouldSendCodeByEmailOnly`
  - `RegisterAsync_WhenPhoneHasUnfinishedSignUp_ShouldReuseThatAccount`
  - `RegisterAsync_WhenPhoneAlreadyHasAccount_ShouldFail`
  - `RegisterAsync_WhenEmailBelongsToAnotherAccount_ShouldFail`
  - `RegisterAsync_WithInvalidPhone_ShouldFail`
  - `RegisterAsync_WithDateOfBirthInTheFuture_ShouldFail`
  - `RegisterAsync_WithDateOfBirthToday_ShouldBeAccepted`
  - `RegisterAsync_WithInvalidEmail_ShouldFail`
  - `RegisterAsync_WithEmailMethodButNoEmail_ShouldFail`
  - `RegisterAsync_WhenIdentityRejectsAccount_ShouldFailWithoutSendingOtp`
  - `RegisterAsync_WhenSmsFails_ShouldFailWithoutSavingSession`
  - `ResendOtpAsync_AfterCooldown_ShouldSendNewCodeAndRestartSession`
  - `ResendOtpAsync_TooSoon_ShouldFail`
  - `ResendOtpAsync_WhenSessionNotFound_ShouldFail`
  - `ResendOtpAsync_WhenSessionExpired_ShouldFail`
  - `ResendOtpAsync_WhenUserRegisteredAgain_ShouldDropOldSession`
  - `ResendOtpAsync_WhenSmsFails_ShouldKeepOldCodeValid`
  - `VerifyOtpAsync_WithCorrectSmsCode_ShouldActivateAccountAndCreatePatient`
  - `VerifyOtpAsync_WithSmsCodeAndWalkInRecord_ShouldLinkExistingPatient`
  - `VerifyOtpAsync_WithSmsCodeAndSeveralWalkInRecords_ShouldAskForReceptionDesk`
  - `VerifyOtpAsync_WithEmailCode_ShouldConfirmEmailButNotLinkWalkInRecord`
  - `VerifyOtpAsync_WithSmsCodeAndEmail_ShouldSendEmailConfirmationLink`
  - `VerifyOtpAsync_WhenConfirmationEmailFails_ShouldStillSucceed`
  - `VerifyOtpAsync_WithWrongCode_ShouldCountFailedAttempt`
  - `VerifyOtpAsync_WithWrongCodeOnLastAttempt_ShouldDeleteSession`
  - `VerifyOtpAsync_AfterTooManyWrongAttempts_ShouldRejectEvenCorrectCode`
  - `VerifyOtpAsync_WhenSessionNotFoundOrExpired_ShouldFail`
  - `VerifyOtpAsync_WhenAccountAlreadyActivated_ShouldNotActivateAgain`
  - `VerifyOtpAsync_WhenSavingAccountFails_ShouldReturnIdentityErrors`
  - `Registration_RegisterThenVerifySmsCode_ShouldActivateAccount`
- `AuthControllerTests`:
  - `RegisterAsync_ShouldPassRequestBaseUrlToService`
  - `RegisterAsync_WhenServiceFails_ShouldReturnBadRequest`
  - `VerifyOtpAsync_ShouldPassRequestBaseUrlToService`
  - `VerifyOtpAsync_WhenOtpInvalid_ShouldReturnBadRequest`
  - `ResendOtpAsync_WhenServiceSucceeds_ShouldReturnOk`
  - `ResendOtpAsync_WhenTooSoon_ShouldReturnBadRequest`
- Ca cần test thêm:
  - Email đang thuộc đăng ký dở dang của số khác → được nhả và đăng ký thành công (`ReleaseEmailAsync`).
  - `OtpSendLimiter` chặn lần gửi thứ 6 trong 60 phút (register và resend) → 429.
  - Register lại cùng SĐT làm phiên OTP cũ thành `OtpExpired` ở `verify-otp`.
  - Email `EmailFails` ở kênh Email khi register → `OtpSendFailed`.
  - Kênh Email + có hồ sơ vãng lai → user không có `Patient` (kiểm tra tác động lên F-ME-01).
  - Chưa có test cho `ApiResponseValidationFilter` với `RegisterRequest`.

## 9. Còn thiếu / câu hỏi mở

- **Lệch BR-C01**: ngày sinh so với `DateTime.UtcNow.AddHours(7)` (`AuthService.cs:75`) thay vì `ClinicClock.Now` như quy tắc chung.
- **Chưa có trong Dac_ta**: giới hạn 5 mã / 60 phút / liên hệ (`OtpSendLimiter`) và rate limit 60 request / phút / IP cho cả `AuthController`; nên bổ sung vào BR-AUTH-02.
- **Chưa có trong Dac_ta**: kênh Email + có hồ sơ vãng lai cùng số → không tạo, không liên kết hồ sơ, tài khoản kích hoạt **không có `Patient`** (comment `MSG39`). Hệ quả: `PUT api/me` trả `PatientNotLinked`. Cần chốt luồng lễ tân liên kết.
- Mật khẩu đăng ký chỉ kiểm 8–32 ký tự và băm trực tiếp, trong khi đổi/đặt lại mật khẩu (F-AUTH-04/05) đi qua policy Identity (`RequireDigit`, `RequireLowercase`, `RequiredLength = 6`, `PersistenceServiceRegistration.cs:23-27`). Cùng một mật khẩu có thể đăng ký được nhưng không đổi lại được. Cần thống nhất.
- `verify-otp` xóa phiên cả khi kích hoạt thất bại (ví dụ `MultiplePatientRecords`), người dùng phải đăng ký lại (`AuthService.cs:235`).
- Phiên OTP và bộ đếm lưu trong `IMemoryCache`: mất khi restart, không chia sẻ giữa nhiều instance.
- Message `"User registration failed"` là chuỗi cứng, không có trong `ErrorConstants` (lệch BR-C08).
- Các message `OtpSentSms`, `OtpSentEmail`, `OtpSendFailed`, `OtpExpired`, `OtpResendTooSoon`, `MultiplePatientRecords` có ghi chú `TODO(spec)` chưa có mã MSG trong SRS (`ErrorConstants.cs:50`).

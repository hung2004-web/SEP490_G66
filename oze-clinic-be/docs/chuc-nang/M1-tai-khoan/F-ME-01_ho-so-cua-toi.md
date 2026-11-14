# F-ME-01 Xem và sửa hồ sơ của tôi, đổi số điện thoại qua OTP

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M1. API `POST api/me/resend-confirmation-email` được mô tả ở [F-AUTH-06](F-AUTH-06_xac-nhan-email.md).

| Mục | Giá trị |
|---|---|
| Module | M1 Tài khoản và hồ sơ |
| Trạng thái | ✅ Đã có API (nhân viên chỉ xem, chưa tự sửa được) |
| Vai trò được dùng | `GET`: mọi role đã đăng nhập; `PUT`, `verify-phone-otp`, `resend-phone-otp`: `Patient` |
| API | `GET api/me`, `PUT api/me`, `POST api/me/verify-phone-otp`, `POST api/me/resend-phone-otp` |
| Code chính | `MeController.GetProfileAsync / UpdateProfileAsync / VerifyPhoneOtpAsync / ResendPhoneOtpAsync` → `UserService.GetUserProfileAsync / UpdateProfileAsync / VerifyPhoneOtpAsync / ResendPhoneOtpAsync` → `UserManager`, `IPatientRepository` (`PatientRepository`), `IRegistrationRepository`, `IPendingProfileUpdateStore` (`PendingProfileUpdateStore`), `IOtpSendLimiter`, `ISmsSender`, `IEmailSender` |

## 1. Chức năng này làm gì

Người dùng đã đăng nhập xem hồ sơ của mình. Bệnh nhân sửa họ tên, ngày sinh, giới tính, email, địa chỉ và số điện thoại. Không đổi số điện thoại thì lưu ngay. Đổi số điện thoại thì **chưa lưu gì**, hệ thống gửi OTP qua SMS tới số mới; nhập đúng OTP mới lưu toàn bộ thay đổi. Đổi email thì email mới phải xác nhận lại qua link.

## 2. Tiền điều kiện

- Đã đăng nhập (`[Authorize]` ở cấp controller).
- Sửa hồ sơ: role `Patient` và tài khoản đã liên kết hồ sơ `Patient` (`Patients.UserId`, chưa xóa mềm).
- SĐT mới / email mới không thuộc tài khoản khác; SĐT mới không thuộc hồ sơ bệnh nhân khác.
- `RegisterOtpSettings` dùng chung: hạn 5 phút, gửi lại sau 60 giây, sai tối đa 5 lần.
- `MeController` không gắn rate limit `auth`.

## 3. API

### 3.1 Xem hồ sơ

**Request** `GET api/me`, quyền `[Authorize]` (mọi role). Không có tham số.

**Response thành công** (`ApiResponse<UserProfileResponse>`, HTTP 200, `message = "Success"`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | string | Id user |
| `email` | string | Email tài khoản, `""` nếu không có |
| `fullName` | string? | Tên trong `Patient`, không có thì tên `StaffProfile` |
| `phoneNumber` | string? | SĐT tài khoản, không có thì SĐT trong `Patient` |
| `dateOfBirth` | DateOnly? | Từ `Patient` (nhân viên: `null`) |
| `gender` | string? | Từ `Patient` |
| `address` | string? | Từ `Patient` |
| `roles` | string[] | Mọi role của user |

**Lỗi**

| HTTP | Khi nào | Message |
|---|---|---|
| 401 | Không có claim user id | `"User not identified"` (chuỗi cứng) |
| 404 | User không tồn tại | `"User profile not found"` (chuỗi cứng) |

### 3.2 Sửa hồ sơ

**Request** `PUT api/me`, quyền `[Authorize(Roles = Patient)]`, có `[ApiResponseValidationFilter]`.

DTO `UpdateProfileRequest` (gửi **đầy đủ** hồ sơ, không phải PATCH):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `fullName` | string | Có (`AuthMessage.FullNameRequired`) | `[MaxLength(100)]` → `AuthMessage.FullNameInvalid` | Họ tên, `Trim()` |
| `dateOfBirth` | DateOnly? | Có (`AuthMessage.DateOfBirthRequired`) | Không sau hôm nay giờ VN → `AuthMessage.DateOfBirthInvalid` | Ngày sinh |
| `gender` | string | Có (`AuthMessage.GenderRequired`) | Regex `^(Male\|Female)$` → `AuthMessage.GenderInvalid` | Giới tính |
| `phoneNumber` | string | Có (`AuthMessage.PhoneRequired`) | SĐT VN hợp lệ, chuẩn hóa E.164 → `AuthMessage.InvalidPhone` | SĐT (giữ nguyên số cũ nếu không đổi) |
| `email` | string? | Không | Có thì ≤ 256 và đúng định dạng → `AuthMessage.EmailInvalid`. **Rỗng = xóa email** | Email |
| `address` | string? | Không | `[MaxLength(500)]` → `ProfileMessage.AddressInvalid` | Địa chỉ, `Trim()`, rỗng → `null` |

```json
{
  "fullName": "Nguyễn Văn A",
  "dateOfBirth": "1995-04-20",
  "gender": "Male",
  "phoneNumber": "0987654321",
  "email": "a.moi@example.com",
  "address": "12 Lê Lợi, Q1"
}
```

**Response thành công** (`ApiResponse<UpdateProfileResponse>`, HTTP 200)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `otpRequired` | bool | `true` khi đổi SĐT, chưa lưu gì |
| `otpSession` | `RegisterPendingResponse`? | Có khi `otpRequired = true`: `sessionId`, `verificationMethod = "Sms"`, `maskedDestination`, `expiresAt`, `resendAvailableAt` |
| `profile` | `UserProfileResponse`? | Hồ sơ đã lưu, chỉ có khi `otpRequired = false` |

`message`: không đổi SĐT → `ProfileMessage.ProfileUpdated` "Update profile success!"; đổi SĐT → `AuthMessage.OtpSentSms` "OTP has been sent to your phone number."

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Sai validation DTO | `AuthMessage.*Required/*Invalid` như bảng trên, `ProfileMessage.AddressInvalid` |
| 401 / 403 | Chưa đăng nhập / không phải `Patient` | Do middleware |
| 400 | SĐT không hợp lệ | `AuthMessage.InvalidPhone` |
| 400 | Ngày sinh tương lai | `AuthMessage.DateOfBirthInvalid` |
| 400 | Email sai | `AuthMessage.EmailInvalid` |
| 400 | User không có | `AuthMessage.UserNotFound` |
| 400 | Tài khoản chưa liên kết hồ sơ bệnh nhân | `ProfileMessage.PatientNotLinked` "Your account is not linked to a patient record. Please contact the reception desk." |
| 400 | SĐT mới thuộc tài khoản khác hoặc hồ sơ bệnh nhân khác | `AuthMessage.PhoneExist` ({0} = SĐT E.164) |
| 400 | Email mới thuộc tài khoản khác | `AuthMessage.EmailExist` |
| 400 | Gửi SMS lỗi | `AuthMessage.OtpSendFailed` |
| 400 | Identity lưu user lỗi | `ProfileMessage.UpdateFailed` "Update profile failed" + `errors` |
| 429 | Quá 5 mã / 60 phút cho cùng SĐT (mục đích `profile`) | `AuthMessage.OtpTooManyRequests` |

### 3.3 Xác thực OTP đổi SĐT

**Request** `POST api/me/verify-phone-otp`, quyền `Patient`, có `[ApiResponseValidationFilter]`. DTO `VerifyOtpRequest`: `sessionId` (bắt buộc, `SessionIdRequired`), `otp` (bắt buộc, `OtpRequired`, regex `^\s*\d{6}\s*$` → `InvalidOtp`).

**Response thành công** (`ApiResponse<UserProfileResponse>`, HTTP 200, `message = ProfileMessage.ProfileUpdated`): hồ sơ sau khi lưu.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Phiên không có / hết hạn / thuộc user khác / user hoặc patient không còn / security stamp đổi | `ProfileMessage.OtpExpired` "OTP has expired. Please update your profile again." |
| 400 | OTP sai hoặc đã sai đủ 5 lần | `AuthMessage.InvalidOtp` |
| 400 | Hồ sơ đã được lưu lần khác sau khi gửi mã | `ProfileMessage.ProfileChangedMeanwhile` "Your profile was changed after this code was sent. Please make the change again" |
| 400 | SĐT/email bị người khác lấy trong lúc chờ | `AuthMessage.PhoneExist` / `AuthMessage.EmailExist` |
| 400 | Identity lưu lỗi | `ProfileMessage.UpdateFailed` |

### 3.4 Gửi lại OTP đổi SĐT

**Request** `POST api/me/resend-phone-otp`, quyền `Patient`, có `[ApiResponseValidationFilter]`. DTO `ResendOtpRequest`: `sessionId` (bắt buộc).

**Response thành công** (`ApiResponse<RegisterPendingResponse>`, HTTP 200, `message = AuthMessage.OtpSentSms`).

**Lỗi**: `ProfileMessage.OtpExpired` (phiên không hợp lệ hoặc stamp đổi), `AuthMessage.OtpResendTooSoon`, `AuthMessage.OtpSendFailed` (mã cũ vẫn dùng được), 429 `AuthMessage.OtpTooManyRequests`.

## 4. Luồng xử lý trong code

**GET api/me**

1. Lấy `userId` từ claim `NameIdentifier`/`sub`; không có → 401 (`MeController.cs:24-31`, `103-106`).
2. `UserService.GetUserProfileAsync`: tìm user, không có → `null` → 404 (`MeController.cs:33-37`, `UserService.cs:72-78`).
3. Lấy `Patient` theo `UserId` (chưa xóa mềm), ghép `UserProfileResponse` (`UserService.cs:80-81`, `412-425`, `PatientRepository.cs:40-44`).

**PUT api/me**

1. Lấy `userId`, `baseUrl`, gọi service; `Success` → 200, ngược lại 400 (`MeController.cs:42-56`).
2. Chuẩn hóa SĐT → `InvalidPhone` (`UserService.cs:96-99`).
3. Ngày sinh > `DateTime.UtcNow.AddHours(7)` → `DateOfBirthInvalid` (`UserService.cs:102-106`).
4. Kiểm email (`UserService.cs:108-112`).
5. Tìm user → `UserNotFound`; tìm `Patient` → `PatientNotLinked` (`UserService.cs:114-124`).
6. Tạo `PendingProfileUpdate` gồm dữ liệu mới, `SecurityStamp` hiện tại và `ProfileUpdatedAt = patient.UpdatedAt` (`UserService.cs:126-137`).
7. Kiểm liên hệ (`UserService.cs:139-143`, `267-290`):
   - SĐT đổi: tìm tài khoản theo 3 biến thể SĐT (khác user hiện tại) hoặc hồ sơ `Patient` khác (chưa xóa mềm) dùng số đó → `PhoneExist`.
   - Email đổi (không phân biệt hoa thường) và khác rỗng: tài khoản khác giữ email → `EmailExist`.
8. **SĐT không đổi** → `SaveProfileAsync` ngay, trả `profile` (`UserService.cs:145-151`).
9. **SĐT đổi** (`UserService.cs:153-170`):
   - `OtpSendLimiter.EnsureCanSend("profile", SĐT mới)`.
   - Sinh `SessionId`, OTP, lưu hash; gửi SMS `"Ma OTP OZE cua ban la {otp}. Hieu luc {n} phut."` tới SĐT mới; lỗi → `OtpSendFailed` (`UserService.cs:377-391`).
   - Lưu phiên vào `IMemoryCache` khóa `pending-profile-update:{sessionId}`, trả `otpRequired = true` + `otpSession`.

**SaveProfileAsync** (`UserService.cs:293-345`)

1. Ghi `Patient`: `FullName`, `DateOfBirth`, `Gender`, `Email`, `Address`, `UpdatedAt = now`.
2. SĐT đổi: nếu `UserName == PhoneNumber` thì đổi `UserName`; đổi `User.PhoneNumber`, `PhoneNumberConfirmed = true`, `Patient.PhoneNumber`.
3. Email đổi: `User.Email = email mới`, `EmailConfirmed = false`.
4. SĐT hoặc email đổi: đổi `SecurityStamp` (làm mọi access token hiện có mất hiệu lực và hủy phiên OTP hồ sơ khác).
5. `UserManager.UpdateAsync(user)` lưu cả user và patient (chung DbContext); lỗi → `UpdateFailed`.
6. Email đổi và có email: gửi link xác nhận (F-AUTH-06); lỗi chỉ ghi log.
7. Trả hồ sơ với `ProfileUpdated`.

**verify-phone-otp**

1. Controller lấy `userId`, `baseUrl` (`MeController.cs:72-86`).
2. Lấy phiên; không có / khác `userId` / hết hạn → `ProfileMessage.OtpExpired` (`UserService.cs:175-179`, `394-400`).
3. `FailedAttempts >= MaxAttempts` → xóa phiên, `InvalidOtp` (`UserService.cs:181-185`).
4. OTP sai → tăng `FailedAttempts`, đủ ngưỡng xóa phiên, trả `InvalidOtp` (`UserService.cs:187-200`).
5. OTP đúng → **xóa phiên ngay** (`UserService.cs:202`).
6. User/patient không còn hoặc stamp khác → `ProfileMessage.OtpExpired` (`UserService.cs:204-209`).
7. `patient.UpdatedAt != ProfileUpdatedAt` → `ProfileChangedMeanwhile` (`UserService.cs:212-215`).
8. Kiểm lại liên hệ → `PhoneExist`/`EmailExist` (`UserService.cs:218-222`).
9. `SaveProfileAsync` (`UserService.cs:224`).

**resend-phone-otp**

1. Controller lấy `userId` (`MeController.cs:88-101`).
2. Phiên không hợp lệ → `ProfileMessage.OtpExpired` (`UserService.cs:229-233`).
3. Chưa hết 60 giây → `OtpResendTooSoon` (`UserService.cs:235-238`).
4. User không còn / stamp khác → xóa phiên, `ProfileMessage.OtpExpired` (`UserService.cs:240-245`).
5. `OtpSendLimiter.EnsureCanSend("profile", SĐT mới)` (`UserService.cs:247`).
6. Sinh và gửi mã mới; lỗi → `OtpSendFailed`, giữ mã cũ (`UserService.cs:250-254`).
7. Cập nhật hash, `LastSentAt`, `ExpiresAt`, `FailedAttempts = 0`, lưu phiên, trả `otpSession` (`UserService.cs:256-263`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-AUTH-02 | OTP 6 số, hạn 5 phút, sai 5 lần xóa phiên, gửi lại sau 60 giây | `UserService.cs:181-200`, `235-238`, `439-443` |
| BR-C03 | SĐT lưu E.164, số sai bị từ chối trước khi truy vấn DB | `UserService.cs:96-99` |
| BR-C01 | Ngày sinh không ở tương lai theo giờ VN (code dùng `UtcNow + 7h`) | `UserService.cs:102-106` |
| (code, comment BR-006) | SĐT mới chỉ lưu sau khi xác thực OTP gửi tới số đó | `UserService.cs:153-170` |
| (code, comment BR-004/BR-056) | SĐT/email mới không trùng tài khoản khác; SĐT không trùng hồ sơ bệnh nhân khác | `UserService.cs:266-290` |
| (code) | Đổi email thì phải xác nhận lại email | `UserService.cs:319-323`, `338-341` |
| (code) | Phiên OTP của user khác coi như hết hạn (không lộ phiên) | `UserService.cs:393-400` |
| (code) | Hồ sơ đã lưu lần khác sau khi gửi mã thì không áp form cũ | `UserService.cs:211-215` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Patients` | Dữ liệu cũ | `FullName`, `DateOfBirth`, `Gender`, `Email`, `Address`, `PhoneNumber` (nếu đổi), `UpdatedAt = now` | |
| `AspNetUsers.PhoneNumber`, `UserName` | Số cũ | Số mới, `PhoneNumberConfirmed = true` | `UserName` chỉ đổi khi đang bằng SĐT |
| `AspNetUsers.Email` | Email cũ | Email mới / `null`, `EmailConfirmed = false` | |
| `AspNetUsers.SecurityStamp` | Cũ | Mới (khi đổi SĐT hoặc email) | Access token cũ bị từ chối |
| `IMemoryCache` `pending-profile-update:{sessionId}` | | Phiên chờ OTP | Xóa khi OTP đúng hoặc sai đủ 5 lần |
| `IMemoryCache` `otp-sends:profile:{SĐT}` | | Tăng đếm | |

## 7. Liên quan

- Trước đó: F-AUTH-01 (tạo/liên kết `Patient`), F-AUTH-02 (đăng nhập).
- Sau đó: F-AUTH-06 xác nhận email mới; F-AUTH-03 làm mới token sau khi stamp đổi; F-AUTH-02 đăng nhập bằng SĐT mới.

## 8. Kiểm thử

- Test hiện có cho `MeController` và `UserService` (`GetUserProfileAsync`, `UpdateProfileAsync`, `VerifyPhoneOtpAsync`, `ResendPhoneOtpAsync`): **Chưa có** (không tìm thấy trong `OZE.UnitTest`).
- Ca cần test thêm:
  - GET: user có `Patient`, user nhân viên, user không tồn tại → 404.
  - PUT không đổi SĐT: lưu ngay, `otpRequired = false`.
  - PUT đổi SĐT: không lưu, gửi SMS tới số mới, trả `otpSession`.
  - PUT: `PatientNotLinked`, `PhoneExist` (trùng tài khoản và trùng hồ sơ `Patient`), `EmailExist`, `OtpSendFailed`.
  - Đổi email: `EmailConfirmed = false`, stamp đổi, gửi link xác nhận; email rỗng xóa email.
  - verify-phone-otp: đúng mã, sai mã, sai 5 lần, phiên của user khác, `ProfileChangedMeanwhile`, liên hệ bị chiếm trong lúc chờ.
  - resend-phone-otp: quá sớm, gửi lỗi giữ mã cũ, stamp đổi.
  - Role không phải `Patient` gọi PUT → 403.

## 9. Còn thiếu / câu hỏi mở

- **Chưa có unit test** cho toàn bộ F-ME-01.
- **API chưa có trong Dac_ta**: `POST api/me/resend-phone-otp` và `POST api/me/resend-confirmation-email` (Dac_ta chỉ ghi `GET/PUT api/me`, `verify-phone-otp`).
- Dac_ta ghi vai trò "Bệnh nhân", nhưng `GET api/me` mở cho mọi role (nhân viên xem được, chưa sửa được), khớp ghi chú "nhân viên chưa tự sửa được".
- **Đổi email hoặc SĐT đổi security stamp**, nên access token đang dùng bị từ chối ngay ở request kế tiếp; FE phải gọi `refresh-token` (refresh token không bị thu hồi). Dac_ta không nhắc.
- Email mới được ghi **ngay** (chưa xác nhận) và thay email cũ đã xác nhận; trong lúc chờ xác nhận bệnh nhân không đăng nhập/khôi phục bằng email được. Khác với SĐT (phải OTP trước khi lưu). Cần chốt nghiệp vụ.
- Email mới chỉ kiểm trùng với tài khoản (`AspNetUsers`), không kiểm trùng với email trong hồ sơ `Patients` khác; SĐT thì kiểm cả hai.
- Tài khoản đăng ký qua Email có hồ sơ vãng lai cùng số sẽ không có `Patient` (xem F-AUTH-01) → luôn nhận `PatientNotLinked`.
- Ngày sinh so với `DateTime.UtcNow.AddHours(7)` thay vì `ClinicClock.Now` (lệch BR-C01).
- Không ghi `AuditLog` khi sửa hồ sơ; không dùng `RowVersion`, chỉ so `UpdatedAt` ở nhánh OTP (nhánh lưu ngay không có kiểm tra ghi đè đồng thời).
- `verify-phone-otp` xóa phiên ngay khi mã đúng, trước khi kiểm stamp / `ProfileChangedMeanwhile` / trùng liên hệ; lỗi ở các bước đó buộc người dùng làm lại từ `PUT`.
- `PhoneExist` ở PUT format bằng SĐT E.164, còn ở đăng ký format bằng chuỗi người dùng nhập (không đồng nhất).
- Message `"User not identified"`, `"User profile not found"` là chuỗi cứng (lệch BR-C08). `ProfileMessage.OtpExpired`, `UpdateFailed` có `TODO(spec)` chưa có mã MSG.
- Phiên OTP lưu trong `IMemoryCache`: mất khi restart.

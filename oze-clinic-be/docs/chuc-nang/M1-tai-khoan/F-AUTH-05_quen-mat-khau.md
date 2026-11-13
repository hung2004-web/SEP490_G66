# F-AUTH-05 Quên mật khẩu bằng OTP

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M1.

| Mục | Giá trị |
|---|---|
| Module | M1 Tài khoản và hồ sơ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi vai trò; gọi ẩn danh `[AllowAnonymous]` |
| API | `POST api/auth/forgot-password`, `POST api/auth/verify-reset-otp`, `POST api/auth/reset-password` |
| Code chính | `AuthController.ForgotPasswordAsync / VerifyResetOtpAsync / ResetPasswordAsync` → `AuthService` cùng tên → `UserManager`, `IRegistrationRepository.FindUserByPhoneAsync`, `IPasswordResetStore` (`MemoryPasswordResetStore`), `IOtpSendLimiter`, `IUserRefreshTokenRepository` |

## 1. Chức năng này làm gì

Người quên mật khẩu nhập email hoặc số điện thoại, nhận mã OTP 6 số qua kênh tương ứng, nhập đúng mã rồi đặt mật khẩu mới. Hệ thống không tiết lộ tài khoản có tồn tại hay không. Đặt lại thành công thì mọi thiết bị bị đăng xuất.

## 2. Tiền điều kiện

- Không cần đăng nhập.
- Để thực sự nhận mã: tài khoản tồn tại, không phải đăng ký dở dang, và liên hệ dùng để khôi phục đã được chứng minh (bệnh nhân: email/SĐT đã xác nhận; nhân viên: luôn coi là đã chứng minh).
- Bước 3 chỉ chạy khi bước 2 đã xác thực OTP thành công trên cùng `sessionId`.
- `RegisterOtpSettings` dùng chung với đăng ký: hạn 5 phút, tối đa 5 lần sai.
- Rate limit `auth`: 60 request / 60 giây / IP.

## 3. API

Cả 3 action **không** có `[ApiResponseValidationFilter]`: lỗi validation DTO trả `ValidationProblemDetails` mặc định của `[ApiController]`.

### 3.1 Yêu cầu mã

**Request** `POST api/auth/forgot-password`, quyền `[AllowAnonymous]`.

DTO `ForgotPasswordRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `identifier` | string | Có ("Please enter phone number or email") | Có `@` → email (không kiểm định dạng); không thì phải là SĐT VN hợp lệ | Email hoặc SĐT, được `Trim()` |

```json
{ "identifier": "a@example.com" }
```

**Response thành công** (`ApiResponse<RegisterPendingResponse>`, HTTP 200, `message = "Success"` mặc định). Trả giống nhau cho tài khoản có thật và không có thật.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `sessionId` | string | Mã phiên đặt lại mật khẩu |
| `verificationMethod` | string | `Email` nếu identifier có `@`, ngược lại `Sms` |
| `maskedDestination` | string | Email/SĐT đã che `*` |
| `expiresAt` | DateTime (UTC) | Hạn mã (`now + 5 phút`) |
| `resendAvailableAt` | DateTime (UTC) | `now + ResendCooldownSeconds` (không có API gửi lại riêng, xem mục 9) |

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu `identifier` | `ValidationProblemDetails`, "Please enter phone number or email" |
| 400 | Không có `@` và SĐT không hợp lệ | `AuthMessage.InvalidPhone` |
| 400 | Gửi SMS/email lỗi (chỉ với tài khoản thật) | `AuthMessage.OtpSendFailed` |
| 429 | Quá 5 mã / 60 phút cho cùng liên hệ (mục đích `reset`) | `AuthMessage.OtpTooManyRequests` |

### 3.2 Xác thực mã

**Request** `POST api/auth/verify-reset-otp`, quyền `[AllowAnonymous]`.

DTO `VerifyResetOtpRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `sessionId` | string | Có (`AuthMessage.SessionIdRequired`) | | Từ bước 3.1 |
| `otp` | string | Có (`AuthMessage.OtpRequired`) | Regex `^\s*\d{6}\s*$` → `AuthMessage.InvalidOtp` | Mã 6 số |

**Response thành công** (`ApiResponse`, HTTP 200, `message = "OTP verified. You can now set a new password"`, `data = null`).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Phiên không có / hết hạn, hoặc đã sai đủ 5 lần | `AuthMessage.ResetSessionInvalid` "Password reset session is invalid or expired, please request a new code" |
| 400 | Mã đã xác thực trước đó | `AuthMessage.OtpAlreadyUsed` "This code has already been used. Continue with the new password" |
| 400 | Mã sai | `AuthMessage.InvalidOtp` |
| 400 | User không còn | `AuthMessage.UserNotFound` |

### 3.3 Đặt mật khẩu mới

**Request** `POST api/auth/reset-password`, quyền `[AllowAnonymous]`.

DTO `ResetPasswordRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `sessionId` | string | Có ("Session id is required") | | Phiên đã xác thực OTP |
| `newPassword` | string | Có ("New password is required") | `[StringLength(32, MinimumLength = 8)]` → `AuthMessage.PasswordInvalid`; thêm policy Identity (chữ số, chữ thường) | Mật khẩu mới |
| `confirmPassword` | string | Có ("Confirmation password is required") | `[Compare(NewPassword)]` → "New password and confirmation password do not match" | Nhập lại |

```json
{ "sessionId": "9ab1...", "newPassword": "matkhaumoi456", "confirmPassword": "matkhaumoi456" }
```

**Response thành công** (`ApiResponse`, HTTP 200, `message = "Password has been reset successfully"`).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Phiên không có, chưa xác thực OTP, thiếu reset token, hoặc hết hạn | `AuthMessage.ResetSessionInvalid` |
| 400 | User không còn | `AuthMessage.UserNotFound` |
| 400 | Identity từ chối (policy, token không hợp lệ) | `"Reset password failed"` (chuỗi cứng) + `errors`; phiên được giữ để thử lại |

## 4. Luồng xử lý trong code

**forgot-password**

1. Controller gọi service; `Success` → 200, ngược lại 400 (`AuthController.cs:123-129`).
2. `Trim()` identifier; có `@` → `FindByEmailAsync`, `destination` = identifier (`AuthService.cs:680-689`).
3. Không có `@` → chuẩn hóa SĐT, sai → `InvalidPhone`; đúng → tìm theo 3 biến thể, `destination` = SĐT E.164 (`AuthService.cs:690-698`).
4. `OtpSendLimiter.EnsureCanSend("reset", destination)` cho **mọi** identifier, có tài khoản hay không (`AuthService.cs:701`).
5. Không có user / đăng ký dở dang / bệnh nhân có liên hệ chưa xác nhận → tạo **phiên giả** (`UserId = ""`, hash của một GUID ngẫu nhiên nên không mã nào khớp), lưu vào store, trả response giống thật, **không gửi gì** (`AuthService.cs:707-726`, `383-386`).
6. Tài khoản thật: tạo `PasswordResetSession`, sinh OTP, lưu hash (`AuthService.cs:728-736`).
7. Gửi: email `SendEmailAsync(destination, "OZE password reset code", …)`; SMS `"Ma dat lai mat khau OZE cua ban la {otp}. Hieu luc {n} phut."`. Lỗi → `OtpSendFailed`, không lưu phiên (`AuthService.cs:738-755`).
8. Lưu phiên vào `IMemoryCache` khóa `password-reset:{sessionId}`; trả `RegisterPendingResponse` (`AuthService.cs:757-766`).

**verify-reset-otp**

1. Controller gọi service (`AuthController.cs:131-137`).
2. Phiên không có / hết hạn → `ResetSessionInvalid` (`AuthService.cs:772-776`).
3. Phiên đã `IsOtpVerified` → `OtpAlreadyUsed` (`AuthService.cs:779-782`).
4. `FailedAttempts >= MaxAttempts` → xóa phiên, `ResetSessionInvalid` (`AuthService.cs:784-789`).
5. So OTP (đã `Trim()`); sai → tăng `FailedAttempts`, đủ ngưỡng thì xóa phiên, trả `InvalidOtp` (`AuthService.cs:791-804`).
6. Lấy user; không có → xóa phiên, `UserNotFound` (`AuthService.cs:806-811`).
7. Đánh dấu `IsOtpVerified = true`, sinh `ResetToken` bằng `GeneratePasswordResetTokenAsync`, gia hạn phiên thêm 5 phút để nhập mật khẩu (`AuthService.cs:813-818`).
8. Trả thành công (`AuthService.cs:820`).

**reset-password**

1. Controller gọi service (`AuthController.cs:139-145`).
2. Phiên không có / chưa xác thực / thiếu `ResetToken` / hết hạn → `ResetSessionInvalid` (`AuthService.cs:869-874`).
3. User không còn → xóa phiên, `UserNotFound` (`AuthService.cs:876-881`).
4. `UserManager.ResetPasswordAsync(user, ResetToken, NewPassword)` (áp policy Identity, đổi hash và security stamp). Lỗi → `"Reset password failed"`, **giữ phiên** (`AuthService.cs:883-889`).
5. Xóa phiên, thu hồi mọi refresh token của user, `SaveChangesAsync` (`AuthService.cs:891-895`).
6. Trả thành công (`AuthService.cs:897`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-AUTH-07 | Không tiết lộ tài khoản có tồn tại; nơi nhận mã che `*`; mã không nằm trong response | `AuthService.cs:700-726`, `457-459`, `465-475`, `PhoneNumberHelper.cs:48-56` |
| BR-AUTH-08 | Đặt lại mật khẩu thì đăng xuất mọi thiết bị | `AuthService.cs:893-895` (refresh token); security stamp đổi do Identity làm access token cũ mất hiệu lực (`Program.cs:82`) |
| BR-AUTH-02 | OTP 6 số, hạn 5 phút, sai 5 lần xóa phiên | `AuthService.cs:784-804` |
| (code) | Mã chỉ dùng một lần; xác thực xong không mở lại cửa sổ thời gian | `AuthService.cs:779-782` |
| (code) | Liên hệ chưa chứng minh của bệnh nhân không dùng để khôi phục được | `AuthService.cs:707-708`, `383-386` |
| (code) | Tối đa 5 mã / 60 phút / liên hệ | `OtpSendLimiter.cs:59-75` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `IMemoryCache` `password-reset:{sessionId}` | | Phiên (thật hoặc giả), `IsOtpVerified = false` | forgot-password |
| Phiên đặt lại | `IsOtpVerified = false` | `IsOtpVerified = true`, có `ResetToken`, `ExpiresAt` mới | verify-reset-otp |
| `AspNetUsers.PasswordHash`, `SecurityStamp` | Cũ | Mới | reset-password, do Identity |
| `UserRefreshTokens` | Token chưa thu hồi | `RevokedAt = now` | reset-password |
| Phiên đặt lại | Có | Xóa | reset-password thành công |
| `IMemoryCache` `otp-sends:reset:{liên hệ}` | | Tăng đếm | forgot-password |

## 7. Liên quan

- Trước đó: F-AUTH-02 (người dùng không đăng nhập được).
- Sau đó: F-AUTH-02 Đăng nhập với mật khẩu mới.

## 8. Kiểm thử

- `Services/Auth/*Tests`:
  - `ForgotPasswordAsync_WhenPatientPhoneNeverConfirmed_ShouldNotSendCode`
  - `ForgotPasswordAsync_WhenStaffEmailNotConfirmed_ShouldStillSendCode`
  - `ForgotPasswordAsync_WithEmail_ShouldSendCodeByEmailAndSaveSession`
  - `ForgotPasswordAsync_WithPhone_ShouldSendCodeBySmsToNormalizedNumber`
  - `ForgotPasswordAsync_ShouldMaskWhereTheCodeWasSent`
  - `ForgotPasswordAsync_ShouldNotPutTheCodeInTheResponse`
  - `ForgotPasswordAsync_WithSpacesAroundEmail_ShouldTrim`
  - `ForgotPasswordAsync_WithInvalidPhone_ShouldFailWithoutQueryingDatabase`
  - `ForgotPasswordAsync_WhenEmailNotFound_ShouldAnswerLikeAnyAccountWithoutSending`
  - `ForgotPasswordAsync_WhenPhoneNotFound_ShouldAnswerLikeAnyAccountWithoutSending`
  - `ForgotPasswordAsync_WhenRegistrationNotVerified_ShouldAnswerLikeAnyAccountWithoutSending`
  - `ForgotPasswordAsync_WhenSmsFails_ShouldFailWithoutSavingSession`
  - `ForgotPasswordAsync_WhenEmailFails_ShouldFailWithoutSavingSession`
  - `VerifyResetOtpAsync_WithCorrectOtp_ShouldUnlockPasswordReset`
  - `VerifyResetOtpAsync_WithCorrectOtp_ShouldGiveFreshTimeToTypeNewPassword`
  - `VerifyResetOtpAsync_WithSpacesAroundOtp_ShouldStillMatch`
  - `VerifyResetOtpAsync_WhenSessionNotFound_ShouldFail`
  - `VerifyResetOtpAsync_WhenSessionExpired_ShouldFailEvenWithCorrectOtp`
  - `VerifyResetOtpAsync_WithWrongOtp_ShouldCountFailedAttempt`
  - `VerifyResetOtpAsync_WithWrongOtpOnLastAttempt_ShouldDeleteSession`
  - `VerifyResetOtpAsync_AfterTooManyWrongAttempts_ShouldRejectEvenCorrectOtp`
  - `VerifyResetOtpAsync_WhenUserDeleted_ShouldFailAndDeleteSession`
  - `ResetPasswordAsync_WithVerifiedSession_ShouldSetNewPasswordAndSignOutAllDevices`
  - `ResetPasswordAsync_WhenSessionNotFound_ShouldFail`
  - `ResetPasswordAsync_WhenOtpNotVerifiedYet_ShouldFail`
  - `ResetPasswordAsync_WhenResetTokenMissing_ShouldFail`
  - `ResetPasswordAsync_WhenSessionExpired_ShouldFail`
  - `ResetPasswordAsync_WhenUserDeleted_ShouldFailAndDeleteSession`
  - `ResetPasswordAsync_WhenPasswordBreaksPolicy_ShouldKeepSessionForRetry`
  - `PasswordRecovery_ForgotThenVerifyThenReset_ShouldSucceed`
  - `PasswordRecovery_SkippingOtpStep_ShouldNotResetPassword`
- `AuthControllerTests`:
  - `ForgotPasswordAsync_WhenServiceSucceeds_ShouldReturnOkWithSession`
  - `ForgotPasswordAsync_WhenUserNotFound_ShouldReturnBadRequest`
  - `VerifyResetOtpAsync_WhenOtpCorrect_ShouldReturnOk`
  - `VerifyResetOtpAsync_WhenOtpWrong_ShouldReturnBadRequest`
  - `ResetPasswordAsync_WhenServiceSucceeds_ShouldReturnOk`
  - `ResetPasswordAsync_WhenSessionInvalid_ShouldReturnBadRequest`
- Ca cần test thêm:
  - Gọi `verify-reset-otp` lần hai sau khi đã xác thực → `OtpAlreadyUsed` (chưa thấy test riêng).
  - Phiên giả: nhập 5 mã bất kỳ → phiên bị xóa.
  - `OtpSendLimiter` chặn lần thứ 6 với identifier không tồn tại → 429.

## 9. Còn thiếu / câu hỏi mở

- **Có thể lộ tài khoản tồn tại khi gửi lỗi**: `OtpSendFailed` chỉ xảy ra với tài khoản thật (phiên giả không gửi gì), lệch tinh thần BR-AUTH-07 khi nhà cung cấp SMS/email lỗi.
- **Không có API gửi lại mã** cho quên mật khẩu, dù response có `resendAvailableAt`. Gọi lại `forgot-password` sẽ tạo phiên mới (phiên cũ vẫn còn đến khi hết hạn) và bị `OtpSendLimiter` giới hạn. Dac_ta không nhắc.
- Identifier có `@` không được kiểm định dạng email; vẫn trả phiên giả.
- Đặt lại mật khẩu không gỡ khóa tạm (`LockoutEnd`) và không chặn tài khoản bị vô hiệu hóa (nhân viên vô hiệu vẫn nhận mã và đặt lại được, nhưng vẫn không đăng nhập được). Chưa xác định từ code đây là chủ ý.
- Policy mật khẩu khác với đăng ký (xem F-AUTH-04 mục 9).
- Thiếu `[ApiResponseValidationFilter]` trên cả 3 action, lỗi validation không bọc trong `ApiResponse` (lệch BR-C07).
- Message `"OTP verified. You can now set a new password"`, `"Password has been reset successfully"`, `"Reset password failed"`, `"Session id is required"`, tiêu đề/nội dung email đặt lại mật khẩu là chuỗi cứng (lệch BR-C08).
- Phiên lưu trong `IMemoryCache`: mất khi restart, không chia sẻ giữa nhiều instance.

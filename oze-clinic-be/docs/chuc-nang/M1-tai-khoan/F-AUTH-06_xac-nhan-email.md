# F-AUTH-06 Xác nhận email qua link

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M1. Gồm cả API gửi lại link `POST api/me/resend-confirmation-email` vì cùng mục đích.

| Mục | Giá trị |
|---|---|
| Module | M1 Tài khoản và hồ sơ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi vai trò. `confirm-email`: `[AllowAnonymous]`; `resend-confirmation-email`: `[Authorize]` (mọi role) |
| API | `GET api/auth/confirm-email?userId=…&code=…`, `POST api/me/resend-confirmation-email` |
| Code chính | `AuthController.ConfirmEmailAsync` → `AuthService.ConfirmEmailAsync` → `UserManager.ConfirmEmailAsync`; `MeController.ResendConfirmationEmailAsync` → `UserService.ResendEmailConfirmationAsync` → `UserManager.GenerateEmailConfirmationTokenAsync`, `IEmailSender.SendEmailVerificationAsync` |

## 1. Chức năng này làm gì

Người dùng bấm link trong email để xác nhận email. Sau khi xác nhận, bệnh nhân mới đăng nhập được bằng email (F-AUTH-02) và dùng email để khôi phục mật khẩu (F-AUTH-05). Nếu link hết hạn hoặc mất, người dùng đang đăng nhập xin gửi lại link.

## 2. Tiền điều kiện

- Link được gửi ở một trong các chỗ:
  - Sau khi xác thực OTP đăng ký qua SMS mà có email (`AuthService.cs:241-255`).
  - Sau khi đổi email trong hồ sơ (`UserService.cs:338-341`).
  - Gọi `POST api/me/resend-confirmation-email`.
- Gửi lại: đã đăng nhập; tài khoản có email và email chưa xác nhận.
- Hạn token: mặc định của Identity `DataProtectorTokenProvider` (không thấy cấu hình `TokenLifespan` trong code, mặc định framework là 1 ngày). Token gắn với security stamp nên đổi stamp (đổi mật khẩu, đổi SĐT/email) làm link cũ mất hiệu lực.
- `confirm-email` chịu rate limit `auth` (60 request / phút / IP); `resend-confirmation-email` thuộc `MeController`, không có rate limit IP nhưng có `OtpSendLimiter`.

## 3. API

### 3.1 Xác nhận email

**Request** `GET api/auth/confirm-email`, quyền `[AllowAnonymous]`, không có `[ApiResponseValidationFilter]`.

| Trường (query) | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `userId` | string | Có (kiểu `string` không nullable, `Nullable` bật trong `OZE.csproj`) | | Id user |
| `code` | string | Có | Base64Url của token Identity | Token xác nhận |

Ví dụ: `GET /api/auth/confirm-email?userId=6c1e...&code=Q2ZESjhB...`

**Response thành công** (`ApiResponse`, HTTP 200, `message = "Email confirmed successfully"`, `data = null`). API trả JSON, không chuyển hướng về FE.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Thiếu query | `ValidationProblemDetails` mặc định của `[ApiController]` (suy ra từ framework, chưa có test) |
| 400 | `userId` không tồn tại | `AuthMessage.InvalidConfirmationLink` "The confirmation link is invalid or has expired" |
| 400 | `code` không giải mã Base64Url được (exception) | `AuthMessage.InvalidConfirmationLink` |
| 400 | Identity từ chối token (sai, hết hạn, stamp đổi) | `"Email confirmation failed"` (chuỗi cứng) + `errors` mô tả Identity |
| 429 | Quá rate limit IP | `AuthMessage.TooManyRequests` |

### 3.2 Gửi lại link xác nhận

**Request** `POST api/me/resend-confirmation-email`, quyền `[Authorize]`, không có body.

**Response thành công** (`ApiResponse`, HTTP 200, `message` = `ProfileMessage.ConfirmationEmailSent` "A new confirmation link has been sent to your email").

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 401 | Không đăng nhập / không có claim user id | Middleware / `"User not identified"` |
| 400 | User không có, không có email, hoặc email đã xác nhận | `ProfileMessage.NoEmailToConfirm` "There is no email waiting for confirmation" |
| 429 | Quá 5 lần / 60 phút cho cùng email (mục đích `confirm-email`) | `AuthMessage.OtpTooManyRequests` |

## 4. Luồng xử lý trong code

**Tạo link** (dùng chung ở 3 chỗ)

1. `GenerateEmailConfirmationTokenAsync(user)`, mã hóa Base64Url, ghép `{baseUrl}/api/auth/confirm-email?userId={user.Id}&code={encodedCode}` với `baseUrl` = `Request.Scheme://Request.Host` của request hiện tại (`AuthService.cs:245-248`, `UserService.cs:361-375`).
2. Gửi bằng `IEmailSender.SendEmailVerificationAsync`. Lỗi chỉ ghi log, không làm hỏng request gốc (`AuthService.cs:250-254`, `UserService.cs:370-374`).

**confirm-email**

1. Controller gọi service; `Success` → 200, ngược lại 400 (`AuthController.cs:116-122`).
2. Tìm user theo `userId`; không có → `InvalidConfirmationLink` (cùng câu với code sai để không lộ tài khoản) (`AuthService.cs:651-655`).
3. Giải mã Base64Url, gọi `UserManager.ConfirmEmailAsync`; không thành công → `"Email confirmation failed"` + errors (`AuthService.cs:657-666`).
4. Thành công → `"Email confirmed successfully"` (`AuthService.cs:668`).
5. Exception (giải mã lỗi…) → ghi log warning, trả `InvalidConfirmationLink` (`AuthService.cs:670-675`).

**resend-confirmation-email**

1. Lấy `userId` từ claim; không có → 401 (`MeController.cs:58-66`).
2. User không có / không có email / đã xác nhận → `NoEmailToConfirm` (`UserService.cs:350-354`).
3. `OtpSendLimiter.EnsureCanSend("confirm-email", user.Email)` (`UserService.cs:356`).
4. Tạo và gửi link (`UserService.cs:357`), trả `ConfirmationEmailSent` (`UserService.cs:358`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| (code) | Link sai hoặc user không có trả cùng một câu, không lộ tài khoản | `AuthService.cs:650-655`, `670-675` |
| (code) | Bệnh nhân chỉ đăng nhập / khôi phục bằng email đã xác nhận | `AuthService.cs:524-529`, `707-708` |
| (code) | Gửi lại link tối đa 5 lần / 60 phút / email | `UserService.cs:356`, `OtpSendLimiter.cs:59-75` |
| (code) | Gửi email lỗi không làm hỏng đăng ký / cập nhật hồ sơ | `AuthService.cs:250-254`, `UserService.cs:370-374` |

Dac_ta chưa có mã BR riêng cho chức năng này.

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `AspNetUsers.EmailConfirmed` | `false` | `true` | Do `UserManager.ConfirmEmailAsync` |
| `IMemoryCache` `otp-sends:confirm-email:{email}` | | Tăng đếm | Chỉ khi gửi lại |

## 7. Liên quan

- Trước đó: F-AUTH-01 (xác thực SMS có email), F-ME-01 (đổi email).
- Sau đó: F-AUTH-02 đăng nhập bằng email; F-AUTH-05 khôi phục bằng email.

## 8. Kiểm thử

- `Services/Auth/*Tests`:
  - `ConfirmEmailAsync_WithValidCode_ShouldConfirmEmail`
  - `ConfirmEmailAsync_WhenUserNotFound_ShouldFail`
  - `ConfirmEmailAsync_WhenIdentityRejectsCode_ShouldReturnIdentityErrors`
  - `ConfirmEmailAsync_WithCodeThatCannotBeDecoded_ShouldFailWithoutCrashing`
  - `VerifyOtpAsync_WithSmsCodeAndEmail_ShouldSendEmailConfirmationLink`
  - `VerifyOtpAsync_WhenConfirmationEmailFails_ShouldStillSucceed`
- `AuthControllerTests`:
  - `ConfirmEmailAsync_WhenServiceSucceeds_ShouldReturnOk`
  - `ConfirmEmailAsync_WhenCodeInvalid_ShouldReturnBadRequest`
- `resend-confirmation-email` (`UserService.ResendEmailConfirmationAsync`, `MeController`): Chưa có.
- Ca cần test thêm:
  - Gửi lại link khi email đã xác nhận / không có email → `NoEmailToConfirm`.
  - Gửi lại lần thứ 6 trong 60 phút → 429.
  - Link cũ không dùng được sau khi đổi mật khẩu hoặc đổi email (stamp đổi).

## 9. Còn thiếu / câu hỏi mở

- **API gửi lại link `POST api/me/resend-confirmation-email` chưa có trong Dac_ta** (F-AUTH-06 chỉ ghi `GET api/auth/confirm-email`).
- Link trỏ thẳng vào API backend và trả JSON; người dùng bấm link từ email sẽ thấy JSON thô, không có trang FE. Chưa xác định từ code FE có trang trung gian hay không.
- `baseUrl` lấy từ `Request.Host` của request gốc; sau reverse proxy có thể ra host nội bộ. Chưa xác định từ code có cấu hình forwarded headers.
- Lỗi khi Identity từ chối token trả `"Email confirmation failed"` + mô tả Identity, khác với `InvalidConfirmationLink` của trường hợp user không tồn tại. Comment code nói muốn trả cùng một câu, nhưng hai nhánh này vẫn khác message (không lộ tài khoản vì user tồn tại mới tới nhánh này, chỉ là không đồng nhất).
- Message `"Email confirmed successfully"`, `"Email confirmation failed"` là chuỗi cứng (lệch BR-C08).
- Hạn token phụ thuộc mặc định Identity, chưa có cấu hình riêng và chưa có trong Dac_ta.

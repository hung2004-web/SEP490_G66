# F-AUTH-04 Đổi mật khẩu

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M1.

| Mục | Giá trị |
|---|---|
| Module | M1 Tài khoản và hồ sơ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi vai trò đã đăng nhập (`[Authorize]`, không giới hạn role) |
| API | `POST api/auth/change-password` |
| Code chính | `AuthController.ChangePasswordAsync` → `AuthService.ChangePasswordAsync` → `UserManager.ChangePasswordAsync`, `IUserRefreshTokenRepository` |

## 1. Chức năng này làm gì

Người dùng đang đăng nhập nhập mật khẩu hiện tại và mật khẩu mới. Đổi thành công thì các thiết bị khác bị đăng xuất; thiết bị đang dùng được giữ phiên nếu gửi kèm refresh token của nó.

## 2. Tiền điều kiện

- Đã đăng nhập, access token hợp lệ (`[Authorize]`).
- Biết mật khẩu hiện tại.
- Rate limit `auth`: 60 request / 60 giây / IP.

## 3. API

**Request** `POST api/auth/change-password`, quyền `[Authorize]`, **không** có `[ApiResponseValidationFilter]`.

DTO `ChangePasswordRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `currentPassword` | string | Có ("Current password is required") | | Mật khẩu hiện tại |
| `newPassword` | string | Có ("New password is required") | `[StringLength(32, MinimumLength = 8)]` → `AuthMessage.PasswordInvalid`; thêm policy Identity: có chữ số, có chữ thường, ≥ 6 (`PersistenceServiceRegistration.cs:23-27`) | Mật khẩu mới |
| `confirmPassword` | string | Có ("Confirmation password is required") | `[Compare(NewPassword)]` → "New password and confirmation password do not match" | Nhập lại mật khẩu mới |
| `refreshToken` | string? | Không | | Refresh token của thiết bị đang đổi; có thì giữ thiết bị này |

```json
{
  "currentPassword": "matkhau123",
  "newPassword": "matkhaumoi456",
  "confirmPassword": "matkhaumoi456",
  "refreshToken": "q2V...=="
}
```

**Response thành công** (`ApiResponse`, HTTP 200, `message = "Password changed successfully"`, `data = null`).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Sai validation DTO | `ValidationProblemDetails` mặc định của `[ApiController]` (không phải `ApiResponse`); message từ DTO: "Current password is required", "New password is required", `AuthMessage.PasswordInvalid`, "Confirmation password is required", "New password and confirmation password do not match" |
| 401 | Không có access token / token không hợp lệ | Do middleware xác thực |
| 401 | Token không có claim user id | `"User not identified"` (chuỗi cứng) |
| 400 | User không còn | `AuthMessage.UserNotFound` "User not found in system" |
| 400 | Mật khẩu mới trùng mật khẩu hiện tại | `AuthMessage.SamePassword` "New password cannot be the same as current password" |
| 400 | `confirmPassword` có giá trị và khác `newPassword` | `AuthMessage.PasswordMismatch` "New password and confirmation password do not match" |
| 400 | Sai mật khẩu hiện tại hoặc mật khẩu mới vi phạm policy Identity | `"Change password failed"` (chuỗi cứng), `errors` = mô tả lỗi Identity |

## 4. Luồng xử lý trong code

1. Lấy `userId` từ claim `NameIdentifier` hoặc `sub`; không có → 401 `"User not identified"` (`AuthController.cs:102-110`).
2. Gọi service; `Success` → 200, ngược lại 400 (`AuthController.cs:112-113`).
3. Tìm user; không có → `UserNotFound` (`AuthService.cs:825-829`).
4. `CurrentPassword == NewPassword` → `SamePassword` (`AuthService.cs:831-834`).
5. `ConfirmPassword` không rỗng và khác `NewPassword` → `PasswordMismatch` (`AuthService.cs:836-839`).
6. `UserManager.ChangePasswordAsync` kiểm mật khẩu cũ, áp policy, đổi hash và **đổi security stamp**; lỗi → `"Change password failed"` + errors (`AuthService.cs:841-846`).
7. Thu hồi refresh token (`AuthService.cs:849-860`):
   - Có `RefreshToken`, token đang hiệu lực và thuộc user này → thu hồi mọi token **trừ** token đó (`UserRefreshTokenRepository.cs:61-74`).
   - Token không thuộc user / không hiệu lực, hoặc không gửi → thu hồi **tất cả** (`UserRefreshTokenRepository.cs:48-59`).
8. `SaveChangesAsync`, trả `"Password changed successfully"` (`AuthService.cs:862-864`).
9. Vì security stamp đã đổi, mọi access token cũ (kể cả của thiết bị đang dùng) bị `OnTokenValidated` từ chối ở request sau (`Program.cs:74-85`). Thiết bị giữ refresh token phải gọi `refresh-token` để lấy access token mới.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-AUTH-08 | Đổi mật khẩu thì đăng xuất các thiết bị khác | `AuthService.cs:848-860` |
| (code) | Mật khẩu mới khác mật khẩu cũ | `AuthService.cs:831-834` |
| (code) | Mật khẩu mới 8–32 ký tự (DTO) và theo policy Identity (chữ số + chữ thường) | `ChangePasswordRequest.cs:11-14`, `PersistenceServiceRegistration.cs:23-27` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `AspNetUsers.PasswordHash` | Hash cũ | Hash mới | |
| `AspNetUsers.SecurityStamp` | Stamp cũ | Stamp mới | Do Identity; làm mọi access token cũ mất hiệu lực |
| `UserRefreshTokens` | Các token chưa thu hồi | `RevokedAt = now` (trừ token của thiết bị hiện tại nếu hợp lệ) | |

## 7. Liên quan

- Trước đó: F-AUTH-02 Đăng nhập.
- Sau đó: F-AUTH-03 Làm mới token (thiết bị hiện tại cần access token mới); các thiết bị khác phải đăng nhập lại.

## 8. Kiểm thử

- `AuthServiceTests`:
  - `ChangePasswordAsync_WithValidRequest_ShouldChangePasswordAndSignOutAllDevices`
  - `ChangePasswordAsync_WithCurrentRefreshToken_ShouldKeepThisDeviceAndSignOutOthers`
  - `ChangePasswordAsync_WithForeignOrUnknownRefreshToken_ShouldSignOutAllDevices`
  - `ChangePasswordAsync_WithoutConfirmPassword_ShouldSkipMatchCheckAndSucceed`
  - `ChangePasswordAsync_WhenUserNotFound_ShouldFail`
  - `ChangePasswordAsync_WhenNewPasswordSameAsCurrent_ShouldFail`
  - `ChangePasswordAsync_WhenConfirmPasswordDoesNotMatch_ShouldFail`
  - `ChangePasswordAsync_WhenCurrentPasswordIsWrong_ShouldReturnIdentityErrors`
  - `ChangePasswordAsync_WhenNewPasswordBreaksPolicy_ShouldReturnIdentityErrors`
- `AuthControllerTests`:
  - `ChangePasswordAsync_WhenServiceSucceeds_ShouldReturnOkForCurrentUser`
  - `ChangePasswordAsync_WhenServiceFails_ShouldReturnBadRequest`
  - `ChangePasswordAsync_WhenUserIdMissing_ShouldReturnUnauthorized`
- Ca cần test thêm:
  - Access token cũ bị từ chối sau khi đổi mật khẩu (test tích hợp với `OnTokenValidated`).
  - Validation DTO (độ dài 8–32, `Compare`).

## 9. Còn thiếu / câu hỏi mở

- **Thiết bị hiện tại cũng mất access token**: Identity đổi security stamp nên access token đang dùng bị từ chối ngay; chỉ refresh token được giữ. Dac_ta BR-AUTH-08 nói "đăng xuất các thiết bị khác" mà không nêu FE phải gọi `refresh-token`. Cần ghi rõ cho FE.
- **Policy mật khẩu không thống nhất**: đăng ký chỉ yêu cầu 8–32 ký tự (băm trực tiếp, bỏ qua policy Identity), đổi mật khẩu thêm yêu cầu có chữ số và chữ thường. Dac_ta không có quy tắc mật khẩu.
- Kiểm tra `PasswordMismatch` ở service gần như không bao giờ chạy qua API vì DTO đã `[Required]` + `[Compare]` (chỉ có tác dụng khi gọi service trực tiếp).
- Thiếu `[ApiResponseValidationFilter]` nên lỗi validation trả `ValidationProblemDetails`, lệch BR-C07.
- Message `"Password changed successfully"`, `"Change password failed"`, `"User not identified"` và message trong DTO là chuỗi cứng, không có trong `ErrorConstants` (lệch BR-C08).
- Không ghi `AuditLog`. Dac_ta BR-C11 không liệt kê đổi mật khẩu, nên chưa xác định có cần hay không.

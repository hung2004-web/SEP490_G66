# F-AUTH-03 Làm mới token và đăng xuất

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M1.

| Mục | Giá trị |
|---|---|
| Module | M1 Tài khoản và hồ sơ |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Mọi vai trò; cả hai API là `[AllowAnonymous]` (refresh token tự đủ để định danh) |
| API | `POST api/auth/refresh-token`, `POST api/auth/logout` |
| Code chính | `AuthController.RefreshTokenAsync` → `AuthService.RefreshTokenAsync` → `IUserRefreshTokenRepository` (`UserRefreshTokenRepository`), `IJwtTokenGenerator`; `AuthController.LogoutAsync` → `AuthService.LogoutAsync` → `IUserRefreshTokenRepository`, `IAccessTokenRevocationStore` (`AccessTokenRevocationStore`) |

## 1. Chức năng này làm gì

- **Làm mới token**: khi access token hết hạn, FE gửi refresh token để nhận cặp token mới. Refresh token cũ bị thu hồi ngay (dùng một lần).
- **Đăng xuất**: gửi refresh token thì chỉ đăng xuất thiết bị đó; không gửi refresh token nhưng có access token hợp lệ thì đăng xuất **mọi thiết bị**. Access token gửi kèm cũng bị thu hồi ngay.

## 2. Tiền điều kiện

- Refresh token: có refresh token còn hiệu lực (`RevokedAt = null`, `ExpiryDate > now`).
- Logout: có refresh token trong body **hoặc** có access token hợp lệ trong header `Authorization: Bearer`.
- Rate limit `auth`: 60 request / 60 giây / IP.

## 3. API

### 3.1 Làm mới token

**Request** `POST api/auth/refresh-token`, quyền `[AllowAnonymous]`, có `[ApiResponseValidationFilter]`.

DTO `RefreshTokenRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `refreshToken` | string | Có ("Refresh Token is required") | | Refresh token nhận từ login/refresh trước |

```json
{ "refreshToken": "q2V...==" }
```

**Response thành công** (`ApiResponse<AuthResult>`, HTTP 200, `message = "Token refreshed successfully"`): cùng cấu trúc `AuthResult` như F-AUTH-02 (`token`, `refreshToken`, `expiresAt`, `fullName`, `role`, `errorMessage`, `success`).

**Lỗi** (HTTP 401 cho lỗi nghiệp vụ)

| HTTP | Khi nào | Message (`ErrorConstants`) | `code` |
|---|---|---|---|
| 400 | Thiếu `refreshToken` | "Refresh Token is required" (chuỗi trong DTO) | |
| 401 | Token không tồn tại / hết hạn / đã thu hồi (chủ token không bị vô hiệu hóa) | `AuthMessage.InvalidRefreshToken` "Refresh token is expiry or not found" | |
| 401 | Token không còn hiệu lực và chủ token bị vô hiệu hóa | `AuthMessage.AccountDisabled` | `ACCOUNT_DISABLED` |
| 401 | User của token không còn | `AuthMessage.UserNotFound` "User not found in system" | |
| 401 | User bị vô hiệu hóa | `AuthMessage.AccountDisabled` | `ACCOUNT_DISABLED` |
| 401 | User đang khóa tạm | `AuthMessage.AccountLocked` | `LOCKED_OUT`, kèm `lockoutEnd` |
| 401 | Hai request cùng dùng một token, request kia thu hồi trước | `AuthMessage.InvalidRefreshToken` | |

### 3.2 Đăng xuất

**Request** `POST api/auth/logout`, quyền `[AllowAnonymous]`, **không** có `[ApiResponseValidationFilter]`. Body tùy chọn (`RefreshTokenRequest? request = null`). Header `Authorization: Bearer <token>` tùy chọn.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `refreshToken` | string | Không (cả body là tùy chọn) | DTO có `[Required]`: nếu gửi body mà thiếu/rỗng `refreshToken` thì `[ApiController]` trả 400 dạng `ValidationProblemDetails` mặc định (suy ra từ framework, chưa có test) | Refresh token của thiết bị cần đăng xuất |

```json
{ "refreshToken": "q2V...==" }
```

**Response thành công** (`ApiResponse`, HTTP 200, `message = "Logged out successfully"`, `data = null`). Thành công cả khi refresh token không tồn tại hoặc đã hết hạn.

**Lỗi**

| HTTP | Khi nào | Message |
|---|---|---|
| 401 | Không có refresh token và không có access token hợp lệ | `"User not identified"` (chuỗi cứng trong controller) |
| 400 | Service không định danh được (không xảy ra qua controller vì đã chặn ở trên) | `AuthMessage.LogoutRequiresToken` "Refresh token or authenticated user is required" |

## 4. Luồng xử lý trong code

**Refresh token**

1. Controller gọi service; `Success` → 200, ngược lại 401 (`AuthController.cs:64-71`).
2. Tìm token đang hiệu lực (`RevokedAt == null && ExpiryDate > UtcNow`) (`AuthService.cs:540`, `UserRefreshTokenRepository.cs:23-27`).
3. Không thấy: tìm token bất kể trạng thái; nếu chủ token bị vô hiệu hóa (`LockoutEnd == MaxValue`) → `AccountDisabled`; còn lại → `InvalidRefreshToken` (`AuthService.cs:541-555`).
4. Lấy user; không có → `UserNotFound` (`AuthService.cs:557-561`).
5. `LockoutEnd > UtcNow`: vô hiệu hóa → `AccountDisabled`, khóa tạm → `AccountLocked` + `lockoutEnd` (`AuthService.cs:564-574`).
6. Thu hồi token cũ bằng một câu `UPDATE … WHERE Id = @id AND RevokedAt IS NULL`; 0 dòng (request khác đã dùng) → `InvalidRefreshToken` (`AuthService.cs:578-581`, `UserRefreshTokenRepository.cs:29-35`).
7. Sinh access token và refresh token mới, lưu `UserRefreshToken` hạn 7 ngày, `SaveChangesAsync` (`AuthService.cs:584-595`).
8. Trả `AuthResult` với `ExpiresAt = UtcNow + ExpiresInMinutes` (mặc định 60) (`AuthService.cs:597-600`).

**Logout**

1. Nếu request có access token hợp lệ, lấy `userId` từ claim `NameIdentifier` hoặc `sub` (JWT là scheme xác thực mặc định nên `[AllowAnonymous]` vẫn đọc được user) (`AuthController.cs:78-80`, `Program.cs:53-55`).
2. Không có refresh token và không có `userId` → 401 `"User not identified"` (`AuthController.cs:83-86`).
3. Service (`AuthService.cs:617-642`):
   - Có refresh token: tìm token đang hiệu lực, có thì đặt `RevokedAt = now`. **Không kiểm tra token có thuộc `userId` hay không** (`AuthService.cs:619-628`).
   - Không có refresh token, có `userId`: thu hồi mọi refresh token chưa thu hồi của user (`AuthService.cs:629-633`, `UserRefreshTokenRepository.cs:48-59`).
   - Không có cả hai → `LogoutRequiresToken` (`AuthService.cs:634-637`).
   - `SaveChangesAsync`, trả `"Logged out successfully"` (`AuthService.cs:639-641`).
4. Thành công và access token có `jti` + `exp`: đưa `jti` vào `AccessTokenRevocationStore` (IMemoryCache khóa `revoked-jti:{jti}`, sống đến `exp`) (`AuthController.cs:89-98`, `AccessTokenRevocationStore.cs:15-25`).
5. Request sau dùng access token đó bị `OnTokenValidated` từ chối (`Program.cs:80-85`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-AUTH-06 | Refresh token 7 ngày, dùng một lần (xoay vòng, thu hồi nguyên tử) | `AuthService.cs:578-592`, `UserRefreshTokenRepository.cs:29-35` |
| BR-AUTH-05 | Tài khoản vô hiệu hóa / khóa tạm không làm mới được token | `AuthService.cs:541-574` |
| (code, comment BR-109) | Đăng xuất được bằng refresh token kể cả khi access token đã hết hạn | `AuthController.cs:77`, `AuthService.cs:619-628` |
| (code) | Không gửi refresh token mà có access token → đăng xuất mọi thiết bị | `AuthService.cs:629-633` |
| (code) | Access token đã đăng xuất bị chặn ngay, không chờ hết hạn | `AuthController.cs:90-97`, `Program.cs:80-85` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `UserRefreshTokens` (refresh) | Token cũ `RevokedAt = null` | Token cũ `RevokedAt = now`; thêm token mới hạn 7 ngày | |
| `UserRefreshTokens` (logout 1 thiết bị) | `RevokedAt = null` | `RevokedAt = now` | |
| `UserRefreshTokens` (logout tất cả) | Mọi token chưa thu hồi của user | `RevokedAt = now` | |
| `IMemoryCache` `revoked-jti:{jti}` (logout) | | Đánh dấu access token hiện tại đã thu hồi | Hết khi token hết hạn; mất khi restart |

## 7. Liên quan

- Trước đó: F-AUTH-02 Đăng nhập.
- Sau đó: F-AUTH-02 (đăng nhập lại khi refresh thất bại). F-AUTH-04, F-AUTH-05 và vô hiệu hóa nhân viên (M2) cũng thu hồi refresh token.

## 8. Kiểm thử

- `Services/Auth/*Tests`:
  - `RefreshTokenAsync_WithActiveToken_ShouldReturnNewTokenPair`
  - `RefreshTokenAsync_WithActiveToken_ShouldRevokeOldToken`
  - `RefreshTokenAsync_WhenAnotherCallRevokedTheTokenFirst_ShouldFailWithoutNewToken`
  - `RefreshTokenAsync_WithActiveToken_ShouldSaveNewTokenValidForSevenDays`
  - `RefreshTokenAsync_WithActiveToken_AccessTokenShouldExpireAfterConfiguredMinutes`
  - `RefreshTokenAsync_WhenExpiryNotConfigured_AccessTokenShouldExpireAfterSixtyMinutes`
  - `RefreshTokenAsync_WithUnknownExpiredOrRevokedToken_ShouldFail`
  - `RefreshTokenAsync_WithTokenRevokedByDeactivation_ShouldReturnAccountDisabledCode`
  - `RefreshTokenAsync_WithRevokedTokenOfActiveUser_ShouldFailWithoutCode`
  - `RefreshTokenAsync_WhenUserDeleted_ShouldFailWithoutIssuingTokens`
  - `RefreshTokenAsync_WhenAccountDisabled_ShouldReturnAccountDisabledCode`
  - `RefreshTokenAsync_WhenTemporarilyLockedOut_ShouldReturnLockedOutCode`
  - `RefreshTokenAsync_WhenLockoutAlreadyEnded_ShouldReturnNewTokenPair`
  - `LogoutAsync_WithoutRefreshToken_ShouldSignOutAllDevices`
  - `LogoutAsync_WithBlankRefreshToken_ShouldSignOutAllDevices`
  - `LogoutAsync_WithOwnRefreshToken_ShouldSignOutOnlyThatDevice`
  - `LogoutAsync_WithRefreshTokenOnly_ShouldRevokeWithoutUserId`
  - `LogoutAsync_WithRefreshToken_ShouldRevokeEvenIfUserIdDiffers`
  - `LogoutAsync_WithUnknownOrExpiredRefreshToken_ShouldStillSucceed`
  - `LogoutAsync_WithoutUserIdOrRefreshToken_ShouldFail`
- `AuthControllerTests`:
  - `RefreshTokenAsync_WhenServiceSucceeds_ShouldReturnOk`
  - `RefreshTokenAsync_WhenTokenInvalid_ShouldReturnUnauthorized`
  - `LogoutAsync_WithRefreshToken_ShouldSignOutThatDeviceOfCurrentUser`
  - `LogoutAsync_WithoutBody_ShouldSignOutAllDevices`
  - `LogoutAsync_WhenTokenUsesSubClaim_ShouldReadUserIdFromIt`
  - `LogoutAsync_WhenUserIdMissing_ShouldReturnUnauthorized`
  - `LogoutAsync_WithRefreshTokenOnly_ShouldSucceedWithoutAccessToken`
- Ca cần test thêm:
  - Logout thành công đưa `jti` vào `AccessTokenRevocationStore` và request sau bị 401 (test tích hợp).
  - Gửi body `{}` tới `logout` (validation `[Required]` của `RefreshTokenRequest`).
  - `AccessTokenRevocationStore` bỏ qua token đã hết hạn.

## 9. Còn thiếu / câu hỏi mở

- **Đăng xuất tất cả thiết bị chỉ thu hồi refresh token** và `jti` của access token đang gửi. Access token của **các thiết bị khác** vẫn dùng được đến khi hết hạn (tối đa `ExpiresInMinutes`) vì security stamp không đổi. Comment ở `SecurityConstants.cs:14-15` nói "logout" làm đổi stamp, nhưng `LogoutAsync` không đổi stamp. Dac_ta F-AUTH-03 không nêu rõ; cần chốt.
- Logout bằng refresh token **không kiểm tra token thuộc user đang đăng nhập** (`AuthService.cs:619-628`, có test xác nhận hành vi này). Ai giữ refresh token của người khác cũng thu hồi được.
- Sau khi sai `[Required]` ở body `logout`, lỗi trả về dạng `ValidationProblemDetails` chứ không phải `ApiResponse` (thiếu `[ApiResponseValidationFilter]`), lệch BR-C07.
- Danh sách `jti` bị thu hồi nằm trong `IMemoryCache`: mất khi restart, không chia sẻ giữa nhiều instance.
- Các message `"Token refreshed successfully"`, `"Logged out successfully"`, `"User not identified"`, `"Refresh Token is required"` là chuỗi cứng, không có trong `ErrorConstants` (lệch BR-C08).
- Comment code dùng mã cũ `BR-101`, `BR-102`, `BR-109` không khớp mã `BR-AUTH-xx` trong Dac_ta.

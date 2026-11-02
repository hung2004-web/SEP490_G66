# Sequence diagram: AuthService (Mermaid)

Các sơ đồ tuần tự dưới đây lấy từ code thật trong `OZE.Application/Services/AuthService.cs` và `OZE/Controllers/AuthController.cs`. Cùng cách xem với class diagram (xem phần cuối file).

Các thành phần dùng chung trong mọi sơ đồ:

| Ký hiệu | Là gì |
|---|---|
| Client | Trình duyệt (React) gọi API |
| Controller | `AuthController` |
| Service | `AuthService` |
| UserManager, SignInManager | ASP.NET Identity |
| RegRepo | `IRegistrationRepository` |
| RefreshRepo | `IUserRefreshTokenRepository` |
| PendingStore | `IPendingRegistrationStore` (OTP đăng ký, lưu trong bộ nhớ) |
| ResetStore | `IPasswordResetStore` (OTP quên mật khẩu, lưu trong bộ nhớ) |
| Jwt | `IJwtTokenGenerator` |
| Sms, Email | `ISmsSender` (Twilio), `IEmailSender` (SendGrid) |
| DB | SQL Server |

## 1. Đăng ký tài khoản (Register)

```mermaid
%%{init: {"look": "classic", "theme": "default", "sequence": {"wrap": true, "width": 150, "actorMargin": 40, "messageMargin": 30, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as AuthController
    participant S as AuthService
    participant UM as UserManager
    participant RR as RegRepo
    participant PS as PendingStore
    participant Sms as SmsSender
    participant Em as EmailSender
    participant DB as SQL Server

    C->>Ctl: POST api/auth/register
    Ctl->>S: RegisterAsync(request, baseUrl)
    S->>S: Chuẩn hóa số điện thoại, kiểm tra ngày sinh và email
    alt Dữ liệu không hợp lệ
        S-->>Ctl: Lỗi (số điện thoại, ngày sinh, email)
        Ctl-->>C: 400 kèm thông báo
    end
    S->>RR: FindUserByPhoneAsync(số điện thoại)
    RR->>DB: Tìm tài khoản theo số điện thoại
    DB-->>RR: user hoặc null
    RR-->>S: user
    alt Số đã có tài khoản đã xác thực
        S-->>Ctl: Lỗi PhoneExist
        Ctl-->>C: 400
    end
    opt Có email
        S->>UM: FindByEmailAsync(email)
        UM-->>S: emailOwner
        Note over S: Email của người khác thì báo lỗi EmailExist
    end
    S->>RR: ExecuteInTransactionAsync(SaveUnverifiedUser)
    RR->>UM: Tạo hoặc cập nhật user (khóa, chưa xác thực)
    UM->>DB: INSERT hoặc UPDATE AspNetUsers
    RR->>UM: AddToRole Patient
    UM->>DB: INSERT AspNetUserRoles
    RR-->>S: Kết quả
    S->>S: Sinh OTP, băm OTP, tạo PendingRegistration (sessionId)
    alt Xác thực bằng SMS
        S->>Sms: SendSmsAsync(số điện thoại, mã OTP)
    else Xác thực bằng email
        S->>Em: SendRegistrationOtpAsync(email, tên, OTP, hạn)
    end
    alt Gửi OTP thất bại
        S-->>Ctl: Lỗi OtpSendFailed
        Ctl-->>C: 400
    end
    S->>PS: Save(pending, thời gian sống)
    S-->>Ctl: sessionId, nơi gửi đã che, thời điểm hết hạn
    Ctl-->>C: 200 chờ nhập OTP
```

## 2. Xác thực OTP đăng ký (VerifyOtp)

```mermaid
%%{init: {"look": "classic", "theme": "default", "sequence": {"wrap": true, "width": 150, "actorMargin": 40, "messageMargin": 30, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as AuthController
    participant S as AuthService
    participant PS as PendingStore
    participant RR as RegRepo
    participant UM as UserManager
    participant Em as EmailSender
    participant DB as SQL Server

    C->>Ctl: POST api/auth/verify-otp (sessionId, otp)
    Ctl->>S: VerifyOtpAsync(request, baseUrl)
    S->>PS: Get(sessionId)
    PS-->>S: pending hoặc null
    alt Hết hạn hoặc không có phiên
        S-->>Ctl: Lỗi OtpExpired
        Ctl-->>C: 400
    end
    alt Nhập sai quá số lần cho phép
        S->>PS: Remove(sessionId)
        S-->>Ctl: Lỗi InvalidOtp
        Ctl-->>C: 400
    end
    S->>S: So khớp OTP với bản băm
    alt OTP sai
        S->>PS: Tăng số lần sai rồi Save (hoặc Remove nếu quá số lần)
        S-->>Ctl: Lỗi InvalidOtp
        Ctl-->>C: 400
    end
    S->>UM: Lấy user đang chờ kích hoạt
    UM-->>S: user
    S->>RR: ExecuteInTransactionAsync(ActivateAccount)
    RR->>DB: Tìm hồ sơ bệnh nhân walk-in cùng số điện thoại
    DB-->>RR: danh sách hồ sơ
    alt Xác thực bằng SMS
        Note over RR: Có 1 hồ sơ thì liên kết, chưa có thì tạo Patient mới, nhiều hơn 1 thì báo lỗi
    else Xác thực bằng email
        Note over RR: Chưa có hồ sơ thì tạo mới, trùng số điện thoại thì để lễ tân liên kết
    end
    RR->>UM: UpdateAsync(user) mở khóa tài khoản, đánh dấu đã xác thực
    UM->>DB: UPDATE AspNetUsers, INSERT Patients
    RR-->>S: Kích hoạt thành công
    S->>PS: Remove(sessionId)
    opt Xác thực bằng SMS và có email
        S->>UM: GenerateEmailConfirmationTokenAsync(user)
        S->>Em: SendEmailVerificationAsync(user, link xác nhận)
        Note over S,Em: Gửi email lỗi chỉ ghi log, không làm hỏng đăng ký
    end
    S-->>Ctl: Tạo tài khoản thành công
    Ctl-->>C: 200
```

## 3. Đăng nhập (Login)

```mermaid
%%{init: {"look": "classic", "theme": "default", "sequence": {"wrap": true, "width": 150, "actorMargin": 40, "messageMargin": 30, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as AuthController
    participant S as AuthService
    participant UM as UserManager
    participant RR as RegRepo
    participant SM as SignInManager
    participant J as Jwt
    participant RT as RefreshRepo
    participant DB as SQL Server

    C->>Ctl: POST api/auth/login (email hoặc số điện thoại, mật khẩu)
    Ctl->>S: LoginAsync(request)
    alt Định danh có dấu @
        S->>UM: FindByEmailAsync(email)
        UM-->>S: user
    else Là số điện thoại
        S->>S: Chuẩn hóa số điện thoại
        S->>RR: FindUserByPhoneAsync(số điện thoại)
        RR-->>S: user
    end
    alt Không có user hoặc chưa xác thực OTP
        S-->>Ctl: Lỗi InvalidLogin
        Ctl-->>C: 400
    end
    S->>SM: CheckPasswordSignInAsync(user, mật khẩu, khóa khi sai)
    SM->>DB: Kiểm tra mật khẩu, đếm số lần sai
    SM-->>S: Kết quả
    alt Tài khoản đang bị khóa
        S-->>Ctl: Lỗi tạm khóa
        Ctl-->>C: 400
    else Sai mật khẩu
        S-->>Ctl: Lỗi InvalidLogin
        Ctl-->>C: 400
    end
    S->>J: GenerateTokenAsync(user)
    J-->>S: Access token (JWT)
    S->>J: GenerateRefreshToken()
    J-->>S: Refresh token
    S->>RT: AddAsync(refresh token, hạn 7 ngày)
    S->>RT: SaveChangesAsync()
    RT->>DB: INSERT UserRefreshTokens
    S-->>Ctl: Token, refresh token, thời điểm hết hạn
    Ctl-->>C: 200 Login successful
```

## 4. Làm mới token và đăng xuất (RefreshToken, Logout)

```mermaid
%%{init: {"look": "classic", "theme": "default", "sequence": {"wrap": true, "width": 150, "actorMargin": 40, "messageMargin": 30, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as AuthController
    participant S as AuthService
    participant RT as RefreshRepo
    participant UM as UserManager
    participant J as Jwt
    participant DB as SQL Server

    rect rgb(232, 240, 253)
    Note over C,DB: Làm mới token
    C->>Ctl: POST api/auth/refresh-token
    Ctl->>S: RefreshTokenAsync(request)
    S->>RT: GetActiveTokenAsync(refresh token)
    RT-->>S: token đang còn hiệu lực hoặc null
    alt Token không hợp lệ
        S-->>Ctl: Lỗi InvalidRefreshToken
        Ctl-->>C: 400
    end
    S->>UM: FindByIdAsync(userId)
    UM-->>S: user
    S->>RT: Thu hồi refresh token cũ (RevokedAt)
    S->>J: Tạo access token mới và refresh token mới
    S->>RT: AddAsync(refresh token mới) và SaveChangesAsync
    RT->>DB: UPDATE và INSERT UserRefreshTokens
    S-->>Ctl: Cặp token mới
    Ctl-->>C: 200
    end

    rect rgb(231, 246, 236)
    Note over C,DB: Đăng xuất
    C->>Ctl: POST api/auth/logout (có token đăng nhập)
    Ctl->>S: LogoutAsync(userId, refreshToken)
    alt Không gửi refresh token
        S->>RT: RevokeUserTokensAsync(userId) đăng xuất mọi thiết bị
    else Có refresh token
        S->>RT: Chỉ thu hồi token của thiết bị này
    end
    S->>RT: SaveChangesAsync()
    RT->>DB: UPDATE UserRefreshTokens
    S-->>Ctl: Logged out successfully
    Ctl-->>C: 200
    end
```

## 5. Quên mật khẩu (3 bước: Forgot, VerifyResetOtp, ResetPassword)

```mermaid
%%{init: {"look": "classic", "theme": "default", "sequence": {"wrap": true, "width": 150, "actorMargin": 40, "messageMargin": 30, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as AuthController
    participant S as AuthService
    participant UM as UserManager
    participant RR as RegRepo
    participant RS as ResetStore
    participant Sms as SmsSender
    participant Em as EmailSender
    participant RT as RefreshRepo
    participant DB as SQL Server

    rect rgb(232, 240, 253)
    Note over C,DB: Bước 1: yêu cầu mã OTP
    C->>Ctl: POST api/auth/forgot-password (email hoặc số điện thoại)
    Ctl->>S: ForgotPasswordAsync(request)
    alt Là email
        S->>UM: FindByEmailAsync(email)
    else Là số điện thoại
        S->>RR: FindUserByPhoneAsync(số điện thoại)
    end
    alt Không có user hoặc chưa xác thực
        S-->>Ctl: Lỗi UserNotFound
        Ctl-->>C: 400
    end
    S->>S: Tạo PasswordResetSession, sinh và băm OTP
    alt Gửi qua email
        S->>Em: SendEmailAsync(email, mã đặt lại mật khẩu)
    else Gửi qua SMS
        S->>Sms: SendSmsAsync(số điện thoại, mã OTP)
    end
    S->>RS: Save(session, thời gian sống)
    S-->>Ctl: sessionId, nơi gửi đã che
    Ctl-->>C: 200
    end

    rect rgb(255, 243, 220)
    Note over C,DB: Bước 2: xác minh OTP
    C->>Ctl: POST api/auth/verify-reset-otp (sessionId, otp)
    Ctl->>S: VerifyResetOtpAsync(request)
    S->>RS: Get(sessionId)
    alt Phiên hết hạn hoặc không có
        S-->>Ctl: Lỗi ResetSessionInvalid
        Ctl-->>C: 400
    end
    S->>S: So khớp OTP
    alt OTP sai
        S->>RS: Tăng số lần sai rồi Save (hoặc Remove nếu quá số lần)
        S-->>Ctl: Lỗi InvalidOtp
        Ctl-->>C: 400
    end
    S->>UM: GeneratePasswordResetTokenAsync(user)
    UM-->>S: reset token
    S->>RS: Save(session đã xác minh, kèm reset token, gia hạn)
    S-->>Ctl: OTP verified
    Ctl-->>C: 200
    end

    rect rgb(231, 246, 236)
    Note over C,DB: Bước 3: đặt mật khẩu mới
    C->>Ctl: POST api/auth/reset-password (sessionId, mật khẩu mới)
    Ctl->>S: ResetPasswordAsync(request)
    S->>RS: Get(sessionId)
    alt Chưa xác minh OTP hoặc hết hạn
        S-->>Ctl: Lỗi ResetSessionInvalid
        Ctl-->>C: 400
    end
    S->>UM: ResetPasswordAsync(user, reset token, mật khẩu mới)
    UM->>DB: UPDATE AspNetUsers (mật khẩu)
    alt Mật khẩu không đạt quy tắc
        S-->>Ctl: Lỗi (giữ phiên để thử lại)
        Ctl-->>C: 400
    end
    S->>RS: Remove(sessionId)
    S->>RT: RevokeUserTokensAsync(userId) đăng xuất mọi thiết bị
    S->>RT: SaveChangesAsync()
    RT->>DB: UPDATE UserRefreshTokens
    S-->>Ctl: Password has been reset successfully
    Ctl-->>C: 200
    end
```

## Config cho mermaid.live (tab Config)

Công cụ có sẵn tab **Config** (mặc định là `{"theme": "redux-color"}`, theme này tô màu và vẽ kiểu tay nên hình trông lạ). Xóa nội dung cũ trong tab Config và dán đoạn này vào:

```json
{
  "theme": "default",
  "look": "classic",
  "sequence": {
    "wrap": true,
    "width": 150,
    "actorMargin": 40,
    "messageMargin": 30,
    "mirrorActors": false
  }
}
```

Muốn giữ màu cho các ô nhân vật như hình bạn đã thấy nhưng vẫn nét thẳng, chỉ đổi dòng đầu thành `"theme": "redux-color"` và giữ `"look": "classic"`.

Dòng `%%{init: ...}%%` ở đầu mỗi sơ đồ làm cùng việc này, dùng cho nơi không có tab Config (VS Code, GitHub). Dùng một trong hai là đủ, nếu dùng cả hai thì dòng trong code được ưu tiên.

## Cách xem và xuất ảnh

**VS Code:** cài tiện ích **Markdown Preview Mermaid Support**, mở file này rồi bấm `Ctrl+Shift+V`.

**Web:** vào https://mermaid.live, dán code của **một** sơ đồ (phần giữa hai dòng ` ```mermaid ` và ` ``` `) vào ô bên trái, bấm **Actions** rồi chọn PNG hoặc SVG.

**GitHub** tự vẽ khi mở file `.md` này.

## Ghi chú

- Sơ đồ chỉ vẽ luồng chính và các nhánh lỗi quan trọng, không vẽ từng lỗi nhỏ để hình đọc được.
- OTP và phiên đăng ký, đặt lại mật khẩu lưu trong **bộ nhớ** (`PendingStore`, `ResetStore`), nên không có bước ghi DB cho phần này. Khi triển khai Redis, hai thành phần này sẽ đổi sang Redis mà luồng không đổi.
- Các luồng còn lại (đổi mật khẩu, xác nhận email, gửi lại OTP) có cấu trúc tương tự, nếu cần tôi vẽ thêm.

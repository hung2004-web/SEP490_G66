using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Constants
{
    public static class ErrorConstants
    {
        public static class AuthMessage
        {
            public const string UserExist = "User is exist in system";
            public const string PhoneExist = "Phone number is already in use";
            public const string InvalidPhone = "Invalid phone number format";
            public const string InvalidOtp = "Invalid or expired OTP";
            public const string OtpExpired = "OTP session is expired, please register again";
            public const string OtpResendTooSoon = "Please wait before requesting another OTP";
            public const string UserNotFound = "User not found in system";
            public const string EmailConfirmRequired = "Email confirm Required";
            public const string InvalidLogin = "Invalid login, please check again";
            public const string InvalidRefreshToken = "Refresh token is expiry or not found";
            public const string TwoFactorRequired = "Two factor required, please check your code";
            public const string SamePassword = "New password cannot be the same as current password";
            public const string PasswordMismatch = "New password and confirmation password do not match";
        }

        public static class Common
        {
            public const string NotFound = "Not Found";
        }

    }
}

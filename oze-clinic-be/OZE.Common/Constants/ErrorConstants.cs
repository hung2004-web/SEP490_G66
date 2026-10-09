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
            public const string EmailNotFound = "Email not found in system";
            public const string EmailCantSent = "Could not send the email. Please try again later.";
            public const string EmailExist = "Email is exist in system";
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

        public static class RoomMessage
        {
            public const string RoomNotFound = "Room not found";
            public const string RoomNameExist = "Room name already exists";
            public const string InvalidRoomType = "Room type must be one of: General, Imaging, Treatment";
            public const string InvalidStatus = "Room status must be one of: Active, Maintenance, Inactive";
            public const string RoomInUse = "Room is used by schedules or queue entries and cannot be deleted. Set its status to Inactive instead";
        }

        public static class Common
        {
            public const string NotFound = "Not Found";
        }

        public static class ServiceMessage
        {
            public const string ServiceNotFound = "Service not found in system";
            public const string ServiceCodeExist = "Service code already exists in system";
            public const string ServiceInUse = "Cannot delete service because it is currently linked to existing invoices or treatment plan stages. Please deactivate the service instead.";
            public const string InvalidRoomType = "Required room type must be one of: General, Imaging, Treatment";
            public const string InvalidPrice = "Reference price must be greater than or equal to 0";
            public const string InvalidEstimatedMinutes = "Estimated minutes must be greater than 0";
        }
    }
}

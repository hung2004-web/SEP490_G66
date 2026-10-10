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
            public const string UserExist = "User is exist in system";

            // Register (UC-01). Texts follow the System Messages table of SRS Report 3.
            // MSG07
            public const string FullNameRequired = "Please enter full name.";
            public const string DateOfBirthRequired = "Please enter date of birth.";
            public const string GenderRequired = "Please enter gender.";
            public const string PhoneRequired = "Please enter phone number.";
            public const string EmailRequired = "Please enter email.";
            public const string PasswordRequired = "Please enter password.";
            public const string ConfirmPasswordRequired = "Please enter confirm password.";
            public const string VerificationMethodRequired = "Please enter verification method.";
            public const string SessionIdRequired = "Please enter session id.";
            public const string OtpRequired = "Please enter OTP.";
            // MSG66
            public const string FullNameInvalid = "Full name is invalid. Please check again.";
            public const string DateOfBirthInvalid = "Date of birth is invalid. Please check again.";
            public const string GenderInvalid = "Gender is invalid. Please check again.";
            public const string InvalidPhone = "Phone number is invalid. Please check again.";
            public const string EmailInvalid = "Email is invalid. Please check again.";
            public const string PasswordInvalid = "Password is invalid. Please check again.";
            public const string ConfirmPasswordInvalid = "Confirm password is invalid. Please check again.";
            public const string VerificationMethodInvalid = "Verification method is invalid. Please check again.";
            public const string InvalidOtp = "OTP is invalid. Please check again.";
            public const string InvalidData = "{0} is invalid. Please check again.";
            // MSG10, formatted with the phone number
            public const string PhoneExist = "Patient with phone number {0} already exists in the system.";
            // MSG68
            public const string EmailExist = "Email already exists in the system.";
            // MSG63
            public const string AccountCreated = "Create account success!";
            // TODO(spec): the messages below have no System Message code in the SRS yet.
            public const string OtpSentSms = "OTP has been sent to your phone number.";
            public const string OtpSentEmail = "OTP has been sent to your email.";
            public const string OtpSendFailed = "Could not send the OTP. Please try again later.";
            public const string OtpExpired = "OTP has expired. Please register again.";
            public const string OtpResendTooSoon = "Please wait before requesting another OTP.";
            public const string MultiplePatientRecords = "This phone number belongs to more than one patient record. Please contact the reception desk.";
            public const string UserNotFound = "User not found in system";
            public const string EmailConfirmRequired = "Email confirm Required";
            public const string InvalidLogin = "Invalid login, please check again";
            public const string InvalidRefreshToken = "Refresh token is expiry or not found";
            public const string TwoFactorRequired = "Two factor required, please check your code";
            public const string SamePassword = "New password cannot be the same as current password";
            public const string PasswordMismatch = "New password and confirmation password do not match";
        }

        // Update profile (UC-08). Texts follow the System Messages table of SRS Report 3.
        public static class ProfileMessage
        {
            // MSG64
            public const string ProfileUpdated = "Update profile success!";
            // MSG66
            public const string AddressInvalid = "Address is invalid. Please check again.";
            // MSG39
            public const string PatientNotLinked = "Your account is not linked to a patient record. Please contact the reception desk.";
            // TODO(spec): the messages below have no System Message code in the SRS yet.
            public const string OtpExpired = "OTP has expired. Please update your profile again.";
            public const string UpdateFailed = "Update profile failed";
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

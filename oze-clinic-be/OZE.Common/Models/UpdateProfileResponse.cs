namespace OZE.Common.Models
{
    public class UpdateProfileResponse
    {
        // True when the phone number was changed: nothing is saved until the OTP sent to the new number is verified.
        public bool OtpRequired { get; set; }
        public RegisterPendingResponse? OtpSession { get; set; }
        // The saved profile, set only when OtpRequired is false.
        public UserProfileResponse? Profile { get; set; }
    }
}

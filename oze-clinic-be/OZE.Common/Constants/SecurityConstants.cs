namespace OZE.Common.Constants
{
    public static class SecurityConstants
    {
        // Codes sent to one phone number or email: at most this many per window, so codes cannot be guessed session after session
        public const int OtpSendsPerWindow = 5;
        public const int OtpSendWindowMinutes = 60;

        // Calls to the account endpoints from one address (IP), against floods of messages and sign-in attempts
        public const string AuthRateLimitPolicy = "auth";
        public const int AuthRequestsPerWindow = 60;
        public const int AuthRateLimitWindowSeconds = 60;

        // Claim in the access token holding the security stamp of the account when the token was issued; a token whose
        // stamp no longer matches (logout, password change, role change, account locked) is refused
        public const string SecurityStampClaim = "sstamp";
    }
}

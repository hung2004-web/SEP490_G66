using System.Security.Cryptography;
using System.Text;

namespace OZE.Application.Helpers
{
    public static class OtpHelper
    {
        public static string Generate()
        {
            return RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        }

        // Only the hash is stored; the session id is part of it so a hash cannot be reused by another session.
        public static string Hash(string sessionId, string otp)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{sessionId}:{otp}"));
            return Convert.ToHexString(bytes);
        }

        public static bool Matches(string otpHash, string sessionId, string otp)
        {
            var leftBytes = Encoding.UTF8.GetBytes(otpHash);
            var rightBytes = Encoding.UTF8.GetBytes(Hash(sessionId, otp.Trim()));
            return leftBytes.Length == rightBytes.Length
                && CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
        }
    }
}

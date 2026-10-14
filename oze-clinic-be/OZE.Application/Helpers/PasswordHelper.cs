using System.Security.Cryptography;

namespace OZE.Application.Helpers
{
    public static class PasswordHelper
    {
        // Always contains an upper-case letter, a lower-case letter and a digit, so it passes the Identity password policy.
        public static string GenerateTemporaryPassword(int length = 12)
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnpqrstuvwxyz";
            const string digits = "23456789";
            const string all = upper + lower + digits;

            var chars = new char[length];
            chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
            chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
            chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
            for (var i = 3; i < length; i++)
                chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

            for (var i = length - 1; i > 0; i--)
            {
                var j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }

            return new string(chars);
        }
    }
}

using System.Text.RegularExpressions;

namespace OZE.Application.Helpers
{
    public static class PhoneNumberHelper
    {
        private static readonly Regex VietnamPhoneRegex = new(
            @"^(0|\+84|84)(3|5|7|8|9)\d{8}$",
            RegexOptions.Compiled);

        public static bool TryNormalize(string? input, out string e164)
        {
            e164 = string.Empty;
            if (string.IsNullOrWhiteSpace(input))
            {
                return false;
            }

            var digits = Regex.Replace(input.Trim(), @"[\s\-\.]", string.Empty);
            if (!VietnamPhoneRegex.IsMatch(digits))
            {
                return false;
            }

            if (digits.StartsWith("+84"))
            {
                e164 = digits;
            }
            else if (digits.StartsWith("84"))
            {
                e164 = "+" + digits;
            }
            else
            {
                e164 = "+84" + digits[1..];
            }

            return true;
        }

        public static string Mask(string e164)
        {
            if (string.IsNullOrEmpty(e164) || e164.Length < 6)
            {
                return e164;
            }

            return e164[..4] + new string('*', e164.Length - 7) + e164[^3..];
        }
    }
}

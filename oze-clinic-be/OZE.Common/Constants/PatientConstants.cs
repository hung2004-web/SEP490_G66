namespace OZE.Common.Constants
{
    public static class PatientConstants
    {
        public static class Gender
        {
            public const string Male = "Male";
            public const string Female = "Female";
            public const string Other = "Other";

            public static readonly string[] AllowedGenders = { Male, Female, Other };

            public static bool TryNormalize(string? gender, out string? normalized)
            {
                if (string.IsNullOrWhiteSpace(gender))
                {
                    normalized = null;
                    return true;
                }

                var trimmed = gender.Trim();
                var matched = AllowedGenders.FirstOrDefault(g => string.Equals(g, trimmed, StringComparison.OrdinalIgnoreCase));
                if (matched != null)
                {
                    normalized = matched;
                    return true;
                }

                normalized = null;
                return false;
            }
        }

        public static class BloodType
        {
            public const string APositive = "A+";
            public const string ANegative = "A-";
            public const string BPositive = "B+";
            public const string BNegative = "B-";
            public const string ABPositive = "AB+";
            public const string ABNegative = "AB-";
            public const string OPositive = "O+";
            public const string ONegative = "O-";

            public static readonly string[] AllowedBloodTypes = { APositive, ANegative, BPositive, BNegative, ABPositive, ABNegative, OPositive, ONegative };

            public static bool TryNormalize(string? bloodType, out string? normalized)
            {
                if (string.IsNullOrWhiteSpace(bloodType))
                {
                    normalized = null;
                    return true;
                }

                var trimmed = bloodType.Trim();
                var matched = AllowedBloodTypes.FirstOrDefault(b => string.Equals(b, trimmed, StringComparison.OrdinalIgnoreCase));
                if (matched != null)
                {
                    normalized = matched;
                    return true;
                }

                normalized = null;
                return false;
            }
        }

        public static class MedicalProfile
        {
            public static readonly string[] AllowedRecordTypes = { "History", "Condition", "Allergy", "Medication" };
            public static readonly string[] AllowedSeverities = { "Mild", "Moderate", "Severe" };
            public static readonly string[] AllowedStatuses = { "Active", "Resolved", "Discontinued" };

            public static bool TryNormalizeRecordType(string? recordType, out string? normalized)
            {
                if (string.IsNullOrWhiteSpace(recordType))
                {
                    normalized = null;
                    return false;
                }

                var trimmed = recordType.Trim();
                var matched = AllowedRecordTypes.FirstOrDefault(r => string.Equals(r, trimmed, StringComparison.OrdinalIgnoreCase));
                if (matched != null)
                {
                    normalized = matched;
                    return true;
                }

                normalized = null;
                return false;
            }

            public static bool TryNormalizeSeverity(string? severity, out string? normalized)
            {
                if (string.IsNullOrWhiteSpace(severity))
                {
                    normalized = null;
                    return true;
                }

                var trimmed = severity.Trim();
                var matched = AllowedSeverities.FirstOrDefault(s => string.Equals(s, trimmed, StringComparison.OrdinalIgnoreCase));
                if (matched != null)
                {
                    normalized = matched;
                    return true;
                }

                normalized = null;
                return false;
            }

            public static bool TryNormalizeStatus(string? status, out string? normalized)
            {
                if (string.IsNullOrWhiteSpace(status))
                {
                    normalized = "Active";
                    return true;
                }

                var trimmed = status.Trim();
                var matched = AllowedStatuses.FirstOrDefault(s => string.Equals(s, trimmed, StringComparison.OrdinalIgnoreCase));
                if (matched != null)
                {
                    normalized = matched;
                    return true;
                }

                normalized = null;
                return false;
            }
        }
    }
}

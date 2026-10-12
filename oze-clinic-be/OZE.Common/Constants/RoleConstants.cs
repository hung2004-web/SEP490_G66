namespace OZE.Common.Constants
{
    public static class RoleConstants
    {
        public const string PatientRole = "Patient";
        public const string DoctorRole = "Doctor";
        public const string ReceptionistRole = "Receptionist";
        public const string DentalImagingTechnicianRole = "DentalImagingTechnician";
        public const string ClinicManagerRole = "ClinicManager";

        // Roles a Clinic Manager can give to a staff account (UC-44).
        public static readonly string[] StaffRoles = { DoctorRole, ReceptionistRole, DentalImagingTechnicianRole, ClinicManagerRole };
    }
}

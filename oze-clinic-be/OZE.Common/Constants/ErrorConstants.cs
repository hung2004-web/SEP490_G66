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
            public const string ResetSessionInvalid = "Password reset session is invalid or expired, please request a new code";
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

        public static class RoomMessage
        {
            public const string RoomNotFound = "Room not found";
            public const string RoomNameExist = "Room name already exists";
            public const string InvalidRoomType = "Room type must be one of: GeneralTreatment, MinorSurgery, XRay";
            public const string InvalidStatus = "Room status must be one of: Active, Maintenance, Inactive";
            public const string RoomInUse = "Room is used by schedules or queue entries and cannot be deleted. Set its status to Inactive instead";
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

        // Manage User (UC-44). Texts follow the System Messages table of SRS Report 3.
        public static class StaffMessage
        {
            // MSG07
            public const string RoleRequired = "Please enter role.";
            public const string LicenseNumberRequired = "Please enter license number.";
            // MSG66
            public const string RoleInvalid = "Role is invalid. Please check again.";
            public const string SpecializationInvalid = "Specialization is invalid. Please check again.";
            public const string LicenseNumberInvalid = "License number is invalid. Please check again.";
            // MSG67
            public const string StaffNotFound = "Staff not found.";
            // MSG68
            public const string PhoneExist = "Phone number already exists in the system.";
            public const string LicenseNumberExist = "License number already exists in the system.";
            // MSG63
            public const string StaffCreated = "Create staff success!";
            // MSG64
            public const string StaffUpdated = "Update staff success!";
            // MSG70
            public const string AlreadyInactive = "Cannot deactivate because staff is inactive.";
            public const string AlreadyActive = "Cannot activate because staff is active.";
            // TODO(spec): the messages below have no System Message code in the SRS yet.
            public const string CannotChangeOwnRole = "You cannot change your own role.";
            public const string CannotDeactivateSelf = "You cannot deactivate your own account.";
            public const string StaffDeactivated = "Deactivate staff success!";
            public const string StaffActivated = "Activate staff success!";
            public const string UpdateFailed = "Update staff failed";
            public const string CreateFailed = "Create staff failed";
        }
        // Manage Role. Texts follow the System Messages table of SRS Report 3.
        public static class RoleMessage
        {
            // MSG07
            public const string NameRequired = "Please enter role name.";
            // MSG66
            public const string NameInvalid = "Role name is invalid. Please check again.";
            public const string DescriptionInvalid = "Description is invalid. Please check again.";
            // MSG68
            public const string RoleExist = "Role already exists in the system.";
            // MSG67
            public const string RoleNotFound = "Role not found.";
            // MSG63
            public const string RoleCreated = "Create role success!";
            // MSG64
            public const string RoleUpdated = "Update role success!";
            // TODO(spec): the messages below have no System Message code in the SRS yet.
            public const string CreateFailed = "Create role failed";
            public const string UpdateFailed = "Update role failed";
        }

        public static class WorkShiftMessage
        {
            public const string StaffNotFound = "Staff not found";
            public const string StaffInactive = "Staff account is inactive";
            public const string RoomNotFound = "Room not found";
            public const string RoomNotActive = "Room is not active";
            public const string InvalidTimeRange = "Shift start time must be earlier than end time";
            public const string PastDate = "Shift date cannot be in the past";
            public const string ShiftOverlap = "This staff member already has a shift that overlaps this time";
            public const string WorkShiftNotFound = "Work shift not found";
            public const string InvalidDateRange = "From date must be earlier than or equal to to date";
            public const string ShiftAlreadyStarted = "Cannot delete a work shift that has already started or passed";
            public const string ShiftHasAppointments = "Cannot delete this work shift because it has booked appointments. Please move the appointments first";
            public const string CannotUpdateStartedShift = "Cannot update a work shift that has already started or passed";
            public const string ShiftHasAppointmentsCannotChange = "Cannot change staff, date or time of this work shift because it has booked appointments. Please move the appointments first";
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
            public const string InvalidRoomType = "Required room type must be one of: GeneralTreatment, MinorSurgery, XRay";
            public const string InvalidPrice = "Reference price must be greater than or equal to 0";
            public const string InvalidEstimatedMinutes = "Estimated minutes must be greater than 0";
        }

        // Track Treatment Progress (UC-52 / SCRUM-351). Texts follow System Messages where applicable.
        public static class TreatmentPlanMessage
        {
            // MSG67
            public const string PlanNotFound = "Treatment plan not found.";
            public const string StageNotFound = "Treatment stage not found.";
            // MSG70
            public const string PlanNotApproved = "Cannot start treatment because the plan is not approved.";
            public const string EarlierStageNotCompleted = "Cannot start this stage because an earlier stage is not completed.";
            public const string StageNotScheduled = "Cannot start this stage because it is not scheduled.";
            public const string StageNotInProgress = "Cannot update or complete this stage because it is not in progress.";
            public const string PlanNotInProgress = "Cannot complete this stage because the plan is not in progress.";
            // MSG07 / BR-187
            public const string NotesRequiredWhenCostDiffers = "Please enter a note when the actual cost differs from the estimated cost.";
            // MSG66
            public const string InvalidActualCost = "Actual cost is invalid. Please check again.";
            public const string ScheduledDateInvalid = "Scheduled date is invalid. Please check again.";
            // MSG67
            public const string NextStageNotFound = "Next treatment stage not found.";
        }
        public static class AppointmentMessage
        {
            public const string ServiceNotFound = "Service not found";
            public const string ServiceInactive = "This service is not available for booking";
            public const string PatientProfileNotFound = "No patient profile is linked to this account";
            public const string VariantNotFound = "Service variant not found";
            public const string VariantInactive = "This service variant is not available for booking";
            public const string GeneralExamServiceMissing = "The general exam service is not set up. Please contact the clinic";
            public const string ServicesNeedDifferentRooms = "These services need different rooms and cannot be booked in one appointment";
            public const string PastDate = "Appointment date cannot be in the past";
            public const string TooFarAhead = "Appointment date is too far in advance";
            public const string SlotNotAvailable = "This time slot is no longer available. Please choose another time";
            public const string PhoneHasAccount = "This phone number already has an account. Please sign in to book";
            public const string ConfigMissing = "System configuration {0} is missing";
            public const string AppointmentNotFound = "Appointment not found in system";
            public const string OnlyOpenCanBeCancelled = "Only an appointment that is pending or confirmed can be cancelled";
            public const string ConfirmedNeedsReceptionistToCancel = "This appointment is already confirmed. Please call the clinic to cancel it";
            public const string CancelDeadlinePassed = "It is too close to the appointment time to cancel online. Please call the clinic";
            public const string OnlyOpenCanBeRescheduled = "Only an appointment that is pending or confirmed can be rescheduled";
            public const string ConfirmedNeedsReceptionistToReschedule = "This appointment is already confirmed. Please call the clinic to reschedule it";
            public const string RescheduleDeadlinePassed = "It is too close to the appointment time to reschedule online. Please call the clinic";            public const string ReasonRequired = "Cancellation reason is required";
            public const string OnlyConfirmedCanBeCheckedIn = "Only a confirmed appointment can be checked in";
            public const string CheckInNeedsConfirmation = "This appointment is not confirmed yet. Please confirm it before check-in";
            public const string CheckInWrongDay = "Check-in is only possible on the day of the appointment";
            public const string DoctorProfileNotFound = "No doctor profile is linked to this account";
            public const string OnlyPendingCanBeConfirmed = "Only an appointment that is waiting for confirmation can be confirmed";
        }
        public static class PatientMessage
        {
            public const string PatientNotFound = "Patient not found in system";
            public const string PhoneExist = "Phone number already exists in system";
            public const string InvalidGender = "Gender must be one of: Male, Female, Other";
            public const string InvalidBloodType = "Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-";
            public const string InvalidRecordType = "Record type must be one of: History, Condition, Allergy, Medication";
            public const string InvalidSeverity = "Severity must be one of: Mild, Moderate, Severe";
            public const string InvalidStatus = "Status must be one of: Active, Resolved, Discontinued";
            public const string InvalidDateOfBirth = "Date of birth cannot be in the future";
        }
        public static class DoctorScheduleMessage
        {
            public const string DoctorNotFound = "Doctor profile not found";
            public const string ShiftNotFound = "Work shift not found";
            public const string InvalidDateRange = "From date must be earlier than or equal to to date";
            public const string DateRangeTooLong = "You can view at most one week at a time";
        }
        public static class MedicalRecordMessage
        {
            public const string DoctorNotFound = "Doctor profile not found";
            public const string PatientNotFound = "Patient not found";
            public const string ExaminationNotFound = "Examination not found";
            public const string AccessDenied = "You do not have permission to view this patient's medical record";
        }

        // Request Imaging (UC-82). Texts follow the System Messages table of SRS Report 3.
        public static class ImagingRequestMessage
        {
            // MSG07
            public const string ImagingTypeRequired = "Please enter imaging type.";
            public const string TargetAreaRequired = "Please enter target area.";
            public const string ClinicalIndicationRequired = "Please enter clinical indication.";
            // MSG66
            public const string ImagingTypeInvalid = "Imaging type is invalid. Please check again.";
            public const string TargetAreaInvalid = "Target area is invalid. Please check again.";
            public const string ClinicalIndicationInvalid = "Clinical indication is invalid. Please check again.";
            // MSG70
            public const string ExaminationNotInProgress = "Cannot request imaging because the examination is {0}.";
            // MSG71
            public const string RequestSubmitted = "Imaging request has been submitted.";
            public const string NotExaminingDoctor = "You do not have permission to request imaging for this examination.";
            public const string CannotViewRequests = "You do not have permission to view imaging requests for this examination.";
            public const string TechnicianNotificationTitle = "New imaging request";
            public const string TechnicianNotificationMessage = "Imaging request ({0}) for {1} has been submitted.";
        }
    }
}


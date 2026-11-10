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
            public const string OtpTooManyRequests = "Too many codes were requested for this phone number or email. Please try again later";
            public const string TooManyRequests = "Too many requests. Please wait a moment and try again";
            public const string OtpAlreadyUsed = "This code has already been used. Continue with the new password";
            public const string InvalidConfirmationLink = "The confirmation link is invalid or has expired";
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
            // Temporary lockout after too many failed attempts (BR-101).
            public const string AccountLocked = "Account is temporarily locked. Please try again later.";
            // Staff/manager disabled the account (MSG80 on FE).
            public const string AccountDisabled = "Account has been disabled. Please contact the clinic.";
            public const string InvalidRefreshToken = "Refresh token is expiry or not found";
            public const string TwoFactorRequired = "Two factor required, please check your code";
            public const string SamePassword = "New password cannot be the same as current password";
            public const string PasswordMismatch = "New password and confirmation password do not match";
            public const string LogoutRequiresToken = "Refresh token or authenticated user is required";
        }

        // Stable codes for login failures (UC-04). FE matches these instead of English message text.
        public static class AuthCode
        {
            public const string InvalidCredentials = "INVALID_CREDENTIALS";
            public const string LockedOut = "LOCKED_OUT";
            public const string AccountDisabled = "ACCOUNT_DISABLED";
        }

        public static class RoomMessage
        {
            public const string HasUpcomingShifts = "This room still has upcoming shifts. Move them to another room before changing its type or taking it out of service.";
            public const string RoomNotFound = "Room not found.";
            public const string RoomNameExist = "A room with this name already exists.";
            public const string InvalidRoomType = "Room type must be GeneralTreatment, MinorSurgery or XRay.";
            public const string InvalidStatus = "Room status must be Active, Maintenance or Inactive.";
            public const string RoomInUse = "This room has schedule or queue history and cannot be deleted. Set its status to Inactive instead.";
            public const string RoomCreated = "Room created successfully.";
            public const string RoomUpdated = "Room updated successfully.";
            public const string RoomDeleted = "Room deleted successfully.";
        }

        // Update profile (UC-08). Texts follow the System Messages table of SRS Report 3.
        public static class ProfileMessage
        {
            public const string NoEmailToConfirm = "There is no email waiting for confirmation";
            public const string ConfirmationEmailSent = "A new confirmation link has been sent to your email";
            public const string ProfileChangedMeanwhile = "Your profile was changed after this code was sent. Please make the change again";
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
            public const string HasUpcomingWork = "This staff member still has shifts or appointments from now on; move or cancel them first";
            public const string LastManager = "The clinic must keep at least one active clinic manager";
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
            public const string RoomOverlap = "This room is already used by another shift at that time";
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
            public const string HasOpenAppointments = "This service is in appointments that are not finished yet; it cannot be turned off now";
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
            public const string NoAccess = "You do not have access to this patient's treatment plan";
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
            public const string OpenPlanExists = "This examination already has an open treatment plan.";
            public const string StagesRequired = "Please add at least one treatment stage.";
            public const string InvalidEstimatedCost = "Estimated cost is invalid. Please check again.";
            public const string PlanNotEditable = "Only a draft or proposed treatment plan can be edited.";
            public const string OnlyDraftCanBeDeleted = "Only a draft treatment plan can be deleted.";
            public const string PlanInvoiced = "This treatment plan already has an invoice, so it can no longer be changed.";
            public const string DuplicateStage = "A treatment stage is listed more than once.";
            public const string OnlyDraftCanBeProposed = "Only a draft treatment plan can be proposed to the patient.";
            public const string OnlyProposedCanBeApproved = "Only a proposed treatment plan can be approved.";
            public const string PlanNotCancellable = "This treatment plan is already completed or cancelled. A draft plan is deleted instead.";
            public const string StageStillInProgress = "A treatment stage is still in progress. Please complete it before cancelling the plan.";
            public const string CancelReasonRequired = "Please enter the reason for cancelling the treatment plan.";
        }
        public static class AppointmentMessage
        {
            public const string RecordChangedMeanwhile = "This record was changed by someone else. Please reload and try again";
            public const string ServiceNotFound = "Service not found";
            public const string ServiceInactive = "This service is not available for booking";
            public const string PatientProfileNotFound = "No patient profile is linked to this account";
            public const string VariantNotFound = "Service variant not found";
            public const string VariantInactive = "This service variant is not available for booking";
            public const string GeneralExamServiceMissing = "The general exam service is not set up. Please contact the clinic";
            public const string ServicesNeedDifferentRooms = "These services need different rooms and cannot be booked in one appointment";
            public const string DateRequired = "Appointment date is required";
            public const string SlotRequired = "Appointment time slot is required";
            public const string PastDate = "Appointment date cannot be in the past";
            public const string TooFarAhead = "Appointment date is too far in advance";
            public const string SlotNotAvailable = "This time slot is no longer available. Please choose another time";
            public const string PhoneHasAccount = "This phone number already has an account. Please sign in to book";
            public const string PatientHasUnfinishedAppointment = "You already have an appointment that is not finished. Please finish or cancel it before booking a new one";
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
            public const string CheckInDoctorShiftEnded = "The doctor has already ended the shift today";
            public const string DoctorNotOnShiftCannotStart = "You are not on a shift now. Start your shift to see new patients; only patients you have already examined can still be seen";
            public const string NoShowOnlyWaiting = "Only a patient who is checked in and waiting can be marked as not there";
            public const string NoShowAlreadyExamined = "The doctor has already started on this patient; the doctor completes the examination instead";
            public const string ReassignOnlyWaiting = "Only a patient who is checked in and waiting can be moved to another doctor";
            public const string ReassignAlreadyExamined = "This patient was already seen by the doctor and stays with that doctor";
            public const string ReassignWrongDay = "A patient can only be moved to another doctor on the day of the appointment";
            public const string ReassignSameDoctor = "The patient is already with this doctor";
            public const string DoctorNoSuitableShiftToday = "The doctor has no shift today in a room that suits these services";
            public const string DoctorProfileNotFound = "No doctor profile is linked to this account";
            public const string PriorityInvalid = "Priority must be 0 (normal), 1 (high) or 2 (urgent)";
            public const string PriorityReasonRequired = "A reason is required when the priority is above normal";
            public const string PriorityOnlyForWaiting = "The priority can only be changed while the patient is checked in and waiting";
            public const string OnlyPendingCanBeConfirmed = "Only an appointment that is waiting for confirmation can be confirmed";
            public const string OnlyCheckedInCanStartExamination = "Only a patient who is checked in can be examined";
            public const string ExaminationWrongDay = "An examination can only be started on the day of the appointment";
            public const string DoctorAlreadyExamining = "You are already examining another patient. Complete that examination first";
            public const string OnlyInServiceCanBeCompleted = "Only an examination that is in progress can be completed";
            public const string ExaminationNotFound = "No examination was found for this appointment";
            public const string ExaminationAlreadyLocked = "This examination is already completed and locked";
            public const string OnlyCheckedInCanBeStarted = "Only a checked-in appointment can be started";
            public const string NotAssignedDoctor = "You can only examine your own appointments";
            public const string ExaminationAlreadyStarted = "This appointment already has an examination";
            public const string FollowUpAlreadyScheduled = "A follow-up appointment has already been scheduled for this visit";
            public const string ExaminationNotFoundForAppointment = "No examination was found for this appointment";
        }
        public static class PatientMessage
        {
            public const string HasOpenAppointments = "This patient has appointments that are not finished yet; cancel or complete them first";
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
            public const string ShiftNotToday = "Only a shift of today can be started or ended";
            public const string ShiftAlreadyStarted = "This shift has already been started";
            public const string ShiftTooEarlyToStart = "It is too early to start this shift";
            public const string ShiftOverCannotStart = "The time of this shift is over, it cannot be started";
            public const string ShiftNotStarted = "Start the shift before ending it";
            public const string ShiftAlreadyEnded = "This shift has already been ended";
            public const string ExaminationStillRunning = "Finish the examination in progress before ending the shift";
            public const string ShiftNotEnded = "This shift has not been ended";
            public const string ShiftTimeOver = "The time of this shift is over, it cannot be reopened";
            public const string RoomInUse = "The room is already used by another doctor's shift";
            // Texts sent to the patient; {0} doctor, {1} time, {2} date
            public const string ShiftEndedWaitingNotice = "OZE Dental: {0} has ended the shift. Please see the front desk to be moved to another doctor.";
            public const string ShiftEndedUpcomingNotice = "OZE Dental: {0} has ended the shift early. Your appointment at {1} on {2} needs to change. Please contact the front desk to reschedule.";
            public const string ShiftEndedNoticeSubject = "OZE Dental - Your appointment needs to change";
            public const string ShiftReopenedReason ="The shift was reopened after it had been ended by mistake";
            public const string NoShowReason ="The doctor ended the shift before the patient was examined";
        }
        public static class MedicalRecordMessage
        {
            public const string DoctorNotFound = "Doctor profile not found";
            public const string PatientNotFound = "Patient not found";
            public const string ExaminationNotFound = "Examination not found";
            public const string AccessDenied = "You do not have permission to view this patient's medical record";
        }

        // Writing the content of an examination: services, notes and diagnoses
        public static class ExaminationMessage
        {
            public const string NothingRecorded = "Please record at least a diagnosis or clinical notes before completing the examination";
            public const string PrescriptionNotFinalized = "Please finalize the prescription, or delete it, before completing the examination";
            public const string NotExaminingDoctor = "You can only work on the examinations you are performing";
            public const string AlreadyLocked = "This examination is already completed and locked, it can no longer be edited";
            public const string ChiefComplaintTooLong = "The reason for the visit is too long";
            public const string ClinicalNotesTooLong = "The clinical notes are too long";
            public const string DiagnosisNameRequired = "Please enter the diagnosis name";
            public const string DiagnosisNameTooLong = "The diagnosis name is too long";
            public const string DiagnosisCodeTooLong = "The diagnosis code is too long";
            public const string DiagnosisDescriptionTooLong = "The diagnosis description is too long";
            public const string DiagnosisNotFound = "Diagnosis not found in this examination";
            public const string ServiceAlreadyAdded = "This service is already in the appointment";
            public const string ServiceItemNotFound = "Service not found in this appointment";
            public const string CannotRemoveLastService = "An appointment must keep at least one service";
            public const string VariantMismatch = "This variant does not belong to the selected service";
            public const string ToothNumberInvalid = "The tooth number is not valid. Use the FDI number, for example 46";
            public const string ToothConditionInvalid = "The tooth condition must be one of: Healthy, Caries, Filled, Crown, Missing, Denture, Implant";
            public const string ToothSurfaceTooLong = "The tooth surface is too long";
            public const string ToothSeverityTooLong = "The severity is too long";
            public const string ToothNotesTooLong = "The tooth notes are too long";
            public const string ToothNotRecorded = "No change was recorded for this tooth in this examination";
            public const string MedicationNameRequired = "Please enter the medication name";
            public const string MedicationNameTooLong = "The medication name is too long";
            public const string DosageTooLong = "The dosage is too long";
            public const string FrequencyTooLong = "The frequency is too long";
            public const string DurationTooLong = "The duration is too long";
            public const string InstructionsTooLong = "The instructions are too long";
            public const string PrescriptionNotesTooLong = "The prescription note is too long";
            public const string QuantityInvalid = "The quantity must be a whole number between 1 and the allowed maximum";
            public const string PrescriptionItemNotFound = "Medication not found in this prescription";
            public const string PrescriptionFinalized = "The prescription is finalized. Reopen it to change it";
            public const string PrescriptionNothingToFinalize = "Add at least one medication before finalizing the prescription";
            public const string FollowUpDateMustBeFuture = "Follow-up date must be in the future";
            public const string FollowUpNotesTooLong = "Follow-up notes are too long";
            public const string FollowUpAppointmentAlreadyScheduled = "A follow-up appointment has already been scheduled for this examination";
            public const string FollowUpNotSet = "No follow-up date has been set for this examination";
            public const string ExaminationNotFound = "Examination not found";
        }

        // Request Imaging (UC-82). Texts follow the System Messages table of SRS Report 3.
        public static class QueueMessage
        {
            public const string EntryNotFound = "Queue number not found";
            public const string OnlyCalledCanBeSkipped = "Only a number that has been called can be skipped";
            public const string DoctorNotOnShift = "You are not on a shift now. Start your shift to call new patients; only patients you have already examined can still be called";
            public const string OnlyWaitingCanBeCalled = "Only a number that is waiting can be called";
            public const string NotInTodayQueue = "This number is not in today's queue";
            public const string NotYourPatientToCall = "You can only call your own patients";
            public const string NotYourPatient = "You can only skip your own patients";
        }

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
            // MSG67
            public const string RequestNotFound = "Imaging request not found.";
            public const string CannotViewRequest = "You do not have permission to view this imaging request.";
            public const string CancelReasonRequired = "Please enter cancel reason.";
            public const string CancelReasonInvalid = "Cancel reason is invalid. Please check again.";
            public const string CannotCancelRequest = "You do not have permission to cancel this imaging request.";
            public const string RequestNotPending = "Cannot cancel imaging request because the imaging request is {0}.";
            public const string RequestNotOpen = "Cannot complete imaging request because the imaging request is {0}.";
            public const string RequestCancelled = "Cancel imaging request success!";
            public const string WebhookSignatureMissing = "Missing webhook signature";
            public const string WebhookSignatureInvalid = "Invalid webhook signature";
            public const string WebhookSecretNotConfigured = "Webhook secret is not configured";
            public const string WebhookPayloadInvalid = "Invalid payload";
            // MSG02
            public const string QueueEmpty = "No Data.";
            public const string TechnicianNotificationTitle = "New imaging request";
            public const string TechnicianNotificationMessage = "Imaging request ({0}) for {1} has been submitted.";
        }

        public static class InvoiceMessage
        {
            public const string PatientRequired = "Please select a patient.";
            public const string PatientNotFound = "Patient not found.";
            public const string ItemsRequired = "Please add at least one invoice item.";
            public const string ServiceNameRequired = "Please enter service name.";
            public const string QuantityInvalid = "Quantity must be greater than 0.";
            public const string UnitPriceInvalid = "Unit price must be greater than or equal to 0.";
            public const string DiscountInvalid = "Discount amount is invalid.";
            public const string DiscountExceedsTotal = "Discount amount cannot exceed the invoice total.";
            public const string AppointmentNotFound = "Appointment not found.";
            public const string AppointmentPatientMismatch = "The appointment does not belong to this patient.";
            public const string TreatmentPlanNotFound = "Treatment plan not found.";
            public const string TreatmentPlanPatientMismatch = "The treatment plan does not belong to this patient.";
            public const string StageNotFound = "Treatment plan stage not found.";
            public const string StagePlanMismatch = "The treatment plan stage does not belong to the selected treatment plan.";
            public const string ServiceNotFound = "Service not found.";
            public const string OpenInvoiceExistsForAppointment = "An open invoice already exists for this appointment.";
            public const string OpenInvoiceExistsForTreatmentPlan = "An open invoice already exists for this treatment plan.";
            public const string InvoiceCreated = "Invoice has been created.";
            public const string InvoiceUpdated = "Invoice has been updated.";
            public const string InvoiceCancelled = "Invoice has been cancelled.";
            public const string InvoiceNotFound = "Invoice not found.";
            public const string InvoiceNotCancellable = "Invoice cannot be cancelled because a confirmed payment exists.";
            public const string InvoiceConcurrencyConflict = "Invoice was modified by another user. Please reload and try again.";
            public const string AccessDenied = "You do not have access to this invoice.";
        }

        public static class PaymentMessage
        {
            public const string InvoiceNotFound = "Invoice not found.";
            public const string InvoiceNotPayable = "Payments cannot be recorded on this invoice.";
            public const string AmountInvalid = "Payment amount must be greater than 0.";
            public const string AmountExceedsRemaining = "Payment amount exceeds the remaining balance.";
            public const string MethodInvalid = "Payment method must be one of: CASH, BANK_TRANSFER, QR_TRANSFER.";
            public const string PurposeInvalid = "Payment purpose must be one of: Deposit, Regular, Installment.";
            public const string StatusInvalid = "Payment status must be one of: PENDING, CONFIRMED, FAILED, REFUNDED.";
            public const string PaymentNotFound = "Payment not found.";
            public const string PaymentNotPending = "Only pending payments can be confirmed.";
            public const string PaymentNotConfirmable = "Payment cannot be confirmed.";
            public const string PaymentNotVoidable = "Payment cannot be voided.";
            public const string TransactionReferenceDuplicate = "Transaction reference already exists.";
            public const string PaymentRecorded = "Payment has been recorded.";
            public const string PaymentConfirmed = "Payment has been confirmed.";
            public const string PaymentVoided = "Payment has been voided.";
            public const string InstallmentPeriodRequired = "Installment period is required for installment payments.";
            public const string InstallmentPeriodInvalid = "Installment period is invalid for this invoice.";
            public const string AccessDenied = "You do not have access to this payment.";
            public const string ConcurrencyConflict = "Payment data was modified by another user. Please reload and try again.";
        }

        public static class RefundMessage
        {
            public const string InvoiceNotFound = "Invoice not found.";
            public const string RequestNotFound = "Refund request not found.";
            public const string ReasonRequired = "Please enter a reason.";
            public const string AmountInvalid = "Refund amount must be greater than 0.";
            public const string TypeInvalid = "Request type must be one of: Refund, Adjustment.";
            public const string WorkDoneAmountRequired = "Work-done amount is required before approval.";
            public const string WorkDoneAmountInvalid = "Work-done amount is invalid.";
            public const string WorkDoneExceedsPaid = "Work-done amount cannot exceed confirmed paid amount.";
            public const string RequestNotPending = "Only pending refund requests can be processed.";
            public const string RejectionReasonRequired = "Please enter a rejection reason.";
            public const string RequestCreated = "Refund request has been created.";
            public const string RequestApproved = "Refund request has been approved.";
            public const string RequestRejected = "Refund request has been rejected.";
            public const string RequestProcessed = "Refund request has been marked as processed.";
            public const string NoConfirmedPayments = "There are no confirmed payments to refund.";
            public const string ConcurrencyConflict = "Refund request was modified by another user. Please reload and try again.";
        }

        public static class InstallmentMessage
        {
            public const string InvoiceNotFound = "Invoice not found.";
            public const string PlanNotFound = "Installment plan not found.";
            public const string PlanAlreadyExists = "An active installment plan already exists for this invoice.";
            public const string PeriodsRequired = "Please add at least one installment period.";
            public const string PeriodAmountInvalid = "Period amount must be greater than 0.";
            public const string PeriodDueDateInvalid = "Period due date is invalid.";
            public const string PeriodsExceedRemaining = "Sum of installment periods cannot exceed the remaining balance.";
            public const string PeriodNotFound = "Installment period not found.";
            public const string PeriodNotPayable = "Installment period cannot be paid.";
            public const string PlanCreated = "Installment plan has been created.";
        }
    }
}



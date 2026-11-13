using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Patients
{
    // OZ-PAT-07 UpdatePatient
    [Trait("Tab", "OZ-PAT-07")]
    public class UpdatePatientTests : PatientServiceTestBase
    {
        private const int WalkInId = 1;
        private const int AccountId = 2;
        private const string CurrentPhone = "+84912345678";

        // UTCID01 (N): a valid request updates the name, gender and blood type
        [Fact]
        public async Task UpdatePatientAsync_ShouldUpdatePatient_WhenValid()
        {
            // Arrange
            var patient = ArrangeWalkInPatient();

            // Act
            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(fullName: "  Updated Name  ", gender: "Male", bloodType: "A+"));

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.FullName.Should().Be("Updated Name");
            result.Data.Gender.Should().Be("Male");
            result.Data.BloodType.Should().Be("A+");
            patient.UpdatedAt.Should().NotBeNull();
            _patientRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        // UTCID02 (A): an unknown patient id returns PatientNotFound
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenNotFound()
        {
            // Arrange
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(999, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Patient?)null);

            // Act
            var result = await _patientService.UpdatePatientAsync(999, Request());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PatientNotFound);
            VerifyNothingSaved();
        }

        // UTCID03 (A): a blank full name is rejected
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenFullNameIsBlank()
        {
            ArrangeWalkInPatient();

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(fullName: "   "));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.FullNameRequired);
            VerifyNothingSaved();
        }

        // UTCID04 (A): a gender outside Male/Female/Other is rejected
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenGenderIsInvalid()
        {
            ArrangeWalkInPatient();

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(gender: "Unknown"));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidGender);
            VerifyNothingSaved();
        }

        // UTCID05 (A): an unknown blood type is rejected
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenBloodTypeIsInvalid()
        {
            ArrangeWalkInPatient();

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(bloodType: "Z+"));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidBloodType);
            VerifyNothingSaved();
        }

        // UTCID06 (B): a date of birth one day after today (Vietnam time) is rejected
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenDateOfBirthIsTomorrow()
        {
            ArrangeWalkInPatient();
            var tomorrow = DateOnly.FromDateTime(ClinicClock.Today).AddDays(1);

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(dateOfBirth: tomorrow));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidDateOfBirth);
            VerifyNothingSaved();
        }

        // UTCID07 (B): a date of birth equal to today (Vietnam time) is accepted
        [Fact]
        public async Task UpdatePatientAsync_ShouldAccept_WhenDateOfBirthIsToday()
        {
            var patient = ArrangeWalkInPatient();
            var today = DateOnly.FromDateTime(ClinicClock.Today);

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(dateOfBirth: today));

            result.Success.Should().BeTrue();
            patient.DateOfBirth.Should().Be(today);
        }

        // UTCID08 (A): a phone number that is not a Vietnamese mobile number is rejected
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenPhoneIsInvalid()
        {
            ArrangeWalkInPatient();

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(phone: "12345"));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidPhone);
            VerifyNothingSaved();
        }

        // UTCID09 (A): the new phone number already belongs to another patient
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenPhoneUsedByAnotherPatient()
        {
            ArrangeWalkInPatient();
            _patientRepositoryMock
                .Setup(r => r.ExistsByPhoneAsync("+84987654321", WalkInId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(phone: "0987654321"));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PhoneExist);
            VerifyNothingSaved();
        }

        // UTCID10 (N): a walk-in patient's new phone and email are saved in standard form
        [Fact]
        public async Task UpdatePatientAsync_ShouldSaveNormalizedContacts_WhenWalkInChangesThem()
        {
            var patient = ArrangeWalkInPatient();

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(phone: "0987654321", email: "  NEW@OZE.VN "));

            result.Success.Should().BeTrue();
            patient.PhoneNumber.Should().Be("+84987654321");
            patient.Email.Should().Be("new@oze.vn");
        }

        // UTCID11 (B): leaving the phone and email empty keeps the current ones
        [Fact]
        public async Task UpdatePatientAsync_ShouldKeepContacts_WhenPhoneAndEmailAreEmpty()
        {
            var patient = ArrangeWalkInPatient();

            var result = await _patientService.UpdatePatientAsync(WalkInId, Request(phone: "", email: null));

            result.Success.Should().BeTrue();
            patient.PhoneNumber.Should().Be(CurrentPhone);
            patient.Email.Should().Be("walkin@oze.vn");
            _patientRepositoryMock.Verify(
                r => r.ExistsByPhoneAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        // UTCID12 (A): staff cannot change the phone number of a patient who has an account
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenStaffChangesPhoneOfAccount()
        {
            var patient = ArrangeAccountPatient();

            var result = await _patientService.UpdatePatientAsync(AccountId, Request(phone: "0987654321"));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.ContactManagedByAccount);
            patient.PhoneNumber.Should().Be(CurrentPhone);
            VerifyNothingSaved();
        }

        // UTCID13 (A): staff cannot change the email of a patient who has an account
        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnFailure_WhenStaffChangesEmailOfAccount()
        {
            ArrangeAccountPatient();

            var result = await _patientService.UpdatePatientAsync(AccountId, Request(email: "other@oze.vn"));

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.ContactManagedByAccount);
            VerifyNothingSaved();
        }

        // UTCID14 (N): a patient with an account can still have the name fixed when the phone is sent unchanged in local form
        [Fact]
        public async Task UpdatePatientAsync_ShouldUpdateName_WhenAccountPhoneIsUnchanged()
        {
            var patient = ArrangeAccountPatient();

            var result = await _patientService.UpdatePatientAsync(AccountId,
                Request(fullName: "Tran Thi B", phone: "0912345678", email: "ACCOUNT@oze.vn"));

            result.Success.Should().BeTrue();
            patient.FullName.Should().Be("Tran Thi B");
            patient.PhoneNumber.Should().Be(CurrentPhone);
            _patientRepositoryMock.Verify(
                r => r.ExistsByPhoneAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        // ===== Shared test data =====

        // A walk-in patient (no account) with a phone and email
        private Patient ArrangeWalkInPatient()
        {
            var patient = new Patient
            {
                Id = WalkInId,
                PatientCode = "BN-261021-123456",
                FullName = "Old Name",
                PhoneNumber = CurrentPhone,
                Email = "walkin@oze.vn"
            };
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(WalkInId, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);
            return patient;
        }

        // A patient linked to an account; the phone and email belong to the account
        private Patient ArrangeAccountPatient()
        {
            var patient = new Patient
            {
                Id = AccountId,
                UserId = "user-2",
                PatientCode = "BN-261021-222222",
                FullName = "Tran Thi Bb",
                PhoneNumber = CurrentPhone,
                Email = "account@oze.vn"
            };
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(AccountId, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);
            return patient;
        }

        private static UpdatePatientRequest Request(
            string fullName = "Nguyen Van A",
            string? gender = "Male",
            string? bloodType = null,
            DateOnly? dateOfBirth = null,
            string? phone = null,
            string? email = null) => new()
        {
            FullName = fullName,
            Gender = gender,
            BloodType = bloodType,
            DateOfBirth = dateOfBirth,
            PhoneNumber = phone,
            Email = email
        };

        private void VerifyNothingSaved()
        {
            _patientRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Patient>(), It.IsAny<CancellationToken>()), Times.Never);
            _patientRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}

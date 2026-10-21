using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class AppointmentService : IAppointmentService
    {
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly IRegistrationRepository _registrationRepository;
        private readonly IServiceRepository _serviceRepository;
        private readonly ISmsSender _smsSender;
        private readonly IEmailSender _emailSender;
        private readonly ILogger<AppointmentService> _logger;

        public AppointmentService(
            IAppointmentRepository appointmentRepository,
            IRegistrationRepository registrationRepository,
            IServiceRepository serviceRepository,
            ISmsSender smsSender,
            IEmailSender emailSender,
            ILogger<AppointmentService> logger)
        {
            _appointmentRepository = appointmentRepository;
            _registrationRepository = registrationRepository;
            _serviceRepository = serviceRepository;
            _smsSender = smsSender;
            _emailSender = emailSender;
            _logger = logger;
        }

        public async Task<List<AvailableSlotResponse>> GetAvailableSlotsAsync(AvailableSlotRequest request)
        {
            var service = await GetBookableServiceAsync(request.ServiceId!.Value);
            return await FindSlotsAsync(service, request.Date!.Value, request.DoctorId);
        }

        public async Task<AppointmentResponse> BookAsGuestAsync(GuestBookingRequest request)
        {
            ConditionGuard.Ensure(PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phone),
                ErrorConstants.AuthMessage.InvalidPhone);

            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            ConditionGuard.ThrowIf(email != null && (email.Length > 256 || !new EmailAddressAttribute().IsValid(email)),
                ErrorConstants.AuthMessage.EmailInvalid);

            var service = await GetBookableServiceAsync(request.ServiceId!.Value);
            var date = request.Date!.Value;
            var slotStart = request.SlotStart!.Value;
            var phoneVariants = PhoneNumberHelper.GetLookupVariants(phone);

            // AC4: a phone that belongs to an account must sign in instead
            var user = await _registrationRepository.FindUserByPhoneAsync(phoneVariants);
            ConditionGuard.ThrowIf(user != null, ErrorConstants.AppointmentMessage.PhoneHasAccount);

            var (appointment, patient, slot) = await _appointmentRepository.ExecuteSerializableAsync(async () =>
            {
                // Re-check inside the transaction; never trust the slot sent by the client
                var candidates = (await FindSlotsAsync(service, date, request.DoctorId))
                    .Where(x => x.SlotStart == slotStart)
                    .ToList();
                ConditionGuard.Ensure(candidates.Count > 0, ErrorConstants.AppointmentMessage.SlotNotAvailable);

                var chosen = request.DoctorId.HasValue ? candidates[0] : await PickLeastBusyAsync(candidates, date);

                // AC6: reuse the walk-in record of this phone, or create a new one
                var patients = await _registrationRepository.FindUnlinkedPatientsByPhoneAsync(phoneVariants);
                ConditionGuard.ThrowIf(patients.Count > 1, ErrorConstants.AuthMessage.MultiplePatientRecords);

                var patient = patients.FirstOrDefault();
                if (patient == null)
                {
                    patient = new Patient
                    {
                        PatientCode = GeneratePatientCode(),
                        FullName = request.FullName.Trim(),
                        PhoneNumber = phone,
                        Email = email,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    await _appointmentRepository.AddPatientAsync(patient);
                }

                var appointment = new Appointment
                {
                    Patient = patient,
                    DoctorId = chosen.DoctorId,
                    AppointmentType = AppointmentConstants.BookedType,
                    AppointmentDate = date,
                    TimeSlotStart = chosen.SlotStart,
                    TimeSlotEnd = chosen.SlotEnd,
                    // The reception desk confirms it later
                    Status = AppointmentConstants.PendingStatus,
                    Notes = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                    CreatedAt = DateTimeOffset.UtcNow
                };
                await _appointmentRepository.AddAsync(appointment);
                await _appointmentRepository.SaveChangesAsync();

                return (appointment, patient, chosen);
            });

            await SendBookingNotificationAsync(phone, email, appointment, service);
            return ToResponse(appointment, patient, slot, service);
        }

        // Splits each doctor shift into slots and keeps the ones that are free and not too soon
        private async Task<List<AvailableSlotResponse>> FindSlotsAsync(Service service, DateOnly date, int? doctorId)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var maxDaysAhead = await GetIntConfigAsync(ConfigKeyConstants.BookingMaxDaysAhead);
            ConditionGuard.Ensure(date >= today, ErrorConstants.AppointmentMessage.PastDate);
            ConditionGuard.Ensure(date <= today.AddDays(maxDaysAhead), ErrorConstants.AppointmentMessage.TooFarAhead);

            var slotMinutes = await GetIntConfigAsync(ConfigKeyConstants.SlotDurationMinutes);
            var minHoursAhead = await GetIntConfigAsync(ConfigKeyConstants.BookingMinHoursAhead);
            var earliestStart = DateTime.Now.AddHours(minHoursAhead);
            // A service without an estimate takes one slot
            var duration = TimeSpan.FromMinutes(service.EstimatedMinutes ?? slotMinutes);

            var shifts = await _appointmentRepository.GetDoctorShiftsAsync(date, doctorId);
            if (!string.IsNullOrWhiteSpace(service.RequiredRoomType))
            {
                shifts = shifts.Where(x => x.Room!.RoomType == service.RequiredRoomType).ToList();
            }

            var doctorIds = shifts.Select(x => x.StaffProfileId).Distinct().ToList();
            var booked = await _appointmentRepository.GetActiveAppointmentsAsync(date, doctorIds);

            var slots = new List<AvailableSlotResponse>();
            foreach (var shift in shifts)
            {
                for (var start = shift.ShiftStart; ; start = start.AddMinutes(slotMinutes))
                {
                    var end = start.Add(duration);
                    // TimeOnly wraps at midnight, so "end < start" also means past the shift
                    if (end < start || end > shift.ShiftEnd)
                    {
                        break;
                    }

                    var isTaken = booked.Any(a => a.DoctorId == shift.StaffProfileId
                        && a.TimeSlotStart < end && start < a.TimeSlotEnd);
                    var isTooSoon = date.ToDateTime(start) < earliestStart;

                    if (!isTaken && !isTooSoon)
                    {
                        slots.Add(new AvailableSlotResponse
                        {
                            DoctorId = shift.StaffProfileId,
                            DoctorName = shift.StaffProfile.FullName,
                            Date = date,
                            SlotStart = start,
                            SlotEnd = end
                        });
                    }
                }
            }

            return slots.OrderBy(x => x.SlotStart).ThenBy(x => x.DoctorId).ToList();
        }

        // AC5: when the patient picks no doctor, choose the one with the fewest appointments that day
        private async Task<AvailableSlotResponse> PickLeastBusyAsync(List<AvailableSlotResponse> candidates, DateOnly date)
        {
            var doctorIds = candidates.Select(x => x.DoctorId).Distinct().ToList();
            var booked = await _appointmentRepository.GetActiveAppointmentsAsync(date, doctorIds);

            return candidates
                .OrderBy(c => booked.Count(a => a.DoctorId == c.DoctorId))
                .ThenBy(c => c.DoctorId)
                .First();
        }

        private async Task<Service> GetBookableServiceAsync(int serviceId)
        {
            var service = await _serviceRepository.GetByIdAsync(serviceId);
            ConditionGuard.Ensure<NotFoundException>(service != null, ErrorConstants.AppointmentMessage.ServiceNotFound);
            ConditionGuard.Ensure(service!.IsActive, ErrorConstants.AppointmentMessage.ServiceInactive);
            return service;
        }

        private async Task<int> GetIntConfigAsync(string configKey)
        {
            var value = await _appointmentRepository.GetConfigValueAsync(configKey);
            ConditionGuard.Ensure(int.TryParse(value, out var result),
                string.Format(ErrorConstants.AppointmentMessage.ConfigMissing, configKey));
            return result;
        }

        // A failed notification must not undo the booking, so errors are only logged
        private async Task SendBookingNotificationAsync(string phone, string? email, Appointment appointment, Service service)
        {
            var message = $"OZE Dental: Da nhan yeu cau dat lich {service.ServiceName} " +
                          $"luc {appointment.TimeSlotStart:HH\\:mm} ngay {appointment.AppointmentDate:dd/MM/yyyy}. " +
                          "Le tan se goi xac nhan som.";
            try
            {
                await _smsSender.SendSmsAsync(phone, message);
                if (email != null)
                {
                    await _emailSender.SendEmailAsync(email, "OZE Dental - Appointment request", message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not send the booking notification for appointment {AppointmentId}", appointment.Id);
            }
        }

        // Same format as AuthService.GeneratePatientCode
        private static string GeneratePatientCode()
        {
            return $"BN-{DateTime.UtcNow:yyMMdd}-{RandomNumberGenerator.GetInt32(0, 1_000_000):D6}";
        }

        private static AppointmentResponse ToResponse(Appointment appointment, Patient patient,
            AvailableSlotResponse slot, Service service)
        {
            return new AppointmentResponse
            {
                Id = appointment.Id,
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                PatientName = patient.FullName,
                PatientPhoneNumber = PhoneNumberHelper.Mask(patient.PhoneNumber ?? string.Empty),
                DoctorId = slot.DoctorId,
                DoctorName = slot.DoctorName,
                ServiceId = service.Id,
                ServiceName = service.ServiceName,
                AppointmentType = appointment.AppointmentType,
                AppointmentDate = appointment.AppointmentDate,
                TimeSlotStart = slot.SlotStart,
                TimeSlotEnd = slot.SlotEnd,
                Status = appointment.Status,
                Notes = appointment.Notes,
                CreatedAt = appointment.CreatedAt
            };
        }
    }
}

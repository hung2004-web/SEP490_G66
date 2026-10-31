using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Common.Models.Base;
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

        public async Task<List<BookableServiceResponse>> GetBookableServicesAsync()
        {
            var examServiceCode = await GetStringConfigAsync(ConfigKeyConstants.GeneralExamServiceCode);
            var services = await _appointmentRepository.GetBookableServicesAsync();

            return services
                .Select(s => new BookableServiceResponse
                {
                    ServiceId = s.Id,
                    ServiceName = s.ServiceName,
                    Description = s.Description,
                    ReferencePrice = s.ReferencePrice,
                    EstimatedMinutes = s.EstimatedMinutes,
                    IsMandatory = s.ServiceCode == examServiceCode,
                    Variants = s.Variants.Select(v => new BookableVariantResponse
                    {
                        VariantId = v.Id,
                        VariantName = v.VariantName,
                        Description = v.Description,
                        ReferencePrice = v.ReferencePrice,
                        EstimatedMinutes = v.EstimatedMinutes
                    }).ToList()
                })
                .ToList();
        }

        public async Task<List<AvailableSlotResponse>> GetAvailableSlotsAsync(AvailableSlotRequest request)
        {
            var lines = await ResolveBookingLinesAsync(request.ServiceId, request.VariantId);
            return await FindSlotsAsync(lines, request.Date!.Value, request.DoctorId);
        }

        public async Task<AppointmentResponse> BookAsGuestAsync(GuestBookingRequest request)
        {
            ConditionGuard.Ensure(PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phone),
                ErrorConstants.AuthMessage.InvalidPhone);

            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            ConditionGuard.ThrowIf(email != null && (email.Length > 256 || !new EmailAddressAttribute().IsValid(email)),
                ErrorConstants.AuthMessage.EmailInvalid);

            var lines = await ResolveBookingLinesAsync(request.ServiceId, request.VariantId);
            var phoneVariants = PhoneNumberHelper.GetLookupVariants(phone);

            // AC4: a phone that belongs to an account must sign in instead
            var user = await _registrationRepository.FindUserByPhoneAsync(phoneVariants);
            ConditionGuard.ThrowIf(user != null, ErrorConstants.AppointmentMessage.PhoneHasAccount);

            var (appointment, patient, slot) = await CreateBookingAsync(lines, request.Date!.Value, request.SlotStart!.Value,
                request.DoctorId, request.Note, null, async () =>
                {
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

                    return patient;
                });

            await SendBookingNotificationAsync(phone, email, appointment, lines);
            return ToResponse(appointment, patient, slot, lines);
        }

        public async Task<AppointmentResponse> BookAsPatientAsync(BookingRequest request, string userId)
        {
            var lines = await ResolveBookingLinesAsync(request.ServiceId, request.VariantId);

            var (appointment, patient, slot) = await CreateBookingAsync(lines, request.Date!.Value, request.SlotStart!.Value,
                request.DoctorId, request.Note, userId, async () =>
                {
                    // The patient comes from the token, never from the request
                    var existing = await _appointmentRepository.GetPatientByUserIdAsync(userId);
                    ConditionGuard.Ensure<NotFoundException>(existing != null, ErrorConstants.AppointmentMessage.PatientProfileNotFound);
                    return existing!;
                });

            await SendBookingNotificationAsync(patient.PhoneNumber, patient.Email, appointment, lines);
            return ToResponse(appointment, patient, slot, lines);
        }

        // Re-checks the slot and saves the appointment in one serializable transaction;
        // getPatientAsync runs inside it so a new patient record is saved together with the appointment
        private async Task<(Appointment Appointment, Patient Patient, AvailableSlotResponse Slot)> CreateBookingAsync(
            List<BookingLine> lines, DateOnly date, TimeOnly slotStart, int? doctorId, string? note,
            string? createdByUserId, Func<Task<Patient>> getPatientAsync)
        {
            var slotMinutes = await GetIntConfigAsync(ConfigKeyConstants.SlotDurationMinutes);

            return await _appointmentRepository.ExecuteSerializableAsync(async () =>
            {
                // Re-check inside the transaction; never trust the slot sent by the client
                var candidates = (await FindSlotsAsync(lines, date, doctorId))
                    .Where(x => x.SlotStart == slotStart)
                    .ToList();
                ConditionGuard.Ensure(candidates.Count > 0, ErrorConstants.AppointmentMessage.SlotNotAvailable);

                var chosen = doctorId.HasValue ? candidates[0] : await PickLeastBusyAsync(candidates, date);
                var patient = await getPatientAsync();

                var appointment = new Appointment
                {
                    Patient = patient,
                    DoctorId = chosen.DoctorId,
                    AppointmentType = AppointmentConstants.BookedType,
                    AppointmentDate = date,
                    TimeSlotStart = chosen.SlotStart,
                    TimeSlotEnd = chosen.SlotEnd,
                    // The slot is held, but the receptionist must confirm the booking before it is approved
                    Status = AppointmentConstants.PendingStatus,
                    Notes = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
                    CreatedAt = DateTimeOffset.UtcNow,
                    CreatedByUserId = createdByUserId,
                    // Saved together with the appointment in the same transaction
                    ServiceItems = lines.Select(l => new AppointmentServiceItem
                    {
                        ServiceId = l.Service.Id,
                        VariantId = l.Variant?.Id,
                        DurationMinutes = l.GetMinutes(slotMinutes),
                        PriceAtBooking = l.Price,
                        CreatedAt = DateTimeOffset.UtcNow
                    }).ToList()
                };
                await _appointmentRepository.AddAsync(appointment);
                await _appointmentRepository.SaveChangesAsync();

                return (appointment, patient, chosen);
            });
        }

        // Splits each doctor shift into slots and keeps the ones that are free and not too soon
        private async Task<List<AvailableSlotResponse>> FindSlotsAsync(List<BookingLine> lines, DateOnly date, int? doctorId)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var maxDaysAhead = await GetIntConfigAsync(ConfigKeyConstants.BookingMaxDaysAhead);
            ConditionGuard.Ensure(date >= today, ErrorConstants.AppointmentMessage.PastDate);
            ConditionGuard.Ensure(date <= today.AddDays(maxDaysAhead), ErrorConstants.AppointmentMessage.TooFarAhead);

            var slotMinutes = await GetIntConfigAsync(ConfigKeyConstants.SlotDurationMinutes);
            var minHoursAhead = await GetIntConfigAsync(ConfigKeyConstants.BookingMinHoursAhead);
            var earliestStart = DateTime.Now.AddHours(minHoursAhead);
            // Services are done one after another, so the slot must fit their total time
            var duration = TimeSpan.FromMinutes(lines.Sum(l => l.GetMinutes(slotMinutes)));

            var shifts = await _appointmentRepository.GetDoctorShiftsAsync(date, doctorId);
            var requiredRoomType = lines
                .Select(l => l.Service.RequiredRoomType)
                .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t));
            if (requiredRoomType != null)
            {
                shifts = shifts.Where(x => x.Room!.RoomType == requiredRoomType).ToList();
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

        // One bookable line: a whole service, or one variant of a service
        private sealed record BookingLine(Service Service, ServiceVariant? Variant)
        {
            public string DisplayName => Variant == null
                ? Service.ServiceName
                : $"{Service.ServiceName} - {Variant.VariantName}";

            // A variant is priced as its own line, so it never falls back to the service's price
            public decimal Price => Variant?.ReferencePrice ?? Service.ReferencePrice;

            // A line without an estimate takes one slot
            public int GetMinutes(int slotMinutes) =>
                (Variant != null ? Variant.EstimatedMinutes : Service.EstimatedMinutes) ?? slotMinutes;
        }

        // The general exam comes first, then the services and variants the patient picked, without duplicates
        private async Task<List<BookingLine>> ResolveBookingLinesAsync(
            IReadOnlyCollection<int> pickedServiceIds, IReadOnlyCollection<int> pickedVariantIds)
        {
            var examServiceCode = await GetStringConfigAsync(ConfigKeyConstants.GeneralExamServiceCode);
            var exam = await _serviceRepository.GetByCodeAsync(examServiceCode);
            ConditionGuard.Ensure(exam != null && exam.IsActive, ErrorConstants.AppointmentMessage.GeneralExamServiceMissing);

            var pickedIds = pickedServiceIds.Where(id => id != exam!.Id).Distinct().ToList();
            var picked = await _appointmentRepository.GetServicesByIdsAsync(pickedIds);
            ConditionGuard.Ensure<NotFoundException>(picked.Count == pickedIds.Count, ErrorConstants.AppointmentMessage.ServiceNotFound);
            ConditionGuard.Ensure(picked.All(s => s.IsActive), ErrorConstants.AppointmentMessage.ServiceInactive);

            var variantIds = pickedVariantIds.Distinct().ToList();
            var variants = await _appointmentRepository.GetVariantsByIdsAsync(variantIds);
            ConditionGuard.Ensure<NotFoundException>(variants.Count == variantIds.Count, ErrorConstants.AppointmentMessage.VariantNotFound);
            ConditionGuard.Ensure(variants.All(v => v.IsActive && v.Service.IsActive), ErrorConstants.AppointmentMessage.VariantInactive);

            // Keep the order the patient chose; a variant is a separate line next to its service
            var lines = new List<BookingLine> { new(exam!, null) };
            lines.AddRange(pickedIds.Select(id => new BookingLine(picked.First(s => s.Id == id), null)));
            lines.AddRange(variantIds.Select(id =>
            {
                var variant = variants.First(v => v.Id == id);
                return new BookingLine(variant.Service, variant);
            }));

            // One appointment uses one doctor shift in one room
            var roomTypes = lines
                .Where(l => !string.IsNullOrWhiteSpace(l.Service.RequiredRoomType))
                .Select(l => l.Service.RequiredRoomType)
                .Distinct()
                .Count();
            ConditionGuard.Ensure(roomTypes <= 1, ErrorConstants.AppointmentMessage.ServicesNeedDifferentRooms);

            return lines;
        }

        private async Task<string> GetStringConfigAsync(string configKey)
        {
            var value = await _appointmentRepository.GetConfigValueAsync(configKey);
            ConditionGuard.Ensure(!string.IsNullOrWhiteSpace(value),
                string.Format(ErrorConstants.AppointmentMessage.ConfigMissing, configKey));
            return value!;
        }

        // A failed notification must not undo the confirmation, so errors are only logged
        private async Task SendConfirmationNotificationAsync(Appointment appointment)
        {
            var serviceNames = string.Join(", ", appointment.ServiceItems.Select(i => i.Variant == null
                ? i.Service?.ServiceName
                : $"{i.Service?.ServiceName} - {i.Variant.VariantName}"));
            var message = $"OZE Dental: Lich hen {serviceNames} " +
                          $"luc {appointment.TimeSlotStart:HH\\:mm} ngay {appointment.AppointmentDate:dd/MM/yyyy} " +
                          "da duoc xac nhan.";
            try
            {
                if (!string.IsNullOrWhiteSpace(appointment.Patient?.PhoneNumber))
                {
                    await _smsSender.SendSmsAsync(appointment.Patient.PhoneNumber, message);
                }
                if (!string.IsNullOrWhiteSpace(appointment.Patient?.Email))
                {
                    await _emailSender.SendEmailAsync(appointment.Patient.Email, "OZE Dental - Appointment confirmed", message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not send the confirmation notification for appointment {AppointmentId}", appointment.Id);
            }
        }

        private async Task<int> GetIntConfigAsync(string configKey)
        {
            var value = await _appointmentRepository.GetConfigValueAsync(configKey);
            ConditionGuard.Ensure(int.TryParse(value, out var result),
                string.Format(ErrorConstants.AppointmentMessage.ConfigMissing, configKey));
            return result;
        }

        // A failed notification must not undo the booking, so errors are only logged
        private async Task SendBookingNotificationAsync(string? phone, string? email, Appointment appointment, List<BookingLine> lines)
        {
            var serviceNames = string.Join(", ", lines.Select(l => l.DisplayName));
            var message = $"OZE Dental: Lich hen {serviceNames} " +
                          $"luc {appointment.TimeSlotStart:HH\\:mm} ngay {appointment.AppointmentDate:dd/MM/yyyy} " +
                          "da duoc ghi nhan. Le tan se goi dien de xac nhan.";
            try
            {
                if (!string.IsNullOrWhiteSpace(phone))
                {
                    await _smsSender.SendSmsAsync(phone, message);
                }
                if (!string.IsNullOrWhiteSpace(email))
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
            AvailableSlotResponse slot, List<BookingLine> lines)
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
                // Kept for the current frontend: the first service (the general exam)
                ServiceId = lines[0].Service.Id,
                ServiceName = lines[0].Service.ServiceName,
                Services = appointment.ServiceItems.Select(item => new AppointmentServiceResponse
                {
                    ServiceId = item.ServiceId,
                    ServiceName = lines.First(l => l.Service.Id == item.ServiceId).Service.ServiceName,
                    VariantId = item.VariantId,
                    VariantName = lines.FirstOrDefault(l => l.Variant?.Id == item.VariantId && item.VariantId != null)?.Variant?.VariantName,
                    DurationMinutes = item.DurationMinutes,
                    PriceAtBooking = item.PriceAtBooking
                }).ToList(),
                AppointmentType = appointment.AppointmentType,
                AppointmentDate = appointment.AppointmentDate,
                TimeSlotStart = slot.SlotStart,
                TimeSlotEnd = slot.SlotEnd,
                Status = appointment.Status,
                Notes = appointment.Notes,
                CreatedAt = appointment.CreatedAt
            };
        }

        public async Task<PagedResult<AppointmentResponse>> GetAppointmentsAsync(AppointmentQueryParameters query, CancellationToken cancellationToken = default)
        {
            var pagedResult = await _appointmentRepository.GetAppointmentsAsync(query, cancellationToken);
            var mappedItems = pagedResult.Items.Select(MapToResponse).ToList();
            return new PagedResult<AppointmentResponse>(mappedItems, pagedResult.TotalCount, pagedResult.PageNumber, pagedResult.PageSize);
        }

        public async Task<AppointmentResponse> GetAppointmentByIdAsync(long id, string? ownerUserId, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);
            EnsureOwnedBy(appointment!, ownerUserId);

            return MapToResponse(appointment!);
        }

        public async Task<AppointmentResponse> CancelAppointmentAsync(long id, CancelAppointmentRequest request, string? userId, string? ownerUserId, CancellationToken cancellationToken = default)
        {
            ConditionGuard.Ensure(!string.IsNullOrWhiteSpace(request?.Reason), ErrorConstants.AppointmentMessage.ReasonRequired);

            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);
            EnsureOwnedBy(appointment!, ownerUserId);

            ConditionGuard.ThrowIf(!IsOpen(appointment!), ErrorConstants.AppointmentMessage.OnlyOpenCanBeCancelled);

            // Staff can cancel at any time (a patient may phone just before the visit).
            // A patient can only cancel a pending appointment, and only before the cutoff
            if (ownerUserId != null)
            {
                ConditionGuard.ThrowIf(appointment.Status == AppointmentConstants.ConfirmedStatus,
                    ErrorConstants.AppointmentMessage.ConfirmedNeedsReceptionistToCancel);

                var cutoffHours = await GetIntConfigAsync(ConfigKeyConstants.BookingCancelCutoffHours);
                var startsAt = appointment.AppointmentDate.ToDateTime(appointment.TimeSlotStart ?? default);
                ConditionGuard.ThrowIf(startsAt - DateTime.Now < TimeSpan.FromHours(cutoffHours),
                    ErrorConstants.AppointmentMessage.CancelDeadlinePassed);
            }

            appointment.Status = AppointmentConstants.CancelledStatus;
            appointment.CancellationReason = request!.Reason.Trim();
            appointment.CancelledAt = DateTimeOffset.UtcNow;
            appointment.CancelledByUserId = userId;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            await _appointmentRepository.UpdateAsync(appointment);

            return MapToResponse(appointment);
        }

        public async Task<AppointmentResponse> ConfirmAppointmentAsync(long id, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);

            ConditionGuard.ThrowIf(appointment!.Status != AppointmentConstants.PendingStatus, ErrorConstants.AppointmentMessage.OnlyPendingCanBeConfirmed);

            appointment.Status = AppointmentConstants.ConfirmedStatus;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            await _appointmentRepository.UpdateAsync(appointment);
            await SendConfirmationNotificationAsync(appointment);

            return MapToResponse(appointment);
        }

        public async Task<AppointmentResponse> CheckInAppointmentAsync(long id, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);

            ConditionGuard.ThrowIf(!IsOpen(appointment!), ErrorConstants.AppointmentMessage.OnlyOpenCanBeCheckedIn);

            appointment.Status = AppointmentConstants.CheckedInStatus;
            appointment.CheckInAt = DateTimeOffset.UtcNow;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            await _appointmentRepository.UpdateAsync(appointment);

            return MapToResponse(appointment);
        }

        // Only an appointment that has not started yet can be cancelled or checked in
        private static bool IsOpen(Appointment appointment) =>
            appointment.Status == AppointmentConstants.PendingStatus || appointment.Status == AppointmentConstants.ConfirmedStatus;

        // A null owner means staff access. A patient only reaches their own appointments; anyone else's looks like "not found"
        private static void EnsureOwnedBy(Appointment appointment, string? ownerUserId)
        {
            if (ownerUserId == null)
            {
                return;
            }

            ConditionGuard.Ensure<NotFoundException>(appointment.Patient?.UserId == ownerUserId, ErrorConstants.AppointmentMessage.AppointmentNotFound);
        }

        private static AppointmentResponse MapToResponse(Appointment appointment)
        {
            var firstItem = appointment.ServiceItems.FirstOrDefault();
            return new AppointmentResponse
            {
                Id = appointment.Id,
                PatientId = appointment.PatientId,
                PatientCode = appointment.Patient?.PatientCode ?? string.Empty,
                PatientName = appointment.Patient?.FullName ?? string.Empty,
                PatientPhoneNumber = appointment.Patient?.PhoneNumber ?? string.Empty,
                DoctorId = appointment.DoctorId,
                DoctorName = appointment.Doctor?.FullName,
                ServiceId = firstItem?.ServiceId ?? 0,
                ServiceName = firstItem?.Service?.ServiceName ?? string.Empty,
                Services = appointment.ServiceItems.Select(item => new AppointmentServiceResponse
                {
                    ServiceId = item.ServiceId,
                    ServiceName = item.Service?.ServiceName ?? string.Empty,
                    VariantId = item.VariantId,
                    VariantName = item.Variant?.VariantName,
                    DurationMinutes = item.DurationMinutes,
                    PriceAtBooking = item.PriceAtBooking
                }).ToList(),
                AppointmentType = appointment.AppointmentType,
                AppointmentDate = appointment.AppointmentDate,
                TimeSlotStart = appointment.TimeSlotStart ?? default,
                TimeSlotEnd = appointment.TimeSlotEnd ?? default,
                Status = appointment.Status,
                CheckInAt = appointment.CheckInAt,
                CancellationReason = appointment.CancellationReason,
                Notes = appointment.Notes,
                CreatedAt = appointment.CreatedAt
            };
        }
    }
}

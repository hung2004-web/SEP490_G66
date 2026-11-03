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
        private readonly IAuditLogService _auditLogService;
        private readonly ILogger<AppointmentService> _logger;
        private readonly IQueueService? _queueService;

        public AppointmentService(
            IAppointmentRepository appointmentRepository,
            IRegistrationRepository registrationRepository,
            IServiceRepository serviceRepository,
            ISmsSender smsSender,
            IEmailSender emailSender,
            IAuditLogService auditLogService,
            ILogger<AppointmentService> logger,
            IQueueService? queueService = null)
        {
            _appointmentRepository = appointmentRepository;
            _registrationRepository = registrationRepository;
            _serviceRepository = serviceRepository;
            _smsSender = smsSender;
            _emailSender = emailSender;
            _auditLogService = auditLogService;
            _logger = logger;
            _queueService = queueService;
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
            await LogCreatedAsync(appointment, lines);
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
            await LogCreatedAsync(appointment, lines);
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

                // One appointment at a time: the earlier one must be completed, cancelled or marked NO_SHOW first.
                // A patient without a record yet (Id 0) cannot have one.
                if (patient.Id != 0)
                {
                    ConditionGuard.ThrowIf(await _appointmentRepository.HasUnfinishedAppointmentAsync(patient.Id),
                        ErrorConstants.AppointmentMessage.PatientHasUnfinishedAppointment);
                }

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
        // excludeAppointmentId: the appointment being rescheduled, so it does not block its own new time
        private async Task<List<AvailableSlotResponse>> FindSlotsAsync(List<BookingLine> lines, DateOnly date, int? doctorId, long? excludeAppointmentId = null)
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
            var booked = (await _appointmentRepository.GetActiveAppointmentsAsync(date, doctorIds))
                .Where(a => a.Id != excludeAppointmentId)
                .ToList();

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

        // Waiting order: booked patients on time (by booked time), then booked patients who came late (by check-in time),
        // then walk-ins (by check-in time). Only the order of people who are waiting; nobody who is already being seen moves
        public async Task<List<WaitingListItemResponse>> GetWaitingListAsync(int? doctorId, string? doctorUserId, CancellationToken cancellationToken = default)
        {
            if (doctorUserId != null)
            {
                var ownDoctorId = await _appointmentRepository.GetStaffProfileIdByUserIdAsync(doctorUserId);
                ConditionGuard.Ensure<NotFoundException>(ownDoctorId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);
                doctorId = ownDoctorId;
            }

            var lateMinutes = await GetIntConfigAsync(ConfigKeyConstants.CheckInLateMinutes);
            var today = DateOnly.FromDateTime(DateTime.Today);
            var waiting = await _appointmentRepository.GetWaitingAppointmentsAsync(today, doctorId, cancellationToken);

            return waiting
                .Select(a => (Appointment: a, Group: GetWaitingGroup(a, lateMinutes)))
                .OrderByDescending(x => x.Appointment.Priority)
                .ThenBy(x => x.Group)
                .ThenBy(x => x.Group == OnTimeGroup ? x.Appointment.TimeSlotStart : null)
                .ThenBy(x => x.Appointment.CheckInAt)
                .Select((x, index) => new WaitingListItemResponse
                {
                    Position = index + 1,
                    AppointmentId = x.Appointment.Id,
                    PatientId = x.Appointment.PatientId,
                    PatientCode = x.Appointment.Patient?.PatientCode ?? string.Empty,
                    PatientName = x.Appointment.Patient?.FullName ?? string.Empty,
                    DoctorId = x.Appointment.DoctorId,
                    DoctorName = x.Appointment.Doctor?.FullName,
                    AppointmentType = x.Appointment.AppointmentType,
                    TimeSlotStart = x.Appointment.TimeSlotStart,
                    CheckInAt = x.Appointment.CheckInAt,
                    RoomId = GetCurrentRoom(x.Appointment)?.Id,
                    RoomName = GetCurrentRoom(x.Appointment)?.RoomName,
                    Priority = x.Appointment.Priority,
                    IsLate = x.Group == LateGroup,
                    IsPriorityReturn = x.Group == PriorityReturnGroup,
                    Services = x.Appointment.ServiceItems
                        .Select(i => i.Variant == null ? i.Service.ServiceName : $"{i.Service.ServiceName} - {i.Variant.VariantName}")
                        .ToList()
                })
                .ToList();
        }

        private const int PriorityReturnGroup = 0;
        private const int OnTimeGroup = 1;
        private const int LateGroup = 2;
        private const int WalkInGroup = 3;

        private static int GetWaitingGroup(Appointment appointment, int lateMinutes)
        {
            if (appointment.Examination != null)
            {
                return PriorityReturnGroup;
            }

            if (appointment.AppointmentType == AppointmentConstants.WalkInType)
            {
                return WalkInGroup;
            }

            return IsLateCheckIn(appointment, lateMinutes) ? LateGroup : OnTimeGroup;
        }

        // Arriving early is never late; only a check-in after the booked time plus the allowed delay is
        private static bool IsLateCheckIn(Appointment appointment, int lateMinutes)
        {
            if (appointment.CheckInAt == null || appointment.TimeSlotStart == null)
            {
                return false;
            }

            var bookedAt = appointment.AppointmentDate.ToDateTime(appointment.TimeSlotStart.Value);
            return appointment.CheckInAt.Value.LocalDateTime > bookedAt.AddMinutes(lateMinutes);
        }

        public async Task<PagedResult<AppointmentResponse>> GetMyAppointmentsAsync(AppointmentQueryParameters query, string userId, CancellationToken cancellationToken = default)
        {
            var patient = await _appointmentRepository.GetPatientByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(patient != null, ErrorConstants.AppointmentMessage.PatientProfileNotFound);

            // Always the signed-in patient's own id; a PatientId sent by the client is overwritten
            query.PatientId = patient!.Id;
            return await GetAppointmentsAsync(query, cancellationToken);
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

                await EnsureBeforeCutoffAsync(appointment, ErrorConstants.AppointmentMessage.CancelDeadlinePassed);
            }

            var oldStatus = appointment.Status;
            appointment.Status = AppointmentConstants.CancelledStatus;
            appointment.CancellationReason = request!.Reason.Trim();
            appointment.CancelledAt = DateTimeOffset.UtcNow;
            appointment.CancelledByUserId = userId;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            await _appointmentRepository.UpdateAsync(appointment);
            await _auditLogService.LogAsync(AuditConstants.AppointmentCancelled, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                new { Status = oldStatus }, new { appointment.Status }, appointment.CancellationReason);

            return MapToResponse(appointment);
        }

        public async Task<AppointmentResponse> RescheduleAppointmentAsync(long id, RescheduleAppointmentRequest request, string? ownerUserId, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);
            EnsureOwnedBy(appointment!, ownerUserId);

            ConditionGuard.ThrowIf(!IsOpen(appointment!), ErrorConstants.AppointmentMessage.OnlyOpenCanBeRescheduled);

            var isPatient = ownerUserId != null;
            if (isPatient)
            {
                // A confirmed appointment was agreed with the receptionist, so changing it also goes through them
                ConditionGuard.ThrowIf(appointment!.Status == AppointmentConstants.ConfirmedStatus,
                    ErrorConstants.AppointmentMessage.ConfirmedNeedsReceptionistToReschedule);
                await EnsureBeforeCutoffAsync(appointment, ErrorConstants.AppointmentMessage.RescheduleDeadlinePassed);
            }

            // The services stay the same, so the new slot must fit the same total time and room type
            var lines = appointment!.ServiceItems.Select(i => new BookingLine(i.Service, i.Variant)).ToList();
            ConditionGuard.Ensure(lines.Count > 0, ErrorConstants.AppointmentMessage.ServiceNotFound);

            var date = request.Date!.Value;
            var slotStart = request.SlotStart!.Value;
            var before = new { appointment.Status, appointment.AppointmentDate, appointment.TimeSlotStart, appointment.TimeSlotEnd, appointment.DoctorId };

            await _appointmentRepository.ExecuteSerializableAsync(async () =>
            {
                // Re-check inside the transaction; never trust the slot sent by the client
                var candidates = (await FindSlotsAsync(lines, date, request.DoctorId, excludeAppointmentId: appointment.Id))
                    .Where(x => x.SlotStart == slotStart)
                    .ToList();
                ConditionGuard.Ensure(candidates.Count > 0, ErrorConstants.AppointmentMessage.SlotNotAvailable);

                // No doctor sent: keep the current doctor when free, otherwise take the least busy one
                var slot = request.DoctorId.HasValue
                    ? candidates[0]
                    : candidates.FirstOrDefault(c => c.DoctorId == appointment.DoctorId)
                        ?? await PickLeastBusyAsync(candidates, date);

                appointment.AppointmentDate = date;
                appointment.TimeSlotStart = slot.SlotStart;
                appointment.TimeSlotEnd = slot.SlotEnd;
                appointment.DoctorId = slot.DoctorId;
                // A patient's change still needs the receptionist's call; staff changed it after talking to the patient
                appointment.Status = isPatient ? AppointmentConstants.PendingStatus : AppointmentConstants.ConfirmedStatus;
                appointment.UpdatedAt = DateTimeOffset.UtcNow;

                await _appointmentRepository.UpdateAsync(appointment);
                return slot;
            });

            await _auditLogService.LogAsync(AuditConstants.AppointmentRescheduled, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                before, new { appointment.Status, appointment.AppointmentDate, appointment.TimeSlotStart, appointment.TimeSlotEnd, appointment.DoctorId });

            if (!isPatient)
            {
                await SendConfirmationNotificationAsync(appointment);
            }

            return MapToResponse(appointment);
        }

        public async Task<AppointmentResponse> ConfirmAppointmentAsync(long id, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);

            ConditionGuard.ThrowIf(appointment!.Status != AppointmentConstants.PendingStatus, ErrorConstants.AppointmentMessage.OnlyPendingCanBeConfirmed);

            var oldStatus = appointment.Status;
            appointment.Status = AppointmentConstants.ConfirmedStatus;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            await _appointmentRepository.UpdateAsync(appointment);
            await _auditLogService.LogAsync(AuditConstants.AppointmentConfirmed, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                new { Status = oldStatus }, new { appointment.Status });
            await SendConfirmationNotificationAsync(appointment);

            return MapToResponse(appointment);
        }

        public async Task<AppointmentResponse> CheckInAppointmentAsync(long id, CheckInRequest? request, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);

            // The receptionist confirms the booking first (this is also what filters out fake bookings)
            ConditionGuard.ThrowIf(appointment!.Status == AppointmentConstants.PendingStatus, ErrorConstants.AppointmentMessage.CheckInNeedsConfirmation);
            ConditionGuard.ThrowIf(appointment.Status != AppointmentConstants.ConfirmedStatus, ErrorConstants.AppointmentMessage.OnlyConfirmedCanBeCheckedIn);
            // A patient may arrive at any time of that day, early or late; the waiting order decides who is seen first
            ConditionGuard.ThrowIf(appointment.AppointmentDate != DateOnly.FromDateTime(DateTime.Today), ErrorConstants.AppointmentMessage.CheckInWrongDay);

            var priority = request?.Priority ?? PriorityConstants.Normal;
            EnsureValidPriority(priority, request?.Reason);

            // The patient goes to the room of the doctor's shift
            var room = await FindDoctorRoomAsync(appointment);

            var oldStatus = appointment.Status;
            appointment.Status = AppointmentConstants.CheckedInStatus;
            appointment.Priority = priority;
            appointment.CheckInAt = DateTimeOffset.UtcNow;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            await _appointmentRepository.UpdateAsync(appointment);

            await EnterExaminationQueueAsync(appointment, room, request?.Reason, cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.AppointmentCheckedIn, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                new { Status = oldStatus }, new { appointment.Status, appointment.Priority }, request?.Reason?.Trim());

            var response = MapToResponse(appointment);
            response.RoomId = room?.Id;
            response.RoomName = room?.RoomName;
            return response;
        }

        public async Task<List<NeedsAttentionResponse>> GetNeedsAttentionAsync(CancellationToken cancellationToken = default)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var shifts = await _appointmentRepository.GetEndedShiftsAsync(today);
            if (shifts.Count == 0)
            {
                return new List<NeedsAttentionResponse>();
            }

            var doctorIds = shifts.Select(x => x.StaffProfileId).Distinct().ToList();
            var statuses = new[] { AppointmentConstants.PendingStatus, AppointmentConstants.ConfirmedStatus, AppointmentConstants.CheckedInStatus };
            var appointments = await _appointmentRepository.GetAppointmentsOfDoctorsAsync(today, doctorIds, statuses);

            var items = new List<NeedsAttentionResponse>();
            foreach (var appointment in appointments)
            {
                // The patient belongs to the shift the doctor ended, the same rule as when the shift was ended
                var shift = shifts.FirstOrDefault(s => s.StaffProfileId == appointment.DoctorId && ShiftTimeHelper.IsInShift(appointment, s));
                if (shift == null)
                {
                    continue;
                }

                string group;
                if (appointment.Status == AppointmentConstants.CheckedInStatus)
                {
                    group = AppointmentConstants.AttentionWaiting;
                }
                else if (appointment.TimeSlotStart.HasValue && shift.ActualEndTime.HasValue && appointment.TimeSlotStart.Value > shift.ActualEndTime.Value)
                {
                    // Booked for a time after the doctor left
                    group = AppointmentConstants.AttentionUpcoming;
                }
                else
                {
                    continue;
                }

                items.Add(new NeedsAttentionResponse
                {
                    AppointmentId = appointment.Id,
                    PatientId = appointment.PatientId,
                    PatientCode = appointment.Patient?.PatientCode ?? string.Empty,
                    PatientName = appointment.Patient?.FullName ?? string.Empty,
                    PatientPhoneNumber = appointment.Patient?.PhoneNumber ?? string.Empty,
                    AppointmentType = appointment.AppointmentType,
                    Status = appointment.Status,
                    Group = group,
                    TimeSlotStart = appointment.TimeSlotStart,
                    DoctorId = appointment.DoctorId,
                    DoctorName = appointment.Doctor?.FullName,
                    ShiftEndedAt = shift.ActualEndTime,
                    HasExamination = appointment.Examination != null
                });
            }

            // The ones in the clinic first, then the booked ones by time
            return items
                .OrderBy(x => x.Group == AppointmentConstants.AttentionWaiting ? 0 : 1)
                .ThenBy(x => x.TimeSlotStart)
                .ThenBy(x => x.AppointmentId)
                .ToList();
        }

        public async Task<AppointmentResponse> ReassignDoctorAsync(long id, ReassignDoctorRequest request, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithExaminationAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);

            ConditionGuard.ThrowIf(appointment!.Status != AppointmentConstants.CheckedInStatus, ErrorConstants.AppointmentMessage.ReassignOnlyWaiting);
            // A patient the doctor has already examined (back from the X-ray) belongs to that examination
            ConditionGuard.ThrowIf(appointment.Examination != null, ErrorConstants.AppointmentMessage.ReassignAlreadyExamined);
            var today = DateOnly.FromDateTime(DateTime.Today);
            ConditionGuard.ThrowIf(appointment.AppointmentDate != today, ErrorConstants.AppointmentMessage.ReassignWrongDay);
            var newDoctorId = request.DoctorId!.Value;
            ConditionGuard.ThrowIf(appointment.DoctorId == newDoctorId, ErrorConstants.AppointmentMessage.ReassignSameDoctor);

            var shift = await FindDoctorShiftAsync(newDoctorId, today, null);
            ConditionGuard.Ensure(shift != null, ErrorConstants.AppointmentMessage.DoctorHasNoShiftToday);
            var room = shift!.Room;

            // The same rule as booking: the services need the right kind of room
            var requiredRoomType = appointment.ServiceItems
                .Select(i => i.Service?.RequiredRoomType)
                .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t));
            ConditionGuard.Ensure(requiredRoomType == null || room?.RoomType == requiredRoomType,
                ErrorConstants.AppointmentMessage.ReassignRoomNotSuitable);

            var oldDoctorId = appointment.DoctorId;
            appointment.DoctorId = newDoctorId;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;
            await _appointmentRepository.UpdateAsync(appointment);

            // Out of the queue of the doctor who left, to the end of the queue of the new one (the priority goes along)
            if (_queueService != null)
            {
                await _queueService.UpdateStatusAsync(appointment.Id, QueueConstants.ExaminationType, QueueConstants.Cancelled, cancellationToken);
            }
            await EnterExaminationQueueAsync(appointment, room, null, cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.AppointmentDoctorReassigned, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                new { DoctorId = oldDoctorId }, new { DoctorId = newDoctorId, RoomId = room?.Id });

            var response = MapToResponse(appointment);
            response.DoctorId = newDoctorId;
            response.DoctorName = shift.StaffProfile?.FullName;
            response.RoomId = room?.Id;
            response.RoomName = room?.RoomName;
            return response;
        }

        public async Task<AppointmentResponse> CreateWalkInAsync(WalkInRequest request, string? createdByUserId, CancellationToken cancellationToken = default)
        {
            ConditionGuard.Ensure(PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phone), ErrorConstants.AuthMessage.InvalidPhone);

            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            ConditionGuard.ThrowIf(email != null && (email.Length > 256 || !new EmailAddressAttribute().IsValid(email)),
                ErrorConstants.AuthMessage.EmailInvalid);
            ConditionGuard.Ensure(PatientConstants.Gender.TryNormalize(request.Gender, out var gender), ErrorConstants.PatientMessage.InvalidGender);
            ConditionGuard.Ensure(request.DateOfBirth == null || request.DateOfBirth.Value <= DateOnly.FromDateTime(DateTime.Today),
                ErrorConstants.PatientMessage.InvalidDateOfBirth);

            // Normal unless the desk says otherwise; above normal needs a reason, like at check-in
            var priority = request.Priority ?? PriorityConstants.Normal;
            EnsureValidPriority(priority, request.Reason);

            var lines = await ResolveBookingLinesAsync(request.ServiceId, request.VariantId);

            // The patient is seen by the doctor they asked for, in the room of that doctor's shift
            var today = DateOnly.FromDateTime(DateTime.Today);
            var shift = await FindDoctorShiftAsync(request.DoctorId!.Value, today, null);
            ConditionGuard.Ensure(shift != null, ErrorConstants.AppointmentMessage.DoctorHasNoShiftToday);
            var room = shift!.Room;

            var slotMinutes = await GetIntConfigAsync(ConfigKeyConstants.SlotDurationMinutes);
            var phoneVariants = PhoneNumberHelper.GetLookupVariants(phone);

            var (appointment, patient) = await _appointmentRepository.ExecuteSerializableAsync(async () =>
            {
                // A phone that already has a record (with or without an account) is the same person: the record is used as it is
                var patients = await _registrationRepository.FindPatientsByPhoneAsync(phoneVariants);
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
                        DateOfBirth = request.DateOfBirth,
                        Gender = gender,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    await _appointmentRepository.AddPatientAsync(patient);
                }
                else
                {
                    // One appointment at a time, also for someone who walks in
                    ConditionGuard.ThrowIf(await _appointmentRepository.HasUnfinishedAppointmentAsync(patient.Id),
                        ErrorConstants.AppointmentMessage.PatientHasUnfinishedAppointment);
                }

                var now = DateTimeOffset.UtcNow;
                var appointment = new Appointment
                {
                    Patient = patient,
                    DoctorId = request.DoctorId,
                    AppointmentType = AppointmentConstants.WalkInType,
                    AppointmentDate = today,
                    // The patient is at the desk, so there is nothing to confirm
                    Status = AppointmentConstants.CheckedInStatus,
                    Priority = priority,
                    CheckInAt = now,
                    Notes = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                    CreatedAt = now,
                    CreatedByUserId = createdByUserId,
                    ServiceItems = lines.Select(l => new AppointmentServiceItem
                    {
                        ServiceId = l.Service.Id,
                        VariantId = l.Variant?.Id,
                        DurationMinutes = l.GetMinutes(slotMinutes),
                        PriceAtBooking = l.Price,
                        CreatedAt = now
                    }).ToList()
                };
                await _appointmentRepository.AddAsync(appointment);
                await _appointmentRepository.SaveChangesAsync();

                return (appointment, patient);
            });

            // After the transaction: the queue gives out its numbers in a transaction of its own
            await EnterExaminationQueueAsync(appointment, room, request.Reason?.Trim(), cancellationToken);

            await LogCreatedAsync(appointment, lines);
            await _auditLogService.LogAsync(AuditConstants.AppointmentCheckedIn, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                null, new { appointment.Status, appointment.Priority }, request.Reason?.Trim());

            // A walk-in has no booked time, so the time fields stay empty
            var response = ToResponse(appointment, patient, new AvailableSlotResponse
            {
                DoctorId = shift.StaffProfileId,
                DoctorName = shift.StaffProfile?.FullName ?? string.Empty,
                Date = today
            }, lines);
            response.CheckInAt = appointment.CheckInAt;
            response.RoomId = room?.Id;
            response.RoomName = room?.RoomName;
            return response;
        }

        // The room of the doctor's shift: the one running now, else the one the booked slot belongs to, else the next one of the day.
        // A doctor who has ended the shift takes no more patients; a doctor without a shift today is left without a room.
        private async Task<Room?> FindDoctorRoomAsync(Appointment appointment)
        {
            if (appointment.DoctorId == null)
            {
                return null;
            }

            var shift = await FindDoctorShiftAsync(appointment.DoctorId.Value, appointment.AppointmentDate, appointment.TimeSlotStart);
            return shift?.Room;
        }

        // The shift the patient is seen in; null when the doctor has none to offer today
        private async Task<StaffSchedule?> FindDoctorShiftAsync(int doctorId, DateOnly date, TimeOnly? slot)
        {
            var shifts = await _appointmentRepository.GetDoctorShiftsAsync(date, doctorId)
                ?? new List<StaffSchedule>();
            var now = TimeOnly.FromDateTime(DateTime.Now);
            var shift = shifts.FirstOrDefault(x => x.ShiftStart <= now && now < x.ShiftEnd)
                ?? shifts.FirstOrDefault(x => slot.HasValue && x.ShiftStart <= slot.Value && slot.Value < x.ShiftEnd)
                ?? shifts.FirstOrDefault(x => x.ShiftStart > now);
            if (shift == null)
            {
                var hasEnded = await _appointmentRepository.HasEndedShiftAsync(doctorId, date);
                ConditionGuard.ThrowIf(hasEnded, ErrorConstants.AppointmentMessage.CheckInDoctorShiftEnded);
            }

            return shift;
        }

        // The patient waits for the doctor in the examination queue, in the room of the shift
        private Task EnterExaminationQueueAsync(Appointment appointment, Room? room, string? reason, CancellationToken cancellationToken)
        {
            return _queueService == null
                ? Task.CompletedTask
                : _queueService.EnqueueAsync(appointment.Id, QueueConstants.ExaminationType, room?.Id, appointment.DoctorId,
                    appointment.Priority, reason, cancellationToken);
        }

        // The room the waiting patient was sent to at check-in
        private static Room? GetCurrentRoom(Appointment appointment)
        {
            return appointment.QueueEntries
                .Where(q => q.QueueType == QueueConstants.ExaminationType && QueueConstants.ActiveStatuses.Contains(q.Status))
                .OrderByDescending(q => q.CreatedAt)
                .Select(q => q.Room)
                .FirstOrDefault();
        }

        public async Task<AppointmentResponse> SetPriorityAsync(long id, SetPriorityRequest request, CancellationToken cancellationToken = default)
        {
            var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);

            // Only someone who is checked in and still waiting has a place in the waiting list to change
            ConditionGuard.ThrowIf(appointment!.Status != AppointmentConstants.CheckedInStatus, ErrorConstants.AppointmentMessage.PriorityOnlyForWaiting);

            var priority = request.Priority!.Value;
            EnsureValidPriority(priority, request.Reason);

            var oldPriority = appointment.Priority;
            appointment.Priority = priority;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            await _appointmentRepository.UpdateAsync(appointment);

            // The queue board orders by its own copy of the priority, so it has to follow
            if (_queueService != null)
            {
                await _queueService.UpdatePriorityAsync(appointment.Id, QueueConstants.ExaminationType, priority, cancellationToken);
            }

            await _auditLogService.LogAsync(AuditConstants.AppointmentPriorityChanged, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                new { Priority = oldPriority }, new { appointment.Priority }, request.Reason?.Trim());

            return MapToResponse(appointment);
        }

        public async Task<StartExaminationResponse> StartExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default)
        {
            var doctorId = await _appointmentRepository.GetStaffProfileIdByUserIdAsync(doctorUserId);
            ConditionGuard.Ensure<NotFoundException>(doctorId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);

            var appointment = await _appointmentRepository.GetByIdWithExaminationAsync(id, cancellationToken)
                ?? await _appointmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.AppointmentMessage.AppointmentNotFound);

            // The waiting list of a doctor contains only that doctor's checked-in patients
            ConditionGuard.Ensure<ForbiddenException>(appointment!.DoctorId == doctorId, ErrorConstants.AppointmentMessage.NotAssignedDoctor);
            ConditionGuard.ThrowIf(appointment.Status != AppointmentConstants.CheckedInStatus, ErrorConstants.AppointmentMessage.OnlyCheckedInCanBeStarted);
            ConditionGuard.ThrowIf(appointment.AppointmentDate != DateOnly.FromDateTime(DateTime.Today), ErrorConstants.AppointmentMessage.ExaminationWrongDay);

            // One patient at a time: the doctor must finish the current examination first
            var isExamining = await _appointmentRepository.HasAppointmentInServiceAsync(doctorId!.Value, appointment.AppointmentDate);
            ConditionGuard.ThrowIf(isExamining, ErrorConstants.AppointmentMessage.DoctorAlreadyExamining);

            var now = DateTimeOffset.UtcNow;
            var oldStatus = appointment.Status;
            appointment.Status = AppointmentConstants.InServiceStatus;
            appointment.UpdatedAt = now;

            Examination examination;
            if (appointment.Examination != null)
            {
                // Resuming an existing examination (e.g. returning from X-ray / lab)
                examination = appointment.Examination;
                examination.UpdatedAt = now;
                await _appointmentRepository.UpdateAsync(appointment);
            }
            else
            {
                examination = new Examination
                {
                    PatientId = appointment.PatientId,
                    DoctorId = doctorId!.Value,
                    // The reason left when booking; the doctor corrects it during the examination
                    ChiefComplaint = appointment.Notes,
                    ExaminationStatus = ExaminationConstants.InProgress,
                    CreatedAt = now
                };

                await _appointmentRepository.SaveStartedExaminationAsync(appointment, examination, cancellationToken);
            }

            if (_queueService != null)
            {
                await _queueService.UpdateStatusAsync(appointment.Id, QueueConstants.ExaminationType, QueueConstants.InProgress, cancellationToken);
            }

            await _auditLogService.LogAsync(AuditConstants.AppointmentExaminationStarted, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                new { Status = oldStatus }, new { appointment.Status, ExaminationId = examination.Id, examination.ExaminationStatus });

            return new StartExaminationResponse
            {
                ExaminationId = examination.Id,
                AppointmentId = appointment.Id,
                PatientId = appointment.PatientId,
                DoctorId = examination.DoctorId,
                ExaminationStatus = examination.ExaminationStatus,
                AppointmentStatus = appointment.Status,
                ChiefComplaint = examination.ChiefComplaint
            };
        }

        public async Task<AppointmentResponse> CompleteExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default)
        {
            var doctorId = await _appointmentRepository.GetStaffProfileIdByUserIdAsync(doctorUserId);
            ConditionGuard.Ensure<NotFoundException>(doctorId != null, ErrorConstants.AppointmentMessage.DoctorProfileNotFound);

            var appointment = await _appointmentRepository.GetByIdWithExaminationAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(appointment != null && appointment.DoctorId == doctorId,
                ErrorConstants.AppointmentMessage.AppointmentNotFound);

            ConditionGuard.ThrowIf(appointment!.Status != AppointmentConstants.InServiceStatus,
                ErrorConstants.AppointmentMessage.OnlyInServiceCanBeCompleted);
            var examination = appointment.Examination;
            ConditionGuard.ThrowIf(examination == null, ErrorConstants.AppointmentMessage.ExaminationNotFound);
            ConditionGuard.ThrowIf(examination!.ExaminationStatus != ExaminationConstants.InProgress,
                ErrorConstants.AppointmentMessage.ExaminationAlreadyLocked);

            var now = DateTimeOffset.UtcNow;
            var oldStatus = appointment.Status;
            examination.ExaminationStatus = "Locked";
            examination.LockedAt = now;
            examination.LockedByUserId = doctorUserId;
            examination.UpdatedAt = now;

            appointment.Status = AppointmentConstants.CompletedStatus;
            appointment.UpdatedAt = now;

            await _appointmentRepository.UpdateAsync(appointment);

            if (_queueService != null)
            {
                await _queueService.UpdateStatusAsync(appointment.Id, QueueConstants.ExaminationType, QueueConstants.Completed, cancellationToken);
            }

            await _auditLogService.LogAsync(AuditConstants.AppointmentCompleted, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                new { Status = oldStatus }, new { appointment.Status, ExaminationId = examination.Id, examination.ExaminationStatus });

            return MapToResponse(appointment);
        }

        // Anything above normal needs a reason, so the order of the waiting list can be explained later
        private static void EnsureValidPriority(int priority, string? reason)
        {
            ConditionGuard.Ensure(PriorityConstants.AllowedLevels.Contains(priority), ErrorConstants.AppointmentMessage.PriorityInvalid);
            ConditionGuard.Ensure(priority == PriorityConstants.Normal || !string.IsNullOrWhiteSpace(reason),
                ErrorConstants.AppointmentMessage.PriorityReasonRequired);
        }

        private Task LogCreatedAsync(Appointment appointment, List<BookingLine> lines) =>
            _auditLogService.LogAsync(AuditConstants.AppointmentCreated, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                newValues: new
                {
                    appointment.Status,
                    appointment.AppointmentDate,
                    appointment.TimeSlotStart,
                    appointment.TimeSlotEnd,
                    appointment.DoctorId,
                    Services = lines.Select(l => l.DisplayName)
                });

        // A patient can only cancel or reschedule while the appointment is further away than the cutoff
        private async Task EnsureBeforeCutoffAsync(Appointment appointment, string errorMessage)
        {
            var cutoffHours = await GetIntConfigAsync(ConfigKeyConstants.BookingCancelCutoffHours);
            var startsAt = appointment.AppointmentDate.ToDateTime(appointment.TimeSlotStart ?? default);
            ConditionGuard.ThrowIf(startsAt - DateTime.Now < TimeSpan.FromHours(cutoffHours), errorMessage);
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

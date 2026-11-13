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
    // Staff ask for a day or half a day off; the manager approves (optionally handing the shifts to a substitute) or rejects
    public class LeaveRequestService : ILeaveRequestService
    {
        private const string EntityType = AuditConstants.LeaveRequestEntity;

        private readonly ILeaveRequestRepository _leaveRequestRepository;
        private readonly IWorkShiftRepository _workShiftRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IAuditLogService _auditLogService;

        public LeaveRequestService(
            ILeaveRequestRepository leaveRequestRepository,
            IWorkShiftRepository workShiftRepository,
            IStaffRepository staffRepository,
            IAuditLogService auditLogService)
        {
            _leaveRequestRepository = leaveRequestRepository;
            _workShiftRepository = workShiftRepository;
            _staffRepository = staffRepository;
            _auditLogService = auditLogService;
        }

        public async Task<LeaveRequestResponse> CreateAsync(
            string userId,
            CreateLeaveRequestRequest request,
            CancellationToken cancellationToken = default)
        {
            var staff = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(staff != null, ErrorConstants.LeaveRequestMessage.StaffNotFound);

            var date = request.LeaveDate!.Value;
            var slot = NormalizeSlot(request.Slot);
            var reason = request.Reason?.Trim() ?? string.Empty;
            ConditionGuard.Ensure(reason.Length > 0, ErrorConstants.LeaveRequestMessage.ReasonRequired);
            ConditionGuard.Ensure(date >= DateOnly.FromDateTime(ClinicClock.Today), ErrorConstants.LeaveRequestMessage.DateInPast);

            // Leave is taken from shifts, so there must be at least one shift in that time, none of them started
            var shifts = InSlot(await _leaveRequestRepository.GetShiftsOnDateAsync(staff!.Id, date, cancellationToken), slot);
            ConditionGuard.Ensure(shifts.Count > 0, ErrorConstants.LeaveRequestMessage.NoShiftToLeave);
            ConditionGuard.ThrowIf(shifts.Any(HasStarted), ErrorConstants.LeaveRequestMessage.ShiftAlreadyStarted);

            var duplicated = await _leaveRequestRepository.HasActiveOverlapAsync(staff.Id, date, slot, null, cancellationToken);
            ConditionGuard.ThrowIf(duplicated, ErrorConstants.LeaveRequestMessage.AlreadyRequested);

            var leave = new LeaveRequest
            {
                StaffProfileId = staff.Id,
                LeaveDate = date,
                Slot = slot,
                Reason = reason,
                Status = LeaveRequestConstants.Pending,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await _leaveRequestRepository.AddAsync(leave, cancellationToken);
            await _leaveRequestRepository.SaveChangesAsync(cancellationToken);
            leave.StaffProfile = staff;

            await _auditLogService.LogAsync(AuditConstants.LeaveRequested, EntityType, leave.Id.ToString(),
                newValues: new { leave.LeaveDate, leave.Slot, leave.Reason });

            return await ToResponseAsync(leave, withDetails: true, cancellationToken);
        }

        public async Task<PagedResult<LeaveRequestResponse>> GetMineAsync(
            string userId,
            LeaveRequestQuery query,
            CancellationToken cancellationToken = default)
        {
            var staff = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(staff != null, ErrorConstants.LeaveRequestMessage.StaffNotFound);

            var page = await _leaveRequestRepository.GetPagedAsync(query, staff!.Id, cancellationToken);
            return await ToPageAsync(page, cancellationToken);
        }

        public async Task<LeaveRequestResponse> CancelAsync(string userId, long id, CancellationToken cancellationToken = default)
        {
            var leave = await LoadAsync(id, cancellationToken);
            ConditionGuard.Ensure<ForbiddenException>(leave.StaffProfile.UserId == userId, ErrorConstants.LeaveRequestMessage.NotOwner);
            ConditionGuard.Ensure(leave.Status == LeaveRequestConstants.Pending, ErrorConstants.LeaveRequestMessage.NotPending);

            leave.Status = LeaveRequestConstants.Cancelled;
            leave.UpdatedAt = DateTimeOffset.UtcNow;
            await _leaveRequestRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.LeaveCancelled, EntityType, leave.Id.ToString(),
                oldValues: new { Status = LeaveRequestConstants.Pending }, newValues: new { leave.Status });

            return await ToResponseAsync(leave, withDetails: false, cancellationToken);
        }

        public async Task<PagedResult<LeaveRequestResponse>> GetPagedAsync(
            LeaveRequestQuery query,
            CancellationToken cancellationToken = default)
        {
            var page = await _leaveRequestRepository.GetPagedAsync(query, null, cancellationToken);
            return await ToPageAsync(page, cancellationToken);
        }

        public async Task<LeaveRequestDetailResponse> GetDetailAsync(long id, CancellationToken cancellationToken = default)
        {
            var leave = await LoadAsync(id, cancellationToken);
            var response = await ToResponseAsync(leave, withDetails: true, cancellationToken);
            var options = leave.Status == LeaveRequestConstants.Pending
                ? await GetSubstituteOptionsAsync(leave, cancellationToken)
                : new List<SubstituteOption>();

            return new LeaveRequestDetailResponse { Request = response, SubstituteOptions = options };
        }

        public async Task<LeaveRequestResponse> ApproveAsync(
            string managerUserId,
            long id,
            ApproveLeaveRequestRequest request,
            CancellationToken cancellationToken = default)
        {
            var leave = await _leaveRequestRepository.ExecuteInTransactionAsync(async () =>
            {
                var leave = await LoadAsync(id, cancellationToken);
                ConditionGuard.Ensure(leave.Status == LeaveRequestConstants.Pending, ErrorConstants.LeaveRequestMessage.NotPending);

                var shifts = InSlot(await _leaveRequestRepository.GetShiftsOnDateAsync(leave.StaffProfileId, leave.LeaveDate, cancellationToken), leave.Slot);
                ConditionGuard.ThrowIf(shifts.Any(HasStarted), ErrorConstants.LeaveRequestMessage.ShiftAlreadyStarted);
                var appointments = InShifts(
                    await _leaveRequestRepository.GetOpenAppointmentsOnDateAsync(leave.StaffProfileId, leave.LeaveDate, cancellationToken),
                    shifts);

                var now = DateTimeOffset.UtcNow;
                if (!string.IsNullOrWhiteSpace(request.SubstituteStaffUserId))
                {
                    var substitute = await ValidateSubstituteAsync(leave, request.SubstituteStaffUserId.Trim(), shifts, cancellationToken);

                    // The substitute takes the shifts and the patients booked in them
                    foreach (var shift in shifts)
                    {
                        shift.StaffProfileId = substitute.Id;
                        shift.Notes = AppendNote(shift.Notes, $"Thay ca cho {leave.StaffProfile.FullName} (đơn nghỉ #{leave.Id})");
                        shift.UpdatedAt = now;
                    }

                    foreach (var appointment in appointments)
                    {
                        appointment.DoctorId = substitute.Id;
                        appointment.UpdatedAt = now;
                    }

                    leave.SubstituteStaffProfileId = substitute.Id;
                    leave.SubstituteStaffProfile = substitute;
                }
                else
                {
                    // Without a substitute nobody can see the booked patients, so those must be moved first
                    ConditionGuard.ThrowIf(appointments.Count > 0, ErrorConstants.LeaveRequestMessage.SubstituteRequired);

                    foreach (var shift in shifts)
                    {
                        shift.IsPresent = false;
                        shift.AbsenceReason = $"Nghỉ phép: {leave.Reason}";
                        shift.UpdatedAt = now;
                    }
                }

                leave.Status = LeaveRequestConstants.Approved;
                leave.ReviewedByUserId = managerUserId;
                leave.ReviewedAt = now;
                leave.UpdatedAt = now;
                await _leaveRequestRepository.SaveChangesAsync(cancellationToken);
                return leave;
            }, cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.LeaveApproved, EntityType, leave.Id.ToString(),
                oldValues: new { Status = LeaveRequestConstants.Pending },
                newValues: new { leave.Status, leave.SubstituteStaffProfileId });

            return await ToResponseAsync(leave, withDetails: true, cancellationToken);
        }

        public async Task<LeaveRequestResponse> RejectAsync(
            string managerUserId,
            long id,
            RejectLeaveRequestRequest request,
            CancellationToken cancellationToken = default)
        {
            var reason = request.Reason?.Trim() ?? string.Empty;
            ConditionGuard.Ensure(reason.Length > 0, ErrorConstants.LeaveRequestMessage.RejectReasonRequired);

            var leave = await LoadAsync(id, cancellationToken);
            ConditionGuard.Ensure(leave.Status == LeaveRequestConstants.Pending, ErrorConstants.LeaveRequestMessage.NotPending);

            var now = DateTimeOffset.UtcNow;
            leave.Status = LeaveRequestConstants.Rejected;
            leave.RejectionReason = reason;
            leave.ReviewedByUserId = managerUserId;
            leave.ReviewedAt = now;
            leave.UpdatedAt = now;
            await _leaveRequestRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.LeaveRejected, EntityType, leave.Id.ToString(),
                oldValues: new { Status = LeaveRequestConstants.Pending },
                newValues: new { leave.Status, leave.RejectionReason });

            return await ToResponseAsync(leave, withDetails: false, cancellationToken);
        }

        private async Task<StaffProfile> ValidateSubstituteAsync(
            LeaveRequest leave,
            string substituteUserId,
            List<StaffSchedule> shifts,
            CancellationToken cancellationToken)
        {
            var substitute = await _staffRepository.GetByUserIdAsync(substituteUserId);
            ConditionGuard.Ensure<NotFoundException>(substitute is { IsActive: true }, ErrorConstants.LeaveRequestMessage.SubstituteNotFound);
            ConditionGuard.ThrowIf(substitute!.Id == leave.StaffProfileId, ErrorConstants.LeaveRequestMessage.SubstituteSamePerson);

            var roles = await _leaveRequestRepository.GetRolesAsync(new[] { leave.StaffProfile.UserId, substitute.UserId }, cancellationToken);
            roles.TryGetValue(leave.StaffProfile.UserId, out var requesterRole);
            roles.TryGetValue(substitute.UserId, out var substituteRole);
            ConditionGuard.Ensure(requesterRole == substituteRole, ErrorConstants.LeaveRequestMessage.SubstituteWrongRole);

            ConditionGuard.Ensure(
                await IsFreeAsync(substitute.Id, leave, shifts, cancellationToken),
                ErrorConstants.LeaveRequestMessage.SubstituteBusy);
            return substitute;
        }

        private async Task<List<SubstituteOption>> GetSubstituteOptionsAsync(LeaveRequest leave, CancellationToken cancellationToken)
        {
            var roles = await _leaveRequestRepository.GetRolesAsync(new[] { leave.StaffProfile.UserId }, cancellationToken);
            if (!roles.TryGetValue(leave.StaffProfile.UserId, out var role))
            {
                return new List<SubstituteOption>();
            }

            var shifts = InSlot(await _leaveRequestRepository.GetShiftsOnDateAsync(leave.StaffProfileId, leave.LeaveDate, cancellationToken), leave.Slot);
            var candidates = await _leaveRequestRepository.GetActiveStaffInRoleAsync(role, cancellationToken);

            var options = new List<SubstituteOption>();
            foreach (var candidate in candidates.Where(x => x.Id != leave.StaffProfileId))
            {
                if (await IsFreeAsync(candidate.Id, leave, shifts, cancellationToken))
                {
                    options.Add(new SubstituteOption { StaffUserId = candidate.UserId, FullName = candidate.FullName });
                }
            }

            return options;
        }

        // Free = no own shift overlapping any of the shifts to take over, and no leave in that time
        private async Task<bool> IsFreeAsync(int staffProfileId, LeaveRequest leave, List<StaffSchedule> shifts, CancellationToken cancellationToken)
        {
            foreach (var shift in shifts)
            {
                if (await _workShiftRepository.HasOverlapAsync(staffProfileId, shift.ScheduleDate, shift.ShiftStart, shift.ShiftEnd))
                {
                    return false;
                }
            }

            return !await _leaveRequestRepository.HasActiveOverlapAsync(staffProfileId, leave.LeaveDate, leave.Slot, null, cancellationToken);
        }

        private async Task<LeaveRequest> LoadAsync(long id, CancellationToken cancellationToken)
        {
            var leave = await _leaveRequestRepository.GetByIdAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(leave != null, ErrorConstants.LeaveRequestMessage.NotFound);
            return leave!;
        }

        private async Task<PagedResult<LeaveRequestResponse>> ToPageAsync(PagedResult<LeaveRequest> page, CancellationToken cancellationToken)
        {
            var roles = await _leaveRequestRepository.GetRolesAsync(page.Items.Select(x => x.StaffProfile.UserId), cancellationToken);
            return new PagedResult<LeaveRequestResponse>
            {
                Items = page.Items.Select(x => ToResponse(x, roles)).ToList(),
                TotalCount = page.TotalCount,
                PageNumber = page.PageNumber,
                PageSize = page.PageSize
            };
        }

        private async Task<LeaveRequestResponse> ToResponseAsync(LeaveRequest leave, bool withDetails, CancellationToken cancellationToken)
        {
            var roles = await _leaveRequestRepository.GetRolesAsync(new[] { leave.StaffProfile.UserId }, cancellationToken);
            var response = ToResponse(leave, roles);
            if (!withDetails)
            {
                return response;
            }

            // After approval with a substitute the shifts belong to the substitute, so look them up there
            var ownerId = leave.SubstituteStaffProfileId ?? leave.StaffProfileId;
            var shifts = InSlot(await _leaveRequestRepository.GetShiftsOnDateAsync(ownerId, leave.LeaveDate, cancellationToken), leave.Slot);
            var appointments = InShifts(await _leaveRequestRepository.GetOpenAppointmentsOnDateAsync(ownerId, leave.LeaveDate, cancellationToken), shifts);

            response.AffectedShifts = shifts.Select(x => new LeaveShiftItem
            {
                ShiftId = x.Id,
                ShiftStart = x.ShiftStart,
                ShiftEnd = x.ShiftEnd,
                RoomName = x.Room?.RoomName
            }).ToList();
            response.AffectedAppointments = appointments.Select(x => new LeaveAppointmentItem
            {
                Id = x.Id,
                Time = x.TimeSlotStart,
                PatientName = x.Patient.FullName,
                ServiceName = string.Join(", ", x.ServiceItems.Select(s => s.Service.ServiceName)),
                Status = x.Status
            }).ToList();
            return response;
        }

        private static LeaveRequestResponse ToResponse(LeaveRequest leave, IReadOnlyDictionary<string, string> roles) => new()
        {
            Id = leave.Id,
            StaffUserId = leave.StaffProfile.UserId,
            StaffName = leave.StaffProfile.FullName,
            StaffRole = roles.TryGetValue(leave.StaffProfile.UserId, out var role) ? role : null,
            LeaveDate = leave.LeaveDate,
            Slot = leave.Slot,
            Reason = leave.Reason,
            Status = leave.Status,
            SubstituteStaffUserId = leave.SubstituteStaffProfile?.UserId,
            SubstituteName = leave.SubstituteStaffProfile?.FullName,
            ReviewedAt = leave.ReviewedAt,
            RejectionReason = leave.RejectionReason,
            CreatedAt = leave.CreatedAt
        };

        public static string? NormalizeSlot(string? slot)
        {
            if (string.IsNullOrWhiteSpace(slot))
            {
                return null;
            }

            var match = LeaveRequestConstants.Slots.FirstOrDefault(x => string.Equals(x, slot.Trim(), StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(match != null, ErrorConstants.LeaveRequestMessage.SlotInvalid);
            return match;
        }

        private static List<StaffSchedule> InSlot(IEnumerable<StaffSchedule> shifts, string? slot) =>
            shifts.Where(x => slot == null || ScheduleViewService.SlotOf(x.ShiftStart) == slot).ToList();

        // Appointments whose time slot overlaps one of the shifts
        private static List<Appointment> InShifts(IEnumerable<Appointment> appointments, List<StaffSchedule> shifts) =>
            appointments.Where(a => a.TimeSlotStart.HasValue && a.TimeSlotEnd.HasValue
                && shifts.Any(s => a.TimeSlotStart < s.ShiftEnd && s.ShiftStart < a.TimeSlotEnd)).ToList();

        private static bool HasStarted(StaffSchedule shift) =>
            shift.ActualStartTime.HasValue || shift.ScheduleDate.ToDateTime(shift.ShiftStart) <= ClinicClock.Now;

        // Shift notes are at most 500 characters
        private static string AppendNote(string? notes, string line)
        {
            var text = string.IsNullOrWhiteSpace(notes) ? line : $"{notes}\n{line}";
            return text.Length <= 500 ? text : text[^500..];
        }
    }
}

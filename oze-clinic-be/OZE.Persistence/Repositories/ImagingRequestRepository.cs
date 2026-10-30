using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class ImagingRequestRepository : IImagingRequestRepository
    {
        private readonly AppIdentityDbContext _context;

        public ImagingRequestRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public Task<Examination?> GetExaminationAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            return _context.Examinations
                .AsNoTracking()
                .Include(x => x.Patient)
                .FirstOrDefaultAsync(x => x.Id == examinationId, cancellationToken);
        }

        public Task<List<ImagingRequest>> GetByExaminationIdAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            return _context.ImagingRequests
                .AsNoTracking()
                .Where(x => x.ExaminationId == examinationId)
                .OrderBy(x => x.CreatedAt)
                .ThenBy(x => x.Id)
                .ToListAsync(cancellationToken);
        }

        public Task<ImagingRequest?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return _context.ImagingRequests
                .AsNoTracking()
                .Include(x => x.Examination)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public Task<ImagingRequest?> GetTrackedByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return _context.ImagingRequests
                .Include(x => x.Examination)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public Task<List<ImagingRequest>> GetQueueAsync(CancellationToken cancellationToken = default)
        {
            return _context.ImagingRequests
                .AsNoTracking()
                .Include(x => x.Examination)
                    .ThenInclude(x => x.Patient)
                .Include(x => x.RequestedByDoctor)
                .Where(x => x.RequestStatus == ImagingRequestConstants.Pending
                    || x.RequestStatus == ImagingRequestConstants.InProgress)
                .OrderBy(x => x.CreatedAt)
                .ThenBy(x => x.Id)
                .ToListAsync(cancellationToken);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }

        public Task<List<string>> GetActiveTechnicianUserIdsAsync(CancellationToken cancellationToken = default)
        {
            return (
                from profile in _context.StaffProfiles.AsNoTracking()
                join userRole in _context.UserRoles on profile.UserId equals userRole.UserId
                join role in _context.Roles on userRole.RoleId equals role.Id
                where profile.IsActive && role.Name == RoleConstants.DentalImagingTechnicianRole
                select profile.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(
            ImagingRequest request,
            IReadOnlyCollection<string> technicianUserIds,
            string notificationTitle,
            string notificationMessage,
            CancellationToken cancellationToken = default)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            _context.ImagingRequests.Add(request);
            await _context.SaveChangesAsync(cancellationToken);

            var technicianIds = technicianUserIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .ToList();

            foreach (var technicianUserId in technicianIds)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = technicianUserId,
                    Title = notificationTitle,
                    Message = notificationMessage,
                    NotificationType = ImagingRequestConstants.NotificationTypeInApp,
                    Channel = ImagingRequestConstants.NotificationChannelInApp,
                    ReferenceType = ImagingRequestConstants.NotificationReferenceType,
                    ReferenceId = request.Id.ToString(),
                    IsRead = false,
                    SentAt = request.CreatedAt,
                    DeliveryStatus = ImagingRequestConstants.NotificationDeliverySent,
                    CreatedAt = request.CreatedAt
                });
            }

            if (technicianIds.Count > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }
    }
}

using System.ComponentModel.DataAnnotations;
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
    public interface IConsultationService
    {
        Task<ConsultationResponse> CreateAsync(CreateConsultationRequest request, CancellationToken cancellationToken = default);
        Task<PagedResult<ConsultationResponse>> GetPagedAsync(ConsultationQuery query, CancellationToken cancellationToken = default);
        Task<ConsultationResponse> HandleAsync(long id, string userId, HandleConsultationRequest request, CancellationToken cancellationToken = default);
    }

    // F-CRM-05: a visitor asks to be called back from the public site; the receptionist calls and records the outcome
    public class ConsultationService : IConsultationService
    {
        public const string New = "New";
        public const string Contacted = "Contacted";
        public const string Booked = "Booked";
        public const string Closed = "Closed";
        private static readonly string[] HandleStatuses = { Contacted, Booked, Closed };
        // The same phone cannot send another request while one sent in the last minutes is still new
        private const int RepeatMinutes = 10;

        private readonly IConsultationRepository _repository;
        private readonly ICareRepository _careRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService? _notifications;

        public ConsultationService(IConsultationRepository repository, ICareRepository careRepository, IAuditLogService auditLogService, INotificationService? notifications = null)
        {
            _repository = repository;
            _careRepository = careRepository;
            _auditLogService = auditLogService;
            _notifications = notifications;
        }

        public async Task<ConsultationResponse> CreateAsync(CreateConsultationRequest request, CancellationToken cancellationToken = default)
        {
            var name = request.FullName?.Trim() ?? string.Empty;
            ConditionGuard.Ensure(name.Length > 0, ErrorConstants.AuthMessage.FullNameRequired);
            ConditionGuard.Ensure(PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phone), ErrorConstants.AuthMessage.InvalidPhone);
            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            ConditionGuard.ThrowIf(email != null && !new EmailAddressAttribute().IsValid(email), ErrorConstants.AuthMessage.EmailInvalid);

            var recent = await _repository.HasRecentNewAsync(phone, DateTimeOffset.UtcNow.AddMinutes(-RepeatMinutes), cancellationToken);
            ConditionGuard.ThrowIf(recent, ErrorConstants.ConsultationMessage.AlreadySent);

            var entity = new ConsultationRequest
            {
                FullName = name,
                PhoneNumber = phone,
                Email = email,
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                Status = New,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await _repository.AddAsync(entity, cancellationToken);
            await _repository.SaveChangesAsync(cancellationToken);
            await NotifyAsync(n => n.NotifyRolesAsync(new[] { RoleConstants.ReceptionistRole },
                new NotificationContent(NotificationConstants.Text.NewConsultationTitle, string.Format(NotificationConstants.Text.NewConsultationMessage, entity.FullName, entity.PhoneNumber),
                    NotificationConstants.Reference.ConsultationRequest, entity.Id.ToString()), cancellationToken: cancellationToken));
            return ToResponse(entity, new Dictionary<string, string>());
        }


        // In-app notifications are optional so unit tests can build the service without them
        private Task NotifyAsync(Func<INotificationService, Task> send) => _notifications == null ? Task.CompletedTask : send(_notifications);

        public async Task<PagedResult<ConsultationResponse>> GetPagedAsync(ConsultationQuery query, CancellationToken cancellationToken = default)
        {
            var page = await _repository.GetPagedAsync(query, cancellationToken);
            var names = await _careRepository.GetStaffNamesAsync(page.Items.Select(x => x.HandledByUserId), cancellationToken);
            return new PagedResult<ConsultationResponse>
            {
                Items = page.Items.Select(x => ToResponse(x, names)).ToList(),
                TotalCount = page.TotalCount,
                PageNumber = page.PageNumber,
                PageSize = page.PageSize
            };
        }

        public async Task<ConsultationResponse> HandleAsync(long id, string userId, HandleConsultationRequest request, CancellationToken cancellationToken = default)
        {
            var entity = await _repository.GetByIdAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(entity != null, ErrorConstants.ConsultationMessage.NotFound);
            var status = HandleStatuses.FirstOrDefault(x => string.Equals(x, request.Status?.Trim(), StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(status != null, ErrorConstants.ConsultationMessage.StatusInvalid);

            var old = entity!.Status;
            entity.Status = status!;
            entity.HandleNote = string.IsNullOrWhiteSpace(request.Note) ? entity.HandleNote : request.Note.Trim();
            entity.HandledByUserId = userId;
            entity.HandledAt = DateTimeOffset.UtcNow;
            await _repository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.ConsultationHandled, AuditConstants.ConsultationEntity, entity.Id.ToString(),
                oldValues: new { Status = old }, newValues: new { entity.Status, entity.HandleNote });

            var names = await _careRepository.GetStaffNamesAsync(new[] { userId }, cancellationToken);
            return ToResponse(entity, names);
        }

        private static ConsultationResponse ToResponse(ConsultationRequest x, IReadOnlyDictionary<string, string> names) => new()
        {
            Id = x.Id,
            FullName = x.FullName,
            PhoneNumber = x.PhoneNumber,
            Email = x.Email,
            Note = x.Note,
            Status = x.Status,
            HandledByName = x.HandledByUserId == null ? null : names.GetValueOrDefault(x.HandledByUserId),
            HandledAt = x.HandledAt,
            HandleNote = x.HandleNote,
            CreatedAt = x.CreatedAt
        };
    }
}

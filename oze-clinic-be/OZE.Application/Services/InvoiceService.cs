using System.Security.Cryptography;
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
    public class InvoiceService : IInvoiceService
    {
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IPatientRepository _patientRepository;
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly ITreatmentPlanRepository _treatmentPlanRepository;
        private readonly IServiceRepository _serviceRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService? _notifications;

        public InvoiceService(
            IInvoiceRepository invoiceRepository,
            IPatientRepository patientRepository,
            IAppointmentRepository appointmentRepository,
            ITreatmentPlanRepository treatmentPlanRepository,
            IServiceRepository serviceRepository,
            IAuditLogService auditLogService,
            INotificationService? notifications = null)
        {
            _invoiceRepository = invoiceRepository;
            _patientRepository = patientRepository;
            _appointmentRepository = appointmentRepository;
            _treatmentPlanRepository = treatmentPlanRepository;
            _serviceRepository = serviceRepository;
            _auditLogService = auditLogService;
            _notifications = notifications;
        }

        public async Task<InvoiceResponse> CreateAsync(
            string createdByUserId,
            CreateInvoiceRequest request,
            CancellationToken cancellationToken = default)
        {
            ConditionGuard.Ensure(request.PatientId > 0, ErrorConstants.InvoiceMessage.PatientRequired);
            var itemRequests = request.Items ?? new List<CreateInvoiceItemRequest>();
            ConditionGuard.Ensure(request.DiscountAmount >= 0, ErrorConstants.InvoiceMessage.DiscountInvalid);

            var patient = await _patientRepository.GetByIdAsync(request.PatientId, asNoTracking: true, cancellationToken: cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(patient != null, ErrorConstants.InvoiceMessage.PatientNotFound);

            if (request.AppointmentId.HasValue)
            {
                var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(request.AppointmentId.Value, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(appointment != null, ErrorConstants.InvoiceMessage.AppointmentNotFound);
                ConditionGuard.Ensure(appointment!.PatientId == request.PatientId, ErrorConstants.InvoiceMessage.AppointmentPatientMismatch);
                ConditionGuard.ThrowIf(
                    await _invoiceRepository.HasOpenInvoiceForAppointmentAsync(request.AppointmentId.Value, cancellationToken),
                    ErrorConstants.InvoiceMessage.OpenInvoiceExistsForAppointment);
            }

            TreatmentPlan? treatmentPlan = null;
            if (request.TreatmentPlanId.HasValue)
            {
                treatmentPlan = await _treatmentPlanRepository.GetByIdWithStagesAsync(request.TreatmentPlanId.Value, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(treatmentPlan != null, ErrorConstants.InvoiceMessage.TreatmentPlanNotFound);
                ConditionGuard.Ensure(treatmentPlan!.PatientId == request.PatientId, ErrorConstants.InvoiceMessage.TreatmentPlanPatientMismatch);
                ConditionGuard.ThrowIf(
                    await _invoiceRepository.HasOpenInvoiceForTreatmentPlanAsync(request.TreatmentPlanId.Value, cancellationToken),
                    ErrorConstants.InvoiceMessage.OpenInvoiceExistsForTreatmentPlan);
            }

            // Open-P4: plan invoice may omit items → single synthetic package line from TotalAmount or EstimatedTotalCost.
            List<InvoiceItem> items;
            decimal totalAmount;
            if (itemRequests.Count == 0)
            {
                ConditionGuard.Ensure(
                    treatmentPlan != null,
                    request.TotalAmount.HasValue
                        ? ErrorConstants.InvoiceMessage.PlanPackageRequiresTreatmentPlan
                        : ErrorConstants.InvoiceMessage.ItemsRequired);
                (items, totalAmount) = BuildPlanPackageItem(treatmentPlan!, request.TotalAmount);
            }
            else
            {
                (items, totalAmount) = await BuildItemsAsync(itemRequests, treatmentPlan, cancellationToken);
            }

            var discountAmount = decimal.Round(request.DiscountAmount, 2, MidpointRounding.AwayFromZero);
            ConditionGuard.Ensure(discountAmount <= totalAmount, ErrorConstants.InvoiceMessage.DiscountExceedsTotal);
            var finalAmount = decimal.Round(totalAmount - discountAmount, 2, MidpointRounding.AwayFromZero);

            var invoice = new Invoice
            {
                InvoiceNumber = await GenerateUniqueInvoiceNumberAsync(cancellationToken),
                PatientId = request.PatientId,
                AppointmentId = request.AppointmentId,
                TreatmentPlanId = request.TreatmentPlanId,
                TotalAmount = totalAmount,
                DiscountAmount = discountAmount,
                FinalAmount = finalAmount,
                PaidAmount = 0m,
                PaymentStatus = InvoiceConstants.Unpaid,
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedByUserId = string.IsNullOrWhiteSpace(createdByUserId) ? null : createdByUserId,
                Items = items
            };

            await _invoiceRepository.AddAsync(invoice, cancellationToken);
            await _invoiceRepository.SaveChangesAsync(cancellationToken);

            await SafeAuditAsync(
                AuditConstants.InvoiceCreated,
                invoice.Id.ToString(),
                null,
                new { invoice.InvoiceNumber, invoice.PatientId, invoice.FinalAmount, invoice.PaymentStatus });
            await NotifyAsync(n => n.NotifyPatientAsync(invoice.PatientId,
                new NotificationContent(NotificationConstants.Text.InvoiceCreatedTitle, string.Format(NotificationConstants.Text.InvoiceCreatedMessage, invoice.InvoiceNumber, NotificationFormat.Money(invoice.FinalAmount)),
                    NotificationConstants.Reference.Invoice, invoice.Id.ToString()), cancellationToken));

            return ToResponse(invoice, patient?.FullName);
        }


        // In-app notifications are optional so unit tests can build the service without them
        private Task NotifyAsync(Func<INotificationService, Task> send) => _notifications == null ? Task.CompletedTask : send(_notifications);

        public async Task<InvoiceResponse> GetByIdAsync(
            long id,
            string? ownerUserId,
            CancellationToken cancellationToken = default)
        {
            var invoice = await _invoiceRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(invoice != null, ErrorConstants.InvoiceMessage.InvoiceNotFound);
            await EnsureOwnedByAsync(invoice!, ownerUserId, cancellationToken);
            return ToResponse(invoice!);
        }

        public async Task<PagedResult<InvoiceSummaryResponse>> GetPagedAsync(
            InvoiceQueryParameters parameters,
            CancellationToken cancellationToken = default)
        {
            var page = await _invoiceRepository.GetPagedAsync(parameters, cancellationToken);
            var items = page.Items.Select(ToSummary).ToList();
            return new PagedResult<InvoiceSummaryResponse>(items, page.TotalCount, page.PageNumber, page.PageSize);
        }

        public async Task<PagedResult<InvoiceSummaryResponse>> GetMyInvoicesAsync(
            InvoiceQueryParameters parameters,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var patient = await _patientRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(patient != null, ErrorConstants.InvoiceMessage.PatientNotFound);

            parameters.PatientId = patient!.Id;
            return await GetPagedAsync(parameters, cancellationToken);
        }

        public async Task<InvoiceResponse> UpdateAsync(
            long id,
            string updatedByUserId,
            UpdateInvoiceRequest request,
            CancellationToken cancellationToken = default)
        {
            var invoice = await _invoiceRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(invoice != null, ErrorConstants.InvoiceMessage.InvoiceNotFound);
            ConditionGuard.ThrowIf(
                invoice!.PaymentStatus == InvoiceConstants.Cancelled,
                ErrorConstants.InvoiceMessage.InvoiceNotUpdatable);

            ConditionGuard.ThrowIf(
                HasConfirmedPayment(invoice),
                ErrorConstants.InvoiceMessage.InvoiceNotUpdatable);

            ConditionGuard.Ensure(
                request.Notes != null || request.DiscountAmount.HasValue || request.Items != null,
                ErrorConstants.InvoiceMessage.InvoiceUpdateEmpty);

            var oldSnapshot = new
            {
                invoice.DiscountAmount,
                invoice.Notes,
                invoice.FinalAmount,
                invoice.TotalAmount,
                ItemCount = invoice.Items.Count
            };

            if (request.Notes != null)
            {
                invoice.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
            }

            if (request.Items != null)
            {
                TreatmentPlan? treatmentPlan = null;
                if (invoice.TreatmentPlanId.HasValue)
                {
                    treatmentPlan = await _treatmentPlanRepository.GetByIdWithStagesAsync(invoice.TreatmentPlanId.Value, cancellationToken);
                }

                var (items, totalAmount) = await BuildItemsAsync(request.Items, treatmentPlan, cancellationToken);
                invoice.Items.Clear();
                foreach (var item in items)
                {
                    invoice.Items.Add(item);
                }

                invoice.TotalAmount = totalAmount;
                var discount = request.DiscountAmount.HasValue
                    ? decimal.Round(request.DiscountAmount.Value, 2, MidpointRounding.AwayFromZero)
                    : invoice.DiscountAmount;
                ConditionGuard.Ensure(discount >= 0, ErrorConstants.InvoiceMessage.DiscountInvalid);
                ConditionGuard.Ensure(discount <= totalAmount, ErrorConstants.InvoiceMessage.DiscountExceedsTotal);
                invoice.DiscountAmount = discount;
                invoice.FinalAmount = decimal.Round(totalAmount - discount, 2, MidpointRounding.AwayFromZero);
            }
            else if (request.DiscountAmount.HasValue)
            {
                var discount = decimal.Round(request.DiscountAmount.Value, 2, MidpointRounding.AwayFromZero);
                ConditionGuard.Ensure(discount >= 0, ErrorConstants.InvoiceMessage.DiscountInvalid);
                ConditionGuard.Ensure(discount <= invoice.TotalAmount, ErrorConstants.InvoiceMessage.DiscountExceedsTotal);
                invoice.DiscountAmount = discount;
                invoice.FinalAmount = decimal.Round(invoice.TotalAmount - discount, 2, MidpointRounding.AwayFromZero);
            }

            invoice.UpdatedAt = DateTimeOffset.UtcNow;
            _invoiceRepository.Update(invoice);
            await _invoiceRepository.SaveChangesAsync(cancellationToken);

            await SafeAuditAsync(
                AuditConstants.InvoiceUpdated,
                invoice.Id.ToString(),
                oldSnapshot,
                new { invoice.DiscountAmount, invoice.Notes, invoice.FinalAmount, invoice.TotalAmount, ItemCount = invoice.Items.Count, updatedByUserId });

            return ToResponse(invoice);
        }

        public async Task<InvoiceResponse> CancelAsync(
            long id,
            string cancelledByUserId,
            CancellationToken cancellationToken = default)
        {
            var invoice = await _invoiceRepository.GetByIdWithDetailsAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(invoice != null, ErrorConstants.InvoiceMessage.InvoiceNotFound);
            ConditionGuard.ThrowIf(
                invoice!.PaymentStatus == InvoiceConstants.Cancelled,
                ErrorConstants.InvoiceMessage.InvoiceAlreadyCancelled);

            // AD-7 (P2): block only when a CONFIRMED payment exists
            ConditionGuard.ThrowIf(
                HasConfirmedPayment(invoice),
                ErrorConstants.InvoiceMessage.InvoiceNotCancellable);

            foreach (var payment in invoice.Payments.Where(p => p.PaymentStatus == PaymentConstants.Pending))
            {
                payment.PaymentStatus = PaymentConstants.Failed;
            }

            invoice.PaymentStatus = InvoiceConstants.Cancelled;
            invoice.CancelledAt = DateTimeOffset.UtcNow;
            invoice.UpdatedAt = DateTimeOffset.UtcNow;

            _invoiceRepository.Update(invoice);
            await _invoiceRepository.SaveChangesAsync(cancellationToken);

            await SafeAuditAsync(
                AuditConstants.InvoiceCancelled,
                invoice.Id.ToString(),
                null,
                new { invoice.InvoiceNumber, cancelledByUserId, invoice.CancelledAt });

            return ToResponse(invoice);
        }

        /// <summary>
        /// Open-P4 package line for HĐ tổng buổi đầu when receptionist skips itemization.
        /// </summary>
        private static (List<InvoiceItem> Items, decimal TotalAmount) BuildPlanPackageItem(
            TreatmentPlan treatmentPlan,
            decimal? requestedTotalAmount)
        {
            decimal packageTotal;
            if (requestedTotalAmount.HasValue)
            {
                packageTotal = decimal.Round(requestedTotalAmount.Value, 2, MidpointRounding.AwayFromZero);
                ConditionGuard.Ensure(packageTotal > 0, ErrorConstants.InvoiceMessage.PlanPackageTotalInvalid);
            }
            else
            {
                packageTotal = decimal.Round(treatmentPlan.EstimatedTotalCost, 2, MidpointRounding.AwayFromZero);
                ConditionGuard.Ensure(packageTotal > 0, ErrorConstants.InvoiceMessage.PlanPackageTotalRequired);
            }

            var serviceName = string.IsNullOrWhiteSpace(treatmentPlan.PlanName)
                ? "Gói điều trị"
                : treatmentPlan.PlanName.Trim();

            var item = new InvoiceItem
            {
                ServiceId = null,
                ServiceName = serviceName,
                Description = "Tổng gói điều trị",
                UnitPrice = packageTotal,
                Quantity = 1,
                Amount = packageTotal,
                TreatmentPlanStageId = null,
                SortOrder = 0
            };

            return (new List<InvoiceItem> { item }, packageTotal);
        }

        private async Task<(List<InvoiceItem> Items, decimal TotalAmount)> BuildItemsAsync(
            List<CreateInvoiceItemRequest> itemRequests,
            TreatmentPlan? treatmentPlan,
            CancellationToken cancellationToken)
        {
            ConditionGuard.Ensure(itemRequests.Count > 0, ErrorConstants.InvoiceMessage.ItemsRequired);

            var items = new List<InvoiceItem>();
            decimal totalAmount = 0m;
            for (var i = 0; i < itemRequests.Count; i++)
            {
                var itemRequest = itemRequests[i];
                ConditionGuard.Ensure(itemRequest.Quantity > 0, ErrorConstants.InvoiceMessage.QuantityInvalid);

                string serviceName;
                decimal unitPrice;

                if (itemRequest.ServiceId.HasValue)
                {
                    var service = await _serviceRepository.GetByIdAsync(itemRequest.ServiceId.Value, asNoTracking: true, cancellationToken);
                    ConditionGuard.Ensure<NotFoundException>(service != null, ErrorConstants.InvoiceMessage.ServiceNotFound);
                    serviceName = string.IsNullOrWhiteSpace(itemRequest.ServiceName)
                        ? service!.ServiceName
                        : itemRequest.ServiceName.Trim();
                    unitPrice = itemRequest.UnitPrice ?? service!.ReferencePrice;
                }
                else
                {
                    ConditionGuard.Ensure(!string.IsNullOrWhiteSpace(itemRequest.ServiceName), ErrorConstants.InvoiceMessage.ServiceNameRequired);
                    serviceName = itemRequest.ServiceName!.Trim();
                    ConditionGuard.Ensure(itemRequest.UnitPrice.HasValue, ErrorConstants.InvoiceMessage.UnitPriceInvalid);
                    unitPrice = itemRequest.UnitPrice!.Value;
                }

                ConditionGuard.Ensure(unitPrice >= 0, ErrorConstants.InvoiceMessage.UnitPriceInvalid);
                ConditionGuard.Ensure(!string.IsNullOrWhiteSpace(serviceName), ErrorConstants.InvoiceMessage.ServiceNameRequired);

                if (itemRequest.TreatmentPlanStageId.HasValue)
                {
                    ConditionGuard.Ensure(treatmentPlan != null, ErrorConstants.InvoiceMessage.TreatmentPlanNotFound);
                    var stage = treatmentPlan!.Stages.FirstOrDefault(s => s.Id == itemRequest.TreatmentPlanStageId.Value);
                    ConditionGuard.Ensure<NotFoundException>(stage != null, ErrorConstants.InvoiceMessage.StageNotFound);
                    ConditionGuard.Ensure(
                        stage!.TreatmentPlanId == treatmentPlan.Id,
                        ErrorConstants.InvoiceMessage.StagePlanMismatch);
                }

                var amount = decimal.Round(unitPrice * itemRequest.Quantity, 2, MidpointRounding.AwayFromZero);
                totalAmount += amount;

                items.Add(new InvoiceItem
                {
                    ServiceId = itemRequest.ServiceId,
                    ServiceName = serviceName,
                    Description = string.IsNullOrWhiteSpace(itemRequest.Description) ? null : itemRequest.Description.Trim(),
                    UnitPrice = unitPrice,
                    Quantity = itemRequest.Quantity,
                    Amount = amount,
                    TreatmentPlanStageId = itemRequest.TreatmentPlanStageId,
                    SortOrder = itemRequest.SortOrder ?? i
                });
            }

            totalAmount = decimal.Round(totalAmount, 2, MidpointRounding.AwayFromZero);
            return (items, totalAmount);
        }

        private async Task EnsureOwnedByAsync(Invoice invoice, string? ownerUserId, CancellationToken cancellationToken)
        {
            if (ownerUserId is null)
            {
                return;
            }

            var patient = await _patientRepository.GetByUserIdAsync(ownerUserId);
            ConditionGuard.Ensure<ForbiddenException>(
                patient != null && patient.Id == invoice.PatientId,
                ErrorConstants.InvoiceMessage.AccessDenied);
        }

        private static bool HasConfirmedPayment(Invoice invoice) =>
            invoice.Payments.Any(p => p.PaymentStatus == PaymentConstants.Confirmed);

        private async Task SafeAuditAsync(string action, string entityId, object? oldValues, object? newValues)
        {
            try
            {
                await _auditLogService.LogAsync(action, AuditConstants.InvoiceEntity, entityId, oldValues, newValues);
            }
            catch
            {
                // Audit must never fail the business operation (ARCHITECTURE-SPINE).
            }
        }

        private async Task<string> GenerateUniqueInvoiceNumberAsync(CancellationToken cancellationToken)
        {
            for (var attempt = 0; attempt < 10; attempt++)
            {
                var number = $"{InvoiceConstants.NumberPrefix}-{DateTime.UtcNow:yyMMdd}-{RandomNumberGenerator.GetInt32(0, 1_000_000):D6}";
                if (!await _invoiceRepository.ExistsByNumberAsync(number, cancellationToken))
                {
                    return number;
                }
            }

            throw new BadRequestException("Could not generate a unique invoice number. Please try again.");
        }

        private static InvoiceSummaryResponse ToSummary(Invoice invoice)
        {
            var remaining = Math.Max(0m, invoice.FinalAmount - invoice.PaidAmount);
            return new InvoiceSummaryResponse
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                PatientId = invoice.PatientId,
                PatientName = invoice.Patient?.FullName,
                AppointmentId = invoice.AppointmentId,
                TreatmentPlanId = invoice.TreatmentPlanId,
                TotalAmount = invoice.TotalAmount,
                DiscountAmount = invoice.DiscountAmount,
                FinalAmount = invoice.FinalAmount,
                PaidAmount = invoice.PaidAmount,
                RemainingAmount = remaining,
                PaymentStatus = invoice.PaymentStatus,
                CreatedAt = invoice.CreatedAt,
                CancelledAt = invoice.CancelledAt
            };
        }

        private static InvoiceResponse ToResponse(Invoice invoice, string? patientName = null)
        {
            var remaining = Math.Max(0m, invoice.FinalAmount - invoice.PaidAmount);
            return new InvoiceResponse
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                PatientId = invoice.PatientId,
                PatientName = patientName ?? invoice.Patient?.FullName,
                AppointmentId = invoice.AppointmentId,
                TreatmentPlanId = invoice.TreatmentPlanId,
                TotalAmount = invoice.TotalAmount,
                DiscountAmount = invoice.DiscountAmount,
                FinalAmount = invoice.FinalAmount,
                PaidAmount = invoice.PaidAmount,
                RemainingAmount = remaining,
                PaymentStatus = invoice.PaymentStatus,
                Notes = invoice.Notes,
                CreatedAt = invoice.CreatedAt,
                CreatedByUserId = invoice.CreatedByUserId,
                CancelledAt = invoice.CancelledAt,
                Items = invoice.Items
                    .OrderBy(x => x.SortOrder)
                    .Select(x => new InvoiceItemResponse
                    {
                        Id = x.Id,
                        ServiceId = x.ServiceId,
                        ServiceName = x.ServiceName,
                        Description = x.Description,
                        UnitPrice = x.UnitPrice,
                        Quantity = x.Quantity,
                        Amount = x.Amount,
                        TreatmentPlanStageId = x.TreatmentPlanStageId,
                        SortOrder = x.SortOrder
                    })
                    .ToList(),
                Payments = invoice.Payments
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new InvoicePaymentSummaryResponse
                    {
                        Id = x.Id,
                        Amount = x.Amount,
                        PaymentMethod = x.PaymentMethod,
                        PaymentStatus = x.PaymentStatus,
                        Purpose = x.Purpose,
                        TransactionReference = x.TransactionReference,
                        CreatedAt = x.CreatedAt,
                        PaidAt = x.PaidAt
                    })
                    .ToList()
            };
        }
    }
}

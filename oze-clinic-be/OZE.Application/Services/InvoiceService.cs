using System.Security.Cryptography;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
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

        public InvoiceService(
            IInvoiceRepository invoiceRepository,
            IPatientRepository patientRepository,
            IAppointmentRepository appointmentRepository,
            ITreatmentPlanRepository treatmentPlanRepository,
            IServiceRepository serviceRepository)
        {
            _invoiceRepository = invoiceRepository;
            _patientRepository = patientRepository;
            _appointmentRepository = appointmentRepository;
            _treatmentPlanRepository = treatmentPlanRepository;
            _serviceRepository = serviceRepository;
        }

        public async Task<InvoiceResponse> CreateAsync(
            string createdByUserId,
            CreateInvoiceRequest request,
            CancellationToken cancellationToken = default)
        {
            ConditionGuard.Ensure(request.PatientId > 0, ErrorConstants.InvoiceMessage.PatientRequired);
            var itemRequests = request.Items ?? new List<CreateInvoiceItemRequest>();
            ConditionGuard.Ensure(itemRequests.Count > 0, ErrorConstants.InvoiceMessage.ItemsRequired);
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
            }

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

            return ToResponse(invoice);
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

        private static InvoiceResponse ToResponse(Invoice invoice)
        {
            return new InvoiceResponse
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                PatientId = invoice.PatientId,
                AppointmentId = invoice.AppointmentId,
                TreatmentPlanId = invoice.TreatmentPlanId,
                TotalAmount = invoice.TotalAmount,
                DiscountAmount = invoice.DiscountAmount,
                FinalAmount = invoice.FinalAmount,
                PaidAmount = invoice.PaidAmount,
                PaymentStatus = invoice.PaymentStatus,
                Notes = invoice.Notes,
                CreatedAt = invoice.CreatedAt,
                CreatedByUserId = invoice.CreatedByUserId,
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
                    .ToList()
            };
        }
    }
}

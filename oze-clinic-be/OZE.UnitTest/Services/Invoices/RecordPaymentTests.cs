using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Invoices
{
    // OZ-INV-03 CreatePayment (thu tiền)
    [Trait("Tab", "OZ-INV-03")]
    public class RecordPaymentTests
    {
        private readonly Mock<IPaymentRepository> _paymentRepo = new();
        private readonly Mock<IInvoiceRepository> _invoiceRepo = new();
        private readonly PaymentService _service;
        private readonly Invoice _invoice = new()
        {
            Id = 9,
            InvoiceNumber = "INV-9",
            TotalAmount = 400_000m,
            FinalAmount = 400_000m,
            PaymentStatus = InvoiceConstants.Unpaid
        };

        public RecordPaymentTests()
        {
            _service = new PaymentService(_paymentRepo.Object, _invoiceRepo.Object, new Mock<IAuditLogService>().Object);
            _invoiceRepo.Setup(r => r.GetByIdWithDetailsAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync(_invoice);
            _paymentRepo.Setup(r => r.ExecuteInTransactionAsync(It.IsAny<Func<Task<PaymentResponse>>>(), It.IsAny<CancellationToken>()))
                        .Returns((Func<Task<PaymentResponse>> action, CancellationToken _) => action());
            // Like EF Core: adding a payment of a tracked invoice also puts it in invoice.Payments
            _paymentRepo.Setup(r => r.AddAsync(It.IsAny<Payment>(), It.IsAny<CancellationToken>()))
                        .Callback<Payment, CancellationToken>((p, _) => _invoice.Payments.Add(p));
        }

        // UTCID01 (N): one cash payment counts once, even when EF already attached it to the invoice
        [Fact]
        public async Task CashPayment_CountsOnce()
        {
            var result = await _service.RecordAsync(9, "lt", new RecordPaymentRequest { Amount = 200_000m, PaymentMethod = PaymentConstants.Cash });

            _invoice.Payments.Should().HaveCount(1);
            _invoice.PaidAmount.Should().Be(200_000m);
            _invoice.PaymentStatus.Should().Be(InvoiceConstants.PartiallyPaid);
            result.InvoiceRemainingAmount.Should().Be(200_000m);
        }

        // UTCID02 (N): a duplicated entry in the collection is still summed once
        [Fact]
        public void Recalculate_IgnoresDuplicateEntries()
        {
            var payment = new Payment { Amount = 400_000m, PaymentStatus = PaymentConstants.Confirmed };
            _invoice.Payments.Add(payment);
            _invoice.Payments.Add(payment);

            InvoiceMoneyHelper.Recalculate(_invoice);

            _invoice.PaidAmount.Should().Be(400_000m);
            _invoice.PaymentStatus.Should().Be(InvoiceConstants.Paid);
        }
    }
}

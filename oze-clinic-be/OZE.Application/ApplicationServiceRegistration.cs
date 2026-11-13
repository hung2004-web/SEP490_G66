using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Models;

namespace OZE.Application
{
    public static class ApplicationServiceRegistration
    {
        public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
        {
            // Configure Options
            services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
            services.Configure<AuthMessageSenderOptions>(configuration.GetSection("AuthMessageSenderOptions"));
            services.Configure<AuthSmsSenderOptions>(configuration.GetSection("AuthSmsSenderOptions"));
            services.Configure<RegisterOtpSettings>(configuration.GetSection("RegisterOtpSettings"));
            services.Configure<FollowUpReminderSettings>(configuration.GetSection("FollowUpReminderSettings"));
            services.Configure<PaymentReminderSettings>(configuration.GetSection("PaymentReminderSettings"));

            services.AddMemoryCache();

            // Shared cache for OTP sessions, OTP send counts, signed-out tokens and the active service list.
            // Redis when ConnectionStrings:Redis is set (survives a restart); the server's memory otherwise,
            // so a machine without Redis still runs.
            var redisConnection = configuration.GetConnectionString("Redis");
            if (!string.IsNullOrWhiteSpace(redisConnection))
            {
                services.AddStackExchangeRedisCache(options =>
                {
                    options.Configuration = redisConnection;
                    options.InstanceName = "oze:";
                });
            }
            else
            {
                services.AddDistributedMemoryCache();
            }
            services.AddAutoMapper(typeof(OZE.Application.MappingProfiles.BaseMappingObject).Assembly);

            // Register Services
            services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddSingleton<IOtpSendLimiter, OtpSendLimiter>();
            services.AddSingleton<IAccessTokenRevocationStore, AccessTokenRevocationStore>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IClinicServiceService, ClinicServiceService>();
            services.AddScoped<IRoomService, RoomService>();
            services.AddScoped<IStaffService, StaffService>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped<IEmailSender, EmailSender>();
            services.AddScoped<IHomeService, HomeService>();
            services.AddScoped<ISmsSender, SmsSender>();
            services.AddScoped<IWorkShipService, WorkShiftService>();
            services.AddScoped<ITreatmentPlanService, TreatmentPlanService>();
            services.AddSingleton<IPendingRegistrationStore, PendingRegistrationStore>();
            services.AddSingleton<IPendingProfileUpdateStore, PendingProfileUpdateStore>();
            services.AddSingleton<IPasswordResetStore, PasswordResetStore>();
            services.AddScoped<IAppointmentService, AppointmentService>();
            services.AddScoped<IPatientService, PatientService>();
            services.AddScoped<IDoctorScheduleService, DoctorScheduleService>();
            services.AddScoped<IMedicalRecordService, MedicalRecordService>();
            services.AddScoped<IImagingRequestService, ImagingRequestService>();
            services.AddScoped<IExaminationService, ExaminationService>();
            services.AddScoped<IQueueService, QueueService>();
            services.AddScoped<IInvoiceService, InvoiceService>();
            services.AddScoped<IPaymentService, PaymentService>();
            services.AddScoped<IRefundService, RefundService>();
            services.AddScoped<IInstallmentService, InstallmentService>();
            services.AddScoped<IInvoiceReportService, InvoiceReportService>();
            services.AddScoped<IScheduleViewService, ScheduleViewService>();
            services.AddScoped<ILeaveRequestService, LeaveRequestService>();
            services.AddScoped<ICashSessionService, CashSessionService>();
            services.AddScoped<IFollowUpCareService, FollowUpCareService>();
            services.AddScoped<IDebtService, DebtService>();
            services.AddScoped<IReconciliationService, ReconciliationService>();
            services.AddScoped<IConsultationService, ConsultationService>();
            // The audit log reads the signed-in user, IP address and browser from the current request
            services.AddHttpContextAccessor();
            services.AddScoped<IAuditLogService, AuditLogService>();
            services.AddHostedService<OZE.Application.BackgroundServices.FollowUpReminderBackgroundService>();
            services.AddHostedService<OZE.Application.BackgroundServices.PaymentReminderBackgroundService>();
            return services;
        }
    }
}

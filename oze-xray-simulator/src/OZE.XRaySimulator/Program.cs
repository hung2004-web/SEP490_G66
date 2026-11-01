using Microsoft.OpenApi.Models;
using OZE.XRaySimulator.Api.Auth;
using OZE.XRaySimulator.Application;
using OZE.XRaySimulator.Infrastructure;
using OZE.XRaySimulator.Infrastructure.Options;

var builder = WebApplication.CreateBuilder(args);

// Configuration Options
builder.Services.Configure<SimulatorOptions>(builder.Configuration.GetSection(SimulatorOptions.SectionName));
builder.Services.Configure<WebhookOptions>(builder.Configuration.GetSection(WebhookOptions.SectionName));

// Framework Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();
builder.Services.AddHttpClient<IWebhookClient, WebhookClient>();

// Swagger with X-Api-Key Header Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "OZE Dental X-Ray Simulator API",
        Version = "v1",
        Description = "Software-based Dental X-ray Simulator Service for OZE Dental Clinic demonstration & testing."
    });

    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Description = "Service-to-service API Key in request header. Example: 'oze-xray-sim-secret-key-2026'",
        Name = "X-Api-Key",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "ApiKeyScheme"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                },
                Scheme = "ApiKeyScheme",
                Name = "X-Api-Key",
                In = ParameterLocation.Header
            },
            Array.Empty<string>()
        }
    });
});

// Application & Infrastructure Services
builder.Services.AddSingleton<ISessionStore, SessionStore>();
builder.Services.AddSingleton<IDeviceManager, DeviceManager>();
builder.Services.AddSingleton<IFaultInjector, FaultInjector>();
builder.Services.AddSingleton<ISampleImageProvider, SampleImageProvider>();

builder.Services.AddSingleton<CaptureOrchestrator>();
builder.Services.AddSingleton<ICaptureJobQueue>(sp => sp.GetRequiredService<CaptureOrchestrator>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<CaptureOrchestrator>());

builder.Services.AddScoped<IAcquisitionService, AcquisitionService>();
builder.Services.AddScoped<ICaptureService, CaptureService>();

builder.Services.AddHostedService<StartupInitializer>();

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "OZE X-Ray Simulator API v1");
    c.RoutePrefix = "swagger";
});

app.UseMiddleware<ApiKeyMiddleware>();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// For WebApplicationFactory in integration tests
public partial class Program { }

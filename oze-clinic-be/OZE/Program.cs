    using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OZE.Application;
using OZE.Common.Models;
using OZE.Persistence;
using OZE.Persistence.DbContexts;
using OZE.Persistence.Seed;
using OZE.ProjectBase.Middlewares;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using OZE.Common.Constants;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Services
// Keep the "Async" suffix in action names, so CreatedAtAction(nameof(GetXxxAsync)) finds the action
builder.Services.AddControllers(options => options.SuppressAsyncSuffixInActionNames = false);
builder.Services.AddEndpointsApiExplorer();

// 2. Add Clean Architecture Layers
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddApplication(builder.Configuration);

// 3. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 4. Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>() ?? new JwtSettings();
// No built-in fallback key: a missing key must stop the start, not silently sign tokens with a public value
if (string.IsNullOrWhiteSpace(jwtSettings.Key))
{
    throw new InvalidOperationException("JwtSettings:Key is not configured");
}
var keyBytes = Encoding.UTF8.GetBytes(jwtSettings.Key);
builder.Services.AddDbContext<AppIdentityDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ClockSkew = TimeSpan.Zero
    };
    // A token is refused once the account changed under it: logout, password change or reset, role change, account locked
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.Principal?.FindFirstValue("sub");
            var stamp = context.Principal?.FindFirstValue(SecurityConstants.SecurityStampClaim);
            var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
            var user = string.IsNullOrEmpty(userId) ? null : await userManager.FindByIdAsync(userId);
            var tokenId = context.Principal?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti);
            var revoked = tokenId != null && context.HttpContext.RequestServices.GetRequiredService<OZE.Application.Interfaces.IAccessTokenRevocationStore>().IsRevoked(tokenId);
            if (user == null || stamp == null || stamp != user.SecurityStamp || user.LockoutEnd == DateTimeOffset.MaxValue || revoked)
            {
                context.Fail("The session has ended");
            }
        }
    };
});

// Limits the calls to the account endpoints from one address
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(SecurityConstants.AuthRateLimitPolicy, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = SecurityConstants.AuthRequestsPerWindow,
                Window = TimeSpan.FromSeconds(SecurityConstants.AuthRateLimitWindowSeconds),
                QueueLimit = 0
            }));
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            System.Text.Json.JsonSerializer.Serialize(ApiResponse.FailureResult(ErrorConstants.AuthMessage.TooManyRequests),
                new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase }),
            cancellationToken);
    };
});

// 5. Configure Swagger / OpenAPI
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "OZE API",
        Version = "v1",
        Description = "OZE API"
    });

    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        Description = "Enter your JWT token directly: `ey...`",
        Reference = new OpenApiReference
        {
            Id = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };

    options.AddSecurityDefinition(jwtSecurityScheme.Reference.Id, jwtSecurityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtSecurityScheme, Array.Empty<string>() }
    });
    options.CustomSchemaIds(type => type.FullName ?? type.ToString());
});

var app = builder.Build();

// 6. Global Exception Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

// 7. Seed Database (Roles, Default Admin)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        await DatabaseSeeder.SeedAsync(services);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Could not run database seeder on startup (DB might not be initialized yet).");
    }
}

// 8. Pipeline Configuration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "OZE API v1");
    });
}

app.UseHttpsRedirection();

// Behind a reverse proxy on this machine, the address of the caller comes from X-Forwarded-For (used by the rate limiter)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
});

app.UseCors("AllowAll");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

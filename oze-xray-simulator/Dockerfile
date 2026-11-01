# =======================================================
# Stage 1: Build & Publish (.NET 8 SDK)
# =======================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project file
COPY OZE.XRaySimulator.sln ./
COPY src/OZE.XRaySimulator/OZE.XRaySimulator.csproj src/OZE.XRaySimulator/
COPY tools/MockWebhookReceiver/MockWebhookReceiver.csproj tools/MockWebhookReceiver/
COPY tests/OZE.XRaySimulator.Tests/OZE.XRaySimulator.Tests.csproj tests/OZE.XRaySimulator.Tests/

# Restore dependencies
RUN dotnet restore OZE.XRaySimulator.sln

# Copy the remaining project source files
COPY . .

# Build and publish Web API
WORKDIR /src/src/OZE.XRaySimulator
RUN dotnet publish OZE.XRaySimulator.csproj -c Release -o /app/publish /p:UseAppHost=false

# =======================================================
# Stage 2: Runtime Image (ASP.NET Core 8 Runtime)
# =======================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

USER app

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "OZE.XRaySimulator.dll"]

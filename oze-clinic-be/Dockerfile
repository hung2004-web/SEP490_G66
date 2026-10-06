# =======================================================
# Stage 1: Build & Publish (.NET 8 SDK)
# =======================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project definitions first for layer caching
COPY OZE.sln ./
COPY OZE/OZE.csproj OZE/
COPY OZE.Application/OZE.Application.csproj OZE.Application/
COPY OZE.Common/OZE.Common.csproj OZE.Common/
COPY OZE.Domain/OZE.Domain.csproj OZE.Domain/
COPY OZE.Persistence/OZE.Persistence.csproj OZE.Persistence/

# Restore dependencies
RUN dotnet restore OZE.sln

# Copy the remaining project source files
COPY . .

# Build and publish Web API
WORKDIR /src/OZE
RUN dotnet publish OZE.csproj -c Release -o /app/publish /p:UseAppHost=false

# =======================================================
# Stage 2: Runtime Image (ASP.NET Core 8 Runtime)
# =======================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Run under secure non-root user provided by .NET 8
USER app

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "OZE.dll"]

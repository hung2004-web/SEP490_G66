FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY OZE.XRaySimulator.sln ./
COPY src/OZE.XRaySimulator/OZE.XRaySimulator.csproj src/OZE.XRaySimulator/
COPY tools/MockWebhookReceiver/MockWebhookReceiver.csproj tools/MockWebhookReceiver/
COPY tests/OZE.XRaySimulator.Tests/OZE.XRaySimulator.Tests.csproj tests/OZE.XRaySimulator.Tests/

RUN dotnet restore OZE.XRaySimulator.sln

COPY . .

WORKDIR /src/tools/MockWebhookReceiver
RUN dotnet publish MockWebhookReceiver.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

USER app

EXPOSE 5055
ENV ASPNETCORE_URLS=http://+:5055

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "MockWebhookReceiver.dll"]

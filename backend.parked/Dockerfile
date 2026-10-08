FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/Hamyaran.Workdesk.Api/Hamyaran.Workdesk.Api.csproj src/Hamyaran.Workdesk.Api/
RUN dotnet restore src/Hamyaran.Workdesk.Api/Hamyaran.Workdesk.Api.csproj
COPY . .
RUN dotnet publish src/Hamyaran.Workdesk.Api/Hamyaran.Workdesk.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
VOLUME ["/var/hamyaran/storage"]
ENTRYPOINT ["dotnet", "Hamyaran.Workdesk.Api.dll"]

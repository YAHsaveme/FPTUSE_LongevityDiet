FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8084
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/LongevityDiet.Tracking.Api/LongevityDiet.Tracking.Api.csproj
RUN dotnet publish src/LongevityDiet.Tracking.Api/LongevityDiet.Tracking.Api.csproj -c Release -o /out --no-restore
FROM base
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.Tracking.Api.dll"]

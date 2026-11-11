FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8082
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/LongevityDiet.Catalog/LongevityDiet.Catalog.csproj
RUN dotnet publish src/LongevityDiet.Catalog/LongevityDiet.Catalog.csproj -c Release -o /out --no-restore
FROM base
COPY --from=build /out /app
WORKDIR /app
ENTRYPOINT ["dotnet", "LongevityDiet.Catalog.dll"]

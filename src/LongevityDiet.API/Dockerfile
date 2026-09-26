FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/LongevityDiet.API/LongevityDiet.API.csproj"
RUN dotnet publish "src/LongevityDiet.API/LongevityDiet.API.csproj" -c Release -o /out --no-restore -p:SkipFrontendBuild=true

FROM base AS final
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.API.dll"]

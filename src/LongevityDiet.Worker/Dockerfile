FROM mcr.microsoft.com/dotnet/runtime:9.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/LongevityDiet.Worker/LongevityDiet.Worker.csproj"
RUN dotnet publish "src/LongevityDiet.Worker/LongevityDiet.Worker.csproj" -c Release -o /out --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.Worker.dll"]

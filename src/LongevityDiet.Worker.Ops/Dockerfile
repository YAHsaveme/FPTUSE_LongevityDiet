FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8086

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/LongevityDiet.Worker.Ops/LongevityDiet.Worker.Ops.csproj
RUN dotnet publish src/LongevityDiet.Worker.Ops/LongevityDiet.Worker.Ops.csproj -c Release -o /out --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.Worker.Ops.dll"]

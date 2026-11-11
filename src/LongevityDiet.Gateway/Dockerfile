FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "./"]
COPY ["src/LongevityDiet.Gateway/LongevityDiet.Gateway.csproj", "src/LongevityDiet.Gateway/"]
RUN dotnet restore "src/LongevityDiet.Gateway/LongevityDiet.Gateway.csproj"
COPY . .
RUN dotnet publish "src/LongevityDiet.Gateway/LongevityDiet.Gateway.csproj" -c Release -o /out --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.Gateway.dll"]

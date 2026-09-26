FROM mcr.microsoft.com/dotnet/runtime:9.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "./"]
COPY ["src/LongevityDiet.Worker/LongevityDiet.Worker.csproj", "src/LongevityDiet.Worker/"]
COPY ["src/LongevityDiet.Domain/LongevityDiet.Domain.csproj", "src/LongevityDiet.Domain/"]
COPY ["src/LongevityDiet.Repositories/LongevityDiet.Repositories.csproj", "src/LongevityDiet.Repositories/"]
COPY ["src/LongevityDiet.Services/LongevityDiet.Services.csproj", "src/LongevityDiet.Services/"]
RUN dotnet restore "src/LongevityDiet.Worker/LongevityDiet.Worker.csproj"
COPY . .
RUN dotnet publish "src/LongevityDiet.Worker/LongevityDiet.Worker.csproj" -c Release -o /out --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.Worker.dll"]

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "./"]
COPY ["src/LongevityDiet.API/LongevityDiet.API.csproj", "src/LongevityDiet.API/"]
COPY ["src/LongevityDiet.Domain/LongevityDiet.Domain.csproj", "src/LongevityDiet.Domain/"]
COPY ["src/LongevityDiet.Repositories/LongevityDiet.Repositories.csproj", "src/LongevityDiet.Repositories/"]
COPY ["src/LongevityDiet.Services/LongevityDiet.Services.csproj", "src/LongevityDiet.Services/"]
RUN dotnet restore "src/LongevityDiet.API/LongevityDiet.API.csproj"
COPY . .
RUN dotnet publish "src/LongevityDiet.API/LongevityDiet.API.csproj" -c Release -o /out --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.API.dll"]

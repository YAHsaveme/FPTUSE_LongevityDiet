FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "./"]
COPY ["src/LongevityDiet.Recommendation.Grpc/LongevityDiet.Recommendation.Grpc.csproj", "src/LongevityDiet.Recommendation.Grpc/"]
COPY ["src/LongevityDiet.Domain/LongevityDiet.Domain.csproj", "src/LongevityDiet.Domain/"]
RUN dotnet restore "src/LongevityDiet.Recommendation.Grpc/LongevityDiet.Recommendation.Grpc.csproj"
COPY . .
RUN dotnet publish "src/LongevityDiet.Recommendation.Grpc/LongevityDiet.Recommendation.Grpc.csproj" -c Release -o /out --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /out .
ENTRYPOINT ["dotnet", "LongevityDiet.Recommendation.Grpc.dll"]

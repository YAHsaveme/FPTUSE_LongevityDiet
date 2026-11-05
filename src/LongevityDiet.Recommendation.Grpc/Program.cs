using LongevityDiet.Recommendation.Grpc.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapGrpcService<ActivityCoachEndpoint>();
app.MapHealthChecks("/health");
app.MapGet("/", () => Results.Ok(new
{
    service = "LongevityDiet.Recommendation.Grpc",
    status = "ready",
    contract = "longevity.recommendation.v1.ActivityCoach/Recommend",
    transport = "gRPC over HTTP/2"
}));

app.Run();

public partial class Program;

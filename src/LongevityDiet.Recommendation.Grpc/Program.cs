var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapHealthChecks("/health");
app.MapGet("/", () => Results.Ok(new
{
    service = "LongevityDiet.Recommendation.Grpc",
    status = "ready",
    contract = "Recommendation gRPC contract will be implemented in Week 1 - Task 4"
}));

app.Run();

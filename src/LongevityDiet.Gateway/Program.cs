using LongevityDiet.Gateway;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Dedicated gateway. The backend remains responsible for authorization.
var configuredUpstream = builder.Configuration[
    "ReverseProxy:Clusters:current-api:Destinations:api:Address"];
if (!Uri.TryCreate(configuredUpstream, UriKind.Absolute, out var upstream) ||
    upstream.Scheme != Uri.UriSchemeHttp ||
    !(upstream.IsLoopback || upstream.Host.Equals("api", StringComparison.OrdinalIgnoreCase)) ||
    !string.IsNullOrEmpty(upstream.UserInfo) ||
    upstream.AbsolutePath != "/" ||
    !string.IsNullOrEmpty(upstream.Query) ||
    !string.IsNullOrEmpty(upstream.Fragment))
{
    throw new InvalidOperationException("A trusted internal HTTP API destination is required.");
}

builder.Services.AddHttpClient<BackendReadyCheck>(client =>
{
    client.BaseAddress = upstream;
    client.Timeout = TimeSpan.FromSeconds(4);
});
builder.Services.AddHealthChecks().AddCheck<BackendReadyCheck>("current-api", tags: ["ready"]);
builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();
app.MapGet("/gateway/health", () => Results.Ok(new
{
    service = "gateway",
    status = "alive"
}));
app.MapHealthChecks("/gateway/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});

// No open proxy: routes are limited to /api/* and /openapi/*.
// The domain-service migration will replace the temporary backend cluster.
app.MapReverseProxy();
app.Run();

public partial class Program;

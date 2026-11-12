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
// Target routes are an opt-in, separate QA process; verify that target
// clusters cannot silently point at the legacy DB-bound API or outside Docker.
var targetMode = builder.Configuration.GetValue<bool>("Gateway:TargetRouting");
if (targetMode)
{
    var trustedOwners = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["identity"] = "http://identity:8081/",
        ["catalog"] = "http://catalog:8082/",
        ["planning"] = "http://planning:8083/",
        ["tracking"] = "http://tracking-api:8084/",
        ["recommendation-rest"] = "http://recommendation-owner:8087/",
        ["worker-ops"] = "http://worker-ops:8086/"
    };
    foreach (var (name, address) in trustedOwners)
    {
        var actual = builder.Configuration[
            $"ReverseProxy:Clusters:{name}:Destinations:service:Address"];
        if (!string.Equals(actual, address, StringComparison.Ordinal))
            throw new InvalidOperationException(
                $"Untrusted or missing target Gateway cluster: {name}");
    }
    if (builder.Configuration.GetValue<int>("ReverseProxy:Routes:current-api:Order")
        < 100)
        throw new InvalidOperationException(
            "Target Gateway must give service-owned routes precedence over legacy fallback.");
    builder.Services.AddHttpClient<TargetOwnersReadyCheck>(client =>
        client.Timeout = TimeSpan.FromSeconds(4));
    builder.Services.AddHealthChecks()
        .AddCheck<TargetOwnersReadyCheck>("target-owners", tags: ["target"]);
}

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
if (targetMode)
    app.MapHealthChecks("/gateway/target/ready", new HealthCheckOptions
    {
        Predicate = registration => registration.Tags.Contains("target")
    });

// No open proxy: routes are limited to /api/* and /openapi/*.
// The domain-service migration will replace the temporary backend cluster.
app.MapReverseProxy();
app.Run();

public partial class Program;

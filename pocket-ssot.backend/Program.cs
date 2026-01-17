using PocketSsot.Models;
using PocketSsot.Routes;
using PocketSsot.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using System.Net;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Load YAML config files manually
var deserializer = new DeserializerBuilder()
    .WithNamingConvention(CamelCaseNamingConvention.Instance)
    .Build();

Dictionary<string, string?>? config = null;
if (File.Exists("/etc/pocket-ssot/pocket-ssot.yml"))
{
    var yaml = File.ReadAllText("/etc/pocket-ssot/pocket-ssot.yml");
    config = deserializer.Deserialize<Dictionary<string, object>>(yaml)
        .ToDictionary(kvp => kvp.Key, kvp => kvp.Value?.ToString());
}
else if (File.Exists("pocket-ssot.yml"))
{
    var yaml = File.ReadAllText("pocket-ssot.yml");
    config = deserializer.Deserialize<Dictionary<string, object>>(yaml)
        .ToDictionary(kvp => kvp.Key, kvp => kvp.Value?.ToString());
}

if (config != null)
{
    builder.Configuration.AddInMemoryCollection(config);
}

// Log config loading
Console.WriteLine("Config loading:");
if (File.Exists("/etc/pocket-ssot/pocket-ssot.yml"))
{
    Console.WriteLine("Loaded from /etc/pocket-ssot/pocket-ssot.yml");
}
else
{
    Console.WriteLine("/etc/pocket-ssot/pocket-ssot.yml not found");
}

if (File.Exists("pocket-ssot.yml"))
{
    Console.WriteLine("Loaded from pocket-ssot.yml");
}
else
{
    Console.WriteLine("pocket-ssot.yml not found");
}

// Log final config values
var finalHost = builder.Configuration["host"] ?? "localhost";
var finalPort = builder.Configuration["port"] ?? "5000";
var finalLocalhostPort = builder.Configuration["localhostPort"] ?? "5001";
var finalStorePath = builder.Configuration["storePath"] ?? "/var/lib/pocket-ssot";
var finalExtension = builder.Configuration["extension"] ?? ".yml";
Console.WriteLine($"Final config: host={finalHost}, port={finalPort}, localhostPort={finalLocalhostPort}, storePath={finalStorePath}, extension={finalExtension}");

// Add Datastore
builder.Services.AddSingleton<YamlStore>();

// Auth
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = "PocketSSoT", // builder.Configuration["Auth:JwtIssuer"],
            ValidAudience = "PocketSSoT-Web", // builder.Configuration["Auth:JwtAudience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes("SuperSecretSuperSecretSuperSecretSuperSecret")),//builder.Configuration["Auth:JwtKey"]!)),

            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSingleton<YamlStore>();
builder.Services.AddSingleton<IReleaseRunner, ReleaseRunner>();


// Console Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// ---------- Initial Startup ----------
builder.Services.AddHostedService<StartupTasks>();

// Configure host and port
var host = builder.Configuration["host"] ?? "localhost";
var port = builder.Configuration["port"] ?? "5000";
var localhostPort = builder.Configuration["localhostPort"] ?? "5001";
builder.WebHost.UseUrls($"http://{host}:{port}", $"http://127.0.0.1:{localhostPort}");

var app = builder.Build();

app.UseDefaultFiles();   // serves index.html if present
app.UseStaticFiles();    // serves files from wwwroot

app.MapGet("/api/health", () => Results.Ok(new { ok = true, time = DateTimeOffset.UtcNow }));

// ---------- middleware ----------
// Middleware to allow localhost access without JWT
app.Use(async (context, next) =>
{
    if (int.TryParse(localhostPort, out var portNum) &&
        context.Request.Host.Port == portNum &&
        (context.Connection.RemoteIpAddress?.Equals(IPAddress.Loopback) == true ||
         context.Connection.RemoteIpAddress?.Equals(IPAddress.IPv6Loopback) == true))
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            var claims = new[] { new Claim(ClaimTypes.Name, "localhost") };
            var identity = new ClaimsIdentity(claims, "localhost");
            context.User = new ClaimsPrincipal(identity);
        }
    }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

// ---------- endpoints ----------
app.MapAuthEndpoints();
app.MapReleaseChannels();
app.MapPolicies();
app.MapCollections();
app.MapEntities();
app.MapReleaseEndpoints();
app.MapReleases();

// SPA fallback
app.MapFallbackToFile("index.html");

app.Run();

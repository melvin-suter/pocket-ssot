using PocketSsot.Models;
using PocketSsot.Routes;
using PocketSsot.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

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


var app = builder.Build();

app.UseDefaultFiles();   // serves index.html if present
app.UseStaticFiles();    // serves files from wwwroot

app.MapGet("/api/health", () => Results.Ok(new { ok = true, time = DateTimeOffset.UtcNow }));

// ---------- middleware ----------
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

app.Run();

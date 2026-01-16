using PocketSsot.Models;
using PocketSsot.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace PocketSsot.Routes;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/login", Login).AllowAnonymous();
        app.MapGet("/api/me", Me);
        return app;
    }

    private static IResult Me(
        ClaimsPrincipal user
    ) {
        var username =
            user.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
            user.Identity?.Name;

        return Results.Ok(new { username });
    }

    private static IResult Login(
        LoginRequest req,
        YamlStore yaml,
        IConfiguration config)
    {
        var user = yaml.Find<User>("users",
            u => string.Equals(u.Username, req.Username, StringComparison.OrdinalIgnoreCase));

        if (user is null)
            return Results.Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.Password))
            return Results.Unauthorized();

        // Set JWT Config
        var issuer = "PocketSSoT";
        var audience = "PocketSSoT-Web";
        var key = "SuperSecretSuperSecretSuperSecretSuperSecret";

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return Results.Ok(new { token = tokenString });
    }
}

public record LoginRequest(string Username, string Password);

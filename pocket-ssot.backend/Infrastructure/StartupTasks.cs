using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PocketSsot.Models;

namespace PocketSsot.Infrastructure;

public sealed class StartupTasks : IHostedService
{
    private readonly YamlStore _yaml;
    private readonly ILogger<StartupTasks> _logger;

    public StartupTasks(YamlStore yaml, ILogger<StartupTasks> logger)
    {
        _yaml = yaml;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Running startup tasks...");

        // Example: touch-load users so you fail early if YAML is broken
        var users = _yaml.List<User>("users");
        
        if (users.Count == 0){
            _logger.LogWarning("No users found. Creating default admin admin User.");
            _yaml.Insert(
                "users",
                new User
                {
                    Username = "admin",
                    Password = BCrypt.Net.BCrypt.HashPassword("admin", workFactor: 12)
                },
                u => u.Username
            );
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

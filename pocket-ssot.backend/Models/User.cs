using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace PocketSsot.Models;

public class User
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

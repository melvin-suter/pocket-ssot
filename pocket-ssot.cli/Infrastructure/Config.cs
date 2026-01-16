using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace PocketSsot.Infrastructure;

public class Config {
    public static ConfigSet GetConfig() {
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

        if(config == null) {
            config = new Dictionary<string, string?>();
        }

        return new ConfigSet
        {
            StorePath = config.TryGetValue("storePath", out var storePath) && !string.IsNullOrEmpty(storePath)
                ? storePath
                : "/var/lib/pocket-ssot",
            Config = config
        };

    }
}

public sealed class ConfigSet
{
    public string StorePath { get; set; } = "/var/lib/pocket-ssot";
    public Dictionary<string, string?> Config { get; set; } = new();
}

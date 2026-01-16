using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using PocketSsot.Infrastructure;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PocketSsot.Models;

public class Policy
{
    public string ID { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public PolicyField[] Fields {get;set;} = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PolicyField
{
    public string Name { get; set; } = "";
    public string Label { get; set; } = "";
    public string Type { get; set; } = "";
    public int Order { get; set; } = 0;
    [JsonConverter(typeof(ClrObjectJsonConverter))]
    public object? Config { get; set; } = new Dictionary<string, object?>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public record PolicyInsertRequest(
    string Name
);
public record PolicyUpdateRequest(
    string ID,
    string Name,
    PolicyField[] Fields
);

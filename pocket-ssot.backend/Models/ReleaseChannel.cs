using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using PocketSsot.Infrastructure;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PocketSsot.Models;

public class ReleaseChannel
{
    public string ID { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public bool AllowExtraFields { get;set;} = false;
    public ReleaseChannelStep[] Steps {get;set;} = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReleaseChannelStep
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public int Order { get; set; } = 0;
    [JsonConverter(typeof(ClrObjectJsonConverter))]
    public object? Config { get; set; } = new Dictionary<string, object?>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public record ReleaseChannelInsertRequest(string Name, bool AllowExtraFields);
public record ReleaseChannelUpdateRequest(string ID, string Name, bool AllowExtraFields, ReleaseChannelStep[] Steps);

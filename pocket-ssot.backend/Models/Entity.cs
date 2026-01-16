using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using PocketSsot.Infrastructure;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PocketSsot.Models;

public class Entity
{
    public string ID { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    [JsonConverter(typeof(ClrObjectJsonConverter))]
    public object? Fields { get; set; } = new List<object?>();
    public string CollectionId { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public record EntityInsertRequest(
    string Name,
    string CollectionId
);

public record EntityUpdateRequest(
    string ID,
    string Name,
    [property: JsonConverter(typeof(ClrObjectJsonConverter))] object? Fields,
    string CollectionId
);

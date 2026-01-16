using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace PocketSsot.Models;

public class Collection
{
    public string ID { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public bool AllowExtraFields {get; set;} = true;
    public string[] Policies {get;set;} = [];
    public string ReleaseChannelCollection { get; set; } = "";
    public string ReleaseChannelEntity { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}


public record CollectionInsertRequest(
    string Name,
    string ReleaseChannelCollection,
    string ReleaseChannelEntity,
    bool AllowExtraFields,
    string[] Policies
);

public record CollectionUpdateRequest(
    string ID,
    string Name,
    string ReleaseChannelCollection,
    string ReleaseChannelEntity,
    bool AllowExtraFields,
    string[] Policies
);

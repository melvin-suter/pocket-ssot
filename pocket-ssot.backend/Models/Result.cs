namespace PocketSsot.Models;

public class StepResult
{
    public string Name { get; set; } = "";
    public bool Status { get; set; } = true;
    public string? Error { get; set; }
    public string? Output { get; set; }
    public object? Meta { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReleaseRecord
{
    public string ID { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string CollectionId { get; set; } = "";
    public string? EntityId { get; set; }
    public string ReleaseChannelId { get; set; } = "";
    public bool Status { get; set; } = false;
    public List<StepResult> Results { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

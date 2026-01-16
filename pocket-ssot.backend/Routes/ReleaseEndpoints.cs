using System.Text;
using System.Text.Json;
using PocketSsot.Models;
using PocketSsot.Infrastructure;

namespace PocketSsot.Routes;

public static class ReleaseEndpoints
{
    public static IEndpointRouteBuilder MapReleaseEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/callback/{entityId}/{field}", Callback).AllowAnonymous();

        app.MapPost("/api/release/{collectionId}", ReleaseCollection);
        app.MapPost("/api/release-entity/{entityId}", ReleaseEntity);

        return app;
    }

    private static async Task<IResult> Callback(
        string entityId,
        string field,
        HttpRequest request,
        YamlStore store
    )
    {
        if (string.IsNullOrWhiteSpace(entityId) || string.IsNullOrWhiteSpace(field))
            return Results.BadRequest(new { error = "Missing entityId or field path param." });

        var entity = store.Find<Entity>("entities", e => e.ID == entityId);
        if (entity is null)
            return Results.NotFound(new { error = "Entity not found" });

        if (string.IsNullOrWhiteSpace(entity.CollectionId))
            return Results.BadRequest(new { error = "Entity has no collection" });

        var collection = store.Find<Collection>("collections", c => c.ID == entity.CollectionId);
        if (collection is null)
            return Results.BadRequest(new { error = "Collection not found for entity" });

        // TODO: policy check (you haven’t provided policy schema yet)
        // if (!PolicyAllowsCallback(collection, field)) return Results.Forbid();

        var value = await ReadCallbackValue(request);

        var fieldsMap = NormalizeFields(entity.Fields);
        fieldsMap[field] = value;
        entity.Fields = fieldsMap;

        var updated = store.Update<Entity>("entities", e => e.ID, entityId, e =>
        {
            e.Fields = entity.Fields;
        });

        if (!updated)
            return Results.NotFound(new { error = "Entity not found (update failed)" });

        return Results.Ok(new
        {
            success = true,
            entityId,
            field,
            value
        });
    }

    private static async Task<IResult> ReleaseCollection(
        string collectionId,
        HttpContext ctx,
        YamlStore store,
        IReleaseRunner runner
    )
    {
        if (string.IsNullOrWhiteSpace(collectionId))
            return Results.BadRequest(new { error = "missing collectionId" });

        var collection = store.Find<Collection>("collections", c => c.ID == collectionId);
        if (collection is null)
            return Results.NotFound(new { error = "Collection not found" });

        if (string.IsNullOrWhiteSpace(collection.ReleaseChannelCollection))
            return Results.BadRequest(new { error = "Collection has no release_channel_collection" });

        var channel = store.Find<ReleaseChannel>(
            "release-channels",
            rc => rc.ID == collection.ReleaseChannelCollection
        );

        if (channel is null)
            return Results.NotFound(new { error = "Release channel not found" });

        var entities = store.List<Entity>(
            "entities",
            e => e.CollectionId == collectionId
        );

        var steps = channel.Steps.OrderBy(s => s.Order).ToList();

        var release = new ReleaseRecord
        {
            Name = $"{collection.Name} / {channel.Name} / {DateTimeOffset.UtcNow:O}",
            CollectionId = collectionId,
            ReleaseChannelId = channel.ID,
            EntityId = null
        };

        release.Results = await runner.RunAsync(collection, channel, entities, steps);

        // You said: results in new files in yamlstore.
        // This writes ONE file per release, stored under releases-collection/<id>.yaml
        store.Insert($"releases-collection", release, r => r.ID);

        var ok = release.Results.All(x => x.Status);

        return Results.Ok(new
        {
            ok,
            collection_id = collectionId,
            release_id = release.ID,
            name = release.Name,
            results = release.Results
        });
    }

    private static async Task<IResult> ReleaseEntity(
        string entityId,
        HttpContext ctx,
        YamlStore store,
        IReleaseRunner runner
    )
    {
        if (string.IsNullOrWhiteSpace(entityId))
            return Results.BadRequest(new { error = "missing entityId" });

        var entity = store.Find<Entity>("entities", e => e.ID == entityId);
        if (entity is null)
            return Results.NotFound(new { error = "Entity not found" });

        if (string.IsNullOrWhiteSpace(entity.CollectionId))
            return Results.BadRequest(new { error = "Entity has no collection" });

        var collection = store.Find<Collection>("collections", c => c.ID == entity.CollectionId);
        if (collection is null)
            return Results.NotFound(new { error = "Collection not found" });

        if (string.IsNullOrWhiteSpace(collection.ReleaseChannelEntity))
            return Results.BadRequest(new { error = "Collection has no release_channel_entity" });

        var channel = store.Find<ReleaseChannel>(
            "release-channels",
            rc => rc.ID == collection.ReleaseChannelEntity
        );

        if (channel is null)
            return Results.NotFound(new { error = "Release channel not found" });

        var steps = channel.Steps.OrderBy(s => s.Order).ToList();

        var entityName = string.IsNullOrWhiteSpace(entity.Name) ? entityId : entity.Name;

        var release = new ReleaseRecord
        {
            Name = $"{collection.Name} / {channel.Name} / {entityName} / {DateTimeOffset.UtcNow:O}",
            CollectionId = collection.ID,
            EntityId = entityId,
            ReleaseChannelId = channel.ID
        };

        release.Results = await runner.RunAsync(collection, channel, new List<Entity> { entity }, steps);

        store.Insert($"releases-entity", release, r => r.ID);

        var ok = release.Results.All(x => x.Status);

        return Results.Ok(new
        {
            ok,
            entity_id = entityId,
            collection_id = entity.CollectionId,
            release_id = release.ID,
            name = release.Name,
            results = release.Results
        });
    }

    // -----------------
    // Helpers
    // -----------------

    /// <summary>
    /// Mirrors your Go behavior but more robust:
    /// - empty body -> ""
    /// - JSON object with { "value": X } -> X
    /// - otherwise parse JSON -> object/array/string/number/bool/null
    /// - fallback -> raw trimmed string
    /// </summary>
    private static async Task<object?> ReadCallbackValue(HttpRequest request)
    {
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = (await reader.ReadToEndAsync()).Trim();

        if (string.IsNullOrEmpty(body))
            return "";

        if (body.StartsWith("{") || body.StartsWith("[") || body.StartsWith("\""))
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("value", out var v))
                    return JsonElementToObject(v);

                return JsonElementToObject(root);
            }
            catch
            {
                // ignore and fall back to raw string below
            }

            // JSON string like "hello"
            if (body.Length >= 2 && body.StartsWith("\"") && body.EndsWith("\""))
            {
                try { return JsonSerializer.Deserialize<string>(body); } catch { }
            }
        }

        return body;
    }

    private static object? JsonElementToObject(JsonElement el)
        => el.ValueKind switch
        {
            JsonValueKind.String => el.GetString(),
            JsonValueKind.Number => el.TryGetInt64(out var l) ? l : el.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => JsonSerializer.Deserialize<object>(el.GetRawText())
        };

    /// <summary>
    /// Your Entity.Fields is object? with a converter, so normalize to a map.
    /// If it's not a map, we replace with a new one.
    /// </summary>
    private static Dictionary<string, object?> NormalizeFields(object? raw)
    {
        if (raw is null)
            return new Dictionary<string, object?>();

        if (raw is Dictionary<string, object?> d1)
            return d1;

        // YAML often deserializes into Dictionary<object, object>
        if (raw is Dictionary<object, object> d2)
        {
            var outMap = new Dictionary<string, object?>();
            foreach (var (k, v) in d2)
            {
                var key = Convert.ToString(k) ?? "";
                if (key.Length == 0) continue;
                outMap[key] = v;
            }
            return outMap;
        }

        // If the converter produced JsonElement
        if (raw is JsonElement je && je.ValueKind == JsonValueKind.Object)
        {
            var obj = JsonSerializer.Deserialize<Dictionary<string, object?>>(je.GetRawText());
            return obj ?? new Dictionary<string, object?>();
        }

        return new Dictionary<string, object?>();
    }
}

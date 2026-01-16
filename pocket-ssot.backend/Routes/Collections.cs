using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using PocketSsot.Models;
using PocketSsot.Infrastructure;

namespace PocketSsot.Routes;

public static class Collections
{
    public static IEndpointRouteBuilder MapCollections(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/collections/{id}/entities", (string id, YamlStore yaml) =>
        {
            return Results.Ok(yaml.List<Entity>("entities", u => u.CollectionId == id));
        });

        app.MapGet("/api/collections/{id}/releases", (string id, YamlStore yaml) =>
        {
            return Results.Ok(yaml.List<ReleaseRecord>("releases/collections", r => r.CollectionId == id));
        });

        // Your CRUD for collections themselves (list/get/insert/update/delete)
        app.MapCrud<Collection, CollectionInsertRequest, CollectionUpdateRequest>(
            basePath: "/api/collections",
            datasetName: "collections",
            keySelector: c => c.ID,
            createEntity: req => new Collection { Name = req.Name },
            applyUpdate: (entity, req) =>
            {
                entity.Name = req.Name;
                entity.ReleaseChannelCollection = req.ReleaseChannelCollection;
                entity.ReleaseChannelEntity = req.ReleaseChannelEntity;
                entity.AllowExtraFields = req.AllowExtraFields;
                entity.Policies = req.Policies;
            },
            normalizeEntity: entity => entity.Name = entity.Name?.Trim() ?? "",
            validateEntity: entity =>
                string.IsNullOrWhiteSpace(entity.Name)
                    ? (false, "Name is required.")
                    : (true, null)
        );

        return app;
    }
}

using PocketSsot.Models;
using PocketSsot.Infrastructure;

namespace PocketSsot.Routes;

public static class Entities
{
    public static IEndpointRouteBuilder MapEntities(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/entities/{id}/releases", (string id, YamlStore yaml) =>
        {
            return Results.Ok(yaml.List<ReleaseRecord>("releases/entities", r => r.EntityId == id));
        });

        return app.MapCrud<Entity, EntityInsertRequest, EntityUpdateRequest>(
            basePath: "/api/entities",
            datasetName: "entities",
            keySelector: rc => rc.ID,

            createEntity: req => new Entity
            {
                Name = req.Name,
                CollectionId = req.CollectionId,
            },

            applyUpdate: (entity, req) =>
            {
                entity.Name = req.Name;
                entity.Fields = req.Fields;
            },

            normalizeEntity: entity =>
            {
                entity.Name = entity.Name?.Trim() ?? "";
            },

            validateEntity: entity =>
            {
                if (string.IsNullOrWhiteSpace(entity.Name))
                    return (false, "Name is required.");
                if (string.IsNullOrWhiteSpace(entity.CollectionId))
                    return (false, "CollectionId is required.");
                return (true, null);
            }
        );
    }
}

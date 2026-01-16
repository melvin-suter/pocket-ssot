using PocketSsot.Models;

namespace PocketSsot.Routes;

public static class Policies
{
    public static IEndpointRouteBuilder MapPolicies(this IEndpointRouteBuilder app)
    {

        return app.MapCrud<Policy, PolicyInsertRequest, PolicyUpdateRequest>(
            basePath: "/api/policies",
            datasetName: "policies",
            keySelector: rc => rc.ID,

            createEntity: req => new Policy
            {
                Name = req.Name,
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
                return (true, null);
            }
        );
    }
}

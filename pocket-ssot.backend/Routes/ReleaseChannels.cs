using PocketSsot.Models;

namespace PocketSsot.Routes;

public static class ReleaseChannels
{
    public static IEndpointRouteBuilder MapReleaseChannels(this IEndpointRouteBuilder app)
    {
        return app.MapCrud<ReleaseChannel, ReleaseChannelInsertRequest, ReleaseChannelUpdateRequest>(
            basePath: "/api/release-channels",
            datasetName: "release-channels",
            keySelector: rc => rc.ID,

            createEntity: req => new ReleaseChannel
            {
                Name = req.Name,
                AllowExtraFields = req.AllowExtraFields != false
            },

            applyUpdate: (entity, req) =>
            {
                entity.Name = req.Name;
                entity.AllowExtraFields = req.AllowExtraFields;
                entity.Steps = req.Steps;
            },

            normalizeEntity: entity =>
            {
                entity.Name = entity.Name?.Trim() ?? "";
                // add parsing/cleanup here if you want
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

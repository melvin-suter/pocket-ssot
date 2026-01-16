using PocketSsot.Models;
using PocketSsot.Infrastructure;

namespace PocketSsot.Routes;

public static class Releases
{
    public static IEndpointRouteBuilder MapReleases(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/releases/collection", (YamlStore yaml) =>
        {
            return Results.Ok(yaml.List<ReleaseRecord>("releases_collection"));
        });

        return app;
    }
}

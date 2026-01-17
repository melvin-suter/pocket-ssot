using Microsoft.AspNetCore.Routing;
using PocketSsot.Models;
using PocketSsot.Infrastructure;

namespace PocketSsot.Routes;

public static class CrudRoutes
{
    public static IEndpointRouteBuilder MapCrud<TEntity, TInsert, TUpdate>(
        this IEndpointRouteBuilder app,
        string basePath,              // e.g. "/api/release-channels"
        string datasetName,            // e.g. "release-channels"
        Func<TEntity, string> keySelector,
        Func<TInsert, TEntity> createEntity,
        Action<TEntity, TUpdate> applyUpdate,
        Func<TEntity, (bool ok, string? error)>? validateEntity = null,
        Action<TEntity>? normalizeEntity = null,
        Func<string, YamlStore, IResult>? customDelete = null
    )
        where TEntity : class
    {
        app.MapGet(basePath, (YamlStore yaml) =>
        {
            return Results.Ok(yaml.List<TEntity>(datasetName));
        });

        app.MapGet($"{basePath}/{{id}}", (string id, YamlStore yaml) =>
        {
            var item = yaml.Find<TEntity>(datasetName, e => keySelector(e) == id);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        app.MapPut(basePath, (TInsert req, YamlStore yaml) =>
        {
            var entity = createEntity(req);

            normalizeEntity?.Invoke(entity);

            if (validateEntity is not null)
            {
                var (ok, error) = validateEntity(entity);
                if (!ok) return Results.BadRequest(new { error });
            }

            yaml.Insert(datasetName, entity, keySelector);
            return Results.Ok(new { ok = true });
        });

        app.MapPost($"{basePath}/{{id}}", (string id, TUpdate req, YamlStore yaml) =>
        {
            var updated = yaml.Update<TEntity>(
                datasetName,
                keySelector,
                id,
                entity =>
                {
                    applyUpdate(entity, req);

                    normalizeEntity?.Invoke(entity);

                    if (validateEntity is not null)
                    {
                        var (ok, error) = validateEntity(entity);
                        if (!ok) throw new InvalidOperationException(error ?? "Validation failed");
                    }
                });

            if (!updated) return Results.NotFound();

            return Results.Ok(new { ok = true });
        });

        app.MapDelete($"{basePath}/{{id}}", (string id, YamlStore yaml) =>
        {
            if (customDelete != null)
            {
                return customDelete(id, yaml);
            }
            else
            {
                var deleted = yaml.Delete<TEntity>(datasetName, keySelector, id);
                return deleted ? Results.Ok(new { ok = true }) : Results.NotFound();
            }
        });

        return app;
    }
}

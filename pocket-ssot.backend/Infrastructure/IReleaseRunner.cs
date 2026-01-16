using PocketSsot.Models;

namespace PocketSsot.Infrastructure;

public interface IReleaseRunner
{
    Task<List<StepResult>> RunAsync(
        Collection collection,
        ReleaseChannel channel,
        List<Entity> entities,
        List<ReleaseChannelStep> steps);
}

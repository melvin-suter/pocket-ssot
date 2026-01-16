using System.Diagnostics;
using System.Text;
using PocketSsot.Models;
using Scriban;

namespace PocketSsot.Infrastructure;

public sealed class ReleaseRunner : IReleaseRunner
{
    public async Task<List<StepResult>> RunAsync(
        Collection collection,
        ReleaseChannel channel,
        List<Entity> entities,
        List<ReleaseChannelStep> steps)
    {
        var outSteps = new List<StepResult>();

        foreach (var step in steps.OrderBy(s => s.Order))
        {
            var stepName = string.IsNullOrWhiteSpace(step.Name) ? step.Type : step.Name;
            var parent = new StepResult { Name = stepName, Status = true };

            var cfg = NormalizeConfigMap(step.Config);
            if (cfg is null)
            {
                parent.Status = false;
                parent.Error = "step config is missing or not an object/map";
                parent.Meta = new { stepType = step.Type, configType = step.Config?.GetType().FullName };
                outSteps.Add(parent);
                break;
            }

            try
            {
                switch (step.Type)
                {
                    case "template":
                        await RunTemplateStep(outSteps, parent, cfg, collection, entities);
                        break;

                    case "shell":
                        await RunShellStep(outSteps, parent, cfg, collection, entities);
                        break;

                    default:
                        parent.Status = true;
                        parent.Output = "skipped (unsupported step type)";
                        parent.Meta = new { type = step.Type };
                        outSteps.Add(parent);
                        break;
                }
            }
            catch (Exception ex)
            {
                parent.Status = false;
                parent.Error = ex.Message;
                parent.Meta = new { exception = ex.GetType().FullName };
                outSteps.Add(parent);
            }

            if (!parent.Status)
                break;
        }

        return outSteps;
    }

    // ---------------------------
    // Template step
    // ---------------------------
    private static async Task RunTemplateStep(
        List<StepResult> outSteps,
        StepResult parent,
        Dictionary<string, object?> cfg,
        Collection collection,
        List<Entity> entities)
    {
        var tmplStr = GetString(cfg, "template");
        var pathTmpl = GetString(cfg, "path");
        var eachEntity = GetBool(cfg, "eachEntity");

        if (string.IsNullOrWhiteSpace(pathTmpl))
            throw new InvalidOperationException("template step missing config.path");
        if (string.IsNullOrWhiteSpace(tmplStr))
            throw new InvalidOperationException("template step missing config.template");

        if (eachEntity)
        {
            if (entities.Count == 0)
                throw new InvalidOperationException("eachEntity is true but entities is empty");

            var wrote = 0;
            var failures = new List<object>();

            foreach (var entity in entities)
            {
                // IMPORTANT: normalize fields into a real dictionary
                var safeEntity = new Dictionary<string, object>
                {
                    ["Id"] = entity.ID,
                    ["Name"] = entity.Name,
                    ["CollectionId"] = entity.CollectionId,
                    ["Fields"] = NormalizeFields(entity.Fields),
                };

                var data = new { collection, entity = safeEntity };

                try
                {
                    var target = Render("path", pathTmpl, data);
                    target = CleanAndValidatePath(target);

                    var content = Render("template", tmplStr, data);
                    await WriteFileAsync(target, content);

                    wrote++;

                    outSteps.Add(new StepResult
                    {
                        Name = parent.Name,
                        Status = true,
                        Output = $"wrote {content.Length} bytes to {target}",
                        Meta = new { eachEntity = true, entityId = entity.ID, path = target }
                    });
                }
                catch (Exception ex)
                {
                    failures.Add(new { entityId = entity.ID, error = ex.Message });

                    outSteps.Add(new StepResult
                    {
                        Name = parent.Name,
                        Status = false,
                        Error = ex.Message,
                        Meta = new { eachEntity = true, entityId = entity.ID }
                    });
                }
            }

            if (failures.Count > 0)
            {
                parent.Status = false;
                parent.Error = $"wrote {wrote} files, {failures.Count} failures";
                parent.Meta = new { eachEntity = true, written = wrote, failures };
                outSteps.Add(parent);
                return;
            }

            parent.Status = true;
            parent.Output = $"wrote {wrote} files";
            parent.Meta = new { eachEntity = true, written = wrote };
            outSteps.Add(parent);
            return;
        }

        // single file mode uses { collection, entities }
        {
            // IMPORTANT: normalize fields for *each* entity
            var safeEntities = entities.Select(e => new Dictionary<string, object>
            {
                ["Id"] = e.ID,
                ["Name"] = e.Name,
                ["CollectionId"] = e.CollectionId,
                ["Fields"] = NormalizeFields(e.Fields),
            }).ToList();

            var data = new { collection, entities = safeEntities };

            var target = Render("path", pathTmpl, data);
            target = CleanAndValidatePath(target);

            var content = Render("template", tmplStr, data);
            await WriteFileAsync(target, content);

            parent.Status = true;
            parent.Output = $"wrote {content.Length} bytes to {target}";
            parent.Meta = new { path = target };
            outSteps.Add(parent);
        }
    }

    // ---------------------------
    // Shell step
    // ---------------------------
    private static async Task RunShellStep(
        List<StepResult> outSteps,
        StepResult parent,
        Dictionary<string, object?> cfg,
        Collection collection,
        List<Entity> entities)
    {
        var shellTmpl = GetString(cfg, "shell");
        var workdirTmpl = GetString(cfg, "workdir");
        var eachEntity = GetBool(cfg, "eachEntity");

        if (string.IsNullOrWhiteSpace(shellTmpl))
            throw new InvalidOperationException("shell step missing config.shell");

        var envMap = NormalizeConfigMap(cfg.TryGetValue("env", out var envRaw) ? envRaw : null);

        async Task<StepResult> RunOnce(object data, object metaBase)
        {
            var cmdStr = Render("shell", shellTmpl, data);

            var workdir = "";
            if (!string.IsNullOrWhiteSpace(workdirTmpl))
                workdir = Render("workdir", workdirTmpl, data);

            var env = new Dictionary<string, string>();
            if (envMap is not null)
            {
                foreach (var (kRaw, vRaw) in envMap)
                {
                    var key = Render("envKey", kRaw, data);
                    var val = Render("envVal", Convert.ToString(vRaw) ?? "", data);
                    env[key] = val;
                }
            }

            var (exit, stdout, stderr) = await ExecuteShellAsync(cmdStr, workdir, env);

            var meta = new Dictionary<string, object?>
            {
                ["shell"] = cmdStr,
                ["shellSource"] = shellTmpl,
                ["stdout"] = stdout,
                ["stderr"] = stderr,
                ["workdir"] = string.IsNullOrWhiteSpace(workdir) ? null : workdir,
                ["workdirSource"] = string.IsNullOrWhiteSpace(workdirTmpl) ? null : workdirTmpl,
                ["envRendered"] = env.Select(kv => $"{kv.Key}={kv.Value}").ToList()
            };

            meta["base"] = metaBase;

            var combined = stdout + stderr;
            if (string.IsNullOrEmpty(combined))
                combined = "ok";

            return exit == 0
                ? new StepResult { Name = parent.Name, Status = true, Output = combined, Meta = meta }
                : new StepResult { Name = parent.Name, Status = false, Error = $"shell command failed (exit {exit})", Output = combined, Meta = meta };
        }

        if (eachEntity)
        {
            if (entities.Count == 0)
                throw new InvalidOperationException("eachEntity is true but entities is empty");

            var success = 0;
            var failures = new List<object>();

            foreach (var entity in entities)
            {
                // normalize fields for templates used inside shell/env/workdir too
                var safeEntity = new
                {
                    Id = entity.ID,
                    Name = entity.Name,
                    CollectionId = entity.CollectionId,
                    Fields = NormalizeFields(entity.Fields),
                };

                var data = new { collection, entity = safeEntity };
                var r = await RunOnce(data, new { eachEntity = true, entityId = entity.ID });

                outSteps.Add(r);

                if (!r.Status)
                    failures.Add(new { entityId = entity.ID, error = r.Error, output = r.Output });
                else
                    success++;
            }

            if (failures.Count > 0)
            {
                parent.Status = false;
                parent.Error = $"ran {entities.Count} commands, {failures.Count} failures";
                parent.Meta = new { eachEntity = true, success, failures };
                outSteps.Add(parent);
                return;
            }

            parent.Status = true;
            parent.Output = $"ran {success} commands";
            parent.Meta = new { eachEntity = true, success };
            outSteps.Add(parent);
            return;
        }

        // normal mode
        {
            var safeEntities = entities.Select(e => new Dictionary<string, object>
            {
                ["Id"] = e.ID,
                ["Name"] = e.Name,
                ["CollectionId"] = e.CollectionId,
                ["Fields"] = NormalizeFields(e.Fields),
            }).ToList();

            var data = new { collection, entities = safeEntities };
            var r = await RunOnce(data, new { eachEntity = false });

            outSteps.Add(r);

            parent.Status = r.Status;
            parent.Error = r.Error;
            parent.Output = r.Output;
            parent.Meta = r.Meta;

            outSteps.Add(parent);
        }
    }

    // ---------------------------
    // Scriban rendering
    // ---------------------------
    private static string Render(string name, string templateText, object model)
    {
        var tpl = Template.Parse(templateText, name);
        if (tpl.HasErrors)
            throw new InvalidOperationException($"{name} template parse error: {string.Join("; ", tpl.Messages.Select(m => m.Message))}");

        return tpl.Render(model);
    }

    // ---------------------------
    // Field normalization (fixes Key/Value list garbage)
    // ---------------------------
    private static Dictionary<string, object?> NormalizeFields(object? raw)
    {
        if (raw is null) return new Dictionary<string, object?>();

        // already the desired shape
        if (raw is Dictionary<string, object?> d1) return d1;

        // common YAML shape
        if (raw is Dictionary<object, object> d2)
        {
            var outMap = new Dictionary<string, object?>();
            foreach (var (k, v) in d2)
            {
                var key = Convert.ToString(k);
                if (!string.IsNullOrWhiteSpace(key))
                    outMap[key] = v;
            }
            return outMap;
        }

        // YOUR CURRENT BROKEN SHAPE:
        // fields: [ {Key: "...", Value: ...}, ... ]
        if (raw is System.Collections.IEnumerable list && raw is not string)
        {
            var outMap = new Dictionary<string, object?>();

            foreach (var item in list)
            {
                if (item is null) continue;

                var t = item.GetType();
                var keyProp = t.GetProperty("Key");
                var valProp = t.GetProperty("Value");
                if (keyProp is null || valProp is null) continue;

                var key = Convert.ToString(keyProp.GetValue(item));
                if (string.IsNullOrWhiteSpace(key)) continue;

                outMap[key] = valProp.GetValue(item);
            }

            return outMap;
        }

        // anything else: treat as empty map
        return new Dictionary<string, object?>();
    }

    // ---------------------------
    // Shell execution
    // ---------------------------
    private static async Task<(int exitCode, string stdout, string stderr)> ExecuteShellAsync(
        string cmd,
        string? workdir,
        Dictionary<string, string> env)
    {
        var isWindows = OperatingSystem.IsWindows();

        var psi = new ProcessStartInfo
        {
            FileName = isWindows ? "cmd.exe" : "/bin/bash",
            Arguments = isWindows ? $"/c {cmd}" : $"-c \"{cmd.Replace("\"", "\\\"")}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };

        if (!string.IsNullOrWhiteSpace(workdir))
            psi.WorkingDirectory = workdir;

        foreach (var (k, v) in env)
            psi.Environment[k] = v;

        using var p = Process.Start(psi)
            ?? throw new InvalidOperationException("Failed to start shell process.");

        var stdoutTask = p.StandardOutput.ReadToEndAsync();
        var stderrTask = p.StandardError.ReadToEndAsync();

        await p.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        return (p.ExitCode, stdout, stderr);
    }

    // ---------------------------
    // File writing
    // ---------------------------
    private static async Task WriteFileAsync(string target, string content)
    {
        var dir = Path.GetDirectoryName(target);
        if (!string.IsNullOrWhiteSpace(dir))
            Directory.CreateDirectory(dir);

        await File.WriteAllTextAsync(target, content, Encoding.UTF8);
    }

    private static string CleanAndValidatePath(string path)
    {
        var cleaned = Path.GetFullPath(path);

        if (string.IsNullOrWhiteSpace(cleaned))
            throw new InvalidOperationException("resolved path is empty/invalid");

        var root = Path.GetPathRoot(cleaned);
        if (cleaned == root)
            throw new InvalidOperationException("resolved path is root and is not allowed");

        return cleaned;
    }

    // ---------------------------
    // Config normalization + getters
    // ---------------------------
    private static Dictionary<string, object?>? NormalizeConfigMap(object? raw)
    {
        if (raw is null) return null;

        if (raw is Dictionary<string, object?> d1) return d1;

        if (raw is Dictionary<object, object> d2)
        {
            var outMap = new Dictionary<string, object?>();
            foreach (var (k, v) in d2)
            {
                var key = Convert.ToString(k);
                if (string.IsNullOrWhiteSpace(key)) continue;
                outMap[key] = v;
            }
            return outMap;
        }

        return null;
    }

    private static string GetString(Dictionary<string, object?> cfg, string key)
        => cfg.TryGetValue(key, out var v) ? (Convert.ToString(v) ?? "") : "";

    private static bool GetBool(Dictionary<string, object?> cfg, string key)
    {
        if (!cfg.TryGetValue(key, out var v) || v is null) return false;
        if (v is bool b) return b;
        if (v is string s && bool.TryParse(s, out var parsed)) return parsed;
        return false;
    }
}

using System.Collections.Concurrent;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace PocketSsot.Infrastructure;

public class YamlStore
{
    private readonly string _baseDir;
    private readonly string _extension;

    private readonly IDeserializer _deserializer;
    private readonly ISerializer _serializer;

    private readonly ConcurrentDictionary<string, object> _fileLocks = new();

    public YamlStore(IConfiguration config)
    {
        _baseDir = config["YamlStore:BaseDir"] ?? "/var/lib/pocket-ssot";

        var ext = config["YamlStore:Extension"]?.Trim().TrimStart('.');
        _extension = ext == "yml" ? "yml" : "yaml"; // default + sanitize

        Directory.CreateDirectory(_baseDir);

        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        _serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
    }

    private object GetLock(string path)
        => _fileLocks.GetOrAdd(path, _ => new object());

    private T? Load<T>(string path)
    {
        if (!File.Exists(path))
            return default;

        var yaml = File.ReadAllText(path);
        return _deserializer.Deserialize<T>(yaml);
    }

    private void SaveAtomic<T>(string path, T item)
    {
        var yaml = _serializer.Serialize(item);
        var tmp = path + ".tmp";

        File.WriteAllText(tmp, yaml);
        File.Move(tmp, path, overwrite: true);
    }

    private string GetPath<T>(string name, T item, Func<T, string> keySelector)
    {
        var key = keySelector(item);
        if (typeof(T) == typeof(PocketSsot.Models.Entity))
        {
            var entity = item as PocketSsot.Models.Entity;
            return Path.Combine(_baseDir, name, entity!.CollectionId, $"{key}.{_extension}");
        }
        else if (typeof(T) == typeof(PocketSsot.Models.ReleaseRecord))
        {
            var release = item as PocketSsot.Models.ReleaseRecord;
            var sub = name.Split('/')[1];
            var id = release!.EntityId ?? release.CollectionId;
            return Path.Combine(_baseDir, "releases", sub, id, $"{key}.{_extension}");
        }
        else
        {
            return Path.Combine(_baseDir, name, $"{key}.{_extension}");
        }
    }



    // ---------- Public API ----------

    public T? Find<T>(string name, Func<T, bool> predicate)
    {
        return List<T>(name).FirstOrDefault(predicate);
    }

    public List<T> List<T>(string name, Func<T, bool>? predicate = null)
    {
        var dir = Path.Combine(_baseDir, name);
        if (!Directory.Exists(dir)) return new List<T>();

        var useAll = name.Contains("releases/") || name == "entities";
        var files = Directory.GetFiles(dir, $"*.{_extension}", useAll ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly);

        var items = new List<T>();
        foreach (var file in files)
        {
            var item = Load<T>(file);
            if (item != null) items.Add(item);
        }

        return predicate is null
            ? items
            : items.Where(predicate).ToList();
    }

    public void Insert<T>(string name, T item, Func<T, string> keySelector)
    {
        var path = GetPath(name, item, keySelector);

        lock (GetLock(path))
        {
            if (File.Exists(path))
                throw new InvalidOperationException($"Item '{keySelector(item)}' already exists.");

            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            SaveAtomic(path, item);
        }
    }

    public bool Update<T>(
        string name,
        Func<T, string> keySelector,
        string key,
        Action<T> mutate)
    {
        if (typeof(T) == typeof(PocketSsot.Models.Entity) || typeof(T) == typeof(PocketSsot.Models.ReleaseRecord))
        {
            // Need to find first to get collectionid or entityid
            var items = List<T>(name);
            var item = items.FirstOrDefault(x => keySelector(x) == key);
            if (item is null) return false;

            mutate(item);
            var path = GetPath(name, item, keySelector);

            lock (GetLock(path))
            {
                SaveAtomic(path, item);
            }
            return true;
        }
        else
        {
            var path = Path.Combine(_baseDir, name, $"{key}.{_extension}");

            lock (GetLock(path))
            {
                var item = Load<T>(path);
                if (item is null) return false;

                mutate(item);
                SaveAtomic(path, item);
                return true;
            }
        }
    }

    public bool Delete<T>(string name, Func<T, string> keySelector, string key)
    {
        if (typeof(T) == typeof(PocketSsot.Models.Entity) || typeof(T) == typeof(PocketSsot.Models.ReleaseRecord))
        {
            // Need to find first to get collectionid or entityid
            var items = List<T>(name);
            var item = items.FirstOrDefault(x => keySelector(x) == key);
            if (item is null) return false;

            var path = GetPath(name, item, keySelector);

            lock (GetLock(path))
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                    return true;
                }
                return false;
            }
        }
        else
        {
            var path = Path.Combine(_baseDir, name, $"{key}.{_extension}");

            lock (GetLock(path))
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                    return true;
                }
                return false;
            }
        }
    }
}

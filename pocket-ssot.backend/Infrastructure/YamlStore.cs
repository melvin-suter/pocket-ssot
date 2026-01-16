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
        _baseDir = config["YamlStore:BaseDir"] ?? "/etc/pocket-ssot";

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

    private string ResolvePath(string name)
        => Path.Combine(_baseDir, $"{name}.{_extension}");

    private object GetLock(string path)
        => _fileLocks.GetOrAdd(path, _ => new object());

    private YamlDocument<T> Load<T>(string path)
    {
        if (!File.Exists(path))
            return new YamlDocument<T>();

        var yaml = File.ReadAllText(path);
        return _deserializer.Deserialize<YamlDocument<T>>(yaml)
               ?? new YamlDocument<T>();
    }

    private void SaveAtomic<T>(string path, YamlDocument<T> doc)
    {
        var yaml = _serializer.Serialize(doc);
        var tmp = path + ".tmp";

        File.WriteAllText(tmp, yaml);
        File.Move(tmp, path, overwrite: true);
    }

    // ---------- Public API ----------

    public T? Find<T>(string name, Func<T, bool> predicate)
    {
        var path = ResolvePath(name);

        lock (GetLock(path))
        {
            var doc = Load<T>(path);
            return doc.Items.FirstOrDefault(predicate);
        }
    }

    public List<T> List<T>(string name, Func<T, bool>? predicate = null)
    {
        var path = ResolvePath(name);

        lock (GetLock(path))
        {
            var doc = Load<T>(path);
            return predicate is null
                ? doc.Items.ToList()
                : doc.Items.Where(predicate).ToList();
        }
    }

    public void Insert<T>(string name, T item, Func<T, string> keySelector)
    {
        var path = ResolvePath(name);

        lock (GetLock(path))
        {
            var doc = Load<T>(path);
            var key = keySelector(item);

            if (doc.Items.Any(x => keySelector(x) == key))
                throw new InvalidOperationException($"Item '{key}' already exists.");

            doc.Items.Add(item);
            SaveAtomic(path, doc);
        }
    }

    public bool Update<T>(
        string name,
        Func<T, string> keySelector,
        string key,
        Action<T> mutate)
    {
        var path = ResolvePath(name);

        lock (GetLock(path))
        {
            var doc = Load<T>(path);
            var item = doc.Items.FirstOrDefault(x => keySelector(x) == key);
            if (item is null) return false;

            mutate(item);
            SaveAtomic(path, doc);
            return true;
        }
    }

    public bool Delete<T>(string name, Func<T, string> keySelector, string key)
    {
        var path = ResolvePath(name);

        lock (GetLock(path))
        {
            var doc = Load<T>(path);
            var idx = doc.Items.FindIndex(x => keySelector(x) == key);
            if (idx < 0) return false;

            doc.Items.RemoveAt(idx);
            SaveAtomic(path, doc);
            return true;
        }
    }
}

// Generic document wrapper
public class YamlDocument<T>
{
    public List<T> Items { get; set; } = new();
}

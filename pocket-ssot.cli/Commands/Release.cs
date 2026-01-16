using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using System.IO;
using PocketSsot.Infrastructure;
using System;
using System.Net.Http;
using System.Text.Json;

namespace PocketSsot.Commands;

public class Release {
    public static string run(ConfigSet config, string[] args) {
        if(args.Length < 2) {
            return "NOT ENOUGH ARGUMENTS";
        }

        string port = config.Config.TryGetValue("localhostPort", out var p) && !string.IsNullOrEmpty(p) ? p : "5001";

        switch(args[0]) {
            case "collections":
                if(args.Length < 2) return "NOT ENOUGH ARGUMENTS";
                string collectionId = GetCollectionId(config, args[1]);
                string url = $"http://127.0.0.1:{port}/api/release/{collectionId}";
                if(args.Length >= 3) url += $"?releaseChannelId={args[2]}";
                return CallApi(url);
            case "entities":
                if(args.Length < 2) return "NOT ENOUGH ARGUMENTS";
                string entityId = GetEntityId(config, args[1]);
                string url2 = $"http://127.0.0.1:{port}/api/release-entity/{entityId}";
                if(args.Length >= 3) url2 += $"?releaseChannelId={args[2]}";
                return CallApi(url2);
            default:
                return "type not found";
                
        }
    }

    private static string CallApi(string url) {
        using var client = new HttpClient();
        try {
            var response = client.PostAsync(url, null).Result;
            if(response.IsSuccessStatusCode) {
                var content = response.Content.ReadAsStringAsync().Result;
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;
                bool ok = root.GetProperty("ok").GetBoolean();
                string status = ok ? "done" : "failed";
                string releaseId = root.GetProperty("release_id").GetString();
                string name = root.GetProperty("name").GetString();
                string id = root.TryGetProperty("collection_id", out var cid) ? cid.GetString() : root.GetProperty("entity_id").GetString();
                var result = $"{status}\nrelease_id: {releaseId}\nname: {name}\nid: {id}";
                if (!ok) {
                    var results = root.GetProperty("results");
                    var errors = new List<string>();
                    foreach (var res in results.EnumerateArray()) {
                        if (!res.GetProperty("status").GetBoolean()) {
                            var error = res.GetProperty("error");
                            if (error.ValueKind != JsonValueKind.Null && !string.IsNullOrEmpty(error.GetString())) {
                                errors.Add(error.GetString());
                            }
                        }
                    }
                    if (errors.Any()) {
                        result += "\nerrors:\n" + string.Join("\n", errors);
                    }
                }
                return result;
            } else {
                return $"Error: {response.StatusCode} {response.ReasonPhrase}";
            }
        } catch(Exception ex) {
            return $"Exception: {ex.Message}";
        }
    }

    private static string GetCollectionId(ConfigSet config, string idOrName)
    {
        string basePath = config.StorePath + "/collections";
        var files = Directory.GetFiles(basePath, "*.yml");
        foreach (var file in files)
        {
            var yamlText = File.ReadAllText(file);
            var deserializer = new DeserializerBuilder().Build();
            var raw = deserializer.Deserialize<Dictionary<string, object>>(yamlText);
            var itemData = new Dictionary<string, object>(raw, StringComparer.OrdinalIgnoreCase);
            if (itemData.TryGetValue("id", out var idObj) && idObj?.ToString()?.Equals(idOrName, StringComparison.OrdinalIgnoreCase) == true)
            {
                return idObj.ToString();
            }
            if (itemData.TryGetValue("name", out var nameObj) && nameObj?.ToString()?.Equals(idOrName, StringComparison.OrdinalIgnoreCase) == true)
            {
                return itemData["id"].ToString();
            }
        }
        // If not found, assume it's an ID
        return idOrName;
    }

    private static string GetEntityId(ConfigSet config, string idOrName)
    {
        string basePath = config.StorePath + "/entities";
        if(Directory.Exists(basePath)){
            foreach(var collectionDir in Directory.GetDirectories(basePath)){
                var files = Directory.GetFiles(collectionDir, "*.yml");
                foreach(var file in files){
                    var yamlText = File.ReadAllText(file);
                    var deserializer = new DeserializerBuilder().Build();
                    var raw = deserializer.Deserialize<Dictionary<string, object>>(yamlText);
                    var itemData = new Dictionary<string, object>(raw, StringComparer.OrdinalIgnoreCase);
                    if (itemData.TryGetValue("id", out var idObj) && idObj?.ToString()?.Equals(idOrName, StringComparison.OrdinalIgnoreCase) == true)
                    {
                        return idObj.ToString();
                    }
                    if (itemData.TryGetValue("name", out var nameObj) && nameObj?.ToString()?.Equals(idOrName, StringComparison.OrdinalIgnoreCase) == true)
                    {
                        return itemData["id"].ToString();
                    }
                }
            }
        }
        return idOrName; // assume ID
    }
}

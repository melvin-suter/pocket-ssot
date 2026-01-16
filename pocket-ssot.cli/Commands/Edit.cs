using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using System.IO;
using PocketSsot.Infrastructure;
using System.Diagnostics;
using System;

namespace PocketSsot.Commands;

public class Edit {
    public static string run(ConfigSet config, string[] args) {
        if(args.Length < 2) {
            return "NOT ENOUGH ARGUMENTS";
        }

        string type = args[0];
        string idOrName = args[1];

        if(type == "entities" && idOrName.Contains("/")) {
            string[] parts = idOrName.Split('/');
            if(parts.Length == 2) {
                string collectionIdOrName = parts[0];
                string entityIdOrName = parts[1];
                string collectionId = GetCollectionId(config, collectionIdOrName);
                string basePath = config.StorePath + "/entities/" + collectionId;
                var files = Directory.GetFiles(basePath, "*.yml");
                foreach (var file in files) {
                    var yamlText = File.ReadAllText(file);
                    var deserializer = new DeserializerBuilder().Build();
                    var raw = deserializer.Deserialize<Dictionary<string, object>>(yamlText);
                    var itemData = new Dictionary<string, object>(raw, StringComparer.OrdinalIgnoreCase);
                    if (itemData.TryGetValue("id", out var idObj) && idObj?.ToString()?.Equals(entityIdOrName, StringComparison.OrdinalIgnoreCase) == true) {
                        OpenInVimAndWait(file);
                        return "done";
                    }
                    if (itemData.TryGetValue("name", out var nameObj) && nameObj?.ToString()?.Equals(entityIdOrName, StringComparison.OrdinalIgnoreCase) == true) {
                        OpenInVimAndWait(file);
                        return "done";
                    }
                }
                return "Entity not found";
            }
        }

        try {
            string filePath = FindFile(config, type, idOrName);
            OpenInVimAndWait(filePath);
            return "done";
        } catch (FileNotFoundException e) {
            return e.Message;
        }
    }

    private static string FindFile(ConfigSet config, string type, string idOrName)
    {
        string basePath = config.StorePath + "/" + type;
        var files = Directory.GetFiles(basePath, "*.yml", SearchOption.AllDirectories);
        foreach (var file in files)
        {
            var yamlText = File.ReadAllText(file);
            var deserializer = new DeserializerBuilder().Build();
            var raw = deserializer.Deserialize<Dictionary<string, object>>(yamlText);
            var itemData = new Dictionary<string, object>(raw, StringComparer.OrdinalIgnoreCase);
            if (itemData.TryGetValue("id", out var idObj) && idObj.ToString().Equals(idOrName, StringComparison.OrdinalIgnoreCase))
            {
                return file;
            }
            if (itemData.TryGetValue("name", out var nameObj) && nameObj.ToString().Equals(idOrName, StringComparison.OrdinalIgnoreCase))
            {
                return file;
            }
        }
        throw new FileNotFoundException($"No {type} found with id or name '{idOrName}'");
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

    private static void OpenInVimAndWait(string filePath)
    {
        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "vim",
                Arguments = filePath,
                UseShellExecute = false
            }
        };

        process.Start();
        process.WaitForExit();
    }
}

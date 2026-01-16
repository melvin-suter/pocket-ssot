using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using System.IO;
using PocketSsot.Infrastructure;
using System;

namespace PocketSsot.Commands;

public class List {
    public static string run(ConfigSet config, string[] args) {
        if(args.Length < 1) {
            return "NOT ENOUGH ARGUMENTS";
        }

        switch(args[0]) {
            case "collections":
                return getItemTable([config.StorePath + "/collections"]);
            case "policies":
                return getItemTable([config.StorePath + "/policies"]);
            case "release-channels":
                return getItemTable([config.StorePath + "/release-channels"]);
            case "entities":
                if(args.Length < 2) {
                    // Nothing specified, showing ALL entities
                    if(Directory.Exists(config.StorePath + "/entities")){
                        return getItemTable(
                            Directory.GetDirectories(config.StorePath + "/entities"),
                            ["ID","Name","CollectionID"]
                        );
                    }
                    return "No entities yet"; 
                } else {
                    // Only showing entities for one collection
                    string collectionId = GetCollectionId(config, args[1]);
                    return getItemTable([config.StorePath + "/entities/" + collectionId], ["ID","Name","CollectionID"]);
                }
                

            default:
                return "type not found";
                
        }
    }

    private static string getItemTable(string[] dirPaths, string[]? columns = null)
    {
        columns ??= new[] { "ID", "Name" };

        // Create Data For table printer
        var tableData = new List<string[]>
        {
            columns
        };

        foreach(string dir in dirPaths){
            if(Directory.Exists(dir)){
                // Get files
                List<string[]> items = getItems(dir, columns);
                tableData.AddRange(items);
            }
        }
        
        // Return a pretty table
        return TablePrinter.Build(tableData);
    }

    private static List<string[]> getItems(string dirPath, string[] columns) {
        List<string[]> result = new List<string[]>();

        if(Directory.Exists(dirPath)){
            foreach (var file in Directory.GetFiles(dirPath))
            {
                var yamlText = File.ReadAllText(file);

                var deserializer = new DeserializerBuilder().Build();

                var raw = deserializer.Deserialize<Dictionary<string, object>>(yamlText);

                var itemData = new Dictionary<string, object>(
                    raw,
                    StringComparer.OrdinalIgnoreCase
                );

                var row = new List<string>();
                foreach(var key in columns) {
                    row.Add(((string)itemData[key.ToLower()]).ToLower());
                }
                result.Add(row.ToArray());
            }
        }

        return result;
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
}

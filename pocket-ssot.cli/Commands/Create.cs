using System.IO;
using PocketSsot.Infrastructure;
using System.Diagnostics;
using System;

namespace PocketSsot.Commands;

public class Create {
    public static string run(ConfigSet config, string[] args) {
        if(args.Length < 1) {
            return "NOT ENOUGH ARGUMENTS";
        }

        string type = args[0];
        string id = Guid.NewGuid().ToString();
        string path;

        if(type == "entities"){
            if(args.Length < 2){
                return "For entities, provide collection id";
            }
            string collection = args[1];
            path = config.StorePath + "/entities/" + collection + "/" + id + ".yml";
        } else {
            path = config.StorePath + "/" + type + "/" + id + ".yml";
        }

        Directory.CreateDirectory(Path.GetDirectoryName(path));
        // Pre-populate the file with id
        using (StreamWriter writer = new StreamWriter(path))
        {
            writer.WriteLine($"id: {id}");
            if(type == "entities") {
                writer.WriteLine($"collectionId: {args[1]}");
            }
        }
        OpenInVimAndWait(path);
        // Check if file was not modified (user quit without saving)
        string content = File.ReadAllText(path);
        string expected = $"id: {id}\n";
        if(type == "entities") {
            expected += $"collectionId: {args[1]}\n";
        }
        if(content == expected) {
            File.Delete(path);
        }
        return "done";
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
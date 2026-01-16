using Microsoft.Extensions.Configuration;
using PocketSsot.Infrastructure;
using PocketSsot.Commands;

// Build Config
ConfigSet config = Config.GetConfig();

// Checking on commands
if (args.Length == 0)
{
    Console.WriteLine("No command provided");
    return;
}

// App
switch(args[0]){
    case "list":
        Console.Write(List.run(config, args.Skip(1).ToArray()) + "\n");
        break;
    case "show":
        Console.Write(Show.run(config, args.Skip(1).ToArray()) + "\n");
        break;
    case "edit":
        Console.Write(Edit.run(config, args.Skip(1).ToArray()) + "\n");
        break;
    case "create":
        Console.Write(Create.run(config, args.Skip(1).ToArray()) + "\n");
        break;
    case "release":
        Console.Write(Release.run(config, args.Skip(1).ToArray()) + "\n");
        break;
}


using System.Text.Json;
using System.Text.Json.Serialization;

namespace PocketSsot.Infrastructure;

public sealed class ClrObjectJsonConverter : JsonConverter<object?>
{
    public override object? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var doc = JsonDocument.ParseValue(ref reader);
        return ToClr(doc.RootElement);
    }

    private static object? ToClr(JsonElement el)
    {
        return el.ValueKind switch
        {
            JsonValueKind.Object => el.EnumerateObject()
                .ToDictionary(p => p.Name, p => ToClr(p.Value)),

            JsonValueKind.Array => el.EnumerateArray()
                .Select(ToClr).ToList(),

            JsonValueKind.String => el.GetString(),
            JsonValueKind.Number => el.TryGetInt64(out var l) ? l : el.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Undefined => null,

            _ => el.GetRawText()
        };
    }

    public override void Write(Utf8JsonWriter writer, object? value, JsonSerializerOptions options)
        => JsonSerializer.Serialize(writer, value, value?.GetType() ?? typeof(object), options);
}

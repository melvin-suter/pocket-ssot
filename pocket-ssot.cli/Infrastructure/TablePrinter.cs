using System.Text;

namespace PocketSsot.Infrastructure;

public static class TablePrinter
{
    public static string Build(List<string[]> rows)
    {
        if (rows == null || rows.Count == 0)
            return string.Empty;

        int columnCount = rows[0].Length;

        // Validate rows
        foreach (var row in rows)
        {
            if (row.Length != columnCount)
                throw new ArgumentException("All rows must have the same number of columns.");
        }

        // Calculate column widths
        int[] widths = new int[columnCount];
        for (int col = 0; col < columnCount; col++)
        {
            widths[col] = rows.Max(r => r[col]?.Length ?? 0);
        }

        var sb = new StringBuilder();

        AppendSeparator(sb, widths);
        AppendRow(sb, rows[0], widths);
        AppendSeparator(sb, widths);

        for (int i = 1; i < rows.Count; i++)
        {
            AppendRow(sb, rows[i], widths);
        }

        AppendSeparator(sb, widths);

        return sb.ToString();
    }

    private static void AppendRow(StringBuilder sb, string[] row, int[] widths)
    {
        for (int i = 0; i < row.Length; i++)
        {
            sb.Append("| ");
            sb.Append((row[i] ?? "").PadRight(widths[i]));
            sb.Append(" ");
        }
        sb.AppendLine("|");
    }

    private static void AppendSeparator(StringBuilder sb, int[] widths)
    {
        foreach (var w in widths)
        {
            sb.Append("+");
            sb.Append(new string('-', w + 2));
        }
        sb.AppendLine("+");
    }
}
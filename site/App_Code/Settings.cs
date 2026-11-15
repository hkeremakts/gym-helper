using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Web;
using System.Xml;

/// <summary>
/// Reads App_Data\settings.config directly (not through web.config), and re-reads it whenever the file
/// changes, so edits on the server take effect without restarting the site.
/// </summary>
public static class Settings
{
    static readonly object Lock = new object();
    static Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    static DateTime loadedStamp = DateTime.MinValue;
    static long loadedLength = -1;
    static string loadError = "not loaded yet";

    public static string FilePath { get { return Path.Combine(HttpRuntime.AppDomainAppPath, "App_Data", "settings.config"); } }

    /// <summary>Null when the file was read fine; otherwise what is wrong with it (never its contents).</summary>
    public static string LoadError { get { Load(); return loadError; } }

    public static ICollection<string> KeysFound { get { Load(); lock (Lock) return new List<string>(values.Keys); } }

    static void Load()
    {
        FileInfo fi = new FileInfo(FilePath);
        lock (Lock)
        {
            if (!fi.Exists)
            {
                values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                loadedStamp = DateTime.MinValue; loadedLength = -1;
                loadError = "App_Data\\settings.config does not exist.";
                return;
            }
            if (fi.LastWriteTimeUtc == loadedStamp && fi.Length == loadedLength) return;

            var fresh = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                XmlDocument doc = new XmlDocument();
                doc.XmlResolver = null;
                doc.Load(fi.FullName);
                foreach (XmlNode n in doc.SelectNodes("//add"))
                {
                    XmlAttribute k = n.Attributes["key"], v = n.Attributes["value"];
                    if (k != null && v != null) fresh[k.Value.Trim()] = v.Value.Trim();
                }
                loadError = fresh.Count == 0 ? "The file has no <add key=\"…\" value=\"…\" /> lines." : null;
            }
            catch (XmlException e)
            {
                // Position only, never the content. The usual cause is & < or " inside a value.
                loadError = string.Format(CultureInfo.InvariantCulture,
                    "The file is not valid XML (line {0}, position {1}). A value probably contains & < or \" — write & as &amp; < as &lt; and \" as &quot;.",
                    e.LineNumber, e.LinePosition);
            }
            catch (Exception e)
            {
                loadError = "The file could not be read: " + e.GetType().Name;
            }
            values = fresh;
            loadedStamp = fi.LastWriteTimeUtc;
            loadedLength = fi.Length;
        }
    }

    static string Get(string key, string fallback)
    {
        Load();
        string v;
        lock (Lock) { if (!values.TryGetValue(key, out v)) v = null; }
        return string.IsNullOrEmpty(v) ? fallback : v;
    }

    static int GetInt(string key, int fallback)
    {
        int n;
        return int.TryParse(Get(key, ""), NumberStyles.Integer, CultureInfo.InvariantCulture, out n) ? n : fallback;
    }

    public static string ConnectionString { get { return Get("ConnectionString", ""); } }
    public static string EnrollKey { get { return Get("EnrollKey", ""); } }
    public static bool EnrollOpen { get { return string.Equals(Get("EnrollOpen", "false"), "true", StringComparison.OrdinalIgnoreCase); } }
    public static int MaxDevices { get { return GetInt("MaxDevices", 3); } }
    public static string CookieName { get { return Get("CookieName", "gym_device"); } }
    public static int CookieDays { get { return GetInt("CookieDays", 390); } }

    /// <summary>True when the file has the values the site cannot run without.</summary>
    public static bool IsConfigured
    {
        get { return ConnectionString.Length > 0 && EnrollKey.Length >= 32 && EnrollKey.IndexOf("REPLACE", StringComparison.Ordinal) < 0; }
    }
}

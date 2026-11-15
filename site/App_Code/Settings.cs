using System;
using System.Configuration;
using System.Globalization;

/// <summary>Reads values from App_Data\settings.config (merged into appSettings by web.config).</summary>
public static class Settings
{
    static string Get(string key, string fallback)
    {
        string v = ConfigurationManager.AppSettings[key];
        return string.IsNullOrEmpty(v) ? fallback : v.Trim();
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

    /// <summary>True when the settings file exists and has the values the site cannot run without.</summary>
    public static bool IsConfigured
    {
        get { return ConnectionString.Length > 0 && EnrollKey.Length >= 32 && EnrollKey.IndexOf("REPLACE", StringComparison.Ordinal) < 0; }
    }
}

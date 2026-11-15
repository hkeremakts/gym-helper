using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Web;
using System.Web.Script.Serialization;

/// <summary>Thrown for bad input; becomes a 400 (or the given status) with the message as JSON.</summary>
public class ApiException : Exception
{
    public int Status;
    public ApiException(string message) : base(message) { Status = 400; }
    public ApiException(int status, string message) : base(message) { Status = status; }
}

public static class Http
{
    static JavaScriptSerializer NewSerializer()
    {
        JavaScriptSerializer s = new JavaScriptSerializer();
        s.MaxJsonLength = 50 * 1024 * 1024;
        s.RecursionLimit = 64;
        return s;
    }

    public static void NoCache(HttpResponse r)
    {
        r.Cache.SetCacheability(HttpCacheability.NoCache);
        r.Cache.SetNoStore();
        r.AppendHeader("Pragma", "no-cache");
    }

    public static void Json(HttpContext ctx, object data, int status)
    {
        HttpResponse r = ctx.Response;
        r.TrySkipIisCustomErrors = true;
        r.StatusCode = status;
        r.ContentType = "application/json";
        r.ContentEncoding = Encoding.UTF8;
        NoCache(r);
        r.Write(NewSerializer().Serialize(data));
    }

    public static void Json(HttpContext ctx, object data) { Json(ctx, data, 200); }

    public static void Error(HttpContext ctx, int status, string message)
    {
        Dictionary<string, object> d = new Dictionary<string, object>();
        d["error"] = message;
        Json(ctx, d, status);
    }

    public static void Text(HttpContext ctx, int status, string text)
    {
        HttpResponse r = ctx.Response;
        r.Clear();
        r.TrySkipIisCustomErrors = true;
        r.StatusCode = status;
        r.ContentType = "text/plain";
        r.ContentEncoding = Encoding.UTF8;
        NoCache(r);
        r.Write(text);
    }

    public static void Forbidden(HttpContext ctx) { Text(ctx, 403, "Forbidden"); }

    public static Dictionary<string, object> ReadBody(HttpContext ctx)
    {
        string body;
        using (StreamReader sr = new StreamReader(ctx.Request.InputStream, Encoding.UTF8))
        {
            body = sr.ReadToEnd();
        }
        if (body.Trim().Length == 0) return new Dictionary<string, object>();
        object o;
        try { o = NewSerializer().DeserializeObject(body); }
        catch (Exception) { throw new ApiException("Invalid JSON."); }
        Dictionary<string, object> d = o as Dictionary<string, object>;
        if (d == null) throw new ApiException("Expected a JSON object.");
        return d;
    }

    // ---- Reading values out of a parsed JSON object -------------------------------------------

    public static object Raw(Dictionary<string, object> d, string key)
    {
        object v;
        return (d != null && d.TryGetValue(key, out v)) ? v : null;
    }

    public static string Str(Dictionary<string, object> d, string key, int maxLen)
    {
        object v = Raw(d, key);
        if (v == null) return null;
        string s = Convert.ToString(v, CultureInfo.InvariantCulture).Trim();
        if (s.Length == 0) return null;
        if (s.Length > maxLen) throw new ApiException(string.Format("'{0}' is longer than {1} characters.", key, maxLen));
        return s;
    }

    /// <summary>Parses numbers sent as JSON numbers or strings; accepts a decimal comma.</summary>
    public static decimal? Dec(object v, string name)
    {
        if (v == null) return null;
        if (v is decimal) return (decimal)v;
        if (v is int) return (int)v;
        if (v is long) return (long)v;
        if (v is double) return (decimal)(double)v;
        string s = Convert.ToString(v, CultureInfo.InvariantCulture).Trim().Replace(',', '.');
        if (s.Length == 0) return null;
        decimal d;
        if (!decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out d))
            throw new ApiException(string.Format("'{0}' is not a number.", name));
        return d;
    }

    public static decimal? Dec(Dictionary<string, object> d, string key) { return Dec(Raw(d, key), key); }

    public static int? Int(Dictionary<string, object> d, string key)
    {
        decimal? v = Dec(d, key);
        if (v == null) return null;
        if (v.Value != decimal.Truncate(v.Value)) throw new ApiException(string.Format("'{0}' must be a whole number.", key));
        return (int)v.Value;
    }

    public static bool Bool(Dictionary<string, object> d, string key)
    {
        object v = Raw(d, key);
        if (v == null) return false;
        if (v is bool) return (bool)v;
        string s = Convert.ToString(v, CultureInfo.InvariantCulture);
        return s == "1" || string.Equals(s, "true", StringComparison.OrdinalIgnoreCase);
    }

    public static List<object> List(Dictionary<string, object> d, string key)
    {
        object v = Raw(d, key);
        if (v == null) return new List<object>();
        object[] arr = v as object[];
        if (arr != null) return new List<object>(arr);
        ArrayList al = v as ArrayList;
        if (al != null) return new List<object>(al.ToArray());
        throw new ApiException(string.Format("'{0}' must be a list.", key));
    }

    public static Dictionary<string, object> Obj(object v, string name)
    {
        Dictionary<string, object> d = v as Dictionary<string, object>;
        if (d == null) throw new ApiException(string.Format("'{0}' must be an object.", name));
        return d;
    }

    // ---- Query string ---------------------------------------------------------------------

    public static string Q(HttpContext ctx, string key) { string v = ctx.Request.QueryString[key]; return v == null ? null : v.Trim(); }

    public static int QInt(HttpContext ctx, string key, int fallback, int min, int max)
    {
        int n;
        if (!int.TryParse(Q(ctx, key), NumberStyles.Integer, CultureInfo.InvariantCulture, out n)) return fallback;
        return Math.Max(min, Math.Min(max, n));
    }

    // ---- Dates ----------------------------------------------------------------------------

    public static DateTime? ParseDate(string s, string name)
    {
        if (string.IsNullOrEmpty(s)) return null;
        DateTime d;
        if (!DateTime.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out d))
            throw new ApiException(string.Format("'{0}' must be a date like 2026-11-15.", name));
        return d.Date;
    }

    public static DateTime? ParseUtc(string s, string name)
    {
        if (string.IsNullOrEmpty(s)) return null;
        DateTime d;
        if (!DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out d))
            throw new ApiException(string.Format("'{0}' must be a date and time.", name));
        return DateTime.SpecifyKind(d, DateTimeKind.Utc);
    }

    public static string DateStr(object v)
    {
        if (v == null || v is DBNull) return null;
        return ((DateTime)v).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    public static string UtcStr(object v)
    {
        if (v == null || v is DBNull) return null;
        return DateTime.SpecifyKind((DateTime)v, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
    }
}

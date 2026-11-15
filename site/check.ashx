<%@ WebHandler Language="C#" Class="CheckHandler" %>

using System;
using System.Text;
using System.Web;

/// <summary>
/// TEMPORARY setup diagnostic (remove before going live, PLAN Phase 8).
///   /check.ashx            -> only says whether the settings file was found
///   /check.ashx?key=KEY    -> full report: settings, database, devices, and this browser's cookie
/// Never prints the key, the connection string or a token.
/// </summary>
public class CheckHandler : IHttpHandler
{
    public bool IsReusable { get { return true; } }

    public void ProcessRequest(HttpContext ctx)
    {
        StringBuilder sb = new StringBuilder();
        bool hasConn = Settings.ConnectionString.Length > 0;
        string err = Settings.LoadError;
        sb.AppendLine("Settings file: " + (err == null ? "read OK" : "PROBLEM — " + err));
        if (err != null)
        {
            // File names only (never contents), to catch things like settings.config.txt
            try
            {
                string dir = System.IO.Path.GetDirectoryName(Settings.FilePath);
                sb.AppendLine("Files in App_Data: " + string.Join(", ", System.Array.ConvertAll(System.IO.Directory.GetFiles(dir), f => System.IO.Path.GetFileName(f))));
            }
            catch (Exception) { sb.AppendLine("Files in App_Data: (could not list)"); }
        }
        else sb.AppendLine("Keys found: " + string.Join(", ", new System.Collections.Generic.List<string>(Settings.KeysFound).ToArray()));

        string key = Http.Q(ctx, "key");
        if (string.IsNullOrEmpty(key)) { Http.Text(ctx, 200, sb.ToString()); return; }
        if (!Auth.SameString(key, Settings.EnrollKey))
        {
            System.Threading.Thread.Sleep(1000);
            sb.AppendLine("Key: does NOT match EnrollKey in settings.config (check for spaces or a missing character).");
            Http.Text(ctx, 200, sb.ToString());
            return;
        }

        sb.AppendLine("Key: matches");
        sb.AppendLine("ConnectionString set: " + (hasConn ? "yes" : "NO"));
        sb.AppendLine("EnrollKey length: " + Settings.EnrollKey.Length + " (needs 32+, 64 recommended)");
        sb.AppendLine("Site counts as configured: " + (Settings.IsConfigured ? "yes" : "NO"));
        sb.AppendLine("EnrollOpen: " + Settings.EnrollOpen + "   MaxDevices: " + Settings.MaxDevices + "   CookieName: " + Settings.CookieName);
        sb.AppendLine("Request is HTTPS: " + ctx.Request.IsSecureConnection);

        HttpCookie c = ctx.Request.Cookies[Settings.CookieName];
        string cookieInfo = c == null ? "none" : ("present, length " + (c.Value == null ? 0 : c.Value.Length));
        sb.AppendLine("Device cookie sent by this browser: " + cookieInfo);
        string raw = ctx.Request.Headers["Cookie"];
        sb.AppendLine("Cookie header names: " + (raw == null ? "(no Cookie header)" : CookieNames(raw)));

        try
        {
            using (var conn = Db.Open())
            {
                sb.AppendLine("Database: connected, tables ready");
                sb.AppendLine("Workouts: " + Db.Scalar(conn, null, "SELECT COUNT(*) FROM workouts")
                    + "   exercises: " + Db.Scalar(conn, null, "SELECT COUNT(*) FROM exercises")
                    + "   templates: " + Db.Scalar(conn, null, "SELECT COUNT(*) FROM templates")
                    + "   sets: " + Db.Scalar(conn, null, "SELECT COUNT(*) FROM sets")
                    + "   body weights: " + Db.Scalar(conn, null, "SELECT COUNT(*) FROM body_weights"));
                sb.AppendLine("Enrolled devices: " + Db.Scalar(conn, null, "SELECT COUNT(*) FROM devices"));
                foreach (var r in Db.Rows(conn, null, "SELECT id, label, created_at, last_seen_at FROM devices ORDER BY id"))
                    sb.AppendLine("  #" + r["id"] + " " + r["label"] + "  created " + Http.UtcStr(r["created_at"]) + "  last seen " + (Http.UtcStr(r["last_seen_at"]) ?? "never"));
                if (c != null && c.Value != null && c.Value.Length == 64)
                {
                    object id = Db.Scalar(conn, null, "SELECT id FROM devices WHERE token_hash = @h", Db.P("@h", Auth.Sha256Hex(c.Value)));
                    sb.AppendLine("This browser's cookie matches device: " + (id == null ? "NO" : "#" + id));
                }
            }
        }
        catch (Exception e)
        {
            sb.AppendLine("Database: FAILED — " + e.Message);
        }
        try
        {
            string log = System.IO.Path.Combine(HttpRuntime.AppDomainAppPath, "App_Data", "errors.log");
            if (System.IO.File.Exists(log))
            {
                string[] lines = System.IO.File.ReadAllLines(log);
                sb.AppendLine("Last lines of App_Data\\errors.log:");
                for (int i = Math.Max(0, lines.Length - 12); i < lines.Length; i++) sb.AppendLine("  " + lines[i]);
            }
            else sb.AppendLine("errors.log: none");
        }
        catch (Exception e) { sb.AppendLine("errors.log: could not read (" + e.GetType().Name + ")"); }
        Http.Text(ctx, 200, sb.ToString());
    }

    static string CookieNames(string raw)
    {
        StringBuilder sb = new StringBuilder();
        foreach (string part in raw.Split(';'))
        {
            int eq = part.IndexOf('=');
            if (sb.Length > 0) sb.Append(", ");
            sb.Append((eq > 0 ? part.Substring(0, eq) : part).Trim());
        }
        return sb.ToString();
    }
}

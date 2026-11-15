<%@ WebHandler Language="C#" Class="EnrollHandler" %>

using System;
using System.Web;

/// <summary>
/// One-time device enrollment: /enroll.ashx?key=ENROLL_KEY&name=iPhone
/// Sets the device cookie and sends the browser to the app. Without the right key it is a plain 403.
/// </summary>
public class EnrollHandler : IHttpHandler
{
    public bool IsReusable { get { return true; } }

    public void ProcessRequest(HttpContext ctx)
    {
        if (!Settings.IsConfigured || !Settings.EnrollOpen) { Http.Forbidden(ctx); return; }

        string key = Http.Q(ctx, "key") ?? "";
        if (!Auth.SameString(key, Settings.EnrollKey))
        {
            System.Threading.Thread.Sleep(1000);
            Http.Forbidden(ctx);
            return;
        }

        // From here on the caller has the key, so errors may be explained.
        try
        {
            string label = (Http.Q(ctx, "name") ?? "").Trim();
            if (label.Length == 0) label = "Device";
            if (label.Length > 50) label = label.Substring(0, 50);

            using (var c = Db.Open())
            {
                HttpCookie existing = ctx.Request.Cookies[Settings.CookieName];
                if (existing != null && existing.Value != null && existing.Value.Length == 64 &&
                    Db.Scalar(c, null, "SELECT id FROM devices WHERE token_hash = @h", Db.P("@h", Auth.Sha256Hex(existing.Value))) != null)
                {
                    Done(ctx, "This browser is already enrolled.");
                    return;
                }

                int count = Convert.ToInt32(Db.Scalar(c, null, "SELECT COUNT(*) FROM devices"));
                if (count >= Settings.MaxDevices)
                {
                    Http.Text(ctx, 403, "Forbidden: the device limit (" + Settings.MaxDevices + ") is reached. Remove a device in the app's settings first.");
                    return;
                }

                string token = Auth.NewToken();
                Db.Exec(c, null, "INSERT INTO devices (label, token_hash, created_at) VALUES (@l, @h, @now)",
                    Db.P("@l", label), Db.P("@h", Auth.Sha256Hex(token)), Db.P("@now", DateTime.UtcNow));
                Auth.SetCookie(ctx, token);
                Done(ctx, "This browser is now enrolled as \"" + HttpUtility.HtmlEncode(label) + "\".");
            }
        }
        catch (Exception e)
        {
            Api.Log(e);
            Http.Text(ctx, 500, "Enrollment failed: " + e.Message);
        }
    }

    /// <summary>Small page that replaces itself with the app, so the key does not stay in the history.</summary>
    static void Done(HttpContext ctx, string message)
    {
        HttpResponse r = ctx.Response;
        r.StatusCode = 200;
        r.ContentType = "text/html";
        r.ContentEncoding = System.Text.Encoding.UTF8;
        Http.NoCache(r);
        r.Write("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\">"
            + "<title>Enrolled</title></head><body style=\"font:16px system-ui;padding:24px\"><p>" + message + "</p>"
            + "<p><a href=\"/\">Open the app</a></p><script>setTimeout(function(){location.replace('/')},1200)</script></body></html>");
    }
}

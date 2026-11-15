using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Web;

/// <summary>Device access: a random token in a long-lived cookie; only its SHA-256 hash is stored.</summary>
public static class Auth
{
    public static string Sha256Hex(string s)
    {
        using (SHA256 sha = SHA256.Create())
        {
            byte[] h = sha.ComputeHash(Encoding.UTF8.GetBytes(s));
            StringBuilder sb = new StringBuilder(64);
            foreach (byte b in h) sb.Append(b.ToString("x2", CultureInfo.InvariantCulture));
            return sb.ToString();
        }
    }

    public static string NewToken()
    {
        byte[] bytes = new byte[32];
        using (RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider()) rng.GetBytes(bytes);
        StringBuilder sb = new StringBuilder(64);
        foreach (byte b in bytes) sb.Append(b.ToString("x2", CultureInfo.InvariantCulture));
        return sb.ToString();
    }

    /// <summary>Compares two strings in time that does not depend on where they differ.</summary>
    public static bool SameString(string a, string b)
    {
        if (a == null || b == null) return false;
        byte[] x = Encoding.UTF8.GetBytes(a), y = Encoding.UTF8.GetBytes(b);
        int diff = x.Length ^ y.Length;
        for (int i = 0; i < Math.Max(x.Length, y.Length); i++)
        {
            byte bx = i < x.Length ? x[i] : (byte)0;
            byte by = i < y.Length ? y[i] : (byte)0;
            diff |= bx ^ by;
        }
        return diff == 0;
    }

    /// <summary>
    /// Writes the device cookie. Set by hand so SameSite works on every .NET 4.x patch level.
    /// SameSite=Lax (not Strict) so opening the site from a link in another app still sends it;
    /// writes are protected separately (POST + JSON + X-Gym header).
    /// </summary>
    public static void SetCookie(HttpContext ctx, string token)
    {
        string expires = DateTime.UtcNow.AddDays(Settings.CookieDays).ToString("R", CultureInfo.InvariantCulture);
        ctx.Response.AppendHeader("Set-Cookie", string.Format(
            "{0}={1}; Expires={2}; Path=/; Secure; HttpOnly; SameSite=Lax", Settings.CookieName, token, expires));
    }

    static string TokenFromRequest(HttpContext ctx)
    {
        HttpCookie c = ctx.Request.Cookies[Settings.CookieName];
        if (c == null || string.IsNullOrEmpty(c.Value) || c.Value.Length != 64) return null;
        return c.Value;
    }

    /// <summary>
    /// Returns the device id, or 0 after writing a plain 403. With renew=true the cookie's expiry is
    /// pushed forward (used when the app page is opened).
    /// </summary>
    public static int RequireDevice(HttpContext ctx, bool renew)
    {
        string token = TokenFromRequest(ctx);
        if (token == null || !Settings.IsConfigured) { Http.Forbidden(ctx); return 0; }

        using (var c = Db.Open())
        {
            object id = Db.Scalar(c, null, "SELECT id FROM devices WHERE token_hash = @h", Db.P("@h", Sha256Hex(token)));
            if (id == null) { Http.Forbidden(ctx); return 0; }
            int deviceId = Convert.ToInt32(id);
            Db.Exec(c, null,
                "UPDATE devices SET last_seen_at = @now WHERE id = @id AND (last_seen_at IS NULL OR last_seen_at < DATEADD(minute, -5, @now))",
                Db.P("@now", DateTime.UtcNow), Db.P("@id", deviceId));
            if (renew) SetCookie(ctx, token);
            return deviceId;
        }
    }
}

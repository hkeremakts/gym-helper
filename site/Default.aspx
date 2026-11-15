<%@ Page Language="C#" AutoEventWireup="false" EnableViewState="false" EnableSessionState="false" %>
<script runat="server">
    // Device gate: without a valid device cookie the page is a plain 403 and nothing below is sent.
    bool allowed;

    protected override void OnInit(EventArgs e)
    {
        base.OnInit(e);
        try { allowed = Auth.RequireDevice(Context, true) > 0; }
        catch (Exception ex) { Api.Log(ex); Http.Text(Context, 500, "Server error: " + ex.Message); allowed = false; }
        if (allowed) Http.NoCache(Response);
    }

    protected override void Render(HtmlTextWriter w) { if (allowed) base.Render(w); }

    // Cache-busting version for assets: the file's last change time.
    protected string V(string path)
    {
        string full = Server.MapPath("~/" + path);
        return System.IO.File.Exists(full) ? System.IO.File.GetLastWriteTimeUtc(full).Ticks.ToString() : "0";
    }
</script>
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f6f6f3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#151614" media="(prefers-color-scheme: dark)">
<title>Gym</title>
<link rel="stylesheet" href="/assets/app.css?v=<%= V("assets/app.css") %>">
</head>
<body>
<div id="app" class="app">
  <header class="topbar">
    <h1 id="view-title" class="topbar-title">Gym</h1>
    <div class="lang" role="group" aria-label="Language">
      <button type="button" data-lang="tr">TR</button>
      <button type="button" data-lang="en">EN</button>
    </div>
  </header>
  <div id="banner" class="banner" hidden></div>
  <main id="main" class="main" tabindex="-1"></main>
  <div id="restbar" class="restbar" hidden></div>
  <nav class="tabbar" aria-label="Sections">
    <button type="button" data-tab="log"></button>
    <button type="button" data-tab="history"></button>
    <button type="button" data-tab="stats"></button>
    <button type="button" data-tab="export"></button>
  </nav>
</div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="/assets/app.js?v=<%= V("assets/app.js") %>"></script>
</body>
</html>

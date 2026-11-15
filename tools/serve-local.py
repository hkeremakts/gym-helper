#!/usr/bin/env python3
"""Serve the frontend locally in demo mode (no .NET, no database).

    python3 tools/serve-local.py        then open http://localhost:8080

The page detects localhost and uses site/assets/mock.js, an in-memory fake API with made-up data.
Add ?reset to the URL to start over with fresh demo data.
"""
import http.server
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


def shell_html():
    """Default.aspx without its server-side parts."""
    with open(os.path.join(ROOT, "Default.aspx"), encoding="utf-8") as f:
        s = f.read()
    s = re.sub(r"<%@.*?%>", "", s, flags=re.S)
    s = re.sub(r'<script runat="server">.*?</script>', "", s, flags=re.S)
    s = re.sub(r"<%=.*?%>", "dev", s, flags=re.S)
    return s.strip().encode("utf-8")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/", "/Default.aspx"):
            body = shell_html()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if "App_Data" in path or "App_Code" in path or path.endswith((".config", ".cs", ".ashx")):
            self.send_error(403)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    print(f"Demo mode on http://localhost:{PORT}  (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()

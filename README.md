# gym-helper

A small, private workout tracker for your phone. No accounts and no login screen: only the few
browsers you enroll can open it; every other visitor gets `403 Forbidden`.

Built for ASP.NET (.NET Framework 4.8) on IIS — for example a Plesk for Windows hosting plan — with
SQL Server. No build step: IIS compiles the C# files on the first request, so deploying is just
copying files (or pushing to a Git repo that the hosting pulls from).

## Features

- Log workouts with one row per set (weight × reps, reps only, or time), prefilled from last time
- Optional templates (e.g. A / B); without one it is a "custom workout"
- Last time's sets, comment and your "next time" target under each exercise
- Rest time per set: built-in stopwatch, typed by hand, or left blank
- "Form broke" mark per set, a small ↑ when a set beats last time
- Workout duration and optional body weight
- Works with bad signal: saves are queued on the phone and sent later
- History, per-exercise history, and a few plain statistics
- **Copy for Claude:** formats the chosen workouts and your question as text to paste into a chat
- Turkish and English, switchable at the top
- JSON backup download

## Setup

1. **Database:** create an empty SQL Server database and a user for it. The tables are created
   automatically on first use.
2. **Files:** deploy the repo and point the site's document root at the `site/` folder.
3. **Settings:** on the server, copy `site/App_Data/settings.example.config` to
   `site/App_Data/settings.config` and fill in:
   - `ConnectionString` — your database connection string
   - `EnrollKey` — a long random secret (64 hex characters)
   This file is in `.gitignore` and must never be committed.
4. **Enroll your devices:** on each phone or computer, open
   `https://your-site/enroll.ashx?key=YOUR_ENROLL_KEY&name=iPhone` once.
   The browser gets a long-lived cookie and opens the app.
5. **Close enrollment:** when all devices are in, set `EnrollOpen` to `false`.

The cookie belongs to one browser: Safari and Chrome on the same phone are two enrollments, and
private windows are not enrolled. Remove lost devices under **Export → Settings → Devices**.

Before using it for real, set `customErrors mode="On"` in `site/web.config`.

## Try the interface without a server

```
python3 tools/serve-local.py
```

Then open <http://localhost:8080>. On localhost the page uses `site/assets/mock.js`, an in-memory fake
API with made-up data. Add `?reset` to the URL to start over.

## Layout

```
site/
  Default.aspx      app page (behind the device check)
  api.ashx          JSON API: api.ashx?r=<route>
  enroll.ashx       one-time device enrollment
  App_Code/         C# (compiled by IIS): Api, Auth, Db, Http, Settings
  App_Data/         settings.config lives here on the server (never in git)
  assets/           app.js, app.css, mock.js (demo mode only)
tools/serve-local.py
```

## License

MIT

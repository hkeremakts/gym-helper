using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Web;

/// <summary>JSON API behind api.ashx. Routes: api.ashx?r=name. See PLAN.md section 9.</summary>
public static class Api
{
    public class Req
    {
        public HttpContext Ctx;
        public SqlConnection C;
        public int DeviceId;
        public Dictionary<string, object> Body;
    }

    delegate object Route(Req q);

    static readonly Dictionary<string, Route> Gets = new Dictionary<string, Route>(StringComparer.Ordinal)
    {
        { "start", Start },
        { "exercises", Exercises },
        { "template-start", TemplateStart },
        { "exercise-last", ExerciseLast },
        { "exercise-history", ExerciseHistory },
        { "workouts", Workouts },
        { "workout", Workout },
        { "export", Export },
        { "stats", Stats },
        { "backup", Backup },
        { "devices", Devices }
    };

    static readonly Dictionary<string, Route> Posts = new Dictionary<string, Route>(StringComparer.Ordinal)
    {
        { "workout-save", WorkoutSave },
        { "workout-delete", WorkoutDelete },
        { "exercise-save", ExerciseSave },
        { "template-save", TemplateSave },
        { "template-delete", TemplateDelete },
        { "export-mark", ExportMark },
        { "device-delete", DeviceDelete }
    };

    public static void Handle(HttpContext ctx)
    {
        try
        {
            string method = ctx.Request.HttpMethod;
            bool post = method == "POST";
            if (!post && method != "GET") { Http.Error(ctx, 405, "Method not allowed."); return; }

            int deviceId = Auth.RequireDevice(ctx, false);
            if (deviceId == 0) return;

            string name = Http.Q(ctx, "r") ?? "";
            Route fn;
            if (!(post ? Posts : Gets).TryGetValue(name, out fn)) { Http.Error(ctx, 404, "Unknown route."); return; }

            Req q = new Req();
            q.Ctx = ctx;
            q.DeviceId = deviceId;
            if (post)
            {
                string ct = ctx.Request.ContentType ?? "";
                if (!ct.StartsWith("application/json", StringComparison.OrdinalIgnoreCase) || ctx.Request.Headers["X-Gym"] != "1")
                {
                    Http.Error(ctx, 400, "Writes must be JSON with the X-Gym header.");
                    return;
                }
                q.Body = Http.ReadBody(ctx);
            }

            using (SqlConnection c = Db.Open())
            {
                q.C = c;
                object result = fn(q);
                Http.Json(ctx, result);
            }
        }
        catch (ApiException e) { Http.Error(ctx, e.Status, e.Message); }
        catch (SqlException e)
        {
            if (e.Number == 2627 || e.Number == 2601) { Http.Error(ctx, 409, "That name is already in use."); return; }
            Log(e);
            Http.Error(ctx, 500, "Database error: " + e.Message);
        }
        catch (Exception e)
        {
            Log(e);
            Http.Error(ctx, 500, "Server error: " + e.Message);
        }
    }

    public static void Log(Exception e)
    {
        try
        {
            string path = Path.Combine(HttpRuntime.AppDomainAppPath, "App_Data", "errors.log");
            File.AppendAllText(path, string.Format(CultureInfo.InvariantCulture, "{0:o}  {1}{2}{2}", DateTime.UtcNow, e, Environment.NewLine));
        }
        catch (Exception) { }
    }

    static Dictionary<string, object> D() { return new Dictionary<string, object>(); }

    static int IdFromQuery(Req q)
    {
        int id = Http.QInt(q.Ctx, "id", 0, 0, int.MaxValue);
        if (id <= 0) throw new ApiException("Missing id.");
        return id;
    }

    static int IdFromBody(Req q)
    {
        int? id = Http.Int(q.Body, "id");
        if (id == null || id.Value <= 0) throw new ApiException("Missing id.");
        return id.Value;
    }

    // ===== Exercises and templates ===========================================================

    static List<Dictionary<string, object>> ExerciseList(SqlConnection c)
    {
        var rows = Db.Rows(c, null, "SELECT id, name, kind, archived FROM exercises ORDER BY name");
        var aliases = Db.Rows(c, null, "SELECT exercise_id, alias FROM exercise_aliases ORDER BY alias");
        var list = new List<Dictionary<string, object>>();
        foreach (var r in rows)
        {
            int id = Convert.ToInt32(r["id"]);
            var d = D();
            d["id"] = id;
            d["name"] = r["name"];
            d["kind"] = Convert.ToInt32(r["kind"]);
            d["archived"] = Convert.ToBoolean(r["archived"]);
            d["aliases"] = aliases.Where(a => Convert.ToInt32(a["exercise_id"]) == id).Select(a => (object)a["alias"]).ToList();
            list.Add(d);
        }
        return list;
    }

    static List<Dictionary<string, object>> TemplateList(SqlConnection c)
    {
        var rows = Db.Rows(c, null, "SELECT id, name, position FROM templates WHERE archived = 0 ORDER BY position, name");
        var links = Db.Rows(c, null, "SELECT template_id, exercise_id FROM template_exercises ORDER BY template_id, position");
        var list = new List<Dictionary<string, object>>();
        foreach (var r in rows)
        {
            int id = Convert.ToInt32(r["id"]);
            var d = D();
            d["id"] = id;
            d["name"] = r["name"];
            d["exerciseIds"] = links.Where(l => Convert.ToInt32(l["template_id"]) == id).Select(l => (object)Convert.ToInt32(l["exercise_id"])).ToList();
            list.Add(d);
        }
        return list;
    }

    static object Exercises(Req q) { var d = D(); d["exercises"] = ExerciseList(q.C); return d; }

    static object Start(Req q)
    {
        var d = D();
        d["exercises"] = ExerciseList(q.C);
        d["templates"] = TemplateList(q.C);

        var last = Db.Rows(q.C, null, @"SELECT TOP 1 w.[date], w.template_id, t.name AS template_name
            FROM workouts w LEFT JOIN templates t ON t.id = w.template_id ORDER BY w.[date] DESC, w.id DESC");
        if (last.Count > 0)
        {
            var lw = D();
            lw["date"] = Http.DateStr(last[0]["date"]);
            lw["templateId"] = last[0]["template_id"];
            lw["templateName"] = last[0]["template_name"];
            d["lastWorkout"] = lw;
        }
        else d["lastWorkout"] = null;

        d["lastTemplateId"] = Db.Scalar(q.C, null,
            "SELECT TOP 1 template_id FROM workouts WHERE template_id IS NOT NULL ORDER BY [date] DESC, id DESC");
        d["lastBodyWeightKg"] = Db.Scalar(q.C, null,
            "SELECT TOP 1 body_weight_kg FROM workouts WHERE body_weight_kg IS NOT NULL ORDER BY [date] DESC, id DESC");
        d["workoutCount"] = Db.Scalar(q.C, null, "SELECT COUNT(*) FROM workouts");
        return d;
    }

    static object ExerciseSave(Req q)
    {
        var b = q.Body;
        int? id = Http.Int(b, "id");
        string name = Http.Str(b, "name", 100);
        if (name == null) throw new ApiException("The exercise needs a name.");
        int kind = Http.Int(b, "kind") ?? 0;
        if (kind < 0 || kind > 2) throw new ApiException("Unknown exercise kind.");
        bool archived = Http.Bool(b, "archived");

        var aliases = new List<string>();
        foreach (object a in Http.List(b, "aliases"))
        {
            string s = a == null ? "" : Convert.ToString(a, CultureInfo.InvariantCulture).Trim();
            if (s.Length == 0) continue;
            if (s.Length > 100) throw new ApiException("An alias is longer than 100 characters.");
            if (string.Equals(s, name, StringComparison.OrdinalIgnoreCase)) continue;
            if (aliases.Any(x => string.Equals(x, s, StringComparison.OrdinalIgnoreCase))) continue;
            aliases.Add(s);
        }

        using (SqlTransaction t = q.C.BeginTransaction())
        {
            int exId;
            if (id != null && id.Value > 0)
            {
                int n = Db.Exec(q.C, t, "UPDATE exercises SET name = @n, kind = @k, archived = @a WHERE id = @id",
                    Db.P("@n", name), Db.P("@k", kind), Db.P("@a", archived), Db.P("@id", id.Value));
                if (n == 0) throw new ApiException(404, "Exercise not found.");
                exId = id.Value;
                Db.Exec(q.C, t, "DELETE FROM exercise_aliases WHERE exercise_id = @id", Db.P("@id", exId));
            }
            else
            {
                exId = Db.Insert(q.C, t, "INSERT INTO exercises (name, kind, archived) VALUES (@n, @k, @a)",
                    Db.P("@n", name), Db.P("@k", kind), Db.P("@a", archived));
            }
            foreach (string a in aliases)
                Db.Exec(q.C, t, "INSERT INTO exercise_aliases (exercise_id, alias) VALUES (@e, @a)", Db.P("@e", exId), Db.P("@a", a));
            t.Commit();
            var d = D();
            d["id"] = exId;
            return d;
        }
    }

    static object TemplateSave(Req q)
    {
        var b = q.Body;
        int? id = Http.Int(b, "id");
        string name = Http.Str(b, "name", 50);
        if (name == null) throw new ApiException("The template needs a name.");
        var exIds = new List<int>();
        foreach (object o in Http.List(b, "exerciseIds"))
        {
            decimal? v = Http.Dec(o, "exerciseIds");
            if (v == null || v.Value <= 0) throw new ApiException("Bad exercise in template.");
            exIds.Add((int)v.Value);
        }

        using (SqlTransaction t = q.C.BeginTransaction())
        {
            int tid;
            if (id != null && id.Value > 0)
            {
                int n = Db.Exec(q.C, t, "UPDATE templates SET name = @n, archived = 0 WHERE id = @id", Db.P("@n", name), Db.P("@id", id.Value));
                if (n == 0) throw new ApiException(404, "Template not found.");
                tid = id.Value;
                Db.Exec(q.C, t, "DELETE FROM template_exercises WHERE template_id = @id", Db.P("@id", tid));
            }
            else
            {
                // Re-using the name of an archived template brings that template back.
                object old = Db.Scalar(q.C, t, "SELECT id FROM templates WHERE name = @n AND archived = 1", Db.P("@n", name));
                if (old != null)
                {
                    tid = Convert.ToInt32(old);
                    Db.Exec(q.C, t, "UPDATE templates SET archived = 0 WHERE id = @id", Db.P("@id", tid));
                    Db.Exec(q.C, t, "DELETE FROM template_exercises WHERE template_id = @id", Db.P("@id", tid));
                }
                else
                {
                    int pos = Convert.ToInt32(Db.Scalar(q.C, t, "SELECT ISNULL(MAX(position), 0) + 1 FROM templates"));
                    tid = Db.Insert(q.C, t, "INSERT INTO templates (name, position, archived) VALUES (@n, @p, 0)", Db.P("@n", name), Db.P("@p", pos));
                }
            }
            for (int i = 0; i < exIds.Count; i++)
                Db.Exec(q.C, t, "INSERT INTO template_exercises (template_id, exercise_id, position) VALUES (@t, @e, @p)",
                    Db.P("@t", tid), Db.P("@e", exIds[i]), Db.P("@p", i));
            t.Commit();
            var d = D();
            d["id"] = tid;
            return d;
        }
    }

    static object TemplateDelete(Req q)
    {
        Db.Exec(q.C, null, "UPDATE templates SET archived = 1 WHERE id = @id", Db.P("@id", IdFromBody(q)));
        var d = D(); d["ok"] = true; return d;
    }

    // ===== Reading workouts =================================================================

    static Dictionary<string, object> SetDict(Dictionary<string, object> s)
    {
        var d = D();
        d["weightKg"] = s["weight_kg"];
        d["reps"] = s["reps"];
        d["durationSec"] = s["duration_sec"];
        d["restSec"] = s["rest_sec"];
        d["formBroke"] = Convert.ToBoolean(s["form_broke"]);
        d["note"] = s["note"];
        return d;
    }

    static Dictionary<int, List<object>> SetsByWorkoutExercise(SqlConnection c, IEnumerable<int> weIds)
    {
        var map = new Dictionary<int, List<object>>();
        string ids = Db.IdList(weIds);
        foreach (var s in Db.Rows(c, null, "SELECT * FROM sets WHERE workout_exercise_id IN (" + ids + ") ORDER BY workout_exercise_id, position"))
        {
            int we = Convert.ToInt32(s["workout_exercise_id"]);
            if (!map.ContainsKey(we)) map[we] = new List<object>();
            map[we].Add(SetDict(s));
        }
        return map;
    }

    /// <summary>Loads workouts (newest first) with their exercises and sets.</summary>
    static List<Dictionary<string, object>> LoadWorkouts(SqlConnection c, string where, string tail, params SqlParameter[] ps)
    {
        var ws = Db.Rows(c, null, "SELECT w.*, t.name AS template_name FROM workouts w LEFT JOIN templates t ON t.id = w.template_id WHERE "
            + where + " ORDER BY w.[date] DESC, w.id DESC " + (tail ?? ""), ps);
        var result = new List<Dictionary<string, object>>();
        if (ws.Count == 0) return result;

        string wIds = Db.IdList(ws.Select(w => Convert.ToInt32(w["id"])));
        var wes = Db.Rows(c, null, @"SELECT we.*, e.name, e.kind FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
            WHERE we.workout_id IN (" + wIds + ") ORDER BY we.workout_id, we.position");
        var sets = SetsByWorkoutExercise(c, wes.Select(x => Convert.ToInt32(x["id"])));

        foreach (var w in ws)
        {
            int wid = Convert.ToInt32(w["id"]);
            var d = D();
            d["id"] = wid;
            d["date"] = Http.DateStr(w["date"]);
            d["templateId"] = w["template_id"];
            d["templateName"] = w["template_name"];
            d["comment"] = w["comment"];
            d["bodyWeightKg"] = w["body_weight_kg"];
            d["startedAt"] = Http.UtcStr(w["started_at"]);
            d["endedAt"] = Http.UtcStr(w["ended_at"]);
            d["clientId"] = w["client_id"];
            d["updatedAt"] = Http.UtcStr(w["updated_at"]);
            object dur = null;
            if (w["started_at"] != null && w["ended_at"] != null)
            {
                double min = ((DateTime)w["ended_at"] - (DateTime)w["started_at"]).TotalMinutes;
                if (min >= 1 && min <= 600) dur = (int)Math.Round(min);
            }
            d["durationMin"] = dur;

            var exList = new List<object>();
            foreach (var we in wes.Where(x => Convert.ToInt32(x["workout_id"]) == wid))
            {
                int weId = Convert.ToInt32(we["id"]);
                var e = D();
                e["exerciseId"] = Convert.ToInt32(we["exercise_id"]);
                e["name"] = we["name"];
                e["kind"] = Convert.ToInt32(we["kind"]);
                e["comment"] = we["comment"];
                e["nextTarget"] = we["next_target"];
                e["sets"] = sets.ContainsKey(weId) ? sets[weId] : new List<object>();
                exList.Add(e);
            }
            d["exercises"] = exList;
            result.Add(d);
        }
        return result;
    }

    /// <summary>The most recent time an exercise was done (any template), optionally skipping one workout.</summary>
    static Dictionary<string, object> LastPerformance(SqlConnection c, int exerciseId, int excludeWorkoutId)
    {
        var rows = Db.Rows(c, null, @"SELECT TOP 1 we.id, we.comment, we.next_target, w.[date]
            FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
            WHERE we.exercise_id = @e AND w.id <> @x
            ORDER BY w.[date] DESC, w.id DESC, we.position DESC",
            Db.P("@e", exerciseId), Db.P("@x", excludeWorkoutId));
        if (rows.Count == 0) return null;
        int weId = Convert.ToInt32(rows[0]["id"]);
        var sets = SetsByWorkoutExercise(c, new[] { weId });
        var d = D();
        d["date"] = Http.DateStr(rows[0]["date"]);
        d["comment"] = rows[0]["comment"];
        d["nextTarget"] = rows[0]["next_target"];
        d["sets"] = sets.ContainsKey(weId) ? sets[weId] : new List<object>();
        return d;
    }

    static object TemplateStart(Req q)
    {
        int id = IdFromQuery(q);
        int exclude = Http.QInt(q.Ctx, "exclude", 0, 0, int.MaxValue);
        var rows = Db.Rows(q.C, null, @"SELECT te.exercise_id, e.name, e.kind FROM template_exercises te
            JOIN exercises e ON e.id = te.exercise_id WHERE te.template_id = @t ORDER BY te.position", Db.P("@t", id));
        var list = new List<object>();
        foreach (var r in rows)
        {
            int exId = Convert.ToInt32(r["exercise_id"]);
            var e = D();
            e["exerciseId"] = exId;
            e["name"] = r["name"];
            e["kind"] = Convert.ToInt32(r["kind"]);
            e["last"] = LastPerformance(q.C, exId, exclude);
            list.Add(e);
        }
        var d = D();
        d["templateId"] = id;
        d["exercises"] = list;
        return d;
    }

    static object ExerciseLast(Req q)
    {
        var d = D();
        d["last"] = LastPerformance(q.C, IdFromQuery(q), Http.QInt(q.Ctx, "exclude", 0, 0, int.MaxValue));
        return d;
    }

    static object ExerciseHistory(Req q)
    {
        int id = IdFromQuery(q);
        int offset = Http.QInt(q.Ctx, "offset", 0, 0, 100000);
        int limit = Http.QInt(q.Ctx, "limit", 20, 1, 100);
        var rows = Db.Rows(q.C, null, @"SELECT we.id, we.comment, we.next_target, w.[date], w.id AS workout_id, t.name AS template_name
            FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id LEFT JOIN templates t ON t.id = w.template_id
            WHERE we.exercise_id = @e ORDER BY w.[date] DESC, w.id DESC
            OFFSET @o ROWS FETCH NEXT @l ROWS ONLY",
            Db.P("@e", id), Db.P("@o", offset), Db.P("@l", limit + 1));
        bool more = rows.Count > limit;
        if (more) rows.RemoveAt(rows.Count - 1);
        var sets = SetsByWorkoutExercise(q.C, rows.Select(r => Convert.ToInt32(r["id"])));
        var list = new List<object>();
        foreach (var r in rows)
        {
            int weId = Convert.ToInt32(r["id"]);
            var e = D();
            e["workoutId"] = r["workout_id"];
            e["date"] = Http.DateStr(r["date"]);
            e["templateName"] = r["template_name"];
            e["comment"] = r["comment"];
            e["nextTarget"] = r["next_target"];
            e["sets"] = sets.ContainsKey(weId) ? sets[weId] : new List<object>();
            list.Add(e);
        }
        var name = Db.Scalar(q.C, null, "SELECT name FROM exercises WHERE id = @id", Db.P("@id", id));
        var d = D();
        d["exerciseId"] = id;
        d["name"] = name;
        d["entries"] = list;
        d["hasMore"] = more;
        return d;
    }

    static object Workouts(Req q)
    {
        int offset = Http.QInt(q.Ctx, "offset", 0, 0, 100000);
        int limit = Http.QInt(q.Ctx, "limit", 20, 1, 100);
        var list = LoadWorkouts(q.C, "1 = 1", "OFFSET @o ROWS FETCH NEXT @l ROWS ONLY", Db.P("@o", offset), Db.P("@l", limit + 1));
        bool more = list.Count > limit;
        if (more) list.RemoveAt(list.Count - 1);
        var d = D();
        d["workouts"] = list;
        d["hasMore"] = more;
        return d;
    }

    static object Workout(Req q)
    {
        var list = LoadWorkouts(q.C, "w.id = @id", null, Db.P("@id", IdFromQuery(q)));
        if (list.Count == 0) throw new ApiException(404, "Workout not found.");
        var d = D();
        d["workout"] = list[0];
        return d;
    }

    // ===== Saving workouts ==================================================================

    static int FindOrCreateExercise(SqlConnection c, SqlTransaction t, string name, int kind)
    {
        object id = Db.Scalar(c, t, "SELECT id FROM exercises WHERE name = @n", Db.P("@n", name));
        if (id == null) id = Db.Scalar(c, t, "SELECT exercise_id FROM exercise_aliases WHERE alias = @n", Db.P("@n", name));
        if (id != null) return Convert.ToInt32(id);
        return Db.Insert(c, t, "INSERT INTO exercises (name, kind, archived) VALUES (@n, @k, 0)", Db.P("@n", name), Db.P("@k", kind));
    }

    static void CheckRange(decimal? v, decimal min, decimal max, string what)
    {
        if (v != null && (v.Value < min || v.Value > max))
            throw new ApiException(string.Format(CultureInfo.InvariantCulture, "{0} must be between {1} and {2}.", what, min, max));
    }

    static object WorkoutSave(Req q)
    {
        var b = q.Body;
        int? id = Http.Int(b, "id");
        string clientId = Http.Str(b, "clientId", 36);
        DateTime? date = Http.ParseDate(Http.Str(b, "date", 10), "date");
        if (date == null) throw new ApiException("The workout needs a date.");
        int? templateId = Http.Int(b, "templateId");
        if (templateId != null && templateId.Value <= 0) templateId = null;
        string comment = Http.Str(b, "comment", 4000);
        decimal? bw = Http.Dec(b, "bodyWeightKg");
        CheckRange(bw, 20, 300, "Body weight");
        DateTime? startedAt = Http.ParseUtc(Http.Str(b, "startedAt", 40), "startedAt");
        DateTime? endedAt = Http.ParseUtc(Http.Str(b, "endedAt", 40), "endedAt");

        // Validate everything before touching the database.
        var exercises = new List<Dictionary<string, object>>();
        foreach (object o in Http.List(b, "exercises"))
        {
            var e = Http.Obj(o, "exercise");
            int? exId = Http.Int(e, "exerciseId");
            string name = Http.Str(e, "name", 100);
            if ((exId == null || exId.Value <= 0) && name == null) throw new ApiException("An exercise has no name.");
            int kind = Http.Int(e, "kind") ?? 0;
            if (kind < 0 || kind > 2) kind = 0;
            Http.Str(e, "comment", 4000);
            Http.Str(e, "nextTarget", 200);
            foreach (object so in Http.List(e, "sets"))
            {
                var s = Http.Obj(so, "set");
                decimal? reps = Http.Dec(s, "reps");
                decimal? w = Http.Dec(s, "weightKg");
                int? dur = Http.Int(s, "durationSec");
                CheckRange(w, 0, 999, "Weight");
                CheckRange(reps, 0.5m, 999, "Reps");
                if (reps != null && reps.Value * 2 != decimal.Truncate(reps.Value * 2)) throw new ApiException("Reps can only be whole or half numbers.");
                CheckRange(dur, 1, 3600, "Duration (seconds)");
                CheckRange(Http.Int(s, "restSec"), 0, 3600, "Rest (seconds)");
                Http.Str(s, "note", 200);
                if (reps == null && dur == null) throw new ApiException("Every set needs reps or a duration.");
            }
            exercises.Add(e);
        }

        DateTime now = DateTime.UtcNow;
        using (SqlTransaction t = q.C.BeginTransaction())
        {
            // An existing workout is found by id, or by the phone-made clientId (so a retried save never duplicates).
            object existing = null;
            if (id != null && id.Value > 0) existing = Db.Scalar(q.C, t, "SELECT id FROM workouts WHERE id = @id", Db.P("@id", id.Value));
            if (existing == null && clientId != null) existing = Db.Scalar(q.C, t, "SELECT id FROM workouts WHERE client_id = @c", Db.P("@c", clientId));

            int wid;
            if (existing != null)
            {
                wid = Convert.ToInt32(existing);
                Db.Exec(q.C, t, @"UPDATE workouts SET [date] = @d, template_id = @t, comment = @cm, body_weight_kg = @bw,
                    started_at = COALESCE(started_at, @s), ended_at = COALESCE(ended_at, @e), updated_at = @now WHERE id = @id",
                    Db.P("@d", date.Value), Db.P("@t", templateId), Db.P("@cm", comment), Db.P("@bw", bw),
                    Db.P("@s", startedAt), Db.P("@e", endedAt ?? now), Db.P("@now", now), Db.P("@id", wid));
                Db.Exec(q.C, t, "DELETE FROM workout_exercises WHERE workout_id = @id", Db.P("@id", wid));
            }
            else
            {
                wid = Db.Insert(q.C, t, @"INSERT INTO workouts ([date], template_id, comment, body_weight_kg, started_at, ended_at, client_id, created_at, updated_at)
                    VALUES (@d, @t, @cm, @bw, @s, @e, @c, @now, @now)",
                    Db.P("@d", date.Value), Db.P("@t", templateId), Db.P("@cm", comment), Db.P("@bw", bw),
                    Db.P("@s", startedAt), Db.P("@e", endedAt ?? now), Db.P("@c", clientId), Db.P("@now", now));
            }

            for (int i = 0; i < exercises.Count; i++)
            {
                var e = exercises[i];
                int? exId = Http.Int(e, "exerciseId");
                int exerciseId = (exId != null && exId.Value > 0)
                    ? exId.Value
                    : FindOrCreateExercise(q.C, t, Http.Str(e, "name", 100), Http.Int(e, "kind") ?? 0);
                int weId = Db.Insert(q.C, t, @"INSERT INTO workout_exercises (workout_id, exercise_id, position, comment, next_target)
                    VALUES (@w, @e, @p, @c, @n)",
                    Db.P("@w", wid), Db.P("@e", exerciseId), Db.P("@p", i), Db.P("@c", Http.Str(e, "comment", 4000)), Db.P("@n", Http.Str(e, "nextTarget", 200)));

                var sets = Http.List(e, "sets");
                for (int j = 0; j < sets.Count; j++)
                {
                    var s = Http.Obj(sets[j], "set");
                    int? rest = Http.Int(s, "restSec");
                    if (rest != null && rest.Value == 0) rest = null;
                    Db.Exec(q.C, t, @"INSERT INTO sets (workout_exercise_id, position, weight_kg, reps, duration_sec, note, rest_sec, form_broke)
                        VALUES (@we, @p, @w, @r, @d, @n, @rs, @f)",
                        Db.P("@we", weId), Db.P("@p", j), Db.P("@w", Http.Dec(s, "weightKg")), Db.P("@r", Http.Dec(s, "reps")),
                        Db.P("@d", Http.Int(s, "durationSec")), Db.P("@n", Http.Str(s, "note", 200)), Db.P("@rs", rest), Db.P("@f", Http.Bool(s, "formBroke")));
                }
            }
            t.Commit();
            var d = D();
            d["id"] = wid;
            return d;
        }
    }

    static object WorkoutDelete(Req q)
    {
        Db.Exec(q.C, null, "DELETE FROM workouts WHERE id = @id", Db.P("@id", IdFromBody(q)));
        var d = D(); d["ok"] = true; return d;
    }

    // ===== Export, stats, backup ============================================================

    static string GetState(SqlConnection c, string key)
    {
        object v = Db.Scalar(c, null, "SELECT [value] FROM app_state WHERE [key] = @k", Db.P("@k", key));
        return v == null ? null : (string)v;
    }

    static object Export(Req q)
    {
        string lastExport = GetState(q.C, "last_export_at");
        List<Dictionary<string, object>> list;
        if (Http.Q(q.Ctx, "since") == "last")
        {
            DateTime? since = Http.ParseUtc(lastExport, "last_export_at");
            list = since == null
                ? LoadWorkouts(q.C, "1 = 1", null)
                : LoadWorkouts(q.C, "w.updated_at > @s", null, Db.P("@s", since.Value));
        }
        else
        {
            DateTime? from = Http.ParseDate(Http.Q(q.Ctx, "from"), "from");
            DateTime? to = Http.ParseDate(Http.Q(q.Ctx, "to"), "to");
            if (from == null || to == null) throw new ApiException("Give both 'from' and 'to'.");
            list = LoadWorkouts(q.C, "w.[date] >= @f AND w.[date] <= @t", null, Db.P("@f", from.Value), Db.P("@t", to.Value));
        }
        var d = D();
        d["workouts"] = list;
        d["lastExportAt"] = lastExport;
        return d;
    }

    static object ExportMark(Req q)
    {
        string now = Http.UtcStr(DateTime.UtcNow);
        Db.Exec(q.C, null, @"IF EXISTS (SELECT 1 FROM app_state WHERE [key] = 'last_export_at')
                UPDATE app_state SET [value] = @v WHERE [key] = 'last_export_at'
            ELSE INSERT INTO app_state ([key], [value]) VALUES ('last_export_at', @v)", Db.P("@v", now));
        var d = D(); d["lastExportAt"] = now; return d;
    }

    static object Stats(Req q)
    {
        DateTime today = Http.ParseDate(Http.Q(q.Ctx, "today"), "today") ?? DateTime.UtcNow.Date;
        DateTime weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

        var ws = Db.Rows(q.C, null, "SELECT id, [date], started_at, ended_at, body_weight_kg FROM workouts ORDER BY [date], id");
        int week = 0, month = 0, last28 = 0;
        var durations = new List<double>();
        foreach (var w in ws)
        {
            DateTime d = (DateTime)w["date"];
            if (d >= weekStart && d <= today) week++;
            if (d.Year == today.Year && d.Month == today.Month && d <= today) month++;
            if (d > today.AddDays(-28) && d <= today) last28++;
            if (w["started_at"] != null && w["ended_at"] != null)
            {
                double min = ((DateTime)w["ended_at"] - (DateTime)w["started_at"]).TotalMinutes;
                if (min >= 1 && min <= 300) durations.Add(min);
            }
        }

        var totals = D();
        totals["thisWeek"] = week;
        totals["thisMonth"] = month;
        totals["allTime"] = ws.Count;
        totals["perWeekLast4"] = Math.Round(last28 / 4.0, 1);
        totals["avgDurationMin"] = durations.Count == 0 ? (object)null : (int)Math.Round(durations.Average());

        var bwRows = ws.Where(w => w["body_weight_kg"] != null).ToList();
        var body = D();
        if (bwRows.Count > 0)
        {
            var latest = bwRows[bwRows.Count - 1];
            body["latestKg"] = latest["body_weight_kg"];
            body["latestDate"] = Http.DateStr(latest["date"]);
            var first30 = bwRows.FirstOrDefault(w => (DateTime)w["date"] >= today.AddDays(-30));
            body["change30Kg"] = (first30 != null && first30 != latest)
                ? (object)((decimal)latest["body_weight_kg"] - (decimal)first30["body_weight_kg"])
                : null;
        }

        var sets = Db.Rows(q.C, null, @"SELECT e.id AS exercise_id, e.name, e.kind, w.id AS workout_id, w.[date], s.weight_kg, s.reps, s.duration_sec
            FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
            JOIN exercises e ON e.id = we.exercise_id JOIN workouts w ON w.id = we.workout_id
            ORDER BY w.[date], w.id, we.position, s.position");
        var perExercise = new List<object>();
        foreach (var g in sets.GroupBy(s => Convert.ToInt32(s["exercise_id"])))
        {
            var rows = g.ToList();
            int kind = Convert.ToInt32(rows[0]["kind"]);
            var sessions = rows.Select(r => Convert.ToInt32(r["workout_id"])).Distinct().ToList();
            Func<int, decimal?> maxWeightIn = wid => rows.Where(r => Convert.ToInt32(r["workout_id"]) == wid && r["weight_kg"] != null)
                .Select(r => (decimal?)r["weight_kg"]).DefaultIfEmpty(null).Max();

            var e = D();
            e["exerciseId"] = g.Key;
            e["name"] = rows[0]["name"];
            e["kind"] = kind;
            e["sessions"] = sessions.Count;
            e["firstWeightKg"] = maxWeightIn(sessions[0]);
            e["latestWeightKg"] = maxWeightIn(sessions[sessions.Count - 1]);
            e["lastDate"] = Http.DateStr(rows[rows.Count - 1]["date"]);

            var best = D();
            if (kind == 2)
            {
                best["durationSec"] = rows.Where(r => r["duration_sec"] != null).Select(r => (int?)Convert.ToInt32(r["duration_sec"])).DefaultIfEmpty(null).Max();
            }
            else
            {
                var weighted = rows.Where(r => r["weight_kg"] != null && r["reps"] != null).ToList();
                if (kind == 0 && weighted.Count > 0)
                {
                    decimal top = weighted.Max(r => (decimal)r["weight_kg"]);
                    best["weightKg"] = top;
                    best["reps"] = weighted.Where(r => (decimal)r["weight_kg"] == top).Max(r => (decimal)r["reps"]);
                }
                else
                {
                    best["reps"] = rows.Where(r => r["reps"] != null).Select(r => (decimal?)r["reps"]).DefaultIfEmpty(null).Max();
                }
            }
            e["best"] = best;
            perExercise.Add(e);
        }

        var d2 = D();
        d2["totals"] = totals;
        d2["bodyWeight"] = body;
        d2["exercises"] = perExercise.Cast<Dictionary<string, object>>().OrderBy(x => (string)x["name"], StringComparer.CurrentCultureIgnoreCase).ToList();
        return d2;
    }

    static object Backup(Req q)
    {
        var d = D();
        d["format"] = "gym-helper-backup-1";
        d["exportedAt"] = Http.UtcStr(DateTime.UtcNow);
        foreach (string table in new[] { "exercises", "exercise_aliases", "templates", "template_exercises", "workouts", "workout_exercises", "sets", "app_state" })
        {
            var rows = Db.Rows(q.C, null, "SELECT * FROM " + table); // table names are fixed above, never user input
            foreach (var r in rows)
                foreach (var k in r.Keys.ToList())
                    if (r[k] is DateTime) r[k] = k == "date" ? Http.DateStr(r[k]) : Http.UtcStr(r[k]);
            d[table] = rows;
        }
        q.Ctx.Response.AppendHeader("Content-Disposition",
            "attachment; filename=gym-backup-" + DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + ".json");
        return d;
    }

    // ===== Devices ==========================================================================

    static object Devices(Req q)
    {
        var list = new List<object>();
        foreach (var r in Db.Rows(q.C, null, "SELECT id, label, created_at, last_seen_at FROM devices ORDER BY id"))
        {
            var e = D();
            e["id"] = Convert.ToInt32(r["id"]);
            e["label"] = r["label"];
            e["createdAt"] = Http.UtcStr(r["created_at"]);
            e["lastSeenAt"] = Http.UtcStr(r["last_seen_at"]);
            e["current"] = Convert.ToInt32(r["id"]) == q.DeviceId;
            list.Add(e);
        }
        var d = D();
        d["devices"] = list;
        d["maxDevices"] = Settings.MaxDevices;
        d["enrollOpen"] = Settings.EnrollOpen;
        return d;
    }

    static object DeviceDelete(Req q)
    {
        Db.Exec(q.C, null, "DELETE FROM devices WHERE id = @id", Db.P("@id", IdFromBody(q)));
        var d = D(); d["ok"] = true; return d;
    }
}

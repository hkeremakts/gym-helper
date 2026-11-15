using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;

/// <summary>All database access. Every statement is parameterised. Tables are created on first use.</summary>
public static class Db
{
    static readonly object SchemaLock = new object();
    static bool schemaReady;

    public static SqlConnection Open()
    {
        if (!Settings.IsConfigured) throw new ApiException(500, "The site is not configured yet (App_Data\\settings.config is missing or incomplete).");
        SqlConnection c = new SqlConnection(Settings.ConnectionString);
        c.Open();
        EnsureSchema(c);
        return c;
    }

    public static SqlParameter P(string name, object value)
    {
        return new SqlParameter(name, value ?? DBNull.Value);
    }

    static SqlCommand Cmd(SqlConnection c, SqlTransaction t, string sql, SqlParameter[] ps)
    {
        SqlCommand cmd = new SqlCommand(sql, c, t);
        cmd.CommandTimeout = 30;
        if (ps != null) foreach (SqlParameter p in ps) cmd.Parameters.Add(p);
        return cmd;
    }

    public static int Exec(SqlConnection c, SqlTransaction t, string sql, params SqlParameter[] ps)
    {
        using (SqlCommand cmd = Cmd(c, t, sql, ps)) return cmd.ExecuteNonQuery();
    }

    public static object Scalar(SqlConnection c, SqlTransaction t, string sql, params SqlParameter[] ps)
    {
        using (SqlCommand cmd = Cmd(c, t, sql, ps))
        {
            object o = cmd.ExecuteScalar();
            return (o is DBNull) ? null : o;
        }
    }

    /// <summary>Runs an INSERT and returns the new identity value.</summary>
    public static int Insert(SqlConnection c, SqlTransaction t, string sql, params SqlParameter[] ps)
    {
        return Convert.ToInt32(Scalar(c, t, sql + "; SELECT CAST(SCOPE_IDENTITY() AS INT);", ps));
    }

    public static List<Dictionary<string, object>> Rows(SqlConnection c, SqlTransaction t, string sql, params SqlParameter[] ps)
    {
        List<Dictionary<string, object>> list = new List<Dictionary<string, object>>();
        using (SqlCommand cmd = Cmd(c, t, sql, ps))
        using (SqlDataReader r = cmd.ExecuteReader())
        {
            while (r.Read())
            {
                Dictionary<string, object> row = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < r.FieldCount; i++) row[r.GetName(i)] = r.IsDBNull(i) ? null : r.GetValue(i);
                list.Add(row);
            }
        }
        return list;
    }

    /// <summary>Comma-separated list of integers for an IN (...) clause. Only ever built from ints.</summary>
    public static string IdList(IEnumerable<int> ids)
    {
        List<string> parts = new List<string>();
        foreach (int id in ids) parts.Add(id.ToString(System.Globalization.CultureInfo.InvariantCulture));
        return parts.Count == 0 ? "0" : string.Join(",", parts.ToArray());
    }

    static void EnsureSchema(SqlConnection c)
    {
        if (schemaReady) return;
        lock (SchemaLock)
        {
            if (schemaReady) return;
            foreach (string sql in Schema) Exec(c, null, sql);
            schemaReady = true;
        }
    }

    // SQL Server 2014 syntax only (no DROP IF EXISTS, no CREATE OR ALTER).
    static readonly string[] Schema = new string[]
    {
        @"IF OBJECT_ID('dbo.devices') IS NULL CREATE TABLE dbo.devices (
            id INT IDENTITY PRIMARY KEY,
            label NVARCHAR(50) NOT NULL,
            token_hash CHAR(64) NOT NULL UNIQUE,
            created_at DATETIME2 NOT NULL,
            last_seen_at DATETIME2 NULL)",

        @"IF OBJECT_ID('dbo.exercises') IS NULL CREATE TABLE dbo.exercises (
            id INT IDENTITY PRIMARY KEY,
            name NVARCHAR(100) NOT NULL UNIQUE,
            kind TINYINT NOT NULL DEFAULT 0,
            archived BIT NOT NULL DEFAULT 0)",

        @"IF OBJECT_ID('dbo.exercise_aliases') IS NULL CREATE TABLE dbo.exercise_aliases (
            id INT IDENTITY PRIMARY KEY,
            exercise_id INT NOT NULL REFERENCES dbo.exercises(id) ON DELETE CASCADE,
            alias NVARCHAR(100) NOT NULL UNIQUE)",

        @"IF OBJECT_ID('dbo.templates') IS NULL CREATE TABLE dbo.templates (
            id INT IDENTITY PRIMARY KEY,
            name NVARCHAR(50) NOT NULL UNIQUE,
            position INT NOT NULL DEFAULT 0,
            archived BIT NOT NULL DEFAULT 0)",

        @"IF OBJECT_ID('dbo.template_exercises') IS NULL CREATE TABLE dbo.template_exercises (
            id INT IDENTITY PRIMARY KEY,
            template_id INT NOT NULL REFERENCES dbo.templates(id) ON DELETE CASCADE,
            exercise_id INT NOT NULL REFERENCES dbo.exercises(id),
            position INT NOT NULL)",

        @"IF OBJECT_ID('dbo.workouts') IS NULL CREATE TABLE dbo.workouts (
            id INT IDENTITY PRIMARY KEY,
            [date] DATE NOT NULL,
            template_id INT NULL REFERENCES dbo.templates(id),
            comment NVARCHAR(MAX) NULL,
            body_weight_kg DECIMAL(5,2) NULL,
            started_at DATETIME2 NULL,
            ended_at DATETIME2 NULL,
            client_id CHAR(36) NULL,
            created_at DATETIME2 NOT NULL,
            updated_at DATETIME2 NOT NULL)",

        // A plain UNIQUE column would allow only one NULL; imported workouts have none.
        @"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_workouts_client_id')
            CREATE UNIQUE INDEX ux_workouts_client_id ON dbo.workouts(client_id) WHERE client_id IS NOT NULL",

        @"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_workouts_date')
            CREATE INDEX ix_workouts_date ON dbo.workouts([date])",

        @"IF OBJECT_ID('dbo.workout_exercises') IS NULL CREATE TABLE dbo.workout_exercises (
            id INT IDENTITY PRIMARY KEY,
            workout_id INT NOT NULL REFERENCES dbo.workouts(id) ON DELETE CASCADE,
            exercise_id INT NOT NULL REFERENCES dbo.exercises(id),
            position INT NOT NULL,
            comment NVARCHAR(MAX) NULL,
            next_target NVARCHAR(200) NULL)",

        @"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_we_exercise')
            CREATE INDEX ix_we_exercise ON dbo.workout_exercises(exercise_id)",

        @"IF OBJECT_ID('dbo.sets') IS NULL CREATE TABLE dbo.sets (
            id INT IDENTITY PRIMARY KEY,
            workout_exercise_id INT NOT NULL REFERENCES dbo.workout_exercises(id) ON DELETE CASCADE,
            position INT NOT NULL,
            weight_kg DECIMAL(6,2) NULL,
            reps DECIMAL(4,1) NULL,
            duration_sec INT NULL,
            note NVARCHAR(200) NULL,
            rest_sec INT NULL,
            form_broke BIT NOT NULL DEFAULT 0)",

        @"IF OBJECT_ID('dbo.app_state') IS NULL CREATE TABLE dbo.app_state (
            [key] NVARCHAR(50) PRIMARY KEY,
            [value] NVARCHAR(200) NOT NULL)",

        // Body weight history: one value per day, kept separately from workouts.
        @"IF OBJECT_ID('dbo.body_weights') IS NULL CREATE TABLE dbo.body_weights (
            id INT IDENTITY PRIMARY KEY,
            [date] DATE NOT NULL UNIQUE,
            weight_kg DECIMAL(5,2) NOT NULL,
            updated_at DATETIME2 NOT NULL)",

        // One-time copy of body weights that were saved on workouts before the history table existed.
        @"IF NOT EXISTS (SELECT 1 FROM dbo.app_state WHERE [key] = 'bw_backfilled')
          BEGIN
            INSERT INTO dbo.body_weights ([date], weight_kg, updated_at)
              SELECT w.[date], MAX(w.body_weight_kg), SYSUTCDATETIME() FROM dbo.workouts w
              WHERE w.body_weight_kg IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM dbo.body_weights b WHERE b.[date] = w.[date])
              GROUP BY w.[date];
            INSERT INTO dbo.app_state ([key], [value]) VALUES ('bw_backfilled', '1');
          END"
    };
}

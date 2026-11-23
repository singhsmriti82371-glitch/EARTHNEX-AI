import json, os, time
from pathlib import Path
import psycopg
from psycopg.rows import dict_row
from seed_data import MINERALS, RIVERS

def _load_env():
    env_file = Path(__file__).resolve().parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_env()

SCHEMA = """
CREATE TABLE IF NOT EXISTS cache (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL,
    ts DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS minerals (
    id SERIAL PRIMARY KEY,
    name TEXT,
    mineral TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    prospectivity DOUBLE PRECISION,
    note TEXT
);
CREATE TABLE IF NOT EXISTS rivers (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE,
    outlet TEXT,
    coords TEXT
);
CREATE TABLE IF NOT EXISTS saved_locations (
    id SERIAL PRIMARY KEY,
    name TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    created DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS query_log (
    id SERIAL PRIMARY KEY,
    endpoint TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    ts DOUBLE PRECISION
);
"""

def conn():
    return psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.getenv("PGDATABASE", "earthnex"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", ""),
        row_factory=dict_row,
    )

def init_db():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(SCHEMA)
            cur.execute("SELECT COUNT(*) AS cnt FROM minerals")
            if cur.fetchone()["cnt"] == 0:
                cur.executemany(
                    "INSERT INTO minerals(name,mineral,lat,lon,prospectivity,note) VALUES(%s,%s,%s,%s,%s,%s)",
                    MINERALS,
                )
            cur.execute("SELECT COUNT(*) AS cnt FROM rivers")
            if cur.fetchone()["cnt"] == 0:
                cur.executemany(
                    "INSERT INTO rivers(name,outlet,coords) VALUES(%s,%s,%s)",
                    [(n, o, json.dumps(pts)) for n, (o, pts) in RIVERS.items()],
                )
            cur.execute("SELECT COUNT(*) AS cnt FROM saved_locations")
            if cur.fetchone()["cnt"] == 0:
                cur.execute(
                    "INSERT INTO saved_locations(name,lat,lon,created) VALUES(%s,%s,%s,%s)",
                    ("Nagpur", 21.1458, 79.0882, time.time()),
                )

def cache_get(k, ttl=None):
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT v, ts FROM cache WHERE k=%s", (k,))
            r = cur.fetchone()
    if not r:
        return None
    if ttl is not None and time.time() - r["ts"] > ttl:
        return None
    return json.loads(r["v"])

def cache_set(k, data):
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cache(k, v, ts) VALUES(%s, %s, %s)
                ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, ts = EXCLUDED.ts
                """,
                (k, json.dumps(data), time.time()),
            )

def minerals():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT * FROM minerals ORDER BY id")
            return list(cur.fetchall())

def rivers():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT * FROM rivers ORDER BY id")
            return [
                {"id": r["id"], "name": r["name"], "outlet": r["outlet"], "coords": json.loads(r["coords"])}
                for r in cur.fetchall()
            ]

def river(name):
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT * FROM rivers WHERE lower(name)=lower(%s)", (name,))
            r = cur.fetchone()
    return None if not r else {"name": r["name"], "outlet": r["outlet"], "coords": json.loads(r["coords"])}

def saved_list():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT * FROM saved_locations ORDER BY created DESC")
            return list(cur.fetchall())

def saved_add(name, lat, lon):
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(
                "INSERT INTO saved_locations(name,lat,lon,created) VALUES(%s,%s,%s,%s) RETURNING id",
                (name, lat, lon, time.time()),
            )
            return cur.fetchone()["id"]

def saved_delete(i):
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("DELETE FROM saved_locations WHERE id=%s", (i,))

def log_query(endpoint, lat, lon):
    try:
        with conn() as c:
            with c.cursor() as cur:
                cur.execute(
                    "INSERT INTO query_log(endpoint,lat,lon,ts) VALUES(%s,%s,%s,%s)",
                    (endpoint, lat, lon, time.time()),
                )
    except Exception:
        pass

def stats():
    with conn() as c:
        with c.cursor() as cur:
            out = {}
            for t in ("cache", "minerals", "rivers", "saved_locations", "query_log"):
                cur.execute(f"SELECT COUNT(*) AS cnt FROM {t}")
                out[t] = cur.fetchone()["cnt"]
            return out

if __name__ == "__main__":
    init_db()
    print("PostgreSQL DB ready:", stats())
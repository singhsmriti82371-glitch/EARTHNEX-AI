import json, os, sqlite3, time
from seed_data import MINERALS, RIVERS

DB_PATH = os.getenv("EARTHNEX_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "earthnex.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS cache(k TEXT PRIMARY KEY, v TEXT NOT NULL, ts REAL NOT NULL);
CREATE TABLE IF NOT EXISTS minerals(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mineral TEXT, lat REAL, lon REAL,
  prospectivity REAL, note TEXT);
CREATE TABLE IF NOT EXISTS rivers(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, outlet TEXT, coords TEXT);
CREATE TABLE IF NOT EXISTS saved_locations(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, lat REAL, lon REAL, created REAL);
CREATE TABLE IF NOT EXISTS query_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT, lat REAL, lon REAL, ts REAL);
"""

def conn():
    c = sqlite3.connect(DB_PATH, timeout=30)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with conn() as c:
        c.executescript(SCHEMA)
        if c.execute("SELECT COUNT(*) FROM minerals").fetchone()[0] == 0:
            c.executemany(
                "INSERT INTO minerals(name,mineral,lat,lon,prospectivity,note) VALUES(?,?,?,?,?,?)", MINERALS)
        if c.execute("SELECT COUNT(*) FROM rivers").fetchone()[0] == 0:
            c.executemany("INSERT INTO rivers(name,outlet,coords) VALUES(?,?,?)",
                          [(n, o, json.dumps(pts)) for n, (o, pts) in RIVERS.items()])
        if c.execute("SELECT COUNT(*) FROM saved_locations").fetchone()[0] == 0:
            c.execute("INSERT INTO saved_locations(name,lat,lon,created) VALUES(?,?,?,?)",
                      ("Nagpur", 21.1458, 79.0882, time.time()))

# ---- cache ----
def cache_get(k, ttl=None):
    with conn() as c:
        r = c.execute("SELECT v, ts FROM cache WHERE k=?", (k,)).fetchone()
    if not r: return None
    if ttl is not None and time.time() - r["ts"] > ttl: return None
    return json.loads(r["v"])

def cache_set(k, data):
    with conn() as c:
        c.execute("REPLACE INTO cache(k,v,ts) VALUES(?,?,?)", (k, json.dumps(data), time.time()))

# ---- reference data ----
def minerals():
    with conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM minerals")]

def rivers():
    with conn() as c:
        return [{"id": r["id"], "name": r["name"], "outlet": r["outlet"], "coords": json.loads(r["coords"])}
                for r in c.execute("SELECT * FROM rivers")]

def river(name):
    with conn() as c:
        r = c.execute("SELECT * FROM rivers WHERE lower(name)=lower(?)", (name,)).fetchone()
    return None if not r else {"name": r["name"], "outlet": r["outlet"], "coords": json.loads(r["coords"])}

# ---- saved locations ----
def saved_list():
    with conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM saved_locations ORDER BY created DESC")]

def saved_add(name, lat, lon):
    with conn() as c:
        cur = c.execute("INSERT INTO saved_locations(name,lat,lon,created) VALUES(?,?,?,?)",
                        (name, lat, lon, time.time()))
        return cur.lastrowid

def saved_delete(i):
    with conn() as c:
        c.execute("DELETE FROM saved_locations WHERE id=?", (i,))

# ---- analytics log ----
def log_query(endpoint, lat, lon):
    try:
        with conn() as c:
            c.execute("INSERT INTO query_log(endpoint,lat,lon,ts) VALUES(?,?,?,?)", (endpoint, lat, lon, time.time()))
    except Exception:
        pass

def stats():
    with conn() as c:
        return {t: c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                for t in ("cache", "minerals", "rivers", "saved_locations", "query_log")}

if __name__ == "__main__":
    init_db()
    print("DB ready:", DB_PATH, stats())

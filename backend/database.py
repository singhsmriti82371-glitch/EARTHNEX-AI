import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent / "earthnex_realtime.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS rivers (
        id TEXT PRIMARY KEY, name TEXT, states TEXT, outlet TEXT, ocean_id TEXT, color TEXT,
        plastic_tons_yr INTEGER, microplastic_conc TEXT, damage_score INTEGER, damage_level TEXT,
        damage_color TEXT, water_impact TEXT, coords_json TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS mineral_deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT, river_id TEXT, mineral TEXT, deposit_name TEXT,
        lat REAL, lon REAL, grade TEXT
    );
    CREATE TABLE IF NOT EXISTS ocean_basins (
        id TEXT PRIMARY KEY, name TEXT, center_lat REAL, center_lon REAL, sea_level_trend TEXT,
        sst TEXT, wave_height TEXT, plastic_inflow TEXT, microplastic_density TEXT,
        damage_score INTEGER, damage_status TEXT, damage_summary TEXT, polygon_json TEXT
    );
    CREATE TABLE IF NOT EXISTS telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, dashboard TEXT, location_name TEXT,
        lat REAL, lon REAL, metric_summary TEXT, recorded_at TEXT
    );
    """)
    if cur.execute("SELECT COUNT(*) FROM rivers").fetchone()[0] == 0:
        now = datetime.utcnow().isoformat()
        cur.executemany("INSERT INTO rivers VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
            ("ganga", "Ganga River System", "Uttarakhand, UP, Bihar, WB", "Bay of Bengal", "bay_of_bengal", "#22c55e", 115000, "42.8 particles/m3", 89, "Critical Damage", "#7f1d1d", "Severe floodplain microplastic accumulation; 34% dissolved oxygen drop.", "[[30.08,78.26],[28.45,78.05],[26.45,80.35],[25.43,81.85],[25.31,83.01],[25.61,85.14],[24.75,87.92],[22.15,88.15]]", now),
            ("subarnarekha", "Subarnarekha & Damodar", "Jharkhand, WB, Odisha", "Bay of Bengal", "bay_of_bengal", "#eab308", 46000, "31.4 particles/m3", 78, "High Damage", "#dc2626", "Industrial polymer + coal-ash sludge choking estuarine habitats.", "[[23.35,85.32],[22.80,86.20],[22.58,86.45],[22.15,86.85],[21.62,87.38]]", now),
            ("godavari", "Godavari River", "Maharashtra, Telangana, AP", "Bay of Bengal", "bay_of_bengal", "#a855f7", 38500, "24.6 particles/m3", 68, "Moderate-High", "#f97316", "Urban single-use plastic runoff blocking deltaic mangroves.", "[[19.93,73.53],[19.55,75.72],[18.80,77.95],[18.67,79.90],[17.68,81.25],[16.72,82.22]]", now),
            ("mahanadi", "Mahanadi River", "Chhattisgarh, Odisha", "Bay of Bengal", "bay_of_bengal", "#f97316", 24800, "17.4 particles/m3", 54, "Moderate Damage", "#eab308", "Urban plastic discharge from Raipur-Cuttack affecting coastal wetlands.", "[[20.25,81.95],[21.25,81.63],[21.47,83.97],[20.85,85.10],[20.46,85.88],[20.28,86.68]]", now),
            ("narmada", "Narmada & Tapi Basin", "Madhya Pradesh, Gujarat", "Arabian Sea", "arabian_sea", "#06b6d4", 21500, "15.2 particles/m3", 49, "Moderate Damage", "#eab308", "Estuary plastic drift impacting Gulf of Khambhat marine nurseries.", "[[22.67,81.75],[23.16,79.93],[22.75,77.72],[22.25,76.05],[21.85,73.72],[21.70,72.62]]", now),
            ("indravati", "Indravati & Sabari (Bastar)", "Chhattisgarh, Odisha", "Bay of Bengal", "bay_of_bengal", "#ef4444", 6400, "5.8 particles/m3", 24, "Low Damage", "#16a34a", "Minimal plastic footprint due to dense Bastar forest cover.", "[[19.15,82.55],[19.08,82.02],[18.95,81.35],[18.72,80.75],[18.45,80.28]]", now)
        ])
        cur.executemany("INSERT INTO mineral_deposits (river_id, mineral, deposit_name, lat, lon, grade) VALUES (?,?,?,?,?,?)", [
            ("ganga", "Gold", "Haridwar Placer", 29.94, 78.16, "Alluvial Gold"),
            ("subarnarekha", "Uranium", "Jaduguda Belt", 22.65, 86.35, "Uranium Ore"),
            ("subarnarekha", "Copper", "Mosabani-Ghatshila", 22.58, 86.45, "Sulfide Copper"),
            ("godavari", "Coal", "Singareni Coalfield", 18.67, 79.90, "Bituminous Coal"),
            ("mahanadi", "Coal", "Korba Basin", 22.35, 82.68, "Thermal Grade"),
            ("mahanadi", "Chromite", "Sukinda Valley", 21.02, 85.78, "90% Reserve"),
            ("narmada", "Diamond", "Panna Basin", 24.72, 80.18, "Kimberlite Pipe"),
            ("indravati", "Iron Ore", "Bailadila Range", 18.63, 81.23, "67% Fe Hematite")
        ])
        cur.executemany("INSERT INTO ocean_basins VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [
            ("bay_of_bengal", "Bay of Bengal (Eastern Basin)", 16.8, 87.2, "+3.8 mm/yr", "28.9 C", "1.6 m", "2,65,000 Tons/yr", "36.5 particles/m3", 84, "High Marine Stress", "Receives riverine plastic plumes from Ganga, Mahanadi & Godavari.", "[[21.8,87.2],[21.5,91.5],[16.0,92.5],[10.5,91.0],[10.5,80.5],[15.8,80.8],[20.2,86.7]]"),
            ("arabian_sea", "Arabian Sea (Western Basin)", 17.5, 68.5, "+3.3 mm/yr", "28.2 C", "1.9 m", "1,18,000 Tons/yr", "21.8 particles/m3", 67, "Moderate-High Stress", "Coastal urban plastic damaging western continental shelf fisheries.", "[[23.5,67.5],[21.7,72.5],[18.9,72.7],[14.5,74.0],[9.5,76.0],[9.5,65.0],[18.0,64.5]]"),
            ("indian_ocean", "Indian Ocean (Southern Basin)", 7.2, 78.5, "+3.5 mm/yr", "29.1 C", "2.2 m", "74,000 Tons/yr", "14.2 particles/m3", 52, "Moderate Drift", "Transboundary microplastic gyre currents.", "[[9.5,65.0],[9.5,76.5],[10.5,80.5],[10.5,91.0],[4.5,90.0],[4.5,66.0]]")
        ])
    conn.commit()
    conn.close()

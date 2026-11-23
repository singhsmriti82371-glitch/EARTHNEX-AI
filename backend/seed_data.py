"""Seed data for the local database.
NOTE: minerals and river paths are ILLUSTRATIVE (coarse waypoints / indicative scores),
not survey-grade data. Replace with USGS MRDS / Geological Survey of India / HydroSHEDS for production.
"""

# name, mineral, lat, lon, prospectivity (0-1), note
MINERALS = [
    ("Bailadila, Chhattisgarh", "Iron ore", 18.70, 81.20, 0.90, "Large hematite deposits"),
    ("Joda-Barbil, Odisha", "Iron ore", 22.02, 85.42, 0.88, "Keonjhar iron ore belt"),
    ("Panchpatmali, Odisha", "Bauxite", 18.77, 82.97, 0.82, "Eastern Ghats bauxite"),
    ("Singhbhum Shear Zone", "Copper", 22.60, 85.80, 0.76, "Copper-uranium belt"),
    ("Malanjkhand, MP", "Copper", 22.03, 80.70, 0.72, "Porphyry copper"),
    ("Zawar, Rajasthan", "Zinc-Lead", 24.35, 73.70, 0.71, "Aravalli base metals"),
    ("Rampura Agucha, Rajasthan", "Zinc", 25.83, 74.72, 0.78, "Major zinc-lead mine"),
    ("Kolar, Karnataka", "Gold", 13.00, 78.30, 0.64, "Historic gold fields"),
    ("Hutti, Karnataka", "Gold", 16.20, 76.65, 0.60, "Greenstone belt gold"),
    ("Jaduguda, Jharkhand", "Uranium", 22.65, 86.35, 0.66, "Singhbhum uranium"),
    ("Sukinda, Odisha", "Chromite", 21.00, 86.00, 0.85, "Chromite valley"),
    ("Kandri-Mansar, Maharashtra", "Manganese", 21.40, 79.30, 0.68, "Nagpur-Bhandara manganese belt"),
    ("Balaghat, MP", "Manganese", 21.80, 80.20, 0.70, "Manganese belt"),
    ("Jharia, Jharkhand", "Coal", 23.75, 86.42, 0.92, "Coking coal field"),
    ("Korba, Chhattisgarh", "Coal", 22.35, 82.70, 0.88, "Thermal coal field"),
    ("Kutch, Gujarat", "Lignite", 23.70, 69.30, 0.60, "Lignite deposits"),
    ("Koderma, Jharkhand", "Mica", 24.47, 85.60, 0.60, "Mica belt"),
]

# name, basin/outlet, [(lat, lon, label)...] source -> mouth (coarse waypoints)
RIVERS = {
    "Ganga": ("Bay of Bengal", [
        (30.99, 78.94, "Gangotri"), (29.95, 78.16, "Haridwar"), (26.45, 80.35, "Kanpur"),
        (25.43, 81.85, "Prayagraj"), (25.32, 83.00, "Varanasi"), (25.60, 85.14, "Patna"),
        (25.24, 87.00, "Bhagalpur"), (24.80, 87.90, "Farakka"), (22.57, 88.36, "Kolkata (Hooghly)"),
        (21.65, 88.10, "Sundarbans / Bay of Bengal")]),
    "Yamuna": ("Ganga at Prayagraj", [
        (31.00, 78.45, "Yamunotri"), (28.65, 77.25, "Delhi"), (27.18, 78.02, "Agra"),
        (25.43, 81.85, "Prayagraj confluence")]),
    "Godavari": ("Bay of Bengal", [
        (19.93, 73.53, "Trimbak"), (19.15, 77.30, "Nanded"), (18.87, 77.93, "Basar"),
        (17.00, 81.78, "Rajahmundry"), (16.60, 82.30, "Bay of Bengal")]),
    "Mahanadi": ("Bay of Bengal", [
        (20.30, 81.90, "Sihawa"), (21.47, 83.97, "Sambalpur"), (20.46, 85.88, "Cuttack"),
        (20.32, 86.70, "Bay of Bengal")]),
    "Narmada": ("Arabian Sea", [
        (22.67, 81.75, "Amarkantak"), (23.13, 79.95, "Jabalpur"), (22.24, 76.15, "Omkareshwar"),
        (21.70, 73.00, "Bharuch"), (21.65, 72.60, "Arabian Sea")]),
}
